(function () {
    "use strict";

    const apiRoot = "/api/bj";
    let snapshot = null;
    let requestInFlight = false;
    let autoDealTimer = null;
    let lastCompletedRound = 0;
    let lastAutoDealtRound = 0;
    let lastFeedbackSignature = "";
    let lastActionReview = null;
    let autoCollapsedForFocus = false;
    const activityLog = [];
    const actionButtons = new Map();
    const phaseNames = ["WaitingForBet", "OfferInsurance", "PlayerTurn", "DealerTurn", "RoundComplete"];
    const actionNames = ["Hit", "Stand", "Double", "Split", "Surrender", "InsuranceTake", "InsuranceSkip"];
    const redSuitGlyphs = new Set(["\u2665", "\u2666"]);
    const allSuitGlyphs = new Set(["\u2660", "\u2665", "\u2666", "\u2663"]);
    const uiPrefsKey = "bj-ui-prefs-v1";
    const speedCountMetricsKey = "bj-speed-count-metrics-v1";
    const countQuizMetricsKey = "bj-count-quiz-metrics-v1";
    const readyStreakRuns = 5;
    const readyDistinctDays = 2;
    const persistedControlIds = [
        "bj-mode",
        "bj-decks",
        "bj-penetration",
        "bj-burn",
        "bj-spread",
        "bj-bankroll",
        "bj-max-splits",
        "bj-double-rule",
        "bj-payout",
        "bj-bet-units",
        "bj-auto-deal",
        "bj-mask-counts",
        "bj-h17",
        "bj-das",
        "bj-rsa",
        "bj-insurance",
        "bj-show-rc",
        "bj-show-tc",
        "bj-show-depth",
        "bj-show-hints",
        "bj-count-quiz-target-l1",
        "bj-count-quiz-target-l2",
        "bj-count-quiz-target-l3",
        "bj-count-quiz-target-l4",
        "bj-count-quiz-target-l5",
        "bj-count-quiz-strong-l3",
        "bj-count-quiz-strong-l4",
        "bj-count-quiz-strong-l5",
        "bj-speed-target-l1",
        "bj-speed-target-l2",
        "bj-speed-target-l3",
        "bj-speed-target-l4",
        "bj-speed-target-l5",
        "bj-speed-strong-l3",
        "bj-speed-strong-l4",
        "bj-speed-strong-l5",
        "bj-count-quiz-decks-select",
        "bj-count-quiz-level",
        "bj-count-show-counts",
        "bj-count-decks-select",
        "bj-count-level"
    ];
    const persistedPanelIds = [
        "bj-panel-settings",
        "bj-panel-counts",
        "bj-panel-controls",
        "bj-panel-strategy",
        "bj-panel-guide",
        "bj-panel-basic",
        "bj-panel-perfect",
        "bj-panel-count-quiz",
        "bj-panel-speed-count",
        "bj-panel-log",
        "bj-panel-stats",
        "bj-panel-history",
        "bj-panel-rules"
    ];
    const speedCountState = {
        deckCount: 1,
        level: 1,
        cards: [],
        nextIndex: 0,
        runningCount: 0,
        history: [],
        lastCardLabel: "-",
        timerStartedAtMs: null,
        timerElapsedMs: 0,
        timerIntervalId: null,
        completionRecorded: false
    };
    const countQuizState = {
        deckCount: 1,
        level: 1,
        cards: [],
        nextIndex: 0,
        runningCount: 0,
        history: [],
        currentLabel: "-",
        currentDelta: 0,
        correct: 0,
        wrong: 0,
        lastFeedback: null,
        hasPendingChunk: false,
        timerStartedAtMs: null,
        timerElapsedMs: 0,
        timerIntervalId: null,
        completed: false,
        completionRecorded: false
    };
    let countQuizBound = false;
    let speedCountBound = false;
    const speedCountMetrics = loadSpeedCountMetrics();
    const countQuizMetrics = loadCountQuizMetrics();

    const refs = {
        startSession: document.getElementById("bj-start-session"),
        sessionLabel: document.getElementById("bj-session-label"),
        deal: document.getElementById("bj-deal"),
        betLabel: document.getElementById("bj-bet-label"),
        betUnits: document.getElementById("bj-bet-units"),
        bankrollInput: document.getElementById("bj-bankroll"),
        actions: document.getElementById("bj-actions"),
        autoDeal: document.getElementById("bj-auto-deal"),
        maskCounts: document.getElementById("bj-mask-counts"),
        theme: document.getElementById("bj-theme"),
        bankrollNow: document.getElementById("bj-bankroll-now"),
        runningCount: document.getElementById("bj-running-count"),
        trueCount: document.getElementById("bj-true-count"),
        shoeDepth: document.getElementById("bj-shoe-depth"),
        lobbyLabel: document.getElementById("bj-lobby-label"),
        dealerTotal: document.getElementById("bj-dealer-total"),
        dealerCards: document.getElementById("bj-dealer-cards"),
        playerHands: document.getElementById("bj-player-hands"),
        logList: document.getElementById("bj-log-list"),
        hintText: document.getElementById("bj-hint-text"),
        statRounds: document.getElementById("bj-stat-rounds"),
        statHands: document.getElementById("bj-stat-hands"),
        statBasic: document.getElementById("bj-stat-basic"),
        statDeviation: document.getElementById("bj-stat-deviation"),
        statBet: document.getElementById("bj-stat-bet"),
        statRc: document.getElementById("bj-stat-rc"),
        statTc: document.getElementById("bj-stat-tc"),
        statEv: document.getElementById("bj-stat-ev"),
        mistakes: document.getElementById("bj-mistakes"),
        historyList: document.getElementById("bj-history-list"),
        hintPlayerAction: document.getElementById("bj-hint-player-action"),
        hintOptimalAction: document.getElementById("bj-hint-optimal-action"),
        hintStatus: document.getElementById("bj-hint-status"),
        panelSettings: document.getElementById("bj-panel-settings"),
        panelCounts: document.getElementById("bj-panel-counts"),
        panelControls: document.getElementById("bj-panel-controls"),
        panelGuide: document.getElementById("bj-panel-guide"),
        panelBasic: document.getElementById("bj-panel-basic"),
        panelPerfect: document.getElementById("bj-panel-perfect"),
        panelCountQuiz: document.getElementById("bj-panel-count-quiz"),
        panelSpeedCount: document.getElementById("bj-panel-speed-count"),
        panelStrategy: document.getElementById("bj-panel-strategy"),
        panelLog: document.getElementById("bj-panel-log"),
        panelStats: document.getElementById("bj-panel-stats"),
        panelHistory: document.getElementById("bj-panel-history"),
        panelRules: document.getElementById("bj-panel-rules"),
        countQuizTargetL1: document.getElementById("bj-count-quiz-target-l1"),
        countQuizTargetL2: document.getElementById("bj-count-quiz-target-l2"),
        countQuizTargetL3: document.getElementById("bj-count-quiz-target-l3"),
        countQuizTargetL4: document.getElementById("bj-count-quiz-target-l4"),
        countQuizTargetL5: document.getElementById("bj-count-quiz-target-l5"),
        countQuizStrongL3: document.getElementById("bj-count-quiz-strong-l3"),
        countQuizStrongL4: document.getElementById("bj-count-quiz-strong-l4"),
        countQuizStrongL5: document.getElementById("bj-count-quiz-strong-l5"),
        speedTargetL1: document.getElementById("bj-speed-target-l1"),
        speedTargetL2: document.getElementById("bj-speed-target-l2"),
        speedTargetL3: document.getElementById("bj-speed-target-l3"),
        speedTargetL4: document.getElementById("bj-speed-target-l4"),
        speedTargetL5: document.getElementById("bj-speed-target-l5"),
        speedStrongL3: document.getElementById("bj-speed-strong-l3"),
        speedStrongL4: document.getElementById("bj-speed-strong-l4"),
        speedStrongL5: document.getElementById("bj-speed-strong-l5"),
        countQuizDecksSelect: document.getElementById("bj-count-quiz-decks-select"),
        countQuizLevel: document.getElementById("bj-count-quiz-level"),
        countQuizTimer: document.getElementById("bj-count-quiz-timer"),
        countQuizCurrent: document.getElementById("bj-count-quiz-current"),
        countQuizFeedback: document.getElementById("bj-count-quiz-feedback"),
        countQuizRc: document.getElementById("bj-count-quiz-rc"),
        countQuizRemaining: document.getElementById("bj-count-quiz-remaining"),
        countQuizCorrect: document.getElementById("bj-count-quiz-correct"),
        countQuizWrong: document.getElementById("bj-count-quiz-wrong"),
        countQuizAccuracy: document.getElementById("bj-count-quiz-accuracy"),
        countQuizLastRunTime: document.getElementById("bj-count-quiz-last-run-time"),
        countQuizGoalDelta: document.getElementById("bj-count-quiz-goal-delta"),
        countQuizReadyStreak: document.getElementById("bj-count-quiz-ready-streak"),
        countQuizReadyStatus: document.getElementById("bj-count-quiz-ready-status"),
        countQuizBestTime: document.getElementById("bj-count-quiz-best-time"),
        countQuizLast10Acc: document.getElementById("bj-count-quiz-last10-acc"),
        countQuizStream: document.getElementById("bj-count-quiz-stream"),
        countQuizNewShoe: document.getElementById("bj-count-quiz-new-shoe"),
        countQuizPlus: document.getElementById("bj-count-quiz-plus"),
        countQuizZero: document.getElementById("bj-count-quiz-zero"),
        countQuizMinus: document.getElementById("bj-count-quiz-minus"),
        countShowCounts: document.getElementById("bj-count-show-counts"),
        countDecksSelect: document.getElementById("bj-count-decks-select"),
        countLevel: document.getElementById("bj-count-level"),
        countTimer: document.getElementById("bj-count-timer"),
        countLastCard: document.getElementById("bj-count-last-card"),
        countOneDeckTime: document.getElementById("bj-count-one-deck-time"),
        countShoeDelta: document.getElementById("bj-count-shoe-delta"),
        countGoalDelta: document.getElementById("bj-count-goal-delta"),
        countReadyStreak: document.getElementById("bj-count-ready-streak"),
        countReadyStatus: document.getElementById("bj-count-ready-status"),
        countBestTime: document.getElementById("bj-count-best-time"),
        countLast10Acc: document.getElementById("bj-count-last10-acc")
    };
    const countQuizLevelBaseLabels = captureSelectOptionLabels(refs.countQuizLevel);
    const speedCountLevelBaseLabels = captureSelectOptionLabels(refs.countLevel);

    applyPersistedUiState();
    initActionButtons();
    initTheme();
    initCountQuizPanel();
    initSpeedCountPanel();
    bindUiPersistence();
    bindDrillTargetRefresh();

    refs.startSession.addEventListener("click", () => {
        void startSession();
    });

    refs.deal.addEventListener("click", () => {
        void dealRound(false);
    });

    refs.autoDeal.addEventListener("change", () => {
        if (!refs.autoDeal.checked) {
            clearAutoDealTimer();
            return;
        }

        maybeAutoDeal();
    });

    refs.maskCounts.addEventListener("change", () => {
        if (snapshot) {
            render();
        }
    });

    refs.theme.addEventListener("change", () => {
        applyTheme(refs.theme.value, true);
    });

    if (refs.bankrollInput) {
        refs.bankrollInput.addEventListener("input", syncBetLabelFromBankrollInput);
        refs.bankrollInput.addEventListener("change", syncBetLabelFromBankrollInput);
    }
    syncBetLabelFromBankrollInput();

    function applyPersistedUiState() {
        const persisted = readPersistedUiState();
        if (!persisted) {
            return;
        }

        applyPersistedControls(persisted.controls);
        applyPersistedPanels(persisted.panels);
    }

    function bindUiPersistence() {
        const persist = () => {
            persistUiState();
        };

        for (const id of persistedControlIds) {
            const element = document.getElementById(id);
            if (!element) {
                continue;
            }

            if (element instanceof HTMLInputElement) {
                if (element.type === "checkbox" || element.type === "radio") {
                    element.addEventListener("change", persist);
                } else {
                    element.addEventListener("input", persist);
                    element.addEventListener("change", persist);
                }
            } else if (element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement) {
                element.addEventListener("change", persist);
            }
        }

        for (const id of persistedPanelIds) {
            const panel = document.getElementById(id);
            if (panel instanceof HTMLDetailsElement) {
                panel.addEventListener("toggle", persist);
            }
        }
    }

    function captureSelectOptionLabels(selectElement) {
        const labels = new Map();
        if (!(selectElement instanceof HTMLSelectElement)) {
            return labels;
        }

        for (const option of Array.from(selectElement.options)) {
            labels.set(option.value, option.textContent || "");
        }

        return labels;
    }

    function bindDrillTargetRefresh() {
        const refresh = () => {
            renderCountQuizMetricStats();
            renderSpeedCountMetricStats();
            updateDrillProgressionLabels();
        };

        const watchedElements = [
            refs.countQuizTargetL1,
            refs.countQuizTargetL2,
            refs.countQuizTargetL3,
            refs.countQuizTargetL4,
            refs.countQuizTargetL5,
            refs.countQuizStrongL3,
            refs.countQuizStrongL4,
            refs.countQuizStrongL5,
            refs.speedTargetL1,
            refs.speedTargetL2,
            refs.speedTargetL3,
            refs.speedTargetL4,
            refs.speedTargetL5,
            refs.speedStrongL3,
            refs.speedStrongL4,
            refs.speedStrongL5,
            refs.countQuizLevel,
            refs.countLevel
        ];

        for (const element of watchedElements) {
            if (!element) {
                continue;
            }

            if (element instanceof HTMLInputElement) {
                element.addEventListener("input", refresh);
                element.addEventListener("change", refresh);
            } else if (element instanceof HTMLSelectElement) {
                element.addEventListener("change", refresh);
            }
        }

        refresh();
    }

    function persistUiState() {
        const data = {
            controls: collectPersistedControls(),
            panels: collectPersistedPanels()
        };

        try {
            localStorage.setItem(uiPrefsKey, JSON.stringify(data));
        } catch {
            // ignored
        }
    }

    function readPersistedUiState() {
        try {
            const raw = localStorage.getItem(uiPrefsKey);
            if (!raw) {
                return null;
            }

            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === "object" ? parsed : null;
        } catch {
            return null;
        }
    }

    function collectPersistedControls() {
        const controls = {};

        for (const id of persistedControlIds) {
            const element = document.getElementById(id);
            if (!element) {
                continue;
            }

            if (element instanceof HTMLInputElement) {
                if (element.type === "checkbox" || element.type === "radio") {
                    controls[id] = element.checked;
                } else {
                    controls[id] = element.value;
                }
            } else if (element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement) {
                controls[id] = element.value;
            }
        }

        return controls;
    }

    function collectPersistedPanels() {
        const panels = {};

        for (const id of persistedPanelIds) {
            const panel = document.getElementById(id);
            if (panel instanceof HTMLDetailsElement) {
                panels[id] = panel.open;
            }
        }

        return panels;
    }

    function applyPersistedControls(controls) {
        if (!controls || typeof controls !== "object") {
            return;
        }

        for (const id of persistedControlIds) {
            if (!Object.prototype.hasOwnProperty.call(controls, id)) {
                continue;
            }

            const element = document.getElementById(id);
            if (!element) {
                continue;
            }

            const value = controls[id];
            if (element instanceof HTMLInputElement) {
                if (element.type === "checkbox" || element.type === "radio") {
                    element.checked = Boolean(value);
                } else if (value !== null && value !== undefined) {
                    element.value = String(value);
                }
            } else if (element instanceof HTMLSelectElement) {
                if (value === null || value === undefined) {
                    continue;
                }

                const nextValue = String(value);
                const hasOption = Array.from(element.options).some(option => option.value === nextValue);
                if (hasOption) {
                    element.value = nextValue;
                }
            } else if (element instanceof HTMLTextAreaElement && value !== null && value !== undefined) {
                element.value = String(value);
            }
        }
    }

    function applyPersistedPanels(panels) {
        if (!panels || typeof panels !== "object") {
            return false;
        }

        let applied = false;
        for (const id of persistedPanelIds) {
            if (!Object.prototype.hasOwnProperty.call(panels, id)) {
                continue;
            }

            const panel = document.getElementById(id);
            if (!(panel instanceof HTMLDetailsElement)) {
                continue;
            }

            panel.open = Boolean(panels[id]);
            applied = true;
        }

        return applied;
    }

    void startSession();

    async function startSession() {
        clearAutoDealTimer();
        resetUiSessionState();
        resetPanelsForNewSession();

        let createdSession = false;
        try {
            setBusy(true);
            const payload = readSessionConfig();
            snapshot = await apiFetch(`${apiRoot}/session`, "POST", payload);
            appendLog("Started a new session.");
            render();
            createdSession = true;
        } catch (error) {
            showError(error);
        } finally {
            setBusy(false);
        }

        if (createdSession) {
            await dealRound(true);
        }
    }

    async function dealRound(isAuto) {
        if (requestInFlight) {
            return;
        }

        if (!snapshot) {
            if (!isAuto) {
                appendLog("No active session. Starting a new one.");
                renderLog();
            }
            await startSession();
            return;
        }

        if (!canDeal(snapshot.phase)) {
            if (!isAuto) {
                appendLog("Cannot deal while a hand is in progress.");
                renderLog();
            }
            return;
        }

        try {
            setBusy(true);
            const betUnits = resolveBetForDeal(isAuto);
            refs.betUnits.value = String(betUnits);
            snapshot = await apiFetch(`${apiRoot}/session/${snapshot.gameId}/deal`, "POST", { betUnits });
            lastActionReview = null;
            render();
        } catch (error) {
            showError(error);
        } finally {
            setBusy(false);
        }
    }

    async function sendAction(action) {
        if (!snapshot || requestInFlight) {
            return;
        }

        const pendingReview = buildActionReview(action);
        try {
            setBusy(true);
            snapshot = await apiFetch(`${apiRoot}/session/${snapshot.gameId}/action`, "POST", { action });
            if (pendingReview) {
                lastActionReview = pendingReview;
            }
            render();
        } catch (error) {
            showError(error);
        } finally {
            setBusy(false);
        }
    }

    async function apiFetch(url, method, body) {
        const response = await fetch(url, {
            method,
            headers: {
                "Content-Type": "application/json"
            },
            body: body ? JSON.stringify(body) : undefined
        });

        if (!response.ok) {
            let message = `Request failed (${response.status})`;
            try {
                const problem = await response.json();
                if (problem && problem.error) {
                    message = problem.error;
                } else if (problem && problem.errors) {
                    const firstKey = Object.keys(problem.errors)[0];
                    const firstError = firstKey && problem.errors[firstKey] && problem.errors[firstKey][0];
                    message = firstError || problem.title || message;
                } else if (problem && problem.title) {
                    message = problem.title;
                }
            } catch {
                // ignored
            }
            throw new Error(message);
        }

        const payload = await response.json();
        return normalizeSnapshotPayload(payload);
    }

    function readSessionConfig() {
        return {
            mode: getValue("bj-mode"),
            betSpread: toInt(getValue("bj-spread"), 8),
            startingBankrollUnits: toFloat(getValue("bj-bankroll"), 200),
            rules: {
                deckCount: toInt(getValue("bj-decks"), 6),
                dealerHitsSoft17: isChecked("bj-h17"),
                doubleRule: getValue("bj-double-rule"),
                doubleAfterSplit: isChecked("bj-das"),
                resplitAces: isChecked("bj-rsa"),
                maxSplits: toInt(getValue("bj-max-splits"), 3),
                blackjackPayout: getValue("bj-payout"),
                surrender: "Off",
                insuranceAllowed: isChecked("bj-insurance"),
                penetrationPercent: toInt(getValue("bj-penetration"), 75),
                burnCards: toInt(getValue("bj-burn"), 1)
            },
            aids: {
                showRunningCount: isChecked("bj-show-rc"),
                showTrueCount: isChecked("bj-show-tc"),
                showShoeDepth: isChecked("bj-show-depth"),
                showHints: isChecked("bj-show-hints")
            }
        };
    }

    function render() {
        if (!snapshot) {
            return;
        }

        refs.sessionLabel.textContent = `Session: ${snapshot.gameId}`;
        const bankrollUnits = resolveBankrollUnits(snapshot);
        refs.bankrollNow.textContent = formatCurrency(bankrollUnits);
        updateBetLabel(bankrollUnits);

        const hideCounts = refs.maskCounts.checked;
        const showRunning = snapshot.showRunningCount && !hideCounts;
        const showTrue = snapshot.showTrueCount && !hideCounts;

        refs.runningCount.textContent = showRunning ? `${snapshot.runningCount}` : "Hidden";
        refs.trueCount.textContent = showTrue ? `${fmt(snapshot.trueCount)}` : "Hidden";
        refs.shoeDepth.textContent = snapshot.showShoeDepth ? `${snapshot.shoeDepth.cardsRemaining}/${snapshot.shoeDepth.totalCards}` : "Hidden";

        refs.dealerTotal.textContent = snapshot.dealer.total;
        refs.dealerCards.replaceChildren(...snapshot.dealer.cards.map(renderCard));
        refs.playerHands.replaceChildren(...snapshot.playerHands.map(renderHand));

        renderActions(snapshot.allowedActions || []);
        updateDealButtonState();
        renderHint(snapshot.hint, snapshot.showHints);
        renderStats(snapshot.stats);
        renderMistakes(snapshot.stats?.mistakeBreakdown || {});
        renderHistory(snapshot.history || []);
        updateLobbyResult(latestRound(snapshot.history));

        syncLogFromSnapshot();
        applyAutoFocus();
        renderLog();
        updateBetSuggestionIfIdle();
        maybeAutoDeal();
    }

    function renderActions(allowedActions) {
        const allowedSet = new Set((allowedActions || []).map(normalizeActionToken).filter(Boolean));
        for (const [action, button] of actionButtons.entries()) {
            const enabled = allowedSet.has(normalizeActionToken(action)) && !requestInFlight;
            button.disabled = !enabled;
            button.classList.toggle("disabled", !enabled);
        }
    }

    function renderHint(hint, enabled) {
        const hintReady = Boolean(enabled && hint);

        if (refs.hintOptimalAction) {
            refs.hintOptimalAction.textContent = hintReady
                ? formatActionLabel(hint.recommendedAction)
                : lastActionReview ? lastActionReview.optimalLabel : "-";
        }

        if (refs.hintText) {
            if (!enabled) {
                refs.hintText.textContent = "Hints are hidden in this mode.";
            } else if (!hint) {
                refs.hintText.textContent = "Waiting for the next decision point.";
            } else {
                const core = `Basic: ${formatActionLabel(hint.basicAction)}.`;
                refs.hintText.textContent = hint.deviation
                    ? `${core} Deviation -> ${hint.reason}.`
                    : `${core} ${hint.reason}.`;
            }
        }

        if (lastActionReview) {
            if (refs.hintPlayerAction) {
                refs.hintPlayerAction.textContent = lastActionReview.playerLabel;
            }

            if (refs.hintStatus) {
                refs.hintStatus.textContent = lastActionReview.correct ? "Correct" : "Wrong";
                refs.hintStatus.classList.remove("bj-hint-status-neutral", "bj-hint-status-correct", "bj-hint-status-wrong");
                refs.hintStatus.classList.add(lastActionReview.correct ? "bj-hint-status-correct" : "bj-hint-status-wrong");
            }

            return;
        }

        if (refs.hintPlayerAction) {
            refs.hintPlayerAction.textContent = "-";
        }

        if (refs.hintStatus) {
            refs.hintStatus.textContent = "Waiting";
            refs.hintStatus.classList.remove("bj-hint-status-correct", "bj-hint-status-wrong");
            refs.hintStatus.classList.add("bj-hint-status-neutral");
        }
    }

    function renderStats(stats) {
        if (!stats) {
            return;
        }

        refs.statRounds.textContent = String(stats.roundsPlayed);
        refs.statHands.textContent = String(stats.handsPlayed);
        refs.statBasic.textContent = `${fmt(stats.basicAccuracy)}%`;
        refs.statDeviation.textContent = `${fmt(stats.deviationAccuracy)}%`;
        refs.statBet.textContent = `${fmt(stats.betAccuracy)}%`;
        refs.statRc.textContent = `${fmt(stats.runningCountAccuracy)}%`;
        refs.statTc.textContent = `${fmt(stats.trueCountAccuracy)}%`;
        refs.statEv.textContent = formatCurrency(stats.approxEvLeakUnits);
    }

    function renderMistakes(mistakeBreakdown) {
        refs.mistakes.innerHTML = "";
        const keys = Object.keys(mistakeBreakdown || {});
        if (!keys.length) {
            const li = document.createElement("li");
            li.textContent = "No mistakes logged.";
            refs.mistakes.appendChild(li);
            return;
        }

        for (const key of keys) {
            const li = document.createElement("li");
            li.textContent = `${key}: ${mistakeBreakdown[key]}`;
            refs.mistakes.appendChild(li);
        }
    }

    function renderHistory(history) {
        refs.historyList.innerHTML = "";
        if (!history.length) {
            const item = document.createElement("div");
            item.className = "bj-history-item";
            item.textContent = "No rounds played yet.";
            refs.historyList.appendChild(item);
            return;
        }

        const hideCounts = refs.maskCounts.checked;
        for (const row of history.slice().reverse()) {
            const item = document.createElement("div");
            item.className = "bj-history-item";
            const mistakes = row.mistakes && row.mistakes.length ? ` | Mistakes: ${row.mistakes.join("; ")}` : "";
            const countPart = hideCounts ? "" : ` | RC ${row.runningCountEnd} | TC ${fmt(row.trueCountEnd)}`;
            item.textContent = `#${row.roundNumber} Bet ${formatCurrency(row.betUnits)} | ${row.outcome} ${formatCurrency(row.netUnits)}${countPart}${mistakes}`;
            refs.historyList.appendChild(item);
        }
    }

    function renderLog() {
        refs.logList.innerHTML = "";
        if (!activityLog.length) {
            const row = document.createElement("div");
            row.className = "bj-log-item";
            row.textContent = "No activity yet.";
            refs.logList.appendChild(row);
            return;
        }

        for (const entry of activityLog) {
            const row = document.createElement("div");
            row.className = "bj-log-item";
            const time = document.createElement("span");
            time.className = "bj-log-time";
            time.textContent = `[${entry.time}]`;
            row.appendChild(time);
            row.append(document.createTextNode(entry.message));
            refs.logList.appendChild(row);
        }
    }

    function syncLogFromSnapshot() {
        if (!snapshot) {
            return;
        }

        const feedback = snapshot.feedback || [];
        const signature = `${snapshot.gameId}|${snapshot.phase}|${JSON.stringify(feedback)}`;
        if (signature !== lastFeedbackSignature) {
            for (const line of feedback) {
                appendLog(line);
            }
            lastFeedbackSignature = signature;
        }

        const latest = latestRound(snapshot.history);
        if (latest && latest.roundNumber > lastCompletedRound) {
            lastCompletedRound = latest.roundNumber;
            appendLog(`Round #${latest.roundNumber}: ${latest.outcome} ${formatCurrency(latest.netUnits)} (bet ${formatCurrency(latest.betUnits)}).`);
        }
    }

    function applyAutoFocus() {
        if (!snapshot || autoCollapsedForFocus) {
            return;
        }

        const roundsPlayed = snapshot.stats ? snapshot.stats.roundsPlayed : 0;
        if (roundsPlayed <= 0) {
            return;
        }

        collapsePanel(refs.panelSettings);
        collapsePanel(refs.panelCounts);
        collapsePanel(refs.panelStrategy);
        collapsePanel(refs.panelGuide);
        collapsePanel(refs.panelBasic);
        collapsePanel(refs.panelPerfect);
        collapsePanel(refs.panelCountQuiz);
        collapsePanel(refs.panelSpeedCount);
        collapsePanel(refs.panelLog);
        collapsePanel(refs.panelStats);
        collapsePanel(refs.panelHistory);
        collapsePanel(refs.panelRules);
        openPanel(refs.panelControls);

        autoCollapsedForFocus = true;
        appendLog("Focus mode applied: non-game panels collapsed. Expand any panel from its label.");
    }

    function maybeAutoDeal() {
        if (!snapshot || !refs.autoDeal.checked || requestInFlight) {
            return;
        }

        if (!isPhase(snapshot.phase, "RoundComplete")) {
            return;
        }

        const latest = latestRound(snapshot.history);
        if (!latest) {
            return;
        }

        if (latest.roundNumber <= lastAutoDealtRound) {
            return;
        }

        lastAutoDealtRound = latest.roundNumber;
        clearAutoDealTimer();
        autoDealTimer = window.setTimeout(() => {
            autoDealTimer = null;
            void dealRound(true);
        }, 380);
    }

    function updateBetSuggestionIfIdle() {
        if (!snapshot) {
            return;
        }

        if (!isPhase(snapshot.phase, "WaitingForBet") && !isPhase(snapshot.phase, "RoundComplete")) {
            return;
        }

        const suggested = recommendedBet(snapshot.trueCountFloor, snapshot.betSpread || 8);
        refs.betUnits.value = String(suggested);
    }

    function resolveBetForDeal(isAuto) {
        const spread = Math.max(2, toInt(snapshot.betSpread, 8));
        const suggested = recommendedBet(snapshot.trueCountFloor, spread);

        if (isAuto) {
            return suggested;
        }

        return clamp(toInt(refs.betUnits.value, suggested), 1, spread);
    }

    function recommendedBet(trueCountFloor, spread) {
        const cap = clamp(spread, 2, 20);
        if (trueCountFloor <= 0) {
            return 1;
        }
        if (trueCountFloor === 1) {
            return Math.min(2, cap);
        }
        if (trueCountFloor === 2) {
            return Math.min(4, cap);
        }
        if (trueCountFloor === 3) {
            return Math.min(6, cap);
        }
        return cap;
    }

    function latestRound(history) {
        if (!history || !history.length) {
            return null;
        }

        return history.reduce((max, row) => row.roundNumber > max.roundNumber ? row : max, history[0]);
    }

    function canDeal(phase) {
        return isPhase(phase, "WaitingForBet") || isPhase(phase, "RoundComplete");
    }

    function appendLog(message) {
        if (!message) {
            return;
        }

        activityLog.unshift({
            time: nowLabel(),
            message
        });

        if (activityLog.length > 120) {
            activityLog.length = 120;
        }
    }

    function nowLabel() {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, "0");
        const mm = String(now.getMinutes()).padStart(2, "0");
        const ss = String(now.getSeconds()).padStart(2, "0");
        return `${hh}:${mm}:${ss}`;
    }

    function resetUiSessionState() {
        lastCompletedRound = 0;
        lastAutoDealtRound = 0;
        lastFeedbackSignature = "";
        lastActionReview = null;
        autoCollapsedForFocus = false;
        activityLog.length = 0;
        renderLog();
    }

    function resetPanelsForNewSession() {
        const persisted = readPersistedUiState();
        if (persisted && applyPersistedPanels(persisted.panels)) {
            return;
        }

        openPanel(refs.panelSettings);
        openPanel(refs.panelCounts);
        openPanel(refs.panelControls);
        openPanel(refs.panelStrategy);
        openPanel(refs.panelGuide);
        openPanel(refs.panelBasic);
        openPanel(refs.panelPerfect);
        openPanel(refs.panelCountQuiz);
        openPanel(refs.panelSpeedCount);
        openPanel(refs.panelLog);
        openPanel(refs.panelStats);
        openPanel(refs.panelHistory);
        openPanel(refs.panelRules);
    }

    function openPanel(panel) {
        if (panel) {
            panel.open = true;
        }
    }

    function collapsePanel(panel) {
        if (panel) {
            panel.open = false;
        }
    }

    function clearAutoDealTimer() {
        if (autoDealTimer) {
            window.clearTimeout(autoDealTimer);
            autoDealTimer = null;
        }
    }

    function initCountQuizPanel() {
        if (countQuizBound) {
            return;
        }

        countQuizBound = true;

        if (refs.countQuizNewShoe) {
            refs.countQuizNewShoe.addEventListener("click", () => {
                generateCountQuizShoe();
            });
        }

        if (refs.countQuizPlus) {
            refs.countQuizPlus.addEventListener("click", () => {
                answerCountQuiz("+");
            });
        }

        if (refs.countQuizZero) {
            refs.countQuizZero.addEventListener("click", () => {
                answerCountQuiz("0");
            });
        }

        if (refs.countQuizMinus) {
            refs.countQuizMinus.addEventListener("click", () => {
                answerCountQuiz("-");
            });
        }

        if (refs.countQuizDecksSelect) {
            refs.countQuizDecksSelect.addEventListener("change", () => {
                generateCountQuizShoe();
            });
        }

        if (refs.countQuizLevel) {
            refs.countQuizLevel.addEventListener("change", () => {
                generateCountQuizShoe();
            });
        }

        generateCountQuizShoe();
    }

    function generateCountQuizShoe() {
        const deckCount = 1;
        const level = clamp(
            toInt(refs.countQuizLevel ? refs.countQuizLevel.value : String(countQuizState.level), countQuizState.level),
            1,
            5);
        const cards = buildShuffledPracticeShoe(deckCount).slice(0, totalCardsForPracticeLevel(level));

        countQuizState.deckCount = deckCount;
        countQuizState.level = level;
        countQuizState.cards = cards;
        countQuizState.nextIndex = 0;
        countQuizState.runningCount = 0;
        countQuizState.history = [];
        countQuizState.currentLabel = "-";
        countQuizState.currentDelta = 0;
        countQuizState.correct = 0;
        countQuizState.wrong = 0;
        countQuizState.lastFeedback = null;
        countQuizState.hasPendingChunk = false;
        countQuizState.completed = false;
        countQuizState.completionRecorded = false;

        resetCountQuizTimer();
        dealNextCountQuizChunk();
        renderCountQuizPanel();
    }

    function dealNextCountQuizChunk() {
        if (!countQuizState.cards.length || countQuizState.nextIndex >= countQuizState.cards.length) {
            countQuizState.currentLabel = "Done";
            countQuizState.currentDelta = 0;
            countQuizState.hasPendingChunk = false;
            countQuizState.completed = true;
            return false;
        }

        const cardsPerHit = cardsPerSpeedCountHit(countQuizState.level);
        const chunk = [];
        let delta = 0;

        for (let i = 0; i < cardsPerHit && countQuizState.nextIndex < countQuizState.cards.length; i += 1) {
            const card = countQuizState.cards[countQuizState.nextIndex];
            countQuizState.nextIndex += 1;
            delta += hiLoValue(card.rank);
            chunk.push(card.label);
        }

        countQuizState.currentLabel = chunk.join(" ");
        countQuizState.currentDelta = delta;
        countQuizState.hasPendingChunk = true;
        countQuizState.completed = false;
        return true;
    }

    function answerCountQuiz(answer) {
        if (!countQuizState.cards.length) {
            generateCountQuizShoe();
            return;
        }

        if (countQuizState.completed) {
            renderCountQuizPanel();
            return;
        }

        if (!countQuizState.hasPendingChunk) {
            if (!dealNextCountQuizChunk()) {
                renderCountQuizPanel();
                return;
            }
        }

        startCountQuizTimerIfNeeded();

        const expected = countSignForDelta(countQuizState.currentDelta);
        const isCorrect = expected === answer;
        countQuizState.runningCount += countQuizState.currentDelta;
        countQuizState.lastFeedback = { isCorrect, expected, answer };

        if (isCorrect) {
            countQuizState.correct += 1;
        } else {
            countQuizState.wrong += 1;
        }

        countQuizState.history.push({
            label: countQuizState.currentLabel,
            expected,
            answer,
            isCorrect
        });

        if (countQuizState.history.length > 24) {
            countQuizState.history.splice(0, countQuizState.history.length - 24);
        }

        countQuizState.hasPendingChunk = false;
        if (countQuizState.nextIndex < countQuizState.cards.length) {
            dealNextCountQuizChunk();
        } else {
            countQuizState.currentLabel = "Done";
            countQuizState.currentDelta = 0;
            countQuizState.hasPendingChunk = false;
            countQuizState.completed = true;
            stopCountQuizTimer();
            recordCountQuizCompletionIfNeeded();
        }

        renderCountQuizPanel();
    }

    function renderCountQuizPanel() {
        if (!countQuizState.hasPendingChunk && !countQuizState.completed && countQuizState.cards.length) {
            dealNextCountQuizChunk();
        }

        if (refs.countQuizDecksSelect) {
            refs.countQuizDecksSelect.value = String(countQuizState.deckCount);
        }

        if (refs.countQuizLevel) {
            refs.countQuizLevel.value = String(countQuizState.level);
        }

        if (refs.countQuizCurrent) {
            renderLabelWithSuitColors(refs.countQuizCurrent, countQuizState.currentLabel);
        }

        const totalCards = countQuizState.cards.length;
        const remainingCards = Math.max(0, totalCards - countQuizState.nextIndex);
        const answers = countQuizState.correct + countQuizState.wrong;
        const accuracy = answers > 0 ? (countQuizState.correct / answers) * 100 : 0;

        if (refs.countQuizRc) {
            refs.countQuizRc.textContent = String(countQuizState.runningCount);
        }

        if (refs.countQuizRemaining) {
            refs.countQuizRemaining.textContent = `${remainingCards}/${totalCards}`;
        }

        if (refs.countQuizCorrect) {
            refs.countQuizCorrect.textContent = String(countQuizState.correct);
        }

        if (refs.countQuizWrong) {
            refs.countQuizWrong.textContent = String(countQuizState.wrong);
        }

        if (refs.countQuizAccuracy) {
            refs.countQuizAccuracy.textContent = `${Math.round(accuracy)}%`;
        }

        if (countQuizState.completed) {
            recordCountQuizCompletionIfNeeded();
        }

        renderCountQuizFeedback();
        renderCountQuizMetricStats();
        renderCountQuizStream();
        syncCountQuizTimerDisplay();
        syncCountQuizButtons();
    }

    function renderCountQuizMetricStats() {
        const level = clamp(
            toInt(refs.countQuizLevel ? refs.countQuizLevel.value : String(countQuizState.level), countQuizState.level),
            1,
            5);
        const entries = metricsForLevel(countQuizMetrics, level);
        const targets = readCountQuizTargets(level);
        const readiness = buildReadinessSummary(entries, targets.acceptableMs, targets.strongMs);

        if (refs.countQuizLastRunTime) {
            refs.countQuizLastRunTime.textContent = readiness.latestMs === null
                ? "-"
                : formatSpeedCountElapsed(readiness.latestMs);
        }

        if (refs.countQuizBestTime) {
            refs.countQuizBestTime.textContent = readiness.bestMs === null
                ? "-"
                : formatSpeedCountElapsed(readiness.bestMs);
        }

        if (refs.countQuizLast10Acc) {
            refs.countQuizLast10Acc.textContent = readiness.last10Count > 0
                ? `${readiness.last10Perfect}/${readiness.last10Count} (${readiness.last10Percent}%)`
                : "-";
        }

        if (refs.countQuizGoalDelta) {
            setDeltaElement(refs.countQuizGoalDelta, readiness.goalDeltaMs);
        }

        if (refs.countQuizReadyStreak) {
            refs.countQuizReadyStreak.textContent = `${readiness.currentStreak}/${readyStreakRuns} | ${readiness.currentDays}/${readyDistinctDays}d`;
        }

        setStatusElement(refs.countQuizReadyStatus, readiness.badgeTier);
        updateDrillProgressionLabels();
    }

    function renderCountQuizFeedback() {
        if (!refs.countQuizFeedback) {
            return;
        }

        refs.countQuizFeedback.classList.remove(
            "bj-count-quiz-feedback-neutral",
            "bj-count-quiz-feedback-correct",
            "bj-count-quiz-feedback-wrong");

        const feedback = countQuizState.lastFeedback;
        if (!feedback) {
            refs.countQuizFeedback.textContent = countQuizState.completed ? "Shoe complete" : "Choose + / 0 / -";
            refs.countQuizFeedback.classList.add("bj-count-quiz-feedback-neutral");
            return;
        }

        if (feedback.isCorrect) {
            refs.countQuizFeedback.textContent = `Correct (${feedback.expected})`;
            refs.countQuizFeedback.classList.add("bj-count-quiz-feedback-correct");
            return;
        }

        refs.countQuizFeedback.textContent = `Wrong (${feedback.answer}; ${feedback.expected})`;
        refs.countQuizFeedback.classList.add("bj-count-quiz-feedback-wrong");
    }

    function renderCountQuizStream() {
        if (!refs.countQuizStream) {
            return;
        }

        refs.countQuizStream.innerHTML = "";
        for (let i = countQuizState.history.length - 1; i >= 0; i -= 1) {
            const item = countQuizState.history[i];
            const chip = document.createElement("span");
            chip.className = `bj-speed-chip ${item.isCorrect ? "bj-count-quiz-chip-correct" : "bj-count-quiz-chip-wrong"}`;
            renderLabelWithSuitColors(chip, item.label);
            chip.append(document.createTextNode(` ${item.expected}`));
            refs.countQuizStream.appendChild(chip);
        }
    }

    function syncCountQuizButtons() {
        const disabled = countQuizState.completed || !countQuizState.cards.length || !countQuizState.hasPendingChunk;
        setCountQuizButtonState(refs.countQuizPlus, disabled);
        setCountQuizButtonState(refs.countQuizZero, disabled);
        setCountQuizButtonState(refs.countQuizMinus, disabled);
    }

    function setCountQuizButtonState(button, disabled) {
        if (!button) {
            return;
        }

        button.disabled = disabled;
        button.classList.toggle("disabled", disabled);
    }

    function countSignForDelta(delta) {
        if (delta > 0) {
            return "+";
        }

        if (delta < 0) {
            return "-";
        }

        return "0";
    }

    function startCountQuizTimerIfNeeded() {
        if (countQuizState.timerStartedAtMs !== null) {
            return;
        }

        countQuizState.timerStartedAtMs = Date.now() - countQuizState.timerElapsedMs;
        if (countQuizState.timerIntervalId !== null) {
            window.clearInterval(countQuizState.timerIntervalId);
        }

        countQuizState.timerIntervalId = window.setInterval(() => {
            if (countQuizState.timerStartedAtMs === null) {
                return;
            }

            countQuizState.timerElapsedMs = Date.now() - countQuizState.timerStartedAtMs;
            syncCountQuizTimerDisplay();
        }, 100);

        syncCountQuizTimerDisplay();
    }

    function stopCountQuizTimer() {
        if (countQuizState.timerStartedAtMs !== null) {
            countQuizState.timerElapsedMs = Date.now() - countQuizState.timerStartedAtMs;
        }

        countQuizState.timerStartedAtMs = null;
        if (countQuizState.timerIntervalId !== null) {
            window.clearInterval(countQuizState.timerIntervalId);
            countQuizState.timerIntervalId = null;
        }

        syncCountQuizTimerDisplay();
    }

    function resetCountQuizTimer() {
        if (countQuizState.timerIntervalId !== null) {
            window.clearInterval(countQuizState.timerIntervalId);
            countQuizState.timerIntervalId = null;
        }

        countQuizState.timerStartedAtMs = null;
        countQuizState.timerElapsedMs = 0;
        syncCountQuizTimerDisplay();
    }

    function syncCountQuizTimerDisplay() {
        if (!refs.countQuizTimer) {
            return;
        }

        const elapsedMs = countQuizState.timerStartedAtMs === null
            ? countQuizState.timerElapsedMs
            : Date.now() - countQuizState.timerStartedAtMs;
        refs.countQuizTimer.textContent = formatSpeedCountElapsed(elapsedMs);
    }

    function buildShuffledPracticeShoe(deckCount) {
        const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
        const suits = ["\u2660", "\u2665", "\u2666", "\u2663"];
        const cards = [];

        for (let deck = 0; deck < deckCount; deck += 1) {
            for (const suit of suits) {
                for (const rank of ranks) {
                    cards.push({ rank, label: `${rank}${suit}` });
                }
            }
        }

        for (let i = cards.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            [cards[i], cards[j]] = [cards[j], cards[i]];
        }

        return cards;
    }

    function initSpeedCountPanel() {
        if (speedCountBound) {
            return;
        }

        speedCountBound = true;
        document.addEventListener("click", (event) => {
            const target = event.target;
            if (!(target instanceof Element)) {
                return;
            }

            const button = target.closest("button");
            if (!button || !(button instanceof HTMLButtonElement)) {
                return;
            }

            if (button.id === "bj-count-new-shoe") {
                generateSpeedCountShoe();
            } else if (button.id === "bj-count-hit") {
                hitSpeedCountCard();
            }
        });

        if (refs.countDecksSelect) {
            refs.countDecksSelect.addEventListener("change", () => {
                generateSpeedCountShoe();
            });
        }

        if (refs.countLevel) {
            refs.countLevel.addEventListener("change", () => {
                speedCountState.level = clamp(toInt(refs.countLevel.value, speedCountState.level), 1, 5);
                generateSpeedCountShoe();
            });
        }

        if (refs.countShowCounts) {
            refs.countShowCounts.addEventListener("change", () => {
                renderSpeedCountPanel();
            });
        }

        generateSpeedCountShoe();
    }

    function generateSpeedCountShoe() {
        const deckCount = 1;
        const level = clamp(
            toInt(refs.countLevel ? refs.countLevel.value : String(speedCountState.level), speedCountState.level),
            1,
            5);
        const cards = buildShuffledPracticeShoe(deckCount).slice(0, totalCardsForPracticeLevel(level));

        speedCountState.deckCount = deckCount;
        speedCountState.level = level;
        speedCountState.cards = cards;
        speedCountState.nextIndex = 0;
        speedCountState.runningCount = 0;
        speedCountState.history = [];
        speedCountState.lastCardLabel = "-";
        speedCountState.completionRecorded = false;
        resetSpeedCountTimer();
        renderSpeedCountPanel();
    }

    function hitSpeedCountCard() {
        if (!speedCountState.cards.length) {
            generateSpeedCountShoe();
            return;
        }

        if (speedCountState.nextIndex >= speedCountState.cards.length) {
            stopSpeedCountTimer();
            recordSpeedCountCompletionIfNeeded();
            generateSpeedCountShoe();
            return;
        }

        startSpeedCountTimerIfNeeded();
        const cardsPerHit = cardsPerSpeedCountHit(speedCountState.level);
        const chunk = [];
        for (let i = 0; i < cardsPerHit && speedCountState.nextIndex < speedCountState.cards.length; i += 1) {
            const card = speedCountState.cards[speedCountState.nextIndex];
            speedCountState.nextIndex += 1;
            speedCountState.runningCount += hiLoValue(card.rank);
            speedCountState.history.push(card.label);
            chunk.push(card.label);
        }

        if (speedCountState.history.length > 24) {
            speedCountState.history.splice(0, speedCountState.history.length - 24);
        }

        speedCountState.lastCardLabel = chunk.join(" ");

        if (speedCountState.nextIndex >= speedCountState.cards.length) {
            stopSpeedCountTimer();
            recordSpeedCountCompletionIfNeeded();
        }

        renderSpeedCountPanel();
    }

    function renderSpeedCountPanel() {
        const countRemaining = document.getElementById("bj-count-remaining");
        const countRc = document.getElementById("bj-count-rc");
        const countTc = document.getElementById("bj-count-tc");
        const countLastCard = refs.countLastCard || document.getElementById("bj-count-last-card");
        const countStream = document.getElementById("bj-count-stream");
        if (!countRemaining || !countRc || !countTc || !countLastCard || !countStream) {
            return;
        }

        if (refs.countDecksSelect) {
            refs.countDecksSelect.value = String(speedCountState.deckCount);
        }

        if (refs.countLevel) {
            refs.countLevel.value = String(speedCountState.level);
        }

        const totalCards = speedCountState.cards.length;
        const remaining = Math.max(0, totalCards - speedCountState.nextIndex);
        const decksRemaining = remaining / 52;
        const trueCount = decksRemaining > 0 ? speedCountState.runningCount / decksRemaining : speedCountState.runningCount;
        const showCounts = !refs.countShowCounts || refs.countShowCounts.checked;

        countRemaining.textContent = `${remaining}/${totalCards}`;
        countRc.textContent = showCounts ? String(speedCountState.runningCount) : "Hidden";
        countTc.textContent = showCounts ? fmt(trueCount) : "Hidden";
        renderLabelWithSuitColors(countLastCard, speedCountState.lastCardLabel);
        syncSpeedCountTimerDisplay();
        renderSpeedCountMetricStats();

        countStream.innerHTML = "";
        for (let i = speedCountState.history.length - 1; i >= 0; i -= 1) {
            const chip = document.createElement("span");
            chip.className = "bj-speed-chip";
            renderLabelWithSuitColors(chip, speedCountState.history[i]);
            countStream.appendChild(chip);
        }
    }

    function renderSpeedCountMetricStats() {
        const level = clamp(
            toInt(refs.countLevel ? refs.countLevel.value : String(speedCountState.level), speedCountState.level),
            1,
            5);
        const entries = metricsForLevel(speedCountMetrics, level);
        const targets = readSpeedTargets(level);
        const readiness = buildReadinessSummary(entries, targets.acceptableMs, targets.strongMs);
        const latest = entries.length > 0 ? entries[entries.length - 1] : null;
        const previous = entries.length > 1 ? entries[entries.length - 2] : null;
        const shoeDeltaMs = latest && previous
            ? toInt(latest.elapsedMs, 0) - toInt(previous.elapsedMs, 0)
            : null;

        if (refs.countOneDeckTime) {
            refs.countOneDeckTime.textContent = readiness.latestMs === null
                ? "-"
                : formatSpeedCountElapsed(readiness.latestMs);
        }

        if (refs.countBestTime) {
            refs.countBestTime.textContent = readiness.bestMs === null
                ? "-"
                : formatSpeedCountElapsed(readiness.bestMs);
        }

        if (refs.countLast10Acc) {
            refs.countLast10Acc.textContent = readiness.last10Count > 0
                ? `${readiness.last10Perfect}/${readiness.last10Count} (${readiness.last10Percent}%)`
                : "-";
        }

        if (refs.countShoeDelta) {
            setDeltaElement(refs.countShoeDelta, shoeDeltaMs);
        }

        if (refs.countGoalDelta) {
            setDeltaElement(refs.countGoalDelta, readiness.goalDeltaMs);
        }

        if (refs.countReadyStreak) {
            refs.countReadyStreak.textContent = `${readiness.currentStreak}/${readyStreakRuns} | ${readiness.currentDays}/${readyDistinctDays}d`;
        }

        setStatusElement(refs.countReadyStatus, readiness.badgeTier);
        updateDrillProgressionLabels();
    }

    function cardsPerSpeedCountHit(level) {
        if (level === 4) {
            return 2;
        }

        if (level === 5) {
            return 5;
        }

        return 1;
    }

    function totalCardsForPracticeLevel(level) {
        if (level === 1) {
            return 10;
        }

        if (level === 2) {
            return 20;
        }

        return 52;
    }

    function startSpeedCountTimerIfNeeded() {
        if (speedCountState.timerStartedAtMs !== null) {
            return;
        }

        speedCountState.timerStartedAtMs = Date.now() - speedCountState.timerElapsedMs;
        if (speedCountState.timerIntervalId !== null) {
            window.clearInterval(speedCountState.timerIntervalId);
        }

        speedCountState.timerIntervalId = window.setInterval(() => {
            if (speedCountState.timerStartedAtMs === null) {
                return;
            }

            speedCountState.timerElapsedMs = Date.now() - speedCountState.timerStartedAtMs;
            syncSpeedCountTimerDisplay();
        }, 100);

        syncSpeedCountTimerDisplay();
    }

    function stopSpeedCountTimer() {
        if (speedCountState.timerStartedAtMs !== null) {
            speedCountState.timerElapsedMs = Date.now() - speedCountState.timerStartedAtMs;
        }

        speedCountState.timerStartedAtMs = null;
        if (speedCountState.timerIntervalId !== null) {
            window.clearInterval(speedCountState.timerIntervalId);
            speedCountState.timerIntervalId = null;
        }

        syncSpeedCountTimerDisplay();
    }

    function resetSpeedCountTimer() {
        if (speedCountState.timerIntervalId !== null) {
            window.clearInterval(speedCountState.timerIntervalId);
            speedCountState.timerIntervalId = null;
        }

        speedCountState.timerStartedAtMs = null;
        speedCountState.timerElapsedMs = 0;
        syncSpeedCountTimerDisplay();
    }

    function syncSpeedCountTimerDisplay() {
        if (!refs.countTimer) {
            return;
        }

        const elapsedMs = speedCountState.timerStartedAtMs === null
            ? speedCountState.timerElapsedMs
            : Date.now() - speedCountState.timerStartedAtMs;
        refs.countTimer.textContent = formatSpeedCountElapsed(elapsedMs);
    }

    function formatSpeedCountElapsed(elapsedMs) {
        const tenths = Math.max(0, Math.floor(elapsedMs / 100));
        const minutes = Math.floor(tenths / 600);
        const seconds = Math.floor((tenths % 600) / 10);
        const tenth = tenths % 10;
        return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${tenth}`;
    }

    function formatSpeedCountDelta(deltaMs) {
        const sign = deltaMs > 0 ? "+" : "-";
        const tenths = Math.round(Math.abs(deltaMs) / 100);
        const wholeSeconds = Math.floor(tenths / 10);
        const tenth = tenths % 10;
        return `${sign}${wholeSeconds}.${tenth}s`;
    }

    function recordCountQuizCompletionIfNeeded() {
        if (countQuizState.completionRecorded) {
            return;
        }

        if (!countQuizState.cards.length || countQuizState.nextIndex < countQuizState.cards.length) {
            return;
        }

        const elapsedMs = Math.max(0, Math.round(countQuizState.timerElapsedMs));
        if (elapsedMs <= 0) {
            return;
        }

        countQuizMetrics.entries.push({
            atUtc: new Date().toISOString(),
            deckCount: countQuizState.deckCount,
            level: countQuizState.level,
            elapsedMs,
            mistakes: countQuizState.wrong
        });

        if (countQuizMetrics.entries.length > 200) {
            countQuizMetrics.entries.splice(0, countQuizMetrics.entries.length - 200);
        }

        countQuizState.completionRecorded = true;
        saveCountQuizMetrics();
    }

    function recordSpeedCountCompletionIfNeeded() {
        if (speedCountState.completionRecorded) {
            return;
        }

        if (!speedCountState.cards.length || speedCountState.nextIndex < speedCountState.cards.length) {
            return;
        }

        const elapsedMs = Math.max(0, Math.round(speedCountState.timerElapsedMs));
        if (elapsedMs <= 0) {
            return;
        }

        const oneDeckMs = Math.round(elapsedMs / Math.max(1, speedCountState.deckCount));
        const previous = latestSpeedCountMetric();
        const previousOneDeckMs = previous ? Number(previous.oneDeckMs) : null;
        const deltaOneDeckMs = Number.isFinite(previousOneDeckMs)
            ? oneDeckMs - previousOneDeckMs
            : null;

        speedCountMetrics.entries.push({
            atUtc: new Date().toISOString(),
            deckCount: speedCountState.deckCount,
            level: speedCountState.level,
            elapsedMs,
            oneDeckMs,
            deltaOneDeckMs,
            mistakes: 0
        });

        if (speedCountMetrics.entries.length > 200) {
            speedCountMetrics.entries.splice(0, speedCountMetrics.entries.length - 200);
        }

        speedCountState.completionRecorded = true;
        saveSpeedCountMetrics();
    }

    function loadSpeedCountMetrics() {
        try {
            const raw = localStorage.getItem(speedCountMetricsKey);
            if (!raw) {
                return { entries: [] };
            }

            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.entries)) {
                return { entries: [] };
            }

            const entries = parsed.entries
                .map(entry => sanitizeSpeedCountMetricEntry(entry))
                .filter(Boolean);

            return { entries };
        } catch {
            return { entries: [] };
        }
    }

    function saveSpeedCountMetrics() {
        try {
            localStorage.setItem(speedCountMetricsKey, JSON.stringify(speedCountMetrics));
        } catch {
            // ignored
        }
    }

    function latestSpeedCountMetric() {
        if (!speedCountMetrics.entries.length) {
            return null;
        }

        return speedCountMetrics.entries[speedCountMetrics.entries.length - 1];
    }

    function latestSpeedCountMetricForLevelAndDeck(level, deckCount) {
        for (let i = speedCountMetrics.entries.length - 1; i >= 0; i -= 1) {
            const entry = speedCountMetrics.entries[i];
            if (entry.level === level && entry.deckCount === deckCount) {
                return entry;
            }
        }

        return null;
    }

    function sanitizeSpeedCountMetricEntry(entry) {
        if (!entry || typeof entry !== "object") {
            return null;
        }

        const elapsedMs = toInt(entry.elapsedMs, -1);
        const oneDeckMs = toInt(entry.oneDeckMs, -1);
        if (elapsedMs < 0 || oneDeckMs < 0) {
            return null;
        }

        const deltaRaw = entry.deltaOneDeckMs;
        const deltaOneDeckMs = deltaRaw == null ? null : Number(deltaRaw);
        const mistakes = Math.max(0, toInt(entry.mistakes, 0));

        return {
            atUtc: String(entry.atUtc || ""),
            deckCount: clamp(toInt(entry.deckCount, 1), 1, 8),
            level: clamp(toInt(entry.level, 1), 1, 5),
            elapsedMs,
            oneDeckMs,
            deltaOneDeckMs: Number.isFinite(deltaOneDeckMs) ? deltaOneDeckMs : null,
            mistakes
        };
    }

    function loadCountQuizMetrics() {
        try {
            const raw = localStorage.getItem(countQuizMetricsKey);
            if (!raw) {
                return { entries: [] };
            }

            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.entries)) {
                return { entries: [] };
            }

            const entries = parsed.entries
                .map(entry => sanitizeCountQuizMetricEntry(entry))
                .filter(Boolean);

            return { entries };
        } catch {
            return { entries: [] };
        }
    }

    function saveCountQuizMetrics() {
        try {
            localStorage.setItem(countQuizMetricsKey, JSON.stringify(countQuizMetrics));
        } catch {
            // ignored
        }
    }

    function latestCountQuizMetricForLevelAndDeck(level, deckCount) {
        for (let i = countQuizMetrics.entries.length - 1; i >= 0; i -= 1) {
            const entry = countQuizMetrics.entries[i];
            if (entry.level === level && entry.deckCount === deckCount) {
                return entry;
            }
        }

        return null;
    }

    function sanitizeCountQuizMetricEntry(entry) {
        if (!entry || typeof entry !== "object") {
            return null;
        }

        const elapsedMs = toInt(entry.elapsedMs, -1);
        if (elapsedMs < 0) {
            return null;
        }
        const mistakes = Math.max(0, toInt(entry.mistakes, 0));

        return {
            atUtc: String(entry.atUtc || ""),
            deckCount: clamp(toInt(entry.deckCount, 1), 1, 8),
            level: clamp(toInt(entry.level, 1), 1, 5),
            elapsedMs,
            mistakes
        };
    }

    function readCountQuizTargets(level) {
        const defaultAcceptable = {
            1: 4.0,
            2: 7.0,
            3: 16.0,
            4: 13.0,
            5: 20.0
        };
        const defaultStrong = {
            1: 4.0,
            2: 7.0,
            3: 15.0,
            4: 12.0,
            5: 15.0
        };

        const acceptableSeconds = {
            1: readSecondsInput(refs.countQuizTargetL1, defaultAcceptable[1]),
            2: readSecondsInput(refs.countQuizTargetL2, defaultAcceptable[2]),
            3: readSecondsInput(refs.countQuizTargetL3, defaultAcceptable[3]),
            4: readSecondsInput(refs.countQuizTargetL4, defaultAcceptable[4]),
            5: readSecondsInput(refs.countQuizTargetL5, defaultAcceptable[5])
        };
        const strongSeconds = {
            1: acceptableSeconds[1],
            2: acceptableSeconds[2],
            3: readSecondsInput(refs.countQuizStrongL3, defaultStrong[3]),
            4: readSecondsInput(refs.countQuizStrongL4, defaultStrong[4]),
            5: readSecondsInput(refs.countQuizStrongL5, defaultStrong[5])
        };

        const nextLevel = clamp(level, 1, 5);
        const acceptableMs = secondsToMs(acceptableSeconds[nextLevel]);
        const strongMs = secondsToMs(Math.min(acceptableSeconds[nextLevel], strongSeconds[nextLevel]));
        return { acceptableMs, strongMs };
    }

    function readSpeedTargets(level) {
        const defaultAcceptable = {
            1: 4.0,
            2: 7.0,
            3: 30.0,
            4: 22.0,
            5: 18.0
        };
        const defaultStrong = {
            1: 4.0,
            2: 7.0,
            3: 22.0,
            4: 20.0,
            5: 15.0
        };

        const acceptableSeconds = {
            1: readSecondsInput(refs.speedTargetL1, defaultAcceptable[1]),
            2: readSecondsInput(refs.speedTargetL2, defaultAcceptable[2]),
            3: readSecondsInput(refs.speedTargetL3, defaultAcceptable[3]),
            4: readSecondsInput(refs.speedTargetL4, defaultAcceptable[4]),
            5: readSecondsInput(refs.speedTargetL5, defaultAcceptable[5])
        };
        const strongSeconds = {
            1: acceptableSeconds[1],
            2: acceptableSeconds[2],
            3: readSecondsInput(refs.speedStrongL3, defaultStrong[3]),
            4: readSecondsInput(refs.speedStrongL4, defaultStrong[4]),
            5: readSecondsInput(refs.speedStrongL5, defaultStrong[5])
        };

        const nextLevel = clamp(level, 1, 5);
        const acceptableMs = secondsToMs(acceptableSeconds[nextLevel]);
        const strongMs = secondsToMs(Math.min(acceptableSeconds[nextLevel], strongSeconds[nextLevel]));
        return { acceptableMs, strongMs };
    }

    function readSecondsInput(input, fallbackSeconds) {
        if (!(input instanceof HTMLInputElement)) {
            return fallbackSeconds;
        }

        const parsed = toFloat(input.value, fallbackSeconds);
        return clamp(parsed, 0.1, 600);
    }

    function secondsToMs(seconds) {
        return Math.max(100, Math.round(Number(seconds) * 1000));
    }

    function metricsForLevel(metricStore, level) {
        if (!metricStore || !Array.isArray(metricStore.entries)) {
            return [];
        }

        const targetLevel = clamp(level, 1, 5);
        return metricStore.entries.filter(entry => entry.level === targetLevel && entry.deckCount === 1);
    }

    function buildReadinessSummary(entries, acceptableMs, strongMs) {
        const normalizedAcceptableMs = Math.max(100, toInt(acceptableMs, 1000));
        const normalizedStrongMs = Math.max(100, Math.min(normalizedAcceptableMs, toInt(strongMs, normalizedAcceptableMs)));
        const latest = entries.length > 0 ? entries[entries.length - 1] : null;
        const latestMs = latest ? toInt(latest.elapsedMs, -1) : -1;
        const bestMs = entries.length > 0
            ? entries.reduce((best, entry) => {
                const value = toInt(entry.elapsedMs, -1);
                if (value < 0) {
                    return best;
                }

                return best === null ? value : Math.min(best, value);
            }, null)
            : null;

        const silverDays = qualifiedDayCount(entries, normalizedAcceptableMs);
        const goldDays = qualifiedDayCount(entries, normalizedStrongMs);
        const silverPassed = silverDays >= readyDistinctDays;
        const goldPassed = goldDays >= readyDistinctDays;
        const badgeTier = goldPassed
            ? "gold"
            : silverPassed
                ? "silver"
                : "notpassed";
        const activeTargetMs = silverPassed ? normalizedStrongMs : normalizedAcceptableMs;
        const currentStreak = Math.min(readyStreakRuns, consecutivePerfectStreak(entries, activeTargetMs));
        const currentDays = Math.min(readyDistinctDays, qualifiedDayCount(entries, activeTargetMs));
        const goalDeltaMs = latestMs >= 0 ? latestMs - activeTargetMs : null;
        const last10 = entries.slice(-10);
        const last10Perfect = last10.filter(entry => isPerfectRun(entry, activeTargetMs)).length;
        const last10Count = last10.length;
        const last10Percent = last10Count > 0 ? Math.round((last10Perfect / last10Count) * 100) : 0;

        return {
            badgeTier,
            latestMs: latestMs >= 0 ? latestMs : null,
            bestMs,
            goalDeltaMs,
            currentStreak,
            currentDays,
            last10Perfect,
            last10Count,
            last10Percent
        };
    }

    function consecutivePerfectStreak(entries, targetMs) {
        let streak = 0;
        for (let i = entries.length - 1; i >= 0; i -= 1) {
            if (!isPerfectRun(entries[i], targetMs)) {
                break;
            }

            streak += 1;
        }

        return streak;
    }

    function qualifiedDayCount(entries, targetMs) {
        if (!entries.length) {
            return 0;
        }

        const buckets = new Map();
        for (const entry of entries) {
            const key = localDayKey(entry.atUtc);
            if (!buckets.has(key)) {
                buckets.set(key, []);
            }

            buckets.get(key).push(entry);
        }

        let days = 0;
        for (const dayEntries of buckets.values()) {
            let streak = 0;
            let maxStreak = 0;
            for (const entry of dayEntries) {
                if (isPerfectRun(entry, targetMs)) {
                    streak += 1;
                    if (streak > maxStreak) {
                        maxStreak = streak;
                    }
                } else {
                    streak = 0;
                }
            }

            if (maxStreak >= readyStreakRuns) {
                days += 1;
            }
        }

        return days;
    }

    function localDayKey(rawUtc) {
        const timestamp = rawUtc ? Date.parse(rawUtc) : Number.NaN;
        if (!Number.isFinite(timestamp)) {
            return "unknown-day";
        }

        const date = new Date(timestamp);
        const yyyy = String(date.getFullYear());
        const mm = String(date.getMonth() + 1).padStart(2, "0");
        const dd = String(date.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
    }

    function isPerfectRun(entry, targetMs) {
        if (!entry || typeof entry !== "object") {
            return false;
        }

        const elapsedMs = toInt(entry.elapsedMs, -1);
        const mistakes = Math.max(0, toInt(entry.mistakes, 0));
        return elapsedMs >= 0 && mistakes === 0 && elapsedMs <= targetMs;
    }

    function setDeltaElement(element, deltaMs) {
        if (!element) {
            return;
        }

        element.classList.remove("bj-speed-delta-better", "bj-speed-delta-worse");
        if (deltaMs == null || !Number.isFinite(deltaMs)) {
            element.textContent = "-";
            return;
        }

        if (deltaMs === 0) {
            element.textContent = "0.0s";
            return;
        }

        element.textContent = formatSpeedCountDelta(deltaMs);
        element.classList.add(deltaMs < 0 ? "bj-speed-delta-better" : "bj-speed-delta-worse");
    }

    function setStatusElement(element, badgeTier) {
        if (!element) {
            return;
        }

        element.classList.remove("bj-ready-status-notpassed", "bj-ready-status-silver", "bj-ready-status-gold");
        if (badgeTier === "gold") {
            element.textContent = "\u2B50 Ready to move on";
            element.classList.add("bj-ready-status-gold");
            return;
        }

        if (badgeTier === "silver") {
            element.textContent = "\u2705 Passed (silver)";
            element.classList.add("bj-ready-status-silver");
            return;
        }

        element.textContent = "\u274C Not passed";
        element.classList.add("bj-ready-status-notpassed");
    }

    function updateDrillProgressionLabels() {
        const quizTiers = new Map();
        const speedTiers = new Map();

        for (let level = 1; level <= 5; level += 1) {
            const quizEntries = metricsForLevel(countQuizMetrics, level);
            const quizTargets = readCountQuizTargets(level);
            quizTiers.set(level, buildReadinessSummary(quizEntries, quizTargets.acceptableMs, quizTargets.strongMs).badgeTier);

            const speedEntries = metricsForLevel(speedCountMetrics, level);
            const speedTargets = readSpeedTargets(level);
            speedTiers.set(level, buildReadinessSummary(speedEntries, speedTargets.acceptableMs, speedTargets.strongMs).badgeTier);
        }

        updateProgressionSelect(refs.countQuizLevel, countQuizLevelBaseLabels, quizTiers);
        updateProgressionSelect(refs.countLevel, speedCountLevelBaseLabels, speedTiers);
    }

    function updateProgressionSelect(selectElement, baseLabels, tierByLevel) {
        if (!(selectElement instanceof HTMLSelectElement)) {
            return;
        }

        for (const option of Array.from(selectElement.options)) {
            const level = clamp(toInt(option.value, 1), 1, 5);
            const baseLabel = baseLabels.get(option.value) || option.textContent || `Level ${level}`;
            const tier = tierByLevel.get(level) || "notpassed";
            const priorTier = level > 1 ? tierByLevel.get(level - 1) || "notpassed" : "gold";
            const notMeaningful = level > 1 && priorTier !== "gold";
            const suffix = notMeaningful
                ? " [not meaningful yet]"
                : tier === "gold"
                    ? " \u2B50"
                    : tier === "silver"
                        ? " \u2705"
                        : " \u274C";
            option.textContent = `${baseLabel}${suffix}`;
        }
    }

    function hiLoValue(rank) {
        if (rank === "2" || rank === "3" || rank === "4" || rank === "5" || rank === "6") {
            return 1;
        }

        if (rank === "7" || rank === "8" || rank === "9") {
            return 0;
        }

        return -1;
    }

    function renderCard(card) {
        const div = document.createElement("div");
        div.className = `bj-card${card.hidden ? " hidden" : ""}`;
        renderLabelWithSuitColors(div, card.label);
        return div;
    }

    function renderLabelWithSuitColors(container, rawLabel) {
        container.replaceChildren();

        const label = normalizeSuitGlyphs(rawLabel);
        if (!label) {
            return;
        }

        const tokens = String(label).trim().split(/\s+/).filter(Boolean);
        if (!tokens.length) {
            container.append(document.createTextNode(String(label)));
            return;
        }

        for (let i = 0; i < tokens.length; i += 1) {
            if (i > 0) {
                container.append(document.createTextNode(" "));
            }

            appendSuitToken(container, tokens[i]);
        }
    }

    function appendSuitToken(container, token) {
        if (!token) {
            return;
        }

        const suit = token.slice(-1);
        if (!allSuitGlyphs.has(suit)) {
            container.append(document.createTextNode(token));
            return;
        }

        const rank = token.slice(0, -1);
        if (rank) {
            container.append(document.createTextNode(rank));
        }

        const suitSpan = document.createElement("span");
        suitSpan.textContent = suit;
        if (redSuitGlyphs.has(suit)) {
            suitSpan.className = "bj-suit-red";
        }

        container.append(suitSpan);
    }

    function normalizeSuitGlyphs(rawLabel) {
        if (rawLabel == null) {
            return "";
        }

        let label = String(rawLabel);
        label = label.split("â™ ").join("\u2660");
        label = label.split("â™¥").join("\u2665");
        label = label.split("â™¦").join("\u2666");
        label = label.split("â™£").join("\u2663");
        return label;
    }

    function renderHand(hand) {
        const wrap = document.createElement("div");
        wrap.className = `bj-hand${hand.isActive ? " active" : ""}`;

        const meta = document.createElement("div");
        meta.className = "bj-hand-meta";
        meta.textContent = `Total ${hand.total} | Bet ${formatCurrency(hand.betUnits)}${hand.isDoubled ? " (Doubled)" : ""}${hand.isSurrendered ? " (Surrendered)" : ""}${hand.outcome ? ` | ${hand.outcome} ${formatCurrency(hand.netUnits)}` : ""}`;
        wrap.appendChild(meta);

        const cards = document.createElement("div");
        cards.className = "bj-cards";
        for (const card of hand.cards) {
            cards.appendChild(renderCard(card));
        }
        wrap.appendChild(cards);
        return wrap;
    }

    function initActionButtons() {
        const buttons = document.querySelectorAll("#bj-actions .bj-action-btn");
        buttons.forEach(button => {
            const action = button.getAttribute("data-action");
            if (!action) {
                return;
            }

            actionButtons.set(action, button);
            button.addEventListener("click", () => {
                if (!button.disabled) {
                    void sendAction(action);
                }
            });
        });
    }

    function setBusy(isBusy) {
        requestInFlight = isBusy;
        refs.startSession.disabled = isBusy;

        if (snapshot) {
            renderActions(snapshot.allowedActions || []);
            updateDealButtonState();
        } else {
            refs.deal.disabled = true;
            refs.deal.classList.add("disabled");
            for (const button of actionButtons.values()) {
                button.disabled = true;
                button.classList.add("disabled");
            }
        }

        if (!isBusy) {
            maybeAutoDeal();
        }
    }

    function initTheme() {
        const savedTheme = localStorage.getItem("bj-theme");
        const initialTheme = savedTheme === "light" ? "light" : "dark";
        refs.theme.value = initialTheme;
        applyTheme(initialTheme, false);
    }

    function applyTheme(theme, persist) {
        const normalized = theme === "light" ? "light" : "dark";
        document.documentElement.setAttribute("data-bj-theme", normalized);
        if (persist) {
            localStorage.setItem("bj-theme", normalized);
        }
    }

    function showError(error) {
        appendLog(`Error: ${error.message || String(error)}`);
        renderLog();
    }

    function getValue(id) {
        return document.getElementById(id).value;
    }

    function isChecked(id) {
        return document.getElementById(id).checked;
    }

    function toInt(value, fallback) {
        const parsed = Number.parseInt(value, 10);
        return Number.isFinite(parsed) ? parsed : fallback;
    }

    function toFloat(value, fallback) {
        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    }

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function fmt(value) {
        return Number(value || 0).toFixed(2).replace(/\.00$/, "");
    }

    function updateDealButtonState() {
        if (!refs.deal) {
            return;
        }

        const enabled = Boolean(snapshot) && canDeal(snapshot.phase) && !requestInFlight;
        refs.deal.disabled = !enabled;
        refs.deal.classList.toggle("disabled", !enabled);
    }

    function formatCurrency(value) {
        return `\u20AC${fmt(value)}`;
    }

    function resolveBankrollUnits(currentSnapshot) {
        const bankroll = firstFiniteNumber(
            currentSnapshot?.bankrollUnits,
            currentSnapshot?.BankrollUnits);

        if (bankroll !== null) {
            return bankroll;
        }

        if (refs.bankrollInput) {
            return toFloat(refs.bankrollInput.value, 0);
        }

        return 0;
    }

    function updateBetLabel(bankrollUnits) {
        if (!refs.betLabel) {
            return;
        }

        refs.betLabel.textContent = `Bet (\u20AC | Bank ${formatCurrency(bankrollUnits)})`;
    }

    function syncBetLabelFromBankrollInput() {
        if (!refs.bankrollInput) {
            return;
        }

        updateBetLabel(toFloat(refs.bankrollInput.value, 0));
    }

    function firstFiniteNumber(...values) {
        for (const value of values) {
            const n = Number(value);
            if (Number.isFinite(n)) {
                return n;
            }
        }

        return null;
    }

    function normalizeSnapshotPayload(payload) {
        if (!payload || typeof payload !== "object") {
            return payload;
        }

        const gameId = fromApi(payload, "gameId");
        if (gameId == null) {
            return payload;
        }

        return {
            gameId: String(gameId),
            mode: fromApi(payload, "mode") || "Guided",
            phase: fromApi(payload, "phase") || "WaitingForBet",
            rules: fromApi(payload, "rules") || {},
            betSpread: toInt(fromApi(payload, "betSpread"), 8),
            bankrollUnits: toFloat(fromApi(payload, "bankrollUnits"), 0),
            runningCount: toInt(fromApi(payload, "runningCount"), 0),
            trueCount: toFloat(fromApi(payload, "trueCount"), 0),
            trueCountFloor: toInt(fromApi(payload, "trueCountFloor"), 0),
            showRunningCount: Boolean(fromApi(payload, "showRunningCount")),
            showTrueCount: Boolean(fromApi(payload, "showTrueCount")),
            showShoeDepth: Boolean(fromApi(payload, "showShoeDepth")),
            showHints: Boolean(fromApi(payload, "showHints")),
            reshufflePending: Boolean(fromApi(payload, "reshufflePending")),
            shoeDepth: normalizeShoeDepth(fromApi(payload, "shoeDepth")),
            dealer: normalizeDealerView(fromApi(payload, "dealer")),
            playerHands: normalizeHandViews(fromApi(payload, "playerHands")),
            allowedActions: normalizeActions(fromApi(payload, "allowedActions")),
            hint: normalizeHint(fromApi(payload, "hint")),
            feedback: normalizeStringArray(fromApi(payload, "feedback")),
            stats: normalizeStats(fromApi(payload, "stats")),
            history: normalizeHistory(fromApi(payload, "history"))
        };
    }

    function normalizeShoeDepth(value) {
        const depth = value && typeof value === "object" ? value : {};
        return {
            cardsRemaining: toInt(fromApi(depth, "cardsRemaining"), 0),
            cardsDealt: toInt(fromApi(depth, "cardsDealt"), 0),
            discardCount: toInt(fromApi(depth, "discardCount"), 0),
            totalCards: toInt(fromApi(depth, "totalCards"), 0),
            cutCardIndex: toInt(fromApi(depth, "cutCardIndex"), 0),
            cutReached: Boolean(fromApi(depth, "cutReached"))
        };
    }

    function normalizeDealerView(value) {
        const dealer = value && typeof value === "object" ? value : {};
        return {
            cards: normalizeCards(fromApi(dealer, "cards")),
            total: String(fromApi(dealer, "total") || "-")
        };
    }

    function normalizeHandViews(value) {
        if (!Array.isArray(value)) {
            return [];
        }

        return value.map(rawHand => {
            const hand = rawHand && typeof rawHand === "object" ? rawHand : {};
            return {
                cards: normalizeCards(fromApi(hand, "cards")),
                total: String(fromApi(hand, "total") || "-"),
                betUnits: toFloat(fromApi(hand, "betUnits"), 0),
                isActive: Boolean(fromApi(hand, "isActive")),
                isCompleted: Boolean(fromApi(hand, "isCompleted")),
                isDoubled: Boolean(fromApi(hand, "isDoubled")),
                isSurrendered: Boolean(fromApi(hand, "isSurrendered")),
                outcome: String(fromApi(hand, "outcome") || ""),
                netUnits: toFloat(fromApi(hand, "netUnits"), 0)
            };
        });
    }

    function normalizeCards(value) {
        if (!Array.isArray(value)) {
            return [];
        }

        return value.map(rawCard => {
            const card = rawCard && typeof rawCard === "object" ? rawCard : {};
            return {
                label: String(fromApi(card, "label") || "?"),
                hidden: Boolean(fromApi(card, "hidden"))
            };
        });
    }

    function normalizeHint(value) {
        if (!value || typeof value !== "object") {
            return null;
        }

        return {
            basicAction: String(fromApi(value, "basicAction") || ""),
            recommendedAction: String(fromApi(value, "recommendedAction") || ""),
            deviation: Boolean(fromApi(value, "deviation")),
            reason: String(fromApi(value, "reason") || "")
        };
    }

    function normalizeStats(value) {
        const stats = value && typeof value === "object" ? value : {};
        return {
            roundsPlayed: toInt(fromApi(stats, "roundsPlayed"), 0),
            handsPlayed: toInt(fromApi(stats, "handsPlayed"), 0),
            basicAccuracy: toFloat(fromApi(stats, "basicAccuracy"), 0),
            deviationAccuracy: toFloat(fromApi(stats, "deviationAccuracy"), 0),
            betAccuracy: toFloat(fromApi(stats, "betAccuracy"), 0),
            runningCountAccuracy: toFloat(fromApi(stats, "runningCountAccuracy"), 0),
            trueCountAccuracy: toFloat(fromApi(stats, "trueCountAccuracy"), 0),
            approxEvLeakUnits: toFloat(fromApi(stats, "approxEvLeakUnits"), 0),
            mistakeBreakdown: normalizeNumberMap(fromApi(stats, "mistakeBreakdown"))
        };
    }

    function normalizeHistory(value) {
        if (!Array.isArray(value)) {
            return [];
        }

        return value.map(rawRow => {
            const row = rawRow && typeof rawRow === "object" ? rawRow : {};
            return {
                roundNumber: toInt(fromApi(row, "roundNumber"), 0),
                betUnits: toFloat(fromApi(row, "betUnits"), 0),
                netUnits: toFloat(fromApi(row, "netUnits"), 0),
                runningCountEnd: toInt(fromApi(row, "runningCountEnd"), 0),
                trueCountEnd: toFloat(fromApi(row, "trueCountEnd"), 0),
                outcome: String(fromApi(row, "outcome") || "-"),
                mistakes: normalizeStringArray(fromApi(row, "mistakes"))
            };
        });
    }

    function normalizeNumberMap(value) {
        if (!value || typeof value !== "object") {
            return {};
        }

        const map = {};
        for (const [key, raw] of Object.entries(value)) {
            map[key] = toInt(raw, 0);
        }

        return map;
    }

    function normalizeStringArray(value) {
        if (!Array.isArray(value)) {
            return [];
        }

        return value.map(item => String(item || ""));
    }

    function normalizeActions(value) {
        if (!Array.isArray(value)) {
            return [];
        }

        return value
            .map(normalizeActionToken)
            .filter(Boolean);
    }

    function buildActionReview(action) {
        if (!snapshot || !isPhase(snapshot.phase, "PlayerTurn")) {
            return null;
        }

        if (!snapshot.hint || !snapshot.showHints) {
            return null;
        }

        const playerAction = normalizeActionToken(action);
        const optimalAction = normalizeActionToken(snapshot.hint.recommendedAction);
        if (!playerAction || !optimalAction) {
            return null;
        }

        return {
            playerAction,
            optimalAction,
            playerLabel: formatActionLabel(playerAction),
            optimalLabel: formatActionLabel(optimalAction),
            correct: playerAction === optimalAction
        };
    }

    function normalizePhaseToken(phase) {
        if (typeof phase === "number" && phaseNames[phase]) {
            return phaseNames[phase];
        }

        if (typeof phase !== "string") {
            return "";
        }

        const normalized = phase.replace(/[\s_-]/g, "").toLowerCase();
        switch (normalized) {
            case "waitingforbet":
                return "WaitingForBet";
            case "offerinsurance":
                return "OfferInsurance";
            case "playerturn":
                return "PlayerTurn";
            case "dealerturn":
                return "DealerTurn";
            case "roundcomplete":
                return "RoundComplete";
            default:
                return "";
        }
    }

    function normalizeActionToken(action) {
        if (typeof action === "number" && actionNames[action]) {
            return actionNames[action];
        }

        if (typeof action !== "string") {
            return "";
        }

        const normalized = action.replace(/[\s_/-]/g, "").toLowerCase();
        switch (normalized) {
            case "hit":
                return "Hit";
            case "stand":
            case "hold":
                return "Stand";
            case "double":
                return "Double";
            case "split":
            case "half":
            case "12":
                return "Split";
            case "surrender":
                return "Surrender";
            case "insurancetake":
            case "takeinsurance":
                return "InsuranceTake";
            case "insuranceskip":
            case "skipinsurance":
                return "InsuranceSkip";
            default:
                return "";
        }
    }

    function formatActionLabel(action) {
        switch (normalizeActionToken(action)) {
            case "Hit":
                return "Hit";
            case "Stand":
                return "Hold";
            case "Double":
                return "Double";
            case "Split":
                return "Split (1/2)";
            case "Surrender":
                return "Surrender";
            case "InsuranceTake":
                return "Take Insurance";
            case "InsuranceSkip":
                return "Skip Insurance";
            default:
                return action ? String(action) : "-";
        }
    }

    function isPhase(phase, expectedPhase) {
        return normalizePhaseToken(phase) === expectedPhase;
    }

    function fromApi(source, camelName) {
        if (!source || typeof source !== "object") {
            return undefined;
        }

        if (Object.prototype.hasOwnProperty.call(source, camelName)) {
            return source[camelName];
        }

        const pascalName = camelName.charAt(0).toUpperCase() + camelName.slice(1);
        if (Object.prototype.hasOwnProperty.call(source, pascalName)) {
            return source[pascalName];
        }

        return undefined;
    }

    function updateLobbyResult(latest) {
        if (!refs.lobbyLabel) {
            return;
        }

        refs.lobbyLabel.classList.remove("bj-lobby-neutral", "bj-lobby-win", "bj-lobby-loss");

        const netUnits = latest ? Number(latest.netUnits) : 0;
        if (!latest || !Number.isFinite(netUnits) || netUnits === 0) {
            refs.lobbyLabel.classList.add("bj-lobby-neutral");
            return;
        }

        refs.lobbyLabel.classList.add(netUnits > 0 ? "bj-lobby-win" : "bj-lobby-loss");
    }
})();
