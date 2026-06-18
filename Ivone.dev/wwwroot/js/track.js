(() => {
    const root = document.querySelector("[data-track-root]");
    const bootstrap = document.getElementById("trackBootstrap");
    if (!root || !bootstrap) {
        return;
    }

    const urls = {
        createNote: root.dataset.createNoteUrl,
        createNoteForDate: root.dataset.createNoteForDateUrl,
        saveTemplate: root.dataset.saveTemplateUrl,
        deleteTemplate: root.dataset.deleteTemplateUrl,
        toggleItem: root.dataset.toggleItemUrl,
        logItem: root.dataset.logItemUrl,
        resyncNote: root.dataset.resyncNoteUrl,
        addProfit: root.dataset.addProfitUrl,
        deleteProfit: root.dataset.deleteProfitUrl,
        addMeasurement: root.dataset.addMeasurementUrl,
        deleteMeasurement: root.dataset.deleteMeasurementUrl,
        addMotivationLink: root.dataset.addMotivationLinkUrl,
        deleteMotivation: root.dataset.deleteMotivationUrl,
        logChoice: root.dataset.logChoiceUrl,
        reset: root.dataset.resetUrl
    };

    const token = root.dataset.requestToken || "";

    const dom = {
        templatePicker: document.getElementById("templatePicker"),
        newNoteBtn: document.getElementById("newNoteBtn"),
        trackMenuBtn: document.getElementById("trackMenuBtn"),
        trackHeaderMenu: document.getElementById("trackHeaderMenu"),
        manageTemplatesBtn: document.getElementById("manageTemplatesBtn"),
        measurementsBtn: document.getElementById("measurementsBtn"),
        focusNoteMount: document.getElementById("focusNoteMount"),
        archiveNotesMount: document.getElementById("archiveNotesMount"),
        monthChartsMount: document.getElementById("monthChartsMount"),
        motivationLinksMount: document.getElementById("motivationLinksMount"),
        weeklyReviewMount: document.getElementById("weeklyReviewMount"),
        trackStats: document.getElementById("trackStats"),
        statusPill: document.getElementById("statusPill"),
        heroTitle: document.getElementById("heroTitle"),
        focusEyebrow: document.getElementById("focusEyebrow"),
        focusEyebrow2: document.getElementById("focusEyebrow2"),
        focusHeading: document.getElementById("focusHeading"),
        toast: document.getElementById("trackToast"),
        profitBalance: document.getElementById("profitBalance"),
        profitWithdrawn: document.getElementById("profitWithdrawn"),
        profitTrend: document.getElementById("profitTrend"),
        profitPresets: document.getElementById("profitPresets"),
        profitEntries: document.getElementById("profitEntries"),
        profitForm: document.getElementById("profitForm"),
        profitAmount: document.getElementById("profitAmount"),
        profitMemo: document.getElementById("profitMemo"),
        measurementsStudio: document.getElementById("measurementsStudio"),
        closeMeasurementsBtn: document.getElementById("closeMeasurementsBtn"),
        measurementForm: document.getElementById("measurementForm"),
        measurementDate: document.getElementById("measurementDate"),
        measurementWeight: document.getElementById("measurementWeight"),
        measurementBelly: document.getElementById("measurementBelly"),
        measurementChest: document.getElementById("measurementChest"),
        measurementArm: document.getElementById("measurementArm"),
        measurementLeg: document.getElementById("measurementLeg"),
        measurementsMount: document.getElementById("measurementsMount"),
        measurementTrendsMount: document.getElementById("measurementTrendsMount"),
        motivationForm: document.getElementById("motivationForm"),
        motivationUrl: document.getElementById("motivationUrl"),
        motivationTitle: document.getElementById("motivationTitle"),
        studio: document.getElementById("templateStudio"),
        closeStudioBtn: document.getElementById("closeStudioBtn"),
        newTemplateBtn: document.getElementById("newTemplateBtn"),
        templateLibrary: document.getElementById("templateLibrary"),
        templateForm: document.getElementById("templateForm"),
        templateId: document.getElementById("templateId"),
        templateName: document.getElementById("templateName"),
        templateDescription: document.getElementById("templateDescription"),
        templateCadence: document.getElementById("templateCadence"),
        templateIsDefault: document.getElementById("templateIsDefault"),
        templateItems: document.getElementById("templateItems"),
        templateBands: document.getElementById("templateBands"),
        addItemBtn: document.getElementById("addItemBtn"),
        deleteTemplateBtn: document.getElementById("deleteTemplateBtn"),
        saveTemplateBtn: document.getElementById("saveTemplateBtn")
    };

    const MONEY_PRESETS = [
        { label: "Coke €2", amount: 2, memo: "Coke" },
        { label: "Chocolate €3", amount: 3, memo: "Chocolate" },
        { label: "Snack €5", amount: 5, memo: "Snack" },
        { label: "Takeaway €12", amount: 12, memo: "Takeaway" }
    ];

    let state = safeParse(bootstrap.textContent) || {};
    let selectedTemplateId = state.selectedTemplateId || null;
    let editingTemplate = null;
    let toastTimer = 0;

    /* ---------- utils ---------- */
    function safeParse(value) { try { return JSON.parse(value || "{}"); } catch { return {}; } }

    function getChoiceTotals() {
        const allNotes = [state.focusNote, ...(state.archiveNotes || [])].filter(Boolean);
        return allNotes.reduce((acc, n) => ({ hard: acc.hard + (n.hardCount || 0), easy: acc.easy + (n.easyCount || 0) }), { hard: 0, easy: 0 });
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
    }

    function normalizeColor(value, fallback = "#c8f536") {
        return /^#[0-9a-f]{6}$/i.test(value || "") ? value : fallback;
    }

    function numberOrNull(value) {
        const parsed = Number(value);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    }

    function shortMoney(label) {
        return String(label || "EUR 0.00").replace("EUR ", "€").replace(/\.00$/, "");
    }

    function emptyItem() {
        return { label: "", points: 1, targetKind: "Amount", unit: "", baseTarget: null, growthMode: "None", growthValue: 0 };
    }

    function timeToMinutes(value) {
        if (!value) { return null; }
        const [h, m] = String(value).split(":").map(Number);
        if (!Number.isFinite(h)) { return null; }
        return h * 60 + (Number.isFinite(m) ? m : 0);
    }

    function minutesToTime(minutes) {
        if (minutes == null || minutes === "") { return ""; }
        const m = Math.max(0, Math.min(1439, Math.round(Number(minutes))));
        return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    }

    function itemKindOf(item) {
        if (String(item.targetKind || "Amount") === "TimeBefore") { return "TimeBefore"; }
        if (item.baseTarget != null && item.unit) { return "Amount"; }
        return "Check";
    }

    async function postJson(url, payload) {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json", "RequestVerificationToken": token },
            body: JSON.stringify(payload)
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data.message || "The request failed.");
        }
        return data;
    }

    function showToast(message) {
        if (!message || !dom.toast) { return; }
        dom.toast.textContent = message;
        dom.toast.classList.add("is-visible");
        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(() => dom.toast.classList.remove("is-visible"), 3200);
    }

    function setBusy(button, isBusy) {
        if (!button) { return; }
        button.disabled = isBusy;
        button.setAttribute("aria-busy", String(isBusy));
    }

    function setHeaderMenu(open) {
        dom.trackMenuBtn.setAttribute("aria-expanded", String(open));
        dom.trackMenuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
        dom.trackHeaderMenu.classList.toggle("is-open", open);
        document.body.classList.toggle("menu-open", open);
    }
    function closeHeaderMenu() { setHeaderMenu(false); }

    function applyActionResponse(data, options = {}) {
        state = data.state || state;
        if (options.focusNoteDate) { focusNoteByDate(options.focusNoteDate); }
        if (options.focusNoteId) { focusNoteById(Number(options.focusNoteId)); }
        selectedTemplateId = state.selectedTemplateId || selectedTemplateId;
        render();
        renderEditorFromSelected();
        showToast(data.message);
    }

    function focusNoteById(noteId) {
        if (!noteId || !state) { return; }
        if (state.focusNote && Number(state.focusNote.id) === noteId) { return; }
        const archive = state.archiveNotes || [];
        const index = archive.findIndex(n => Number(n.id) === noteId);
        if (index < 0) { return; }
        const [next] = archive.splice(index, 1);
        if (state.focusNote) { archive.unshift(state.focusNote); }
        state.focusNote = next;
        state.archiveNotes = archive;
    }

    function focusNoteByDate(trackDate) {
        if (!trackDate || !state) { return; }
        if (state.focusNote && state.focusNote.trackDate === trackDate) { return; }
        const archive = state.archiveNotes || [];
        const index = archive.findIndex(n => n.trackDate === trackDate);
        if (index < 0) { return; }
        const [next] = archive.splice(index, 1);
        if (state.focusNote) { archive.unshift(state.focusNote); }
        state.focusNote = next;
        state.archiveNotes = archive;
    }

    function sparkSvg(values, width, height) {
        const nums = (values || []).map(Number).filter(Number.isFinite);
        if (nums.length === 0) { return ""; }
        const pad = 3;
        const min = Math.min(...nums), max = Math.max(...nums);
        const span = max - min || 1;
        const n = nums.length;
        const xAt = i => n === 1 ? width / 2 : pad + (i / (n - 1)) * (width - 2 * pad);
        const yAt = v => height - pad - ((v - min) / span) * (height - 2 * pad);
        const line = nums.map((v, i) => `${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`).join(" ");
        const fill = `${xAt(0).toFixed(1)},${(height - pad).toFixed(1)} ${line} ${xAt(n - 1).toFixed(1)},${(height - pad).toFixed(1)}`;
        return `<polygon class="track-spark-fill" points="${fill}"></polygon><polyline class="track-spark-line" points="${line}"></polyline>`;
    }

    /* ---------- render ---------- */
    function render() {
        renderTemplatePicker();
        renderStats();
        renderMoney();
        renderWeeklyReview();
        renderFocusNote();
        renderMonthCharts();
        renderArchiveNotes();
        renderMeasurements();
        renderMotivationLinks();
        renderTemplateLibrary();
    }

    function isWeeklyTemplate(template) {
        return String(template?.cadence || "Daily").toLowerCase() === "weekly";
    }

    function getSelectedTemplate() {
        const templates = state.templates || [];
        return templates.find(t => t.id === Number(selectedTemplateId)) || templates[0] || null;
    }

    function renderTemplatePicker() {
        const templates = state.templates || [];
        dom.templatePicker.innerHTML = templates.length
            ? templates.map(t => `<option value="${t.id}">${escapeHtml(t.name)}${isWeeklyTemplate(t) ? " · weekly" : ""}</option>`).join("")
            : `<option value="">${state.schemaReady === false ? "Schema missing" : "No templates"}</option>`;
        if (selectedTemplateId) { dom.templatePicker.value = String(selectedTemplateId); }

        const selected = getSelectedTemplate();
        const weekly = isWeeklyTemplate(selected);
        const hasCard = !!selected?.hasTodayCard;
        dom.newNoteBtn.disabled = templates.length === 0 || state.schemaReady === false || hasCard;
        dom.newNoteBtn.textContent = hasCard
            ? (weekly ? "Week logged" : "Today logged")
            : (weekly ? "+ Log week" : "+ Log today");
    }

    function statTile(value, label, accent) {
        const cls = accent === true ? "track-stat--accent" : (typeof accent === "string" ? `track-stat--${accent}` : "");
        return `<div class="track-stat ${cls}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
    }

    function renderStats() {
        const focus = state.focusNote;
        const streak = state.streak || {};
        const review = state.weeklyReview || {};
        const profit = state.profit || {};

        if (dom.heroTitle) { dom.heroTitle.textContent = focus ? focus.relativeDayLabel : "Today"; }
        const eyebrow = focus ? focus.relativeDayLabel : "Today";
        if (dom.focusEyebrow) { dom.focusEyebrow.textContent = eyebrow; }
        if (dom.focusEyebrow2) { dom.focusEyebrow2.textContent = eyebrow; }
        if (dom.focusHeading) { dom.focusHeading.textContent = focus ? focus.dateLabel : (state.today || ""); }

        if (state.schemaReady === false) {
            dom.trackStats.innerHTML = statTile("Run SQL", "Setup");
            dom.statusPill.textContent = "Run the track schema SQL";
            return;
        }

        const tiles = [];
        tiles.push(statTile(`${streak.current || 0}`, "Day streak", true));
        tiles.push(statTile(`${review.daysHit || 0}/7`, "Days hit · week"));
        if (profit.isReady !== false) {
            tiles.push(statTile(shortMoney(profit.balanceLabel), "Saved bank", true));
        }
        if (focus) {
            tiles.push(statTile(focus.scoreLabel, focus.activeBandLabel || "Score"));
        } else {
            tiles.push(statTile(`${streak.longest || 0}`, "Best streak"));
        }
        const totals = getChoiceTotals();
        tiles.push(statTile(`${totals.hard}`, "Hard wins", "hard"));
        tiles.push(statTile(`${totals.easy}`, "Easy slips", "easy"));
        dom.trackStats.innerHTML = tiles.join("");

        dom.statusPill.textContent = focus
            ? `${focus.relativeDayLabel} · ${focus.scoreLabel}`
            : "Pick a template, then log today";
    }

    function renderMoney() {
        const profit = state.profit || {};
        const ready = profit.isReady !== false && state.schemaReady !== false;

        dom.profitBalance.textContent = ready ? (profit.balanceLabel || "EUR 0.00") : "SQL needed";
        dom.profitWithdrawn.textContent = ready
            ? `Withdrawn ${profit.withdrawnLabel || "EUR 0.00"}`
            : (profit.message || "Run updated SQL");

        [...dom.profitForm.elements].forEach(el => { el.disabled = !ready; });

        dom.profitTrend.innerHTML = ready ? sparkSvg(profit.trend, 120, 40) : "";

        dom.profitPresets.innerHTML = ready
            ? MONEY_PRESETS.map(p => `<button class="track-chip" type="button" data-preset-amount="${p.amount}" data-preset-memo="${escapeHtml(p.memo)}">${escapeHtml(p.label)}</button>`).join("")
            : "";

        const entries = profit.recentEntries || [];
        dom.profitEntries.innerHTML = entries.length
            ? entries.map(e => `
                <div class="track-entry">
                    <span class="track-entry__dot ${e.entryType === "Withdrawn" ? "track-entry__dot--out" : ""}"></span>
                    <span class="track-entry__memo">${escapeHtml(e.memo || (e.entryType === "Withdrawn" ? "Spent" : "Saved"))} · ${escapeHtml(e.relativeDayLabel)}</span>
                    <span class="track-entry__amount">${e.entryType === "Withdrawn" ? "−" : "+"}${escapeHtml(e.amountLabel)}</span>
                    <button class="track-entry__del" type="button" data-delete-profit="${e.id}" aria-label="Delete entry">&times;</button>
                </div>`).join("")
            : "";
    }

    function renderWeeklyReview() {
        const review = state.weeklyReview || {};
        if (state.schemaReady === false || !review.hasData) {
            dom.weeklyReviewMount.innerHTML = emptyMarkup("Nothing logged this week yet", "Log a day and your weekly compounding shows up here.");
            return;
        }

        const metrics = [
            statBlock(`${review.daysHit || 0}/${review.daysActive || 7}`, "Days hit"),
            statBlock(`${Math.round(review.avgCompletion || 0)}%`, "Avg done"),
            statBlock(shortMoney(review.savedThisWeekLabel), "Saved")
        ];
        if (review.weightDeltaLabel) {
            metrics.push(statBlock(review.weightDeltaLabel, "Weight Δ"));
        }

        const targets = (review.nextTargets || []).map(t => `
            <div class="track-review__target">
                <b>${escapeHtml(t.label)}</b>
                <span class="track-review__bump">${escapeHtml(t.currentLabel)} → <em>${escapeHtml(t.nextLabel)}</em></span>
            </div>`).join("");

        dom.weeklyReviewMount.innerHTML = `
            <div class="track-review">
                <p class="track-review__label">${escapeHtml(review.weekLabel)}</p>
                <div class="track-review__grid">${metrics.join("")}</div>
                ${targets ? `<div><p class="track-eyebrow">Next week targets</p><div class="track-review__targets">${targets}</div></div>` : ""}
            </div>`;
    }

    function statBlock(value, label) {
        return `<div class="track-review__metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
    }

    function renderFocusNote() {
        if (state.schemaReady === false) {
            dom.focusNoteMount.innerHTML = emptyMarkup("Database needs the track SQL", state.schemaMessage || "Run the track schema scripts, then refresh.");
            return;
        }
        if (!state.focusNote) {
            dom.focusNoteMount.innerHTML = emptyMarkup("No card yet", "Build a template, then press Log today.");
            return;
        }
        dom.focusNoteMount.innerHTML = noteMarkup(state.focusNote, true);
    }

    function renderArchiveNotes() {
        const entries = buildArchiveEntries();
        dom.archiveNotesMount.innerHTML = entries.length
            ? entries.map(e => e.type === "note" ? noteMarkup(e.value, false) : missedDayMarkup(e.value)).join("")
            : emptyMarkup("No earlier cards yet", "Past cards and missed days land here.");
    }

    function buildArchiveEntries() {
        const notes = (state.archiveNotes || []).map(n => ({ type: "note", date: n.trackDate, value: n }));
        const missed = (state.missedDays || []).map(d => ({ type: "missed", date: d.trackDate, value: d }));
        return [...notes, ...missed].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
    }

    function choiceCountersHtml(note) {
        const hard = note.hardCount || 0;
        const easy = note.easyCount || 0;
        const btn = (choice, op, label) =>
            `<button class="track-choice__btn" type="button" data-choice="${choice}" data-choice-op="${op}" data-note-id="${note.id}" aria-label="${label}">${op === "inc" ? "+" : "−"}</button>`;
        return `
            <div class="track-choices">
                <div class="track-choice track-choice--hard">
                    <span class="track-choice__label">Hard</span>
                    ${btn("hard", "dec", "Remove hard choice")}
                    <strong class="track-choice__count">${hard}</strong>
                    ${btn("hard", "inc", "Add hard choice")}
                </div>
                <div class="track-choice track-choice--easy">
                    <span class="track-choice__label">Easy</span>
                    ${btn("easy", "dec", "Remove easy choice")}
                    <strong class="track-choice__count">${easy}</strong>
                    ${btn("easy", "inc", "Add easy choice")}
                </div>
            </div>`;
    }

    function noteMarkup(note, isFocus) {
        const color = normalizeColor(note.activeBandColor);
        const checklist = (note.items || []).map(item => item.targetValue != null
            ? targetItemMarkup(note, item)
            : binaryItemMarkup(note, item)).join("");

        const bands = (note.bands || []).map(band => {
            const bandColor = normalizeColor(band.colorHex, color);
            return `
                <div class="track-band ${band.isActive ? "track-band--active" : ""}" style="--band-row-color: ${bandColor}">
                    <span class="track-band__swatch" aria-hidden="true"></span>
                    <strong>${escapeHtml(band.label)}</strong>
                    <span class="track-band__range">${escapeHtml(band.rangeLabel)}</span>
                </div>`;
        }).join("");

        const side = isFocus ? `<aside class="track-note-card__side"><div class="track-band-list">${bands}</div></aside>` : "";
        const resync = isFocus && note.templateId
            ? `<button class="track-resync" type="button" data-resync-note="${note.id}" title="Pull the latest template changes into this card (keeps your progress)">↻ Resync</button>`
            : "";

        return `
            <article class="track-note-card ${isFocus ? "track-note-card--focus" : ""}" style="--band-color: ${color}">
                <div class="track-note-card__main">
                    <header class="track-note-card__header">
                        <div>
                            <h4>${escapeHtml(note.title)}</h4>
                            <p class="track-note-date">${escapeHtml(note.relativeDayLabel)} · ${escapeHtml(note.dateLabel)}</p>
                        </div>
                        <div class="track-score">
                            <strong>${escapeHtml(note.scoreLabel.split(" / ")[0])}</strong>
                            <span>${escapeHtml(note.activeBandLabel)}</span>
                            ${resync}
                        </div>
                    </header>
                    <div class="track-progress" aria-label="${escapeHtml(note.scoreLabel)}">
                        <div class="track-progress__bar" style="width: ${Math.max(0, Math.min(100, note.progressPercent || 0))}%"></div>
                    </div>
                    <div class="track-checklist">${checklist}</div>
                    ${choiceCountersHtml(note)}
                </div>
                ${side}
            </article>`;
    }

    function binaryItemMarkup(note, item) {
        return `
            <label class="track-check">
                <input type="checkbox" data-item-toggle data-note-id="${note.id}" data-note-item-id="${item.id}" ${item.isChecked ? "checked" : ""} aria-label="${escapeHtml(item.label)}" />
                <span class="track-check__box" aria-hidden="true"></span>
                <span class="track-check__label">${escapeHtml(item.label)}</span>
                <span class="track-check__points">${item.points} pt${item.points === 1 ? "" : "s"}</span>
            </label>`;
    }

    function targetItemMarkup(note, item) {
        const pct = Math.max(0, Math.min(100, item.completionPercent || 0));
        const pts = `${item.points} pt${item.points === 1 ? "" : "s"}`;
        const isTime = item.targetKind === "TimeBefore";
        const sub = isTime
            ? `by <b>${escapeHtml(item.targetLabel)}</b> · ${pts}`
            : `target <b>${escapeHtml(item.targetLabel)} ${escapeHtml(item.unit || "")}</b> · ${pts}`;
        const log = isTime
            ? `<input type="time" class="track-check__input track-check__input--time"
                    value="${escapeHtml(item.actualLabel || "")}"
                    data-item-actual data-item-kind="TimeBefore" data-note-id="${note.id}" data-note-item-id="${item.id}"
                    aria-label="Log ${escapeHtml(item.label)}" />`
            : `<input type="number" class="track-check__input" min="0" step="1" inputmode="numeric"
                    value="${item.actualValue ?? ""}" placeholder="0"
                    data-item-actual data-item-kind="Amount" data-note-id="${note.id}" data-note-item-id="${item.id}"
                    aria-label="Log ${escapeHtml(item.label)}" />
               <span class="track-check__unit">${escapeHtml(item.unit || "")}</span>`;
        return `
            <div class="track-check track-check--target ${item.isChecked ? "is-met" : ""}">
                <div class="track-check__main">
                    <span class="track-check__label">${escapeHtml(item.label)}</span>
                    <span class="track-check__sub">${sub}</span>
                </div>
                <div class="track-check__log">${log}</div>
                <div class="track-check__meter"><div style="width: ${pct}%"></div></div>
            </div>`;
    }

    function missedDayMarkup(day) {
        const selected = getSelectedTemplate();
        const label = selected ? selected.name : "a template";
        const disabled = !selected || state.schemaReady === false ? "disabled" : "";
        return `
            <article class="track-missed-day">
                <div>
                    <p class="track-note-date">${escapeHtml(day.relativeDayLabel)} · ${escapeHtml(day.dateLabel)}</p>
                    <h4>Missed day</h4>
                    <span>Backfill with ${escapeHtml(label)}.</span>
                </div>
                <button class="track-button track-button--ghost" type="button" data-create-missed-date="${escapeHtml(day.trackDate)}" ${disabled}>Summon day</button>
            </article>`;
    }

    function renderMonthCharts() {
        const charts = state.monthCharts || [];
        if (!charts.length) {
            dom.monthChartsMount.innerHTML = emptyMarkup("No points yet", "Complete items and monthly lines appear here.");
            return;
        }
        dom.monthChartsMount.innerHTML = charts.map(monthChartMarkup).join("");
    }

    function monthChartMarkup(chart) {
        const width = 1000, height = 132, padX = 22, padY = 18;
        const points = chart.points || [];
        const xForDay = day => padX + ((Math.max(1, day) - 1) / Math.max(1, chart.daysInMonth - 1)) * (width - padX * 2);
        const yForPercent = pct => height - padY - (Math.max(0, Math.min(100, pct)) / 100) * (height - padY * 2);
        const polyline = points.map(p => `${xForDay(p.day).toFixed(1)},${yForPercent(p.progressPercent).toFixed(1)}`).join(" ");
        const ticks = Array.from({ length: chart.daysInMonth }, (_, i) => i + 1).filter(d => d === 1 || d === chart.daysInMonth || d % 5 === 0);

        return `
            <article class="track-month-chart">
                <header><strong>${escapeHtml(chart.monthLabel)}</strong><span>${points.length} active day${points.length === 1 ? "" : "s"}</span></header>
                <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(chart.monthLabel)} points" preserveAspectRatio="none">
                    <line class="track-chart-axis" x1="${padX}" y1="${height - padY}" x2="${width - padX}" y2="${height - padY}"></line>
                    <line class="track-chart-guide" x1="${padX}" y1="${padY}" x2="${width - padX}" y2="${padY}"></line>
                    <line class="track-chart-guide" x1="${padX}" y1="${yForPercent(50)}" x2="${width - padX}" y2="${yForPercent(50)}"></line>
                    ${ticks.map(d => `<line class="track-chart-tick" x1="${xForDay(d).toFixed(1)}" y1="${height - padY}" x2="${xForDay(d).toFixed(1)}" y2="${height - padY + 5}"></line>`).join("")}
                    ${polyline ? `<polyline class="track-chart-line" points="${polyline}"></polyline>` : ""}
                    ${points.map(p => `<circle class="track-chart-dot" cx="${xForDay(p.day).toFixed(1)}" cy="${yForPercent(p.progressPercent).toFixed(1)}" r="6"><title>Day ${p.day}: ${p.completedPoints}/${p.maxPoints} pts</title></circle>`).join("")}
                </svg>
            </article>`;
    }

    function renderMeasurements() {
        const ms = state.measurements || {};
        if (ms.isReady === false || state.schemaReady === false) {
            dom.measurementTrendsMount.innerHTML = "";
            dom.measurementsMount.innerHTML = emptyMarkup("Measurements need SQL", ms.message || "Run the updated SQL script.");
            dom.measurementsBtn.disabled = state.schemaReady === false;
            return;
        }

        dom.measurementsBtn.disabled = false;
        const trends = ms.trends || [];
        dom.measurementTrendsMount.innerHTML = trends.map(t => {
            const cls = t.deltaSign > 0 ? "track-trend__delta--up" : t.deltaSign < 0 ? "track-trend__delta--down" : "";
            return `
                <div class="track-trend">
                    <div class="track-trend__head">
                        <span class="track-trend__metric">${escapeHtml(t.metric)}</span>
                        ${t.deltaLabel ? `<span class="track-trend__delta ${cls}">${escapeHtml(t.deltaLabel)}</span>` : ""}
                    </div>
                    <div class="track-trend__value">${escapeHtml(t.latestLabel || "—")}</div>
                    <svg viewBox="0 0 120 30" preserveAspectRatio="none">${sparkSvg(t.series, 120, 30)}</svg>
                </div>`;
        }).join("");

        const entries = ms.entries || [];
        dom.measurementsMount.innerHTML = entries.length
            ? entries.map(measurementMarkup).join("")
            : emptyMarkup("No measurements yet", "Add weight, belly, chest, arm or leg.");
    }

    function measurementMarkup(entry) {
        const metrics = [["Weight", entry.weight], ["Belly", entry.belly], ["Chest", entry.chest], ["Arm", entry.arm], ["Leg", entry.leg]]
            .filter(([, v]) => v);
        return `
            <article class="track-measurement-entry">
                <button class="track-entry__del track-measurement-entry__del" type="button" data-delete-measurement="${entry.id}" aria-label="Delete measurement">&times;</button>
                <header><strong>${escapeHtml(entry.relativeDayLabel)}</strong><span>${escapeHtml(entry.dateLabel)}</span></header>
                <div class="track-measurement-entry__metrics">
                    ${metrics.map(([label, v]) => `<span><b>${escapeHtml(v)}</b><small>${escapeHtml(label)}</small></span>`).join("")}
                </div>
            </article>`;
    }

    function renderMotivationLinks() {
        const motivation = state.motivation || {};
        if (motivation.isReady === false || state.schemaReady === false) {
            dom.motivationLinksMount.innerHTML = emptyMarkup("Motivation needs SQL", motivation.message || "Run the updated SQL script.");
            [...dom.motivationForm.elements].forEach(el => { el.disabled = true; });
            return;
        }
        [...dom.motivationForm.elements].forEach(el => { el.disabled = false; });

        const links = motivation.links || [];
        dom.motivationLinksMount.innerHTML = links.length
            ? links.map(motivationMarkup).join("")
            : emptyMarkup("No links yet", "Paste a YouTube, Instagram, Facebook or video link.");
    }

    function motivationMarkup(link) {
        const title = link.title || link.provider || "Motivation";
        const media = link.embedUrl
            ? `<iframe src="${escapeHtml(link.embedUrl)}" title="${escapeHtml(title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy"></iframe>`
            : `<a class="track-video-fallback" href="${escapeHtml(link.url)}" target="_blank" rel="noopener">Open ${escapeHtml(link.provider || "link")}</a>`;
        return `
            <article class="track-video-card">
                <button class="track-video-del" type="button" data-delete-motivation="${link.id}" aria-label="Delete link">&times;</button>
                <div class="track-video-frame">${media}</div>
                <header><strong>${escapeHtml(title)}</strong><span>${escapeHtml(link.provider)} · ${escapeHtml(link.createdLabel)}</span></header>
            </article>`;
    }

    function emptyMarkup(title, body) {
        return `<div class="track-empty"><strong>${escapeHtml(title)}</strong>${escapeHtml(body)}</div>`;
    }

    /* ---------- studio ---------- */
    function renderTemplateLibrary() {
        const templates = state.templates || [];
        if (!templates.length) {
            dom.templateLibrary.innerHTML = emptyMarkup("No templates", "Start with New.");
            return;
        }
        dom.templateLibrary.innerHTML = `
            <div class="track-template-list">
                ${templates.map(t => `
                    <button class="track-template-card ${t.id === getEditingTemplateId() ? "is-selected" : ""}" type="button" data-edit-template-id="${t.id}">
                        <strong>${escapeHtml(t.name)}</strong>
                        <span>${isWeeklyTemplate(t) ? "weekly" : "daily"} · ${t.maxPoints} pts · ${t.noteCount} cards${t.isDefault ? " · default" : ""}</span>
                    </button>`).join("")}
            </div>`;
    }

    function getEditingTemplateId() { return editingTemplate && editingTemplate.id ? editingTemplate.id : null; }

    function openStudio() {
        dom.studio.classList.remove("hidden");
        dom.studio.setAttribute("aria-hidden", "false");
        renderEditorFromSelected();
        dom.templateName.focus();
    }
    function closeStudio() {
        dom.studio.classList.add("hidden");
        dom.studio.setAttribute("aria-hidden", "true");
    }

    function renderEditorFromSelected() {
        const templates = state.templates || [];
        const selected = templates.find(t => t.id === Number(selectedTemplateId)) || templates[0];
        editingTemplate = selected ? JSON.parse(JSON.stringify(selected)) : newTemplateDraft();
        fillEditor(editingTemplate);
        renderTemplateLibrary();
    }

    function newTemplateDraft() {
        return {
            id: null,
            name: "",
            description: "",
            cadence: "Daily",
            isDefault: !(state.templates || []).length,
            items: [emptyItem(), emptyItem(), emptyItem()],
            bands: buildAutoBands(3)
        };
    }

    function buildAutoBands(totalPoints) {
        const total = Math.max(0, Number(totalPoints) || 0);
        const c1 = Math.floor(total * 0.3), c2 = Math.floor(total * 0.6), c3 = Math.floor(total * 0.9);
        return [
            { label: "Red", minPoints: 0, maxPoints: c1, colorHex: "#ff5f5f" },
            { label: "Amber", minPoints: c1 + 1, maxPoints: Math.max(c1 + 1, c2), colorHex: "#f6ad3c" },
            { label: "Green", minPoints: c2 + 1, maxPoints: Math.max(c2 + 1, c3), colorHex: "#4ade80" },
            { label: "Peak", minPoints: c3 + 1, maxPoints: null, colorHex: "#c8f536" }
        ];
    }

    function currentItemPoints() {
        return [...dom.templateItems.querySelectorAll("[data-item-row]")]
            .reduce((sum, row) => sum + (Number(row.querySelector("[data-item-points]").value) || 0), 0);
    }
    function refreshAutoBands() { renderBandRows(buildAutoBands(currentItemPoints())); }

    function fillEditor(template) {
        dom.templateId.value = template.id || "";
        dom.templateName.value = template.name || "";
        dom.templateDescription.value = template.description || "";
        dom.templateCadence.value = isWeeklyTemplate(template) ? "Weekly" : "Daily";
        dom.templateIsDefault.checked = !!template.isDefault;
        dom.deleteTemplateBtn.disabled = !template.id;
        renderItemRows(template.items || []);
        refreshAutoBands();
    }

    function itemRowHtml(item, index) {
        const kind = itemKindOf(item);
        const growthOptions = mode => ["None", "Percent", "Step"]
            .map(m => `<option value="${m}" ${String(mode || "None") === m ? "selected" : ""}>${m === "None" ? "No growth" : m === "Percent" ? "% / week" : "Step / week"}</option>`).join("");
        const kindOptions = [["Check", "Checkbox"], ["Amount", "Count · more = better"], ["TimeBefore", "Time · by/before"]]
            .map(([v, l]) => `<option value="${v}" ${kind === v ? "selected" : ""}>${l}</option>`).join("");
        const timeValue = kind === "TimeBefore" ? minutesToTime(item.baseTarget) : "";
        const earlierValue = kind === "TimeBefore" ? (item.growthValue ?? "") : "";

        return `
            <div class="track-item-row" data-item-row data-kind="${kind}">
                <div class="track-item-row__top">
                    <label>Item<input type="text" data-item-label maxlength="160" placeholder="Checklist item" value="${escapeHtml(item.label)}" /></label>
                    <label>Points<input type="number" data-item-points min="0" max="100" value="${Number(item.points ?? 1)}" /></label>
                    <button class="track-icon-button" type="button" data-remove-row aria-label="Remove item ${index + 1}">&times;</button>
                </div>
                <div class="track-item-row__measure">
                    <label>Measure<select data-item-kind>${kindOptions}</select></label>
                    <label data-amount-field>Unit<input type="text" data-item-unit maxlength="16" placeholder="km / reps" value="${escapeHtml(item.unit || "")}" /></label>
                    <label data-amount-field>Target<input type="number" data-item-base min="0" step="1" placeholder="—" value="${kind === "Amount" ? (item.baseTarget ?? "") : ""}" /></label>
                    <label data-amount-field>Growth<select data-item-growth>${growthOptions(item.growthMode)}</select></label>
                    <label data-amount-field>+ / wk<input type="number" data-item-growthval min="0" step="1" placeholder="0" value="${kind === "Amount" ? (item.growthValue ?? "") : ""}" /></label>
                    <label data-time-field>By (time)<input type="time" data-item-time value="${timeValue}" /></label>
                    <label data-time-field>Earlier/wk (min)<input type="number" data-item-earlier min="0" step="1" placeholder="0" value="${earlierValue}" /></label>
                </div>
            </div>`;
    }

    function renderItemRows(items) {
        dom.templateItems.innerHTML = `<div class="track-row-list">${items.map(itemRowHtml).join("")}</div>`;
    }

    function renderBandRows(bands) {
        dom.templateBands.innerHTML = `<div class="track-band-list">${bands.map(band => {
            const color = normalizeColor(band.colorHex, "#c8f536");
            const range = band.maxPoints == null ? `${band.minPoints}+` : `${band.minPoints}-${band.maxPoints}`;
            return `
                <div class="track-band" style="--band-row-color: ${color}">
                    <span class="track-band__swatch" aria-hidden="true"></span>
                    <strong>${escapeHtml(band.label)}</strong>
                    <span class="track-band__range">${range}</span>
                </div>`;
        }).join("")}</div>`;
    }

    function rowPayload(row) {
        const kind = row.querySelector("[data-item-kind]").value;
        const base = {
            label: row.querySelector("[data-item-label]").value.trim(),
            points: Number(row.querySelector("[data-item-points]").value || 0)
        };
        if (kind === "TimeBefore") {
            return {
                ...base,
                targetKind: "TimeBefore",
                unit: "",
                baseTarget: timeToMinutes(row.querySelector("[data-item-time]").value),
                growthMode: "Step",
                growthValue: Number(row.querySelector("[data-item-earlier]").value || 0)
            };
        }
        if (kind === "Amount") {
            return {
                ...base,
                targetKind: "Amount",
                unit: row.querySelector("[data-item-unit]").value.trim(),
                baseTarget: numberOrNull(row.querySelector("[data-item-base]").value),
                growthMode: row.querySelector("[data-item-growth]").value,
                growthValue: Number(row.querySelector("[data-item-growthval]").value || 0)
            };
        }
        return { ...base, targetKind: "Amount", unit: "", baseTarget: null, growthMode: "None", growthValue: 0 };
    }

    function collectTemplatePayload() {
        const items = [...dom.templateItems.querySelectorAll("[data-item-row]")].map(rowPayload);
        const totalPoints = items.filter(i => i.label).reduce((s, i) => s + (Number(i.points) || 0), 0);
        return {
            id: dom.templateId.value ? Number(dom.templateId.value) : null,
            name: dom.templateName.value.trim(),
            description: dom.templateDescription.value.trim(),
            cadence: dom.templateCadence.value === "Weekly" ? "Weekly" : "Daily",
            isDefault: dom.templateIsDefault.checked,
            items,
            bands: buildAutoBands(totalPoints)
        };
    }

    /* ---------- events ---------- */
    dom.templatePicker.addEventListener("change", event => {
        selectedTemplateId = Number(event.target.value) || null;
        renderEditorFromSelected();
        renderTemplatePicker();
    });

    dom.newNoteBtn.addEventListener("click", async () => {
        setBusy(dom.newNoteBtn, true);
        try {
            const data = await postJson(urls.createNote, { templateId: selectedTemplateId });
            applyActionResponse(data);
            closeHeaderMenu();
        } catch (error) { showToast(error.message); }
        finally { setBusy(dom.newNoteBtn, false); }
    });

    dom.archiveNotesMount.addEventListener("click", async event => {
        const button = event.target.closest("[data-create-missed-date]");
        if (!button) { return; }
        setBusy(button, true);
        try {
            const data = await postJson(urls.createNoteForDate, { templateId: selectedTemplateId, trackDate: button.dataset.createMissedDate });
            applyActionResponse(data, { focusNoteDate: button.dataset.createMissedDate });
        } catch (error) { showToast(error.message); }
        finally { setBusy(button, false); }
    });

    // checkbox (binary) + measurable-target logging
    document.addEventListener("change", async event => {
        const toggle = event.target.closest("[data-item-toggle]");
        if (toggle) {
            toggle.disabled = true;
            try {
                const data = await postJson(urls.toggleItem, {
                    noteId: Number(toggle.dataset.noteId),
                    noteItemId: Number(toggle.dataset.noteItemId),
                    isChecked: toggle.checked
                });
                applyActionResponse(data, { focusNoteId: toggle.dataset.noteId });
            } catch (error) { toggle.checked = !toggle.checked; showToast(error.message); }
            finally { toggle.disabled = false; }
            return;
        }

        const actual = event.target.closest("[data-item-actual]");
        if (actual) {
            let value;
            if (actual.value === "") { value = null; }
            else if (actual.dataset.itemKind === "TimeBefore") { value = timeToMinutes(actual.value); }
            else { value = Number(actual.value); }

            actual.disabled = true;
            try {
                const data = await postJson(urls.logItem, {
                    noteId: Number(actual.dataset.noteId),
                    noteItemId: Number(actual.dataset.noteItemId),
                    actualValue: value
                });
                applyActionResponse(data, { focusNoteId: actual.dataset.noteId });
            } catch (error) { showToast(error.message); }
            finally { actual.disabled = false; }
        }
    });

    // resync a card from its (now edited) template
    dom.focusNoteMount.addEventListener("click", async event => {
        const button = event.target.closest("[data-resync-note]");
        if (!button) { return; }
        if (!window.confirm("Rebuild this card from the current template? Logged progress is kept where item names still match.")) { return; }
        setBusy(button, true);
        try {
            const data = await postJson(urls.resyncNote, { noteId: Number(button.dataset.resyncNote) });
            applyActionResponse(data, { focusNoteId: button.dataset.resyncNote });
        } catch (error) { showToast(error.message); }
        finally { setBusy(button, false); }
    });

    // money: presets + delete (delegated within the drawer)
    dom.trackHeaderMenu.addEventListener("click", async event => {
        const preset = event.target.closest("[data-preset-amount]");
        if (preset) {
            setBusy(preset, true);
            try {
                const data = await postJson(urls.addProfit, {
                    amount: Number(preset.dataset.presetAmount),
                    entryType: "Saved",
                    memo: preset.dataset.presetMemo || ""
                });
                applyActionResponse(data);
            } catch (error) { showToast(error.message); }
            finally { setBusy(preset, false); }
            return;
        }

        const delProfit = event.target.closest("[data-delete-profit]");
        if (delProfit) {
            setBusy(delProfit, true);
            try {
                const data = await postJson(urls.deleteProfit, { id: Number(delProfit.dataset.deleteProfit) });
                applyActionResponse(data);
            } catch (error) { showToast(error.message); }
            finally { setBusy(delProfit, false); }
            return;
        }

        const reset = event.target.closest("[data-reset]");
        if (reset) {
            const scope = reset.dataset.reset;
            if (!window.confirm(RESET_PROMPTS[scope] || "Reset this data?")) { return; }
            setBusy(reset, true);
            try {
                const data = await postJson(urls.reset, { scope });
                applyActionResponse(data);
                closeHeaderMenu();
            } catch (error) { showToast(error.message); }
            finally { setBusy(reset, false); }
        }
    });

    const RESET_PROMPTS = {
        templates: "Delete ALL templates? Existing cards stay in history but lose their template link.",
        progress: "Delete ALL daily and weekly cards? Wipes every tracked day and week.",
        money: "Reset the money counter? Every saved and spent entry is deleted.",
        measurements: "Delete ALL measurements?",
        motivation: "Delete ALL motivation links?",
        all: "Wipe EVERYTHING (templates, cards, money, measurements, links)? Cannot be undone."
    };

    dom.profitForm.addEventListener("submit", async event => {
        event.preventDefault();
        const submit = event.submitter;
        const entryType = submit?.dataset.profitType || "Saved";
        setBusy(submit, true);
        try {
            const data = await postJson(urls.addProfit, {
                amount: Number(dom.profitAmount.value || 0),
                entryType,
                memo: dom.profitMemo.value.trim()
            });
            dom.profitAmount.value = "";
            dom.profitMemo.value = "";
            applyActionResponse(data);
        } catch (error) { showToast(error.message); }
        finally { setBusy(submit, false); }
    });

    // delete motivation (delegated on the grid)
    dom.motivationLinksMount.addEventListener("click", async event => {
        const del = event.target.closest("[data-delete-motivation]");
        if (!del) { return; }
        if (!window.confirm("Delete this motivation link?")) { return; }
        setBusy(del, true);
        try {
            const data = await postJson(urls.deleteMotivation, { id: Number(del.dataset.deleteMotivation) });
            applyActionResponse(data);
        } catch (error) { showToast(error.message); }
        finally { setBusy(del, false); }
    });

    // delete measurement (delegated)
    dom.measurementsMount.addEventListener("click", async event => {
        const del = event.target.closest("[data-delete-measurement]");
        if (!del) { return; }
        if (!window.confirm("Delete this measurement?")) { return; }
        setBusy(del, true);
        try {
            const data = await postJson(urls.deleteMeasurement, { id: Number(del.dataset.deleteMeasurement) });
            applyActionResponse(data);
        } catch (error) { showToast(error.message); }
        finally { setBusy(del, false); }
    });

    dom.trackMenuBtn.addEventListener("click", () => {
        setHeaderMenu(dom.trackMenuBtn.getAttribute("aria-expanded") !== "true");
    });

    document.addEventListener("click", event => {
        if (!dom.trackHeaderMenu.classList.contains("is-open")) { return; }
        if (event.target.closest("#trackHeaderMenu") || event.target.closest("#trackMenuBtn")) { return; }
        closeHeaderMenu();
    });

    dom.manageTemplatesBtn.addEventListener("click", () => { closeHeaderMenu(); openStudio(); });
    dom.closeStudioBtn.addEventListener("click", closeStudio);
    dom.studio.addEventListener("click", event => { if (event.target.matches("[data-close-studio]")) { closeStudio(); } });

    dom.measurementsBtn.addEventListener("click", () => { closeHeaderMenu(); openMeasurements(); });
    dom.closeMeasurementsBtn.addEventListener("click", closeMeasurements);
    dom.measurementsStudio.addEventListener("click", event => { if (event.target.matches("[data-close-measurements]")) { closeMeasurements(); } });

    function openMeasurements() {
        dom.measurementsStudio.classList.remove("hidden");
        dom.measurementsStudio.setAttribute("aria-hidden", "false");
        dom.measurementDate.value = state.today || "";
        dom.measurementWeight.focus();
    }
    function closeMeasurements() {
        dom.measurementsStudio.classList.add("hidden");
        dom.measurementsStudio.setAttribute("aria-hidden", "true");
    }

    document.addEventListener("keydown", event => {
        if (event.key !== "Escape") { return; }
        if (!dom.studio.classList.contains("hidden")) { closeStudio(); }
        if (!dom.measurementsStudio.classList.contains("hidden")) { closeMeasurements(); }
        closeHeaderMenu();
    });

    dom.templateLibrary.addEventListener("click", event => {
        const button = event.target.closest("[data-edit-template-id]");
        if (!button) { return; }
        selectedTemplateId = Number(button.dataset.editTemplateId);
        dom.templatePicker.value = String(selectedTemplateId);
        renderEditorFromSelected();
    });

    dom.measurementForm.addEventListener("submit", async event => {
        event.preventDefault();
        const submit = event.submitter;
        setBusy(submit, true);
        try {
            const data = await postJson(urls.addMeasurement, {
                measurementDate: dom.measurementDate.value,
                weight: numberOrNull(dom.measurementWeight.value),
                belly: numberOrNull(dom.measurementBelly.value),
                chest: numberOrNull(dom.measurementChest.value),
                arm: numberOrNull(dom.measurementArm.value),
                leg: numberOrNull(dom.measurementLeg.value)
            });
            ["measurementWeight", "measurementBelly", "measurementChest", "measurementArm", "measurementLeg"].forEach(id => { dom[id].value = ""; });
            applyActionResponse(data);
        } catch (error) { showToast(error.message); }
        finally { setBusy(submit, false); }
    });

    dom.motivationForm.addEventListener("submit", async event => {
        event.preventDefault();
        const submit = event.submitter;
        setBusy(submit, true);
        try {
            const data = await postJson(urls.addMotivationLink, {
                url: dom.motivationUrl.value.trim(),
                title: dom.motivationTitle.value.trim()
            });
            dom.motivationUrl.value = "";
            dom.motivationTitle.value = "";
            applyActionResponse(data);
        } catch (error) { showToast(error.message); }
        finally { setBusy(submit, false); }
    });

    dom.newTemplateBtn.addEventListener("click", () => {
        editingTemplate = newTemplateDraft();
        fillEditor(editingTemplate);
        renderTemplateLibrary();
    });

    function appendItemRow() {
        const list = dom.templateItems.querySelector(".track-row-list");
        if (!list) { renderItemRows([emptyItem()]); refreshAutoBands(); return; }
        list.insertAdjacentHTML("beforeend", itemRowHtml(emptyItem(), list.children.length));
        refreshAutoBands();
    }

    dom.addItemBtn.addEventListener("click", appendItemRow);

    dom.templateForm.addEventListener("click", event => {
        const remove = event.target.closest("[data-remove-row]");
        if (!remove) { return; }
        remove.closest("[data-item-row]")?.remove();
        refreshAutoBands();
    });

    dom.templateItems.addEventListener("input", event => {
        if (event.target.closest("[data-item-points]")) { refreshAutoBands(); return; }
        // Auto-add a fresh empty row the moment you start naming the last one.
        const label = event.target.closest("[data-item-label]");
        if (label && label.value.trim() !== "") {
            const list = dom.templateItems.querySelector(".track-row-list");
            const row = label.closest("[data-item-row]");
            if (list && row === list.lastElementChild) { appendItemRow(); }
        }
    });

    dom.templateItems.addEventListener("change", event => {
        const kindSelect = event.target.closest("[data-item-kind]");
        if (kindSelect) {
            kindSelect.closest("[data-item-row]").dataset.kind = kindSelect.value;
        }
    });

    dom.templateForm.addEventListener("submit", async event => {
        event.preventDefault();
        const submit = event.submitter || dom.saveTemplateBtn;
        setBusy(submit, true);
        try {
            const data = await postJson(urls.saveTemplate, collectTemplatePayload());
            applyActionResponse(data);
        } catch (error) { showToast(error.message); }
        finally { setBusy(submit, false); }
    });

    dom.deleteTemplateBtn.addEventListener("click", async () => {
        const id = Number(dom.templateId.value || 0);
        if (!id) { return; }
        const name = dom.templateName.value || "this template";
        if (!window.confirm(`Delete ${name}? Existing cards stay in history.`)) { return; }
        setBusy(dom.deleteTemplateBtn, true);
        try {
            const data = await postJson(urls.deleteTemplate, { templateId: id });
            applyActionResponse(data);
        } catch (error) { showToast(error.message); }
        finally { setBusy(dom.deleteTemplateBtn, false); }
    });

    // Hard / Easy choice counters
    document.addEventListener("click", async event => {
        const btn = event.target.closest("[data-choice-op]");
        if (!btn) { return; }
        const noteId = Number(btn.dataset.noteId);
        const choice = btn.dataset.choice;
        const op = btn.dataset.choiceOp;
        if (!noteId || !choice) { return; }
        setBusy(btn, true);
        try {
            const data = await postJson(urls.logChoice, { noteId, choice, delta: op === "dec" ? -1 : 1 });
            applyActionResponse(data);
        } catch (error) { showToast(error.message); }
        finally { setBusy(btn, false); }
    });

    render();
})();
