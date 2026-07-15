(function () {
    "use strict";

    var STORAGE_KEY = "ivone.todo.document.v1";
    var SYNC_KEY = "ivone.todo.sync-key.v1";
    var DEVICE_KEY = "ivone.todo.device-id.v1";
    var CLOUD_POLL_INTERVAL = 10000;
    var CALENDAR_GROUP_ID = "calendar";
    var CALENDAR_HOUR_HEIGHT = 72;
    var STATUS_ORDER = ["open", "done", "kept", "blocked"];
    var STATUS_LABELS = {
        open: "Open",
        done: "Done; shown with other completed items",
        kept: "Done; kept in place",
        blocked: "Blocked"
    };
    var GROUP_COLORS = ["#225ee8", "#f06b3f", "#247a4b", "#8a52cc", "#d18a0c", "#c74363", "#167d89"];

    var root = document.getElementById("todoApp");
    if (!root) {
        return;
    }

    var elements = {
        homeView: document.getElementById("homeView"),
        groupView: document.getElementById("groupView"),
        editorView: document.getElementById("editorView"),
        calendarView: document.getElementById("calendarView"),
        homeGrid: document.getElementById("homeGrid"),
        recentSection: document.getElementById("recentSection"),
        recentGrid: document.getElementById("recentGrid"),
        noteGrid: document.getElementById("noteGrid"),
        homeHeading: document.getElementById("homeHeading"),
        search: document.getElementById("globalSearch"),
        groupTitle: document.getElementById("groupTitle"),
        groupColor: document.getElementById("groupColor"),
        groupSummary: document.getElementById("groupSummary"),
        noteTitle: document.getElementById("noteTitle"),
        noteGroup: document.getElementById("noteGroup"),
        itemList: document.getElementById("itemList"),
        emptyAddButton: document.getElementById("emptyAddButton"),
        editorSaveState: document.getElementById("editorSaveState"),
        editorSaveWrap: document.querySelector(".todo-editor-save-state"),
        editorMenu: document.getElementById("editorMenu"),
        editorMenuButton: document.getElementById("editorMenuButton"),
        pinNoteButton: document.getElementById("pinNoteButton"),
        moveNoteFirstButton: document.getElementById("moveNoteFirstButton"),
        calendarTitle: document.getElementById("calendarTitle"),
        calendarDateLabel: document.getElementById("calendarDateLabel"),
        calendarSummary: document.getElementById("calendarSummary"),
        calendarScroll: document.getElementById("calendarScroll"),
        calendarTimeline: document.getElementById("calendarTimeline"),
        calendarDatePicker: document.getElementById("calendarDatePicker"),
        calendarEventModal: document.getElementById("calendarEventModal"),
        calendarEventForm: document.getElementById("calendarEventForm"),
        calendarEventFormTitle: document.getElementById("calendarEventFormTitle"),
        calendarEventTitle: document.getElementById("calendarEventTitle"),
        calendarEventDate: document.getElementById("calendarEventDate"),
        calendarEventTime: document.getElementById("calendarEventTime"),
        calendarEventDuration: document.getElementById("calendarEventDuration"),
        deleteCalendarEventButton: document.getElementById("deleteCalendarEventButton"),
        settingsModal: document.getElementById("settingsModal"),
        syncConflictModal: document.getElementById("syncConflictModal"),
        localSyncNotes: document.getElementById("localSyncNotes"),
        localSyncItems: document.getElementById("localSyncItems"),
        localSyncEvents: document.getElementById("localSyncEvents"),
        localSyncUpdated: document.getElementById("localSyncUpdated"),
        serverSyncNotes: document.getElementById("serverSyncNotes"),
        serverSyncItems: document.getElementById("serverSyncItems"),
        serverSyncEvents: document.getElementById("serverSyncEvents"),
        serverSyncUpdated: document.getElementById("serverSyncUpdated"),
        useLocalSyncButton: document.getElementById("useLocalSyncButton"),
        useServerSyncButton: document.getElementById("useServerSyncButton"),
        mergeSyncButton: document.getElementById("mergeSyncButton"),
        groupModal: document.getElementById("groupModal"),
        groupForm: document.getElementById("groupForm"),
        groupName: document.getElementById("groupName"),
        groupColors: document.getElementById("groupColors"),
        syncStatus: document.getElementById("syncStatus"),
        syncButton: document.getElementById("syncButton"),
        currentSyncKey: document.getElementById("currentSyncKey"),
        otherSyncKey: document.getElementById("otherSyncKey"),
        syncNowButton: document.getElementById("syncNowButton"),
        importFile: document.getElementById("importFile"),
        toast: document.getElementById("todoToast")
    };

    var deviceId = getOrCreateDeviceId();
    var loaded = loadLocalDocument();
    var state = loaded.document;
    var syncKey = getOrCreateSyncKey();
    var activeView = "home";
    var activeGroupId = null;
    var activeNoteId = null;
    var returnGroupId = null;
    var pushTimer = 0;
    var toastTimer = 0;
    var focusAfterRender = null;
    var syncInFlight = false;
    var syncPromise = null;
    var syncRequested = false;
    var mutationSequence = 0;
    var groupModalContext = "home";
    var pendingLongPress = null;
    var dragSession = null;
    var pendingTileDrag = null;
    var tileDragSession = null;
    var suppressTileClickUntil = 0;
    var suppressTileClickId = null;
    var focusHandleAfterRender = null;
    var selectedCalendarDate = localDateKey(new Date());
    var activeCalendarEventId = null;
    var currentTimeTimer = 0;
    var pendingSyncConflict = null;
    var syncConflictResolving = false;
    var syncConnectionPending = false;

    function createId(prefix) {
        if (window.crypto && typeof window.crypto.randomUUID === "function") {
            return prefix + "-" + window.crypto.randomUUID();
        }

        return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
    }

    function createSyncKey() {
        if (window.crypto && typeof window.crypto.getRandomValues === "function") {
            var bytes = new Uint8Array(24);
            window.crypto.getRandomValues(bytes);
            var binary = "";
            bytes.forEach(function (value) { binary += String.fromCharCode(value); });
            return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
        }

        return createId("todo") + createId("sync");
    }

    function getOrCreateSyncKey() {
        var existing = localStorage.getItem(SYNC_KEY);
        if (existing && /^[A-Za-z0-9_-]{24,128}$/.test(existing)) {
            return existing;
        }

        var created = createSyncKey();
        localStorage.setItem(SYNC_KEY, created);
        return created;
    }

    function getOrCreateDeviceId() {
        var existing = localStorage.getItem(DEVICE_KEY);
        if (existing && /^[A-Za-z0-9_-]{12,128}$/.test(existing)) {
            return existing;
        }

        var created = createId("device");
        localStorage.setItem(DEVICE_KEY, created);
        return created;
    }

    function defaultDocument() {
        var now = new Date().toISOString();
        return {
            version: 3,
            updatedAt: now,
            groups: [
                { id: CALENDAR_GROUP_ID, name: "Calendar", color: "#c74363", createdAt: now, manualOrder: 0, orderUpdatedAt: now },
                { id: "home", name: "Home", color: "#225ee8", createdAt: now, manualOrder: 0, orderUpdatedAt: now },
                { id: "work", name: "Work", color: "#f06b3f", createdAt: now, manualOrder: 1, orderUpdatedAt: now },
                { id: "diy", name: "DIY", color: "#d18a0c", createdAt: now, manualOrder: 2, orderUpdatedAt: now },
                { id: "hobby", name: "Hobby", color: "#8a52cc", createdAt: now, manualOrder: 3, orderUpdatedAt: now },
                { id: "fitness", name: "Fitness", color: "#247a4b", createdAt: now, manualOrder: 4, orderUpdatedAt: now }
            ],
            notes: [],
            deletedNotes: {},
            calendarEvents: [],
            deletedCalendarEvents: {}
        };
    }

    function loadLocalDocument() {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return { document: defaultDocument(), exists: false };
        }

        try {
            return { document: normalizeDocument(JSON.parse(raw)), exists: true };
        } catch (error) {
            console.warn("Todo data could not be read. Starting with a clean document.", error);
            return { document: defaultDocument(), exists: false };
        }
    }

    function normalizeDocument(value) {
        if (!value || typeof value !== "object") {
            throw new Error("Not a todo document.");
        }

        var now = new Date().toISOString();
        var groups = Array.isArray(value.groups) ? value.groups.filter(Boolean).map(function (group) {
            var manualOrder = group.manualOrder === null || typeof group.manualOrder === "undefined"
                ? Number.NaN
                : Number(group.manualOrder);
            return {
                id: String(group.id || createId("group")),
                name: String(group.name || "Untitled group").slice(0, 40),
                color: /^#[0-9a-f]{6}$/i.test(group.color || "") ? group.color : GROUP_COLORS[0],
                createdAt: group.createdAt || now,
                manualOrder: Number.isFinite(manualOrder) ? manualOrder : null,
                orderUpdatedAt: group.orderUpdatedAt || group.createdAt || now
            };
        }) : [];

        if (!groups.length) {
            groups = defaultDocument().groups;
        }

        if (!groups.some(function (group) { return group.id === CALENDAR_GROUP_ID; })) {
            groups.push({ id: CALENDAR_GROUP_ID, name: "Calendar", color: "#c74363", createdAt: now, manualOrder: 0, orderUpdatedAt: now });
        }
        if (!groups.some(function (group) { return group.id !== CALENDAR_GROUP_ID; })) {
            groups.unshift({ id: "home", name: "Home", color: "#225ee8", createdAt: now, manualOrder: 0, orderUpdatedAt: now });
        }
        groups.sort(function (a, b) { return a.id.localeCompare(b.id); });

        var noteGroups = groups.filter(function (group) { return group.id !== CALENDAR_GROUP_ID; });
        var fallbackGroupId = noteGroups.length ? noteGroups[0].id : "home";
        var validGroupIds = new Set(noteGroups.map(function (group) { return group.id; }));
        var notes = Array.isArray(value.notes) ? value.notes.filter(Boolean).map(function (note) {
            var visits = {};
            if (note.visits && typeof note.visits === "object" && !Array.isArray(note.visits)) {
                Object.keys(note.visits).sort().forEach(function (key) {
                    var count = Math.max(0, Math.floor(Number(note.visits[key]) || 0));
                    if (count) {
                        visits[key] = count;
                    }
                });
            } else if (Number(note.visitCount) > 0) {
                visits.legacy = Math.max(0, Math.floor(Number(note.visitCount)));
            }

            var manualOrder = note.manualOrder === null || typeof note.manualOrder === "undefined"
                ? Number.NaN
                : Number(note.manualOrder);
            return {
                id: String(note.id || createId("note")),
                groupId: validGroupIds.has(String(note.groupId)) ? String(note.groupId) : fallbackGroupId,
                title: String(note.title || "").slice(0, 180),
                items: normalizeItems(note.items),
                createdAt: note.createdAt || now,
                updatedAt: note.updatedAt || now,
                pinned: Boolean(note.pinned),
                manualOrder: Number.isFinite(manualOrder) ? manualOrder : null,
                orderUpdatedAt: note.orderUpdatedAt || note.createdAt || now,
                lastVisitedAt: note.lastVisitedAt || null,
                visits: visits
            };
        }) : [];

        notes.sort(function (a, b) { return a.id.localeCompare(b.id); });

        var deletedNotes = {};
        if (value.deletedNotes && typeof value.deletedNotes === "object" && !Array.isArray(value.deletedNotes)) {
            Object.keys(value.deletedNotes).sort().forEach(function (noteId) {
                if (value.deletedNotes[noteId]) {
                    deletedNotes[String(noteId)] = String(value.deletedNotes[noteId]);
                }
            });
        }

        var deletedCalendarEvents = {};
        if (value.deletedCalendarEvents && typeof value.deletedCalendarEvents === "object" && !Array.isArray(value.deletedCalendarEvents)) {
            Object.keys(value.deletedCalendarEvents).sort().forEach(function (eventId) {
                if (value.deletedCalendarEvents[eventId]) {
                    deletedCalendarEvents[String(eventId)] = String(value.deletedCalendarEvents[eventId]);
                }
            });
        }

        var calendarEvents = Array.isArray(value.calendarEvents)
            ? value.calendarEvents.filter(Boolean).map(function (event) {
                var startMinutes = Math.max(0, Math.min(1439, Math.round(Number(event.startMinutes) || 0)));
                var durationMinutes = Math.max(15, Math.min(1440 - startMinutes, Math.round(Number(event.durationMinutes) || 60)));
                return {
                    id: String(event.id || createId("event")),
                    title: String(event.title || "Untitled event").slice(0, 180),
                    date: /^\d{4}-\d{2}-\d{2}$/.test(event.date || "") ? event.date : localDateKey(new Date()),
                    startMinutes: startMinutes,
                    durationMinutes: durationMinutes,
                    createdAt: event.createdAt || now,
                    updatedAt: event.updatedAt || now
                };
            }).filter(function (event) { return !deletedCalendarEvents[event.id]; })
            : [];
        calendarEvents.sort(function (a, b) { return a.id.localeCompare(b.id); });

        return {
            version: 3,
            updatedAt: value.updatedAt || now,
            groups: groups,
            notes: notes.filter(function (note) { return !deletedNotes[note.id]; }),
            deletedNotes: deletedNotes,
            calendarEvents: calendarEvents,
            deletedCalendarEvents: deletedCalendarEvents
        };
    }

    function normalizeItems(items) {
        if (!Array.isArray(items)) {
            return [];
        }

        return items.filter(Boolean).map(function (item) {
            return {
                id: String(item.id || createId("item")),
                text: String(item.text || ""),
                status: STATUS_ORDER.indexOf(item.status) >= 0 ? item.status : "open",
                collapsed: Boolean(item.collapsed),
                children: normalizeItems(item.children)
            };
        });
    }

    function newItem(text) {
        return {
            id: createId("item"),
            text: text || "",
            status: "open",
            collapsed: false,
            children: []
        };
    }

    function latestIso(first, second) {
        return (Date.parse(first) || 0) >= (Date.parse(second) || 0) ? first : second;
    }

    function mergeNote(localNote, remoteNote) {
        var contentSource = (Date.parse(localNote.updatedAt) || 0) >= (Date.parse(remoteNote.updatedAt) || 0)
            ? localNote
            : remoteNote;
        var orderSource = (Date.parse(localNote.orderUpdatedAt) || 0) >= (Date.parse(remoteNote.orderUpdatedAt) || 0)
            ? localNote
            : remoteNote;
        var visits = {};
        Array.from(new Set(Object.keys(localNote.visits).concat(Object.keys(remoteNote.visits))))
            .sort()
            .forEach(function (key) {
                var count = Math.max(localNote.visits[key] || 0, remoteNote.visits[key] || 0);
                if (count) {
                    visits[key] = count;
                }
            });

        return {
            id: contentSource.id,
            groupId: contentSource.groupId,
            title: contentSource.title,
            items: JSON.parse(JSON.stringify(contentSource.items)),
            createdAt: (Date.parse(localNote.createdAt) || 0) <= (Date.parse(remoteNote.createdAt) || 0)
                ? localNote.createdAt
                : remoteNote.createdAt,
            updatedAt: contentSource.updatedAt,
            pinned: orderSource.pinned,
            manualOrder: orderSource.manualOrder,
            orderUpdatedAt: orderSource.orderUpdatedAt,
            lastVisitedAt: latestIso(localNote.lastVisitedAt, remoteNote.lastVisitedAt),
            visits: visits
        };
    }

    function mergeGroup(localGroup, remoteGroup) {
        var orderSource = (Date.parse(localGroup.orderUpdatedAt) || 0) >= (Date.parse(remoteGroup.orderUpdatedAt) || 0)
            ? localGroup
            : remoteGroup;
        return {
            id: remoteGroup.id,
            name: remoteGroup.name,
            color: remoteGroup.color,
            createdAt: (Date.parse(localGroup.createdAt) || 0) <= (Date.parse(remoteGroup.createdAt) || 0)
                ? localGroup.createdAt
                : remoteGroup.createdAt,
            manualOrder: orderSource.manualOrder,
            orderUpdatedAt: orderSource.orderUpdatedAt
        };
    }

    function mergeDocuments(localValue, remoteValue) {
        var local = normalizeDocument(localValue);
        var remote = normalizeDocument(remoteValue);
        var remoteGroupsById = new Map(remote.groups.map(function (group) { return [group.id, group]; }));
        var groups = local.groups.map(function (group) {
            var remoteGroup = remoteGroupsById.get(group.id);
            remoteGroupsById.delete(group.id);
            return remoteGroup ? mergeGroup(group, remoteGroup) : group;
        }).concat(Array.from(remoteGroupsById.values()));

        var deletedNotes = {};
        Array.from(new Set(Object.keys(local.deletedNotes).concat(Object.keys(remote.deletedNotes))))
            .sort()
            .forEach(function (noteId) {
                deletedNotes[noteId] = latestIso(local.deletedNotes[noteId], remote.deletedNotes[noteId]);
            });

        var remoteById = new Map(remote.notes.map(function (note) { return [note.id, note]; }));
        var notes = local.notes.map(function (note) {
            var remoteNote = remoteById.get(note.id);
            remoteById.delete(note.id);
            return remoteNote ? mergeNote(note, remoteNote) : note;
        }).concat(Array.from(remoteById.values()));

        notes = notes.filter(function (note) { return !deletedNotes[note.id]; });
        notes.sort(function (a, b) { return a.id.localeCompare(b.id); });

        var deletedCalendarEvents = {};
        Array.from(new Set(Object.keys(local.deletedCalendarEvents).concat(Object.keys(remote.deletedCalendarEvents))))
            .sort()
            .forEach(function (eventId) {
                deletedCalendarEvents[eventId] = latestIso(
                    local.deletedCalendarEvents[eventId],
                    remote.deletedCalendarEvents[eventId]);
            });
        var remoteEventsById = new Map(remote.calendarEvents.map(function (event) { return [event.id, event]; }));
        var calendarEvents = local.calendarEvents.map(function (event) {
            var remoteEvent = remoteEventsById.get(event.id);
            remoteEventsById.delete(event.id);
            if (!remoteEvent) {
                return event;
            }
            return (Date.parse(event.updatedAt) || 0) >= (Date.parse(remoteEvent.updatedAt) || 0)
                ? event
                : remoteEvent;
        }).concat(Array.from(remoteEventsById.values()));
        calendarEvents = calendarEvents.filter(function (event) { return !deletedCalendarEvents[event.id]; });
        calendarEvents.sort(function (a, b) { return a.id.localeCompare(b.id); });

        return normalizeDocument({
            version: 3,
            updatedAt: latestIso(local.updatedAt, remote.updatedAt),
            groups: groups,
            notes: notes,
            deletedNotes: deletedNotes,
            calendarEvents: calendarEvents,
            deletedCalendarEvents: deletedCalendarEvents
        });
    }

    function documentsEqual(first, second) {
        return JSON.stringify(normalizeDocument(first)) === JSON.stringify(normalizeDocument(second));
    }

    function saveLocalDocument() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }

    function persist(options) {
        options = options || {};
        state.updatedAt = new Date().toISOString();
        var note = getActiveNote();
        if (note && options.touchActiveNote !== false) {
            note.updatedAt = state.updatedAt;
        }

        mutationSequence += 1;
        saveLocalDocument();
        setEditorSaved(false);
        scheduleCloudPush();

        if (options.render === true) {
            renderCurrentView();
        }
    }

    function scheduleCloudPush() {
        window.clearTimeout(pushTimer);
        setSyncStatus("Saving…", false);
        pushTimer = window.setTimeout(function () {
            pushCloud(false);
        }, 850);
    }

    function setEditorSaved(saving) {
        if (!elements.editorSaveState) {
            return;
        }

        elements.editorSaveState.textContent = saving ? "Saving…" : "Saved";
        elements.editorSaveWrap.classList.toggle("is-saving", saving);
    }

    function setSyncStatus(message, offline) {
        elements.syncStatus.textContent = message;
        elements.syncButton.classList.toggle("is-offline", Boolean(offline));
    }

    function cloudUrl(key) {
        return root.dataset.apiRoot.replace(/\/$/, "") + "/" + encodeURIComponent(key);
    }

    async function readCloud(key) {
        var response = await fetch(cloudUrl(key), {
            headers: { "Accept": "application/json" },
            cache: "no-store"
        });
        if (response.status === 404) {
            return { missing: true, document: null, etag: null };
        }
        if (!response.ok) {
            throw new Error("Sync returned " + response.status + ".");
        }
        return {
            missing: false,
            document: normalizeDocument(await response.json()),
            etag: response.headers.get("ETag")
        };
    }

    async function writeCloud(key, documentValue, etag) {
        var headers = { "Content-Type": "application/json" };
        headers[etag ? "If-Match" : "If-None-Match"] = etag || "*";
        return fetch(cloudUrl(key), {
            method: "PUT",
            headers: headers,
            body: JSON.stringify(documentValue)
        });
    }

    function applyCloudDocument(nextState, sequenceAtStart) {
        if (documentsEqual(state, nextState)) {
            return false;
        }

        var activeBefore = editorFingerprint(getActiveNote());
        var calendarEventBefore = activeCalendarEventId
            ? JSON.stringify(state.calendarEvents.find(function (event) { return event.id === activeCalendarEventId; }) || null)
            : null;
        state = normalizeDocument(nextState);
        saveLocalDocument();
        if (activeCalendarEventId && calendarEventBefore !== JSON.stringify(
            state.calendarEvents.find(function (event) { return event.id === activeCalendarEventId; }) || null)) {
            activeCalendarEventId = null;
            if (!elements.calendarEventModal.hidden) {
                closeModal(elements.calendarEventModal);
                showToast("That event changed on another device. The latest version is now shown.");
            }
        }
        if (mutationSequence === sequenceAtStart) {
            if (activeView !== "editor" || activeBefore !== editorFingerprint(getActiveNote())) {
                renderCurrentView();
            }
        }
        return true;
    }

    function editorFingerprint(note) {
        return note ? JSON.stringify({
            groupId: note.groupId,
            title: note.title,
            items: note.items,
            pinned: note.pinned,
            manualOrder: note.manualOrder
        }) : "";
    }

    async function performCloudSync(options) {
        var key = options.key || syncKey;
        var forceRemote = Boolean(options.forceRemote);
        if (!options.quiet) {
            setSyncStatus("Checking sync...", false);
        }

        for (var attempt = 0; attempt < 5; attempt += 1) {
            var sequenceAtStart = mutationSequence;
            var remoteResult = await readCloud(key);
            if (remoteResult.missing) {
                if (forceRemote) {
                    throw new Error("No notes were found for that key.");
                }

                var createSnapshot = normalizeDocument(state);
                var createSequence = mutationSequence;
                var createResponse = await writeCloud(key, createSnapshot, null);
                if (createResponse.status === 412) {
                    continue;
                }
                if (!createResponse.ok) {
                    throw new Error("Sync returned " + createResponse.status + ".");
                }
                if (mutationSequence !== createSequence) {
                    continue;
                }
                return true;
            }

            if (forceRemote) {
                state = remoteResult.document;
                saveLocalDocument();
                activeView = "home";
                activeGroupId = null;
                activeNoteId = null;
                renderHome();
                return true;
            }

            var merged = mergeDocuments(state, remoteResult.document);
            applyCloudDocument(merged, sequenceAtStart);
            if (documentsEqual(state, remoteResult.document)) {
                return true;
            }

            state.updatedAt = new Date().toISOString();
            saveLocalDocument();
            var snapshot = normalizeDocument(state);
            var snapshotSequence = mutationSequence;
            var response = await writeCloud(key, snapshot, remoteResult.etag);
            if (response.status === 412) {
                continue;
            }
            if (!response.ok) {
                throw new Error("Sync returned " + response.status + ".");
            }
            if (mutationSequence !== snapshotSequence) {
                continue;
            }
            return true;
        }

        throw new Error("Sync changed repeatedly. It will retry automatically.");
    }

    function syncCloud(options) {
        options = options || {};
        if ((syncConnectionPending || pendingSyncConflict || syncConflictResolving) && !options.allowDuringConflict) {
            return Promise.resolve(false);
        }
        if (syncInFlight) {
            syncRequested = true;
            if (options.forceRemote || options.showFeedback) {
                return syncPromise.then(function () { return syncCloud(options); });
            }
            return syncPromise;
        }

        window.clearTimeout(pushTimer);
        syncInFlight = true;
        syncRequested = false;
        if (!options.quiet) {
            elements.syncNowButton.disabled = true;
            elements.syncNowButton.textContent = "Syncing...";
            setEditorSaved(true);
            setSyncStatus("Syncing...", false);
        }

        syncPromise = performCloudSync(options).then(function () {
            if (!options.quiet) {
                setEditorSaved(false);
                setSyncStatus("Synced", false);
            }
            if (options.showFeedback) {
                showToast("Everything is up to date.");
            }
            return true;
        }).catch(function (error) {
            console.warn("Todo sync failed.", error);
            if (!options.quiet) {
                setEditorSaved(false);
            }
            setSyncStatus("Saved locally", true);
            if (options.showFeedback || options.forceRemote) {
                showToast(error.message || "Could not reach sync. Your local copy is safe.");
            }
            return false;
        }).finally(function () {
            syncInFlight = false;
            syncPromise = null;
            if (!options.quiet) {
                elements.syncNowButton.disabled = false;
                elements.syncNowButton.textContent = "Sync now";
            }
            if (syncRequested) {
                syncRequested = false;
                window.setTimeout(function () { syncCloud(); }, 0);
            }
        });

        return syncPromise;
    }

    function pushCloud(showFeedback) {
        return syncCloud({ showFeedback: showFeedback });
    }

    function icon(name) {
        return '<svg aria-hidden="true"><use href="#i-' + name + '"></use></svg>';
    }

    function clear(element) {
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    }

    function getGroup(groupId) {
        return state.groups.find(function (group) { return group.id === groupId; }) || null;
    }

    function defaultNoteGroupId() {
        var group = orderedGroups().find(function (candidate) { return candidate.id !== CALENDAR_GROUP_ID; });
        return group ? group.id : "home";
    }

    function getNote(noteId) {
        return state.notes.find(function (note) { return note.id === noteId; }) || null;
    }

    function getActiveNote() {
        return activeNoteId ? getNote(activeNoteId) : null;
    }

    function flattenItems(items, result, depth) {
        result = result || [];
        depth = depth || 0;
        items.forEach(function (item) {
            result.push({ item: item, depth: depth });
            flattenItems(item.children, result, depth + 1);
        });
        return result;
    }

    function countItems(items) {
        return flattenItems(items).length;
    }

    function noteVisitCount(note) {
        return Object.keys(note.visits || {}).reduce(function (total, key) {
            return total + (Number(note.visits[key]) || 0);
        }, 0);
    }

    function noteActivityTime(note) {
        return Math.max(Date.parse(note.lastVisitedAt) || 0, Date.parse(note.updatedAt) || 0);
    }

    function noteEngagementScore(note) {
        var ageInDays = Math.max(0, Date.now() - noteActivityTime(note)) / 86400000;
        var recency = 100 / (1 + ageInDays / 7);
        var frequency = Math.min(60, Math.log2(noteVisitCount(note) + 1) * 14);
        return recency + frequency;
    }

    function byDisplayOrder(a, b) {
        if (a.pinned !== b.pinned) {
            return a.pinned ? -1 : 1;
        }
        if (a.manualOrder !== null || b.manualOrder !== null) {
            var aOrder = a.manualOrder === null ? Number.MAX_SAFE_INTEGER : a.manualOrder;
            var bOrder = b.manualOrder === null ? Number.MAX_SAFE_INTEGER : b.manualOrder;
            if (aOrder !== bOrder) {
                return aOrder - bOrder;
            }
        }
        var scoreDifference = noteEngagementScore(b) - noteEngagementScore(a);
        return scoreDifference || byUpdatedDescending(a, b) || a.id.localeCompare(b.id);
    }

    function orderedNotes(notes) {
        return notes.slice().sort(byDisplayOrder);
    }

    function orderedGroups() {
        return state.groups.slice().sort(function (a, b) {
            if (a.id === CALENDAR_GROUP_ID || b.id === CALENDAR_GROUP_ID) {
                return a.id === CALENDAR_GROUP_ID ? -1 : 1;
            }
            var aOrder = a.manualOrder === null ? Number.MAX_SAFE_INTEGER : a.manualOrder;
            var bOrder = b.manualOrder === null ? Number.MAX_SAFE_INTEGER : b.manualOrder;
            return aOrder - bOrder || (Date.parse(a.createdAt) || 0) - (Date.parse(b.createdAt) || 0) || a.id.localeCompare(b.id);
        });
    }

    function showView(name) {
        activeView = name;
        elements.homeView.hidden = name !== "home";
        elements.groupView.hidden = name !== "group";
        elements.editorView.hidden = name !== "editor";
        elements.calendarView.hidden = name !== "calendar";
        elements.editorMenu.hidden = true;
        elements.editorMenuButton.setAttribute("aria-expanded", "false");
        window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    }

    function renderCurrentView() {
        if (activeView === "editor" && getActiveNote()) {
            renderEditor();
            return;
        }

        if (activeView === "group" && getGroup(activeGroupId)) {
            renderGroup(activeGroupId);
            return;
        }

        if (activeView === "calendar") {
            renderCalendar(selectedCalendarDate, false);
            return;
        }

        renderHome();
    }

    function renderHome() {
        showView("home");
        clear(elements.homeGrid);
        var query = elements.search.value.trim().toLocaleLowerCase();
        elements.homeHeading.textContent = query ? "Search results" : "Everything has a place.";
        elements.recentSection.hidden = Boolean(query) || !state.notes.length;

        if (query) {
            var matchedNotes = state.notes.filter(function (note) {
                var group = getGroup(note.groupId);
                var haystack = [note.title, group ? group.name : ""]
                    .concat(flattenItems(note.items).map(function (entry) { return entry.item.text; }))
                    .join(" ")
                    .toLocaleLowerCase();
                return haystack.indexOf(query) >= 0;
            }).sort(byDisplayOrder);

            if (!matchedNotes.length) {
                var empty = document.createElement("div");
                empty.className = "todo-search-empty";
                empty.innerHTML = "<strong>No matches yet.</strong><br>Try a title, group, or checklist item.";
                elements.homeGrid.appendChild(empty);
                return;
            }

            matchedNotes.forEach(function (note) {
                elements.homeGrid.appendChild(buildNoteTile(note, true));
            });
            return;
        }

        var newTile = document.createElement("button");
        newTile.type = "button";
        newTile.className = "todo-new-tile";
        newTile.innerHTML = '<span class="todo-new-tile__icon">' + icon("plus") + '</span><span><strong>New note</strong><br><small>Start with a checklist</small></span>';
        newTile.addEventListener("click", function () { createNote(defaultNoteGroupId(), null); });
        elements.homeGrid.appendChild(newTile);

        orderedGroups().forEach(function (group) {
            elements.homeGrid.appendChild(buildGroupTile(group));
        });

        clear(elements.recentGrid);
        orderedNotes(state.notes).slice(0, 12).forEach(function (note) {
            elements.recentGrid.appendChild(buildNoteTile(note, true, { reorder: true }));
        });
    }

    function buildGroupTile(group) {
        if (group.id === CALENDAR_GROUP_ID) {
            return buildCalendarTile(group);
        }

        var notes = orderedNotes(state.notes.filter(function (note) { return note.groupId === group.id; }));
        var button = document.createElement("button");
        button.type = "button";
        button.className = "todo-group-tile";
        button.dataset.reorderKind = "group";
        button.dataset.reorderId = group.id;
        button.style.setProperty("--group-color", group.color);
        button.setAttribute("aria-label", group.name + ", " + plural(notes.length, "note"));

        var head = document.createElement("div");
        head.className = "todo-group-tile__head";
        var title = document.createElement("h2");
        title.textContent = group.name;
        var count = document.createElement("span");
        count.className = "todo-group-count";
        count.textContent = String(notes.length);
        head.append(title, count);
        button.appendChild(head);

        var preview = document.createElement("div");
        preview.className = "todo-group-preview";
        if (!notes.length) {
            var empty = document.createElement("span");
            var emptyText = document.createElement("em");
            emptyText.textContent = "A clear space";
            empty.appendChild(emptyText);
            preview.appendChild(empty);
        } else {
            notes.slice(0, 3).forEach(function (note) {
                var row = document.createElement("span");
                var text = document.createElement("em");
                text.textContent = note.title || "Untitled note";
                row.appendChild(text);
                preview.appendChild(row);
            });
        }
        button.appendChild(preview);
        button.addEventListener("click", function (event) {
            if (shouldSuppressTileClick(group.id)) {
                event.preventDefault();
                return;
            }
            openGroup(group.id);
        });
        enableTileReordering(button, "group", group.id);
        return button;
    }

    function buildCalendarTile(group) {
        var today = localDateKey(new Date());
        var date = parseLocalDate(today);
        var events = calendarEventsForDate(today);
        var button = document.createElement("button");
        button.type = "button";
        button.className = "todo-group-tile todo-calendar-tile";
        button.style.setProperty("--group-color", group.color);
        button.setAttribute("aria-label", "Open Calendar daily planner, " + plural(events.length, "event") + " today");
        button.innerHTML =
            '<span class="todo-calendar-tile__icon">' + icon("calendar") + '</span>' +
            '<span class="todo-calendar-tile__date"><small>' +
                new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(date) +
                '</small><strong>' + date.getDate() + '</strong></span>' +
            '<span class="todo-calendar-tile__copy"><strong>Calendar</strong><small>' +
                (events.length ? plural(events.length, "plan") + " today" : "Plan your day") +
                '</small></span>';
        button.addEventListener("click", function () {
            selectedCalendarDate = today;
            renderCalendar(today, true);
        });
        return button;
    }

    function openGroup(groupId) {
        if (groupId === CALENDAR_GROUP_ID) {
            selectedCalendarDate = localDateKey(new Date());
            renderCalendar(selectedCalendarDate, true);
            return;
        }
        activeGroupId = groupId;
        renderGroup(groupId);
    }

    function renderGroup(groupId) {
        var group = getGroup(groupId);
        if (!group) {
            renderHome();
            return;
        }

        activeGroupId = groupId;
        showView("group");
        elements.groupTitle.textContent = group.name;
        elements.groupColor.style.background = group.color;

        var notes = orderedNotes(state.notes.filter(function (note) { return note.groupId === groupId; }));
        var itemTotal = notes.reduce(function (total, note) { return total + countItems(note.items); }, 0);
        elements.groupSummary.textContent = plural(notes.length, "note") + " · " + plural(itemTotal, "item");
        clear(elements.noteGrid);

        if (!notes.length) {
            var empty = document.createElement("div");
            empty.className = "todo-group-empty";
            empty.innerHTML = "<strong>No notes in here yet.</strong><br>Start one and break it into as many levels as you need.";
            elements.noteGrid.appendChild(empty);
            return;
        }

        notes.forEach(function (note) {
            elements.noteGrid.appendChild(buildNoteTile(note, false, { reorder: true }));
        });
    }

    function localDateKey(date) {
        var year = date.getFullYear();
        var month = String(date.getMonth() + 1).padStart(2, "0");
        var day = String(date.getDate()).padStart(2, "0");
        return year + "-" + month + "-" + day;
    }

    function parseLocalDate(dateKey) {
        var parts = String(dateKey).split("-").map(Number);
        return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0, 0);
    }

    function shiftDateKey(dateKey, amount) {
        var date = parseLocalDate(dateKey);
        date.setDate(date.getDate() + amount);
        return localDateKey(date);
    }

    function minutesToTime(minutes) {
        var safeMinutes = Math.max(0, Math.min(1439, Math.round(minutes)));
        return String(Math.floor(safeMinutes / 60)).padStart(2, "0") + ":" +
            String(safeMinutes % 60).padStart(2, "0");
    }

    function timeToMinutes(value) {
        var parts = String(value || "00:00").split(":").map(Number);
        return Math.max(0, Math.min(1439, (parts[0] || 0) * 60 + (parts[1] || 0)));
    }

    function calendarEventsForDate(dateKey) {
        return state.calendarEvents.filter(function (event) { return event.date === dateKey; })
            .sort(function (a, b) {
                return a.startMinutes - b.startMinutes || a.durationMinutes - b.durationMinutes || a.id.localeCompare(b.id);
            });
    }

    function renderCalendar(dateKey, focusTimeline) {
        selectedCalendarDate = dateKey || localDateKey(new Date());
        showView("calendar");
        var date = parseLocalDate(selectedCalendarDate);
        var today = localDateKey(new Date());
        var isToday = selectedCalendarDate === today;
        var events = calendarEventsForDate(selectedCalendarDate);
        elements.calendarTitle.textContent = isToday
            ? "Today"
            : new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(date);
        elements.calendarDateLabel.textContent = new Intl.DateTimeFormat(undefined, {
            day: "numeric",
            month: "long",
            year: "numeric"
        }).format(date);
        elements.calendarDatePicker.value = selectedCalendarDate;
        document.getElementById("calendarTodayButton").hidden = isToday;

        var plannedMinutes = events.reduce(function (total, event) { return total + event.durationMinutes; }, 0);
        elements.calendarSummary.textContent = events.length
            ? plural(events.length, "plan") + " · " + formatDuration(plannedMinutes) + " planned"
            : "No plans yet";

        clear(elements.calendarTimeline);
        for (var hour = 0; hour < 24; hour += 1) {
            var slot = document.createElement("div");
            slot.className = "todo-calendar-slot" + (hour < 6 ? " is-off-hours" : "");
            slot.style.setProperty("--slot-hour", hour);
            var label = document.createElement("span");
            label.className = "todo-calendar-time-label";
            label.textContent = String(hour).padStart(2, "0") + ":00";
            var hitArea = document.createElement("div");
            hitArea.className = "todo-calendar-slot-hit";
            for (var quarter = 0; quarter < 4; quarter += 1) {
                var startMinutes = hour * 60 + quarter * 15;
                var quarterButton = document.createElement("button");
                quarterButton.type = "button";
                quarterButton.className = "todo-calendar-quarter";
                quarterButton.setAttribute("aria-label", "Add an event at " + minutesToTime(startMinutes) + " on " + elements.calendarDateLabel.textContent);
                var tooltip = document.createElement("span");
                tooltip.className = "todo-calendar-quarter-tooltip";
                tooltip.textContent = minutesToTime(startMinutes);
                quarterButton.appendChild(tooltip);
                quarterButton.addEventListener("click", (function (selectedMinutes) {
                    return function () {
                        openCalendarEventForm(null, selectedCalendarDate, selectedMinutes);
                    };
                })(startMinutes));
                hitArea.appendChild(quarterButton);
            }
            slot.append(label, hitArea);
            elements.calendarTimeline.appendChild(slot);
        }

        var midnightLabel = document.createElement("span");
        midnightLabel.className = "todo-calendar-time-label todo-calendar-time-label--end";
        midnightLabel.textContent = "00:00";
        elements.calendarTimeline.appendChild(midnightLabel);
        events.forEach(function (event) { elements.calendarTimeline.appendChild(buildCalendarEvent(event)); });
        updateCurrentTimeLine();

        if (focusTimeline) {
            window.setTimeout(function () {
                var targetMinutes = isToday ? new Date().getHours() * 60 + new Date().getMinutes() : 6 * 60;
                var targetTop = targetMinutes / 60 * CALENDAR_HOUR_HEIGHT;
                elements.calendarScroll.scrollTo({
                    top: Math.max(0, targetTop - elements.calendarScroll.clientHeight * 0.32),
                    behavior: "auto"
                });
                elements.calendarScroll.focus({ preventScroll: true });
            }, 0);
        }
    }

    function buildCalendarEvent(event) {
        var button = document.createElement("button");
        button.type = "button";
        button.className = "todo-calendar-event";
        button.style.top = event.startMinutes / 60 * CALENDAR_HOUR_HEIGHT + "px";
        button.style.height = Math.max(44, event.durationMinutes / 60 * CALENDAR_HOUR_HEIGHT - 4) + "px";
        button.setAttribute("aria-label", event.title + ", " + minutesToTime(event.startMinutes) + ", " + formatDuration(event.durationMinutes));
        var title = document.createElement("strong");
        title.textContent = event.title;
        var time = document.createElement("span");
        time.textContent = minutesToTime(event.startMinutes) + " · " + formatDuration(event.durationMinutes);
        button.append(title, time);
        button.addEventListener("click", function () {
            openCalendarEventForm(event, event.date, event.startMinutes);
        });
        return button;
    }

    function updateCurrentTimeLine() {
        var existing = elements.calendarTimeline.querySelector(".todo-calendar-now");
        if (existing) {
            existing.remove();
        }
        if (activeView !== "calendar" || selectedCalendarDate !== localDateKey(new Date())) {
            return;
        }

        var now = new Date();
        var minutes = now.getHours() * 60 + now.getMinutes();
        var line = document.createElement("div");
        line.className = "todo-calendar-now";
        line.style.top = minutes / 60 * CALENDAR_HOUR_HEIGHT + "px";
        line.innerHTML = '<span>' + minutesToTime(minutes) + '</span>';
        elements.calendarTimeline.appendChild(line);
    }

    function formatDuration(minutes) {
        if (minutes < 60) {
            return minutes + " min";
        }
        var hours = Math.floor(minutes / 60);
        var remainder = minutes % 60;
        return hours + "h" + (remainder ? " " + remainder + "m" : "");
    }

    function openCalendarEventForm(event, dateKey, startMinutes) {
        activeCalendarEventId = event ? event.id : null;
        elements.calendarEventFormTitle.textContent = event ? "Edit event" : "Add an event";
        elements.calendarEventTitle.value = event ? event.title : "";
        elements.calendarEventDate.value = event ? event.date : dateKey;
        elements.calendarEventTime.value = minutesToTime(event ? event.startMinutes : startMinutes);
        elements.calendarEventDuration.value = String(event ? event.durationMinutes : 60);
        elements.deleteCalendarEventButton.hidden = !event;
        openModal(elements.calendarEventModal);
    }

    function saveCalendarEvent(event) {
        event.preventDefault();
        var title = elements.calendarEventTitle.value.trim();
        if (!title) {
            elements.calendarEventTitle.focus();
            return;
        }

        var now = new Date().toISOString();
        var dateKey = elements.calendarEventDate.value;
        var startMinutes = timeToMinutes(elements.calendarEventTime.value);
        var durationMinutes = Math.min(Number(elements.calendarEventDuration.value) || 60, 1440 - startMinutes);
        var calendarEvent = activeCalendarEventId
            ? state.calendarEvents.find(function (candidate) { return candidate.id === activeCalendarEventId; })
            : null;
        if (calendarEvent) {
            calendarEvent.title = title;
            calendarEvent.date = dateKey;
            calendarEvent.startMinutes = startMinutes;
            calendarEvent.durationMinutes = durationMinutes;
            calendarEvent.updatedAt = now;
        } else {
            calendarEvent = {
                id: createId("event"),
                title: title,
                date: dateKey,
                startMinutes: startMinutes,
                durationMinutes: durationMinutes,
                createdAt: now,
                updatedAt: now
            };
            state.calendarEvents.push(calendarEvent);
        }
        selectedCalendarDate = dateKey;
        activeCalendarEventId = null;
        persist({ touchActiveNote: false });
        closeModal(elements.calendarEventModal);
        renderCalendar(selectedCalendarDate, false);
        showToast("Event saved.");
    }

    function deleteCalendarEvent() {
        if (!activeCalendarEventId) {
            return;
        }
        var event = state.calendarEvents.find(function (candidate) { return candidate.id === activeCalendarEventId; });
        if (!event || !window.confirm("Delete this event?")) {
            return;
        }
        state.deletedCalendarEvents[event.id] = new Date().toISOString();
        state.calendarEvents = state.calendarEvents.filter(function (candidate) { return candidate.id !== event.id; });
        activeCalendarEventId = null;
        persist({ touchActiveNote: false });
        closeModal(elements.calendarEventModal);
        renderCalendar(selectedCalendarDate, false);
        showToast("Event deleted.");
    }

    function buildNoteTile(note, showGroup, options) {
        options = options || {};
        var group = getGroup(note.groupId);
        var card = document.createElement("article");
        card.className = "todo-note-tile" + (note.pinned ? " is-pinned" : "") + (options.reorder ? " has-reorder" : "");
        card.style.setProperty("--group-color", group ? group.color : GROUP_COLORS[0]);
        if (options.reorder) {
            card.dataset.reorderKind = "note";
            card.dataset.reorderId = note.id;
            card.dataset.reorderTier = note.pinned ? "pinned" : "unpinned";
        }

        var button = document.createElement("button");
        button.type = "button";
        button.className = "todo-note-tile__open";
        button.setAttribute("aria-label", "Open " + (note.title || "Untitled note"));

        var head = document.createElement("div");
        head.className = "todo-note-tile__head";
        var titleWrap = document.createElement("div");
        if (showGroup && group) {
            var groupLabel = document.createElement("span");
            groupLabel.className = "todo-note-tile__group";
            groupLabel.textContent = group.name;
            titleWrap.appendChild(groupLabel);
        }
        var title = document.createElement("h2");
        title.textContent = note.title || "Untitled note";
        titleWrap.appendChild(title);
        head.appendChild(titleWrap);
        button.appendChild(head);

        var preview = document.createElement("div");
        preview.className = "todo-note-preview";
        flattenItems(note.items).slice(0, 5).forEach(function (entry) {
            var row = document.createElement("span");
            var status = document.createElement("i");
            status.className = "todo-preview-status is-" + entry.item.status;
            status.setAttribute("aria-hidden", "true");
            if (entry.item.status === "done" || entry.item.status === "kept") {
                status.textContent = "✓";
            } else if (entry.item.status === "blocked") {
                status.textContent = "×";
            }
            var text = document.createElement("em");
            text.style.paddingLeft = Math.min(entry.depth * 8, 24) + "px";
            text.textContent = entry.item.text || "Empty item";
            row.append(status, text);
            preview.appendChild(row);
        });
        if (!note.items.length) {
            var noItems = document.createElement("span");
            noItems.textContent = "Empty checklist";
            preview.appendChild(noItems);
        }
        button.appendChild(preview);

        var foot = document.createElement("div");
        foot.className = "todo-note-tile__foot";
        var count = document.createElement("span");
        count.textContent = plural(countItems(note.items), "item");
        var updated = document.createElement("span");
        var visits = noteVisitCount(note);
        updated.textContent = visits
            ? "Opened " + visits + "× · " + relativeDate(note.lastVisitedAt || note.updatedAt)
            : relativeDate(note.updatedAt);
        foot.append(count, updated);
        button.appendChild(foot);

        button.addEventListener("click", function (event) {
            if (shouldSuppressTileClick(note.id)) {
                event.preventDefault();
                return;
            }
            returnGroupId = showGroup ? note.groupId : activeGroupId;
            openNote(note.id);
        });
        card.appendChild(button);

        var actions = document.createElement("div");
        actions.className = "todo-note-tile__actions";
        var pinButton = document.createElement("button");
        pinButton.type = "button";
        pinButton.className = "todo-card-action" + (note.pinned ? " is-active" : "");
        pinButton.innerHTML = icon("pin");
        pinButton.setAttribute("aria-label", note.pinned ? "Unpin note" : "Pin note");
        pinButton.title = note.pinned ? "Unpin note" : "Pin note";
        pinButton.setAttribute("aria-pressed", note.pinned ? "true" : "false");
        pinButton.addEventListener("click", function () { toggleNotePin(note.id); });
        actions.appendChild(pinButton);

        if (options.reorder) {
            var tier = orderedNotes(state.notes.filter(function (candidate) { return candidate.pinned === note.pinned; }));
            var index = tier.findIndex(function (candidate) { return candidate.id === note.id; });
            var earlier = document.createElement("button");
            earlier.type = "button";
            earlier.className = "todo-card-action";
            earlier.innerHTML = icon("arrow-up");
            earlier.setAttribute("aria-label", "Move note earlier");
            earlier.title = "Move note earlier";
            earlier.disabled = index <= 0;
            earlier.addEventListener("click", function () { moveNote(note.id, -1); });
            var later = document.createElement("button");
            later.type = "button";
            later.className = "todo-card-action";
            later.innerHTML = icon("arrow-down");
            later.setAttribute("aria-label", "Move note later");
            later.title = "Move note later";
            later.disabled = index < 0 || index >= tier.length - 1;
            later.addEventListener("click", function () { moveNote(note.id, 1); });
            actions.append(earlier, later);
        }

        card.appendChild(actions);
        if (options.reorder) {
            enableTileReordering(card, "note", note.id);
        }
        return card;
    }

    function rewriteTierOrder(notes, changedAt) {
        notes.forEach(function (note, index) {
            note.manualOrder = index;
            note.orderUpdatedAt = changedAt;
        });
    }

    function toggleNotePin(noteId) {
        var note = getNote(noteId);
        if (!note) {
            return;
        }

        var changedAt = new Date().toISOString();
        note.pinned = !note.pinned;
        note.manualOrder = null;
        note.orderUpdatedAt = changedAt;
        rewriteTierOrder(orderedNotes(state.notes.filter(function (candidate) {
            return candidate.pinned === note.pinned;
        })), changedAt);
        persist({ touchActiveNote: false });
        renderCurrentView();
        showToast(note.pinned ? "Note pinned." : "Note unpinned.");
    }

    function moveNote(noteId, direction) {
        var note = getNote(noteId);
        if (!note) {
            return;
        }

        var tier = orderedNotes(state.notes.filter(function (candidate) { return candidate.pinned === note.pinned; }));
        var index = tier.findIndex(function (candidate) { return candidate.id === noteId; });
        var targetIndex = Math.max(0, Math.min(tier.length - 1, index + direction));
        if (index < 0 || index === targetIndex) {
            return;
        }

        tier.splice(targetIndex, 0, tier.splice(index, 1)[0]);
        rewriteTierOrder(tier, new Date().toISOString());
        persist({ touchActiveNote: false });
        renderCurrentView();
        showToast("Note order saved.");
    }

    function moveNoteToFirst(noteId) {
        var note = getNote(noteId);
        if (!note) {
            return;
        }

        var tier = orderedNotes(state.notes.filter(function (candidate) { return candidate.pinned === note.pinned; }));
        var index = tier.findIndex(function (candidate) { return candidate.id === noteId; });
        if (index <= 0) {
            rewriteTierOrder(tier, new Date().toISOString());
            persist({ touchActiveNote: false });
            renderCurrentView();
            showToast("This note will stay first" + (note.pinned ? " among pinned notes." : " among unpinned notes."));
            return;
        }

        tier.unshift(tier.splice(index, 1)[0]);
        rewriteTierOrder(tier, new Date().toISOString());
        persist({ touchActiveNote: false });
        renderCurrentView();
        showToast("Moved to first" + (note.pinned ? " among pinned notes." : " among unpinned notes."));
    }

    function rewriteGroupOrder(groups, changedAt) {
        groups.forEach(function (group, index) {
            group.manualOrder = index;
            group.orderUpdatedAt = changedAt;
        });
    }

    function moveGroup(groupId, direction) {
        var groups = orderedGroups().filter(function (group) { return group.id !== CALENDAR_GROUP_ID; });
        var index = groups.findIndex(function (group) { return group.id === groupId; });
        var targetIndex = Math.max(0, Math.min(groups.length - 1, index + direction));
        if (index < 0 || index === targetIndex) {
            return;
        }
        groups.splice(targetIndex, 0, groups.splice(index, 1)[0]);
        rewriteGroupOrder(groups, new Date().toISOString());
        persist({ touchActiveNote: false });
        renderHome();
        showToast("Group order saved.");
    }

    function moveNoteRelativeToTile(sourceId, targetId, position) {
        var source = getNote(sourceId);
        var target = getNote(targetId);
        if (!source || !target || source.id === target.id || source.pinned !== target.pinned) {
            return false;
        }
        var tier = orderedNotes(state.notes.filter(function (note) { return note.pinned === source.pinned; }));
        var sourceIndex = tier.indexOf(source);
        if (sourceIndex < 0) {
            return false;
        }
        tier.splice(sourceIndex, 1);
        var targetIndex = tier.indexOf(target);
        tier.splice(targetIndex + (position === "after" ? 1 : 0), 0, source);
        rewriteTierOrder(tier, new Date().toISOString());
        persist({ touchActiveNote: false });
        renderCurrentView();
        showToast("Note order saved.");
        return true;
    }

    function moveGroupRelativeToTile(sourceId, targetId, position) {
        if (sourceId === CALENDAR_GROUP_ID || targetId === CALENDAR_GROUP_ID || sourceId === targetId) {
            return false;
        }
        var groups = orderedGroups().filter(function (group) { return group.id !== CALENDAR_GROUP_ID; });
        var source = groups.find(function (group) { return group.id === sourceId; });
        var target = groups.find(function (group) { return group.id === targetId; });
        if (!source || !target) {
            return false;
        }
        groups.splice(groups.indexOf(source), 1);
        var targetIndex = groups.indexOf(target);
        groups.splice(targetIndex + (position === "after" ? 1 : 0), 0, source);
        rewriteGroupOrder(groups, new Date().toISOString());
        persist({ touchActiveNote: false });
        renderHome();
        showToast("Group order saved.");
        return true;
    }

    function shouldSuppressTileClick(id) {
        return suppressTileClickId === id && Date.now() < suppressTileClickUntil;
    }

    function enableTileReordering(element, kind, id) {
        element.addEventListener("contextmenu", function (event) {
            event.preventDefault();
        });
        element.addEventListener("pointerdown", function (event) {
            if ((event.button !== undefined && event.button !== 0) || event.target.closest(".todo-card-action")) {
                return;
            }
            clearPendingTileDrag();
            pendingTileDrag = {
                kind: kind,
                id: id,
                pointerId: event.pointerId,
                pointerType: event.pointerType,
                source: element,
                startX: event.clientX,
                startY: event.clientY,
                lastX: event.clientX,
                lastY: event.clientY,
                timer: 0
            };
            if (event.pointerType !== "mouse") {
                pendingTileDrag.timer = window.setTimeout(function () {
                    if (!pendingTileDrag) {
                        return;
                    }
                    startTileDrag(pendingTileDrag);
                    pendingTileDrag = null;
                    if (navigator.vibrate) {
                        navigator.vibrate(18);
                    }
                }, 360);
            }
        });

        if (kind === "group") {
            element.setAttribute("title", "Open this group. Drag to reorder; Alt + arrow keys also move it.");
            element.addEventListener("keydown", function (event) {
                if (event.altKey && (event.key === "ArrowLeft" || event.key === "ArrowUp" || event.key === "ArrowRight" || event.key === "ArrowDown")) {
                    event.preventDefault();
                    moveGroup(id, event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1);
                }
            });
        }
    }

    function clearPendingTileDrag() {
        if (!pendingTileDrag) {
            return;
        }
        window.clearTimeout(pendingTileDrag.timer);
        pendingTileDrag = null;
    }

    function startTileDrag(pending) {
        if (!pending.source || !pending.source.isConnected) {
            return;
        }
        var rect = pending.source.getBoundingClientRect();
        var offsetX = pending.startX - rect.left;
        var offsetY = Math.min(rect.height / 2, Math.max(24, pending.startY - rect.top));
        var ghost = pending.source.cloneNode(true);
        ghost.removeAttribute("id");
        ghost.classList.add("todo-tile-drag-ghost");
        ghost.setAttribute("aria-hidden", "true");
        ghost.querySelectorAll("button, input, select").forEach(function (control) { control.tabIndex = -1; });
        ghost.style.width = rect.width + "px";
        ghost.style.height = rect.height + "px";
        ghost.style.transition = "none";
        ghost.style.transform = "translate3d(" +
            Math.max(8, Math.min(window.innerWidth - rect.width - 8, pending.lastX - offsetX)) + "px," +
            (pending.lastY - offsetY) + "px,0)";
        document.body.appendChild(ghost);
        tileDragSession = {
            kind: pending.kind,
            id: pending.id,
            pointerId: pending.pointerId,
            source: pending.source,
            container: pending.source.parentElement,
            ghost: ghost,
            offsetX: offsetX,
            offsetY: offsetY,
            target: null,
            targetId: null,
            position: null
        };
        pending.source.classList.add("is-tile-drag-source");
        document.body.classList.add("todo-dragging");
        updateTileDrag(pending.lastX, pending.lastY);
    }

    function clearTileDropTarget() {
        if (!tileDragSession || !tileDragSession.target) {
            return;
        }
        tileDragSession.target.classList.remove("is-tile-drop-before", "is-tile-drop-after");
        tileDragSession.target = null;
        tileDragSession.targetId = null;
        tileDragSession.position = null;
    }

    function updateTileDrag(clientX, clientY) {
        if (!tileDragSession) {
            return;
        }
        var ghostWidth = tileDragSession.ghost.offsetWidth;
        var left = Math.max(8, Math.min(window.innerWidth - ghostWidth - 8, clientX - tileDragSession.offsetX));
        tileDragSession.ghost.style.transform = "translate3d(" + left + "px," + (clientY - tileDragSession.offsetY) + "px,0)";
        clearTileDropTarget();
        var hit = document.elementFromPoint(clientX, clientY);
        var target = hit ? hit.closest('[data-reorder-kind="' + tileDragSession.kind + '"]') : null;
        if (target && target.parentElement === tileDragSession.container && target.dataset.reorderId !== tileDragSession.id) {
            var sameTier = tileDragSession.kind !== "note" || target.dataset.reorderTier === tileDragSession.source.dataset.reorderTier;
            if (sameTier) {
                var rect = target.getBoundingClientRect();
                var containerRect = tileDragSession.container.getBoundingClientRect();
                var isSingleColumn = rect.width > containerRect.width * 0.7;
                var position = isSingleColumn
                    ? (clientY < rect.top + rect.height / 2 ? "before" : "after")
                    : (clientX < rect.left + rect.width / 2 ? "before" : "after");
                target.classList.add(position === "before" ? "is-tile-drop-before" : "is-tile-drop-after");
                tileDragSession.target = target;
                tileDragSession.targetId = target.dataset.reorderId;
                tileDragSession.position = position;
            }
        }
        if (clientY < 72) {
            window.scrollBy(0, -14);
        } else if (clientY > window.innerHeight - 72) {
            window.scrollBy(0, 14);
        }
    }

    function finishTileDrag(shouldMove) {
        clearPendingTileDrag();
        if (!tileDragSession) {
            return;
        }
        var session = tileDragSession;
        var targetId = session.targetId;
        var position = session.position;
        clearTileDropTarget();
        session.source.classList.remove("is-tile-drag-source");
        session.ghost.remove();
        document.body.classList.remove("todo-dragging");
        tileDragSession = null;
        suppressTileClickId = session.id;
        suppressTileClickUntil = Date.now() + 500;
        if (shouldMove && targetId && position) {
            if (session.kind === "note") {
                moveNoteRelativeToTile(session.id, targetId, position);
            } else {
                moveGroupRelativeToTile(session.id, targetId, position);
            }
        }
    }

    function createNote(groupId, sourceNote) {
        var now = new Date().toISOString();
        var note = sourceNote ? {
            id: createId("note"),
            groupId: sourceNote.groupId,
            title: sourceNote.title ? sourceNote.title + " copy" : "",
            items: JSON.parse(JSON.stringify(sourceNote.items)).map(rekeyItemTree),
            createdAt: now,
            updatedAt: now,
            pinned: false,
            manualOrder: null,
            orderUpdatedAt: now,
            lastVisitedAt: now,
            visits: { [deviceId]: 1 }
        } : {
            id: createId("note"),
            groupId: groupId || defaultNoteGroupId(),
            title: "",
            items: [newItem("")],
            createdAt: now,
            updatedAt: now,
            pinned: false,
            manualOrder: null,
            orderUpdatedAt: now,
            lastVisitedAt: now,
            visits: { [deviceId]: 1 }
        };

        state.notes.unshift(note);
        returnGroupId = activeView === "group" ? activeGroupId : null;
        activeNoteId = note.id;
        persist();
        renderEditor();
        window.setTimeout(function () {
            elements.noteTitle.focus();
        }, 0);
    }

    function rekeyItemTree(item) {
        item.id = createId("item");
        item.children = (item.children || []).map(rekeyItemTree);
        return item;
    }

    function openNote(noteId) {
        activeNoteId = noteId;
        var note = getActiveNote();
        if (note) {
            note.visits[deviceId] = (note.visits[deviceId] || 0) + 1;
            note.lastVisitedAt = new Date().toISOString();
            persist({ touchActiveNote: false });
        }
        renderEditor();
    }

    function renderEditor() {
        var note = getActiveNote();
        if (!note) {
            renderHome();
            return;
        }

        showView("editor");
        elements.pinNoteButton.textContent = note.pinned ? "Unpin note" : "Pin note";
        elements.moveNoteFirstButton.textContent = note.pinned ? "Move to first pinned" : "Move to first unpinned";
        elements.noteTitle.value = note.title;
        clear(elements.noteGroup);
        state.groups.filter(function (group) { return group.id !== CALENDAR_GROUP_ID; }).forEach(function (group) {
            var option = document.createElement("option");
            option.value = group.id;
            option.textContent = group.name;
            option.selected = group.id === note.groupId;
            elements.noteGroup.appendChild(option);
        });
        renderItems();
    }

    function closeEditor() {
        var note = getActiveNote();
        if (note && !note.title.trim() && !flattenItems(note.items).some(function (entry) { return entry.item.text.trim(); })) {
            state.deletedNotes[note.id] = new Date().toISOString();
            state.notes = state.notes.filter(function (candidate) { return candidate.id !== note.id; });
            persist({ touchActiveNote: false });
        }

        activeNoteId = null;
        if (returnGroupId && getGroup(returnGroupId)) {
            openGroup(returnGroupId);
        } else {
            renderHome();
        }
    }

    function renderItems() {
        var note = getActiveNote();
        clear(elements.itemList);
        if (!note) {
            return;
        }

        elements.emptyAddButton.hidden = note.items.length > 0;
        appendItemLevel(note.items, 0);

        if (focusAfterRender) {
            var focusId = focusAfterRender;
            focusAfterRender = null;
            window.requestAnimationFrame(function () {
                var input = elements.itemList.querySelector('[data-item-input="' + cssEscape(focusId) + '"]');
                if (input) {
                    input.focus();
                    input.setSelectionRange(input.value.length, input.value.length);
                }
            });
        }

        if (focusHandleAfterRender) {
            var handleId = focusHandleAfterRender;
            focusHandleAfterRender = null;
            window.requestAnimationFrame(function () {
                var handle = elements.itemList.querySelector('[data-drag-handle="' + cssEscape(handleId) + '"]');
                if (handle) {
                    handle.focus();
                }
            });
        }
    }

    function appendItemLevel(items, depth) {
        var ordered = items.slice().sort(function (a, b) {
            return (a.status === "done" ? 1 : 0) - (b.status === "done" ? 1 : 0);
        });

        ordered.forEach(function (item) {
            elements.itemList.appendChild(buildItemRow(item, depth));
            if (!item.collapsed && item.children.length) {
                appendItemLevel(item.children, depth + 1);
            }
        });
    }

    function buildItemRow(item, depth) {
        var wrapper = document.createElement("div");
        wrapper.className = "todo-item is-" + item.status;
        wrapper.style.setProperty("--depth", String(depth));
        wrapper.dataset.itemId = item.id;

        var row = document.createElement("div");
        row.className = "todo-item__row";

        var dragHandle = document.createElement("button");
        dragHandle.type = "button";
        dragHandle.className = "todo-drag-handle";
        dragHandle.dataset.dragHandle = item.id;
        dragHandle.innerHTML = icon("grip");
        dragHandle.setAttribute("aria-label", "Reorder item. Drag with a mouse, press and hold on touch, or use Alt plus up or down arrow.");
        dragHandle.addEventListener("pointerdown", function (event) {
            beginDragPointer(event, item.id);
        });
        dragHandle.addEventListener("keydown", function (event) {
            if (event.altKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
                event.preventDefault();
                moveItemWithKeyboard(item.id, event.key === "ArrowUp" ? -1 : 1);
            }
        });
        row.appendChild(dragHandle);

        if (item.children.length) {
            var collapse = document.createElement("button");
            collapse.type = "button";
            collapse.className = "todo-collapse-button" + (item.collapsed ? "" : " is-expanded");
            collapse.innerHTML = icon("chevron");
            collapse.setAttribute("aria-label", (item.collapsed ? "Expand" : "Collapse") + " nested items");
            collapse.setAttribute("aria-expanded", item.collapsed ? "false" : "true");
            collapse.addEventListener("click", function () {
                item.collapsed = !item.collapsed;
                persist();
                renderItems();
            });
            row.appendChild(collapse);
        } else {
            var placeholder = document.createElement("span");
            placeholder.className = "todo-collapse-placeholder";
            row.appendChild(placeholder);
        }

        var statusButton = document.createElement("button");
        statusButton.type = "button";
        statusButton.className = "todo-status-button";
        statusButton.setAttribute("aria-label", STATUS_LABELS[item.status] + ". Change status.");
        var statusInner = document.createElement("span");
        if (item.status === "done" || item.status === "kept") {
            statusInner.innerHTML = icon("check");
        } else if (item.status === "blocked") {
            statusInner.innerHTML = icon("x");
        }
        statusButton.appendChild(statusInner);
        statusButton.addEventListener("click", function () {
            item.status = STATUS_ORDER[(STATUS_ORDER.indexOf(item.status) + 1) % STATUS_ORDER.length];
            focusAfterRender = item.id;
            persist();
            renderItems();
        });
        row.appendChild(statusButton);

        var input = document.createElement("input");
        input.type = "text";
        input.className = "todo-item__input";
        input.value = item.text;
        input.placeholder = depth ? "Nested item" : "List item";
        input.dataset.itemInput = item.id;
        input.setAttribute("aria-label", "Checklist item, level " + (depth + 1));
        input.addEventListener("input", function () {
            item.text = input.value;
            persist();
        });
        input.addEventListener("keydown", function (event) {
            handleItemKeydown(event, item.id);
        });
        row.appendChild(input);

        var actions = document.createElement("div");
        actions.className = "todo-item__actions";
        actions.appendChild(itemAction("plus", "Add nested item", "child", item.id));
        actions.appendChild(itemAction("indent", "Indent item", "indent", item.id));
        actions.appendChild(itemAction("outdent", "Move item out one level", "outdent", item.id));
        actions.appendChild(itemAction("trash", "Delete item and its nested items", "delete", item.id, "is-delete"));
        row.appendChild(actions);

        wrapper.appendChild(row);
        return wrapper;
    }

    function itemAction(iconName, label, action, itemId, extraClass) {
        var button = document.createElement("button");
        button.type = "button";
        button.className = "todo-item-action" + (extraClass ? " " + extraClass : "");
        button.dataset.itemAction = action;
        button.dataset.itemId = itemId;
        button.setAttribute("aria-label", label);
        button.innerHTML = icon(iconName);
        button.addEventListener("click", function () {
            runItemAction(action, itemId);
        });
        return button;
    }

    function findItemContext(itemId, items, ancestors) {
        items = items || (getActiveNote() ? getActiveNote().items : []);
        ancestors = ancestors || [];
        for (var index = 0; index < items.length; index += 1) {
            var item = items[index];
            if (item.id === itemId) {
                return { item: item, array: items, index: index, ancestors: ancestors };
            }
            var found = findItemContext(itemId, item.children, ancestors.concat([{ item: item, array: items, index: index }]));
            if (found) {
                return found;
            }
        }
        return null;
    }

    function itemContains(item, itemId) {
        return item.children.some(function (child) {
            return child.id === itemId || itemContains(child, itemId);
        });
    }

    function moveItemRelative(sourceId, targetId, position) {
        var sourceContext = findItemContext(sourceId);
        var targetContext = findItemContext(targetId);
        if (!sourceContext || !targetContext || sourceId === targetId || itemContains(sourceContext.item, targetId)) {
            return false;
        }

        var movedItem = sourceContext.item;
        sourceContext.array.splice(sourceContext.index, 1);
        targetContext = findItemContext(targetId);
        if (!targetContext) {
            sourceContext.array.splice(sourceContext.index, 0, movedItem);
            return false;
        }

        var insertionIndex = targetContext.index + (position === "after" ? 1 : 0);
        targetContext.array.splice(insertionIndex, 0, movedItem);
        persist();
        renderItems();
        showToast("Item moved " + position + " “" + (targetContext.item.text || "untitled item") + "”.");
        return true;
    }

    function moveItemWithKeyboard(itemId, direction) {
        var context = findItemContext(itemId);
        if (!context) {
            return;
        }

        var isSortedDone = context.item.status === "done";
        var visiblePeers = context.array.filter(function (item) {
            return (item.status === "done") === isSortedDone;
        });
        var visibleIndex = visiblePeers.indexOf(context.item);
        var peer = visiblePeers[visibleIndex + direction];
        if (!peer) {
            showToast(direction < 0 ? "This item is already first." : "This item is already last.");
            return;
        }

        var peerIndex = context.array.indexOf(peer);
        context.array[context.index] = peer;
        context.array[peerIndex] = context.item;
        focusHandleAfterRender = itemId;
        persist();
        renderItems();
        showToast(direction < 0 ? "Item moved up." : "Item moved down.");
    }

    function beginDragPointer(event, itemId) {
        if (event.button !== undefined && event.button !== 0) {
            return;
        }

        clearPendingLongPress();
        if (event.pointerType === "mouse") {
            event.preventDefault();
            startDrag(itemId, event.pointerId, event.clientX, event.clientY);
            return;
        }

        pendingLongPress = {
            itemId: itemId,
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            lastX: event.clientX,
            lastY: event.clientY,
            timer: window.setTimeout(function () {
                if (!pendingLongPress) {
                    return;
                }
                var pending = pendingLongPress;
                pendingLongPress = null;
                startDrag(pending.itemId, pending.pointerId, pending.lastX, pending.lastY);
                if (navigator.vibrate) {
                    navigator.vibrate(18);
                }
            }, 360)
        };
    }

    function clearPendingLongPress() {
        if (!pendingLongPress) {
            return;
        }
        window.clearTimeout(pendingLongPress.timer);
        pendingLongPress = null;
    }

    function startDrag(itemId, pointerId, clientX, clientY) {
        var source = elements.itemList.querySelector('[data-item-id="' + cssEscape(itemId) + '"]');
        if (!source) {
            return;
        }

        var row = source.querySelector(".todo-item__row");
        var rect = row.getBoundingClientRect();
        var ghost = row.cloneNode(true);
        ghost.className = "todo-item__row todo-drag-ghost";
        ghost.setAttribute("aria-hidden", "true");
        ghost.querySelectorAll("input, button").forEach(function (control) {
            control.tabIndex = -1;
        });
        ghost.style.width = rect.width + "px";
        document.body.appendChild(ghost);

        dragSession = {
            itemId: itemId,
            pointerId: pointerId,
            source: source,
            ghost: ghost,
            left: Math.max(12, Math.min(rect.left, window.innerWidth - rect.width - 12)),
            target: null,
            targetId: null,
            position: null
        };
        source.classList.add("is-drag-source");
        document.body.classList.add("todo-dragging");
        updateDrag(clientX, clientY);
    }

    function updateDrag(clientX, clientY) {
        if (!dragSession) {
            return;
        }

        dragSession.ghost.style.transform = "translate3d(" + dragSession.left + "px," + (clientY - 26) + "px,0)";
        clearDropTarget();

        var target = document.elementFromPoint(clientX, clientY);
        var targetItem = target ? target.closest(".todo-item") : null;
        if (targetItem) {
            var targetId = targetItem.dataset.itemId;
            var sourceContext = findItemContext(dragSession.itemId);
            if (targetId !== dragSession.itemId && sourceContext && !itemContains(sourceContext.item, targetId)) {
                var targetRect = targetItem.getBoundingClientRect();
                var position = clientY < targetRect.top + targetRect.height / 2 ? "before" : "after";
                targetItem.classList.add(position === "before" ? "is-drop-before" : "is-drop-after");
                dragSession.target = targetItem;
                dragSession.targetId = targetId;
                dragSession.position = position;
            }
        }

        if (clientY < 72) {
            window.scrollBy(0, -14);
        } else if (clientY > window.innerHeight - 72) {
            window.scrollBy(0, 14);
        }
    }

    function clearDropTarget() {
        if (dragSession && dragSession.target) {
            dragSession.target.classList.remove("is-drop-before", "is-drop-after");
            dragSession.target = null;
            dragSession.targetId = null;
            dragSession.position = null;
        }
    }

    function finishDrag(shouldMove) {
        clearPendingLongPress();
        if (!dragSession) {
            return;
        }

        var sourceId = dragSession.itemId;
        var targetId = dragSession.targetId;
        var position = dragSession.position;
        clearDropTarget();
        dragSession.source.classList.remove("is-drag-source");
        dragSession.ghost.remove();
        document.body.classList.remove("todo-dragging");
        dragSession = null;

        if (shouldMove && targetId && position) {
            moveItemRelative(sourceId, targetId, position);
        }
    }

    document.addEventListener("pointermove", function (event) {
        if (pendingTileDrag && event.pointerId === pendingTileDrag.pointerId) {
            pendingTileDrag.lastX = event.clientX;
            pendingTileDrag.lastY = event.clientY;
            var tileDistance = Math.hypot(event.clientX - pendingTileDrag.startX, event.clientY - pendingTileDrag.startY);
            if (pendingTileDrag.pointerType === "mouse" && tileDistance > 6) {
                var pendingTile = pendingTileDrag;
                clearPendingTileDrag();
                startTileDrag(pendingTile);
            } else if (pendingTileDrag && pendingTileDrag.pointerType !== "mouse" && tileDistance > 8) {
                clearPendingTileDrag();
            }
        }

        if (pendingLongPress && event.pointerId === pendingLongPress.pointerId) {
            pendingLongPress.lastX = event.clientX;
            pendingLongPress.lastY = event.clientY;
            if (Math.hypot(event.clientX - pendingLongPress.startX, event.clientY - pendingLongPress.startY) > 8) {
                clearPendingLongPress();
            }
        }

        if (dragSession && event.pointerId === dragSession.pointerId) {
            event.preventDefault();
            updateDrag(event.clientX, event.clientY);
        }
        if (tileDragSession && event.pointerId === tileDragSession.pointerId) {
            event.preventDefault();
            updateTileDrag(event.clientX, event.clientY);
        }
    }, { passive: false });

    document.addEventListener("pointerup", function (event) {
        if (pendingTileDrag && event.pointerId === pendingTileDrag.pointerId) {
            clearPendingTileDrag();
        }
        if (pendingLongPress && event.pointerId === pendingLongPress.pointerId) {
            clearPendingLongPress();
        }
        if (dragSession && event.pointerId === dragSession.pointerId) {
            event.preventDefault();
            finishDrag(true);
        }
        if (tileDragSession && event.pointerId === tileDragSession.pointerId) {
            event.preventDefault();
            finishTileDrag(true);
        }
    });

    document.addEventListener("pointercancel", function (event) {
        if (pendingTileDrag && event.pointerId === pendingTileDrag.pointerId) {
            clearPendingTileDrag();
        }
        if (pendingLongPress && event.pointerId === pendingLongPress.pointerId) {
            clearPendingLongPress();
        }
        if (dragSession && event.pointerId === dragSession.pointerId) {
            finishDrag(false);
        }
        if (tileDragSession && event.pointerId === tileDragSession.pointerId) {
            finishTileDrag(false);
        }
    });

    function runItemAction(action, itemId) {
        var context = findItemContext(itemId);
        if (!context) {
            return;
        }

        if (action === "child") {
            var child = newItem("");
            context.item.children.push(child);
            context.item.collapsed = false;
            focusAfterRender = child.id;
        } else if (action === "indent") {
            if (context.index === 0) {
                showToast("There is no previous item to nest under.");
                return;
            }
            var previous = context.array[context.index - 1];
            context.array.splice(context.index, 1);
            previous.children.push(context.item);
            previous.collapsed = false;
            focusAfterRender = context.item.id;
        } else if (action === "outdent") {
            if (!context.ancestors.length) {
                showToast("This item is already at the top level.");
                return;
            }
            var parentContext = context.ancestors[context.ancestors.length - 1];
            context.array.splice(context.index, 1);
            var currentParentIndex = parentContext.array.indexOf(parentContext.item);
            parentContext.array.splice(currentParentIndex + 1, 0, context.item);
            focusAfterRender = context.item.id;
        } else if (action === "delete") {
            context.array.splice(context.index, 1);
        }

        persist();
        renderItems();
    }

    function handleItemKeydown(event, itemId) {
        var context = findItemContext(itemId);
        if (!context) {
            return;
        }

        if (event.key === "Enter") {
            event.preventDefault();
            var sibling = newItem("");
            context.array.splice(context.index + 1, 0, sibling);
            focusAfterRender = sibling.id;
            persist();
            renderItems();
            return;
        }

        if (event.key === "Tab") {
            event.preventDefault();
            runItemAction(event.shiftKey ? "outdent" : "indent", itemId);
            return;
        }

        if (event.key === "Backspace" && !context.item.text && !context.item.children.length) {
            event.preventDefault();
            var target = context.array[context.index - 1] || (context.ancestors.length ? context.ancestors[context.ancestors.length - 1].item : null);
            context.array.splice(context.index, 1);
            focusAfterRender = target ? target.id : null;
            persist();
            renderItems();
        }
    }

    function addRootItem() {
        var note = getActiveNote();
        if (!note) {
            return;
        }
        var item = newItem("");
        note.items.push(item);
        focusAfterRender = item.id;
        persist();
        renderItems();
    }

    function deleteActiveNote() {
        var note = getActiveNote();
        if (!note || !window.confirm("Delete this note and all of its nested items?")) {
            return;
        }

        state.deletedNotes[note.id] = new Date().toISOString();
        state.notes = state.notes.filter(function (candidate) { return candidate.id !== note.id; });
        activeNoteId = null;
        persist();
        showToast("Note deleted.");
        if (returnGroupId && getGroup(returnGroupId)) {
            openGroup(returnGroupId);
        } else {
            renderHome();
        }
    }

    function openModal(modal) {
        modal.hidden = false;
        modal.setAttribute("aria-hidden", "false");
        document.body.classList.add("todo-modal-open");
        window.setTimeout(function () {
            var focusable = modal.querySelector("input:not([readonly]), button:not([data-close-modal]):not([data-close-group-modal]):not([data-close-calendar-event]):not([data-close-sync-conflict])");
            if (focusable) {
                focusable.focus();
            }
        }, 0);
    }

    function closeModal(modal) {
        modal.hidden = true;
        modal.setAttribute("aria-hidden", "true");
        if (elements.settingsModal.hidden && elements.groupModal.hidden && elements.calendarEventModal.hidden && elements.syncConflictModal.hidden) {
            document.body.classList.remove("todo-modal-open");
        }
    }

    function openSettings() {
        elements.currentSyncKey.value = syncKey;
        elements.otherSyncKey.value = "";
        openModal(elements.settingsModal);
    }

    function renderGroupColors() {
        clear(elements.groupColors);
        GROUP_COLORS.forEach(function (color, index) {
            var label = document.createElement("label");
            label.className = "todo-color-option";
            var input = document.createElement("input");
            input.type = "radio";
            input.name = "groupColor";
            input.value = color;
            input.checked = index === 0;
            input.setAttribute("aria-label", "Colour " + (index + 1));
            var swatch = document.createElement("span");
            swatch.style.setProperty("--swatch", color);
            label.append(input, swatch);
            elements.groupColors.appendChild(label);
        });
    }

    function createGroup(event) {
        event.preventDefault();
        var name = elements.groupName.value.trim();
        var selected = elements.groupColors.querySelector('input[name="groupColor"]:checked');
        if (!name || !selected) {
            return;
        }

        var now = new Date().toISOString();
        var group = {
            id: createId("group"),
            name: name,
            color: selected.value,
            createdAt: now,
            manualOrder: null,
            orderUpdatedAt: now
        };
        state.groups.push(group);
        rewriteGroupOrder(orderedGroups().filter(function (candidate) {
            return candidate.id !== CALENDAR_GROUP_ID;
        }), now);
        var activeNote = groupModalContext === "editor" ? getActiveNote() : null;
        if (activeNote) {
            activeNote.groupId = group.id;
            returnGroupId = group.id;
        }
        persist();
        closeModal(elements.groupModal);
        elements.groupForm.reset();
        renderGroupColors();
        if (activeNote) {
            renderEditor();
            showToast("Created “" + name + "” and moved this note there.");
        } else {
            renderHome();
            showToast(name + " is ready.");
        }
    }

    function exportDocument() {
        var blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
        var url = URL.createObjectURL(blob);
        var link = document.createElement("a");
        link.href = url;
        link.download = "todo-backup-" + new Date().toISOString().slice(0, 10) + ".json";
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        showToast("Backup exported.");
    }

    function importDocument(file) {
        if (!file) {
            return;
        }
        var reader = new FileReader();
        reader.addEventListener("load", function () {
            try {
                var imported = normalizeDocument(JSON.parse(String(reader.result)));
                if (!window.confirm("Replace the current notes with this backup?")) {
                    return;
                }
                state = imported;
                activeView = "home";
                activeGroupId = null;
                activeNoteId = null;
                persist();
                closeModal(elements.settingsModal);
                renderHome();
                showToast("Backup restored.");
            } catch (error) {
                showToast("That file is not a valid todo backup.");
            } finally {
                elements.importFile.value = "";
            }
        });
        reader.readAsText(file);
    }

    function documentsHaveSameContent(first, second) {
        var firstCopy = normalizeDocument(first);
        var secondCopy = normalizeDocument(second);
        firstCopy.updatedAt = "";
        secondCopy.updatedAt = "";
        return JSON.stringify(firstCopy) === JSON.stringify(secondCopy);
    }

    function syncSaveStats(documentValue) {
        var documentCopy = normalizeDocument(documentValue);
        return {
            notes: documentCopy.notes.length,
            items: documentCopy.notes.reduce(function (total, note) { return total + countItems(note.items); }, 0),
            events: documentCopy.calendarEvents.length,
            updatedAt: documentCopy.updatedAt
        };
    }

    function syncSaveTime(value) {
        var date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return "Update time unavailable";
        }
        return "Last changed " + new Intl.DateTimeFormat(undefined, {
            dateStyle: "medium",
            timeStyle: "short"
        }).format(date);
    }

    function renderSyncSave(prefix, documentValue) {
        var stats = syncSaveStats(documentValue);
        elements[prefix + "SyncNotes"].textContent = plural(stats.notes, "note");
        elements[prefix + "SyncItems"].textContent = plural(stats.items, "checklist item");
        elements[prefix + "SyncEvents"].textContent = plural(stats.events, "calendar event");
        elements[prefix + "SyncUpdated"].textContent = syncSaveTime(stats.updatedAt);
    }

    function adoptSyncKey(key) {
        syncKey = key;
        localStorage.setItem(SYNC_KEY, syncKey);
        elements.currentSyncKey.value = syncKey;
        elements.otherSyncKey.value = "";
    }

    function showSyncConflict(key, localDocument, remoteDocument) {
        pendingSyncConflict = {
            key: key,
            localDocument: normalizeDocument(localDocument),
            remoteDocument: normalizeDocument(remoteDocument)
        };
        renderSyncSave("local", pendingSyncConflict.localDocument);
        renderSyncSave("server", pendingSyncConflict.remoteDocument);
        closeModal(elements.settingsModal);
        openModal(elements.syncConflictModal);
        window.setTimeout(function () { elements.mergeSyncButton.focus(); }, 0);
    }

    function closeSyncConflict(force) {
        if (syncConflictResolving && !force) {
            return;
        }
        pendingSyncConflict = null;
        closeModal(elements.syncConflictModal);
    }

    function setSyncConflictBusy(busy, activeButton) {
        syncConflictResolving = busy;
        [elements.useLocalSyncButton, elements.useServerSyncButton, elements.mergeSyncButton].forEach(function (button) {
            button.disabled = busy;
        });
        elements.useLocalSyncButton.textContent = "Use this device";
        elements.useServerSyncButton.textContent = "Use server";
        elements.mergeSyncButton.textContent = "Combine both saves (recommended)";
        if (busy && activeButton) {
            activeButton.textContent = "Connecting...";
        }
    }

    async function uploadConflictDocument(conflict, combine) {
        var candidate = normalizeDocument(conflict.localDocument);
        for (var attempt = 0; attempt < 5; attempt += 1) {
            var latest = await readCloud(conflict.key);
            var documentToUpload = combine && !latest.missing
                ? mergeDocuments(candidate, latest.document)
                : normalizeDocument(candidate);
            documentToUpload.updatedAt = new Date().toISOString();
            var response = await writeCloud(conflict.key, documentToUpload, latest.etag);
            if (response.status === 412) {
                continue;
            }
            if (!response.ok) {
                throw new Error("Sync returned " + response.status + ".");
            }
            return documentToUpload;
        }
        throw new Error("The server save kept changing. Please try again.");
    }

    function applyChosenSyncDocument(key, documentValue) {
        window.clearTimeout(pushTimer);
        mutationSequence += 1;
        state = normalizeDocument(documentValue);
        adoptSyncKey(key);
        saveLocalDocument();
        activeView = "home";
        activeGroupId = null;
        activeNoteId = null;
        returnGroupId = null;
        renderHome();
        if (!elements.settingsModal.hidden) {
            closeModal(elements.settingsModal);
        }
        closeSyncConflict(true);
        setEditorSaved(false);
        setSyncStatus("Synced", false);
    }

    async function resolveSyncConflict(mode, activeButton) {
        if (!pendingSyncConflict) {
            return;
        }
        var conflict = pendingSyncConflict;
        setSyncConflictBusy(true, activeButton);
        try {
            var chosenDocument;
            if (mode === "server") {
                var latest = await readCloud(conflict.key);
                if (latest.missing) {
                    throw new Error("That server save no longer exists.");
                }
                chosenDocument = latest.document;
            } else {
                chosenDocument = await uploadConflictDocument(conflict, mode === "merge");
            }
            applyChosenSyncDocument(conflict.key, chosenDocument);
            showToast(mode === "merge" ? "Both saves combined and connected." : "Your chosen save is now connected.");
        } catch (error) {
            console.warn("Todo sync choice failed.", error);
            setSyncStatus("Saved locally", true);
            showToast(error.message || "Could not connect. Both saves are still safe.");
        } finally {
            setSyncConflictBusy(false, null);
        }
    }

    async function connectExistingKey(event) {
        event.preventDefault();
        var candidate = elements.otherSyncKey.value.trim();
        if (!/^[A-Za-z0-9_-]{24,128}$/.test(candidate)) {
            showToast("That sync key does not look valid.");
            return;
        }

        var submitButton = event.currentTarget.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = "Comparing...";
        syncConnectionPending = true;
        try {
            if (syncPromise) {
                await syncPromise;
            }
            var remoteResult = await readCloud(candidate);
            if (remoteResult.missing) {
                throw new Error("No server save was found for that key. Check that every character matches.");
            }
            var localSnapshot = normalizeDocument(state);
            if (documentsHaveSameContent(localSnapshot, remoteResult.document)) {
                applyChosenSyncDocument(candidate, remoteResult.document);
                showToast("This device is connected to the shared save.");
                return;
            }
            showSyncConflict(candidate, localSnapshot, remoteResult.document);
        } catch (error) {
            console.warn("Could not compare sync saves.", error);
            showToast(error.message || "Could not compare the two saves.");
        } finally {
            syncConnectionPending = false;
            submitButton.disabled = false;
            submitButton.textContent = "Compare and connect";
        }
    }

    function showToast(message) {
        window.clearTimeout(toastTimer);
        elements.toast.textContent = message;
        elements.toast.classList.add("is-visible");
        toastTimer = window.setTimeout(function () {
            elements.toast.classList.remove("is-visible");
        }, 3200);
    }

    function plural(value, word) {
        return value + " " + word + (value === 1 ? "" : "s");
    }

    function byUpdatedDescending(a, b) {
        return (Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0);
    }

    function relativeDate(value) {
        var timestamp = Date.parse(value);
        if (!timestamp) {
            return "";
        }
        var difference = Date.now() - timestamp;
        if (difference < 60000) {
            return "now";
        }
        if (difference < 3600000) {
            return Math.floor(difference / 60000) + "m";
        }
        if (difference < 86400000) {
            return Math.floor(difference / 3600000) + "h";
        }
        if (difference < 604800000) {
            return Math.floor(difference / 86400000) + "d";
        }
        return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(timestamp));
    }

    function cssEscape(value) {
        if (window.CSS && typeof window.CSS.escape === "function") {
            return window.CSS.escape(value);
        }
        return value.replace(/["\\]/g, "\\$&");
    }

    document.getElementById("homeButton").addEventListener("click", renderHome);
    document.getElementById("newGroupButton").addEventListener("click", function () {
        groupModalContext = "home";
        elements.groupName.value = "";
        openModal(elements.groupModal);
    });
    document.getElementById("newGroupFromEditorButton").addEventListener("click", function () {
        groupModalContext = "editor";
        elements.groupName.value = "";
        openModal(elements.groupModal);
    });
    document.getElementById("newGroupNoteButton").addEventListener("click", function () {
        createNote(activeGroupId || defaultNoteGroupId(), null);
    });
    document.querySelectorAll('[data-action="back-home"]').forEach(function (button) {
        button.addEventListener("click", renderHome);
    });
    document.querySelectorAll('[data-action="close-editor"]').forEach(function (button) {
        button.addEventListener("click", closeEditor);
    });
    elements.search.addEventListener("input", renderHome);
    elements.noteTitle.addEventListener("input", function () {
        var note = getActiveNote();
        if (note) {
            note.title = elements.noteTitle.value;
            persist();
        }
    });
    elements.noteGroup.addEventListener("change", function () {
        var note = getActiveNote();
        if (note) {
            note.groupId = elements.noteGroup.value;
            returnGroupId = note.groupId;
            persist();
            var destination = getGroup(note.groupId);
            showToast("Moved to “" + (destination ? destination.name : "group") + "”.");
        }
    });
    document.getElementById("addRootItemButton").addEventListener("click", addRootItem);
    elements.emptyAddButton.addEventListener("click", addRootItem);
    elements.editorMenuButton.addEventListener("click", function () {
        var willOpen = elements.editorMenu.hidden;
        elements.editorMenu.hidden = !willOpen;
        elements.editorMenuButton.setAttribute("aria-expanded", willOpen ? "true" : "false");
    });
    elements.pinNoteButton.addEventListener("click", function () {
        elements.editorMenu.hidden = true;
        elements.editorMenuButton.setAttribute("aria-expanded", "false");
        if (activeNoteId) {
            toggleNotePin(activeNoteId);
        }
    });
    elements.moveNoteFirstButton.addEventListener("click", function () {
        elements.editorMenu.hidden = true;
        elements.editorMenuButton.setAttribute("aria-expanded", "false");
        if (activeNoteId) {
            moveNoteToFirst(activeNoteId);
        }
    });
    document.getElementById("duplicateNoteButton").addEventListener("click", function () {
        var source = getActiveNote();
        if (source) {
            elements.editorMenu.hidden = true;
            createNote(source.groupId, source);
            showToast("Note duplicated.");
        }
    });
    document.getElementById("deleteNoteButton").addEventListener("click", deleteActiveNote);
    elements.syncButton.addEventListener("click", openSettings);
    document.querySelectorAll("[data-close-modal]").forEach(function (button) {
        button.addEventListener("click", function () { closeModal(elements.settingsModal); });
    });
    document.querySelectorAll("[data-close-group-modal]").forEach(function (button) {
        button.addEventListener("click", function () { closeModal(elements.groupModal); });
    });
    document.querySelectorAll("[data-close-calendar-event]").forEach(function (button) {
        button.addEventListener("click", function () {
            activeCalendarEventId = null;
            closeModal(elements.calendarEventModal);
        });
    });
    document.querySelectorAll("[data-close-sync-conflict]").forEach(function (button) {
        button.addEventListener("click", function () { closeSyncConflict(false); });
    });
    document.getElementById("previousDayButton").addEventListener("click", function () {
        renderCalendar(shiftDateKey(selectedCalendarDate, -1), true);
    });
    document.getElementById("nextDayButton").addEventListener("click", function () {
        renderCalendar(shiftDateKey(selectedCalendarDate, 1), true);
    });
    document.getElementById("calendarTodayButton").addEventListener("click", function () {
        renderCalendar(localDateKey(new Date()), true);
    });
    elements.calendarDatePicker.addEventListener("change", function () {
        if (elements.calendarDatePicker.value) {
            renderCalendar(elements.calendarDatePicker.value, true);
        }
    });
    elements.calendarEventForm.addEventListener("submit", saveCalendarEvent);
    elements.deleteCalendarEventButton.addEventListener("click", deleteCalendarEvent);
    elements.groupForm.addEventListener("submit", createGroup);
    document.getElementById("copySyncKeyButton").addEventListener("click", async function () {
        try {
            await navigator.clipboard.writeText(syncKey);
            showToast("Sync key copied.");
        } catch (error) {
            elements.currentSyncKey.select();
            document.execCommand("copy");
            showToast("Sync key copied.");
        }
    });
    document.getElementById("syncNowButton").addEventListener("click", function () { pushCloud(true); });
    document.getElementById("connectSyncForm").addEventListener("submit", connectExistingKey);
    elements.useLocalSyncButton.addEventListener("click", function () {
        resolveSyncConflict("local", elements.useLocalSyncButton);
    });
    elements.useServerSyncButton.addEventListener("click", function () {
        resolveSyncConflict("server", elements.useServerSyncButton);
    });
    elements.mergeSyncButton.addEventListener("click", function () {
        resolveSyncConflict("merge", elements.mergeSyncButton);
    });
    document.getElementById("exportButton").addEventListener("click", exportDocument);
    document.getElementById("importButton").addEventListener("click", function () { elements.importFile.click(); });
    elements.importFile.addEventListener("change", function () { importDocument(elements.importFile.files[0]); });

    document.addEventListener("keydown", function (event) {
        if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === "k") {
            event.preventDefault();
            renderHome();
            elements.search.focus();
        }

        if (event.key === "Escape") {
            if (dragSession) {
                finishDrag(false);
            } else if (!elements.syncConflictModal.hidden) {
                closeSyncConflict(false);
            } else if (!elements.calendarEventModal.hidden) {
                activeCalendarEventId = null;
                closeModal(elements.calendarEventModal);
            } else if (!elements.settingsModal.hidden) {
                closeModal(elements.settingsModal);
            } else if (!elements.groupModal.hidden) {
                closeModal(elements.groupModal);
            } else if (!elements.editorMenu.hidden) {
                elements.editorMenu.hidden = true;
                elements.editorMenuButton.setAttribute("aria-expanded", "false");
            } else if (activeView === "editor") {
                closeEditor();
            } else if (activeView === "group") {
                renderHome();
            } else if (activeView === "calendar") {
                renderHome();
            }
        }
    });

    window.addEventListener("storage", function (event) {
        if (event.key === STORAGE_KEY && event.newValue) {
            try {
                var incoming = normalizeDocument(JSON.parse(event.newValue));
                var merged = mergeDocuments(state, incoming);
                if (!documentsEqual(state, merged)) {
                    state = merged;
                    renderCurrentView();
                    setSyncStatus("Updated", false);
                }
            } catch (error) {
                console.warn("Ignored an invalid todo update from another tab.", error);
            }
        }
    });

    window.addEventListener("online", function () {
        setSyncStatus("Back online", false);
        syncCloud();
    });
    window.addEventListener("offline", function () {
        setSyncStatus("Saved locally", true);
    });
    window.addEventListener("beforeunload", function () {
        saveLocalDocument();
    });

    function requestBackgroundSync() {
        if (navigator.onLine && !pendingSyncConflict && !syncConflictResolving) {
            syncCloud({ quiet: true });
        }
    }

    document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "visible") {
            requestBackgroundSync();
        }
    });
    window.addEventListener("focus", requestBackgroundSync);
    window.setInterval(requestBackgroundSync, CLOUD_POLL_INTERVAL);
    currentTimeTimer = window.setInterval(updateCurrentTimeLine, 60000);

    renderGroupColors();
    renderHome();
    if (navigator.onLine) {
        syncCloud();
    } else {
        setSyncStatus("Saved locally", true);
    }
})();
