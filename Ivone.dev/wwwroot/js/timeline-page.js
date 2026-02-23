(() => {
    const query = new URLSearchParams(window.location.search);
    const timelineIdParam = query.get('timelineId') || query.get('id');
    const userId = Number.parseInt(query.get('userId') || '1', 10) || 1;
    const queryAdmin = query.get('admin');

    const timelineTitle = document.getElementById('timelineTitle');
    const timelineSubtitle = document.getElementById('timelineSubtitle');
    const backBtn = document.getElementById('backBtn');
    const adminToggle = document.getElementById('adminToggle');

    const timelineIndex = document.getElementById('timelineIndex');
    const timelineEditor = document.getElementById('timelineEditor');
    const entryBar = document.getElementById('timelineEntryBar');
    const timelineList = document.getElementById('timelineList');

    const createTimelineForm = document.getElementById('createTimelineForm');
    const timelineNameInput = document.getElementById('timelineNameInput');

    const timelineName = document.getElementById('timelineName');
    const timelineMeta = document.getElementById('timelineMeta');
    const timelineStatus = document.getElementById('timelineStatus');
    const timelineBlocks = document.getElementById('timelineBlocks');

    const eventForm = document.getElementById('eventForm');
    const eventTitle = document.getElementById('eventTitle');
    const eventDetails = document.getElementById('eventDetails');
    const eventUrl = document.getElementById('eventUrl');
    const eventMedia = document.getElementById('eventMedia');
    const datePrecision = document.getElementById('datePrecision');
    const eventYear = document.getElementById('eventYear');
    const eventMonth = document.getElementById('eventMonth');
    const eventDate = document.getElementById('eventDate');
    const eventDateTime = document.getElementById('eventDateTime');
    const submitEventBtn = document.getElementById('submitEventBtn');
    const deleteEventBtn = document.getElementById('deleteEventBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const dateInputs = Array.from(document.querySelectorAll('.date-input'));

    const iconMap = {
        picture: {
            className: 'cd-timeline__img--picture',
            src: 'https://cdn.jsdelivr.net/npm/vertical-timeline@2.0.0/assets/img/cd-icon-picture.svg',
            alt: 'Picture'
        },
        movie: {
            className: 'cd-timeline__img--movie',
            src: 'https://cdn.jsdelivr.net/npm/vertical-timeline@2.0.0/assets/img/cd-icon-movie.svg',
            alt: 'Media'
        },
        location: {
            className: 'cd-timeline__img--location',
            src: 'https://cdn.jsdelivr.net/npm/vertical-timeline@2.0.0/assets/img/cd-icon-location.svg',
            alt: 'Location'
        }
    };

    const state = {
        timelineId: timelineIdParam ? Number.parseInt(timelineIdParam, 10) : null,
        timeline: null,
        events: [],
        timelines: [],
        editingEventId: null,
        isAdmin: false
    };

    const setStatus = (message, tone = 'muted') => {
        if (!timelineStatus) return;
        timelineStatus.textContent = message || '';
        timelineStatus.style.color = tone === 'error' ? '#f97316' : '';
    };

    const buildUrl = (id = null) => {
        const params = new URLSearchParams();
        if (id) {
            params.set('timelineId', id.toString());
        }
        if (userId) {
            params.set('userId', userId.toString());
        }
        if (state.isAdmin) {
            params.set('admin', '1');
        }
        const base = window.location.pathname;
        const paramString = params.toString();
        return paramString ? `${base}?${paramString}` : base;
    };

    const setAdminState = (value) => {
        state.isAdmin = value;
        document.body.dataset.admin = value ? 'true' : 'false';
        if (adminToggle) {
            adminToggle.checked = value;
        }
        localStorage.setItem('timelineAdmin', value ? 'true' : 'false');
    };

    const syncDateInputs = () => {
        const precision = datePrecision.value;
        dateInputs.forEach((input) => {
            const matches = input.dataset.type === precision;
            input.classList.toggle('hidden', !matches);
        });
    };

    const parseMediaUrls = (value) => {
        if (!value) return [];
        if (Array.isArray(value)) return value;
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) return parsed.filter(Boolean);
        } catch {
            // fall through
        }
        return value
            .split(/\n|,/)
            .map((item) => item.trim())
            .filter(Boolean);
    };

    const formatMediaInput = (value) => {
        const urls = parseMediaUrls(value);
        return urls.join('\n');
    };

    const formatDateLabel = (event) => {
        const precision = (event.datePrecision || 'date').toLowerCase();
        const date = new Date(event.date);
        if (Number.isNaN(date.getTime())) return 'Unknown date';
        if (precision === 'year') {
            return `${date.getFullYear()}`;
        }
        if (precision === 'month') {
            return date.toLocaleString('en-GB', { month: 'long', year: 'numeric' });
        }
        const base = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        if (precision === 'datetime') {
            const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
            return `${base} @ ${time}`;
        }
        return base;
    };

    const getIcon = (event, index) => {
        const hasMedia = parseMediaUrls(event.mediaUrls).length > 0;
        if (hasMedia) return iconMap.picture;
        if (event.url) return iconMap.location;
        return index % 2 === 0 ? iconMap.movie : iconMap.picture;
    };

    const showIndexView = () => {
        timelineIndex.classList.remove('hidden');
        timelineEditor.classList.add('hidden');
        entryBar.classList.add('hidden');
        backBtn.classList.add('hidden');
        timelineTitle.textContent = 'Timelines';
        timelineSubtitle.textContent = 'Create, explore, and grow your stories.';
    };

    const showEditorView = () => {
        timelineIndex.classList.add('hidden');
        timelineEditor.classList.remove('hidden');
        entryBar.classList.remove('hidden');
        backBtn.classList.remove('hidden');
    };

    const resetForm = () => {
        state.editingEventId = null;
        eventTitle.value = '';
        eventDetails.value = '';
        eventUrl.value = '';
        eventMedia.value = '';
        datePrecision.value = 'date';
        syncDateInputs();
        const today = new Date();
        const pad = (value) => String(value).padStart(2, '0');
        eventDate.value = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
        eventMonth.value = '';
        eventYear.value = '';
        eventDateTime.value = '';
        submitEventBtn.textContent = 'Add entry';
        cancelEditBtn.classList.add('hidden');
        deleteEventBtn.classList.add('hidden');
    };

    const populateForm = (event) => {
        state.editingEventId = event.id;
        eventTitle.value = event.title || '';
        eventDetails.value = event.notes || '';
        eventUrl.value = event.url || '';
        eventMedia.value = formatMediaInput(event.mediaUrls || '');
        datePrecision.value = (event.datePrecision || 'date').toLowerCase();
        syncDateInputs();

        const date = new Date(event.date);
        const pad = (value) => String(value).padStart(2, '0');
        if (!Number.isNaN(date.getTime())) {
            eventYear.value = `${date.getFullYear()}`;
            eventMonth.value = `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
            eventDate.value = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
            eventDateTime.value = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
        }

        submitEventBtn.textContent = 'Update entry';
        cancelEditBtn.classList.remove('hidden');
        if (state.isAdmin) {
            deleteEventBtn.classList.remove('hidden');
        }
    };

    const buildDateValue = () => {
        const precision = datePrecision.value;
        if (precision === 'year') {
            if (!eventYear.value) return null;
            return new Date(Number(eventYear.value), 0, 1).toISOString();
        }
        if (precision === 'month') {
            if (!eventMonth.value) return null;
            const [year, month] = eventMonth.value.split('-').map(Number);
            return new Date(year, month - 1, 1).toISOString();
        }
        if (precision === 'datetime') {
            if (!eventDateTime.value) return null;
            return new Date(eventDateTime.value).toISOString();
        }
        if (!eventDate.value) return null;
        return new Date(`${eventDate.value}T00:00:00`).toISOString();
    };

    const fetchJson = async (url, options) => {
        const response = await fetch(url, options);
        if (!response.ok) {
            const message = await response.text();
            throw new Error(message || `Request failed: ${response.status}`);
        }
        if (response.status === 204) return null;
        const body = await response.text();
        if (!body) return null;
        return JSON.parse(body);
    };

    const renderTimeline = () => {
        timelineBlocks.innerHTML = '';
        if (!state.events.length) {
            const empty = document.createElement('div');
            empty.className = 'timeline-card';
            empty.textContent = 'No entries yet. Add the first moment below.';
            timelineBlocks.appendChild(empty);
            timelineMeta.textContent = '0 entries';
            return;
        }

        timelineMeta.textContent = `${state.events.length} entries`;
        state.events.forEach((event, index) => {
            const block = document.createElement('div');
            block.className = 'cd-timeline__block';

            const icon = getIcon(event, index);
            const imgWrap = document.createElement('div');
            imgWrap.className = `cd-timeline__img ${icon.className}`;
            const iconImg = document.createElement('img');
            iconImg.src = icon.src;
            iconImg.alt = icon.alt;
            imgWrap.appendChild(iconImg);

            const content = document.createElement('div');
            content.className = 'cd-timeline__content text-component';

            const title = document.createElement('h2');
            title.textContent = event.title || 'Untitled';
            content.appendChild(title);

            if (event.notes) {
                const details = document.createElement('p');
                details.className = 'color-contrast-medium';
                details.textContent = event.notes;
                content.appendChild(details);
            }

            if (event.url) {
                const link = document.createElement('a');
                link.href = event.url;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                link.textContent = 'Open link';
                link.className = 'color-inherit';
                content.appendChild(link);
            }

            const mediaUrls = parseMediaUrls(event.mediaUrls);
            if (mediaUrls.length) {
                const mediaWrap = document.createElement('div');
                mediaWrap.className = 'timeline-media';
                mediaUrls.forEach((url) => {
                    const img = document.createElement('img');
                    img.src = url;
                    img.alt = event.title || 'Timeline media';
                    img.loading = 'lazy';
                    mediaWrap.appendChild(img);
                });
                content.appendChild(mediaWrap);
            }

            const footer = document.createElement('div');
            footer.className = 'flex justify-between items-center';

            const date = document.createElement('span');
            date.className = 'cd-timeline__date';
            date.textContent = formatDateLabel(event);
            footer.appendChild(date);

            if (state.isAdmin) {
                const actions = document.createElement('div');
                actions.className = 'timeline-entry-actions admin-only';
                const editBtn = document.createElement('button');
                editBtn.type = 'button';
                editBtn.className = 'tl-btn';
                editBtn.textContent = 'Edit';
                editBtn.addEventListener('click', () => {
                    populateForm(event);
                    entryBar.scrollIntoView({ behavior: 'smooth', block: 'end' });
                });
                const deleteBtn = document.createElement('button');
                deleteBtn.type = 'button';
                deleteBtn.className = 'tl-btn';
                deleteBtn.textContent = 'Delete';
                deleteBtn.addEventListener('click', () => handleDelete(event));
                actions.appendChild(editBtn);
                actions.appendChild(deleteBtn);
                footer.appendChild(actions);
            }

            content.appendChild(footer);
            block.appendChild(imgWrap);
            block.appendChild(content);
            timelineBlocks.appendChild(block);
        });
    };

    const loadTimeline = async () => {
        if (!state.timelineId) return;
        showEditorView();
        setStatus('Loading timeline...');
        try {
            const timeline = await fetchJson(`/api/timeline/${state.timelineId}`);
            const events = await fetchJson(`/api/timeline/${state.timelineId}/events`);
            state.timeline = timeline;
            state.events = (events || []).sort((a, b) => new Date(a.date) - new Date(b.date));
            timelineTitle.textContent = timeline?.name || 'Timeline';
            timelineSubtitle.textContent = 'Your story, sorted and ready.';
            timelineName.textContent = timeline?.name || 'Timeline';
            renderTimeline();
            setStatus('');
            resetForm();
        } catch (error) {
            setStatus('Unable to load this timeline.', 'error');
        }
    };

    const loadTimelines = async () => {
        showIndexView();
        if (!timelineList) return;
        timelineList.innerHTML = '';
        try {
            const timelines = await fetchJson(`/api/timeline/user/${userId}`);
            state.timelines = timelines || [];
            if (!state.timelines.length) {
                const empty = document.createElement('div');
                empty.className = 'timeline-card';
                empty.textContent = 'No timelines yet. Create your first one.';
                timelineList.appendChild(empty);
                return;
            }
            state.timelines.forEach((timeline) => {
                const card = document.createElement('div');
                card.className = 'timeline-card';

                const title = document.createElement('h3');
                title.className = 'timeline-card__title';
                title.textContent = timeline.name || 'Untitled timeline';

                const meta = document.createElement('div');
                meta.className = 'timeline-card__meta';
                const eventCount = timeline.timelineEvents ? timeline.timelineEvents.length : 0;
                meta.textContent = `${eventCount} entries`;

                const actions = document.createElement('div');
                actions.className = 'timeline-card__actions';
                const openBtn = document.createElement('button');
                openBtn.className = 'tl-btn tl-btn--primary';
                openBtn.type = 'button';
                openBtn.textContent = 'Open timeline';
                openBtn.addEventListener('click', () => {
                    window.location.href = buildUrl(timeline.id);
                });
                actions.appendChild(openBtn);

                card.appendChild(title);
                card.appendChild(meta);
                card.appendChild(actions);
                timelineList.appendChild(card);
            });
        } catch (error) {
            const errorCard = document.createElement('div');
            errorCard.className = 'timeline-card';
            errorCard.textContent = 'Unable to load timelines right now.';
            timelineList.appendChild(errorCard);
        }
    };

    const handleDelete = async (event) => {
        if (!state.isAdmin) return;
        const confirmDelete = window.confirm(`Delete "${event.title}"?`);
        if (!confirmDelete) return;
        await fetchJson(`/api/timeline/events/${event.id}`, { method: 'DELETE' });
        state.events = state.events.filter((item) => item.id !== event.id);
        renderTimeline();
        resetForm();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!state.timelineId) return;
        const dateValue = buildDateValue();
        if (!dateValue) {
            setStatus('Please pick a date.', 'error');
            return;
        }

        const mediaList = parseMediaUrls(eventMedia.value);
        const payload = {
            id: state.editingEventId || 0,
            date: dateValue,
            title: eventTitle.value.trim(),
            notes: eventDetails.value.trim(),
            url: eventUrl.value.trim(),
            mediaUrls: mediaList.length ? JSON.stringify(mediaList) : '',
            datePrecision: datePrecision.value,
            timelineId: state.timelineId
        };

        if (!payload.title) {
            setStatus('Title is required.', 'error');
            return;
        }
        if (!payload.notes) {
            setStatus('Details are required.', 'error');
            return;
        }

        try {
            if (state.editingEventId) {
                await fetchJson(`/api/timeline/events/${state.editingEventId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                state.events = state.events.map((item) => (item.id === state.editingEventId ? payload : item));
            } else {
                const created = await fetchJson(`/api/timeline/${state.timelineId}/events`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                state.events = [...state.events, created];
            }
            state.events.sort((a, b) => new Date(a.date) - new Date(b.date));
            renderTimeline();
            resetForm();
            setStatus('Saved.');
        } catch (error) {
            setStatus('Save failed. Try again.', 'error');
        }
    };

    if (adminToggle) {
        adminToggle.addEventListener('change', () => {
            setAdminState(adminToggle.checked);
            renderTimeline();
            if (!state.isAdmin) {
                resetForm();
            }
        });
    }

    if (datePrecision) {
        datePrecision.addEventListener('change', syncDateInputs);
    }

    if (createTimelineForm) {
        createTimelineForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = timelineNameInput.value.trim();
            if (!name) return;
            const payload = { name, ownerId: userId };
            try {
                const created = await fetchJson('/api/timeline', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                window.location.href = buildUrl(created.id);
            } catch (error) {
                alert('Failed to create timeline.');
            }
        });
    }

    if (eventForm) {
        eventForm.addEventListener('submit', handleSubmit);
    }

    if (deleteEventBtn) {
        deleteEventBtn.addEventListener('click', async () => {
            const current = state.events.find((item) => item.id === state.editingEventId);
            if (current) {
                await handleDelete(current);
            }
        });
    }

    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', () => resetForm());
    }

    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = buildUrl();
        });
    }

    const storedAdmin = localStorage.getItem('timelineAdmin');
    if (queryAdmin !== null) {
        setAdminState(queryAdmin === '1' || queryAdmin === 'true');
    } else if (storedAdmin) {
        setAdminState(storedAdmin === 'true');
    } else {
        setAdminState(false);
    }

    syncDateInputs();

    if (state.timelineId && Number.isFinite(state.timelineId)) {
        loadTimeline();
    } else {
        loadTimelines();
    }
})();
