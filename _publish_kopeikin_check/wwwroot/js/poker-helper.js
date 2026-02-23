(function () {
    "use strict";

    const refs = {
        playerCount: document.getElementById("poker-player-count"),
        potSize: document.getElementById("poker-pot-size"),
        toCall: document.getElementById("poker-to-call"),
        iterations: document.getElementById("poker-iterations"),
        hero1: document.getElementById("poker-hero-1"),
        hero2: document.getElementById("poker-hero-2"),
        flop1: document.getElementById("poker-flop-1"),
        flop2: document.getElementById("poker-flop-2"),
        flop3: document.getElementById("poker-flop-3"),
        turn: document.getElementById("poker-turn"),
        river: document.getElementById("poker-river"),
        autoRun: document.getElementById("poker-auto-run"),
        run: document.getElementById("poker-run"),
        error: document.getElementById("poker-error"),
        meta: document.getElementById("poker-meta"),
        winPct: document.getElementById("poker-win-pct"),
        tiePct: document.getElementById("poker-tie-pct"),
        losePct: document.getElementById("poker-lose-pct"),
        equityPct: document.getElementById("poker-equity-pct"),
        potOddsPct: document.getElementById("poker-pot-odds-pct"),
        evCall: document.getElementById("poker-ev-call"),
        madeHand: document.getElementById("poker-made-hand"),
        outs: document.getElementById("poker-outs"),
        improveTurn: document.getElementById("poker-improve-turn"),
        improveRiver: document.getElementById("poker-improve-river"),
        recommendation: document.getElementById("poker-recommendation"),
        winBar: document.getElementById("poker-win-bar"),
        tieBar: document.getElementById("poker-tie-bar"),
        loseBar: document.getElementById("poker-lose-bar")
    };

    const cardSelects = [
        refs.hero1, refs.hero2,
        refs.flop1, refs.flop2, refs.flop3,
        refs.turn, refs.river
    ];

    let requestInFlight = false;
    let autoRunTimer = null;

    init();

    function init() {
        populateCardSelects();
        setDefaults();

        refs.run.addEventListener("click", () => {
            void simulate();
        });

        const autoInputs = [
            refs.playerCount,
            refs.potSize,
            refs.toCall,
            refs.iterations,
            refs.hero1,
            refs.hero2,
            refs.flop1,
            refs.flop2,
            refs.flop3,
            refs.turn,
            refs.river
        ];

        for (const input of autoInputs) {
            input.addEventListener("change", onUserInput);
            input.addEventListener("input", onUserInput);
        }

        void simulate();
    }

    function onUserInput() {
        clearError();
        if (!refs.autoRun.checked) {
            return;
        }

        if (autoRunTimer) {
            window.clearTimeout(autoRunTimer);
        }

        autoRunTimer = window.setTimeout(() => {
            autoRunTimer = null;
            void simulate();
        }, 220);
    }

    async function simulate() {
        if (requestInFlight) {
            return;
        }

        const payload = buildPayload();
        if (!payload) {
            return;
        }

        requestInFlight = true;
        refs.run.disabled = true;
        refs.meta.textContent = "Running simulation...";
        clearError();

        try {
            const response = await fetch("/api/poker/simulate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                let message = `Request failed (${response.status})`;
                try {
                    const problem = await response.json();
                    if (problem && problem.error) {
                        message = problem.error;
                    } else if (problem && problem.title) {
                        message = problem.title;
                    }
                } catch {
                    // ignored
                }
                throw new Error(message);
            }

            const result = await response.json();
            renderResult(result);
        } catch (error) {
            showError(error.message || String(error));
            refs.meta.textContent = "-";
        } finally {
            requestInFlight = false;
            refs.run.disabled = false;
        }
    }

    function buildPayload() {
        const heroCards = [refs.hero1.value, refs.hero2.value].filter(Boolean);
        if (heroCards.length !== 2) {
            showError("Select both hero cards.");
            return null;
        }

        const boardSlots = [refs.flop1.value, refs.flop2.value, refs.flop3.value, refs.turn.value, refs.river.value];
        const boardCards = [];
        let seenBlank = false;

        for (const card of boardSlots) {
            if (!card) {
                seenBlank = true;
                continue;
            }

            if (seenBlank) {
                showError("Board cards must be filled left-to-right without gaps.");
                return null;
            }

            boardCards.push(card);
        }

        if (!(boardCards.length === 0 || boardCards.length === 3 || boardCards.length === 4 || boardCards.length === 5)) {
            showError("Board cards must be 0, 3, 4, or 5.");
            return null;
        }

        const duplicate = findDuplicate(heroCards.concat(boardCards));
        if (duplicate) {
            showError(`Duplicate card selected: ${duplicate}`);
            return null;
        }

        const playerCount = toInt(refs.playerCount.value, 6);
        if (playerCount < 2 || playerCount > 10) {
            showError("Players must be between 2 and 10.");
            return null;
        }

        const potSize = toDecimalOrNull(refs.potSize.value);
        const toCall = toDecimalOrNull(refs.toCall.value);

        if ((potSize !== null && potSize < 0) || (toCall !== null && toCall < 0)) {
            showError("Pot size and to-call must be 0 or higher.");
            return null;
        }

        return {
            variant: "NLHE",
            playerCount,
            heroCards,
            boardCards,
            deadCards: [],
            potSize,
            toCall,
            iterations: toInt(refs.iterations.value, 50000),
            mode: "MonteCarlo"
        };
    }

    function renderResult(result) {
        refs.winPct.textContent = fmtPct(result.winPct);
        refs.tiePct.textContent = fmtPct(result.tiePct);
        refs.losePct.textContent = fmtPct(result.losePct);
        refs.equityPct.textContent = fmtPct(result.equityPct);
        refs.potOddsPct.textContent = fmtPct(result.potOddsPct);
        refs.evCall.textContent = fmtMoney(result.evCall);
        refs.madeHand.textContent = result.madeHand || "-";
        refs.outs.textContent = result.outs == null ? "-" : String(result.outs);
        refs.improveTurn.textContent = result.improveByTurnPct == null ? "-" : fmtPct(result.improveByTurnPct);
        refs.improveRiver.textContent = result.improveByRiverPct == null ? "-" : fmtPct(result.improveByRiverPct);
        refs.recommendation.textContent = result.recommendation || "-";

        refs.winBar.style.width = `${clampPercent(result.winPct)}%`;
        refs.tieBar.style.width = `${clampPercent(result.tiePct)}%`;
        refs.loseBar.style.width = `${clampPercent(result.losePct)}%`;

        const iterations = toInt(result.iterations, 0).toLocaleString();
        refs.meta.textContent = `${result.method || "MonteCarlo"} | ${iterations} iterations | ${toInt(result.runtimeMs, 0)} ms`;
    }

    function populateCardSelects() {
        const cards = buildCardOptionList();
        for (const select of cardSelects) {
            if (!select) {
                continue;
            }

            select.innerHTML = "";
            const empty = document.createElement("option");
            empty.value = "";
            empty.textContent = "-";
            select.appendChild(empty);

            for (const card of cards) {
                const option = document.createElement("option");
                option.value = card.value;
                option.textContent = card.label;
                select.appendChild(option);
            }
        }
    }

    function setDefaults() {
        refs.hero1.value = "As";
        refs.hero2.value = "Kd";
        refs.flop1.value = "";
        refs.flop2.value = "";
        refs.flop3.value = "";
        refs.turn.value = "";
        refs.river.value = "";
        refs.playerCount.value = "6";
        refs.iterations.value = "50000";
    }

    function buildCardOptionList() {
        const ranks = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];
        const suits = [
            { key: "s", symbol: "\u2660" },
            { key: "h", symbol: "\u2665" },
            { key: "d", symbol: "\u2666" },
            { key: "c", symbol: "\u2663" }
        ];

        const cards = [];
        for (const suit of suits) {
            for (const rank of ranks) {
                cards.push({
                    value: `${rank}${suit.key}`,
                    label: `${rank}${suit.symbol}`
                });
            }
        }

        return cards;
    }

    function findDuplicate(values) {
        const seen = new Set();
        for (const value of values) {
            if (seen.has(value)) {
                return value;
            }
            seen.add(value);
        }
        return null;
    }

    function toInt(value, fallback) {
        const n = Number.parseInt(String(value), 10);
        return Number.isFinite(n) ? n : fallback;
    }

    function toDecimalOrNull(value) {
        if (value == null || value === "") {
            return null;
        }

        const n = Number.parseFloat(String(value));
        return Number.isFinite(n) ? n : null;
    }

    function fmtPct(value) {
        const n = Number(value || 0);
        return `${n.toFixed(2)}%`;
    }

    function fmtMoney(value) {
        const n = Number(value || 0);
        return n.toFixed(2);
    }

    function clampPercent(value) {
        const n = Number(value || 0);
        return Math.max(0, Math.min(100, n));
    }

    function showError(message) {
        refs.error.textContent = message || "Unexpected error.";
    }

    function clearError() {
        refs.error.textContent = "";
    }
})();
