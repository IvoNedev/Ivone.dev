using System.Globalization;
using System.Text.RegularExpressions;
using System.Text.Json;
using ivone.dev.Data.Contexts;
using Ivone.dev.Data.Models.Track;
using Microsoft.Data.SqlClient;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;

namespace Ivone.dev.Pages;

public class TrackModel : PageModel
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private static readonly NaturalStringComparer NaturalComparer = new();
    private static readonly Lazy<TimeZoneInfo> TrackTimeZone = new(ResolveTrackTimeZone);
    private readonly AppDbContext _db;
    private readonly IAntiforgery _antiforgery;

    public TrackModel(AppDbContext db, IAntiforgery antiforgery)
    {
        _db = db;
        _antiforgery = antiforgery;
    }

    public string InitialStateJson { get; private set; } = "{}";
    public string RequestVerificationToken { get; private set; } = string.Empty;

    public async Task OnGetAsync()
    {
        RequestVerificationToken = _antiforgery.GetAndStoreTokens(HttpContext).RequestToken ?? string.Empty;
        InitialStateJson = JsonSerializer.Serialize(await BuildStateAsync(), JsonOptions);
    }

    public async Task<IActionResult> OnGetStateAsync(int? focusNoteId = null, int? selectedTemplateId = null)
    {
        return new JsonResult(await BuildStateAsync(focusNoteId, selectedTemplateId), JsonOptions);
    }

    public async Task<IActionResult> OnPostCreateTodayNoteAsync()
    {
        var request = await ReadRequestAsync<CreateNoteRequest>();
        if (request is null)
        {
            return BadRequest(new ErrorResponse("Choose a template before creating today's card."));
        }

        return await CreateNoteForDateAsync(request.TemplateId, GetToday());
    }

    public async Task<IActionResult> OnPostCreateNoteAsync()
    {
        var request = await ReadRequestAsync<CreateNoteRequest>();
        if (request is null || string.IsNullOrWhiteSpace(request.TrackDate))
        {
            return BadRequest(new ErrorResponse("Choose a missed date first."));
        }

        if (!DateOnly.TryParse(request.TrackDate, CultureInfo.InvariantCulture, DateTimeStyles.None, out var trackDate))
        {
            return BadRequest(new ErrorResponse("Use a valid missed date."));
        }

        var today = GetToday();
        if (trackDate > today)
        {
            return BadRequest(new ErrorResponse("Future cards need to wait for their day."));
        }

        return await CreateNoteForDateAsync(request.TemplateId, trackDate);
    }

    private async Task<IActionResult> CreateNoteForDateAsync(int? requestedTemplateId, DateOnly trackDate)
    {
        var templateId = requestedTemplateId;
        if (!templateId.HasValue || templateId.Value <= 0)
        {
            var launchTemplates = await _db.TrackTemplates
                .AsNoTracking()
                .Select(x => new { x.Id, x.Name, x.IsDefault })
                .ToListAsync();

            templateId = launchTemplates
                .OrderByDescending(x => x.IsDefault)
                .ThenBy(x => x.Name, NaturalComparer)
                .Select(x => (int?)x.Id)
                .FirstOrDefault();
        }

        if (!templateId.HasValue)
        {
            return BadRequest(new ErrorResponse("Create a template first, then start today."));
        }

        var template = await _db.TrackTemplates
            .Include(x => x.Items)
            .Include(x => x.Bands)
            .FirstOrDefaultAsync(x => x.Id == templateId.Value);

        if (template is null)
        {
            return NotFound(new ErrorResponse("That template no longer exists."));
        }

        var isWeekly = IsWeekly(template.Cadence);
        var periodDate = isWeekly ? GetWeekStart(trackDate) : trackDate;

        var note = await _db.TrackNotes
            .Include(x => x.Items)
            .Include(x => x.Bands)
            .FirstOrDefaultAsync(x => x.TrackTemplateId == template.Id && x.TrackDate == periodDate);

        var periodLabel = isWeekly
            ? IsCurrentWeek(periodDate) ? "this week" : $"the week of {periodDate.ToString("d MMM", CultureInfo.InvariantCulture)}"
            : periodDate == GetToday() ? "today" : periodDate.ToString("ddd, d MMM", CultureInfo.InvariantCulture);

        var message = $"Opened {template.Name} for {periodLabel}.";

        if (note is null)
        {
            // "1% better": targets compound by the number of weeks the template has run,
            // baked in now so history stays stable even if the template changes later.
            var weekIndex = GetTemplateWeekIndex(template, periodDate);

            note = new TrackNote
            {
                TrackTemplateId = template.Id,
                Title = template.Name,
                TemplateNameSnapshot = template.Name,
                PeriodType = isWeekly ? "Weekly" : "Daily",
                TrackDate = periodDate,
                CreatedOnUtc = DateTime.UtcNow,
                UpdatedOnUtc = DateTime.UtcNow,
                Items = template.Items
                    .OrderBy(x => x.SortOrder)
                    .ThenBy(x => x.Id)
                    .Select((item, index) => new TrackNoteItem
                    {
                        Label = item.Label,
                        Points = item.Points,
                        SortOrder = index,
                        TargetKind = item.TargetKind,
                        Unit = string.IsNullOrWhiteSpace(item.Unit) ? null : item.Unit,
                        TargetValue = GrowTarget(item.TargetKind, item.BaseTarget, item.GrowthMode, item.GrowthValue, weekIndex)
                    })
                    .ToList(),
                Bands = template.Bands
                    .OrderBy(x => x.SortOrder)
                    .ThenBy(x => x.Id)
                    .Select((band, index) => new TrackNoteBand
                    {
                        Label = band.Label,
                        MinPoints = band.MinPoints,
                        MaxPoints = band.MaxPoints,
                        ColorHex = band.ColorHex,
                        SortOrder = index
                    })
                    .ToList()
            };

            _db.TrackNotes.Add(note);
            await _db.SaveChangesAsync();
            message = $"Created {template.Name} for {periodLabel}.";
        }

        return await BuildActionResponseAsync(message, note.Id, template.Id);
    }

    public async Task<IActionResult> OnPostSaveTemplateAsync()
    {
        var request = await ReadRequestAsync<SaveTemplateRequest>();
        if (request is null)
        {
            return BadRequest(new ErrorResponse("Template payload is missing."));
        }

        var normalizedName = (request.Name ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(normalizedName))
        {
            return BadRequest(new ErrorResponse("Give the template a name."));
        }

        var items = request.Items?
            .Where(x => !string.IsNullOrWhiteSpace(x.Label))
            .Select((item, index) => NormalizeItem(item, index))
            .ToList() ?? [];

        if (items.Count == 0)
        {
            return BadRequest(new ErrorResponse("Add at least one checklist item."));
        }

        var bands = request.Bands?
            .Where(x => !string.IsNullOrWhiteSpace(x.Label))
            .Select((band, index) => new NormalizedBand(
                band.Label!.Trim(),
                Math.Max(0, band.MinPoints),
                band.MaxPoints.HasValue ? Math.Max(band.MinPoints, band.MaxPoints.Value) : null,
                NormalizeColor(band.ColorHex),
                index))
            .OrderBy(x => x.SortOrder)
            .ToList() ?? [];

        if (bands.Count == 0)
        {
            return BadRequest(new ErrorResponse("Add at least one colour band."));
        }

        if (await _db.TrackTemplates.AnyAsync(x => x.Id != request.Id && x.Name == normalizedName))
        {
            return BadRequest(new ErrorResponse("Template names need to stay unique."));
        }

        TrackTemplate template;
        var isCreate = !request.Id.HasValue || request.Id.Value <= 0;
        if (isCreate)
        {
            template = new TrackTemplate
            {
                CreatedOnUtc = DateTime.UtcNow
            };
            _db.TrackTemplates.Add(template);
        }
        else
        {
            var templateId = request.Id.GetValueOrDefault();
            template = await _db.TrackTemplates
                .Include(x => x.Items)
                .Include(x => x.Bands)
                .FirstOrDefaultAsync(x => x.Id == templateId)
                ?? throw new InvalidOperationException("Template not found.");
        }

        template.Name = normalizedName;
        template.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        template.Cadence = NormalizeCadence(request.Cadence);
        template.IsDefault = isCreate || request.IsDefault;
        template.UpdatedOnUtc = DateTime.UtcNow;

        if (!isCreate)
        {
            _db.TrackTemplateItems.RemoveRange(template.Items);
            _db.TrackTemplateBands.RemoveRange(template.Bands);
        }

        template.Items = items
            .Select(x => new TrackTemplateItem
            {
                Label = x.Label,
                Points = x.Points,
                SortOrder = x.SortOrder,
                TargetKind = x.TargetKind,
                Unit = x.Unit,
                BaseTarget = x.BaseTarget,
                GrowthMode = x.GrowthMode,
                GrowthValue = x.GrowthValue
            })
            .ToList();

        template.Bands = bands
            .Select(x => new TrackTemplateBand
            {
                Label = x.Label,
                MinPoints = x.MinPoints,
                MaxPoints = x.MaxPoints,
                ColorHex = x.ColorHex,
                SortOrder = x.SortOrder
            })
            .ToList();

        if (template.IsDefault)
        {
            var others = await _db.TrackTemplates
                .Where(x => x.Id != template.Id && x.IsDefault)
                .ToListAsync();

            foreach (var other in others)
            {
                other.IsDefault = false;
                other.UpdatedOnUtc = DateTime.UtcNow;
            }
        }

        await _db.SaveChangesAsync();

        var message = isCreate ? $"Created {template.Name}." : $"Saved {template.Name}.";
        return await BuildActionResponseAsync(message, selectedTemplateId: template.Id);
    }

    public async Task<IActionResult> OnPostDeleteTemplateAsync()
    {
        var request = await ReadRequestAsync<DeleteTemplateRequest>();
        if (request is null || request.TemplateId <= 0)
        {
            return BadRequest(new ErrorResponse("Choose a template to delete."));
        }

        var template = await _db.TrackTemplates.FirstOrDefaultAsync(x => x.Id == request.TemplateId);
        if (template is null)
        {
            return NotFound(new ErrorResponse("That template was already removed."));
        }

        var templateName = template.Name;
        var wasDefault = template.IsDefault;

        _db.TrackTemplates.Remove(template);
        await _db.SaveChangesAsync();

        if (wasDefault)
        {
            var replacements = await _db.TrackTemplates.ToListAsync();
            var replacement = replacements
                .OrderBy(x => x.Name, NaturalComparer)
                .FirstOrDefault();

            if (replacement is not null)
            {
                replacement.IsDefault = true;
                replacement.UpdatedOnUtc = DateTime.UtcNow;
                await _db.SaveChangesAsync();
            }
        }

        return await BuildActionResponseAsync($"Deleted {templateName}.");
    }

    public async Task<IActionResult> OnPostToggleNoteItemAsync()
    {
        var request = await ReadRequestAsync<ToggleNoteItemRequest>();
        if (request is null || request.NoteItemId <= 0)
        {
            return BadRequest(new ErrorResponse("Pick a checklist item to update."));
        }

        var noteItemQuery = _db.TrackNoteItems
            .Include(x => x.Note)
            .Where(x => x.Id == request.NoteItemId);

        if (request.NoteId.HasValue && request.NoteId.Value > 0)
        {
            noteItemQuery = noteItemQuery.Where(x => x.TrackNoteId == request.NoteId.Value);
        }

        var noteItem = await noteItemQuery.FirstOrDefaultAsync();

        if (noteItem is null)
        {
            return NotFound(new ErrorResponse("That checklist item no longer exists."));
        }

        noteItem.IsChecked = request.IsChecked;
        noteItem.CheckedOnUtc = request.IsChecked ? DateTime.UtcNow : null;
        noteItem.Note.UpdatedOnUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return await BuildActionResponseAsync(
            request.IsChecked ? $"Checked off {noteItem.Label}." : $"Unchecked {noteItem.Label}.",
            noteItem.TrackNoteId,
            noteItem.Note.TrackTemplateId);
    }

    public async Task<IActionResult> OnPostLogNoteItemAsync()
    {
        var request = await ReadRequestAsync<LogNoteItemRequest>();
        if (request is null || request.NoteItemId <= 0)
        {
            return BadRequest(new ErrorResponse("Pick an item to log."));
        }

        var noteItem = await _db.TrackNoteItems
            .Include(x => x.Note)
            .FirstOrDefaultAsync(x => x.Id == request.NoteItemId
                && (!request.NoteId.HasValue || x.TrackNoteId == request.NoteId.Value));

        if (noteItem is null)
        {
            return NotFound(new ErrorResponse("That item no longer exists."));
        }

        if (noteItem.TargetValue is not decimal target)
        {
            return BadRequest(new ErrorResponse("That item is a simple checkbox."));
        }

        var isTime = noteItem.TargetKind == "TimeBefore";
        decimal? actual;
        if (!request.ActualValue.HasValue)
        {
            actual = null;
        }
        else if (isTime)
        {
            actual = Math.Clamp((int)Math.Round((double)request.ActualValue.Value), 0, 1439);
        }
        else
        {
            actual = request.ActualValue.Value > 0
                ? decimal.Round(request.ActualValue.Value, 2, MidpointRounding.AwayFromZero)
                : (decimal?)null;
        }

        noteItem.ActualValue = actual;
        noteItem.IsChecked = actual.HasValue && (isTime ? actual.Value <= target : actual.Value >= target);
        noteItem.CheckedOnUtc = noteItem.IsChecked ? DateTime.UtcNow : null;
        noteItem.Note.UpdatedOnUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        var unit = string.IsNullOrWhiteSpace(noteItem.Unit) ? "" : $" {noteItem.Unit}";
        var loggedLabel = isTime ? FormatClock(actual) : $"{FormatMeasurement(actual)}{unit}";
        var message = actual.HasValue
            ? $"Logged {loggedLabel} on {noteItem.Label}."
            : $"Cleared {noteItem.Label}.";

        return await BuildActionResponseAsync(message, noteItem.TrackNoteId, noteItem.Note.TrackTemplateId);
    }

    public async Task<IActionResult> OnPostResyncNoteAsync()
    {
        var request = await ReadRequestAsync<ResyncNoteRequest>();
        if (request is null || request.NoteId <= 0)
        {
            return BadRequest(new ErrorResponse("Pick a card to resync."));
        }

        var note = await _db.TrackNotes
            .Include(x => x.Items)
            .Include(x => x.Bands)
            .FirstOrDefaultAsync(x => x.Id == request.NoteId);

        if (note is null)
        {
            return NotFound(new ErrorResponse("That card no longer exists."));
        }

        if (note.TrackTemplateId is null)
        {
            return BadRequest(new ErrorResponse("This card has no template to resync from."));
        }

        var template = await _db.TrackTemplates
            .Include(x => x.Items)
            .Include(x => x.Bands)
            .FirstOrDefaultAsync(x => x.Id == note.TrackTemplateId.Value);

        if (template is null)
        {
            return NotFound(new ErrorResponse("The template was deleted, so there is nothing to resync from."));
        }

        // Keep whatever progress we can, matched by label.
        var previous = note.Items
            .GroupBy(x => x.Label, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);

        var weekIndex = GetTemplateWeekIndex(template, note.TrackDate);

        _db.TrackNoteItems.RemoveRange(note.Items);
        _db.TrackNoteBands.RemoveRange(note.Bands);

        note.TemplateNameSnapshot = template.Name;
        note.Title = template.Name;
        note.UpdatedOnUtc = DateTime.UtcNow;

        note.Items = template.Items
            .OrderBy(x => x.SortOrder)
            .ThenBy(x => x.Id)
            .Select((item, index) =>
            {
                var target = GrowTarget(item.TargetKind, item.BaseTarget, item.GrowthMode, item.GrowthValue, weekIndex);
                var noteItem = new TrackNoteItem
                {
                    Label = item.Label,
                    Points = item.Points,
                    SortOrder = index,
                    TargetKind = item.TargetKind,
                    Unit = string.IsNullOrWhiteSpace(item.Unit) ? null : item.Unit,
                    TargetValue = target
                };

                // Carry forward what was already logged for an item with the same label.
                if (previous.TryGetValue(item.Label, out var old))
                {
                    if (target is decimal t)
                    {
                        noteItem.ActualValue = old.ActualValue;
                        noteItem.IsChecked = old.ActualValue is decimal a
                            && (item.TargetKind == "TimeBefore" ? a <= t : a >= t);
                    }
                    else
                    {
                        noteItem.IsChecked = old.IsChecked;
                    }
                    noteItem.CheckedOnUtc = noteItem.IsChecked ? (old.CheckedOnUtc ?? DateTime.UtcNow) : null;
                }

                return noteItem;
            })
            .ToList();

        note.Bands = template.Bands
            .OrderBy(x => x.SortOrder)
            .ThenBy(x => x.Id)
            .Select((band, index) => new TrackNoteBand
            {
                Label = band.Label,
                MinPoints = band.MinPoints,
                MaxPoints = band.MaxPoints,
                ColorHex = band.ColorHex,
                SortOrder = index
            })
            .ToList();

        await _db.SaveChangesAsync();

        return await BuildActionResponseAsync($"Resynced {template.Name} from the template.", note.Id, note.TrackTemplateId);
    }

    public async Task<IActionResult> OnPostLogChoiceAsync()
    {
        var request = await ReadRequestAsync<LogChoiceRequest>();
        if (request is null || request.NoteId <= 0)
        {
            return BadRequest(new ErrorResponse("Invalid request."));
        }

        var choice = (request.Choice ?? string.Empty).Trim().ToLowerInvariant();
        if (choice is not ("hard" or "easy"))
        {
            return BadRequest(new ErrorResponse("Choice must be 'hard' or 'easy'."));
        }

        var delta = request.Delta > 0 ? 1 : -1;

        var note = await _db.TrackNotes.FindAsync(request.NoteId);
        if (note is null)
        {
            return NotFound(new ErrorResponse("Card not found."));
        }

        try
        {
            if (choice == "hard")
            {
                note.HardCount = Math.Max(0, note.HardCount + delta);
            }
            else
            {
                note.EasyCount = Math.Max(0, note.EasyCount + delta);
            }

            note.UpdatedOnUtc = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }
        catch (SqlException ex) when (ex.Number == 207)
        {
            return BadRequest(new ErrorResponse("Run track-add-choice-counters.sql first."));
        }

        return await BuildActionResponseAsync(
            delta > 0
                ? $"{(choice == "hard" ? "Hard" : "Easy")} +1."
                : $"{(choice == "hard" ? "Hard" : "Easy")} −1.",
            note.Id,
            note.TrackTemplateId);
    }

    public async Task<IActionResult> OnPostDeleteProfitEntryAsync()
    {
        var request = await ReadRequestAsync<DeleteEntryRequest>();
        if (request is null || request.Id <= 0)
        {
            return BadRequest(new ErrorResponse("Pick an entry to delete."));
        }

        try
        {
            var removed = await _db.TrackProfitEntries.Where(x => x.Id == request.Id).ExecuteDeleteAsync();
            if (removed == 0)
            {
                return NotFound(new ErrorResponse("That entry was already removed."));
            }
        }
        catch (SqlException ex) when (ex.Number == 208)
        {
            return BadRequest(new ErrorResponse("Run the updated track SQL first."));
        }

        return await BuildActionResponseAsync("Removed money entry.");
    }

    public async Task<IActionResult> OnPostDeleteMeasurementAsync()
    {
        var request = await ReadRequestAsync<DeleteEntryRequest>();
        if (request is null || request.Id <= 0)
        {
            return BadRequest(new ErrorResponse("Pick a measurement to delete."));
        }

        try
        {
            var removed = await _db.TrackMeasurements.Where(x => x.Id == request.Id).ExecuteDeleteAsync();
            if (removed == 0)
            {
                return NotFound(new ErrorResponse("That measurement was already removed."));
            }
        }
        catch (SqlException ex) when (ex.Number == 208)
        {
            return BadRequest(new ErrorResponse("Run the updated track SQL first."));
        }

        return await BuildActionResponseAsync("Removed measurement.");
    }

    public async Task<IActionResult> OnPostDeleteMotivationLinkAsync()
    {
        var request = await ReadRequestAsync<DeleteEntryRequest>();
        if (request is null || request.Id <= 0)
        {
            return BadRequest(new ErrorResponse("Pick a link to delete."));
        }

        try
        {
            var removed = await _db.TrackMotivationLinks.Where(x => x.Id == request.Id).ExecuteDeleteAsync();
            if (removed == 0)
            {
                return NotFound(new ErrorResponse("That link was already removed."));
            }
        }
        catch (SqlException ex) when (ex.Number == 208)
        {
            return BadRequest(new ErrorResponse("Run the updated track SQL first."));
        }

        return await BuildActionResponseAsync("Removed motivation link.");
    }

    public async Task<IActionResult> OnPostAddProfitEntryAsync()
    {
        var request = await ReadRequestAsync<AddProfitEntryRequest>();
        if (request is null)
        {
            return BadRequest(new ErrorResponse("Add an amount first."));
        }

        var amount = decimal.Round(request.Amount, 2, MidpointRounding.AwayFromZero);
        if (amount <= 0)
        {
            return BadRequest(new ErrorResponse("Amount must be greater than zero."));
        }

        var entryType = NormalizeProfitEntryType(request.EntryType);
        if (entryType is null)
        {
            return BadRequest(new ErrorResponse("Choose saved or withdrawn."));
        }

        try
        {
            if (entryType == "Withdrawn")
            {
                var saved = await _db.TrackProfitEntries
                    .Where(x => x.EntryType == "Saved")
                    .SumAsync(x => (decimal?)x.Amount) ?? 0m;
                var withdrawn = await _db.TrackProfitEntries
                    .Where(x => x.EntryType == "Withdrawn")
                    .SumAsync(x => (decimal?)x.Amount) ?? 0m;

                if (amount > saved - withdrawn)
                {
                    return BadRequest(new ErrorResponse("Withdrawn amount cannot exceed available Profit."));
                }
            }

            _db.TrackProfitEntries.Add(new TrackProfitEntry
            {
                EntryType = entryType,
                Amount = amount,
                Currency = "EUR",
                Memo = string.IsNullOrWhiteSpace(request.Memo) ? null : request.Memo.Trim(),
                EntryDate = GetToday(),
                CreatedOnUtc = DateTime.UtcNow
            });

            await _db.SaveChangesAsync();
        }
        catch (SqlException ex) when (ex.Number == 208)
        {
            return BadRequest(new ErrorResponse("Run the updated track SQL to create track.ProfitEntries."));
        }

        var message = entryType == "Saved"
            ? $"Added {FormatMoney(amount)} to Profit."
            : $"Marked {FormatMoney(amount)} as withdrawn.";

        return await BuildActionResponseAsync(message);
    }

    public async Task<IActionResult> OnPostAddMeasurementAsync()
    {
        var request = await ReadRequestAsync<AddMeasurementRequest>();
        if (request is null)
        {
            return BadRequest(new ErrorResponse("Add at least one measurement."));
        }

        var values = new[] { request.Weight, request.Belly, request.Chest, request.Arm, request.Leg };
        if (values.All(x => !x.HasValue))
        {
            return BadRequest(new ErrorResponse("Add at least one measurement."));
        }

        if (values.Any(x => x.HasValue && x.Value <= 0))
        {
            return BadRequest(new ErrorResponse("Measurements must be greater than zero."));
        }

        var date = ParseDateOrToday(request.MeasurementDate);

        try
        {
            _db.TrackMeasurements.Add(new TrackMeasurement
            {
                MeasurementDate = date,
                Weight = RoundMeasurement(request.Weight),
                Belly = RoundMeasurement(request.Belly),
                Chest = RoundMeasurement(request.Chest),
                Arm = RoundMeasurement(request.Arm),
                Leg = RoundMeasurement(request.Leg),
                CreatedOnUtc = DateTime.UtcNow
            });

            await _db.SaveChangesAsync();
        }
        catch (SqlException ex) when (ex.Number == 208)
        {
            return BadRequest(new ErrorResponse("Run the updated track SQL to create Measurements."));
        }

        return await BuildActionResponseAsync($"Added measurements for {date.ToString("d MMM", CultureInfo.InvariantCulture)}.");
    }

    public async Task<IActionResult> OnPostAddMotivationLinkAsync()
    {
        var request = await ReadRequestAsync<AddMotivationLinkRequest>();
        if (request is null || string.IsNullOrWhiteSpace(request.Url))
        {
            return BadRequest(new ErrorResponse("Paste a link first."));
        }

        if (!Uri.TryCreate(request.Url.Trim(), UriKind.Absolute, out var uri) ||
            (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
        {
            return BadRequest(new ErrorResponse("Use a valid http or https link."));
        }

        var embed = BuildEmbed(uri);

        try
        {
            _db.TrackMotivationLinks.Add(new TrackMotivationLink
            {
                Url = uri.ToString(),
                Title = string.IsNullOrWhiteSpace(request.Title) ? null : request.Title.Trim(),
                Provider = embed.Provider,
                EmbedUrl = embed.EmbedUrl,
                CreatedOnUtc = DateTime.UtcNow
            });

            await _db.SaveChangesAsync();
        }
        catch (SqlException ex) when (ex.Number == 208)
        {
            return BadRequest(new ErrorResponse("Run the updated track SQL to create MotivationLinks."));
        }

        return await BuildActionResponseAsync("Added motivation link.");
    }

    public async Task<IActionResult> OnPostResetAsync()
    {
        var request = await ReadRequestAsync<ResetRequest>();
        var scope = (request?.Scope ?? string.Empty).Trim().ToLowerInvariant();

        try
        {
            string message;
            switch (scope)
            {
                case "templates":
                    // Cascades remove template items/bands; existing notes keep their snapshot and detach (FK set null).
                    await _db.TrackTemplates.ExecuteDeleteAsync();
                    message = "Cleared all templates.";
                    break;

                case "progress":
                    // Cascades remove note items/bands. Templates, money, and measurements stay.
                    await _db.TrackNotes.ExecuteDeleteAsync();
                    message = "Cleared all daily and weekly cards.";
                    break;

                case "money":
                    await _db.TrackProfitEntries.ExecuteDeleteAsync();
                    message = "Reset the money counter.";
                    break;

                case "measurements":
                    await _db.TrackMeasurements.ExecuteDeleteAsync();
                    message = "Cleared all measurements.";
                    break;

                case "motivation":
                    await _db.TrackMotivationLinks.ExecuteDeleteAsync();
                    message = "Cleared all motivation links.";
                    break;

                case "all":
                    await _db.TrackNotes.ExecuteDeleteAsync();
                    await _db.TrackTemplates.ExecuteDeleteAsync();
                    await _db.TrackProfitEntries.ExecuteDeleteAsync();
                    await _db.TrackMeasurements.ExecuteDeleteAsync();
                    await _db.TrackMotivationLinks.ExecuteDeleteAsync();
                    message = "Wiped everything. Fresh start.";
                    break;

                default:
                    return BadRequest(new ErrorResponse("Choose what to reset."));
            }

            return await BuildActionResponseAsync(message);
        }
        catch (SqlException ex) when (ex.Number == 208)
        {
            return BadRequest(new ErrorResponse("Run the updated track SQL before resetting."));
        }
    }

    private async Task<TrackPageState> BuildStateAsync(int? preferredFocusNoteId = null, int? selectedTemplateId = null)
    {
        var today = GetToday();
        List<TrackTemplate> templates;
        List<TrackNote> notes;
        List<TrackProfitEntry> profitEntries = [];
        List<TrackMeasurement> measurements = [];
        List<TrackMotivationLink> motivationLinks = [];
        var profitReady = true;
        string? profitMessage = null;
        var measurementsReady = true;
        string? measurementsMessage = null;
        var motivationReady = true;
        string? motivationMessage = null;

        try
        {
            templates = await _db.TrackTemplates
                .AsNoTracking()
                .Include(x => x.Items)
                .Include(x => x.Bands)
                .ToListAsync();

            templates = templates
                .OrderBy(x => x.Name, NaturalComparer)
                .ToList();

            notes = await _db.TrackNotes
                .AsNoTracking()
                .Include(x => x.Items)
                .Include(x => x.Bands)
                .OrderByDescending(x => x.TrackDate)
                .ThenByDescending(x => x.CreatedOnUtc)
                .ToListAsync();
        }
        catch (SqlException ex) when (ex.Number is 208 or 207)
        {
            // 208 = missing table, 207 = missing column (e.g. Cadence/PeriodType before the SQL is run).
            return new TrackPageState(
                today.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                null,
                [],
                null,
                [],
                [],
                0,
                0,
                BuildProfitSummary([], false, "Run the updated track SQL to create Profit."),
                new TrackMeasurementStateDto(false, "Run the updated track SQL to create Measurements.", [], []),
                [],
                new TrackMotivationStateDto(false, "Run the updated track SQL to create MotivationLinks.", []),
                new TrackStreakDto(0, 0, 0, 0, StreakThresholdPercent),
                new TrackWeeklyReviewDto(false, "This week", 0, 0, 0, FormatMoney(0m), null, []),
                false,
                "Track database tables are missing or need updating. Run scripts/create-track-schema.sql, then refresh.");
        }

        try
        {
            profitEntries = await _db.TrackProfitEntries
                .AsNoTracking()
                .OrderByDescending(x => x.EntryDate)
                .ThenByDescending(x => x.CreatedOnUtc)
                .ToListAsync();
        }
        catch (SqlException ex) when (ex.Number == 208)
        {
            profitReady = false;
            profitMessage = "Run the updated track SQL to create Profit.";
        }

        try
        {
            measurements = await _db.TrackMeasurements
                .AsNoTracking()
                .OrderByDescending(x => x.MeasurementDate)
                .ThenByDescending(x => x.CreatedOnUtc)
                .ToListAsync();
        }
        catch (SqlException ex) when (ex.Number == 208)
        {
            measurementsReady = false;
            measurementsMessage = "Run the updated track SQL to create Measurements.";
        }

        try
        {
            motivationLinks = await _db.TrackMotivationLinks
                .AsNoTracking()
                .OrderByDescending(x => x.CreatedOnUtc)
                .ToListAsync();
        }
        catch (SqlException ex) when (ex.Number == 208)
        {
            motivationReady = false;
            motivationMessage = "Run the updated track SQL to create MotivationLinks.";
        }

        var noteCounts = notes
            .Where(x => x.TrackTemplateId.HasValue)
            .GroupBy(x => x.TrackTemplateId!.Value)
            .ToDictionary(group => group.Key, group => group.Count());

        var weekStart = GetWeekStart(today);
        var templateById = templates.ToDictionary(x => x.Id);
        var todayTemplateIds = notes
            .Where(x => x.TrackTemplateId.HasValue && templateById.ContainsKey(x.TrackTemplateId!.Value))
            .Where(x => IsWeekly(templateById[x.TrackTemplateId!.Value].Cadence)
                ? x.TrackDate == weekStart
                : x.TrackDate == today)
            .Select(x => x.TrackTemplateId!.Value)
            .ToHashSet();

        var weeklySequence = BuildWeeklySequence(notes);

        TrackNote? focusNote = null;
        if (preferredFocusNoteId.HasValue)
        {
            focusNote = notes.FirstOrDefault(x => x.Id == preferredFocusNoteId.Value);
        }

        focusNote ??= notes.FirstOrDefault(x => x.TrackDate == today);
        focusNote ??= notes.FirstOrDefault();

        var templateDtos = templates
            .Select(template => MapTemplate(
                template,
                noteCounts.TryGetValue(template.Id, out var noteCount) ? noteCount : 0,
                todayTemplateIds.Contains(template.Id)))
            .ToList();

        var selected = templateDtos.FirstOrDefault(x => x.Id == selectedTemplateId)
            ?? templateDtos.FirstOrDefault(x => x.IsDefault)
            ?? templateDtos.FirstOrDefault();

        var noteDtos = notes.Select(note => MapNote(note, today, weeklySequence)).ToList();
        var focusNoteDto = noteDtos.FirstOrDefault(x => x.Id == focusNote?.Id);
        var archiveNotes = noteDtos
            .Where(x => focusNoteDto is null || x.Id != focusNoteDto.Id)
            .ToList();
        var dailyNotes = notes.Where(x => !IsWeekly(x.PeriodType)).ToList();
        var missedDays = BuildMissedDays(dailyNotes, today);

        var reviewTemplate = templates.FirstOrDefault(x => x.Id == selected?.Id)
            ?? templates.FirstOrDefault(x => x.IsDefault)
            ?? templates.FirstOrDefault();

        return new TrackPageState(
            today.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            selected?.Id,
            templateDtos,
            focusNoteDto,
            archiveNotes,
            missedDays,
            noteDtos.Count,
            templateDtos.Count,
            BuildProfitSummary(profitEntries, profitReady, profitMessage),
            BuildMeasurementState(measurements, measurementsReady, measurementsMessage, today),
            BuildMonthCharts(dailyNotes, today),
            BuildMotivationState(motivationLinks, motivationReady, motivationMessage),
            BuildStreak(dailyNotes, today),
            BuildWeeklyReview(dailyNotes, reviewTemplate, profitEntries, measurements, today),
            true,
            null);
    }

    private async Task<JsonResult> BuildActionResponseAsync(string message, int? focusNoteId = null, int? selectedTemplateId = null)
    {
        var state = await BuildStateAsync(focusNoteId, selectedTemplateId);
        return new JsonResult(new ActionResponse(state, message), JsonOptions);
    }

    private static IReadOnlyList<TrackMissedDayDto> BuildMissedDays(IReadOnlyList<TrackNote> notes, DateOnly today)
    {
        if (notes.Count == 0)
        {
            return [];
        }

        var firstDate = notes.Min(x => x.TrackDate);
        var noteDates = notes.Select(x => x.TrackDate).ToHashSet();
        var missedDays = new List<TrackMissedDayDto>();

        for (var dayNumber = today.DayNumber - 1; dayNumber > firstDate.DayNumber; dayNumber--)
        {
            var date = DateOnly.FromDayNumber(dayNumber);
            if (noteDates.Contains(date))
            {
                continue;
            }

            missedDays.Add(new TrackMissedDayDto(
                date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                BuildRelativeDayLabel(date, today),
                date.ToString("dddd, d MMMM", CultureInfo.InvariantCulture)));
        }

        return missedDays;
    }

    private static TrackTemplateDto MapTemplate(TrackTemplate template, int noteCount, bool hasTodayCard)
    {
        var items = template.Items
            .OrderBy(x => x.SortOrder)
            .ThenBy(x => x.Id)
            .Select(x => new TrackTemplateItemDto(
                x.Id,
                x.Label,
                x.Points,
                x.SortOrder,
                x.TargetKind,
                x.Unit,
                x.BaseTarget,
                x.GrowthMode,
                x.GrowthValue))
            .ToList();

        var bands = template.Bands
            .OrderBy(x => x.SortOrder)
            .ThenBy(x => x.Id)
            .Select(x => new TrackBandDto(
                DisplayBandLabel(x.Label),
                x.MinPoints,
                x.MaxPoints,
                x.ColorHex,
                false,
                BuildRangeLabel(x.MinPoints, x.MaxPoints)))
            .ToList();

        return new TrackTemplateDto(
            template.Id,
            template.Name,
            template.Description,
            IsWeekly(template.Cadence) ? "Weekly" : "Daily",
            template.IsDefault,
            hasTodayCard,
            items.Sum(x => x.Points),
            noteCount,
            items,
            bands);
    }

    private static TrackNoteDto MapNote(TrackNote note, DateOnly today, IReadOnlyDictionary<int, int> weeklySequence)
    {
        var isWeekly = IsWeekly(note.PeriodType);
        var orderedItems = note.Items
            .OrderBy(x => x.SortOrder)
            .ThenBy(x => x.Id)
            .ToList();

        var items = orderedItems
            .Select(x => new TrackNoteItemDto(
                x.Id,
                x.Label,
                x.Points,
                x.IsChecked,
                x.SortOrder,
                x.TargetKind,
                x.Unit,
                x.TargetValue,
                x.ActualValue,
                x.TargetKind == "TimeBefore" ? FormatClock(x.TargetValue) : FormatMeasurement(x.TargetValue),
                x.TargetKind == "TimeBefore" ? FormatClock(x.ActualValue) : FormatMeasurement(x.ActualValue),
                Math.Round(ItemCompletionRatio(x) * 100d, 0)))
            .ToList();

        var completedPoints = Math.Round(orderedItems.Sum(x => x.Points * ItemCompletionRatio(x)), 1);
        var maxPoints = orderedItems.Sum(x => x.Points);
        var sortedBands = note.Bands
            .OrderBy(x => x.SortOrder)
            .ThenBy(x => x.MinPoints)
            .ThenBy(x => x.Id)
            .ToList();

        var activeBand = ResolveActiveBand(sortedBands, completedPoints);
        var bands = sortedBands
            .Select(x => new TrackBandDto(
                DisplayBandLabel(x.Label),
                x.MinPoints,
                x.MaxPoints,
                x.ColorHex,
                activeBand?.Id == x.Id,
                BuildRangeLabel(x.MinPoints, x.MaxPoints)))
            .ToList();

        var localCreated = EnsureUtc(note.CreatedOnUtc).ToLocalTime();

        var baseName = string.IsNullOrWhiteSpace(note.Title) ? note.TemplateNameSnapshot : note.Title;
        var title = isWeekly && weeklySequence.TryGetValue(note.Id, out var sequence)
            ? $"{baseName} {sequence}"
            : baseName;
        var relativeLabel = isWeekly
            ? BuildRelativeWeekLabel(note.TrackDate, today)
            : BuildRelativeDayLabel(note.TrackDate, today);
        var dateLabel = isWeekly
            ? BuildWeekRangeLabel(note.TrackDate)
            : note.TrackDate.ToString("dddd, d MMMM", CultureInfo.InvariantCulture);

        return new TrackNoteDto(
            note.Id,
            note.TrackTemplateId,
            title,
            note.TemplateNameSnapshot,
            isWeekly ? "Weekly" : "Daily",
            note.TrackDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            relativeLabel,
            dateLabel,
            localCreated.ToString("HH:mm", CultureInfo.InvariantCulture),
            completedPoints,
            maxPoints,
            maxPoints <= 0 ? 0 : Math.Round((completedPoints * 100d) / maxPoints, 1),
            $"{FormatPoints(completedPoints)} / {maxPoints} pts",
            activeBand is null ? "No colour" : DisplayBandLabel(activeBand.Label),
            activeBand?.ColorHex ?? "#c084fc",
            bands,
            items,
            note.HardCount,
            note.EasyCount);
    }

    // 0..1 completion for an item: measurable items use actual/target, others use the checkbox.
    private static double ItemCompletionRatio(TrackNoteItem item)
    {
        if (item.TargetValue is decimal target)
        {
            if (item.TargetKind == "TimeBefore")
            {
                // At or before the target time = full credit, after = none.
                return item.ActualValue is decimal actualTime && actualTime <= target ? 1d : 0d;
            }

            if (target > 0)
            {
                var actual = (double)(item.ActualValue ?? 0m);
                return Math.Clamp(actual / (double)target, 0d, 1d);
            }
        }

        return item.IsChecked ? 1d : 0d;
    }

    private static string FormatPoints(double value)
    {
        return value == Math.Floor(value)
            ? ((int)value).ToString(CultureInfo.InvariantCulture)
            : value.ToString("0.0", CultureInfo.InvariantCulture);
    }

    private static TrackNoteBand? ResolveActiveBand(IEnumerable<TrackNoteBand> bands, double score)
    {
        var orderedBands = bands.ToList();
        if (orderedBands.Count == 0)
        {
            return null;
        }

        var match = orderedBands.FirstOrDefault(x => score >= x.MinPoints && (!x.MaxPoints.HasValue || score <= x.MaxPoints.Value));
        if (match is not null)
        {
            return match;
        }

        if (score < orderedBands[0].MinPoints)
        {
            return orderedBands[0];
        }

        return orderedBands[^1];
    }

    private static string BuildRelativeDayLabel(DateOnly noteDate, DateOnly today)
    {
        var diff = noteDate.DayNumber - today.DayNumber;
        return diff switch
        {
            0 => "Today",
            -1 => "Yesterday",
            _ when diff < -1 => $"{Math.Abs(diff)} days ago",
            1 => "Tomorrow",
            _ => $"In {diff} days"
        };
    }

    private static string BuildRelativeWeekLabel(DateOnly weekStart, DateOnly today)
    {
        var diffWeeks = (GetWeekStart(weekStart).DayNumber - GetWeekStart(today).DayNumber) / 7;
        return diffWeeks switch
        {
            0 => "This week",
            -1 => "Last week",
            _ when diffWeeks < -1 => $"{Math.Abs(diffWeeks)} weeks ago",
            1 => "Next week",
            _ => $"In {diffWeeks} weeks"
        };
    }

    private static string BuildWeekRangeLabel(DateOnly weekStart)
    {
        var start = GetWeekStart(weekStart);
        var end = start.AddDays(6);
        return start.Month == end.Month
            ? $"{start.Day}-{end.Day} {end.ToString("MMM yyyy", CultureInfo.InvariantCulture)}"
            : $"{start.ToString("d MMM", CultureInfo.InvariantCulture)} - {end.ToString("d MMM yyyy", CultureInfo.InvariantCulture)}";
    }

    private static IReadOnlyDictionary<int, int> BuildWeeklySequence(IReadOnlyList<TrackNote> notes)
    {
        var sequence = new Dictionary<int, int>();

        foreach (var group in notes
            .Where(x => IsWeekly(x.PeriodType))
            .GroupBy(x => x.TrackTemplateId.HasValue ? $"t{x.TrackTemplateId.Value}" : $"n:{x.TemplateNameSnapshot}"))
        {
            var ordered = group.OrderBy(x => x.TrackDate).ThenBy(x => x.Id).ToList();
            for (var index = 0; index < ordered.Count; index++)
            {
                sequence[ordered[index].Id] = index + 1;
            }
        }

        return sequence;
    }

    private static bool IsWeekly(string? cadenceOrPeriod)
    {
        return string.Equals(cadenceOrPeriod, "Weekly", StringComparison.OrdinalIgnoreCase);
    }

    private static string NormalizeCadence(string? cadence)
    {
        return IsWeekly(cadence) ? "Weekly" : "Daily";
    }

    private static NormalizedItem NormalizeItem(SaveTemplateItemRequest item, int index)
    {
        var label = item.Label!.Trim();
        var points = Math.Max(0, item.Points);
        var kind = NormalizeTargetKind(item.TargetKind);

        if (kind == "TimeBefore")
        {
            // Base target is a clock time stored as minutes since midnight; growth pulls it earlier each week.
            var minutes = item.BaseTarget.HasValue
                ? (decimal?)Math.Clamp((int)Math.Round(item.BaseTarget.Value), 0, 1439)
                : null;

            if (minutes is null)
            {
                return Checkbox(label, points, index);
            }

            var earlierPerWeek = Math.Max(0m, decimal.Round(item.GrowthValue ?? 0m, 0, MidpointRounding.AwayFromZero));
            return new NormalizedItem(label, points, index, "TimeBefore", null, minutes, "Step", earlierPerWeek);
        }

        // Amount: needs both a unit and a positive base value, else it is a plain checkbox.
        var unit = string.IsNullOrWhiteSpace(item.Unit) ? null : item.Unit.Trim();
        var baseTarget = item.BaseTarget.HasValue && item.BaseTarget.Value > 0
            ? decimal.Round(item.BaseTarget.Value, 2, MidpointRounding.AwayFromZero)
            : (decimal?)null;

        if (unit is null || baseTarget is null)
        {
            return Checkbox(label, points, index);
        }

        var growthMode = NormalizeGrowthMode(item.GrowthMode);
        var growthValue = growthMode == "None"
            ? 0m
            : Math.Max(0m, decimal.Round(item.GrowthValue ?? 0m, 2, MidpointRounding.AwayFromZero));

        return new NormalizedItem(label, points, index, "Amount", unit, baseTarget, growthMode, growthValue);
    }

    private static NormalizedItem Checkbox(string label, int points, int index)
        => new(label, points, index, "Amount", null, null, "None", 0m);

    private static string NormalizeTargetKind(string? kind)
    {
        return string.Equals(kind?.Trim(), "TimeBefore", StringComparison.OrdinalIgnoreCase) ? "TimeBefore" : "Amount";
    }

    private static string NormalizeGrowthMode(string? mode)
    {
        return mode?.Trim().ToLowerInvariant() switch
        {
            "percent" => "Percent",
            "step" => "Step",
            _ => "None"
        };
    }

    private static decimal? GrowTarget(string targetKind, decimal? baseTarget, string? growthMode, decimal growthValue, int weekIndex)
    {
        if (baseTarget is not decimal value)
        {
            return null;
        }

        if (targetKind == "TimeBefore")
        {
            // Harder = earlier: subtract minutes each week, never before midnight.
            var minutes = (decimal)Math.Clamp((int)Math.Round((double)value) - (int)Math.Round((double)growthValue) * Math.Max(0, weekIndex), 0, 1439);
            return minutes;
        }

        if (weekIndex <= 0 || growthValue <= 0)
        {
            return decimal.Round(value, 2, MidpointRounding.AwayFromZero);
        }

        var grown = NormalizeGrowthMode(growthMode) switch
        {
            "Percent" => value * (decimal)Math.Pow(1d + (double)growthValue / 100d, weekIndex),
            "Step" => value + growthValue * weekIndex,
            _ => value
        };

        return decimal.Round(grown, 2, MidpointRounding.AwayFromZero);
    }

    private static string? FormatClock(decimal? minutes)
    {
        if (minutes is not decimal value)
        {
            return null;
        }

        var m = Math.Clamp((int)Math.Round(value), 0, 1439);
        return $"{m / 60:00}:{m % 60:00}";
    }

    private static int GetTemplateWeekIndex(TrackTemplate template, DateOnly periodDate)
    {
        var originLocal = EnsureUtc(template.CreatedOnUtc).ToLocalTime();
        var originWeek = GetWeekStart(DateOnly.FromDateTime(originLocal));
        var periodWeek = GetWeekStart(periodDate);
        var weeks = (periodWeek.DayNumber - originWeek.DayNumber) / 7;
        return Math.Max(0, weeks);
    }

    private static DateOnly GetWeekStart(DateOnly date)
    {
        var offset = ((int)date.DayOfWeek + 6) % 7; // Monday = 0
        return date.AddDays(-offset);
    }

    private static bool IsCurrentWeek(DateOnly weekStart)
    {
        return GetWeekStart(weekStart) == GetWeekStart(GetToday());
    }

    private static string BuildRangeLabel(int minPoints, int? maxPoints)
    {
        return maxPoints.HasValue ? $"{minPoints}-{maxPoints.Value}" : $"{minPoints}+";
    }

    private static string DisplayBandLabel(string label)
    {
        return label switch
        {
            "Reset" => "Red",
            "Building" => "Amber",
            "Solid" => "Green",
            "Peak" => "Purple",
            _ => label
        };
    }

    private static TrackProfitSummaryDto BuildProfitSummary(
        IReadOnlyList<TrackProfitEntry> entries,
        bool isReady,
        string? message)
    {
        var saved = entries.Where(x => x.EntryType == "Saved").Sum(x => x.Amount);
        var withdrawn = entries.Where(x => x.EntryType == "Withdrawn").Sum(x => x.Amount);
        var balance = saved - withdrawn;

        // Running net balance over time for the sparkline (oldest -> newest).
        var running = 0m;
        var trend = entries
            .OrderBy(x => x.EntryDate)
            .ThenBy(x => x.CreatedOnUtc)
            .Select(x =>
            {
                running += x.EntryType == "Withdrawn" ? -x.Amount : x.Amount;
                return (double)running;
            })
            .ToList();

        return new TrackProfitSummaryDto(
            isReady,
            message,
            "EUR",
            saved,
            withdrawn,
            balance,
            FormatMoney(saved),
            FormatMoney(withdrawn),
            FormatMoney(balance),
            entries
                .OrderByDescending(x => x.EntryDate)
                .ThenByDescending(x => x.CreatedOnUtc)
                .Take(8)
                .Select(x => new TrackProfitEntryDto(
                    x.Id,
                    x.EntryType,
                    x.Amount,
                    FormatMoney(x.Amount),
                    x.Memo,
                    x.EntryDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                    BuildRelativeDayLabel(x.EntryDate, GetToday())))
                .ToList(),
            trend);
    }

    private static string? NormalizeProfitEntryType(string? entryType)
    {
        return string.Equals(entryType, "Saved", StringComparison.OrdinalIgnoreCase)
            ? "Saved"
            : string.Equals(entryType, "Withdrawn", StringComparison.OrdinalIgnoreCase)
                ? "Withdrawn"
                : null;
    }

    private static string FormatMoney(decimal value)
    {
        return string.Create(CultureInfo.InvariantCulture, $"EUR {value:0.00}");
    }

    private static TrackMeasurementStateDto BuildMeasurementState(
        IReadOnlyList<TrackMeasurement> measurements,
        bool isReady,
        string? message,
        DateOnly today)
    {
        var chronological = measurements
            .OrderBy(x => x.MeasurementDate)
            .ThenBy(x => x.CreatedOnUtc)
            .ToList();

        var trends = new[]
        {
            BuildMeasurementTrend("Weight", chronological.Select(x => x.Weight)),
            BuildMeasurementTrend("Belly", chronological.Select(x => x.Belly)),
            BuildMeasurementTrend("Chest", chronological.Select(x => x.Chest)),
            BuildMeasurementTrend("Arm", chronological.Select(x => x.Arm)),
            BuildMeasurementTrend("Leg", chronological.Select(x => x.Leg))
        }.Where(x => x is not null).Select(x => x!).ToList();

        return new TrackMeasurementStateDto(
            isReady,
            message,
            measurements
                .OrderByDescending(x => x.MeasurementDate)
                .ThenByDescending(x => x.CreatedOnUtc)
                .Select(x => new TrackMeasurementDto(
                    x.Id,
                    x.MeasurementDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                    BuildRelativeDayLabel(x.MeasurementDate, today),
                    x.MeasurementDate.ToString("d MMM yyyy", CultureInfo.InvariantCulture),
                    FormatMeasurement(x.Weight),
                    FormatMeasurement(x.Belly),
                    FormatMeasurement(x.Chest),
                    FormatMeasurement(x.Arm),
                    FormatMeasurement(x.Leg)))
                .ToList(),
            trends);
    }

    private static TrackMeasurementTrendDto? BuildMeasurementTrend(string metric, IEnumerable<decimal?> values)
    {
        var series = values.Where(x => x.HasValue).Select(x => (double)x!.Value).ToList();
        if (series.Count == 0)
        {
            return null;
        }

        var latest = series[^1];
        string? deltaLabel = null;
        var deltaSign = 0;
        if (series.Count >= 2)
        {
            var delta = Math.Round(latest - series[^2], 1);
            deltaSign = Math.Sign(delta);
            deltaLabel = (delta > 0 ? "+" : "") + delta.ToString("0.0", CultureInfo.InvariantCulture);
        }

        return new TrackMeasurementTrendDto(
            metric,
            latest.ToString("0.0", CultureInfo.InvariantCulture),
            deltaLabel,
            deltaSign,
            series);
    }

    private const int StreakThresholdPercent = 80;

    private static double NoteProgressPercent(TrackNote note)
    {
        var max = note.Items.Sum(x => x.Points);
        if (max <= 0)
        {
            return 0;
        }

        var completed = note.Items.Sum(x => x.Points * ItemCompletionRatio(x));
        return completed * 100d / max;
    }

    private static TrackStreakDto BuildStreak(IReadOnlyList<TrackNote> dailyNotes, DateOnly today)
    {
        var hits = dailyNotes
            .GroupBy(x => x.TrackDate)
            .Where(g => g.Max(NoteProgressPercent) >= StreakThresholdPercent)
            .Select(g => g.Key.DayNumber)
            .ToHashSet();

        // Current streak ends today, or yesterday if today is not done yet.
        var current = 0;
        var anchor = hits.Contains(today.DayNumber) ? today.DayNumber : today.DayNumber - 1;
        for (var day = anchor; hits.Contains(day); day--)
        {
            current++;
        }

        var longest = 0;
        var run = 0;
        var ordered = hits.OrderBy(x => x).ToList();
        for (var i = 0; i < ordered.Count; i++)
        {
            run = i > 0 && ordered[i] == ordered[i - 1] + 1 ? run + 1 : 1;
            longest = Math.Max(longest, run);
        }

        var activeDays = dailyNotes.Select(x => x.TrackDate.DayNumber).ToHashSet();
        var last30Hits = 0;
        var last30Active = 0;
        for (var i = 0; i < 30; i++)
        {
            var day = today.DayNumber - i;
            if (activeDays.Contains(day)) last30Active++;
            if (hits.Contains(day)) last30Hits++;
        }

        return new TrackStreakDto(current, longest, last30Hits, last30Active, StreakThresholdPercent);
    }

    private static TrackWeeklyReviewDto BuildWeeklyReview(
        IReadOnlyList<TrackNote> dailyNotes,
        TrackTemplate? template,
        IReadOnlyList<TrackProfitEntry> profitEntries,
        IReadOnlyList<TrackMeasurement> measurements,
        DateOnly today)
    {
        var weekStart = GetWeekStart(today);
        var weekEnd = weekStart.AddDays(6);

        var dayGroups = dailyNotes
            .Where(x => x.TrackDate >= weekStart && x.TrackDate <= weekEnd)
            .GroupBy(x => x.TrackDate)
            .ToList();

        var daysActive = dayGroups.Count;
        var daysHit = dayGroups.Count(g => g.Max(NoteProgressPercent) >= StreakThresholdPercent);
        var avg = dayGroups.Count == 0 ? 0 : Math.Round(dayGroups.Average(g => g.Max(NoteProgressPercent)), 0);

        var savedThisWeek = profitEntries
            .Where(x => x.EntryDate >= weekStart && x.EntryDate <= weekEnd)
            .Sum(x => x.EntryType == "Withdrawn" ? -x.Amount : x.Amount);

        string? weightDelta = null;
        var weights = measurements
            .Where(x => x.Weight.HasValue)
            .OrderBy(x => x.MeasurementDate)
            .Select(x => x.Weight!.Value)
            .ToList();
        if (weights.Count >= 2)
        {
            var delta = Math.Round(weights[^1] - weights[^2], 1);
            weightDelta = (delta > 0 ? "+" : "") + delta.ToString("0.0", CultureInfo.InvariantCulture) + " kg";
        }

        var nextTargets = new List<TrackReviewTargetDto>();
        if (template is not null)
        {
            var thisIdx = GetTemplateWeekIndex(template, weekStart);
            foreach (var item in template.Items.Where(i => i.BaseTarget.HasValue).OrderBy(i => i.SortOrder).ThenBy(i => i.Id))
            {
                var isTime = item.TargetKind == "TimeBefore";
                var unit = isTime || string.IsNullOrWhiteSpace(item.Unit) ? "" : " " + item.Unit;
                var current = GrowTarget(item.TargetKind, item.BaseTarget, item.GrowthMode, item.GrowthValue, thisIdx);
                var next = GrowTarget(item.TargetKind, item.BaseTarget, item.GrowthMode, item.GrowthValue, thisIdx + 1);
                var currentLabel = isTime ? FormatClock(current) : FormatMeasurement(current);
                var nextLabel = isTime ? FormatClock(next) : FormatMeasurement(next);
                nextTargets.Add(new TrackReviewTargetDto(
                    item.Label,
                    (currentLabel ?? "") + unit,
                    (nextLabel ?? "") + unit));
            }
        }

        var hasData = dayGroups.Count > 0 || nextTargets.Count > 0 || savedThisWeek != 0;
        var weekLabel = $"This week · {BuildWeekRangeLabel(weekStart)}";

        return new TrackWeeklyReviewDto(
            hasData,
            weekLabel,
            daysHit,
            daysActive,
            avg,
            FormatMoney(savedThisWeek),
            weightDelta,
            nextTargets);
    }

    private static IReadOnlyList<TrackMonthChartDto> BuildMonthCharts(IReadOnlyList<TrackNote> notes, DateOnly today)
    {
        return notes
            .GroupBy(x => new { x.TrackDate.Year, x.TrackDate.Month })
            .OrderByDescending(x => x.Key.Year)
            .ThenByDescending(x => x.Key.Month)
            .Select(group =>
            {
                var firstOfMonth = new DateOnly(group.Key.Year, group.Key.Month, 1);
                var daysInMonth = DateTime.DaysInMonth(group.Key.Year, group.Key.Month);
                var dayPoints = group
                    .GroupBy(x => x.TrackDate.Day)
                    .Select(dayGroup =>
                    {
                        var completed = Math.Round(dayGroup
                            .SelectMany(x => x.Items)
                            .Sum(x => x.Points * ItemCompletionRatio(x)), 1);
                        var max = dayGroup.SelectMany(x => x.Items).Sum(x => x.Points);
                        return new TrackMonthPointDto(
                            dayGroup.Key,
                            completed,
                            max,
                            max <= 0 ? 0 : Math.Round((completed * 100d) / max, 1));
                    })
                    .OrderBy(x => x.Day)
                    .ToList();

                return new TrackMonthChartDto(
                    firstOfMonth.ToString("yyyy-MM", CultureInfo.InvariantCulture),
                    firstOfMonth.ToString("MMMM yyyy", CultureInfo.InvariantCulture),
                    daysInMonth,
                    firstOfMonth.Year == today.Year && firstOfMonth.Month == today.Month,
                    dayPoints);
            })
            .ToList();
    }

    private static TrackMotivationStateDto BuildMotivationState(
        IReadOnlyList<TrackMotivationLink> links,
        bool isReady,
        string? message)
    {
        return new TrackMotivationStateDto(
            isReady,
            message,
            links
                .OrderByDescending(x => x.CreatedOnUtc)
                .Select(x => new TrackMotivationLinkDto(
                    x.Id,
                    x.Url,
                    x.Title,
                    x.Provider,
                    x.EmbedUrl,
                    EnsureUtc(x.CreatedOnUtc).ToLocalTime().ToString("d MMM yyyy", CultureInfo.InvariantCulture)))
                .ToList());
    }

    private static decimal? RoundMeasurement(decimal? value)
    {
        return value.HasValue ? decimal.Round(value.Value, 1, MidpointRounding.AwayFromZero) : null;
    }

    private static string? FormatMeasurement(decimal? value)
    {
        return value.HasValue ? value.Value.ToString("0.0", CultureInfo.InvariantCulture) : null;
    }

    private static DateOnly ParseDateOrToday(string? value)
    {
        return DateOnly.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed)
            ? parsed
            : GetToday();
    }

    private static EmbedInfo BuildEmbed(Uri uri)
    {
        var host = uri.Host.ToLowerInvariant();
        if (host.StartsWith("www.", StringComparison.Ordinal))
        {
            host = host[4..];
        }

        if (host is "youtube.com" or "m.youtube.com" or "youtu.be" or "youtube-nocookie.com")
        {
            var id = ExtractYouTubeId(uri);
            return string.IsNullOrWhiteSpace(id)
                ? new EmbedInfo("YouTube", null)
                : new EmbedInfo("YouTube", $"https://www.youtube-nocookie.com/embed/{id}");
        }

        if (host is "instagram.com")
        {
            var cleanPath = uri.AbsolutePath.TrimEnd('/');
            var isEmbeddable = cleanPath.StartsWith("/p/", StringComparison.OrdinalIgnoreCase) ||
                cleanPath.StartsWith("/reel/", StringComparison.OrdinalIgnoreCase) ||
                cleanPath.StartsWith("/tv/", StringComparison.OrdinalIgnoreCase);

            return new EmbedInfo("Instagram", isEmbeddable ? $"https://www.instagram.com{cleanPath}/embed" : null);
        }

        if (host is "facebook.com" or "fb.watch")
        {
            return new EmbedInfo(
                "Facebook",
                $"https://www.facebook.com/plugins/video.php?href={Uri.EscapeDataString(uri.ToString())}&show_text=false&width=560");
        }

        return new EmbedInfo("Link", null);
    }

    private static string? ExtractYouTubeId(Uri uri)
    {
        var host = uri.Host.ToLowerInvariant();
        if (host.StartsWith("www.", StringComparison.Ordinal))
        {
            host = host[4..];
        }

        if (host == "youtu.be")
        {
            return CleanYouTubeId(uri.AbsolutePath.Trim('/').Split('/').FirstOrDefault());
        }

        var query = Microsoft.AspNetCore.WebUtilities.QueryHelpers.ParseQuery(uri.Query);
        if (query.TryGetValue("v", out var idFromQuery))
        {
            return CleanYouTubeId(idFromQuery.FirstOrDefault());
        }

        var match = Regex.Match(uri.AbsolutePath, @"/(?:embed|shorts|live)/([^/?#]+)", RegexOptions.IgnoreCase);
        return match.Success ? CleanYouTubeId(match.Groups[1].Value) : null;
    }

    private static string? CleanYouTubeId(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var id = value.Trim();
        return Regex.IsMatch(id, @"^[A-Za-z0-9_-]{6,32}$") ? id : null;
    }

    private static DateOnly GetToday()
    {
        return DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, TrackTimeZone.Value));
    }

    private static TimeZoneInfo ResolveTrackTimeZone()
    {
        foreach (var id in new[] { "Europe/Kyiv", "Europe/Kiev", "FLE Standard Time" })
        {
            try
            {
                return TimeZoneInfo.FindSystemTimeZoneById(id);
            }
            catch (TimeZoneNotFoundException)
            {
            }
            catch (InvalidTimeZoneException)
            {
            }
        }

        return TimeZoneInfo.Local;
    }

    private static DateTime EnsureUtc(DateTime value)
    {
        return value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
        };
    }

    private static string NormalizeColor(string? colorHex)
    {
        var color = (colorHex ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(color))
        {
            return "#d9485f";
        }

        if (color.StartsWith('#') && (color.Length == 4 || color.Length == 7))
        {
            return color;
        }

        return "#d9485f";
    }

    private async Task<T?> ReadRequestAsync<T>()
    {
        return await Request.ReadFromJsonAsync<T>(JsonOptions);
    }

    private sealed record CreateNoteRequest(int? TemplateId, string? TrackDate);
    private sealed record DeleteTemplateRequest(int TemplateId);
    private sealed record ToggleNoteItemRequest(int? NoteId, int NoteItemId, bool IsChecked);
    private sealed record LogNoteItemRequest(int? NoteId, int NoteItemId, decimal? ActualValue);
    private sealed record ResyncNoteRequest(int NoteId);
    private sealed record LogChoiceRequest(int NoteId, string Choice, int Delta);
    private sealed record DeleteEntryRequest(int Id);
    private sealed record AddProfitEntryRequest(decimal Amount, string? EntryType, string? Memo);
    private sealed record AddMeasurementRequest(
        string? MeasurementDate,
        decimal? Weight,
        decimal? Belly,
        decimal? Chest,
        decimal? Arm,
        decimal? Leg);
    private sealed record AddMotivationLinkRequest(string? Url, string? Title);

    private sealed record SaveTemplateRequest(
        int? Id,
        string? Name,
        string? Description,
        string? Cadence,
        bool IsDefault,
        IReadOnlyList<SaveTemplateItemRequest>? Items,
        IReadOnlyList<SaveTemplateBandRequest>? Bands);

    private sealed record ResetRequest(string? Scope);

    private sealed record SaveTemplateItemRequest(
        string? Label,
        int Points,
        string? TargetKind,
        string? Unit,
        decimal? BaseTarget,
        string? GrowthMode,
        decimal? GrowthValue);
    private sealed record SaveTemplateBandRequest(string? Label, int MinPoints, int? MaxPoints, string? ColorHex);

    private sealed record NormalizedItem(
        string Label,
        int Points,
        int SortOrder,
        string TargetKind,
        string? Unit,
        decimal? BaseTarget,
        string GrowthMode,
        decimal GrowthValue);
    private sealed record NormalizedBand(string Label, int MinPoints, int? MaxPoints, string ColorHex, int SortOrder);

    private sealed class NaturalStringComparer : IComparer<string?>
    {
        public int Compare(string? x, string? y)
        {
            x ??= string.Empty;
            y ??= string.Empty;

            var ix = 0;
            var iy = 0;

            while (ix < x.Length && iy < y.Length)
            {
                var cx = x[ix];
                var cy = y[iy];

                if (char.IsDigit(cx) && char.IsDigit(cy))
                {
                    var numberCompare = CompareNumberRun(x, ref ix, y, ref iy);
                    if (numberCompare != 0)
                    {
                        return numberCompare;
                    }

                    continue;
                }

                var charCompare = char.ToUpperInvariant(cx).CompareTo(char.ToUpperInvariant(cy));
                if (charCompare != 0)
                {
                    return charCompare;
                }

                ix++;
                iy++;
            }

            return x.Length.CompareTo(y.Length);
        }

        private static int CompareNumberRun(string x, ref int ix, string y, ref int iy)
        {
            var xStart = ix;
            var yStart = iy;

            while (ix < x.Length && char.IsDigit(x[ix]))
            {
                ix++;
            }

            while (iy < y.Length && char.IsDigit(y[iy]))
            {
                iy++;
            }

            var xSig = xStart;
            var ySig = yStart;
            while (xSig < ix && x[xSig] == '0')
            {
                xSig++;
            }

            while (ySig < iy && y[ySig] == '0')
            {
                ySig++;
            }

            var xLen = ix - xSig;
            var yLen = iy - ySig;
            if (xLen != yLen)
            {
                return xLen.CompareTo(yLen);
            }

            for (var offset = 0; offset < xLen; offset++)
            {
                var digitCompare = x[xSig + offset].CompareTo(y[ySig + offset]);
                if (digitCompare != 0)
                {
                    return digitCompare;
                }
            }

            return 0;
        }
    }

    private sealed record TrackPageState(
        string Today,
        int? SelectedTemplateId,
        IReadOnlyList<TrackTemplateDto> Templates,
        TrackNoteDto? FocusNote,
        IReadOnlyList<TrackNoteDto> ArchiveNotes,
        IReadOnlyList<TrackMissedDayDto> MissedDays,
        int TotalNotes,
        int TotalTemplates,
        TrackProfitSummaryDto Profit,
        TrackMeasurementStateDto Measurements,
        IReadOnlyList<TrackMonthChartDto> MonthCharts,
        TrackMotivationStateDto Motivation,
        TrackStreakDto Streak,
        TrackWeeklyReviewDto WeeklyReview,
        bool SchemaReady,
        string? SchemaMessage);

    private sealed record TrackStreakDto(
        int Current,
        int Longest,
        int Last30Hits,
        int Last30Active,
        int ThresholdPercent);

    private sealed record TrackWeeklyReviewDto(
        bool HasData,
        string WeekLabel,
        int DaysHit,
        int DaysActive,
        double AvgCompletion,
        string SavedThisWeekLabel,
        string? WeightDeltaLabel,
        IReadOnlyList<TrackReviewTargetDto> NextTargets);

    private sealed record TrackReviewTargetDto(string Label, string CurrentLabel, string NextLabel);

    private sealed record TrackTemplateDto(
        int Id,
        string Name,
        string? Description,
        string Cadence,
        bool IsDefault,
        bool HasTodayCard,
        int MaxPoints,
        int NoteCount,
        IReadOnlyList<TrackTemplateItemDto> Items,
        IReadOnlyList<TrackBandDto> Bands);

    private sealed record TrackTemplateItemDto(
        int Id,
        string Label,
        int Points,
        int SortOrder,
        string TargetKind,
        string? Unit,
        decimal? BaseTarget,
        string GrowthMode,
        decimal GrowthValue);

    private sealed record TrackBandDto(
        string Label,
        int MinPoints,
        int? MaxPoints,
        string ColorHex,
        bool IsActive,
        string RangeLabel);

    private sealed record TrackNoteDto(
        int Id,
        int? TemplateId,
        string Title,
        string TemplateName,
        string PeriodType,
        string TrackDate,
        string RelativeDayLabel,
        string DateLabel,
        string CreatedLabel,
        double CompletedPoints,
        int MaxPoints,
        double ProgressPercent,
        string ScoreLabel,
        string ActiveBandLabel,
        string ActiveBandColor,
        IReadOnlyList<TrackBandDto> Bands,
        IReadOnlyList<TrackNoteItemDto> Items,
        int HardCount,
        int EasyCount);

    private sealed record TrackNoteItemDto(
        int Id,
        string Label,
        int Points,
        bool IsChecked,
        int SortOrder,
        string TargetKind,
        string? Unit,
        decimal? TargetValue,
        decimal? ActualValue,
        string? TargetLabel,
        string? ActualLabel,
        double CompletionPercent);
    private sealed record TrackMissedDayDto(string TrackDate, string RelativeDayLabel, string DateLabel);
    private sealed record TrackProfitSummaryDto(
        bool IsReady,
        string? Message,
        string Currency,
        decimal Saved,
        decimal Withdrawn,
        decimal Balance,
        string SavedLabel,
        string WithdrawnLabel,
        string BalanceLabel,
        IReadOnlyList<TrackProfitEntryDto> RecentEntries,
        IReadOnlyList<double> Trend);

    private sealed record TrackProfitEntryDto(
        int Id,
        string EntryType,
        decimal Amount,
        string AmountLabel,
        string? Memo,
        string EntryDate,
        string RelativeDayLabel);

    private sealed record TrackMeasurementStateDto(
        bool IsReady,
        string? Message,
        IReadOnlyList<TrackMeasurementDto> Entries,
        IReadOnlyList<TrackMeasurementTrendDto> Trends);

    private sealed record TrackMeasurementTrendDto(
        string Metric,
        string? LatestLabel,
        string? DeltaLabel,
        int DeltaSign,
        IReadOnlyList<double> Series);

    private sealed record TrackMeasurementDto(
        int Id,
        string MeasurementDate,
        string RelativeDayLabel,
        string DateLabel,
        string? Weight,
        string? Belly,
        string? Chest,
        string? Arm,
        string? Leg);

    private sealed record TrackMonthChartDto(
        string MonthKey,
        string MonthLabel,
        int DaysInMonth,
        bool IsCurrentMonth,
        IReadOnlyList<TrackMonthPointDto> Points);

    private sealed record TrackMonthPointDto(int Day, double CompletedPoints, int MaxPoints, double ProgressPercent);

    private sealed record TrackMotivationStateDto(
        bool IsReady,
        string? Message,
        IReadOnlyList<TrackMotivationLinkDto> Links);

    private sealed record TrackMotivationLinkDto(
        int Id,
        string Url,
        string? Title,
        string Provider,
        string? EmbedUrl,
        string CreatedLabel);

    private sealed record EmbedInfo(string Provider, string? EmbedUrl);

    private sealed record ActionResponse(TrackPageState State, string Message);
    private sealed record ErrorResponse(string Message);
}
