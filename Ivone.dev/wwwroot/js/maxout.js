(function () {
    "use strict";

    const KG_PER_LB = 0.45359237;
    const priorityActivities = ["Road Bike", "Mountain Bike", "Run"];
    const activityNames = new Set(priorityActivities.map(normalizeName));

    const catalog = {
        "Arms": [
            "Barbell Curl",
            "Cable Curl",
            "Close-Grip Bench Press",
            "Concentration Curl",
            "Dip",
            "Hammer Curl",
            "Overhead Triceps Extension",
            "Preacher Curl",
            "Skull Crusher",
            "Triceps Pushdown",
            "Wrist Curl"
        ],
        "Back": [
            "Assisted Pull-Up",
            "Barbell Row",
            "Cable Row",
            "Chin-Up",
            "Dumbbell Row",
            "Face Pull",
            "Lat Pulldown",
            "Pull-Up",
            "Rear Delt Fly",
            "T-Bar Row"
        ],
        "Cardio": [
            "Air Bike",
            "Cycling",
            "Elliptical",
            "Jump Rope",
            "Rowing Machine",
            "Running",
            "SkiErg",
            "Stair Climber",
            "Swimming",
            "Walking"
        ],
        "Chest": [
            "Bench Press",
            "Cable Fly",
            "Chest Dip",
            "Chest Press",
            "Decline Bench Press",
            "Dumbbell Bench Press",
            "Incline Bench Press",
            "Incline Dumbbell Press",
            "Pec Deck",
            "Push-Up"
        ],
        "Core": [
            "Ab Wheel Rollout",
            "Cable Crunch",
            "Dead Bug",
            "Hanging Knee Raise",
            "Hanging Leg Raise",
            "Plank",
            "Reverse Crunch",
            "Russian Twist",
            "Side Plank",
            "Sit-Up"
        ],
        "Full body": [
            "Battle Rope",
            "Burpee",
            "Clean and Press",
            "Farmer Carry",
            "Kettlebell Swing",
            "Medicine Ball Slam",
            "Sled Push",
            "Thruster",
            "Turkish Get-Up"
        ],
        "Legs": [
            "Back Squat",
            "Bulgarian Split Squat",
            "Calf Raise",
            "Front Squat",
            "Glute Bridge",
            "Hack Squat",
            "Hip Thrust",
            "Leg Curl",
            "Leg Extension",
            "Leg Press",
            "Lunge",
            "Romanian Deadlift",
            "Step-Up"
        ],
        "Lower back": [
            "Back Extension",
            "Bird Dog",
            "Deadlift",
            "Good Morning",
            "Rack Pull",
            "Romanian Deadlift",
            "Superman"
        ],
        "Mobility": [
            "Ankle Mobility Drill",
            "Band Pull-Apart",
            "Cat Cow",
            "Hip Airplane",
            "Shoulder Dislocate",
            "World's Greatest Stretch"
        ],
        "Shoulders": [
            "Arnold Press",
            "Face Pull",
            "Front Raise",
            "Lateral Raise",
            "Overhead Press",
            "Push Press",
            "Rear Delt Fly",
            "Shoulder Press",
            "Upright Row"
        ]
    };

    const app = document.getElementById("maxoutApp");
    if (!app) {
        return;
    }

    const urls = {
        state: app.dataset.stateUrl,
        saveWorkout: app.dataset.saveWorkoutUrl,
        endWorkout: app.dataset.endWorkoutUrl,
        updateWorkout: app.dataset.updateWorkoutUrl,
        deleteWorkout: app.dataset.deleteWorkoutUrl
    };
    const token = app.dataset.requestToken || "";
    const sharedUserId = Math.max(1, Number(app.dataset.sharedUserId) || 1);

    const els = {
        identityButton: document.getElementById("identityButton"),
        homeView: document.getElementById("homeView"),
        workoutView: document.getElementById("workoutView"),
        historyView: document.getElementById("historyView"),
        guideView: document.getElementById("guideView"),
        newWorkoutButton: document.getElementById("newWorkoutButton"),
        historyButton: document.getElementById("historyButton"),
        homeHistoryButton: document.getElementById("homeHistoryButton"),
        guideButton: document.getElementById("guideButton"),
        resumeWorkoutButton: document.getElementById("resumeWorkoutButton"),
        historyBackButton: document.getElementById("historyBackButton"),
        guideBackButton: document.getElementById("guideBackButton"),
        homeStatus: document.getElementById("homeStatus"),
        historyStatus: document.getElementById("historyStatus"),
        homeActiveWorkout: document.getElementById("homeActiveWorkout"),
        homeActiveWorkoutTitle: document.getElementById("homeActiveWorkoutTitle"),
        homeActiveWorkoutDetail: document.getElementById("homeActiveWorkoutDetail"),
        homeWeekWorkouts: document.getElementById("homeWeekWorkouts"),
        homeWeekTrend: document.getElementById("homeWeekTrend"),
        homeMonthWorkouts: document.getElementById("homeMonthWorkouts"),
        homeMonthTrend: document.getElementById("homeMonthTrend"),
        homeMonthVolume: document.getElementById("homeMonthVolume"),
        homeVolumeTrend: document.getElementById("homeVolumeTrend"),
        homeMonthDistance: document.getElementById("homeMonthDistance"),
        homeDistanceTrend: document.getElementById("homeDistanceTrend"),
        homeRecentWorkouts: document.getElementById("homeRecentWorkouts"),
        workoutEditorContext: document.getElementById("workoutEditorContext"),
        exerciseSelect: document.getElementById("exerciseSelect"),
        exerciseList: document.getElementById("exerciseList"),
        historyList: document.getElementById("historyList"),
        unitKg: document.getElementById("unitKg"),
        unitLb: document.getElementById("unitLb"),
        cancelWorkoutEditButton: document.getElementById("cancelWorkoutEditButton"),
        endWorkoutButton: document.getElementById("endWorkoutButton")
    };

    let userId = sharedUserId;
    let currentWorkout = null;
    let history = [];
    let saveTimer = null;
    let isSaving = false;
    let saveQueued = false;
    let editingCompletedWorkoutId = null;
    let workoutBeforeHistoryEdit = null;

    function init() {
        populateExerciseSelect();
        bindEvents();
        updateIdentity();
        renderHomeDashboard();

        loadState(userId);
    }

    function bindEvents() {
        els.newWorkoutButton.addEventListener("click", async function () {
            if (hasActiveWorkout()) {
                renderWorkout();
                showView("workout");
                return;
            }
            els.newWorkoutButton.disabled = true;
            currentWorkout = newWorkout();
            renderWorkout();
            showView("workout");

            try {
                await ensureSharedProfile();
            } catch (error) {
                setStatus(error.message);
            } finally {
                els.newWorkoutButton.disabled = false;
            }
        });

        els.historyButton.addEventListener("click", function () {
            renderHistory();
            showView("history");
        });

        els.homeHistoryButton.addEventListener("click", function () {
            renderHistory();
            showView("history");
        });

        els.resumeWorkoutButton.addEventListener("click", function () {
            if (!hasActiveWorkout()) {
                return;
            }
            renderWorkout();
            showView("workout");
        });

        els.guideButton.addEventListener("click", function () {
            showView("guide");
        });

        els.historyBackButton.addEventListener("click", function () {
            showView("home");
        });

        els.guideBackButton.addEventListener("click", function () {
            showView("home");
        });

        els.cancelWorkoutEditButton.addEventListener("click", cancelCompletedWorkoutEdit);

        els.exerciseSelect.addEventListener("change", function () {
            const option = els.exerciseSelect.selectedOptions[0];
            const name = option ? option.value : "";
            if (!name || !currentWorkout) {
                return;
            }

            currentWorkout.exercises.unshift(createExerciseFromSelection(name, option.dataset.category || ""));
            els.exerciseSelect.value = "";
            renderWorkout();
            scheduleSave();
        });

        [els.unitKg, els.unitLb].forEach(function (button) {
            button.addEventListener("click", function () {
                if (!currentWorkout) {
                    return;
                }

                currentWorkout.weightUnit = button.dataset.unit;
                updateUnitButtons();
                renderWorkout();
                scheduleSave();
            });
        });

        els.endWorkoutButton.addEventListener("click", async function () {
            if (!currentWorkout || !userId) {
                setStatus("Start a workout first.");
                return;
            }
            if (!currentWorkout.exercises.length) {
                setStatus("Add an exercise or activity before ending the workout.");
                return;
            }

            clearTimeout(saveTimer);
            saveTimer = null;
            els.endWorkoutButton.disabled = true;
            const wasEditingHistory = Boolean(editingCompletedWorkoutId);
            try {
                const state = await postJson(wasEditingHistory ? urls.updateWorkout : urls.endWorkout, {
                    userId,
                    workout: toWorkoutPayload(currentWorkout)
                });
                editingCompletedWorkoutId = null;
                workoutBeforeHistoryEdit = null;
                applyState(state);
                renderHistory();
                showView(wasEditingHistory ? "history" : "home");
            } catch (error) {
                setStatus(error.message);
            } finally {
                els.endWorkoutButton.disabled = false;
            }
        });
    }

    function populateExerciseSelect() {
        els.exerciseSelect.innerHTML = "";
        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = "Select exercise";
        els.exerciseSelect.appendChild(placeholder);
        const workoutAgeMap = getRecentWorkoutExerciseAges();

        priorityActivities.forEach(function (activityName) {
            const option = exerciseOption(activityName, "Outdoor", workoutAgeMap);
            option.textContent = activityName;
            els.exerciseSelect.appendChild(option);
        });

        Object.keys(catalog)
            .sort((a, b) => a.localeCompare(b))
            .forEach(function (groupName) {
                const group = document.createElement("optgroup");
                group.label = groupName;
                catalog[groupName]
                    .slice()
                    .sort((a, b) => a.localeCompare(b))
                    .forEach(function (exerciseName) {
                        group.appendChild(exerciseOption(exerciseName, groupName, workoutAgeMap));
                    });
                els.exerciseSelect.appendChild(group);
            });
    }

    function exerciseOption(exerciseName, category, workoutAgeMap) {
        const option = document.createElement("option");
        option.value = exerciseName;
        option.dataset.category = category;
        option.textContent = `${exerciseName} (${category})`;
        const workoutAges = workoutAgeMap.get(normalizeName(exerciseName));
        if (workoutAges && workoutAges.length > 0) {
            const newestAge = workoutAges[0];
            option.className = `workout-age-${newestAge}`;
            option.textContent = `${option.textContent} - ${formatWorkoutAgeList(workoutAges)}`;
        }
        return option;
    }

    async function loadState(id) {
        try {
            const response = await fetch(`${urls.state}&userId=${encodeURIComponent(id)}`);
            const state = await parseResponse(response);
            applyState(state);
        } catch (error) {
            userId = sharedUserId;
            currentWorkout = null;
            history = [];
            updateIdentity();
            setStatus(error.message);
        }
    }

    function applyState(state) {
        userId = state.userId;
        history = Array.isArray(state.history) ? state.history.map(fromServerWorkout) : [];
        currentWorkout = state.activeWorkout ? fromServerWorkout(state.activeWorkout) : null;

        setStatus(state.message || "");

        updateIdentity();
        renderHistory();
        populateExerciseSelect();
        renderHomeDashboard();
    }

    function showView(viewName) {
        els.homeView.hidden = viewName !== "home";
        els.workoutView.hidden = viewName !== "workout";
        els.historyView.hidden = viewName !== "history";
        els.guideView.hidden = viewName !== "guide";
        if (viewName === "home") {
            renderHomeDashboard();
        }
    }

    async function ensureSharedProfile() {
        userId = sharedUserId;
    }

    function updateIdentity() {
        els.identityButton.setAttribute("aria-label", "Back to Todo mission control");
    }

    function setStatus(message) {
        els.homeStatus.textContent = message || "";
        els.historyStatus.textContent = message || "";
    }

    function newWorkout() {
        return {
            id: null,
            startedOnUtc: new Date().toISOString(),
            completedOnUtc: null,
            status: "InProgress",
            weightUnit: "kg",
            exercises: []
        };
    }

    function hasActiveWorkout() {
        return Boolean(currentWorkout && Array.isArray(currentWorkout.exercises) && currentWorkout.exercises.length);
    }

    function createExerciseFromSelection(name, category) {
        const lastExercise = getLastExercise(name, category);
        if (isActivityExercise({ name })) {
            return {
                name,
                category,
                activity: lastExercise && lastExercise.activity
                    ? Object.assign(emptyActivity(), lastExercise.activity, {
                        sourceFileName: null,
                        startedOnUtc: null,
                        endedOnUtc: null
                    })
                    : emptyActivity(),
                sets: []
            };
        }
        return {
            name,
            category,
            sets: lastExercise
                ? lastExercise.sets.map(createSetFromLast)
                : []
        };
    }

    function isActivityExercise(exercise) {
        return activityNames.has(normalizeName(exercise && exercise.name));
    }

    function emptyActivity() {
        return {
            sourceFileName: null,
            startedOnUtc: null,
            endedOnUtc: null,
            distanceKm: null,
            elapsedSeconds: null,
            movingSeconds: null,
            elevationGainM: null,
            elevationLossM: null,
            averageSpeedKph: null,
            maximumSpeedKph: null,
            averageHeartRateBpm: null,
            maximumHeartRateBpm: null,
            averageCadenceRpm: null,
            maximumCadenceRpm: null,
            trackPointCount: null
        };
    }

    function createSetFromLast(last) {
        if (!last) {
            return { reps: 0, maxKg: 0 };
        }

        return {
            reps: Math.max(0, Math.round(last.reps || 0)),
            maxKg: Math.max(0, Number(last.maxKg) || 0),
            lastReps: Math.max(0, Math.round(last.reps || 0)),
            lastMaxKg: Math.max(0, Number(last.maxKg) || 0)
        };
    }

    function getLastSetForExercise(exercise, setIndex) {
        const lastExercise = getLastExercise(exercise.name, exercise.category);
        return lastExercise && lastExercise.sets ? lastExercise.sets[setIndex] : null;
    }

    function getLastExercise(name, category) {
        const normalizedName = normalizeName(name);
        const normalizedCategory = normalizeName(category);
        let fallback = null;

        for (const workout of history) {
            for (const exercise of workout.exercises || []) {
                if (normalizeName(exercise.name) !== normalizedName) {
                    continue;
                }

                if (normalizedCategory && normalizeName(exercise.category) === normalizedCategory) {
                    return exercise;
                }

                fallback = fallback || exercise;
            }

            if (fallback) {
                return fallback;
            }
        }

        return null;
    }

    function getRecentWorkoutExerciseAges() {
        const exerciseAges = new Map();
        history.slice(0, 3).forEach(function (workout, index) {
            const workoutAge = index + 1;
            (workout.exercises || []).forEach(function (exercise) {
                const key = normalizeName(exercise.name);
                if (!key) {
                    return;
                }

                if (!exerciseAges.has(key)) {
                    exerciseAges.set(key, []);
                }

                const ages = exerciseAges.get(key);
                if (!ages.includes(workoutAge)) {
                    ages.push(workoutAge);
                }
            });
        });

        exerciseAges.forEach(function (ages) {
            ages.sort((a, b) => a - b);
        });
        return exerciseAges;
    }

    function renderWorkout() {
        updateWorkoutEditorMode();
        if (!currentWorkout) {
            els.exerciseList.innerHTML = "";
            return;
        }

        updateUnitButtons();
        els.exerciseList.innerHTML = "";

        if (currentWorkout.exercises.length === 0) {
            els.exerciseList.appendChild(emptyState("Select an exercise to start."));
            return;
        }

        currentWorkout.exercises.forEach(function (exercise, exerciseIndex) {
            els.exerciseList.appendChild(renderExercise(exercise, exerciseIndex));
        });
    }

    function updateWorkoutEditorMode() {
        const editingHistory = Boolean(editingCompletedWorkoutId);
        els.cancelWorkoutEditButton.hidden = !editingHistory;
        els.endWorkoutButton.textContent = editingHistory ? "Save changes" : "End workout";
        els.workoutEditorContext.textContent = editingHistory
            ? "Editing completed workout"
            : "Exercise or activity";
    }

    function renderExercise(exercise, exerciseIndex) {
        const card = document.createElement("article");
        card.className = `exercise-card ${exerciseIndex === 0 ? "is-current" : "is-past"}`;

        const head = document.createElement("div");
        head.className = "exercise-head";

        const title = document.createElement("div");
        title.className = "exercise-title";
        const nameRow = document.createElement("div");
        nameRow.className = "exercise-name-row";
        const name = document.createElement("strong");
        name.textContent = exercise.name;
        nameRow.appendChild(name);
        if (exercise.category) {
            const category = document.createElement("span");
            category.className = "exercise-category";
            category.textContent = `(${exercise.category})`;
            nameRow.appendChild(category);
        }
        const count = document.createElement("span");
        count.textContent = isActivityExercise(exercise)
            ? activityHeadline(exercise.activity)
            : `${exercise.sets.length} set${exercise.sets.length === 1 ? "" : "s"}`;
        title.append(nameRow, count);

        const deleteButton = document.createElement("button");
        deleteButton.className = "delete-exercise";
        deleteButton.type = "button";
        deleteButton.setAttribute("aria-label", `Delete ${exercise.name}`);
        deleteButton.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 16h10l1-16"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>';
        deleteButton.addEventListener("click", function () {
            currentWorkout.exercises.splice(exerciseIndex, 1);
            renderWorkout();
            scheduleSave();
        });

        head.append(title, deleteButton);
        card.appendChild(head);

        if (isActivityExercise(exercise)) {
            card.appendChild(renderActivityEditor(exercise));
            return card;
        }

        const setsControl = document.createElement("div");
        setsControl.className = "sets-control";
        const minusSets = stepButton("-", `Remove set from ${exercise.name}`);
        const plusSets = stepButton("+", `Add set to ${exercise.name}`);
        const setsInputWrap = document.createElement("div");
        const setsLabel = document.createElement("label");
        setsLabel.className = "number-label";
        setsLabel.textContent = "Sets";
        const setsInput = numberInput(exercise.sets.length, 0, "sets-input metric-input");
        setsInput.addEventListener("change", function () {
            resizeSets(exercise, Number(setsInput.value) || 0);
            renderWorkout();
            scheduleSave();
        });
        setsInputWrap.append(setsLabel, setsInput);
        minusSets.addEventListener("click", function () {
            resizeSets(exercise, exercise.sets.length - 1);
            renderWorkout();
            scheduleSave();
        });
        plusSets.addEventListener("click", function () {
            resizeSets(exercise, exercise.sets.length + 1);
            renderWorkout();
            scheduleSave();
        });
        setsControl.append(minusSets, setsInputWrap, plusSets);
        card.appendChild(setsControl);

        const setList = document.createElement("div");
        setList.className = "set-list";
        exercise.sets.forEach(function (set, setIndex) {
            setList.appendChild(renderSetRow(set, setIndex));
        });
        card.appendChild(setList);

        return card;
    }

    function renderActivityEditor(exercise) {
        exercise.activity = Object.assign(emptyActivity(), exercise.activity || {});
        const activity = exercise.activity;
        const wrap = document.createElement("div");
        wrap.className = "activity-editor";

        const intro = document.createElement("div");
        intro.className = "activity-import";
        const copy = document.createElement("div");
        const title = document.createElement("strong");
        title.textContent = activity.sourceFileName ? "GPX imported" : "Import a GPX track";
        const detail = document.createElement("span");
        detail.textContent = activity.sourceFileName
            ? `${activity.sourceFileName} · ${activity.trackPointCount || 0} track points`
            : "Processed privately in your browser; only extracted stats and file metadata are saved.";
        copy.append(title, detail);

        const upload = document.createElement("label");
        upload.className = "gpx-upload-button";
        upload.textContent = activity.sourceFileName ? "Replace GPX" : "Choose GPX";
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".gpx,application/gpx+xml,application/xml,text/xml";
        input.setAttribute("aria-label", `Import GPX for ${exercise.name}`);
        input.addEventListener("change", async function () {
            const file = input.files && input.files[0];
            if (!file) {
                return;
            }
            if (file.size > 25 * 1024 * 1024) {
                exercise.importMessage = "That GPX is over 25 MB. Export a simplified track and try again.";
                renderWorkout();
                return;
            }

            upload.classList.add("is-loading");
            try {
                const parsed = parseGpx(await file.text(), file.name);
                exercise.activity = Object.assign(emptyActivity(), parsed);
                exercise.importMessage = `Imported ${formatActivityDistance(parsed.distanceKm)} and ${formatDuration(parsed.elapsedSeconds)}.`;
                if (parsed.startedOnUtc) {
                    currentWorkout.startedOnUtc = parsed.startedOnUtc;
                }
                renderWorkout();
                scheduleSave();
            } catch (error) {
                exercise.importMessage = error.message || "This GPX could not be read.";
                renderWorkout();
            }
        });
        upload.appendChild(input);
        intro.append(copy, upload);
        wrap.appendChild(intro);

        if (exercise.importMessage) {
            const status = document.createElement("p");
            status.className = "activity-import-status";
            status.setAttribute("role", "status");
            status.textContent = exercise.importMessage;
            wrap.appendChild(status);
        }

        const fields = document.createElement("div");
        fields.className = "activity-fields";
        fields.append(
            activityNumberField("Distance", "km", activity.distanceKm, "0.01", function (value) {
                activity.distanceKm = nullableNumber(value);
                recalculateActivitySpeed(activity);
            }),
            activityNumberField("Elapsed time", "min", secondsToMinutes(activity.elapsedSeconds), "1", function (value) {
                activity.elapsedSeconds = minutesToSeconds(value);
                recalculateActivitySpeed(activity);
            }),
            activityNumberField("Moving time", "min", secondsToMinutes(activity.movingSeconds), "1", function (value) {
                activity.movingSeconds = minutesToSeconds(value);
                recalculateActivitySpeed(activity);
            }),
            activityNumberField("Elevation gain", "m", activity.elevationGainM, "1", function (value) {
                activity.elevationGainM = nullableNumber(value);
            })
        );
        wrap.appendChild(fields);

        const stats = activityStats(activity);
        if (stats.length) {
            const list = document.createElement("dl");
            list.className = "activity-stats";
            stats.forEach(function (stat) {
                const item = document.createElement("div");
                const label = document.createElement("dt");
                label.textContent = stat.label;
                const value = document.createElement("dd");
                value.textContent = stat.value;
                item.append(label, value);
                list.appendChild(item);
            });
            wrap.appendChild(list);
        }

        return wrap;
    }

    function activityNumberField(labelText, unit, value, step, onChange) {
        const label = document.createElement("label");
        const text = document.createElement("span");
        text.textContent = labelText;
        const control = document.createElement("span");
        control.className = "activity-field-control";
        const input = numberInput(Number.isFinite(value) ? round2(value) : "", 0, "metric-input");
        input.step = step;
        input.inputMode = "decimal";
        input.addEventListener("change", function () {
            onChange(input.value);
            renderWorkout();
            scheduleSave();
        });
        const suffix = document.createElement("b");
        suffix.textContent = unit;
        control.append(input, suffix);
        label.append(text, control);
        return label;
    }

    function nullableNumber(value) {
        if (value === "" || value === null || typeof value === "undefined") {
            return null;
        }
        const number = Number(value);
        return Number.isFinite(number) ? Math.max(0, number) : null;
    }

    function secondsToMinutes(seconds) {
        return Number.isFinite(seconds) ? Math.round(seconds / 6) / 10 : null;
    }

    function minutesToSeconds(value) {
        const minutes = nullableNumber(value);
        return Number.isFinite(minutes) ? Math.round(minutes * 60) : null;
    }

    function recalculateActivitySpeed(activity) {
        const seconds = activity.movingSeconds || activity.elapsedSeconds;
        activity.averageSpeedKph = Number.isFinite(activity.distanceKm) && seconds > 0
            ? round2(activity.distanceKm / (seconds / 3600))
            : null;
    }

    function activityStats(activity) {
        const stats = [];
        if (Number.isFinite(activity.averageSpeedKph)) {
            stats.push({ label: "Average speed", value: `${formatDecimal(activity.averageSpeedKph, 1)} km/h` });
        }
        if (Number.isFinite(activity.maximumSpeedKph)) {
            stats.push({ label: "Maximum speed", value: `${formatDecimal(activity.maximumSpeedKph, 1)} km/h` });
        }
        if (Number.isFinite(activity.elevationLossM)) {
            stats.push({ label: "Elevation loss", value: `${formatDecimal(activity.elevationLossM, 0)} m` });
        }
        if (Number.isFinite(activity.averageHeartRateBpm)) {
            stats.push({
                label: "Heart rate",
                value: `${Math.round(activity.averageHeartRateBpm)} avg · ${Math.round(activity.maximumHeartRateBpm || activity.averageHeartRateBpm)} max bpm`
            });
        }
        if (Number.isFinite(activity.averageCadenceRpm)) {
            stats.push({
                label: "Cadence",
                value: `${formatDecimal(activity.averageCadenceRpm, 0)} avg · ${formatDecimal(activity.maximumCadenceRpm || activity.averageCadenceRpm, 0)} max rpm`
            });
        }
        if (activity.startedOnUtc) {
            stats.push({ label: "Track started", value: formatWorkoutDate(activity.startedOnUtc) });
        }
        return stats;
    }

    function activityHeadline(activity) {
        if (!activity) {
            return "Distance · time · elevation";
        }
        const parts = [];
        if (Number.isFinite(activity.distanceKm)) {
            parts.push(formatActivityDistance(activity.distanceKm));
        }
        if (Number.isFinite(activity.elapsedSeconds)) {
            parts.push(formatDuration(activity.elapsedSeconds));
        }
        return parts.length ? parts.join(" · ") : "Distance · time · elevation";
    }

    function formatActivityDistance(value) {
        return `${formatDecimal(value, value >= 100 ? 1 : 2)} km`;
    }

    function formatDuration(seconds) {
        if (!Number.isFinite(seconds) || seconds < 0) {
            return "time unavailable";
        }
        const totalMinutes = Math.round(seconds / 60);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
    }

    function formatDecimal(value, decimals) {
        return new Intl.NumberFormat(undefined, {
            maximumFractionDigits: decimals,
            minimumFractionDigits: 0
        }).format(value);
    }

    function parseGpx(source, fileName) {
        const xml = new DOMParser().parseFromString(source, "application/xml");
        if (xml.querySelector("parsererror")) {
            throw new Error("This file is not valid GPX/XML.");
        }

        let segments = elementsByLocalName(xml, "trkseg")
            .map(function (segment) {
                return Array.from(segment.children)
                    .filter(function (child) { return child.localName && child.localName.toLowerCase() === "trkpt"; })
                    .map(readGpxPoint)
                    .filter(Boolean);
            })
            .filter(function (points) { return points.length; });

        if (!segments.length) {
            const track = elementsByLocalName(xml, "trkpt").map(readGpxPoint).filter(Boolean);
            const route = elementsByLocalName(xml, "rtept").map(readGpxPoint).filter(Boolean);
            const points = track.length ? track : route;
            if (points.length) {
                segments = [points];
            }
        }
        if (!segments.length || !segments.some(function (points) { return points.length > 1; })) {
            throw new Error("No usable GPX track or route points were found.");
        }

        let distanceKm = 0;
        let movingSeconds = 0;
        let elevationGainM = 0;
        let elevationLossM = 0;
        let elevationPairCount = 0;
        let maximumSpeedKph = 0;
        const allPoints = [];

        segments.forEach(function (points) {
            allPoints.push.apply(allPoints, points);
            for (let index = 1; index < points.length; index += 1) {
                const previous = points[index - 1];
                const current = points[index];
                const segmentDistanceKm = haversineKm(previous, current);
                distanceKm += segmentDistanceKm;

                if (Number.isFinite(previous.elevation) && Number.isFinite(current.elevation)) {
                    elevationPairCount += 1;
                    const elevationDelta = current.elevation - previous.elevation;
                    if (Math.abs(elevationDelta) >= 1 && Math.abs(elevationDelta) <= 100) {
                        if (elevationDelta > 0) {
                            elevationGainM += elevationDelta;
                        } else {
                            elevationLossM += Math.abs(elevationDelta);
                        }
                    }
                }

                if (previous.time && current.time) {
                    const deltaSeconds = (current.time.getTime() - previous.time.getTime()) / 1000;
                    if (deltaSeconds > 0) {
                        const speedKph = segmentDistanceKm / (deltaSeconds / 3600);
                        if (deltaSeconds <= 300 && speedKph >= 1 && speedKph <= 200) {
                            movingSeconds += deltaSeconds;
                            maximumSpeedKph = Math.max(maximumSpeedKph, speedKph);
                        }
                    }
                }
            }
        });

        const timedPoints = allPoints.filter(function (point) { return point.time; })
            .sort(function (a, b) { return a.time - b.time; });
        const started = timedPoints.length ? timedPoints[0].time : null;
        const ended = timedPoints.length ? timedPoints[timedPoints.length - 1].time : null;
        const elapsedSeconds = started && ended ? Math.max(0, (ended - started) / 1000) : null;
        const heartRates = allPoints.map(function (point) { return point.heartRate; }).filter(Number.isFinite);
        const cadences = allPoints.map(function (point) { return point.cadence; }).filter(Number.isFinite);
        const effectiveMovingSeconds = timedPoints.length > 1
            ? movingSeconds
            : elapsedSeconds;

        return {
            sourceFileName: fileName || "Imported GPX",
            startedOnUtc: started ? started.toISOString() : null,
            endedOnUtc: ended ? ended.toISOString() : null,
            distanceKm: roundTo(distanceKm, 3),
            elapsedSeconds: Number.isFinite(elapsedSeconds) ? Math.round(elapsedSeconds) : null,
            movingSeconds: Number.isFinite(effectiveMovingSeconds) ? Math.round(effectiveMovingSeconds) : null,
            elevationGainM: elevationPairCount ? roundTo(elevationGainM, 1) : null,
            elevationLossM: elevationPairCount ? roundTo(elevationLossM, 1) : null,
            averageSpeedKph: effectiveMovingSeconds > 0 ? round2(distanceKm / (effectiveMovingSeconds / 3600)) : null,
            maximumSpeedKph: maximumSpeedKph > 0 ? round2(maximumSpeedKph) : null,
            averageHeartRateBpm: heartRates.length ? Math.round(average(heartRates)) : null,
            maximumHeartRateBpm: heartRates.length ? Math.round(Math.max.apply(null, heartRates)) : null,
            averageCadenceRpm: cadences.length ? roundTo(average(cadences), 1) : null,
            maximumCadenceRpm: cadences.length ? roundTo(Math.max.apply(null, cadences), 1) : null,
            trackPointCount: allPoints.length
        };
    }

    function elementsByLocalName(root, name) {
        return Array.from(root.getElementsByTagName("*")).filter(function (element) {
            return element.localName && element.localName.toLowerCase() === name;
        });
    }

    function readGpxPoint(element) {
        const latitude = Number(element.getAttribute("lat"));
        const longitude = Number(element.getAttribute("lon"));
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            return null;
        }
        const elevationText = firstLocalText(element, "ele");
        const timeText = firstLocalText(element, "time");
        const time = timeText ? new Date(timeText) : null;
        return {
            latitude,
            longitude,
            elevation: elevationText === null || !Number.isFinite(Number(elevationText))
                ? null
                : Number(elevationText),
            time: time && Number.isFinite(time.getTime()) ? time : null,
            heartRate: firstLocalNumber(element, ["hr", "heartrate"]),
            cadence: firstLocalNumber(element, ["cad", "cadence"])
        };
    }

    function firstLocalText(root, name) {
        const element = elementsByLocalName(root, name)[0];
        return element ? element.textContent.trim() : null;
    }

    function firstLocalNumber(root, names) {
        for (const name of names) {
            const text = firstLocalText(root, name);
            if (text !== null) {
                const value = Number(text);
                if (Number.isFinite(value)) {
                    return value;
                }
            }
        }
        return null;
    }

    function haversineKm(from, to) {
        const radians = Math.PI / 180;
        const lat1 = from.latitude * radians;
        const lat2 = to.latitude * radians;
        const latDelta = (to.latitude - from.latitude) * radians;
        const lonDelta = (to.longitude - from.longitude) * radians;
        const value = Math.sin(latDelta / 2) ** 2 +
            Math.cos(lat1) * Math.cos(lat2) * Math.sin(lonDelta / 2) ** 2;
        return 6371.0088 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
    }

    function average(values) {
        return values.reduce(function (total, value) { return total + value; }, 0) / values.length;
    }

    function roundTo(value, decimals) {
        const multiplier = 10 ** decimals;
        return Math.round(value * multiplier) / multiplier;
    }

    function renderSetRow(set, setIndex) {
        const row = document.createElement("div");
        row.className = "set-row";

        const title = document.createElement("div");
        title.className = "set-title";
        title.textContent = `Set ${setIndex + 1}`;

        const reps = metricEditor({
            label: "Reps",
            value: set.reps,
            lastText: Number.isFinite(set.lastReps) ? String(set.lastReps) : "",
            cssClass: "reps-strip",
            steps: [-10, -5, -1, 1, 5, 10],
            format: function (value) { return String(value); },
            onStep: function (delta) {
                set.reps = Math.max(0, set.reps + delta);
            },
            onInput: function (value) {
                set.reps = Math.max(0, Math.round(value || 0));
            }
        });

        const unit = currentWorkout.weightUnit;
        const weightSteps = unit === "lb" ? [-20, -10, -5, -1, 1, 5, 10, 20] : [-10, -5, -1, -0.5, 0.5, 1, 5, 10];
        const weight = metricEditor({
            label: `Max ${unit}`,
            value: fromKg(set.maxKg, unit),
            lastText: Number.isFinite(set.lastMaxKg) ? `${formatWeight(fromKg(set.lastMaxKg, unit))} ${unit}` : "",
            cssClass: "weight-strip",
            steps: weightSteps,
            format: formatWeight,
            onStep: function (delta) {
                set.maxKg = Math.max(0, set.maxKg + toKg(delta, unit));
            },
            onInput: function (value) {
                set.maxKg = Math.max(0, toKg(value || 0, unit));
            }
        });

        row.append(title, reps, weight);
        return row;
    }

    function metricEditor(config) {
        const wrap = document.createElement("div");
        wrap.className = "metric-group";

        const label = document.createElement("span");
        label.className = "number-label";
        const labelText = document.createElement("span");
        labelText.textContent = config.label;
        label.appendChild(labelText);
        if (config.lastText) {
            const last = document.createElement("span");
            last.className = "last-hint";
            last.textContent = `(Last: ${config.lastText})`;
            label.appendChild(last);
        }

        const strip = document.createElement("div");
        strip.className = `step-strip ${config.cssClass}`;
        const inputAt = Math.floor(config.steps.length / 2);

        config.steps.forEach(function (step, index) {
            if (index === inputAt) {
                strip.appendChild(metricInput(config));
            }

            const button = stepButton(step > 0 ? `+${formatStep(step)}` : formatStep(step), `${config.label} ${step}`);
            button.addEventListener("click", function () {
                config.onStep(step);
                renderWorkout();
                scheduleSave();
            });
            strip.appendChild(button);
        });

        if (config.steps.length === inputAt) {
            strip.appendChild(metricInput(config));
        }

        wrap.append(label, strip);
        return wrap;
    }

    function metricInput(config) {
        const input = numberInput(config.format(config.value), 0, "metric-input");
        input.step = config.cssClass === "weight-strip" ? "0.1" : "1";
        input.addEventListener("change", function () {
            config.onInput(Number(input.value));
            renderWorkout();
            scheduleSave();
        });
        return input;
    }

    function resizeSets(exercise, requestedCount) {
        const nextCount = Math.max(0, Math.floor(requestedCount));
        while (exercise.sets.length < nextCount) {
            const last = getLastSetForExercise(exercise, exercise.sets.length);
            exercise.sets.push(createSetFromLast(last));
        }
        while (exercise.sets.length > nextCount) {
            exercise.sets.pop();
        }
    }

    function renderHomeDashboard() {
        const active = hasActiveWorkout();
        els.homeActiveWorkout.hidden = !active;
        const primaryText = els.newWorkoutButton.querySelector("span");
        if (primaryText) {
            primaryText.textContent = active ? "Continue draft" : "Start workout";
        }
        const primaryUse = els.newWorkoutButton.querySelector("use");
        if (primaryUse) {
            primaryUse.setAttribute("href", active ? "#mx-chevron" : "#mx-plus");
        }

        if (active) {
            const activeTotals = workoutTotals(currentWorkout);
            const firstExercise = currentWorkout.exercises[0];
            els.homeActiveWorkoutTitle.textContent = currentWorkout.exercises.length === 1
                ? `${firstExercise.name} draft available`
                : "Unfinished entry available";
            els.homeActiveWorkoutDetail.textContent =
                `${formatWorkoutDate(currentWorkout.startedOnUtc)} · ${workoutContents(activeTotals)}`;
        }

        const currentWeek = workoutPeriodSummary(7, 0);
        const previousWeek = workoutPeriodSummary(7, 1);
        const currentMonth = workoutPeriodSummary(30, 0);
        const previousMonth = workoutPeriodSummary(30, 1);

        els.homeWeekWorkouts.textContent = String(currentWeek.workouts);
        els.homeMonthWorkouts.textContent = String(currentMonth.workouts);
        els.homeMonthVolume.textContent = formatDashboardMetric(currentMonth.volumeKg, "kg");
        els.homeMonthDistance.textContent = formatDashboardMetric(currentMonth.distanceKm, "km");
        setTrend(els.homeWeekTrend, currentWeek.workouts, previousWeek.workouts, "previous 7 days");
        setTrend(els.homeMonthTrend, currentMonth.workouts, previousMonth.workouts, "previous 30 days");
        setTrend(els.homeVolumeTrend, currentMonth.volumeKg, previousMonth.volumeKg, "previous 30 days");
        setTrend(els.homeDistanceTrend, currentMonth.distanceKm, previousMonth.distanceKm, "previous 30 days");
        renderRecentWorkouts();
    }

    function workoutPeriodSummary(days, periodOffset) {
        const dayMs = 24 * 60 * 60 * 1000;
        const end = Date.now() - periodOffset * days * dayMs;
        const start = end - days * dayMs;
        return history.reduce(function (summary, workout) {
            const timestamp = workoutTimestamp(workout);
            if (!Number.isFinite(timestamp) || timestamp <= start || timestamp > end) {
                return summary;
            }
            const totals = workoutTotals(workout);
            summary.workouts += 1;
            summary.sets += totals.sets;
            summary.volumeKg += totals.volumeKg;
            summary.distanceKm += totals.distanceKm;
            summary.movingSeconds += totals.movingSeconds;
            return summary;
        }, {
            workouts: 0,
            sets: 0,
            volumeKg: 0,
            distanceKm: 0,
            movingSeconds: 0
        });
    }

    function workoutTimestamp(workout) {
        return Date.parse(workout.startedOnUtc);
    }

    function workoutTotals(workout) {
        return (workout && Array.isArray(workout.exercises) ? workout.exercises : [])
            .reduce(function (totals, exercise) {
                const sets = Array.isArray(exercise.sets) ? exercise.sets : [];
                totals.exercises += 1;
                totals.sets += sets.length;
                totals.reps += sets.reduce(function (sum, set) {
                    return sum + Math.max(0, Number(set.reps) || 0);
                }, 0);
                totals.volumeKg += sets.reduce(function (sum, set) {
                    return sum + Math.max(0, Number(set.reps) || 0) * Math.max(0, Number(set.maxKg) || 0);
                }, 0);
                if (exercise.activity) {
                    totals.activities += 1;
                    totals.distanceKm += Math.max(0, Number(exercise.activity.distanceKm) || 0);
                    totals.movingSeconds += Math.max(
                        0,
                        Number(exercise.activity.movingSeconds) || Number(exercise.activity.elapsedSeconds) || 0);
                }
                return totals;
            }, {
                exercises: 0,
                activities: 0,
                sets: 0,
                reps: 0,
                volumeKg: 0,
                distanceKm: 0,
                movingSeconds: 0
            });
    }

    function workoutContents(totals) {
        const parts = [];
        if (totals.activities) {
            parts.push(`${totals.activities} ${totals.activities === 1 ? "activity" : "activities"}`);
        }
        const strengthExercises = totals.exercises - totals.activities;
        if (strengthExercises) {
            parts.push(`${strengthExercises} ${strengthExercises === 1 ? "exercise" : "exercises"}`);
        }
        if (totals.sets) {
            parts.push(`${totals.sets} sets`);
        }
        if (totals.distanceKm > 0) {
            parts.push(formatDashboardMetric(totals.distanceKm, "km"));
        }
        return parts.length ? parts.join(" · ") : "No entries yet";
    }

    function formatDashboardMetric(value, unit) {
        const safeValue = Math.max(0, Number(value) || 0);
        const formatted = new Intl.NumberFormat(undefined, {
            maximumFractionDigits: safeValue >= 100 ? 0 : 1
        }).format(safeValue);
        return `${formatted} ${unit}`;
    }

    function setTrend(element, current, previous, periodLabel) {
        element.className = "is-steady";
        if (current === 0 && previous === 0) {
            element.textContent = "No activity in either period";
            element.title = `0 compared with 0 in the ${periodLabel}`;
            return;
        }
        if (previous === 0) {
            element.textContent = "New this period";
            element.className = "is-up";
            element.title = `${formatTrendNumber(current)} compared with 0 in the ${periodLabel}`;
            return;
        }
        const percent = (current - previous) / previous * 100;
        if (Math.abs(percent) < 0.5) {
            element.textContent = "About the same";
            element.title = `${formatTrendNumber(current)} compared with ${formatTrendNumber(previous)} in the ${periodLabel}`;
            return;
        }
        element.textContent = `${percent > 0 ? "+" : ""}${Math.round(percent)}% vs previous`;
        element.className = percent > 0 ? "is-up" : "is-down";
        element.title = `${formatTrendNumber(current)} compared with ${formatTrendNumber(previous)} in the ${periodLabel}`;
    }

    function formatTrendNumber(value) {
        return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value);
    }

    function renderRecentWorkouts() {
        els.homeRecentWorkouts.innerHTML = "";
        if (!history.length) {
            const empty = emptyState("No completed workouts yet. End your current workout and it will appear here.");
            empty.classList.add("maxout-recent-empty");
            els.homeRecentWorkouts.appendChild(empty);
            return;
        }
        history.slice(0, 3).forEach(function (workout) {
            els.homeRecentWorkouts.appendChild(buildHistoryCard(workout, true));
        });
    }

    function editCompletedWorkout(workout) {
        clearTimeout(saveTimer);
        saveTimer = null;
        workoutBeforeHistoryEdit = hasActiveWorkout() ? currentWorkout : null;
        currentWorkout = fromServerWorkout(JSON.parse(JSON.stringify(workout)));
        editingCompletedWorkoutId = workout.id;
        renderWorkout();
        showView("workout");
    }

    function cancelCompletedWorkoutEdit() {
        currentWorkout = workoutBeforeHistoryEdit;
        workoutBeforeHistoryEdit = null;
        editingCompletedWorkoutId = null;
        updateWorkoutEditorMode();
        renderHistory();
        showView("history");
    }

    async function deleteCompletedWorkout(workout, button) {
        const label = formatWorkoutDate(workout.startedOnUtc);
        if (!window.confirm(`Delete the workout from ${label}? This cannot be undone.`)) {
            return;
        }

        button.disabled = true;
        try {
            const state = await postJson(urls.deleteWorkout, {
                userId,
                workoutId: workout.id
            });
            applyState(state);
        } catch (error) {
            setStatus(error.message);
            button.disabled = false;
        }
    }

    function renderHistory() {
        els.historyList.innerHTML = "";
        if (!history.length) {
            els.historyList.appendChild(emptyState("No workouts yet."));
            return;
        }

        history.forEach(function (workout) {
            els.historyList.appendChild(buildHistoryCard(workout, false));
        });
    }

    function buildHistoryCard(workout, compact) {
        const card = document.createElement("article");
        card.className = `history-card${compact ? " is-compact" : ""}`;
        const totals = workoutTotals(workout);

        const heading = document.createElement("div");
        heading.className = "history-card__heading";
        const titleWrap = document.createElement("div");
        const eyebrow = document.createElement("span");
        eyebrow.textContent = compact ? "Completed workout" : "Saved session";
        const title = document.createElement("h2");
        title.textContent = formatWorkoutDate(workout.startedOnUtc);
        titleWrap.append(eyebrow, title);
        const badge = document.createElement("strong");
        badge.textContent = workout.exercises[0] && workout.exercises.length === 1
            ? workout.exercises[0].name
            : `${totals.exercises} items`;
        heading.append(titleWrap, badge);

        const meta = document.createElement("div");
        meta.className = "history-meta";
        const metaParts = [workoutContents(totals)];
        if (totals.volumeKg > 0) {
            metaParts.push(`${formatDashboardMetric(totals.volumeKg, "kg")} volume`);
        }
        if (totals.movingSeconds > 0) {
            metaParts.push(formatDuration(totals.movingSeconds));
        }
        meta.textContent = metaParts.join(" · ");

        const list = document.createElement("ul");
        list.className = "history-exercises";
        workout.exercises.forEach(function (exercise) {
            const item = document.createElement("li");
            const exerciseName = document.createElement("strong");
            exerciseName.textContent = exercise.name;
            const summary = document.createElement("span");
            if (isActivityExercise(exercise)) {
                summary.textContent = activityHeadline(exercise.activity);
            } else {
                const maxKg = exercise.sets.reduce((best, set) => Math.max(best, set.maxKg), 0);
                summary.textContent = `${exercise.sets.length} sets · top ${formatWeight(fromKg(maxKg, workout.weightUnit))} ${workout.weightUnit}`;
            }
            item.append(exerciseName, summary);
            list.appendChild(item);
        });

        const actions = document.createElement("div");
        actions.className = "history-card__actions";
        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "history-action-button";
        editButton.textContent = "Edit";
        editButton.setAttribute("aria-label", `Edit workout from ${title.textContent}`);
        editButton.addEventListener("click", function () {
            editCompletedWorkout(workout);
        });
        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "history-action-button is-danger";
        deleteButton.textContent = "Delete";
        deleteButton.setAttribute("aria-label", `Delete workout from ${title.textContent}`);
        deleteButton.addEventListener("click", function () {
            deleteCompletedWorkout(workout, deleteButton);
        });
        actions.append(editButton, deleteButton);

        card.append(heading, meta, list, actions);
        return card;
    }

    function updateUnitButtons() {
        const unit = currentWorkout ? currentWorkout.weightUnit : "kg";
        els.unitKg.classList.toggle("active", unit === "kg");
        els.unitLb.classList.toggle("active", unit === "lb");
    }

    function scheduleSave() {
        if (!currentWorkout || !userId || editingCompletedWorkoutId) {
            return;
        }

        clearTimeout(saveTimer);
        saveTimer = setTimeout(saveCurrentWorkout, 450);
    }

    async function saveCurrentWorkout() {
        if (!currentWorkout || !userId || editingCompletedWorkoutId) {
            return;
        }

        if (isSaving) {
            saveQueued = true;
            return;
        }

        isSaving = true;
        try {
            const state = await postJson(urls.saveWorkout, {
                userId,
                workout: toWorkoutPayload(currentWorkout)
            });
            if (state.activeWorkout && !currentWorkout.id) {
                currentWorkout.id = state.activeWorkout.id;
            }
            history = Array.isArray(state.history) ? state.history.map(fromServerWorkout) : history;
        } catch (error) {
            setStatus(error.message);
        } finally {
            isSaving = false;
            if (saveQueued) {
                saveQueued = false;
                scheduleSave();
            }
        }
    }

    function toWorkoutPayload(workout) {
        return {
            id: workout.id,
            startedOnUtc: workout.startedOnUtc,
            weightUnit: workout.weightUnit,
            exercises: workout.exercises.map(function (exercise) {
                return {
                    name: exercise.name,
                    category: exercise.category || "",
                    activity: isActivityExercise(exercise) ? Object.assign(emptyActivity(), exercise.activity || {}) : null,
                    sets: exercise.sets.map(function (set) {
                        return {
                            reps: Math.max(0, Math.round(set.reps || 0)),
                            maxKg: round2(set.maxKg || 0)
                        };
                    })
                };
            })
        };
    }

    function fromServerWorkout(workout) {
        return {
            id: workout.id,
            startedOnUtc: workout.startedOnUtc,
            completedOnUtc: workout.completedOnUtc,
            status: workout.status,
            weightUnit: workout.weightUnit || "kg",
            exercises: (workout.exercises || []).map(function (exercise) {
                return {
                    name: exercise.name,
                    category: exercise.category || inferCategory(exercise.name),
                    activity: exercise.activity ? Object.assign(emptyActivity(), exercise.activity) : null,
                    sets: (exercise.sets || []).map(function (set) {
                        return {
                            reps: set.reps || 0,
                            maxKg: Number(set.maxKg) || 0
                        };
                    })
                };
            })
        };
    }

    async function postJson(url, payload) {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "RequestVerificationToken": token
            },
            body: JSON.stringify(payload)
        });
        return parseResponse(response);
    }

    async function parseResponse(response) {
        const text = await response.text();
        const payload = text ? JSON.parse(text) : {};
        if (!response.ok) {
            throw new Error(payload.message || "MaxOut could not load.");
        }
        return payload;
    }

    function stepButton(text, label) {
        const button = document.createElement("button");
        button.className = "step-button";
        button.type = "button";
        button.textContent = text;
        button.setAttribute("aria-label", label);
        return button;
    }

    function numberInput(value, min, className) {
        const input = document.createElement("input");
        input.className = className;
        input.type = "number";
        input.inputMode = "decimal";
        input.min = String(min);
        input.value = String(value);
        return input;
    }

    function emptyState(text) {
        const div = document.createElement("div");
        div.className = "empty-state";
        div.textContent = text;
        return div;
    }

    function toKg(value, unit) {
        return unit === "lb" ? value * KG_PER_LB : value;
    }

    function fromKg(value, unit) {
        return unit === "lb" ? value / KG_PER_LB : value;
    }

    function round2(value) {
        return Math.round(value * 100) / 100;
    }

    function formatWeight(value) {
        const rounded = Math.round(value * 10) / 10;
        return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
    }

    function formatStep(value) {
        return Number.isInteger(value) ? String(value) : value.toFixed(1);
    }

    function formatWorkoutAgeList(ages) {
        if (!ages || ages.length === 0) {
            return "";
        }

        if (ages.length === 1) {
            return ages[0] === 1 ? "1 workout ago" : `${ages[0]} workouts ago`;
        }

        return `${joinWorkoutAges(ages)} workouts ago`;
    }

    function joinWorkoutAges(ages) {
        if (ages.length === 2) {
            return `${ages[0]} and ${ages[1]}`;
        }

        return `${ages.slice(0, -1).join(", ")}, and ${ages[ages.length - 1]}`;
    }

    function normalizeName(value) {
        return String(value || "").trim().toLowerCase();
    }

    function inferCategory(exerciseName) {
        const normalized = normalizeName(exerciseName);
        const groupName = Object.keys(catalog)
            .sort((a, b) => a.localeCompare(b))
            .find(function (category) {
                return catalog[category].some(function (name) {
                    return normalizeName(name) === normalized;
                });
            });
        return groupName || "";
    }

    function formatWorkoutDate(value) {
        const date = new Date(value);
        return new Intl.DateTimeFormat(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }).format(date);
    }

    init();
})();
