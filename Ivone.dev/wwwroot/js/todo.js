(function () {
    "use strict";

    var STORAGE_KEY = "ivone.todo.document.v1";
    var DEVICE_KEY = "ivone.todo.device-id.v1";
    var DATABASE_SYNC_PENDING_KEY = "ivone.todo.database-sync-pending.v1";
    var DATABASE_SYNC_READY_KEY = "ivone.todo.database-sync-ready.v1";
    var CLOUD_POLL_INTERVAL = 5000;
    var CALENDAR_GROUP_ID = "calendar";
    var GOALS_COLOR = "#6d4cc7";
    var MEASUREMENTS_COLOR = "#167d89";
    var RECIPES_COLOR = "#b4532a";
    var CALENDAR_HOUR_HEIGHT = 72;
    var MEASUREMENT_FIELDS = [
        { key: "dailyCalories", label: "Daily calorie target", kind: "calories" },
        { key: "weightKg", label: "Weight", kind: "weight" },
        { key: "bodyFatPercent", label: "Body fat", kind: "percent" },
        { key: "neckCm", label: "Neck", kind: "length" },
        { key: "shouldersCm", label: "Shoulders", kind: "length" },
        { key: "chestCm", label: "Chest", kind: "length" },
        { key: "waistCm", label: "Waist", kind: "length" },
        { key: "hipsCm", label: "Hips (widest)", kind: "length" },
        { key: "upperArmRelaxedCm", label: "Arm relaxed", kind: "length" },
        { key: "upperArmFlexedCm", label: "Arm flexed", kind: "length" },
        { key: "leftUpperArmCm", label: "Left upper arm", kind: "length" },
        { key: "rightUpperArmCm", label: "Right upper arm", kind: "length" },
        { key: "leftForearmCm", label: "Left forearm", kind: "length" },
        { key: "rightForearmCm", label: "Right forearm", kind: "length" },
        { key: "leftThighCm", label: "Left thigh", kind: "length" },
        { key: "rightThighCm", label: "Right thigh", kind: "length" },
        { key: "leftCalfCm", label: "Left calf", kind: "length" },
        { key: "rightCalfCm", label: "Right calf", kind: "length" }
    ];
    var MACRO_FIELDS = [
        { key: "calories", label: "calories", pattern: "(?:kilocalories?|kcal(?:ories?)?s?|ccals?|calories?|calory|cals?|energy)", maximum: 20000 },
        { key: "proteinG", label: "protein", pattern: "(?:proteins?|prot(?:ein)?|pro|p)", maximum: 5000 },
        { key: "carbsG", label: "carbs", pattern: "(?:carbohydrates?|carbs?|carb|cho|c)", maximum: 5000 },
        { key: "fatG", label: "fat", pattern: "(?:fats?|lipids?|lipid|f)", maximum: 5000 }
    ];
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
        goalsView: document.getElementById("goalsView"),
        measurementsView: document.getElementById("measurementsView"),
        recipesView: document.getElementById("recipesView"),
        recipeEditorView: document.getElementById("recipeEditorView"),
        homeGrid: document.getElementById("homeGrid"),
        homeTodayDashboard: document.getElementById("homeTodayDashboard"),
        homeTodayCalendarButton: document.getElementById("homeTodayCalendarButton"),
        homeTodayCalories: document.getElementById("homeTodayCalories"),
        homeTodayCalorieTarget: document.getElementById("homeTodayCalorieTarget"),
        homeTodayCalorieProgress: document.getElementById("homeTodayCalorieProgress"),
        homeTodayCalorieStatus: document.getElementById("homeTodayCalorieStatus"),
        homeTodayProtein: document.getElementById("homeTodayProtein"),
        homeTodayCarbs: document.getElementById("homeTodayCarbs"),
        homeTodayFat: document.getElementById("homeTodayFat"),
        homeTodayNextEvent: document.getElementById("homeTodayNextEvent"),
        homeTodayNextEventTitle: document.getElementById("homeTodayNextEventTitle"),
        homeTodayNextEventTime: document.getElementById("homeTodayNextEventTime"),
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
        calendarCaloriesConsumed: document.getElementById("calendarCaloriesConsumed"),
        calendarCaloriesTarget: document.getElementById("calendarCaloriesTarget"),
        calendarCaloriesProgress: document.getElementById("calendarCaloriesProgress"),
        calendarCaloriesRemaining: document.getElementById("calendarCaloriesRemaining"),
        calendarProteinTotal: document.getElementById("calendarProteinTotal"),
        calendarCarbsTotal: document.getElementById("calendarCarbsTotal"),
        calendarFatTotal: document.getElementById("calendarFatTotal"),
        calendarNutritionTargetButton: document.getElementById("calendarNutritionTargetButton"),
        calendarEventModal: document.getElementById("calendarEventModal"),
        calendarEventForm: document.getElementById("calendarEventForm"),
        calendarEventFormTitle: document.getElementById("calendarEventFormTitle"),
        calendarEventTitle: document.getElementById("calendarEventTitle"),
        calendarEventDate: document.getElementById("calendarEventDate"),
        calendarEventTime: document.getElementById("calendarEventTime"),
        calendarEventDuration: document.getElementById("calendarEventDuration"),
        deleteCalendarEventButton: document.getElementById("deleteCalendarEventButton"),
        mealModal: document.getElementById("mealModal"),
        mealForm: document.getElementById("mealForm"),
        mealFormTitle: document.getElementById("mealFormTitle"),
        mealFormContext: document.getElementById("mealFormContext"),
        mealRecipeSelect: document.getElementById("mealRecipeSelect"),
        mealRecipeHelp: document.getElementById("mealRecipeHelp"),
        mealPortionPercent: document.getElementById("mealPortionPercent"),
        mealMacroFields: document.getElementById("mealMacroFields"),
        mealMacroHelp: document.getElementById("mealMacroHelp"),
        mealMacroInputs: Array.from(document.querySelectorAll("[data-meal-macro]")),
        mealFormError: document.getElementById("mealFormError"),
        saveMealButton: document.getElementById("saveMealButton"),
        deleteMealButton: document.getElementById("deleteMealButton"),
        goalForm: document.getElementById("goalForm"),
        goalTitle: document.getElementById("goalTitle"),
        goalDeadline: document.getElementById("goalDeadline"),
        goalIsMain: document.getElementById("goalIsMain"),
        goalsSummary: document.getElementById("goalsSummary"),
        goalsList: document.getElementById("goalsList"),
        measurementForm: document.getElementById("measurementForm"),
        measurementFormTitle: document.getElementById("measurementFormTitle"),
        measurementDate: document.getElementById("measurementDate"),
        measurementUnit: document.getElementById("measurementUnit"),
        measurementSimplified: document.getElementById("measurementSimplified"),
        measurementNotes: document.getElementById("measurementNotes"),
        measurementCancelEdit: document.getElementById("measurementCancelEdit"),
        measurementLatest: document.getElementById("measurementLatest"),
        measurementHistorySummary: document.getElementById("measurementHistorySummary"),
        measurementHistory: document.getElementById("measurementHistory"),
        recipesList: document.getElementById("recipesList"),
        recipesSummary: document.getElementById("recipesSummary"),
        recipeSearch: document.getElementById("recipeSearch"),
        recipeEditorKindLabel: document.getElementById("recipeEditorKindLabel"),
        recipeTitleLabel: document.getElementById("recipeTitleLabel"),
        recipeTitle: document.getElementById("recipeTitle"),
        recipePreparationFields: document.getElementById("recipePreparationFields"),
        recipeIngredients: document.getElementById("recipeIngredients"),
        recipeMethod: document.getElementById("recipeMethod"),
        recipeNotes: document.getElementById("recipeNotes"),
        recipeNotesHelp: document.getElementById("recipeNotesHelp"),
        recipeNotesLabelText: document.getElementById("recipeNotesLabelText"),
        recipeMacroText: document.getElementById("recipeMacroText"),
        recipeMacroStatus: document.getElementById("recipeMacroStatus"),
        recipeMacrosBasis: document.getElementById("recipeMacrosBasis"),
        recipeMacroInputs: Array.from(document.querySelectorAll("[data-recipe-macro]")),
        recipeIngredientCount: document.getElementById("recipeIngredientCount"),
        recipeMethodCount: document.getElementById("recipeMethodCount"),
        recipeSaveState: document.getElementById("recipeSaveState"),
        recipeSaveWrap: document.querySelector(".todo-recipe-save-state"),
        settingsModal: document.getElementById("settingsModal"),
        syncConflictModal: document.getElementById("syncConflictModal"),
        localSyncNotes: document.getElementById("localSyncNotes"),
        localSyncItems: document.getElementById("localSyncItems"),
        localSyncEvents: document.getElementById("localSyncEvents"),
        localSyncMeals: document.getElementById("localSyncMeals"),
        localSyncGoals: document.getElementById("localSyncGoals"),
        localSyncMeasurements: document.getElementById("localSyncMeasurements"),
        localSyncRecipes: document.getElementById("localSyncRecipes"),
        localSyncUpdated: document.getElementById("localSyncUpdated"),
        serverSyncNotes: document.getElementById("serverSyncNotes"),
        serverSyncItems: document.getElementById("serverSyncItems"),
        serverSyncEvents: document.getElementById("serverSyncEvents"),
        serverSyncMeals: document.getElementById("serverSyncMeals"),
        serverSyncGoals: document.getElementById("serverSyncGoals"),
        serverSyncMeasurements: document.getElementById("serverSyncMeasurements"),
        serverSyncRecipes: document.getElementById("serverSyncRecipes"),
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
        syncNowButton: document.getElementById("syncNowButton"),
        importFile: document.getElementById("importFile"),
        toast: document.getElementById("todoToast")
    };

    var deviceId = getOrCreateDeviceId();
    var loaded = loadLocalDocument();
    var state = loaded.document;
    if (loaded.exists && localStorage.getItem(DATABASE_SYNC_READY_KEY) !== "1") {
        localStorage.setItem(DATABASE_SYNC_PENDING_KEY, "1");
    }
    var syncKey = "shared";
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
    var activeMealEntryId = null;
    var pendingMealDate = null;
    var pendingMealStartMinutes = 0;
    var activeMeasurementId = null;
    var activeRecipeId = null;
    var currentTimeTimer = 0;
    var pendingSyncConflict = null;
    var syncConflictResolving = false;
    var syncConnectionPending = false;
    var initialPaintComplete = false;

    function createId(prefix) {
        if (window.crypto && typeof window.crypto.randomUUID === "function") {
            return prefix + "-" + window.crypto.randomUUID();
        }

        return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
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
            version: 10,
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
            deletedCalendarEvents: {},
            mealEntries: [],
            deletedMealEntries: {},
            goals: [],
            deletedGoals: {},
            measurementUnit: "metric",
            measurementSimplified: true,
            measurementEntries: [],
            deletedMeasurementEntries: {},
            recipes: [],
            deletedRecipes: {}
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

        var deletedMealEntries = {};
        if (value.deletedMealEntries && typeof value.deletedMealEntries === "object" && !Array.isArray(value.deletedMealEntries)) {
            Object.keys(value.deletedMealEntries).sort().forEach(function (mealId) {
                if (value.deletedMealEntries[mealId]) {
                    deletedMealEntries[String(mealId)] = String(value.deletedMealEntries[mealId]);
                }
            });
        }

        var mealEntries = Array.isArray(value.mealEntries) ? value.mealEntries.filter(Boolean).map(function (meal) {
            var portionPercent = Number(meal.portionPercent);
            return {
                id: String(meal.id || createId("meal")),
                date: /^\d{4}-\d{2}-\d{2}$/.test(meal.date || "") ? meal.date : localDateKey(new Date()),
                startMinutes: Math.max(0, Math.min(1380, Math.round((Number(meal.startMinutes) || 0) / 60) * 60)),
                recipeId: String(meal.recipeId || ""),
                recipeTitle: String(meal.recipeTitle || "Deleted recipe").slice(0, 180),
                portionPercent: Number.isFinite(portionPercent) ? Math.max(1, Math.min(1000, Math.round(portionPercent * 10) / 10)) : 100,
                macros: normalizeRecipeMacros(meal.macros),
                createdAt: meal.createdAt || now,
                updatedAt: meal.updatedAt || now
            };
        }).filter(function (meal) { return !deletedMealEntries[meal.id]; }) : [];
        mealEntries.sort(function (a, b) { return a.id.localeCompare(b.id); });

        var deletedGoals = {};
        if (value.deletedGoals && typeof value.deletedGoals === "object" && !Array.isArray(value.deletedGoals)) {
            Object.keys(value.deletedGoals).sort().forEach(function (goalId) {
                if (value.deletedGoals[goalId]) {
                    deletedGoals[String(goalId)] = String(value.deletedGoals[goalId]);
                }
            });
        }

        var goals = Array.isArray(value.goals) ? value.goals.filter(Boolean).map(function (goal) {
            return {
                id: String(goal.id || createId("goal")),
                title: String(goal.title || "Untitled goal").slice(0, 180),
                deadline: /^\d{4}-\d{2}-\d{2}$/.test(goal.deadline || "") ? goal.deadline : localDateKey(new Date()),
                isMain: Boolean(goal.isMain),
                completed: Boolean(goal.completed),
                createdAt: goal.createdAt || now,
                updatedAt: goal.updatedAt || now
            };
        }).filter(function (goal) { return !deletedGoals[goal.id]; }) : [];
        goals.sort(function (a, b) { return a.id.localeCompare(b.id); });
        var mainGoals = goals.filter(function (goal) { return goal.isMain && !goal.completed; }).sort(byUpdatedDescending);
        if (mainGoals.length > 1) {
            goals.forEach(function (goal) { goal.isMain = goal.id === mainGoals[0].id; });
        }

        var deletedMeasurementEntries = {};
        if (value.deletedMeasurementEntries && typeof value.deletedMeasurementEntries === "object" && !Array.isArray(value.deletedMeasurementEntries)) {
            Object.keys(value.deletedMeasurementEntries).sort().forEach(function (entryId) {
                if (value.deletedMeasurementEntries[entryId]) {
                    deletedMeasurementEntries[String(entryId)] = String(value.deletedMeasurementEntries[entryId]);
                }
            });
        }

        var measurementEntries = Array.isArray(value.measurementEntries) ? value.measurementEntries.filter(Boolean).map(function (entry) {
            var normalized = {
                id: String(entry.id || createId("measurement")),
                date: /^\d{4}-\d{2}-\d{2}$/.test(entry.date || "") ? entry.date : localDateKey(new Date()),
                note: String(entry.note || "").slice(0, 500),
                createdAt: entry.createdAt || now,
                updatedAt: entry.updatedAt || now
            };
            MEASUREMENT_FIELDS.forEach(function (field) {
                normalized[field.key] = normalizeMeasurementNumber(entry[field.key], field.kind);
            });
            return normalized;
        }).filter(function (entry) {
            return !deletedMeasurementEntries[entry.id] && measurementHasValues(entry);
        }) : [];
        measurementEntries.sort(function (a, b) { return a.id.localeCompare(b.id); });

        var deletedRecipes = {};
        if (value.deletedRecipes && typeof value.deletedRecipes === "object" && !Array.isArray(value.deletedRecipes)) {
            Object.keys(value.deletedRecipes).sort().forEach(function (recipeId) {
                if (value.deletedRecipes[recipeId]) {
                    deletedRecipes[String(recipeId)] = String(value.deletedRecipes[recipeId]);
                }
            });
        }

        var recipes = Array.isArray(value.recipes) ? value.recipes.filter(Boolean).map(function (recipe) {
            return {
                id: String(recipe.id || createId("recipe")),
                kind: recipe.kind === "food" ? "food" : "recipe",
                title: String(recipe.title || "").slice(0, 180),
                ingredients: normalizeRecipeLines(recipe.ingredients),
                method: normalizeRecipeLines(recipe.method),
                notes: String(recipe.notes || "").slice(0, 4000),
                macroText: String(recipe.macroText || "").slice(0, 1000),
                macros: normalizeRecipeMacros(recipe.macros),
                createdAt: recipe.createdAt || now,
                updatedAt: recipe.updatedAt || now
            };
        }).filter(function (recipe) { return !deletedRecipes[recipe.id]; }) : [];
        recipes.sort(function (a, b) { return a.id.localeCompare(b.id); });

        return {
            version: 10,
            updatedAt: value.updatedAt || now,
            groups: groups,
            notes: notes.filter(function (note) { return !deletedNotes[note.id]; }),
            deletedNotes: deletedNotes,
            calendarEvents: calendarEvents,
            deletedCalendarEvents: deletedCalendarEvents,
            mealEntries: mealEntries,
            deletedMealEntries: deletedMealEntries,
            goals: goals,
            deletedGoals: deletedGoals,
            measurementUnit: value.measurementUnit === "imperial" ? "imperial" : "metric",
            measurementSimplified: value.measurementSimplified !== false,
            measurementEntries: measurementEntries,
            deletedMeasurementEntries: deletedMeasurementEntries,
            recipes: recipes,
            deletedRecipes: deletedRecipes
        };
    }

    function normalizeMeasurementNumber(value, kind) {
        if (value === null || value === "" || typeof value === "undefined") {
            return null;
        }
        var number = Number(value);
        var maximum = kind === "calories" ? 20000 : (kind === "percent" ? 80 : (kind === "weight" ? 500 : 400));
        if (!Number.isFinite(number) || number <= 0 || number > maximum) {
            return null;
        }
        return Math.round(number * 100) / 100;
    }

    function measurementHasValues(entry) {
        return MEASUREMENT_FIELDS.some(function (field) {
            return Number.isFinite(entry[field.key]);
        });
    }

    function normalizeRecipeLines(value) {
        var source = Array.isArray(value) ? value : String(value || "").split(/\r?\n/);
        return source.map(function (entry) {
            var line = String(entry || "").replace(/\u00a0/g, " ").trim();
            var previous = "";
            while (line && line !== previous) {
                previous = line;
                line = line
                    .replace(/^(?:[-*•●◦▪▫‣⁃·–—]+|[☐☑✓✔✅]+)\s*/, "")
                    .replace(/^\[[ xX]\]\s*/, "")
                    .replace(/^\(?\d{1,3}\)?[.)\-:]\s*/, "")
                    .replace(/^[a-zA-Z][.)]\s+/, "")
                    .trim();
            }
            return line.replace(/[ \t]+/g, " ").slice(0, 1000);
        }).filter(Boolean).slice(0, 500);
    }

    function emptyRecipeMacros() {
        return {
            calories: null,
            proteinG: null,
            carbsG: null,
            fatG: null
        };
    }

    function macroField(key) {
        return MACRO_FIELDS.find(function (field) { return field.key === key; }) || null;
    }

    function normalizeMacroNumber(value, key) {
        if (value === null || value === "" || typeof value === "undefined") {
            return null;
        }
        var number = Number(value);
        var field = macroField(key);
        if (!field || !Number.isFinite(number) || number < 0 || number > field.maximum) {
            return null;
        }
        return Math.round(number * 10) / 10;
    }

    function normalizeRecipeMacros(value) {
        value = value && typeof value === "object" && !Array.isArray(value) ? value : {};
        var macros = emptyRecipeMacros();
        MACRO_FIELDS.forEach(function (field) {
            macros[field.key] = normalizeMacroNumber(value[field.key], field.key);
        });
        return macros;
    }

    function recipeHasMacros(recipe) {
        return recipe && MACRO_FIELDS.some(function (field) {
            return Number.isFinite(recipe.macros && recipe.macros[field.key]);
        });
    }

    function parseMacroNumberToken(token, key) {
        var compact = String(token || "").replace(/[\s\u202f]/g, "");
        if (key === "calories" && /^\d{1,2}[.,]\d{3}$/.test(compact)) {
            compact = compact.replace(/[.,]/, "");
        } else {
            compact = compact.replace(",", ".");
        }
        return normalizeMacroNumber(Number(compact), key);
    }

    function parseMacroText(value) {
        var source = String(value || "")
            .replace(/\*\*|__/g, "")
            .replace(/\u00a0/g, " ")
            .replace(/[|;]/g, "\n")
            .replace(/(?:калории|калория|калориен|ккал)/gi, " calories ")
            .replace(/(?:протеин|белтъчини|белтък)/gi, " protein ")
            .replace(/(?:въглехидрати|въглехидрат)/gi, " carbs ")
            .replace(/(?:мазнини|мазнина)/gi, " fat ");
        var candidates = [];
        MACRO_FIELDS.forEach(function (field) {
            var compactAlias = field.key === "proteinG"
                ? "p"
                : field.key === "carbsG"
                    ? "c"
                    : field.key === "fatG" ? "f" : null;
            var expression = "\\b" + field.pattern + "\\b";
            if (compactAlias) {
                expression += "|\\b" + compactAlias + "(?=\\s*[:=~≈\\-]?\\s*\\d)";
            }
            var aliasPattern = new RegExp(expression, "gi");
            var match;
            while ((match = aliasPattern.exec(source))) {
                candidates.push({
                    field: field,
                    index: match.index,
                    end: match.index + match[0].length
                });
            }
        });
        candidates.sort(function (a, b) { return a.index - b.index || b.end - a.end; });

        var macros = emptyRecipeMacros();
        var numberPattern = "(\\d+(?:[ \\u202f]\\d{3})*(?:[.,]\\d+)?)";
        candidates.forEach(function (candidate, index) {
            var nextIndex = index + 1 < candidates.length ? candidates[index + 1].index : source.length;
            var after = source.slice(candidate.end, Math.min(nextIndex, candidate.end + 48));
            var afterMatch = after.match(new RegExp("^[^\\d]{0,24}" + numberPattern));
            var token = afterMatch ? afterMatch[1] : null;
            if (!token) {
                var before = source.slice(Math.max(0, candidate.index - 36), candidate.index);
                var beforeMatch = before.match(new RegExp(numberPattern + "\\s*(?:k?cals?|calories?|g|grams?)?\\s*[^\\d]{0,6}$", "i"));
                token = beforeMatch ? beforeMatch[1] : null;
            }
            var parsed = parseMacroNumberToken(token, candidate.field.key);
            if (parsed !== null) {
                macros[candidate.field.key] = parsed;
            }
        });
        return macros;
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

        var deletedMealEntries = {};
        Array.from(new Set(Object.keys(local.deletedMealEntries).concat(Object.keys(remote.deletedMealEntries))))
            .sort()
            .forEach(function (mealId) {
                deletedMealEntries[mealId] = latestIso(
                    local.deletedMealEntries[mealId],
                    remote.deletedMealEntries[mealId]);
            });
        var remoteMealsById = new Map(remote.mealEntries.map(function (meal) { return [meal.id, meal]; }));
        var mealEntries = local.mealEntries.map(function (meal) {
            var remoteMeal = remoteMealsById.get(meal.id);
            remoteMealsById.delete(meal.id);
            if (!remoteMeal) {
                return meal;
            }
            return (Date.parse(meal.updatedAt) || 0) >= (Date.parse(remoteMeal.updatedAt) || 0)
                ? meal
                : remoteMeal;
        }).concat(Array.from(remoteMealsById.values()));
        mealEntries = mealEntries.filter(function (meal) { return !deletedMealEntries[meal.id]; });
        mealEntries.sort(function (a, b) { return a.id.localeCompare(b.id); });

        var deletedGoals = {};
        Array.from(new Set(Object.keys(local.deletedGoals).concat(Object.keys(remote.deletedGoals))))
            .sort()
            .forEach(function (goalId) {
                deletedGoals[goalId] = latestIso(local.deletedGoals[goalId], remote.deletedGoals[goalId]);
            });
        var remoteGoalsById = new Map(remote.goals.map(function (goal) { return [goal.id, goal]; }));
        var goals = local.goals.map(function (goal) {
            var remoteGoal = remoteGoalsById.get(goal.id);
            remoteGoalsById.delete(goal.id);
            if (!remoteGoal) {
                return goal;
            }
            return (Date.parse(goal.updatedAt) || 0) >= (Date.parse(remoteGoal.updatedAt) || 0) ? goal : remoteGoal;
        }).concat(Array.from(remoteGoalsById.values()));
        goals = goals.filter(function (goal) { return !deletedGoals[goal.id]; });

        var deletedMeasurementEntries = {};
        Array.from(new Set(Object.keys(local.deletedMeasurementEntries).concat(Object.keys(remote.deletedMeasurementEntries))))
            .sort()
            .forEach(function (entryId) {
                deletedMeasurementEntries[entryId] = latestIso(
                    local.deletedMeasurementEntries[entryId],
                    remote.deletedMeasurementEntries[entryId]);
            });
        var remoteMeasurementsById = new Map(remote.measurementEntries.map(function (entry) { return [entry.id, entry]; }));
        var measurementEntries = local.measurementEntries.map(function (entry) {
            var remoteEntry = remoteMeasurementsById.get(entry.id);
            remoteMeasurementsById.delete(entry.id);
            if (!remoteEntry) {
                return entry;
            }
            return (Date.parse(entry.updatedAt) || 0) >= (Date.parse(remoteEntry.updatedAt) || 0) ? entry : remoteEntry;
        }).concat(Array.from(remoteMeasurementsById.values()));
        measurementEntries = measurementEntries.filter(function (entry) {
            return !deletedMeasurementEntries[entry.id];
        });
        var measurementUnit = (Date.parse(local.updatedAt) || 0) >= (Date.parse(remote.updatedAt) || 0)
            ? local.measurementUnit
            : remote.measurementUnit;
        var measurementSimplified = (Date.parse(local.updatedAt) || 0) >= (Date.parse(remote.updatedAt) || 0)
            ? local.measurementSimplified
            : remote.measurementSimplified;

        var deletedRecipes = {};
        Array.from(new Set(Object.keys(local.deletedRecipes).concat(Object.keys(remote.deletedRecipes))))
            .sort()
            .forEach(function (recipeId) {
                deletedRecipes[recipeId] = latestIso(local.deletedRecipes[recipeId], remote.deletedRecipes[recipeId]);
            });
        var remoteRecipesById = new Map(remote.recipes.map(function (recipe) { return [recipe.id, recipe]; }));
        var recipes = local.recipes.map(function (recipe) {
            var remoteRecipe = remoteRecipesById.get(recipe.id);
            remoteRecipesById.delete(recipe.id);
            if (!remoteRecipe) {
                return recipe;
            }
            return (Date.parse(recipe.updatedAt) || 0) >= (Date.parse(remoteRecipe.updatedAt) || 0)
                ? recipe
                : remoteRecipe;
        }).concat(Array.from(remoteRecipesById.values()));
        recipes = recipes.filter(function (recipe) { return !deletedRecipes[recipe.id]; });

        return normalizeDocument({
            version: 10,
            updatedAt: latestIso(local.updatedAt, remote.updatedAt),
            groups: groups,
            notes: notes,
            deletedNotes: deletedNotes,
            calendarEvents: calendarEvents,
            deletedCalendarEvents: deletedCalendarEvents,
            mealEntries: mealEntries,
            deletedMealEntries: deletedMealEntries,
            goals: goals,
            deletedGoals: deletedGoals,
            measurementUnit: measurementUnit,
            measurementSimplified: measurementSimplified,
            measurementEntries: measurementEntries,
            deletedMeasurementEntries: deletedMeasurementEntries,
            recipes: recipes,
            deletedRecipes: deletedRecipes
        });
    }

    function documentsEqual(first, second) {
        return JSON.stringify(normalizeDocument(first)) === JSON.stringify(normalizeDocument(second));
    }

    function saveLocalDocument() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }

    function databaseSyncPending() {
        return localStorage.getItem(DATABASE_SYNC_PENDING_KEY) === "1";
    }

    function markDatabaseSyncPending(pending) {
        if (pending) {
            localStorage.setItem(DATABASE_SYNC_PENDING_KEY, "1");
        } else {
            localStorage.removeItem(DATABASE_SYNC_PENDING_KEY);
            localStorage.setItem(DATABASE_SYNC_READY_KEY, "1");
        }
    }

    function persist(options) {
        options = options || {};
        state.updatedAt = new Date().toISOString();
        var note = getActiveNote();
        if (note && options.touchActiveNote !== false) {
            note.updatedAt = state.updatedAt;
        }
        var recipe = activeView === "recipeEditor" ? getActiveRecipe() : null;
        if (recipe && options.touchActiveRecipe !== false) {
            recipe.updatedAt = state.updatedAt;
        }

        mutationSequence += 1;
        markDatabaseSyncPending(true);
        saveLocalDocument();
        setEditorSaved(true);
        if (options.render === true) {
            renderCurrentView();
        }
        if (options.immediate === true) {
            window.clearTimeout(pushTimer);
            setSyncStatus("Saving to database...", false);
            return syncCloud({ waitForLatest: true });
        }
        scheduleCloudPush();
        return Promise.resolve(false);
    }

    function scheduleCloudPush() {
        window.clearTimeout(pushTimer);
        setSyncStatus("Saving to database...", false);
        pushTimer = window.setTimeout(function () {
            pushCloud(false);
        }, 400);
    }

    function setEditorSaved(saving) {
        if (!elements.editorSaveState) {
            return;
        }

        elements.editorSaveState.textContent = saving ? "Saving to database..." : "Saved to database";
        elements.editorSaveWrap.classList.toggle("is-saving", saving);
        if (elements.recipeSaveState) {
            elements.recipeSaveState.textContent = saving ? elements.editorSaveState.textContent : "Saved to database";
            elements.recipeSaveWrap.classList.toggle("is-saving", saving);
        }
    }

    function setEditorDatabasePending() {
        if (!elements.editorSaveState) {
            return;
        }
        elements.editorSaveState.textContent = "Database save pending";
        elements.editorSaveWrap.classList.add("is-saving");
        if (elements.recipeSaveState) {
            elements.recipeSaveState.textContent = "Database save pending";
            elements.recipeSaveWrap.classList.add("is-saving");
        }
    }

    function setSyncStatus(message, offline) {
        elements.syncStatus.textContent = message;
        elements.syncButton.classList.toggle("is-offline", Boolean(offline));
    }

    function cloudUrl() {
        return root.dataset.apiRoot.replace(/\/$/, "");
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
        var mealEntryBefore = activeMealEntryId
            ? JSON.stringify(state.mealEntries.find(function (meal) { return meal.id === activeMealEntryId; }) || null)
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
        if (activeMealEntryId && mealEntryBefore !== JSON.stringify(
            state.mealEntries.find(function (meal) { return meal.id === activeMealEntryId; }) || null)) {
            activeMealEntryId = null;
            if (!elements.mealModal.hidden) {
                closeModal(elements.mealModal);
                showToast("That meal changed on another device. The latest version is now shown.");
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
                markDatabaseSyncPending(false);
                return true;
            }

            if (forceRemote) {
                state = remoteResult.document;
                saveLocalDocument();
                markDatabaseSyncPending(false);
                activeView = "home";
                activeGroupId = null;
                activeNoteId = null;
                activeRecipeId = null;
                renderHome();
                return true;
            }

            if (!databaseSyncPending() && mutationSequence === sequenceAtStart) {
                applyCloudDocument(remoteResult.document, sequenceAtStart);
                markDatabaseSyncPending(false);
                return true;
            }

            var merged = mergeDocuments(state, remoteResult.document);
            applyCloudDocument(merged, sequenceAtStart);
            if (documentsEqual(state, remoteResult.document)) {
                if (mutationSequence === sequenceAtStart) {
                    markDatabaseSyncPending(false);
                }
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
            markDatabaseSyncPending(false);
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
            if (options.forceRemote || options.showFeedback || options.waitForLatest) {
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
            setSyncStatus("Saved to database", false);
            setEditorSaved(false);
            if (options.showFeedback) {
                showToast("Everything is up to date.");
            }
            return true;
        }).catch(function (error) {
            console.warn("Todo sync failed.", error);
            setEditorDatabasePending();
            setSyncStatus("Database save pending", true);
            if (options.showFeedback || options.forceRemote) {
                showToast(error.message || "Could not reach sync. Your local copy is safe.");
            }
            return false;
        }).finally(function () {
            syncInFlight = false;
            syncPromise = null;
            if (!options.quiet) {
                elements.syncNowButton.disabled = false;
                elements.syncNowButton.textContent = "Save to database now";
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

    function getRecipe(recipeId) {
        return state.recipes.find(function (recipe) { return recipe.id === recipeId; }) || null;
    }

    function getActiveRecipe() {
        return activeRecipeId ? getRecipe(activeRecipeId) : null;
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
        elements.goalsView.hidden = name !== "goals";
        elements.measurementsView.hidden = name !== "measurements";
        elements.recipesView.hidden = name !== "recipes";
        elements.recipeEditorView.hidden = name !== "recipeEditor";
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

        if (activeView === "goals") {
            renderGoals();
            return;
        }

        if (activeView === "measurements") {
            renderMeasurements();
            return;
        }

        if (activeView === "recipes") {
            renderRecipes();
            return;
        }

        if (activeView === "recipeEditor" && getActiveRecipe()) {
            renderRecipeEditor();
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
        elements.homeTodayDashboard.hidden = Boolean(query);

        if (query) {
            var matchedNotes = state.notes.filter(function (note) {
                var group = getGroup(note.groupId);
                var haystack = [note.title, group ? group.name : ""]
                    .concat(flattenItems(note.items).map(function (entry) { return entry.item.text; }))
                    .join(" ")
                    .toLocaleLowerCase();
                return haystack.indexOf(query) >= 0;
            }).sort(byDisplayOrder);
            var matchedRecipes = recipesByUpdated().filter(function (recipe) {
                return [recipe.title]
                    .concat(recipe.ingredients, recipe.method, [recipe.notes, recipe.macroText])
                    .join(" ")
                    .toLocaleLowerCase()
                    .indexOf(query) >= 0;
            });

            if (!matchedNotes.length && !matchedRecipes.length) {
                var empty = document.createElement("div");
                empty.className = "todo-search-empty";
                empty.innerHTML = "<strong>No matches yet.</strong><br>Try a title, ingredient, group, or checklist item.";
                elements.homeGrid.appendChild(empty);
                return;
            }

            matchedRecipes.forEach(function (recipe) {
                elements.homeGrid.appendChild(buildRecipeCard(recipe, true));
            });
            matchedNotes.forEach(function (note) {
                elements.homeGrid.appendChild(buildNoteTile(note, true));
            });
            return;
        }

        renderHomeTodayDashboard();
        var newTile = document.createElement("button");
        newTile.type = "button";
        newTile.className = "todo-new-tile";
        newTile.innerHTML = '<span class="todo-new-tile__icon">' + icon("plus") + '</span><span><strong>New note</strong><br><small>Start with a checklist</small></span>';
        newTile.addEventListener("click", function () { createNote(defaultNoteGroupId(), null); });
        elements.homeGrid.appendChild(newTile);

        orderedGroups().forEach(function (group) {
            elements.homeGrid.appendChild(buildGroupTile(group));
            if (group.id === CALENDAR_GROUP_ID) {
                elements.homeGrid.appendChild(buildGoalsTile());
                elements.homeGrid.appendChild(buildMeasurementsTile());
                elements.homeGrid.appendChild(buildRecipesTile());
            }
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

    function getMainGoal() {
        return state.goals.find(function (goal) { return goal.isMain && !goal.completed; }) || null;
    }

    function goalDaysRemaining(deadline) {
        var today = localDateKey(new Date()).split("-").map(Number);
        var target = deadline.split("-").map(Number);
        return Math.round((Date.UTC(target[0], target[1] - 1, target[2]) - Date.UTC(today[0], today[1] - 1, today[2])) / 86400000);
    }

    function goalCountdownLabel(goal) {
        var days = goalDaysRemaining(goal.deadline);
        if (days < 0) {
            return Math.abs(days) + "D overdue";
        }
        return days + "D remaining";
    }

    function buildGoalsTile() {
        var mainGoal = getMainGoal();
        var button = document.createElement("button");
        button.type = "button";
        button.className = "todo-group-tile todo-goals-tile";
        button.style.setProperty("--group-color", GOALS_COLOR);
        button.setAttribute("aria-label", mainGoal
            ? "Open Goals. Main goal: " + mainGoal.title + ", " + goalCountdownLabel(mainGoal)
            : "Open Goals and set a main goal");

        var iconWrap = document.createElement("span");
        iconWrap.className = "todo-goals-tile__icon";
        iconWrap.innerHTML = icon("target");
        var label = document.createElement("span");
        label.className = "todo-goals-tile__label";
        label.textContent = "Goals";
        var copy = document.createElement("span");
        copy.className = "todo-goals-tile__copy";
        var title = document.createElement("strong");
        title.textContent = mainGoal ? mainGoal.title : "Set your main goal";
        var countdown = document.createElement("small");
        countdown.textContent = mainGoal ? goalCountdownLabel(mainGoal) : "Add a target and deadline";
        copy.append(title, countdown);
        button.append(iconWrap, label, copy);
        button.addEventListener("click", openGoals);
        return button;
    }

    function measurementsByDate() {
        return state.measurementEntries.slice().sort(function (a, b) {
            return b.date.localeCompare(a.date) || byUpdatedDescending(a, b) || a.id.localeCompare(b.id);
        });
    }

    function latestDailyCalorieTarget() {
        return state.measurementEntries
            .filter(function (entry) { return Number.isFinite(entry.dailyCalories); })
            .sort(function (a, b) {
                return b.date.localeCompare(a.date) || byUpdatedDescending(a, b);
            })[0] || null;
    }

    function nutritionForDate(dateKey) {
        var meals = mealEntriesForDate(dateKey);
        var totals = { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };
        meals.forEach(function (meal) {
            var macros = scaledMealMacros(meal);
            MACRO_FIELDS.forEach(function (field) {
                if (Number.isFinite(macros[field.key])) {
                    totals[field.key] += macros[field.key];
                }
            });
        });
        MACRO_FIELDS.forEach(function (field) {
            totals[field.key] = Math.round(totals[field.key] * 10) / 10;
        });
        var targetEntry = latestDailyCalorieTarget();
        return {
            meals: meals,
            totals: totals,
            target: targetEntry && Number.isFinite(targetEntry.dailyCalories)
                ? targetEntry.dailyCalories
                : null
        };
    }

    function openTodayCalendar() {
        var today = localDateKey(new Date());
        selectedCalendarDate = today;
        renderCalendar(today, true);
    }

    function renderHomeTodayDashboard() {
        var today = localDateKey(new Date());
        var nutrition = nutritionForDate(today);
        var totals = nutrition.totals;
        var target = nutrition.target;
        elements.homeTodayCalories.textContent = formatMacroValue(totals.calories);
        elements.homeTodayCalorieTarget.textContent = target ? formatMacroValue(target) : "—";
        elements.homeTodayProtein.textContent = formatMacroValue(totals.proteinG) + " g";
        elements.homeTodayCarbs.textContent = formatMacroValue(totals.carbsG) + " g";
        elements.homeTodayFat.textContent = formatMacroValue(totals.fatG) + " g";

        var progress = target ? Math.min(100, totals.calories / target * 100) : 0;
        elements.homeTodayCalorieProgress.querySelector("span").style.width = progress + "%";
        elements.homeTodayCalorieProgress.setAttribute("aria-valuenow", String(Math.round(totals.calories)));
        if (target) {
            elements.homeTodayCalorieProgress.setAttribute("aria-valuemax", String(Math.round(target)));
            var remaining = Math.round((target - totals.calories) * 10) / 10;
            elements.homeTodayCalorieStatus.textContent = remaining >= 0
                ? formatMacroValue(remaining) + " kcal remaining"
                : formatMacroValue(Math.abs(remaining)) + " kcal over target";
            elements.homeTodayCalorieStatus.classList.toggle("is-over", remaining < 0);
        } else {
            elements.homeTodayCalorieProgress.removeAttribute("aria-valuemax");
            elements.homeTodayCalorieStatus.textContent = nutrition.meals.length
                ? plural(nutrition.meals.length, "meal") + " logged · set a target in Measurements"
                : "No meals logged · set a target in Measurements";
            elements.homeTodayCalorieStatus.classList.remove("is-over");
        }

        var now = new Date();
        var nowMinutes = now.getHours() * 60 + now.getMinutes();
        var events = calendarEventsForDate(today);
        var nextEvent = events.find(function (event) {
            return event.startMinutes + event.durationMinutes > nowMinutes;
        }) || null;
        if (nextEvent) {
            var happeningNow = nextEvent.startMinutes <= nowMinutes;
            elements.homeTodayNextEventTitle.textContent = nextEvent.title;
            elements.homeTodayNextEventTime.textContent = happeningNow
                ? "Now · until " + minutesToTime(nextEvent.startMinutes + nextEvent.durationMinutes)
                : minutesToTime(nextEvent.startMinutes) + " · " + formatDuration(nextEvent.durationMinutes);
            elements.homeTodayNextEvent.setAttribute("aria-label",
                (happeningNow ? "Open current event " : "Open next event ") + nextEvent.title);
        } else {
            elements.homeTodayNextEventTitle.textContent = "Nothing else scheduled";
            elements.homeTodayNextEventTime.textContent = events.length ? "Your remaining day is clear." : "Add something to your calendar.";
            elements.homeTodayNextEvent.setAttribute("aria-label", "Open today's calendar");
        }
    }

    function buildMeasurementsTile() {
        var latest = measurementsByDate()[0] || null;
        var calorieTarget = latestDailyCalorieTarget();
        var button = document.createElement("button");
        button.type = "button";
        button.className = "todo-group-tile todo-measurements-tile";
        button.style.setProperty("--group-color", MEASUREMENTS_COLOR);
        button.setAttribute("aria-label", latest
            ? "Open Measurements. Latest check-in " + formatMeasurementDate(latest.date)
            : "Open Measurements and add your first check-in");

        var iconWrap = document.createElement("span");
        iconWrap.className = "todo-measurements-tile__icon";
        iconWrap.innerHTML = icon("ruler");
        var label = document.createElement("span");
        label.className = "todo-measurements-tile__label";
        label.textContent = "Measurements";
        var copy = document.createElement("span");
        copy.className = "todo-measurements-tile__copy";
        var title = document.createElement("strong");
        var detail = document.createElement("small");
        if (latest) {
            var headline = Number.isFinite(latest.weightKg)
                ? formatMeasurementValue(latest.weightKg, "weight")
                : (Number.isFinite(latest.waistCm)
                    ? "Waist " + formatMeasurementValue(latest.waistCm, "length")
                    : (calorieTarget ? formatMeasurementValue(calorieTarget.dailyCalories, "calories") + " target" : "Check-in saved"));
            title.textContent = headline;
            detail.textContent = formatMeasurementDate(latest.date) + " · " + plural(state.measurementEntries.length, "check-in");
        } else {
            title.textContent = "Track your progress";
            detail.textContent = "Weight, body fat and body measurements";
        }
        copy.append(title, detail);
        button.append(iconWrap, label, copy);
        button.addEventListener("click", openMeasurements);
        return button;
    }

    function recipesByUpdated() {
        return state.recipes.slice().sort(function (a, b) {
            return byUpdatedDescending(a, b) || a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
        });
    }

    function buildRecipesTile() {
        var recipes = recipesByUpdated();
        var latest = recipes[0] || null;
        var latestIsFood = latest && latest.kind === "food";
        var button = document.createElement("button");
        button.type = "button";
        button.className = "todo-group-tile todo-recipes-tile";
        button.style.setProperty("--group-color", RECIPES_COLOR);
        button.setAttribute("aria-label", recipes.length
            ? "Open Recipes, " + plural(recipes.length, "saved item") + ". Latest: " +
                (latest.title || (latestIsFood ? "Untitled food item" : "Untitled recipe"))
            : "Open Recipes and add your first recipe or food item");

        var iconWrap = document.createElement("span");
        iconWrap.className = "todo-recipes-tile__icon";
        iconWrap.innerHTML = icon("recipe");
        var label = document.createElement("span");
        label.className = "todo-recipes-tile__label";
        label.textContent = "Recipes";
        var copy = document.createElement("span");
        copy.className = "todo-recipes-tile__copy";
        var title = document.createElement("strong");
        title.textContent = latest
            ? (latest.title || (latestIsFood ? "Untitled food item" : "Untitled recipe"))
            : "Build your own cookbook";
        var detail = document.createElement("small");
        detail.textContent = latest
            ? plural(recipes.length, "saved item") + " · " +
                (Number.isFinite(latest.macros.calories)
                    ? formatMacroValue(latest.macros.calories) + (latestIsFood ? " kcal per item" : " kcal per portion")
                    : (latestIsFood ? "Food item" : plural(latest.ingredients.length, "ingredient")))
            : "Recipes, ingredients and everyday foods";
        copy.append(title, detail);
        button.append(iconWrap, label, copy);
        button.addEventListener("click", openRecipes);
        return button;
    }

    function openRecipes() {
        elements.recipeSearch.value = "";
        renderRecipes();
    }

    function renderRecipes() {
        showView("recipes");
        clear(elements.recipesList);
        var query = elements.recipeSearch.value.trim().toLocaleLowerCase();
        var recipes = recipesByUpdated().filter(function (recipe) {
            if (!query) {
                return true;
            }
            return [recipe.title]
                .concat(recipe.ingredients, recipe.method, [recipe.notes, recipe.macroText])
                .join(" ")
                .toLocaleLowerCase()
                .indexOf(query) >= 0;
        });

        if (query) {
            elements.recipesSummary.textContent = plural(recipes.length, "match");
        } else {
            var foodItemCount = state.recipes.filter(function (recipe) { return recipe.kind === "food"; }).length;
            var recipeCount = state.recipes.length - foodItemCount;
            elements.recipesSummary.textContent = recipeCount && foodItemCount
                ? plural(recipeCount, "recipe") + " · " + plural(foodItemCount, "food item")
                : (foodItemCount ? plural(foodItemCount, "food item") : plural(recipeCount, "recipe"));
        }

        if (!recipes.length) {
            var empty = document.createElement("div");
            empty.className = "todo-group-empty todo-recipes-empty";
            var title = document.createElement("strong");
            var copy = document.createElement("span");
            title.textContent = query ? "Nothing found." : "Your cookbook starts here.";
            copy.textContent = query
                ? "Try another title, ingredient, or food."
                : "Save a full recipe or a simple food such as a banana.";
            empty.append(title, copy);
            if (!query) {
                var actions = document.createElement("div");
                actions.className = "todo-recipes-empty__actions";
                var addFood = document.createElement("button");
                addFood.type = "button";
                addFood.className = "todo-secondary-button";
                addFood.innerHTML = icon("utensils") + " Food item";
                addFood.addEventListener("click", function () { createRecipe("food"); });
                var addRecipe = document.createElement("button");
                addRecipe.type = "button";
                addRecipe.className = "todo-primary-button";
                addRecipe.innerHTML = icon("plus") + " New recipe";
                addRecipe.addEventListener("click", function () { createRecipe("recipe"); });
                actions.append(addFood, addRecipe);
                empty.appendChild(actions);
            }
            elements.recipesList.appendChild(empty);
            return;
        }

        recipes.forEach(function (recipe) {
            elements.recipesList.appendChild(buildRecipeCard(recipe, false));
        });
    }

    function buildRecipeCard(recipe, compact) {
        var isFood = recipe.kind === "food";
        var itemLabel = isFood ? "food item" : "recipe";
        var emptyTitle = isFood ? "Untitled food item" : "Untitled recipe";
        var card = document.createElement("article");
        card.className = "todo-recipe-card" + (isFood ? " is-food-item" : "") + (compact ? " is-compact" : "");
        var open = document.createElement("button");
        open.type = "button";
        open.className = "todo-recipe-card__open";
        open.setAttribute("aria-label", "Open " + itemLabel + " " + (recipe.title || emptyTitle));

        var head = document.createElement("div");
        head.className = "todo-recipe-card__head";
        var mark = document.createElement("span");
        mark.className = "todo-recipe-card__mark";
        mark.innerHTML = icon(isFood ? "utensils" : "recipe");
        var heading = document.createElement("div");
        var eyebrow = document.createElement("span");
        var macroSummary = [];
        if (Number.isFinite(recipe.macros.calories)) {
            macroSummary.push(formatMacroValue(recipe.macros.calories) + " kcal");
        }
        if (Number.isFinite(recipe.macros.proteinG)) {
            macroSummary.push(formatMacroValue(recipe.macros.proteinG) + " g protein");
        }
        eyebrow.textContent = isFood
            ? "Food item" + (macroSummary.length ? " · " + macroSummary.join(" · ") : "")
            : (macroSummary.length
                ? macroSummary.join(" · ")
                : plural(recipe.ingredients.length, "ingredient") + " · " + plural(recipe.method.length, "step"));
        var title = document.createElement("h2");
        title.textContent = recipe.title || emptyTitle;
        heading.append(eyebrow, title);
        head.append(mark, heading);
        open.appendChild(head);

        var preview = document.createElement("ul");
        preview.className = "todo-recipe-card__preview";
        var previewItems = isFood
            ? [
                Number.isFinite(recipe.macros.carbsG) ? formatMacroValue(recipe.macros.carbsG) + " g carbs" : "",
                Number.isFinite(recipe.macros.fatG) ? formatMacroValue(recipe.macros.fatG) + " g fat" : "",
                recipe.notes
            ].filter(Boolean).slice(0, 3)
            : recipe.ingredients.slice(0, 3);
        if (!previewItems.length) {
            var empty = document.createElement("li");
            empty.textContent = isFood ? "No nutrition details yet" : "No ingredients yet";
            empty.className = "is-empty";
            preview.appendChild(empty);
        } else {
            previewItems.forEach(function (ingredient) {
                var item = document.createElement("li");
                item.textContent = ingredient;
                preview.appendChild(item);
            });
        }
        open.appendChild(preview);

        var foot = document.createElement("span");
        foot.className = "todo-recipe-card__foot";
        foot.textContent = "Updated " + relativeDate(recipe.updatedAt);
        open.appendChild(foot);
        open.addEventListener("click", function () { openRecipeEditor(recipe.id); });
        card.appendChild(open);
        return card;
    }

    function createRecipe(kind) {
        kind = kind === "food" ? "food" : "recipe";
        var now = new Date().toISOString();
        var recipe = {
            id: createId("recipe"),
            kind: kind,
            title: "",
            ingredients: [],
            method: [],
            notes: "",
            macroText: "",
            macros: emptyRecipeMacros(),
            createdAt: now,
            updatedAt: now
        };
        state.recipes.unshift(recipe);
        activeRecipeId = recipe.id;
        persist({ touchActiveNote: false });
        renderRecipeEditor();
        window.setTimeout(function () { elements.recipeTitle.focus(); }, 0);
    }

    function openRecipeEditor(recipeId) {
        activeRecipeId = recipeId;
        renderRecipeEditor();
    }

    function formatRecipeLines(lines, ordered) {
        return lines.map(function (line, index) {
            return ordered ? (index + 1) + ". " + line : "• " + line;
        }).join("\n");
    }

    function renderRecipeEditor() {
        var recipe = getActiveRecipe();
        if (!recipe) {
            renderRecipes();
            return;
        }
        showView("recipeEditor");
        var isFood = recipe.kind === "food";
        elements.recipeEditorKindLabel.textContent = isFood ? "Food item" : "Recipe";
        elements.recipeTitleLabel.textContent = isFood ? "Food item name" : "Recipe title";
        elements.recipeTitle.placeholder = isFood ? "Banana, protein scoop, yoghurt…" : "What are you cooking?";
        elements.recipePreparationFields.hidden = isFood;
        elements.recipeMacrosBasis.textContent = isFood ? "Per item" : "Per portion";
        elements.recipeNotesHelp.textContent = isFood
            ? "Optional: brand, serving size, flavour, or anything else worth remembering."
            : "Good for timings, servings, substitutions, or the source.";
        elements.recipeNotesLabelText.textContent = isFood ? "Food item notes" : "Recipe notes";
        elements.recipeNotes.placeholder = isFood
            ? "e.g. One medium banana, about 118 g"
            : "Makes 8 portions. Also works with honey instead of erythritol…";
        elements.recipeTitle.closest(".todo-recipe-editor-card").classList.toggle("is-food-item", isFood);
        document.getElementById("deleteRecipeButton").setAttribute("aria-label", isFood ? "Delete food item" : "Delete recipe");
        elements.recipeTitle.value = recipe.title;
        elements.recipeIngredients.value = formatRecipeLines(recipe.ingredients, false);
        elements.recipeMethod.value = formatRecipeLines(recipe.method, true);
        elements.recipeNotes.value = recipe.notes;
        elements.recipeMacroText.value = recipe.macroText;
        renderRecipeMacroFields(recipe);
        updateRecipeLineCounts(recipe);
    }

    function updateRecipeLineCounts(recipe) {
        recipe = recipe || getActiveRecipe();
        if (!recipe) {
            return;
        }
        elements.recipeIngredientCount.textContent = plural(recipe.ingredients.length, "item");
        elements.recipeMethodCount.textContent = plural(recipe.method.length, "step");
    }

    function formatMacroValue(value) {
        return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value);
    }

    function renderRecipeMacroFields(recipe) {
        recipe = recipe || getActiveRecipe();
        if (!recipe) {
            return;
        }
        elements.recipeMacroInputs.forEach(function (input) {
            var value = recipe.macros[input.dataset.recipeMacro];
            input.value = Number.isFinite(value) ? String(value) : "";
        });

        var recognized = MACRO_FIELDS.filter(function (field) {
            return Number.isFinite(recipe.macros[field.key]);
        });
        elements.recipeMacroStatus.classList.toggle("is-success", recognized.length > 0);
        elements.recipeMacroStatus.classList.toggle("is-warning", Boolean(recipe.macroText.trim()) && !recognized.length);
        if (recognized.length) {
            elements.recipeMacroStatus.textContent = plural(recognized.length, "value") + " classified: " +
                recognized.map(function (field) { return field.label; }).join(", ") + ".";
        } else if (recipe.macroText.trim()) {
            elements.recipeMacroStatus.textContent = "Nothing recognised yet. Try labels such as Calories, Protein, Carbs and Fat.";
        } else {
            elements.recipeMacroStatus.textContent = "Paste a nutrition summary to classify it.";
        }
    }

    function updateRecipeMacrosFromText() {
        var recipe = getActiveRecipe();
        if (!recipe) {
            return;
        }
        recipe.macroText = elements.recipeMacroText.value.slice(0, 1000);
        recipe.macros = parseMacroText(recipe.macroText);
        renderRecipeMacroFields(recipe);
        persist({ touchActiveNote: false });
    }

    function updateRecipeMacroValue(input) {
        var recipe = getActiveRecipe();
        if (!recipe) {
            return;
        }
        recipe.macros[input.dataset.recipeMacro] = normalizeMacroNumber(
            input.value.trim() === "" ? null : Number(input.value),
            input.dataset.recipeMacro);
        renderRecipeMacroFields(recipe);
        persist({ touchActiveNote: false });
    }

    function updateRecipeListField(kind, textarea) {
        var recipe = getActiveRecipe();
        if (!recipe) {
            return;
        }
        recipe[kind] = normalizeRecipeLines(textarea.value);
        updateRecipeLineCounts(recipe);
        persist({ touchActiveNote: false });
    }

    function tidyRecipeListField(kind, textarea, ordered) {
        var recipe = getActiveRecipe();
        if (!recipe) {
            return;
        }
        var lines = normalizeRecipeLines(textarea.value);
        var changed = JSON.stringify(lines) !== JSON.stringify(recipe[kind]);
        recipe[kind] = lines;
        textarea.value = formatRecipeLines(lines, ordered);
        updateRecipeLineCounts(recipe);
        if (changed) {
            persist({ touchActiveNote: false });
        }
    }

    function pasteRecipeList(event, kind, textarea, ordered) {
        var pasted = event.clipboardData && event.clipboardData.getData("text");
        if (!pasted) {
            return;
        }
        event.preventDefault();
        var start = textarea.selectionStart;
        var end = textarea.selectionEnd;
        var inserted = normalizeRecipeLines(pasted).join("\n");
        var combined = textarea.value.slice(0, start) + inserted + textarea.value.slice(end);
        var lines = normalizeRecipeLines(combined);
        textarea.value = formatRecipeLines(lines, ordered);
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        updateRecipeListField(kind, textarea);
        showToast(plural(normalizeRecipeLines(pasted).length, ordered ? "step" : "ingredient") + " cleaned up.");
    }

    function addRecipeLine(event, kind, textarea, ordered) {
        if (event.key !== "Enter" || event.isComposing) {
            return;
        }
        event.preventDefault();
        var start = textarea.selectionStart;
        var end = textarea.selectionEnd;
        var lineNumber = normalizeRecipeLines(textarea.value.slice(0, start)).length + 1;
        var prefix = ordered ? lineNumber + ". " : "• ";
        textarea.setRangeText("\n" + prefix, start, end, "end");
        updateRecipeListField(kind, textarea);
    }

    function finishRecipeEditing() {
        var recipe = getActiveRecipe();
        if (recipe && !recipe.title.trim() && !recipe.ingredients.length && !recipe.method.length &&
            !recipe.notes.trim() && !recipe.macroText.trim() && !recipeHasMacros(recipe)) {
            state.deletedRecipes[recipe.id] = new Date().toISOString();
            state.recipes = state.recipes.filter(function (candidate) { return candidate.id !== recipe.id; });
            persist({ touchActiveNote: false, touchActiveRecipe: false });
        }
        activeRecipeId = null;
    }

    function closeRecipeEditor() {
        finishRecipeEditing();
        renderRecipes();
    }

    function deleteActiveRecipe() {
        var recipe = getActiveRecipe();
        if (!recipe) {
            return;
        }
        var isFood = recipe.kind === "food";
        var name = recipe.title.trim() || (isFood ? "this food item" : "this recipe");
        if (!window.confirm("Delete “" + name + "”? This cannot be undone after sync.")) {
            return;
        }
        state.deletedRecipes[recipe.id] = new Date().toISOString();
        state.recipes = state.recipes.filter(function (candidate) { return candidate.id !== recipe.id; });
        activeRecipeId = null;
        persist({ touchActiveNote: false, touchActiveRecipe: false, immediate: true });
        renderRecipes();
        showToast(isFood ? "Food item deleted." : "Recipe deleted.");
    }

    function openGoals() {
        elements.goalIsMain.checked = !getMainGoal();
        if (!elements.goalDeadline.value) {
            elements.goalDeadline.value = shiftDateKey(localDateKey(new Date()), 90);
        }
        renderGoals();
    }

    function renderGoals() {
        showView("goals");
        clear(elements.goalsList);
        var goals = state.goals.slice().sort(function (a, b) {
            if (a.completed !== b.completed) {
                return a.completed ? 1 : -1;
            }
            if (a.isMain !== b.isMain) {
                return a.isMain ? -1 : 1;
            }
            return a.deadline.localeCompare(b.deadline) || a.id.localeCompare(b.id);
        });
        var openCount = goals.filter(function (goal) { return !goal.completed; }).length;
        elements.goalsSummary.textContent = goals.length
            ? plural(openCount, "active goal") + (goals.length !== openCount ? " · " + plural(goals.length - openCount, "completed") : "")
            : "No goals yet";

        if (!goals.length) {
            var empty = document.createElement("div");
            empty.className = "todo-group-empty todo-goals-empty";
            empty.innerHTML = "<strong>What are you aiming for?</strong><br>Add a specific result and give it a deadline.";
            elements.goalsList.appendChild(empty);
            return;
        }

        goals.forEach(function (goal) {
            elements.goalsList.appendChild(buildGoalRow(goal));
        });
    }

    function buildGoalRow(goal) {
        var row = document.createElement("article");
        row.className = "todo-goal-row" + (goal.isMain ? " is-main" : "") + (goal.completed ? " is-completed" : "");
        row.dataset.goalId = goal.id;

        var completeLabel = document.createElement("label");
        completeLabel.className = "todo-goal-complete";
        var complete = document.createElement("input");
        complete.type = "checkbox";
        complete.checked = goal.completed;
        complete.setAttribute("aria-label", goal.completed ? "Mark goal active" : "Mark goal complete");
        var checkmark = document.createElement("span");
        checkmark.innerHTML = icon("check");
        completeLabel.append(complete, checkmark);

        var fields = document.createElement("div");
        fields.className = "todo-goal-row__fields";
        var title = document.createElement("input");
        title.className = "todo-goal-row__title";
        title.type = "text";
        title.maxLength = 180;
        title.value = goal.title;
        title.setAttribute("aria-label", "Goal title");
        var deadlineWrap = document.createElement("label");
        deadlineWrap.className = "todo-goal-row__deadline";
        var deadlineText = document.createElement("span");
        deadlineText.textContent = goal.completed ? "Completed goal" : goalCountdownLabel(goal);
        var deadline = document.createElement("input");
        deadline.type = "date";
        deadline.value = goal.deadline;
        deadline.setAttribute("aria-label", "Goal deadline");
        deadlineWrap.append(deadlineText, deadline);
        fields.append(title, deadlineWrap);

        var actions = document.createElement("div");
        actions.className = "todo-goal-row__actions";
        var main = document.createElement("button");
        main.type = "button";
        main.className = "todo-goal-main-button" + (goal.isMain ? " is-active" : "");
        main.textContent = goal.isMain ? "Main goal" : "Make main";
        main.disabled = goal.completed;
        main.setAttribute("aria-pressed", goal.isMain ? "true" : "false");
        var remove = document.createElement("button");
        remove.type = "button";
        remove.className = "todo-icon-button todo-goal-delete";
        remove.innerHTML = icon("trash");
        remove.setAttribute("aria-label", "Delete " + goal.title);
        actions.append(main, remove);
        row.append(completeLabel, fields, actions);

        title.addEventListener("input", function () {
            goal.title = title.value;
            goal.updatedAt = new Date().toISOString();
            persist({ touchActiveNote: false });
        });
        title.addEventListener("keydown", function (event) {
            if (event.key === "Enter") {
                event.preventDefault();
                deadline.focus();
            }
        });
        deadline.addEventListener("change", function () {
            if (!deadline.value) {
                return;
            }
            goal.deadline = deadline.value;
            goal.updatedAt = new Date().toISOString();
            persist({ touchActiveNote: false, immediate: true });
            renderGoals();
        });
        complete.addEventListener("change", function () {
            goal.completed = complete.checked;
            if (goal.completed) {
                goal.isMain = false;
            }
            goal.updatedAt = new Date().toISOString();
            persist({ touchActiveNote: false, immediate: true });
            renderGoals();
        });
        main.addEventListener("click", function () {
            setMainGoal(goal.id);
        });
        remove.addEventListener("click", function () {
            deleteGoal(goal.id);
        });
        return row;
    }

    function addGoal(event) {
        event.preventDefault();
        var title = elements.goalTitle.value.trim();
        var deadline = elements.goalDeadline.value;
        if (!title || !deadline) {
            return;
        }
        var now = new Date().toISOString();
        var makeMain = elements.goalIsMain.checked || !getMainGoal();
        if (makeMain) {
            state.goals.forEach(function (goal) { goal.isMain = false; });
        }
        state.goals.push({
            id: createId("goal"),
            title: title,
            deadline: deadline,
            isMain: makeMain,
            completed: false,
            createdAt: now,
            updatedAt: now
        });
        persist({ touchActiveNote: false, immediate: true });
        elements.goalForm.reset();
        elements.goalDeadline.value = shiftDateKey(localDateKey(new Date()), 90);
        elements.goalIsMain.checked = !getMainGoal();
        renderGoals();
        elements.goalTitle.focus();
    }

    function setMainGoal(goalId) {
        var now = new Date().toISOString();
        state.goals.forEach(function (goal) {
            var next = goal.id === goalId;
            if (goal.isMain !== next) {
                goal.isMain = next;
                goal.updatedAt = now;
            }
        });
        persist({ touchActiveNote: false, immediate: true });
        renderGoals();
    }

    function deleteGoal(goalId) {
        var goal = state.goals.find(function (candidate) { return candidate.id === goalId; });
        if (!goal || !window.confirm("Delete goal “" + goal.title + "”?")) {
            return;
        }
        state.deletedGoals[goalId] = new Date().toISOString();
        state.goals = state.goals.filter(function (candidate) { return candidate.id !== goalId; });
        persist({ touchActiveNote: false, immediate: true });
        elements.goalIsMain.checked = !getMainGoal();
        renderGoals();
    }

    function openMeasurements() {
        activeMeasurementId = null;
        resetMeasurementForm();
        renderMeasurements();
    }

    function renderMeasurements() {
        showView("measurements");
        elements.measurementUnit.value = state.measurementUnit;
        elements.measurementSimplified.checked = state.measurementSimplified;
        applyMeasurementMode();
        updateMeasurementUnitLabels();
        renderMeasurementLatest();
        renderMeasurementHistory();
    }

    function applyMeasurementMode() {
        var simplified = state.measurementSimplified !== false;
        elements.measurementForm.classList.toggle("is-simplified", simplified);
        elements.measurementForm.querySelectorAll("[data-measurement-advanced]").forEach(function (element) {
            element.hidden = simplified;
        });
    }

    function renderMeasurementLatest() {
        clear(elements.measurementLatest);
        var entries = measurementsByDate();
        if (!entries.length) {
            var empty = document.createElement("div");
            empty.className = "todo-measurement-latest__empty";
            empty.innerHTML = "<strong>Your baseline starts here.</strong><span>Add any measurements you want to track. You can leave the rest blank.</span>";
            elements.measurementLatest.appendChild(empty);
            return;
        }

        var latest = entries[0];
        var heading = document.createElement("div");
        heading.className = "todo-measurement-latest__heading";
        heading.innerHTML = '<div><p class="todo-eyebrow">Progress trends</p><h2>Daily · weekly · monthly</h2></div><small>Latest check-in ' +
            escapeHtml(formatMeasurementDate(latest.date)) + "</small>";
        elements.measurementLatest.appendChild(heading);

        var calorieTarget = latestDailyCalorieTarget();
        if (calorieTarget) {
            var targetCard = document.createElement("article");
            targetCard.className = "todo-calorie-target-card";
            targetCard.innerHTML =
                '<div><p class="todo-eyebrow">Active nutrition target</p><strong>' +
                escapeHtml(formatMeasurementValue(calorieTarget.dailyCalories, "calories")) +
                '</strong></div><p>Using the newest value you entered, from <b>' +
                escapeHtml(formatMeasurementDate(calorieTarget.date)) +
                "</b>. This will power recipe portion tracking next.</p>";
            elements.measurementLatest.appendChild(targetCard);
        }

        var cards = document.createElement("div");
        cards.className = "todo-measurement-summary-grid";
        var preferredKeys = ["weightKg", "waistCm", "chestCm", "hipsCm", "upperArmRelaxedCm", "upperArmFlexedCm"];
        var renderedCards = 0;
        preferredKeys.forEach(function (key) {
            var field = measurementField(key);
            var trend = measurementTrend(key);
            if (!field || !trend) {
                return;
            }
            var card = document.createElement("article");
            card.className = "todo-measurement-summary-card todo-measurement-trend-card";
            card.dataset.measurementTrend = key;
            var label = document.createElement("span");
            label.textContent = field.label;
            var value = document.createElement("strong");
            value.textContent = formatMeasurementValue(trend.current.value, field.kind);
            var periods = document.createElement("div");
            periods.className = "todo-measurement-trend-periods";
            [
                { label: "Daily", value: trend.daily },
                { label: "Weekly", value: trend.weekly },
                { label: "Monthly", value: trend.monthly }
            ].forEach(function (period) {
                var periodWrap = document.createElement("span");
                var periodLabel = document.createElement("small");
                periodLabel.textContent = period.label;
                var periodValue = document.createElement("b");
                if (period.value) {
                    periodValue.textContent = formatTrendPercent(period.value.percent);
                    periodValue.className = measurementOutcomeClass(key, period.value.percent);
                    periodValue.title = "Compared with " + formatMeasurementDate(period.value.baseline.date);
                } else {
                    periodValue.textContent = "—";
                    periodValue.className = "is-steady";
                    periodValue.title = "More dated check-ins are needed";
                }
                periodWrap.append(periodLabel, periodValue);
                periods.appendChild(periodWrap);
            });
            card.append(label, value, periods);
            cards.appendChild(card);
            renderedCards += 1;
        });
        if (renderedCards) {
            elements.measurementLatest.appendChild(cards);
        } else {
            var trendEmpty = document.createElement("p");
            trendEmpty.className = "todo-measurement-trend-empty";
            trendEmpty.textContent = "Add one of the simplified measurements to start your trends.";
            elements.measurementLatest.appendChild(trendEmpty);
        }
    }

    function measurementTrend(key) {
        var series = state.measurementEntries
            .filter(function (entry) { return Number.isFinite(entry[key]); })
            .sort(function (a, b) {
                return a.date.localeCompare(b.date) || (Date.parse(a.updatedAt) || 0) - (Date.parse(b.updatedAt) || 0);
            })
            .map(function (entry) { return { date: entry.date, value: entry[key] }; });
        if (!series.length) {
            return null;
        }

        var current = series[series.length - 1];
        var previous = series.length > 1 ? series[series.length - 2] : null;
        return {
            current: current,
            daily: previous ? measurementTrendDelta(current, previous) : null,
            weekly: measurementPeriodDelta(series, current, 7),
            monthly: measurementPeriodDelta(series, current, 30)
        };
    }

    function measurementPeriodDelta(series, current, days) {
        var target = shiftDateKey(current.date, -days);
        for (var index = series.length - 2; index >= 0; index -= 1) {
            if (series[index].date <= target) {
                return measurementTrendDelta(current, series[index]);
            }
        }
        return null;
    }

    function measurementTrendDelta(current, baseline) {
        if (!baseline || !Number.isFinite(baseline.value) || baseline.value === 0) {
            return null;
        }
        return {
            baseline: baseline,
            percent: ((current.value - baseline.value) / baseline.value) * 100
        };
    }

    function measurementOutcomeClass(key, change) {
        if (Math.abs(change) < 0.005) {
            return "is-steady";
        }
        var decreasingIsGood = ["weightKg", "waistCm", "chestCm", "hipsCm"].indexOf(key) >= 0;
        var increasingIsGood = ["upperArmRelaxedCm", "upperArmFlexedCm"].indexOf(key) >= 0;
        if (!decreasingIsGood && !increasingIsGood) {
            return change < 0 ? "is-down" : "is-up";
        }
        return (decreasingIsGood && change < 0) || (increasingIsGood && change > 0)
            ? "is-positive"
            : "is-negative";
    }

    function formatTrendPercent(value) {
        if (Math.abs(value) < 0.005) {
            value = 0;
        }
        var prefix = value > 0.005 ? "+" : "";
        return prefix + new Intl.NumberFormat(undefined, {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
        }).format(value) + "%";
    }

    function renderMeasurementHistory() {
        clear(elements.measurementHistory);
        var entries = measurementsByDate();
        elements.measurementHistorySummary.textContent = entries.length
            ? plural(entries.length, "check-in")
            : "No check-ins yet";

        if (!entries.length) {
            var empty = document.createElement("div");
            empty.className = "todo-group-empty todo-measurements-empty";
            empty.innerHTML = "<strong>No history yet.</strong><br>Your saved check-ins will appear here, newest first.";
            elements.measurementHistory.appendChild(empty);
            return;
        }

        entries.forEach(function (entry, index) {
            var previous = entries[index + 1] || null;
            elements.measurementHistory.appendChild(buildMeasurementRow(entry, previous));
        });
    }

    function buildMeasurementRow(entry, previous) {
        var row = document.createElement("article");
        row.className = "todo-measurement-row" + (entry.id === activeMeasurementId ? " is-editing" : "");

        var heading = document.createElement("div");
        heading.className = "todo-measurement-row__heading";
        var date = document.createElement("div");
        date.innerHTML = "<strong>" + escapeHtml(formatMeasurementDate(entry.date)) + "</strong>" +
            (entry.note ? "<small>" + escapeHtml(entry.note) + "</small>" : "<small>Progress check-in</small>");
        var actions = document.createElement("div");
        actions.className = "todo-measurement-row__actions";
        var edit = document.createElement("button");
        edit.type = "button";
        edit.className = "todo-text-button";
        edit.textContent = "Edit";
        edit.addEventListener("click", function () { editMeasurement(entry.id); });
        var remove = document.createElement("button");
        remove.type = "button";
        remove.className = "todo-text-button todo-measurement-delete";
        remove.innerHTML = icon("trash") + "<span>Delete</span>";
        remove.setAttribute("aria-label", "Delete measurements from " + formatMeasurementDate(entry.date));
        remove.addEventListener("click", function () { deleteMeasurement(entry.id); });
        actions.append(edit, remove);
        heading.append(date, actions);

        var values = document.createElement("div");
        values.className = "todo-measurement-row__values";
        measurementDisplayFields().forEach(function (field) {
            if (!Number.isFinite(entry[field.key])) {
                return;
            }
            var item = document.createElement("span");
            var changeText = "";
            if (previous && Number.isFinite(previous[field.key])) {
                changeText = " " + formatMeasurementDelta(entry[field.key] - previous[field.key], field.kind);
            }
            item.innerHTML = "<small>" + escapeHtml(field.label) + "</small><strong>" +
                escapeHtml(formatMeasurementValue(entry[field.key], field.kind)) +
                (changeText ? '<em class="' + measurementOutcomeClass(field.key, entry[field.key] - previous[field.key]) + '">' + escapeHtml(changeText) + "</em>" : "") +
                "</strong>";
            values.appendChild(item);
        });
        row.append(heading, values);
        return row;
    }

    function measurementDisplayFields() {
        if (state.measurementSimplified === false) {
            return MEASUREMENT_FIELDS;
        }
        var simplifiedKeys = ["dailyCalories", "weightKg", "waistCm", "chestCm", "hipsCm", "upperArmRelaxedCm", "upperArmFlexedCm"];
        return simplifiedKeys.map(measurementField).filter(Boolean);
    }

    function saveMeasurement(event) {
        event.preventDefault();
        var date = elements.measurementDate.value;
        var values = readMeasurementFormValues(state.measurementUnit);
        if (!date || !measurementHasValues(values)) {
            showToast("Add a date and at least one value.");
            return;
        }

        var now = new Date().toISOString();
        var entry = activeMeasurementId
            ? state.measurementEntries.find(function (candidate) { return candidate.id === activeMeasurementId; })
            : state.measurementEntries.find(function (candidate) { return candidate.date === date; });
        var created = !entry;
        if (!entry) {
            entry = {
                id: createId("measurement"),
                createdAt: now
            };
            state.measurementEntries.push(entry);
        }
        entry.date = date;
        entry.note = elements.measurementNotes.value.trim().slice(0, 500);
        entry.updatedAt = now;
        MEASUREMENT_FIELDS.forEach(function (field) {
            if (field.key === "dailyCalories" && values[field.key] === null && Number.isFinite(entry[field.key])) {
                return;
            }
            entry[field.key] = values[field.key];
        });

        activeMeasurementId = null;
        var databaseSave = persist({ touchActiveNote: false, immediate: true });
        resetMeasurementForm();
        renderMeasurements();
        showToast(created ? "Saving measurements to database..." : "Saving updated check-in to database...");
        databaseSave.then(function (saved) {
            showToast(saved
                ? "Measurements saved to database."
                : "Measurements are queued and will retry when the database is reachable.");
        });
    }

    function editMeasurement(entryId) {
        var entry = state.measurementEntries.find(function (candidate) { return candidate.id === entryId; });
        if (!entry) {
            return;
        }
        activeMeasurementId = entryId;
        elements.measurementFormTitle.textContent = "Edit measurements";
        elements.measurementDate.value = entry.date;
        elements.measurementNotes.value = entry.note || "";
        elements.measurementCancelEdit.hidden = false;
        writeMeasurementFormValues(entry, state.measurementUnit);
        renderMeasurementHistory();
        elements.measurementForm.scrollIntoView({
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
            block: "start"
        });
    }

    function cancelMeasurementEdit() {
        activeMeasurementId = null;
        resetMeasurementForm();
        renderMeasurementHistory();
    }

    function deleteMeasurement(entryId) {
        var entry = state.measurementEntries.find(function (candidate) { return candidate.id === entryId; });
        if (!entry || !window.confirm("Delete the check-in from " + formatMeasurementDate(entry.date) + "?")) {
            return;
        }
        state.deletedMeasurementEntries[entryId] = new Date().toISOString();
        state.measurementEntries = state.measurementEntries.filter(function (candidate) { return candidate.id !== entryId; });
        if (activeMeasurementId === entryId) {
            activeMeasurementId = null;
            resetMeasurementForm();
        }
        persist({ touchActiveNote: false, immediate: true });
        renderMeasurements();
        showToast("Check-in deleted.");
    }

    function resetMeasurementForm() {
        elements.measurementForm.reset();
        elements.measurementUnit.value = state.measurementUnit;
        elements.measurementSimplified.checked = state.measurementSimplified !== false;
        elements.measurementDate.value = localDateKey(new Date());
        elements.measurementFormTitle.textContent = "Add measurements";
        elements.measurementCancelEdit.hidden = true;
        applyMeasurementMode();
        updateMeasurementUnitLabels();
    }

    function measurementField(key) {
        return MEASUREMENT_FIELDS.find(function (field) { return field.key === key; }) || null;
    }

    function readMeasurementFormValues(unit) {
        var values = {};
        elements.measurementForm.querySelectorAll("[data-measurement-field]").forEach(function (input) {
            var raw = input.value.trim();
            var kind = input.dataset.measurementKind;
            var number = raw === "" ? null : Number(raw);
            if (Number.isFinite(number)) {
                if (unit === "imperial" && kind === "weight") {
                    number /= 2.2046226218;
                } else if (unit === "imperial" && kind === "length") {
                    number *= 2.54;
                }
            }
            values[input.dataset.measurementField] = normalizeMeasurementNumber(number, kind);
        });
        return values;
    }

    function writeMeasurementFormValues(entry, unit) {
        elements.measurementForm.querySelectorAll("[data-measurement-field]").forEach(function (input) {
            var value = entry[input.dataset.measurementField];
            if (!Number.isFinite(value)) {
                input.value = "";
                return;
            }
            if (unit === "imperial" && input.dataset.measurementKind === "weight") {
                value *= 2.2046226218;
            } else if (unit === "imperial" && input.dataset.measurementKind === "length") {
                value /= 2.54;
            }
            input.value = String(Math.round(value * 10) / 10);
        });
    }

    function changeMeasurementUnit() {
        var nextUnit = elements.measurementUnit.value === "imperial" ? "imperial" : "metric";
        if (nextUnit === state.measurementUnit) {
            return;
        }
        var currentValues = readMeasurementFormValues(state.measurementUnit);
        state.measurementUnit = nextUnit;
        writeMeasurementFormValues(currentValues, nextUnit);
        updateMeasurementUnitLabels();
        persist({ touchActiveNote: false, immediate: true });
        renderMeasurementLatest();
        renderMeasurementHistory();
    }

    function changeMeasurementMode() {
        state.measurementSimplified = elements.measurementSimplified.checked;
        applyMeasurementMode();
        persist({ touchActiveNote: false, immediate: true });
        renderMeasurementLatest();
        renderMeasurementHistory();
    }

    function updateMeasurementUnitLabels() {
        var isImperial = state.measurementUnit === "imperial";
        document.querySelectorAll('[data-measurement-unit="weight"]').forEach(function (label) {
            label.textContent = isImperial ? "lb" : "kg";
        });
        document.querySelectorAll('[data-measurement-unit="length"]').forEach(function (label) {
            label.textContent = isImperial ? "in" : "cm";
        });
    }

    function formatMeasurementValue(value, kind) {
        var converted = value;
        var suffix = "%";
        if (kind === "calories") {
            suffix = " kcal";
        } else if (kind === "weight") {
            if (state.measurementUnit === "imperial") {
                converted *= 2.2046226218;
            }
            suffix = state.measurementUnit === "imperial" ? " lb" : " kg";
        } else if (kind === "length") {
            if (state.measurementUnit === "imperial") {
                converted /= 2.54;
            }
            suffix = state.measurementUnit === "imperial" ? " in" : " cm";
        }
        return formatMeasurementNumber(converted) + suffix;
    }

    function formatMeasurementDelta(value, kind) {
        var converted = value;
        var suffix = " pp";
        if (kind === "calories") {
            suffix = " kcal";
        } else if (kind === "weight") {
            if (state.measurementUnit === "imperial") {
                converted *= 2.2046226218;
            }
            suffix = state.measurementUnit === "imperial" ? " lb" : " kg";
        } else if (kind === "length") {
            if (state.measurementUnit === "imperial") {
                converted /= 2.54;
            }
            suffix = state.measurementUnit === "imperial" ? " in" : " cm";
        }
        var prefix = converted > 0.004 ? "+" : "";
        return prefix + formatMeasurementNumber(converted) + suffix;
    }

    function formatMeasurementNumber(value) {
        return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(Math.round(value * 10) / 10);
    }

    function formatMeasurementDate(dateKey) {
        return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" })
            .format(parseLocalDate(dateKey));
    }

    function escapeHtml(value) {
        var span = document.createElement("span");
        span.textContent = String(value || "");
        return span.innerHTML;
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

    function mealEntriesForDate(dateKey) {
        return state.mealEntries.filter(function (meal) { return meal.date === dateKey; })
            .sort(function (a, b) {
                return a.startMinutes - b.startMinutes || a.id.localeCompare(b.id);
            });
    }

    function scaledMealMacros(meal) {
        var multiplier = Math.max(0.01, Number(meal.portionPercent) || 100) / 100;
        var result = emptyRecipeMacros();
        MACRO_FIELDS.forEach(function (field) {
            var value = meal.macros && meal.macros[field.key];
            result[field.key] = Number.isFinite(value)
                ? Math.round(value * multiplier * 10) / 10
                : null;
        });
        return result;
    }

    function renderCalendarNutrition(meals) {
        var totals = { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };
        meals.forEach(function (meal) {
            var macros = scaledMealMacros(meal);
            MACRO_FIELDS.forEach(function (field) {
                if (Number.isFinite(macros[field.key])) {
                    totals[field.key] += macros[field.key];
                }
            });
        });
        MACRO_FIELDS.forEach(function (field) {
            totals[field.key] = Math.round(totals[field.key] * 10) / 10;
        });

        var targetEntry = latestDailyCalorieTarget();
        var target = targetEntry && Number.isFinite(targetEntry.dailyCalories)
            ? targetEntry.dailyCalories
            : null;
        elements.calendarCaloriesConsumed.textContent = formatMacroValue(totals.calories);
        elements.calendarCaloriesTarget.textContent = target ? formatMacroValue(target) : "no target";
        elements.calendarProteinTotal.textContent = formatMacroValue(totals.proteinG) + " g";
        elements.calendarCarbsTotal.textContent = formatMacroValue(totals.carbsG) + " g";
        elements.calendarFatTotal.textContent = formatMacroValue(totals.fatG) + " g";
        elements.calendarNutritionTargetButton.textContent = target
            ? "Change target in Measurements"
            : "Set calorie target in Measurements";

        var progress = target ? Math.min(100, totals.calories / target * 100) : 0;
        elements.calendarCaloriesProgress.querySelector("span").style.width = progress + "%";
        elements.calendarCaloriesProgress.setAttribute("aria-valuenow", String(Math.round(totals.calories)));
        if (target) {
            elements.calendarCaloriesProgress.setAttribute("aria-valuemax", String(Math.round(target)));
            var difference = Math.round((target - totals.calories) * 10) / 10;
            elements.calendarCaloriesRemaining.textContent = difference >= 0
                ? formatMacroValue(difference) + " kcal remaining"
                : formatMacroValue(Math.abs(difference)) + " kcal over target";
            elements.calendarCaloriesRemaining.classList.toggle("is-over", difference < 0);
        } else {
            elements.calendarCaloriesProgress.removeAttribute("aria-valuemax");
            elements.calendarCaloriesRemaining.textContent = meals.length
                ? plural(meals.length, "meal") + " logged · add a target to see what remains"
                : "Log a meal beside any hour.";
            elements.calendarCaloriesRemaining.classList.remove("is-over");
        }
    }

    function renderCalendar(dateKey, focusTimeline) {
        selectedCalendarDate = dateKey || localDateKey(new Date());
        showView("calendar");
        var date = parseLocalDate(selectedCalendarDate);
        var today = localDateKey(new Date());
        var isToday = selectedCalendarDate === today;
        var events = calendarEventsForDate(selectedCalendarDate);
        var meals = mealEntriesForDate(selectedCalendarDate);
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
        var summaryParts = [];
        if (events.length) {
            summaryParts.push(plural(events.length, "plan") + " · " + formatDuration(plannedMinutes));
        }
        if (meals.length) {
            summaryParts.push(plural(meals.length, "meal"));
        }
        elements.calendarSummary.textContent = summaryParts.length ? summaryParts.join(" · ") : "No plans or meals yet";
        renderCalendarNutrition(meals);

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
            var mealLane = document.createElement("div");
            mealLane.className = "todo-calendar-meal-lane";
            var hourMeals = meals.filter(function (meal) { return meal.startMinutes === hour * 60; });
            if (hourMeals.length) {
                mealLane.appendChild(buildCalendarMeal(hourMeals[0]));
                if (hourMeals.length > 1) {
                    var extraMeals = document.createElement("span");
                    extraMeals.className = "todo-calendar-meal-extra";
                    extraMeals.textContent = "+" + (hourMeals.length - 1);
                    extraMeals.title = plural(hourMeals.length - 1, "additional meal") + " at this hour";
                    mealLane.appendChild(extraMeals);
                }
            } else {
                var mealButton = document.createElement("button");
                mealButton.type = "button";
                mealButton.className = "todo-calendar-meal-add";
                mealButton.setAttribute("aria-label", "Log a meal at " + minutesToTime(hour * 60));
                mealButton.innerHTML = '<svg aria-hidden="true"><use href="#i-utensils"></use></svg><span>Meal?</span>';
                mealButton.addEventListener("click", (function (selectedHour) {
                    return function () {
                        openMealForm(null, selectedCalendarDate, selectedHour * 60);
                    };
                })(hour));
                mealLane.appendChild(mealButton);
            }
            slot.append(label, hitArea, mealLane);
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

    function buildCalendarMeal(meal) {
        var macros = scaledMealMacros(meal);
        var button = document.createElement("button");
        button.type = "button";
        button.className = "todo-calendar-meal";
        var calorieLabel = Number.isFinite(macros.calories)
            ? formatMacroValue(macros.calories) + " kcal"
            : "calories unavailable";
        button.setAttribute("aria-label", meal.recipeTitle + ", " + formatMacroValue(meal.portionPercent) +
            " percent portion, " + calorieLabel + ", at " + minutesToTime(meal.startMinutes));
        button.innerHTML = '<svg aria-hidden="true"><use href="#i-utensils"></use></svg>';
        var copy = document.createElement("span");
        var title = document.createElement("strong");
        title.textContent = meal.recipeTitle;
        var detail = document.createElement("small");
        detail.textContent = calorieLabel;
        copy.append(title, detail);
        button.appendChild(copy);
        button.addEventListener("click", function () {
            openMealForm(meal, meal.date, meal.startMinutes);
        });
        return button;
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
        persist({ touchActiveNote: false, immediate: true });
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
        persist({ touchActiveNote: false, immediate: true });
        closeModal(elements.calendarEventModal);
        renderCalendar(selectedCalendarDate, false);
        showToast("Event deleted.");
    }

    function mealEligibleRecipes() {
        return state.recipes.filter(function (recipe) {
            return Number.isFinite(recipe.macros && recipe.macros.calories);
        }).sort(function (a, b) {
            var aTitle = a.title || (a.kind === "food" ? "Untitled food item" : "Untitled recipe");
            var bTitle = b.title || (b.kind === "food" ? "Untitled food item" : "Untitled recipe");
            return aTitle.localeCompare(bTitle);
        });
    }

    function openMealForm(meal, dateKey, startMinutes) {
        activeMealEntryId = meal ? meal.id : null;
        pendingMealDate = meal ? meal.date : dateKey;
        pendingMealStartMinutes = meal ? meal.startMinutes : startMinutes;
        elements.mealFormTitle.textContent = meal ? "Edit meal" : "Log a meal";
        elements.mealFormContext.textContent = new Intl.DateTimeFormat(undefined, {
            weekday: "short",
            day: "numeric",
            month: "short"
        }).format(parseLocalDate(pendingMealDate)) + " · " + minutesToTime(pendingMealStartMinutes);
        elements.mealPortionPercent.value = String(meal ? meal.portionPercent : 100);
        elements.deleteMealButton.hidden = !meal;
        elements.saveMealButton.textContent = meal ? "Save meal" : "Log meal";
        elements.mealFormError.textContent = "";
        clear(elements.mealRecipeSelect);

        var recipes = mealEligibleRecipes();
        if (meal && !recipes.some(function (recipe) { return recipe.id === meal.recipeId; })) {
            var snapshotOption = document.createElement("option");
            snapshotOption.value = meal.recipeId;
            snapshotOption.textContent = meal.recipeTitle + " (saved snapshot)";
            snapshotOption.dataset.snapshot = "true";
            elements.mealRecipeSelect.appendChild(snapshotOption);
        }
        recipes.forEach(function (recipe) {
            var option = document.createElement("option");
            option.value = recipe.id;
            option.textContent = (recipe.title || (recipe.kind === "food" ? "Untitled food item" : "Untitled recipe")) +
                (recipe.kind === "food" ? " · food" : "") + " · " + formatMacroValue(recipe.macros.calories) + " kcal";
            elements.mealRecipeSelect.appendChild(option);
        });

        if (meal) {
            elements.mealRecipeSelect.value = meal.recipeId;
        }
        var hasOptions = elements.mealRecipeSelect.options.length > 0;
        elements.mealRecipeSelect.disabled = !hasOptions;
        elements.mealPortionPercent.disabled = !hasOptions;
        elements.mealMacroFields.disabled = !hasOptions;
        elements.saveMealButton.disabled = !hasOptions;
        elements.mealRecipeHelp.textContent = hasOptions
            ? "The calendar keeps its own nutrition snapshot, so changing a saved item later will not rewrite past days."
            : "Add calories to a recipe or food item first, then come back to log it.";
        updateMealMacroInputs(meal);
        openModal(elements.mealModal);
    }

    function selectedMealBase() {
        var recipeId = elements.mealRecipeSelect.value;
        var recipe = state.recipes.find(function (candidate) { return candidate.id === recipeId; });
        if (recipe) {
            return {
                recipeId: recipe.id,
                recipeTitle: recipe.title || (recipe.kind === "food" ? "Untitled food item" : "Untitled recipe"),
                macros: normalizeRecipeMacros(recipe.macros)
            };
        }
        var existing = activeMealEntryId
            ? state.mealEntries.find(function (meal) { return meal.id === activeMealEntryId; })
            : null;
        if (existing && existing.recipeId === recipeId) {
            return {
                recipeId: existing.recipeId,
                recipeTitle: existing.recipeTitle,
                macros: normalizeRecipeMacros(existing.macros)
            };
        }
        return null;
    }

    function updateMealMacroInputs(sourceMeal) {
        var base = selectedMealBase();
        var portion = Number(elements.mealPortionPercent.value);
        document.querySelectorAll("[data-meal-portion]").forEach(function (button) {
            var selected = Number(button.dataset.mealPortion) === portion;
            button.classList.toggle("is-selected", selected);
            button.setAttribute("aria-pressed", selected ? "true" : "false");
        });
        var totals = sourceMeal
            ? scaledMealMacros(sourceMeal)
            : base && Number.isFinite(portion) && portion > 0
                ? scaledMealMacros({ macros: base.macros, portionPercent: Math.min(1000, portion) })
                : emptyRecipeMacros();
        elements.mealMacroInputs.forEach(function (input) {
            var value = totals[input.dataset.mealMacro];
            input.value = Number.isFinite(value) ? String(value) : "";
        });
        elements.mealMacroHelp.textContent = base
            ? "Totals for this meal. Choose the portion first, then edit extras such as another protein scoop."
            : "Choose a recipe with calories to pre-fill nutrition.";
    }

    function mealMacroTotalsFromInputs() {
        var totals = emptyRecipeMacros();
        elements.mealMacroInputs.forEach(function (input) {
            totals[input.dataset.mealMacro] = normalizeMacroNumber(input.value, input.dataset.mealMacro);
        });
        return totals;
    }

    function unscaleMealMacros(totals, portionPercent) {
        var multiplier = portionPercent / 100;
        var baseMacros = emptyRecipeMacros();
        MACRO_FIELDS.forEach(function (field) {
            var value = totals[field.key];
            baseMacros[field.key] = Number.isFinite(value)
                ? Math.round(value / multiplier * 10) / 10
                : null;
        });
        return normalizeRecipeMacros(baseMacros);
    }

    function saveMeal(event) {
        event.preventDefault();
        elements.mealFormError.textContent = "";
        var base = selectedMealBase();
        var portion = Number(elements.mealPortionPercent.value);
        var macroTotals = mealMacroTotalsFromInputs();
        if (!base) {
            elements.mealFormError.textContent = "Choose a recipe that has calories.";
            elements.mealRecipeSelect.focus();
            return;
        }
        if (!Number.isFinite(portion) || portion < 1 || portion > 1000) {
            elements.mealFormError.textContent = "Portion must be between 1% and 1000%.";
            elements.mealPortionPercent.focus();
            return;
        }
        if (!Number.isFinite(macroTotals.calories)) {
            elements.mealFormError.textContent = "Enter the calories for this meal.";
            elements.mealMacroInputs[0].focus();
            return;
        }

        portion = Math.round(portion * 10) / 10;
        var now = new Date().toISOString();
        var meal = activeMealEntryId
            ? state.mealEntries.find(function (candidate) { return candidate.id === activeMealEntryId; })
            : null;
        if (!meal) {
            meal = {
                id: createId("meal"),
                createdAt: now
            };
            state.mealEntries.push(meal);
        }
        meal.date = pendingMealDate;
        meal.startMinutes = pendingMealStartMinutes;
        meal.recipeId = base.recipeId;
        meal.recipeTitle = base.recipeTitle;
        meal.portionPercent = portion;
        meal.macros = unscaleMealMacros(macroTotals, portion);
        meal.updatedAt = now;

        var scaled = scaledMealMacros(meal);
        selectedCalendarDate = meal.date;
        activeMealEntryId = null;
        persist({ touchActiveNote: false, immediate: true });
        closeModal(elements.mealModal);
        renderCalendar(selectedCalendarDate, false);
        showToast(meal.recipeTitle + " logged · " + formatMacroValue(scaled.calories) + " kcal.");
    }

    function deleteMeal() {
        if (!activeMealEntryId) {
            return;
        }
        var meal = state.mealEntries.find(function (candidate) { return candidate.id === activeMealEntryId; });
        if (!meal || !window.confirm("Delete " + meal.recipeTitle + " from this day?")) {
            return;
        }
        state.deletedMealEntries[meal.id] = new Date().toISOString();
        state.mealEntries = state.mealEntries.filter(function (candidate) { return candidate.id !== meal.id; });
        activeMealEntryId = null;
        persist({ touchActiveNote: false, immediate: true });
        closeModal(elements.mealModal);
        renderCalendar(selectedCalendarDate, false);
        showToast("Meal deleted.");
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
            var focusable = modal.querySelector("input:not([readonly]):not(:disabled), select:not(:disabled), textarea:not([readonly]):not(:disabled), button:not(:disabled):not([data-close-modal]):not([data-close-group-modal]):not([data-close-calendar-event]):not([data-close-meal]):not([data-close-sync-conflict])");
            if (focusable) {
                focusable.focus();
            }
        }, 0);
    }

    function closeModal(modal) {
        modal.hidden = true;
        modal.setAttribute("aria-hidden", "true");
        if (elements.settingsModal.hidden && elements.groupModal.hidden && elements.calendarEventModal.hidden && elements.mealModal.hidden && elements.syncConflictModal.hidden) {
            document.body.classList.remove("todo-modal-open");
        }
    }

    function openSettings() {
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
                activeRecipeId = null;
                persist({ immediate: true });
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
            meals: documentCopy.mealEntries.length,
            goals: documentCopy.goals.length,
            measurements: documentCopy.measurementEntries.length,
            recipes: documentCopy.recipes.length,
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
        elements[prefix + "SyncMeals"].textContent = plural(stats.meals, "logged meal");
        elements[prefix + "SyncGoals"].textContent = plural(stats.goals, "goal");
        elements[prefix + "SyncMeasurements"].textContent = plural(stats.measurements, "measurement check-in");
        elements[prefix + "SyncRecipes"].textContent = plural(stats.recipes, "saved food item");
        elements[prefix + "SyncUpdated"].textContent = syncSaveTime(stats.updatedAt);
    }

    function adoptSyncKey(key) {
        syncKey = "shared";
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
        markDatabaseSyncPending(false);
        activeView = "home";
        activeGroupId = null;
        activeNoteId = null;
        activeRecipeId = null;
        returnGroupId = null;
        renderHome();
        if (!elements.settingsModal.hidden) {
            closeModal(elements.settingsModal);
        }
        closeSyncConflict(true);
        setEditorSaved(false);
        setSyncStatus("Saved to database", false);
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
            setSyncStatus("Database save pending", true);
            showToast(error.message || "Could not connect. Both saves are still safe.");
        } finally {
            setSyncConflictBusy(false, null);
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

    document.getElementById("homeButton").addEventListener("click", function () {
        if (activeView === "recipeEditor") {
            finishRecipeEditing();
        }
        renderHome();
    });
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
    elements.noteTitle.addEventListener("keydown", function (event) {
        if (event.key !== "Enter" || event.isComposing) {
            return;
        }
        event.preventDefault();
        var firstItemInput = elements.itemList.querySelector("[data-item-input]");
        if (firstItemInput) {
            firstItemInput.focus();
            firstItemInput.setSelectionRange(firstItemInput.value.length, firstItemInput.value.length);
        } else {
            addRootItem();
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
    document.querySelectorAll("[data-close-meal]").forEach(function (button) {
        button.addEventListener("click", function () {
            activeMealEntryId = null;
            closeModal(elements.mealModal);
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
    elements.homeTodayCalendarButton.addEventListener("click", openTodayCalendar);
    elements.homeTodayNextEvent.addEventListener("click", openTodayCalendar);
    elements.calendarDatePicker.addEventListener("change", function () {
        if (elements.calendarDatePicker.value) {
            renderCalendar(elements.calendarDatePicker.value, true);
        }
    });
    elements.calendarEventForm.addEventListener("submit", saveCalendarEvent);
    elements.deleteCalendarEventButton.addEventListener("click", deleteCalendarEvent);
    elements.calendarNutritionTargetButton.addEventListener("click", openMeasurements);
    elements.mealForm.addEventListener("submit", saveMeal);
    elements.mealRecipeSelect.addEventListener("change", function () { updateMealMacroInputs(null); });
    elements.mealPortionPercent.addEventListener("input", function () { updateMealMacroInputs(null); });
    document.querySelectorAll("[data-meal-portion]").forEach(function (button) {
        button.addEventListener("click", function () {
            elements.mealPortionPercent.value = button.dataset.mealPortion;
            updateMealMacroInputs(null);
        });
    });
    elements.deleteMealButton.addEventListener("click", deleteMeal);
    elements.calendarEventTitle.addEventListener("keydown", function (event) {
        if (event.key === "Enter" && !event.isComposing) {
            event.preventDefault();
            elements.calendarEventDate.focus();
        }
    });
    elements.goalTitle.addEventListener("keydown", function (event) {
        if (event.key === "Enter" && !event.isComposing) {
            event.preventDefault();
            elements.goalDeadline.focus();
        }
    });
    elements.goalForm.addEventListener("submit", addGoal);
    elements.measurementForm.addEventListener("submit", saveMeasurement);
    elements.measurementSimplified.addEventListener("change", changeMeasurementMode);
    elements.measurementUnit.addEventListener("change", changeMeasurementUnit);
    elements.measurementCancelEdit.addEventListener("click", cancelMeasurementEdit);
    document.getElementById("newRecipeButton").addEventListener("click", function () { createRecipe("recipe"); });
    document.getElementById("newFoodItemButton").addEventListener("click", function () { createRecipe("food"); });
    document.querySelectorAll('[data-action="close-recipe-editor"]').forEach(function (button) {
        button.addEventListener("click", closeRecipeEditor);
    });
    elements.recipeSearch.addEventListener("input", renderRecipes);
    elements.recipeTitle.addEventListener("input", function () {
        var recipe = getActiveRecipe();
        if (recipe) {
            recipe.title = elements.recipeTitle.value;
            persist({ touchActiveNote: false });
        }
    });
    elements.recipeTitle.addEventListener("keydown", function (event) {
        if (event.key === "Enter" && !event.isComposing) {
            event.preventDefault();
            var recipe = getActiveRecipe();
            (recipe && recipe.kind === "food" ? elements.recipeMacroText : elements.recipeIngredients).focus();
        }
    });
    elements.recipeIngredients.addEventListener("input", function () {
        updateRecipeListField("ingredients", elements.recipeIngredients);
    });
    elements.recipeIngredients.addEventListener("blur", function () {
        tidyRecipeListField("ingredients", elements.recipeIngredients, false);
    });
    elements.recipeIngredients.addEventListener("paste", function (event) {
        pasteRecipeList(event, "ingredients", elements.recipeIngredients, false);
    });
    elements.recipeIngredients.addEventListener("keydown", function (event) {
        addRecipeLine(event, "ingredients", elements.recipeIngredients, false);
    });
    elements.recipeMethod.addEventListener("input", function () {
        updateRecipeListField("method", elements.recipeMethod);
    });
    elements.recipeMethod.addEventListener("blur", function () {
        tidyRecipeListField("method", elements.recipeMethod, true);
    });
    elements.recipeMethod.addEventListener("paste", function (event) {
        pasteRecipeList(event, "method", elements.recipeMethod, true);
    });
    elements.recipeMethod.addEventListener("keydown", function (event) {
        addRecipeLine(event, "method", elements.recipeMethod, true);
    });
    elements.recipeMacroText.addEventListener("input", updateRecipeMacrosFromText);
    elements.recipeMacroInputs.forEach(function (input) {
        input.addEventListener("change", function () { updateRecipeMacroValue(input); });
    });
    elements.recipeNotes.addEventListener("input", function () {
        var recipe = getActiveRecipe();
        if (recipe) {
            recipe.notes = elements.recipeNotes.value.slice(0, 4000);
            persist({ touchActiveNote: false });
        }
    });
    document.getElementById("deleteRecipeButton").addEventListener("click", deleteActiveRecipe);
    elements.groupForm.addEventListener("submit", createGroup);
    document.getElementById("syncNowButton").addEventListener("click", function () { pushCloud(true); });
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
            if (activeView === "recipeEditor") {
                finishRecipeEditing();
            }
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
            } else if (!elements.mealModal.hidden) {
                activeMealEntryId = null;
                closeModal(elements.mealModal);
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
            } else if (activeView === "goals") {
                renderHome();
            } else if (activeView === "measurements") {
                renderHome();
            } else if (activeView === "recipes") {
                renderHome();
            } else if (activeView === "recipeEditor") {
                closeRecipeEditor();
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
                    mutationSequence += 1;
                    markDatabaseSyncPending(true);
                    renderCurrentView();
                    setSyncStatus("Updated", false);
                    scheduleCloudPush();
                }
            } catch (error) {
                console.warn("Ignored an invalid todo update from another tab.", error);
            }
        }
    });

    window.addEventListener("online", function () {
        setSyncStatus(databaseSyncPending() ? "Saving to database..." : "Back online", false);
        syncCloud();
    });
    window.addEventListener("offline", function () {
        setSyncStatus(databaseSyncPending() ? "Offline - database save pending" : "Offline", true);
    });
    window.addEventListener("beforeunload", function () {
        saveLocalDocument();
        if (navigator.onLine && databaseSyncPending()) {
            syncCloud({ quiet: true });
        }
    });

    function requestBackgroundSync() {
        if (initialPaintComplete && navigator.onLine && !pendingSyncConflict && !syncConflictResolving) {
            syncCloud({ quiet: true });
        }
    }

    function syncAfterInitialPaint() {
        window.requestAnimationFrame(function () {
            window.requestAnimationFrame(function () {
                initialPaintComplete = true;
                if (!navigator.onLine) {
                    setSyncStatus(databaseSyncPending() ? "Offline - database save pending" : "Offline", true);
                    return;
                }
                syncCloud({ quiet: true });
            });
        });
    }

    document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "visible") {
            requestBackgroundSync();
        } else if (navigator.onLine && databaseSyncPending()) {
            syncCloud({ quiet: true });
        }
    });
    window.addEventListener("pagehide", function () {
        if (navigator.onLine && databaseSyncPending()) {
            syncCloud({ quiet: true });
        }
    });
    window.addEventListener("focus", requestBackgroundSync);
    root.addEventListener("focusout", function () {
        if (navigator.onLine && databaseSyncPending()) {
            syncCloud({ quiet: true, waitForLatest: true });
        }
    });
    window.setInterval(requestBackgroundSync, CLOUD_POLL_INTERVAL);
    currentTimeTimer = window.setInterval(function () {
        updateCurrentTimeLine();
        if (activeView === "home" && !elements.homeTodayDashboard.hidden) {
            renderHomeTodayDashboard();
        }
    }, 60000);

    renderGroupColors();
    renderHome();
    syncAfterInitialPaint();
})();
