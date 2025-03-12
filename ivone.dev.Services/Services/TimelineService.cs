using ivone.dev.Data.Contexts;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

public class TimelineService : ITimelineService
{
    private readonly AppDbContext _context;
    public TimelineService(AppDbContext context)
    {
        _context = context;
    }

    // Timeline management
    public async Task<List<Timeline>> GetTimelinesForUserAsync(int userId)
    {
        // Return timelines owned by the user or shared with them
        return await _context.Set<Timeline>()
            .Include(t => t.TimelineEvents)
            .Include(t => t.UserTimelines)
            .Where(t => t.OwnerId == userId || t.UserTimelines.Any(ut => ut.UserId == userId))
            .ToListAsync();
    }

    public async Task<Timeline> GetTimelineByIdAsync(int timelineId)
    {
        return await _context.Set<Timeline>()
            .Include(t => t.TimelineEvents)
            .FirstOrDefaultAsync(t => t.Id == timelineId);
    }

    public async Task AddTimelineAsync(Timeline timeline)
    {
        await _context.Set<Timeline>().AddAsync(timeline);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateTimelineAsync(Timeline timeline)
    {
        _context.Set<Timeline>().Update(timeline);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteTimelineAsync(int timelineId)
    {
        var timeline = await GetTimelineByIdAsync(timelineId);
        if (timeline != null)
        {
            _context.Set<Timeline>().Remove(timeline);
            await _context.SaveChangesAsync();
        }
    }

    // Timeline event management
    public async Task<List<TimelineEvent>> GetEventsByTimelineAsync(int timelineId)
    {
        return await _context.Set<TimelineEvent>()
            .Where(e => e.TimelineId == timelineId)
            .ToListAsync();
    }

    public async Task AddEventAsync(TimelineEvent timelineEvent)
    {
        await _context.Set<TimelineEvent>().AddAsync(timelineEvent);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateEventAsync(TimelineEvent timelineEvent)
    {
        _context.Set<TimelineEvent>().Update(timelineEvent);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteEventAsync(int eventId)
    {
        var timelineEvent = await _context.Set<TimelineEvent>().FindAsync(eventId);
        if (timelineEvent != null)
        {
            _context.Set<TimelineEvent>().Remove(timelineEvent);
            await _context.SaveChangesAsync();
        }
    }

    // Sharing functionality
    public async Task ShareTimelineAsync(int timelineId, int userId)
    {
        var shareEntry = new UserTimeline { TimelineId = timelineId, UserId = userId };
        await _context.Set<UserTimeline>().AddAsync(shareEntry);
        await _context.SaveChangesAsync();
    }

    public async Task UnshareTimelineAsync(int timelineId, int userId)
    {
        var shareEntry = await _context.Set<UserTimeline>()
            .FirstOrDefaultAsync(ut => ut.TimelineId == timelineId && ut.UserId == userId);
        if (shareEntry != null)
        {
            _context.Set<UserTimeline>().Remove(shareEntry);
            await _context.SaveChangesAsync();
        }
    }
}
