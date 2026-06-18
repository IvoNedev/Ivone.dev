(() => {
    const root = document.querySelector("[data-reddit-root]");
    if (!root) { return; }

    const $ = id => document.getElementById(id);
    const dom = {
        enText: $("enText"), bgText: $("bgText"),
        sampleBtn: $("sampleBtn"), parseBtn: $("parseBtn"), startBtn: $("startBtn"),
        setup: $("setup"), align: $("align"), alignStatus: $("alignStatus"),
        enWords: $("enWords"), bgWords: $("bgWords"),
        stage: $("stage"), enScroll: $("enScroll"), bgScroll: $("bgScroll"),
        enInner: $("enInner"), bgInner: $("bgInner"),
        countdown: $("countdown"), countNum: $("countNum"),
        playPauseBtn: $("playPauseBtn"), restartBtn: $("restartBtn"),
        wpm: $("wpm"), wpmVal: $("wpmVal"), fontSize: $("fontSize"),
        fsBtn: $("fsBtn"), editBtn: $("editBtn")
    };

    const FOCUS = 0.42; // where on the column the "currently read" word sits (for sync + highlight)

    const state = {
        tokens: { en: [], bg: [] },   // [{ w, br }]  br = starts a new paragraph
        marks: { en: new Set(), bg: new Set() }, // word indices pinned as sync anchors
        cp: { en: [], bg: [] },        // scroll checkpoints per anchor boundary
        wordTops: { en: [], bg: [] },  // offsetTop of every word (stage) for highlight
        wordEls: { en: [], bg: [] },
        activeIdx: { en: -1, bg: -1 },
        cumW: [],
        totalW: 0,
        wordsRead: 0,
        running: false,
        finished: false,
        raf: 0,
        lastTs: 0
    };

    /* ---------- tokenize ---------- */
    function tokenize(text) {
        const paras = (text || "").replace(/\r/g, "").trim().split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
        const tokens = [];
        paras.forEach((para, pi) => {
            para.split(/\s+/).filter(Boolean).forEach((w, wi) => tokens.push({ w, br: pi > 0 && wi === 0 }));
        });
        return tokens;
    }

    function escapeHtml(v) {
        return String(v).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
    }

    const lerp = (a, b, t) => a + (b - a) * t;

    /* ---------- word rendering ---------- */
    function wordsHtml(tokens, { marks = null } = {}) {
        const order = marks ? [...marks].sort((a, b) => a - b) : [];
        let html = "";
        tokens.forEach((t, i) => {
            if (t.br) { html += '<span class="rp-break"></span>'; }
            const marked = marks && marks.has(i);
            const n = marked ? `<sup class="rp-word__n">${order.indexOf(i) + 1}</sup>` : "";
            html += `<span class="rp-word${marked ? " is-anchor" : ""}" data-i="${i}">${escapeHtml(t.w)}${n}</span> `;
        });
        return html;
    }

    function renderWordbox(side) {
        const mount = side === "en" ? dom.enWords : dom.bgWords;
        mount.innerHTML = wordsHtml(state.tokens[side], { marks: state.marks[side] });
    }

    /* ---------- parse + align ---------- */
    function parse() {
        state.tokens.en = tokenize(dom.enText.value);
        state.tokens.bg = tokenize(dom.bgText.value);
        state.marks.en.clear();
        state.marks.bg.clear();

        if (!state.tokens.en.length || !state.tokens.bg.length) {
            dom.align.hidden = true;
            dom.startBtn.disabled = true;
            return;
        }
        renderWordbox("en");
        renderWordbox("bg");
        dom.align.hidden = false;
        updateAlign();
        dom.align.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    function toggleMark(side, i) {
        if (i === 0) { return; } // start is already a boundary
        const marks = state.marks[side];
        if (marks.has(i)) { marks.delete(i); } else { marks.add(i); }
        renderWordbox(side);
        updateAlign();
    }

    function updateAlign() {
        const en = state.marks.en.size, bg = state.marks.bg.size;
        const ok = en === bg;
        dom.alignStatus.innerHTML =
            `Pins — EN <b>${en}</b> · BG <b>${bg}</b> ` +
            (ok ? `<span class="ok">✓ in sync (${en + 1} stretch${en ? "es" : ""})</span>`
                : `<span class="bad">✗ pin counts must match</span>`);
        dom.startBtn.disabled = !ok;
    }

    /* ---------- stage build ---------- */
    function boundaries(side) {
        return [0, ...[...state.marks[side]].filter(i => i > 0).sort((a, b) => a - b)];
    }

    function buildStage() {
        dom.enInner.innerHTML = wordsHtml(state.tokens.en);
        dom.bgInner.innerHTML = wordsHtml(state.tokens.bg);
        applyFont();
        requestAnimationFrame(() => {
            measure();
            computeWeights();
            resetPlayback();
        });
    }

    function readOffset(side) {
        return (side === "en" ? dom.enScroll : dom.bgScroll).clientHeight * FOCUS;
    }

    function applyFont() {
        const px = `${dom.fontSize.value}px`;
        [dom.enInner, dom.bgInner].forEach(inner => {
            inner.style.setProperty("--rp-font", px);
            const scroll = inner.parentElement;
            inner.style.paddingTop = `${scroll.clientHeight * FOCUS}px`;
            inner.style.paddingBottom = `${scroll.clientHeight * (1 - FOCUS)}px`;
        });
    }

    function measure() {
        ["en", "bg"].forEach(side => {
            const inner = side === "en" ? dom.enInner : dom.bgInner;
            const off = readOffset(side);
            const els = [...inner.querySelectorAll(".rp-word")];
            state.wordEls[side] = els;
            state.wordTops[side] = els.map(el => el.offsetTop);
            const bounds = boundaries(side);
            const cp = bounds.map(idx => Math.max(0, (els[idx]?.offsetTop || 0) - off));
            const last = els[els.length - 1];
            cp.push(Math.max(0, (last ? last.offsetTop + last.offsetHeight : 0) - off));
            state.cp[side] = cp;
            state.activeIdx[side] = -1;
        });
    }

    function computeWeights() {
        const bEn = boundaries("en");
        const bBg = boundaries("bg");
        const blocks = Math.min(bEn.length, bBg.length);
        const wordsIn = (bounds, total, b) => (b + 1 < bounds.length ? bounds[b + 1] : total) - bounds[b];
        const cum = [0];
        for (let b = 0; b < blocks; b++) {
            const weight = Math.max(1,
                wordsIn(bEn, state.tokens.en.length, b),
                wordsIn(bBg, state.tokens.bg.length, b));
            cum.push(cum[b] + weight);
        }
        state.cumW = cum;
        state.totalW = cum[cum.length - 1];
    }

    /* ---------- playback ---------- */
    function positionFor(wordsRead) {
        const cum = state.cumW;
        const blocks = cum.length - 1;
        let b = 0;
        while (b < blocks - 1 && wordsRead >= cum[b + 1]) { b++; }
        const span = cum[b + 1] - cum[b] || 1;
        const localT = Math.max(0, Math.min(1, (wordsRead - cum[b]) / span));
        return { b, localT };
    }

    function applyScroll() {
        const { b, localT } = positionFor(state.wordsRead);
        ["en", "bg"].forEach(side => {
            const cp = state.cp[side];
            if (!cp.length) { return; }
            const i = Math.min(b, cp.length - 2);
            const top = lerp(cp[i], cp[i + 1], localT);
            const inner = side === "en" ? dom.enInner : dom.bgInner;
            inner.style.transform = `translateY(${-top}px)`;
            highlight(side, top);
        });
    }

    function highlight(side, top) {
        const tops = state.wordTops[side];
        if (!tops.length) { return; }
        const mark = top + readOffset(side);
        // last word whose top is at or above the focus line
        let lo = 0, hi = tops.length - 1, idx = 0;
        while (lo <= hi) {
            const mid = (lo + hi) >> 1;
            if (tops[mid] <= mark) { idx = mid; lo = mid + 1; } else { hi = mid - 1; }
        }
        if (idx === state.activeIdx[side]) { return; }
        const els = state.wordEls[side];
        els[state.activeIdx[side]]?.classList.remove("is-read");
        els[idx]?.classList.add("is-read");
        state.activeIdx[side] = idx;
    }

    function loop(ts) {
        if (!state.running) { return; }
        const dt = state.lastTs ? (ts - state.lastTs) / 1000 : 0;
        state.lastTs = ts;
        state.wordsRead += dt * (Number(dom.wpm.value) / 60);
        if (state.wordsRead >= state.totalW) {
            state.wordsRead = state.totalW;
            applyScroll();
            stopPlayback(true);
            return;
        }
        applyScroll();
        state.raf = requestAnimationFrame(loop);
    }

    function startLoop() {
        if (state.running) { return; }
        if (state.finished) { state.wordsRead = 0; state.finished = false; }
        state.running = true;
        state.lastTs = 0;
        dom.playPauseBtn.textContent = "Pause";
        state.raf = requestAnimationFrame(loop);
    }

    function stopPlayback(finished) {
        state.running = false;
        cancelAnimationFrame(state.raf);
        state.finished = !!finished;
        dom.playPauseBtn.textContent = finished ? "Replay" : "Resume";
    }

    function resetPlayback() {
        state.wordsRead = 0;
        state.finished = false;
        applyScroll();
    }

    /* ---------- views ---------- */
    function start() {
        if (dom.startBtn.disabled) { return; }
        dom.setup.hidden = true;
        dom.stage.hidden = false;
        root.classList.add("is-stage");
        buildStage();
        countdownThen(startLoop);
    }

    function countdownThen(cb) {
        let n = 3;
        dom.countNum.textContent = n;
        dom.countdown.hidden = false;
        const tick = () => {
            n -= 1;
            if (n <= 0) { dom.countdown.hidden = true; cb(); return; }
            dom.countNum.textContent = n;
            setTimeout(tick, 700);
        };
        setTimeout(tick, 700);
    }

    function edit() {
        stopPlayback(false);
        root.classList.remove("is-stage");
        dom.stage.hidden = true;
        dom.setup.hidden = false;
    }

    /* ---------- events ---------- */
    dom.parseBtn.addEventListener("click", parse);
    dom.startBtn.addEventListener("click", start);

    dom.enWords.addEventListener("click", e => {
        const w = e.target.closest(".rp-word");
        if (w) { toggleMark("en", Number(w.dataset.i)); }
    });
    dom.bgWords.addEventListener("click", e => {
        const w = e.target.closest(".rp-word");
        if (w) { toggleMark("bg", Number(w.dataset.i)); }
    });

    dom.playPauseBtn.addEventListener("click", () => {
        state.running ? stopPlayback(false) : startLoop();
    });
    dom.restartBtn.addEventListener("click", () => {
        stopPlayback(false);
        resetPlayback();
        countdownThen(startLoop);
    });
    dom.editBtn.addEventListener("click", edit);

    dom.wpm.addEventListener("input", () => { dom.wpmVal.textContent = dom.wpm.value; });
    dom.fontSize.addEventListener("input", () => {
        if (dom.stage.hidden) { return; }
        applyFont();
        requestAnimationFrame(() => { measure(); applyScroll(); });
    });

    dom.fsBtn.addEventListener("click", () => {
        if (!document.fullscreenElement) { root.requestFullscreen?.(); }
        else { document.exitFullscreen?.(); }
    });

    let resizeTimer = 0;
    window.addEventListener("resize", () => {
        if (dom.stage.hidden) { return; }
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => { applyFont(); measure(); applyScroll(); }, 120);
    });

    document.addEventListener("keydown", e => {
        if (dom.stage.hidden) { return; }
        if (e.code === "Space") { e.preventDefault(); state.running ? stopPlayback(false) : startLoop(); }
        if (e.key === "Escape") { edit(); }
    });

    dom.sampleBtn.addEventListener("click", () => {
        dom.enText.value = SAMPLE_EN;
        dom.bgText.value = SAMPLE_BG;
        parse();
    });

    /* ---------- sample texts (single wall of text each) ---------- */
    const SAMPLE_EN =
        "My grandmother always told me never to answer the door after midnight. She never explained why, and I never thought to ask. " +
        "I was twelve the first time I broke that rule. The house was quiet, and the clock in the hall had just struck twelve. " +
        "The knock came slow and patient, three taps, then silence, as if whoever stood outside had all the time in the world. " +
        "When I finally looked through the window, there was no one on the step, but the porch light was swinging and the night was completely still.";

    const SAMPLE_BG =
        "Баба ми винаги ми казваше никога да не отварям вратата след полунощ. Никога не обясни защо, а аз така и не се сетих да попитам. " +
        "Бях на дванадесет, когато за пръв път наруших това правило. Къщата беше тиха, а часовникът в коридора току-що беше ударил дванадесет. " +
        "Чукането дойде бавно и търпеливо, три почуквания, после тишина, сякаш този отвън разполагаше с цялото време на света. " +
        "Когато най-после погледнах през прозореца, нямаше никого на стъпалото, но лампата на верандата се люлееше, а нощта беше напълно неподвижна.";
})();
