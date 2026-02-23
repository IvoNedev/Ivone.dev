(() => {
    const container = document.querySelector('[data-helperx]');
    if (!container) return;

    const manifestUrl = container.dataset.manifestUrl;
    const basePath = container.dataset.basePath || '/HelperX/Definitive';

    const statusEl = document.getElementById('helperxStatus');
    const output = document.getElementById('markdownOutput');
    const outputBody = document.getElementById('markdownBody');
    const themeToggle = document.getElementById('themeToggle');
    const themeLabel = document.getElementById('themeLabel');
    const root = document.documentElement;
    const tabsNav = document.getElementById('tabsNav');
    const tabsPanel = document.getElementById('tabsPanel');
    const tabsLayout = document.getElementById('tabsLayout');
    const tabsCollapseBtn = document.getElementById('tabsCollapseBtn');
    const searchInput = document.getElementById('helperxSearch');
    const searchResults = document.getElementById('helperxSearchResults');
    const nextButton = document.getElementById('helperxNextBtn');

    const completionKey = 'helperx-completion';
    const tabsCollapsedKey = 'helperx-tabs-collapsed';
    const state = { phases: [], activeTab: '', activeReadme: null };
    const markdownCache = new Map();
    let searchTimer = null;
    let searchToken = 0;
    let isLoading = false;
    let completion = {};

    const setStatus = (message, type = 'info') => {
        statusEl.textContent = message;
        if (type === 'info') {
            statusEl.removeAttribute('data-status');
            return;
        }
        statusEl.dataset.status = type;
    };

    const setLoading = (value) => {
        isLoading = value;
        output.setAttribute('aria-busy', value ? 'true' : 'false');
    };

    const clearOutput = () => {
        outputBody.innerHTML = '';
        output.classList.remove('is-loaded');
    };

    const escapeSelector = (value) => {
        if (window.CSS && CSS.escape) {
            return CSS.escape(value);
        }
        return value.replace(/"/g, '\\"');
    };

    const getCompletionKey = (phase, readme) => `${phase}/${readme}`;

    const loadCompletion = () => {
        try {
            const stored = localStorage.getItem(completionKey);
            completion = stored ? JSON.parse(stored) : {};
        } catch (error) {
            completion = {};
        }
    };

    const saveCompletion = () => {
        localStorage.setItem(completionKey, JSON.stringify(completion));
    };

    const isCompleted = (key) => Boolean(completion[key]);

    const syncCompletionUIForKey = (key, checked) => {
        const selectorKey = escapeSelector(key);
        document.querySelectorAll(`[data-item-key="${selectorKey}"]`).forEach((element) => {
            if (element instanceof HTMLInputElement && element.type === 'checkbox') {
                element.checked = checked;
                return;
            }
            element.classList.toggle('is-done', checked);
        });

        document.querySelectorAll(`[data-status-for="${selectorKey}"]`).forEach((element) => {
            element.textContent = checked ? 'Done' : 'Pending';
        });
    };

    const updateProgress = (phaseName) => {
        const phase = state.phases.find((item) => item.name === phaseName);
        if (!phase) return;
        const total = phase.readmes.length;
        const done = phase.readmes.filter((readme) => isCompleted(getCompletionKey(phaseName, readme))).length;
        const progressText = `${done}/${total} done`;
        const selectorPhase = escapeSelector(phaseName);
        document.querySelectorAll(`[data-progress-for="${selectorPhase}"]`).forEach((element) => {
            element.textContent = progressText;
        });
    };

    const updateAllProgress = () => {
        state.phases.forEach((phase) => updateProgress(phase.name));
    };

    const buildReadmeRow = (phaseName, readmeName) => {
        const key = getCompletionKey(phaseName, readmeName);
        const done = isCompleted(key);

        const row = document.createElement('div');
        row.className = 'hx-readme';
        row.dataset.itemKey = key;

        const label = document.createElement('label');
        label.className = 'hx-readme__label';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'hx-readme__check';
        checkbox.dataset.itemKey = key;
        checkbox.dataset.phase = phaseName;
        checkbox.dataset.readme = readmeName;
        checkbox.checked = done;

        const name = document.createElement('span');
        name.textContent = readmeName;

        const status = document.createElement('span');
        status.className = 'hx-readme__status';
        status.dataset.statusFor = key;
        status.textContent = done ? 'Done' : 'Pending';

        label.appendChild(checkbox);
        label.appendChild(name);
        label.appendChild(status);

        const loadButton = document.createElement('button');
        loadButton.type = 'button';
        loadButton.className = 'helperx__button hx-readme__load';
        loadButton.textContent = 'Load';
        loadButton.dataset.phase = phaseName;
        loadButton.dataset.readme = readmeName;

        row.appendChild(label);
        row.appendChild(loadButton);

        row.classList.toggle('is-done', done);
        return row;
    };

    const buildReadmeList = (phaseName, readmes) => {
        const list = document.createElement('div');
        list.className = 'hx-readme-list';
        if (!readmes.length) {
            const empty = document.createElement('div');
            empty.className = 'helperx__note';
            empty.textContent = 'No readmes found for this tab.';
            list.appendChild(empty);
            return list;
        }
        readmes.forEach((readme) => {
            list.appendChild(buildReadmeRow(phaseName, readme));
        });
        return list;
    };

    const buildSearchRow = (phaseName, readmeName) => {
        const row = document.createElement('div');
        row.className = 'hx-search-item';

        const info = document.createElement('div');
        info.className = 'hx-search-item__info';

        const name = document.createElement('span');
        name.className = 'hx-search-item__name';
        name.textContent = readmeName;

        const phase = document.createElement('span');
        phase.className = 'hx-search-item__phase';
        phase.textContent = phaseName;

        info.appendChild(name);
        info.appendChild(phase);

        const loadButton = document.createElement('button');
        loadButton.type = 'button';
        loadButton.className = 'helperx__button hx-readme__load hx-search-item__load';
        loadButton.textContent = 'Load';
        loadButton.dataset.phase = phaseName;
        loadButton.dataset.readme = readmeName;

        row.appendChild(info);
        row.appendChild(loadButton);

        return row;
    };

    const renderSearchMessage = (message) => {
        if (!searchResults) return;
        searchResults.innerHTML = '';
        const note = document.createElement('div');
        note.className = 'helperx__note';
        note.textContent = message;
        searchResults.appendChild(note);
    };

    const renderSearchResults = (matches, query) => {
        if (!searchResults) return;
        searchResults.innerHTML = '';

        if (!query) {
            renderSearchMessage('Type a keyword to search across readmes.');
            return;
        }

        if (!matches.length) {
            renderSearchMessage(`No matches for "${query}".`);
            return;
        }

        const summary = document.createElement('div');
        summary.className = 'helperx__note';
        summary.textContent = `${matches.length} ${matches.length === 1 ? 'match' : 'matches'} for "${query}".`;
        searchResults.appendChild(summary);

        const list = document.createElement('div');
        list.className = 'hx-search-list';
        matches.forEach((item) => {
            list.appendChild(buildSearchRow(item.phase, item.readme));
        });
        searchResults.appendChild(list);
    };

    const getAllReadmeItems = () =>
        state.phases.flatMap((phase) =>
            phase.readmes.map((readme) => ({
                phase: phase.name,
                readme
            }))
        );

    const getReadmeContent = async (phase, readme) => {
        const key = getCompletionKey(phase, readme);
        if (markdownCache.has(key)) {
            return markdownCache.get(key);
        }
        const url = `${basePath}/${encodeURIComponent(phase)}/${encodeURIComponent(readme)}`;
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) {
            throw new Error('Markdown fetch failed');
        }
        const markdown = await response.text();
        markdownCache.set(key, markdown);
        return markdown;
    };

    const runSearch = async (query) => {
        const normalized = query.trim().toLowerCase();
        if (!normalized) {
            renderSearchResults([], '');
            return;
        }

        const token = (searchToken += 1);
        renderSearchMessage('Searching readmes...');

        const items = getAllReadmeItems();
        const matches = [];

        for (const item of items) {
            try {
                const content = await getReadmeContent(item.phase, item.readme);
                if (searchToken !== token) {
                    return;
                }
                if (content.toLowerCase().includes(normalized)) {
                    matches.push(item);
                }
            } catch (error) {
                if (searchToken !== token) {
                    return;
                }
            }
        }

        if (searchToken !== token) {
            return;
        }
        renderSearchResults(matches, query.trim());
    };

    const applyManifest = (data) => {
        const rawPhases = data?.phases || data?.Phases || [];
        const rawOrchestrators = data?.orchestrators || data?.Orchestrators || [];

        const phases = rawPhases
            .map((phase) => ({
                name: phase.name || phase.Name || '',
                readmes: phase.readmes || phase.Readmes || []
            }))
            .filter((phase) => phase.name);

        const hasOrchestrators = Array.isArray(rawOrchestrators);
        const orchestrators = hasOrchestrators
            ? rawOrchestrators.filter((name) => name && typeof name === 'string')
            : [];

        if (hasOrchestrators) {
            phases.push({
                name: 'Orchestrators',
                readmes: orchestrators
            });
        }

        state.phases = phases;

        if (state.phases.length === 0) {
            setStatus('No readme folders found. Add folders like Phase0 or Orchestrators under wwwroot/HelperX/Definitive.', 'error');
            return;
        }

        if (!state.phases.some((phase) => phase.name === state.activeTab)) {
            state.activeTab = state.phases[0].name;
        }

        renderTabs();
        updateAllProgress();
        updateNextButton();
        renderSearchResults([], searchInput?.value ?? '');
        setStatus('Readme folders loaded. Pick a tab to load markdown.', 'success');
    };

    const loadManifest = async () => {
        if (!manifestUrl) {
            setStatus('Manifest endpoint not configured.', 'error');
            return;
        }

        try {
            const response = await fetch(manifestUrl, { cache: 'no-store' });
            if (!response.ok) {
                throw new Error('Manifest fetch failed');
            }
            const data = await response.json();
            applyManifest(data);
        } catch (error) {
            setStatus('Could not load readme folders. Check the HelperX directory.', 'error');
        }
    };

    const loadMarkdownFor = async (phase, readme) => {
        if (!window.marked || !window.DOMPurify) {
            setStatus('Markdown renderer is not available.', 'error');
            return;
        }

        const url = `${basePath}/${encodeURIComponent(phase)}/${encodeURIComponent(readme)}`;
        setActiveTab(phase);
        state.activeReadme = { phase, readme };
        setLoading(true);
        clearOutput();
        setStatus('Loading markdown...', 'info');

        try {
            const response = await fetch(url, { cache: 'no-store' });
            if (!response.ok) {
                throw new Error('Markdown fetch failed');
            }
            const markdown = await response.text();
            markdownCache.set(getCompletionKey(phase, readme), markdown);
            const rendered = marked.parse(markdown, { gfm: true, breaks: false });
            outputBody.innerHTML = DOMPurify.sanitize(rendered);
            output.classList.add('is-loaded');
            setStatus(`Loaded ${phase}/${readme}.`, 'success');
        } catch (error) {
            setStatus('Could not load the markdown file. Verify the file exists.', 'error');
        } finally {
            setLoading(false);
            updateNextButton();
        }
    };

    const renderTabs = () => {
        tabsNav.innerHTML = '';
        tabsPanel.innerHTML = '';

        state.phases.forEach((phase) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'hx-tab' + (phase.name === state.activeTab ? ' is-active' : '');
            button.dataset.phase = phase.name;

            const label = document.createElement('span');
            label.textContent = phase.name;

            const progress = document.createElement('span');
            progress.className = 'hx-tab__progress';
            progress.dataset.progressFor = phase.name;

            button.appendChild(label);
            button.appendChild(progress);
            tabsNav.appendChild(button);
        });

        const activePhase = state.phases.find((phase) => phase.name === state.activeTab) ?? state.phases[0];
        if (activePhase) {
            state.activeTab = activePhase.name;
            tabsPanel.appendChild(buildReadmeList(activePhase.name, activePhase.readmes));
        }
        updateAllProgress();
        updateNextButton();
    };

    const setActiveTab = (phaseName) => {
        if (!phaseName || phaseName === state.activeTab) {
            return;
        }
        state.activeTab = phaseName;
        renderTabs();
    };

    const getNextReadme = (phaseName, readmeName) => {
        if (!phaseName || !readmeName) return null;
        const phaseIndex = state.phases.findIndex((phase) => phase.name === phaseName);
        if (phaseIndex < 0) return null;
        const phase = state.phases[phaseIndex];
        const readmeIndex = phase.readmes.findIndex((name) => name === readmeName);
        if (readmeIndex < 0) return null;

        if (readmeIndex < phase.readmes.length - 1) {
            return { phase: phaseName, readme: phase.readmes[readmeIndex + 1] };
        }

        for (let i = phaseIndex + 1; i < state.phases.length; i += 1) {
            const nextPhase = state.phases[i];
            if (nextPhase.readmes.length) {
                return { phase: nextPhase.name, readme: nextPhase.readmes[0] };
            }
        }

        return null;
    };

    const updateNextButton = () => {
        if (!nextButton) return;
        const activeReadme = state.activeReadme;
        const next = activeReadme ? getNextReadme(activeReadme.phase, activeReadme.readme) : null;
        nextButton.disabled = !next;
        if (!next) {
            nextButton.removeAttribute('data-phase');
            nextButton.removeAttribute('data-readme');
            nextButton.title = 'Load a readme to enable next.';
            return;
        }
        nextButton.dataset.phase = next.phase;
        nextButton.dataset.readme = next.readme;
        nextButton.title = `Next: ${next.phase}/${next.readme}`;
    };

    const handleCompletionChange = (checkbox) => {
        const key = checkbox.dataset.itemKey;
        if (!key) return;
        if (checkbox.checked) {
            completion[key] = true;
        } else {
            delete completion[key];
        }
        saveCompletion();
        syncCompletionUIForKey(key, checkbox.checked);
        if (checkbox.dataset.phase) {
            updateProgress(checkbox.dataset.phase);
        }
    };

    const applyTheme = (theme) => {
        root.dataset.theme = theme;
        themeToggle.checked = theme === 'light';
        themeLabel.textContent = theme === 'light' ? 'Light mode' : 'Dark mode';
        localStorage.setItem('helperx-theme', theme);
    };

    const initTheme = () => {
        const stored = localStorage.getItem('helperx-theme');
        if (stored) {
            applyTheme(stored);
            return;
        }
        const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
        applyTheme(prefersLight ? 'light' : 'dark');
    };

    const setTabsCollapsed = (collapsed) => {
        if (!tabsLayout || !tabsCollapseBtn) return;
        tabsLayout.classList.toggle('is-collapsed', collapsed);
        tabsCollapseBtn.textContent = collapsed ? 'Expand' : 'Collapse';
        tabsCollapseBtn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
        localStorage.setItem(tabsCollapsedKey, collapsed ? '1' : '0');
    };

    const initTabsCollapse = () => {
        if (!tabsLayout || !tabsCollapseBtn) return;
        const stored = localStorage.getItem(tabsCollapsedKey);
        setTabsCollapsed(stored === '1');
    };

    tabsNav.addEventListener('click', (event) => {
        const button = event.target.closest('.hx-tab');
        if (!button) return;
        const phaseName = button.dataset.phase;
        if (!phaseName) return;
        setActiveTab(phaseName);
    });

    document.addEventListener('change', (event) => {
        const checkbox = event.target.closest('.hx-readme__check');
        if (!checkbox) return;
        handleCompletionChange(checkbox);
    });

    document.addEventListener('click', (event) => {
        const button = event.target.closest('.hx-readme__load');
        if (!button) return;
        const phase = button.dataset.phase;
        const readme = button.dataset.readme;
        if (phase && readme) {
            setActiveTab(phase);
            loadMarkdownFor(phase, readme);
        }
    });

    if (nextButton) {
        nextButton.addEventListener('click', () => {
            const phase = nextButton.dataset.phase;
            const readme = nextButton.dataset.readme;
            if (phase && readme) {
                loadMarkdownFor(phase, readme);
            }
        });
    }

    if (tabsCollapseBtn) {
        tabsCollapseBtn.addEventListener('click', () => {
            const collapsed = tabsLayout?.classList.contains('is-collapsed');
            setTabsCollapsed(!collapsed);
        });
    }

    if (searchInput) {
        renderSearchResults([], '');
        searchInput.addEventListener('input', () => {
            if (searchTimer) {
                window.clearTimeout(searchTimer);
            }
            searchTimer = window.setTimeout(() => runSearch(searchInput.value), 280);
        });
    }

    themeToggle.addEventListener('change', () => {
        applyTheme(themeToggle.checked ? 'light' : 'dark');
    });

    initTheme();
    initTabsCollapse();
    loadCompletion();
    loadManifest();
})();
