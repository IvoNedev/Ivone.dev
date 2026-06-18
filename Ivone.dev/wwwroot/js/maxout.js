(function () {
    "use strict";

    const STORAGE_KEY = "maxout.userId";
    const KG_PER_LB = 0.45359237;

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
        createUser: app.dataset.createUserUrl,
        recover: app.dataset.recoverUrl,
        saveWorkout: app.dataset.saveWorkoutUrl,
        endWorkout: app.dataset.endWorkoutUrl
    };
    const token = app.dataset.requestToken || "";

    const els = {
        identityButton: document.getElementById("identityButton"),
        recoverForm: document.getElementById("recoverForm"),
        recoverId: document.getElementById("recoverId"),
        homeView: document.getElementById("homeView"),
        workoutView: document.getElementById("workoutView"),
        historyView: document.getElementById("historyView"),
        guideView: document.getElementById("guideView"),
        newWorkoutButton: document.getElementById("newWorkoutButton"),
        historyButton: document.getElementById("historyButton"),
        guideButton: document.getElementById("guideButton"),
        historyBackButton: document.getElementById("historyBackButton"),
        guideBackButton: document.getElementById("guideBackButton"),
        homeStatus: document.getElementById("homeStatus"),
        exerciseSelect: document.getElementById("exerciseSelect"),
        exerciseList: document.getElementById("exerciseList"),
        historyList: document.getElementById("historyList"),
        unitKg: document.getElementById("unitKg"),
        unitLb: document.getElementById("unitLb"),
        endWorkoutButton: document.getElementById("endWorkoutButton")
    };

    let userId = Number(localStorage.getItem(STORAGE_KEY)) || null;
    let currentWorkout = null;
    let history = [];
    let saveTimer = null;
    let isSaving = false;
    let saveQueued = false;

    function init() {
        populateExerciseSelect();
        bindEvents();
        updateIdentity();

        if (userId) {
            loadState(userId);
        } else {
            showView("home");
        }
    }

    function bindEvents() {
        els.identityButton.addEventListener("click", function () {
            els.recoverForm.hidden = !els.recoverForm.hidden;
            if (!els.recoverForm.hidden) {
                els.recoverId.focus();
                els.recoverId.select();
            }
        });

        els.recoverForm.addEventListener("submit", async function (event) {
            event.preventDefault();
            const requestedId = Number(els.recoverId.value);
            if (!requestedId || requestedId < 1) {
                setStatus("Enter a valid id.");
                return;
            }

            try {
                const state = await postJson(urls.recover, { userId: requestedId });
                applyState(state);
                localStorage.setItem(STORAGE_KEY, String(state.userId));
                userId = state.userId;
                els.recoverForm.hidden = true;
                updateIdentity();
                populateExerciseSelect();
                showView("home");
            } catch (error) {
                setStatus(error.message);
            }
        });

        els.newWorkoutButton.addEventListener("click", async function () {
            els.newWorkoutButton.disabled = true;
            currentWorkout = newWorkout();
            els.recoverForm.hidden = true;
            renderWorkout();
            showView("workout");

            try {
                await ensureUserForBackup();
                scheduleSave();
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

        els.guideButton.addEventListener("click", function () {
            els.recoverForm.hidden = true;
            showView("guide");
        });

        els.historyBackButton.addEventListener("click", function () {
            showView("home");
        });

        els.guideBackButton.addEventListener("click", function () {
            showView("home");
        });

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

            clearTimeout(saveTimer);
            saveTimer = null;
            els.endWorkoutButton.disabled = true;
            try {
                const state = await postJson(urls.endWorkout, {
                    userId,
                    workout: toWorkoutPayload(currentWorkout)
                });
                applyState(state);
                currentWorkout = null;
                renderHistory();
                setStatus("Workout archived.");
                showView("home");
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

        Object.keys(catalog)
            .sort((a, b) => a.localeCompare(b))
            .forEach(function (groupName) {
                const group = document.createElement("optgroup");
                group.label = groupName;
                catalog[groupName]
                    .slice()
                    .sort((a, b) => a.localeCompare(b))
                    .forEach(function (exerciseName) {
                        const option = document.createElement("option");
                        option.value = exerciseName;
                        option.dataset.category = groupName;
                        option.textContent = `${exerciseName} (${groupName})`;
                        const workoutAges = workoutAgeMap.get(normalizeName(exerciseName));
                        if (workoutAges && workoutAges.length > 0) {
                            const newestAge = workoutAges[0];
                            option.className = `workout-age-${newestAge}`;
                            option.textContent = `${option.textContent} - ${formatWorkoutAgeList(workoutAges)}`;
                        }
                        group.appendChild(option);
                    });
                els.exerciseSelect.appendChild(group);
            });
    }

    async function loadState(id) {
        try {
            const response = await fetch(`${urls.state}&userId=${encodeURIComponent(id)}`);
            const state = await parseResponse(response);
            applyState(state);
            setStatus(state.activeWorkout ? "Draft workout ready." : "");
        } catch (error) {
            localStorage.removeItem(STORAGE_KEY);
            userId = null;
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

        if (state.message) {
            setStatus(state.message);
        }

        updateIdentity();
        renderHistory();
        populateExerciseSelect();
    }

    function showView(viewName) {
        els.homeView.hidden = viewName !== "home";
        els.workoutView.hidden = viewName !== "workout";
        els.historyView.hidden = viewName !== "history";
        els.guideView.hidden = viewName !== "guide";
    }

    async function ensureUserForBackup() {
        if (userId) {
            return;
        }

        const state = await postJson(urls.createUser, {
            deviceLabel: getDeviceLabel()
        });
        history = Array.isArray(state.history) ? state.history.map(fromServerWorkout) : [];
        localStorage.setItem(STORAGE_KEY, String(state.userId));
        userId = state.userId;
        updateIdentity();
        populateExerciseSelect();
    }

    function updateIdentity() {
        els.identityButton.textContent = userId ? `Your ID: ${userId}` : "Recover data";
    }

    function setStatus(message) {
        els.homeStatus.textContent = message || "";
    }

    function getDeviceLabel() {
        const platform = navigator.userAgentData && navigator.userAgentData.platform
            ? navigator.userAgentData.platform
            : navigator.platform;
        return platform ? `Prototype device - ${platform}` : "Prototype device";
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

    function createExerciseFromSelection(name, category) {
        const lastExercise = getLastExercise(name, category);
        return {
            name,
            category,
            sets: lastExercise
                ? lastExercise.sets.map(createSetFromLast)
                : []
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
        count.textContent = `${exercise.sets.length} set${exercise.sets.length === 1 ? "" : "s"}`;
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

    function renderHistory() {
        els.historyList.innerHTML = "";
        if (!history.length) {
            els.historyList.appendChild(emptyState("No workouts yet."));
            return;
        }

        history.forEach(function (workout) {
            const card = document.createElement("article");
            card.className = "history-card";

            const title = document.createElement("h2");
            title.textContent = formatWorkoutDate(workout.completedOnUtc || workout.startedOnUtc);

            const meta = document.createElement("div");
            meta.className = "history-meta";
            const totalSets = workout.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);
            meta.textContent = `${workout.exercises.length} exercises · ${totalSets} sets`;

            const list = document.createElement("ul");
            list.className = "history-exercises";
            workout.exercises.forEach(function (exercise) {
                const item = document.createElement("li");
                const exerciseName = document.createElement("strong");
                exerciseName.textContent = exercise.name;
                const maxKg = exercise.sets.reduce((best, set) => Math.max(best, set.maxKg), 0);
                const summary = document.createElement("span");
                summary.textContent = `${exercise.sets.length} sets · top ${formatWeight(fromKg(maxKg, workout.weightUnit))} ${workout.weightUnit}`;
                item.append(exerciseName, summary);
                list.appendChild(item);
            });

            card.append(title, meta, list);
            els.historyList.appendChild(card);
        });
    }

    function updateUnitButtons() {
        const unit = currentWorkout ? currentWorkout.weightUnit : "kg";
        els.unitKg.classList.toggle("active", unit === "kg");
        els.unitLb.classList.toggle("active", unit === "lb");
    }

    function scheduleSave() {
        if (!currentWorkout || !userId) {
            return;
        }

        clearTimeout(saveTimer);
        saveTimer = setTimeout(saveCurrentWorkout, 450);
    }

    async function saveCurrentWorkout() {
        if (!currentWorkout || !userId) {
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
            weightUnit: workout.weightUnit,
            exercises: workout.exercises.map(function (exercise) {
                return {
                    name: exercise.name,
                    category: exercise.category || "",
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
