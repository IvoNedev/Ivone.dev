(() => {
    "use strict";

    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const lerp = (a, b, t) => a + (b - a) * t;
    const ease = (t) => {
        const n = clamp(t, 0, 1);
        return n * n * (3 - 2 * n);
    };
    const cloneData = (value) => JSON.parse(JSON.stringify(value));
    const degrees = (radians) => Math.round(radians * 180 / Math.PI * 10) / 10;
    const radians = (degreesValue) => Number(degreesValue || 0) * Math.PI / 180;
    const hex = (value) => String(value || "#888888").toUpperCase();

    const DURATION = 14;
    const STORAGE_KEY = "scenescript.office-departure.v1";
    const MODEL_CACHE_KEY = "scenescript.animation-parser.runtime-1.0.2";
    const PROJECT_ID = "office-departure";
    const DEFAULT_PROMPT = "Two characters sit across a desk. John says “We need to leave”, stands, walks to the door, opens it and exits while the camera follows.";
    const DEFAULT_TRACK_IDS = ["entity_john", "entity_robot", "entity_door", "camera_main"];
    const DEFAULT_MOTION_PLAN = {
        entityId: "entity_john",
        speak: true,
        speakText: "We need to leave.",
        stepDirection: 0,
        duck: false,
        walkToDoor: true,
        openDoor: true,
        followCamera: true
    };
    const DEFAULT_ACTIONS = [
        {
            id: "action_john_speak",
            type: "speak",
            entityId: "entity_john",
            start: 1.1,
            duration: 2.7,
            text: "We need to leave."
        },
        {
            id: "action_john_stand",
            type: "stand",
            entityId: "entity_john",
            start: 4,
            duration: 1.2
        },
        {
            id: "action_john_walk",
            type: "moveTo",
            entityId: "entity_john",
            start: 5.2,
            duration: 4.2,
            from: [-1.35, 0, 0.35],
            to: [3.5, 0, -1.16],
            locomotion: "walk"
        },
        {
            id: "action_door_open",
            type: "open",
            entityId: "entity_door",
            start: 9.15,
            duration: 1.2
        },
        {
            id: "action_john_exit",
            type: "moveTo",
            entityId: "entity_john",
            start: 10.15,
            duration: 2.2,
            from: [3.5, 0, -1.16],
            to: [5.3, 0, -1.16],
            locomotion: "walk"
        },
        {
            id: "action_camera_follow",
            type: "cameraFollow",
            entityId: "camera_main",
            targetId: "entity_john",
            start: 5.2,
            duration: 7.15
        }
    ];
    const GENERATED_TRANSFORM_MARKERS = {
        entity_john: [0, 5.6, 9.5, 12.7],
        entity_door: [9, 10.4],
        camera_main: [0, 5.6, 12.6]
    };
    const defaultEntities = [
        {
            id: "entity_john",
            name: "John",
            type: "character",
            subtype: "Humanoid character",
            assetId: "character_red_01",
            color: "#D85A4F",
            position: [-1.35, 0, 0.35],
            rotation: [0, Math.PI / 2, 0],
            scale: [1, 1, 1],
            visible: true,
            role: "employee",
            capabilities: ["Locomotion", "Speakable", "LookAt"],
            roughness: 0.8,
            metalness: 0
        },
        {
            id: "entity_robot",
            name: "Blue Robot",
            type: "robot",
            subtype: "Humanoid robot",
            assetId: "robot_blue_01",
            color: "#5579CF",
            position: [1.35, 0, 0.35],
            rotation: [0, -Math.PI / 2, 0],
            scale: [1, 1, 1],
            visible: true,
            role: "assistant",
            capabilities: ["Locomotion", "LookAt"],
            roughness: 0.62,
            metalness: 0.18
        },
        {
            id: "entity_desk",
            name: "Oak Desk",
            type: "desk",
            subtype: "Furniture",
            assetId: "prop_desk_01",
            color: "#8E6040",
            position: [0, 0, 0.45],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
            visible: true,
            role: "furniture",
            capabilities: ["SurfaceProvider"],
            roughness: 0.84,
            metalness: 0
        },
        {
            id: "entity_chair_a",
            name: "Chair A",
            type: "chair",
            subtype: "Seat provider",
            assetId: "prop_chair_01",
            color: "#53615D",
            position: [-1.35, 0, 0.38],
            rotation: [0, -Math.PI / 2, 0],
            scale: [1, 1, 1],
            visible: true,
            role: "seat",
            capabilities: ["SeatProvider"],
            roughness: 0.9,
            metalness: 0
        },
        {
            id: "entity_chair_b",
            name: "Chair B",
            type: "chair",
            subtype: "Seat provider",
            assetId: "prop_chair_01",
            color: "#53615D",
            position: [1.35, 0, 0.38],
            rotation: [0, Math.PI / 2, 0],
            scale: [1, 1, 1],
            visible: true,
            role: "seat",
            capabilities: ["SeatProvider"],
            roughness: 0.9,
            metalness: 0
        },
        {
            id: "entity_door",
            name: "Exit Door",
            type: "door",
            subtype: "Openable prop",
            assetId: "prop_door_01",
            color: "#68756D",
            position: [4.2, 0, -1.3],
            rotation: [0, -Math.PI / 2, 0],
            scale: [1, 1, 1],
            visible: true,
            role: "exit",
            capabilities: ["Openable", "Interactable"],
            roughness: 0.76,
            metalness: 0.03
        },
        {
            id: "light_key",
            name: "Key Light",
            type: "light",
            subtype: "Area light",
            assetId: "light_area",
            color: "#FFF2D5",
            position: [-2.8, 4.7, 3.3],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
            visible: true,
            role: "key",
            capabilities: [],
            roughness: 0,
            metalness: 0
        },
        {
            id: "camera_main",
            name: "Main Camera",
            type: "camera",
            subtype: "Perspective camera",
            assetId: "camera_perspective",
            color: "#D5B962",
            position: [5.8, 4.2, 7.4],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
            visible: true,
            role: "main",
            capabilities: ["CameraMotion"],
            roughness: 0,
            metalness: 0
        }
    ];

    const state = {
        schemaVersion: "1.0",
        projectName: "Office departure",
        environment: { background: "#252B26", monochrome: false },
        entities: cloneData(defaultEntities),
        time: 0,
        duration: DURATION,
        isPlaying: false,
        selectedId: "entity_john",
        currentTool: "select",
        cameraCloser: false,
        snap: true,
        timelineTrackIds: [...DEFAULT_TRACK_IDS],
        keyframes: {},
        selectedKeyframe: null,
        motionPlan: cloneData(DEFAULT_MOTION_PLAN),
        actions: cloneData(DEFAULT_ACTIONS),
        currentPrompt: DEFAULT_PROMPT,
        promptHistory: [],
        currentPromptHistoryId: null
    };

    const runtime = {
        renderer: null,
        scene: null,
        camera: null,
        controls: null,
        transformControls: null,
        clock: null,
        grid: null,
        room: null,
        selectionBox: null,
        objects: new Map(),
        importedTemplates: new Map(),
        undo: [],
        redo: [],
        dirty: false,
        promptBaseline: DEFAULT_PROMPT,
        lastFrame: performance.now(),
        pointerDown: null,
        resizeObserver: null,
        pendingWizardEntityId: null,
        pendingPoseEntityId: null,
        browserAnimationParser: null,
        animationParserInitialization: null
    };

    function toast(message) {
        const stack = $("#toastStack");
        const node = document.createElement("div");
        node.className = "toast";
        node.innerHTML = `<i></i><span>${escapeHtml(message)}</span>`;
        stack.appendChild(node);
        window.setTimeout(() => {
            node.classList.add("is-leaving");
            window.setTimeout(() => node.remove(), 190);
        }, 2600);
    }

    function escapeHtml(value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;");
    }

    function getPromptText() {
        const input = $("#promptInput");
        if (!input) return state.currentPrompt || DEFAULT_PROMPT;
        return (input.innerText || input.textContent || "")
            .replaceAll("\u00a0", " ")
            .replace(/\n{3,}/g, "\n\n")
            .trim();
    }

    function setPromptText(text, entityLinks = [], glow = false) {
        const input = $("#promptInput");
        if (!input) return;
        const prompt = String(text || "");
        const links = [...entityLinks]
            .filter((link) =>
                entityById(link.entityId) &&
                Number.isInteger(link.start) &&
                Number.isInteger(link.end) &&
                link.start >= 0 &&
                link.end > link.start &&
                link.end <= prompt.length)
            .sort((a, b) => a.start - b.start || b.end - a.end);

        input.replaceChildren();
        let cursor = 0;
        links.forEach((link) => {
            if (link.start < cursor) return;
            if (link.start > cursor) {
                input.appendChild(document.createTextNode(prompt.slice(cursor, link.start)));
            }
            const entity = entityById(link.entityId);
            const token = document.createElement("span");
            token.className = "prompt-entity-link";
            token.dataset.entityId = link.entityId;
            token.contentEditable = "false";
            token.style.setProperty("--entity-link-color", entity?.color || "#D7F36B");
            token.textContent = prompt.slice(link.start, link.end);
            token.title = `Focus ${entity?.name || "entity"}`;
            input.appendChild(token);
            cursor = link.end;
        });
        if (cursor < prompt.length) {
            input.appendChild(document.createTextNode(prompt.slice(cursor)));
        }

        state.currentPrompt = prompt;
        if (glow) flashPromptInput();
    }

    function flashPromptInput() {
        const input = $("#promptInput");
        input.classList.remove("is-history-paste");
        void input.offsetWidth;
        input.classList.add("is-history-paste");
        setTimeout(() => input.classList.remove("is-history-paste"), 850);
    }

    function placeCaretAtPromptEnd() {
        const input = $("#promptInput");
        input.focus();
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(input);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
    }

    function activateLeftTab(name) {
        $$(".panel-tab").forEach((item) => {
            item.classList.toggle("is-active", item.dataset.leftTab === name);
        });
        $$(".left-tab-view").forEach((view) => {
            view.classList.toggle("is-active", view.dataset.leftView === name);
        });
    }

    function promptEntityCandidates(entity) {
        const candidates = new Set([entity.name]);
        const colorName = semanticColorName(entity);
        const aliases = {
            box: ["box", "cube"],
            sphere: ["sphere", "ball"],
            robot: ["robot"],
            character: ["character", "person"],
            door: ["door"],
            desk: ["desk"],
            chair: ["chair"],
            camera: ["camera"],
            light: ["light"]
        }[entity.type] || [];

        aliases.forEach((alias) => {
            if (colorName) candidates.add(`${colorName} ${alias}`);
            const matchingTypeCount = state.entities.filter((candidate) => candidate.type === entity.type).length;
            if (matchingTypeCount === 1) candidates.add(alias);
        });
        return [...candidates]
            .map((candidate) => candidate.trim())
            .filter((candidate) => candidate.length >= 3)
            .sort((a, b) => b.length - a.length);
    }

    function semanticColorName(entity) {
        const source = `${entity.name || ""} ${entity.color || ""}`.toLowerCase();
        if (source.includes("blue") || /#(?:5579cf|5e80d5|718ddb|6f8fe7)/i.test(source)) return "blue";
        if (source.includes("red") || /#(?:d85a4f|df665d)/i.test(source)) return "red";
        if (source.includes("green") || /#(?:5b9a68|79aa7d|4a7151)/i.test(source)) return "green";
        if (source.includes("yellow") || /#(?:d6a954|d5b962)/i.test(source)) return "yellow";
        if (source.includes("orange")) return "orange";
        if (source.includes("purple")) return "purple";
        if (source.includes("white")) return "white";
        if (source.includes("black")) return "black";
        return "";
    }

    function resolvePromptEntityLinks(prompt, operations = []) {
        const normalized = prompt.toLocaleLowerCase();
        const operationEntityIds = new Set();
        operations.forEach((operation) => {
            ["entityId", "target", "id"].forEach((property) => {
                if (entityById(operation[property])) operationEntityIds.add(operation[property]);
            });
        });

        const matches = [];
        state.entities.forEach((entity) => {
            promptEntityCandidates(entity).forEach((phrase) => {
                const needle = phrase.toLocaleLowerCase();
                let from = 0;
                while (from < normalized.length) {
                    const start = normalized.indexOf(needle, from);
                    if (start < 0) break;
                    const end = start + needle.length;
                    const before = start === 0 ? "" : normalized[start - 1];
                    const after = end === normalized.length ? "" : normalized[end];
                    if ((!before || !/[\p{L}\p{N}_]/u.test(before)) &&
                        (!after || !/[\p{L}\p{N}_]/u.test(after))) {
                        matches.push({
                            entityId: entity.id,
                            start,
                            end,
                            phrase: prompt.slice(start, end),
                            score: needle.length + (operationEntityIds.has(entity.id) ? 1000 : 0)
                        });
                    }
                    from = Math.max(end, start + 1);
                }
            });
        });

        const selected = [];
        matches
            .sort((a, b) => b.score - a.score || a.start - b.start)
            .forEach((match) => {
                const overlaps = selected.some((existing) =>
                    match.start < existing.end && match.end > existing.start);
                if (!overlaps) selected.push(match);
            });

        return selected
            .sort((a, b) => a.start - b.start)
            .map(({ entityId, start, end, phrase }) => ({ entityId, start, end, phrase }));
    }

    function addPromptHistoryVersion(prompt, plan, entityLinks) {
        const version = (state.promptHistory.at(-1)?.version || 0) + 1;
        const patchId = plan.patchId || `patch_${stableHash(`${prompt}\n${JSON.stringify(entityLinks)}`)}`;
        const entry = {
            id: `prompt_${String(version).padStart(3, "0")}_${stableHash(`${patchId}\n${prompt}`).slice(0, 8)}`,
            version,
            prompt,
            patchId,
            planner: plan.planner || "unknown",
            changes: cloneData(plan.changes || []),
            entityLinks: cloneData(entityLinks)
        };
        state.promptHistory.push(entry);
        if (state.promptHistory.length > 100) state.promptHistory.shift();
        state.currentPromptHistoryId = entry.id;
        state.currentPrompt = prompt;
        renderPromptHistory();
        return entry;
    }

    function renderPromptHistory() {
        const list = $("#promptHistoryList");
        if (!list) return;
        list.innerHTML = "";
        $("#promptHistoryCount").textContent = state.promptHistory.length;
        $("#promptHistoryEmpty").hidden = state.promptHistory.length > 0;

        [...state.promptHistory].reverse().forEach((entry) => {
            const card = document.createElement("button");
            card.type = "button";
            card.className = `prompt-history-card${entry.id === state.currentPromptHistoryId ? " is-current" : ""}`;
            card.dataset.promptHistoryId = entry.id;
            const entityIds = [...new Set((entry.entityLinks || []).map((link) => link.entityId))];
            const dots = entityIds
                .map((entityId) => entityById(entityId))
                .filter(Boolean)
                .map((entity) => `<i style="background:${escapeHtml(entity.color || "#D7F36B")}" title="${escapeHtml(entity.name)}"></i>`)
                .join("");
            card.innerHTML = `
                <strong>PROMPT ${String(entry.version).padStart(2, "0")}</strong>
                <p>${escapeHtml(entry.prompt)}</p>
                <span class="prompt-history-meta">
                    <span>${(entry.changes || []).length} change${(entry.changes || []).length === 1 ? "" : "s"} · ${(entry.entityLinks || []).length} linked</span>
                    <span class="history-entity-dots">${dots}</span>
                </span>`;
            list.appendChild(card);
        });
    }

    function focusPromptEntity(entityId, token) {
        const entity = entityById(entityId);
        if (!entity) return;
        selectEntity(entityId);
        focusSelected();
        activateLeftTab("scene");
        token?.classList.add("is-link-pulse");
        setTimeout(() => token?.classList.remove("is-link-pulse"), 650);
        const inspector = $("#rightPanel");
        inspector.classList.remove("is-entity-focus-flash");
        void inspector.offsetWidth;
        inspector.classList.add("is-entity-focus-flash");
        if (window.matchMedia("(max-width: 850px)").matches) {
            inspector.classList.add("is-open");
        }
    }

    function markDirty() {
        runtime.dirty = true;
        $(".save-state").classList.add("is-dirty");
        $("#saveState").textContent = "Unsaved changes";
    }

    function markSaved() {
        runtime.dirty = false;
        $(".save-state").classList.remove("is-dirty");
        $("#saveState").textContent = "Saved locally";
    }

    function sceneDocument() {
        return {
            schemaVersion: state.schemaVersion,
            scene: {
                id: "scene_office_departure",
                name: state.projectName,
                duration: state.duration
            },
            environment: cloneData(state.environment),
            entities: cloneData(state.entities.map((entity) => {
                const clean = { ...entity };
                delete clean.imported;
                return clean;
            })),
            motionPlan: cloneData(state.motionPlan),
            actions: cloneData(state.actions),
            currentPrompt: getPromptText() || state.currentPrompt || DEFAULT_PROMPT,
            promptHistory: cloneData(state.promptHistory),
            timeline: {
                tracks: buildTimelineTracks()
            }
        };
    }

    function plannerSceneDocument() {
        const documentData = sceneDocument();
        delete documentData.currentPrompt;
        delete documentData.promptHistory;
        return documentData;
    }

    function motionTiming() {
        const plan = state.motionPlan || DEFAULT_MOTION_PLAN;
        const speakStart = 1.1;
        const speakDuration = 2.7;
        const standStart = 4;
        const standDuration = 1.2;
        let cursor = standStart + standDuration;
        const stepStart = cursor;
        const stepDuration = plan.stepDirection ? 0.9 : 0;
        cursor += stepDuration;
        const duckStart = cursor;
        const duckDuration = plan.duck ? 1.15 : 0;
        cursor += duckDuration;
        const walkStart = cursor;
        const extraDuration = stepDuration + duckDuration;
        const walkDuration = Math.max(2.8, 4.2 - extraDuration * 0.55);
        const walkEnd = walkStart + walkDuration;
        const doorOpenStart = walkEnd - 0.25;
        const doorOpenDuration = 1.2;
        const exitStart = doorOpenStart + 1;
        const exitDuration = Math.min(2.2, Math.max(0.8, state.duration - exitStart - 0.15));
        return {
            speakStart,
            speakDuration,
            standStart,
            standDuration,
            stepStart,
            stepDuration,
            duckStart,
            duckDuration,
            walkStart,
            walkDuration,
            walkEnd,
            doorOpenStart,
            doorOpenDuration,
            exitStart,
            exitDuration
        };
    }

    function duckAmountAtTime(time) {
        const timing = motionTiming();
        if (!state.motionPlan?.duck || !timing.duckDuration) return 0;
        const progress = clamp((time - timing.duckStart) / timing.duckDuration, 0, 1);
        if (progress <= 0.3) return ease(progress / 0.3);
        if (progress >= 0.7) return 1 - ease((progress - 0.7) / 0.3);
        return 1;
    }

    function actionPresentation(action) {
        const direction = action.direction
            ? action.direction[0].toUpperCase() + action.direction.slice(1)
            : "";
        const presentations = {
            place: ["Place", "◎", "clip-motion"],
            moveBy: [`Move ${direction}`.trim(), "→", "clip-motion"],
            moveTo: [
                action.direction
                    ? `${action.locomotion === "walk" && Number(action.duration) <= 1.5 ? "Step" : "Move"} ${direction}`
                    : action.targetId ? "Walk to target" : "Move to target",
                "→",
                "clip-motion"
            ],
            rotateBy: [`Rotate ${direction}`.trim(), "↻", "clip-motion"],
            rotateTo: ["Rotate", "↻", "clip-motion"],
            scaleTo: ["Scale", "◇", "clip-motion"],
            stand: ["Stand", "◆", "clip-motion"],
            duck: ["Duck down", "↓", "clip-motion"],
            speak: ["Speak", "▣", "clip-dialogue"],
            setColor: [`Turn ${action.colorName || "colour"}`, "●", "clip-dialogue"],
            fallToGround: ["Fall to ground", "↓", "clip-motion"],
            open: ["Open", "↱", "clip-door"],
            close: ["Close", "↲", "clip-door"],
            cameraFollow: ["Follow target", "◉", "clip-camera"],
            cameraLookAt: ["Look at target", "◉", "clip-camera"],
            wait: ["Wait", "…", "clip-idle"]
        };
        return presentations[action.type] || [action.type || "Action", "◆", "clip-motion"];
    }

    function actionTimelineClipDefinitions() {
        const definitions = {};
        (state.actions || []).forEach((action) => {
            if (!action.entityId || !entityById(action.entityId)) return;
            const [label, icon, className] = actionPresentation(action);
            (definitions[action.entityId] ||= []).push({
                ...cloneData(action),
                label,
                icon,
                className,
                duration: Math.max(Number(action.duration || 0), 0.22)
            });
        });
        Object.values(definitions).forEach((actions) =>
            actions.sort((a, b) => Number(a.start || 0) - Number(b.start || 0)));
        return definitions;
    }

    function timelineClipDefinitions() {
        if (Array.isArray(state.actions)) return actionTimelineClipDefinitions();
        const plan = state.motionPlan || DEFAULT_MOTION_PLAN;
        const timing = motionTiming();
        const john = [];
        if (plan.speak !== false) {
            john.push({ id: "john_speak", type: "Speak", label: "Speak", icon: "▣", className: "clip-dialogue", start: timing.speakStart, duration: timing.speakDuration, text: plan.speakText });
        }
        john.push({ id: "john_stand", type: "Stand", label: "Stand", icon: "◆", className: "clip-motion", start: timing.standStart, duration: timing.standDuration });
        if (plan.stepDirection) {
            john.push({
                id: "john_step",
                type: "Step",
                label: plan.stepDirection < 0 ? "Step left" : "Step right",
                icon: plan.stepDirection < 0 ? "←" : "→",
                className: "clip-motion",
                start: timing.stepStart,
                duration: timing.stepDuration
            });
        }
        if (plan.duck) {
            john.push({
                id: "john_duck",
                type: "Duck",
                label: "Duck down",
                icon: "↓",
                className: "clip-motion",
                start: timing.duckStart,
                duration: timing.duckDuration
            });
        }
        if (plan.walkToDoor) {
            john.push({
                id: "john_walk",
                type: "WalkTo",
                label: "Walk to door",
                icon: "→",
                className: "clip-motion",
                start: timing.walkStart,
                duration: timing.walkDuration,
                target: "entity_door"
            });
        }

        return {
            entity_john: john,
            entity_robot: [
                { id: "robot_idle", type: "Animation", label: "Seated idle", icon: "≈", className: "clip-idle", start: 0, duration: timing.walkEnd, animation: "SeatedIdle" }
            ],
            entity_door: plan.openDoor
                ? [{ id: "door_open", type: "Open", label: "Open", icon: "↱", className: "clip-door", start: timing.doorOpenStart, duration: timing.doorOpenDuration }]
                : [],
            camera_main: [
                { id: "camera_wide", type: "CameraShot", label: "Wide shot", icon: "◉", className: "clip-camera", start: 0, duration: timing.walkStart },
                ...(plan.followCamera
                    ? [{ id: "camera_follow", type: "CameraFollow", label: "Follow John", icon: "◉", className: "clip-camera", start: timing.walkStart, duration: Math.min(state.duration - timing.walkStart, timing.exitStart + timing.exitDuration - timing.walkStart), target: "entity_john" }]
                    : [])
            ]
        };
    }

    function buildTimelineTracks() {
        const clips = timelineClipDefinitions();

        return state.timelineTrackIds
            .filter((entityId, index, list) =>
                list.indexOf(entityId) === index &&
                state.entities.some((entity) => entity.id === entityId))
            .map((entityId) => ({
                id: `track_${entityId}`,
                entityId,
                clips: cloneData(clips[entityId] || []),
                keyframes: cloneData((state.keyframes[entityId] || []).map((keyframe) => ({
                    id: keyframe.id,
                    time: keyframe.time,
                    interpolation: keyframe.interpolation || "smooth",
                    transform: keyframe.transform
                })))
            }));
    }

    function pushHistory() {
        runtime.undo.push(JSON.stringify({
            projectName: state.projectName,
            environment: state.environment,
            entities: state.entities,
            cameraCloser: state.cameraCloser,
            duration: state.duration,
            timelineTrackIds: state.timelineTrackIds,
            keyframes: state.keyframes,
            motionPlan: state.motionPlan,
            actions: state.actions,
            currentPrompt: state.currentPrompt,
            promptHistory: state.promptHistory,
            currentPromptHistoryId: state.currentPromptHistoryId
        }));
        if (runtime.undo.length > 40) runtime.undo.shift();
        runtime.redo.length = 0;
        updateHistoryButtons();
    }

    function currentSnapshot() {
        return JSON.stringify({
            projectName: state.projectName,
            environment: state.environment,
            entities: state.entities,
            cameraCloser: state.cameraCloser,
            duration: state.duration,
            timelineTrackIds: state.timelineTrackIds,
            keyframes: state.keyframes,
            motionPlan: state.motionPlan,
            actions: state.actions,
            currentPrompt: state.currentPrompt,
            promptHistory: state.promptHistory,
            currentPromptHistoryId: state.currentPromptHistoryId
        });
    }

    function restoreSnapshot(snapshot) {
        const value = JSON.parse(snapshot);
        state.projectName = value.projectName;
        state.environment = value.environment;
        state.entities = value.entities;
        state.cameraCloser = Boolean(value.cameraCloser);
        state.duration = value.duration || DURATION;
        state.timelineTrackIds = value.timelineTrackIds || [...DEFAULT_TRACK_IDS];
        state.keyframes = value.keyframes || {};
        state.motionPlan = value.motionPlan || cloneData(DEFAULT_MOTION_PLAN);
        state.actions = value.actions || cloneData(DEFAULT_ACTIONS);
        state.selectedKeyframe = null;
        state.currentPrompt = value.currentPrompt || DEFAULT_PROMPT;
        state.promptHistory = value.promptHistory || [];
        state.currentPromptHistoryId = value.currentPromptHistoryId || null;
        if (!state.entities.some((entity) => entity.id === state.selectedId)) {
            state.selectedId = state.entities[0]?.id || null;
        }
        $("#projectName").value = state.projectName;
        rebuildEntityObjects();
        renderSceneTree();
        renderTimelineTracks();
        const promptVersion = state.promptHistory.find((entry) => entry.id === state.currentPromptHistoryId);
        setPromptText(state.currentPrompt, promptVersion?.entityLinks || []);
        renderPromptHistory();
        selectEntity(state.selectedId, false);
        updateAtTime(state.time);
        markDirty();
        updateHistoryButtons();
    }

    function undo() {
        if (!runtime.undo.length) return;
        runtime.redo.push(currentSnapshot());
        restoreSnapshot(runtime.undo.pop());
        toast("Undid the last scene patch");
    }

    function redo() {
        if (!runtime.redo.length) return;
        runtime.undo.push(currentSnapshot());
        restoreSnapshot(runtime.redo.pop());
        toast("Reapplied the scene patch");
    }

    function updateHistoryButtons() {
        $("#undoButton").disabled = runtime.undo.length === 0;
        $("#redoButton").disabled = runtime.redo.length === 0;
    }

    function createMaterial(color, entity, extras = {}) {
        return new THREE.MeshStandardMaterial({
            color,
            roughness: entity?.roughness ?? 0.8,
            metalness: entity?.metalness ?? 0,
            ...extras
        });
    }

    function tagEntity(root, id) {
        root.userData.entityId = id;
        root.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                child.userData.entityId = id;
            }
        });
        return root;
    }

    function mesh(geometry, material, position, rotation) {
        const object = new THREE.Mesh(geometry, material);
        if (position) object.position.set(...position);
        if (rotation) object.rotation.set(...rotation);
        return object;
    }

    function createHumanoid(entity, robot = false) {
        const group = new THREE.Group();
        const bodyColor = createMaterial(entity.color, entity);
        const dark = createMaterial(robot ? "#26354D" : "#383E39", entity);
        const face = createMaterial(robot ? "#C6E4F2" : "#E0A28C", entity, { roughness: 0.95 });
        const joint = createMaterial(robot ? "#AAB8C3" : entity.color, entity, { roughness: 0.7 });

        const rig = new THREE.Group();
        group.add(rig);

        const hips = new THREE.Group();
        hips.position.y = 1.02;
        rig.add(hips);

        const torso = mesh(
            robot ? new THREE.BoxGeometry(0.58, 0.78, 0.35) : new THREE.CylinderGeometry(0.24, 0.32, 0.82, 10),
            bodyColor,
            [0, 0.57, 0]
        );
        hips.add(torso);

        const neck = mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.12, 8), joint, [0, 1.01, 0]);
        hips.add(neck);
        const head = mesh(
            robot ? new THREE.BoxGeometry(0.39, 0.35, 0.36) : new THREE.SphereGeometry(0.22, 14, 10),
            robot ? bodyColor : face,
            [0, 1.24, 0]
        );
        hips.add(head);

        if (robot) {
            const visor = mesh(new THREE.BoxGeometry(0.24, 0.075, 0.018), face, [0, 1.27, 0.19]);
            hips.add(visor);
            const antenna = mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.2, 6), dark, [0.11, 1.56, 0]);
            const antennaTip = mesh(new THREE.SphereGeometry(0.045, 8, 6), bodyColor, [0.11, 1.68, 0]);
            hips.add(antenna, antennaTip);
        } else {
            const hair = mesh(new THREE.SphereGeometry(0.224, 14, 6, 0, Math.PI * 2, 0, Math.PI * 0.48), dark, [0, 1.31, -0.015]);
            hips.add(hair);
        }

        function makeLimb(side, isArm) {
            const pivot = new THREE.Group();
            const x = isArm ? side * 0.37 : side * 0.17;
            const y = isArm ? 0.82 : 0.04;
            pivot.position.set(x, y, 0);
            hips.add(pivot);

            const length = isArm ? 0.47 : 0.57;
            const upper = mesh(
                robot ? new THREE.BoxGeometry(0.13, length, 0.14) : new THREE.CylinderGeometry(0.075, 0.085, length, 8),
                isArm ? bodyColor : dark,
                [0, -length / 2, 0]
            );
            pivot.add(upper);
            const lowerPivot = new THREE.Group();
            lowerPivot.position.y = -length;
            pivot.add(lowerPivot);
            const lower = mesh(
                robot ? new THREE.BoxGeometry(0.115, length * 0.9, 0.12) : new THREE.CylinderGeometry(0.065, 0.075, length * 0.9, 8),
                isArm ? joint : dark,
                [0, -(length * 0.9) / 2, 0]
            );
            lowerPivot.add(lower);
            const end = mesh(
                isArm ? new THREE.SphereGeometry(0.09, 8, 6) : new THREE.BoxGeometry(0.18, 0.1, 0.32),
                isArm ? (robot ? joint : face) : dark,
                [0, -length * 0.9 - (isArm ? 0.04 : 0), isArm ? 0 : 0.08]
            );
            lowerPivot.add(end);
            return { pivot, lowerPivot };
        }

        const leftArm = makeLimb(-1, true);
        const rightArm = makeLimb(1, true);
        const leftLeg = makeLimb(-1, false);
        const rightLeg = makeLimb(1, false);

        group.userData.rig = { rig, hips, head, leftArm, rightArm, leftLeg, rightLeg };
        group.userData.materials = [bodyColor, dark, face, joint];
        applyHumanoidPose(group, 0, entity.id);
        return tagEntity(group, entity.id);
    }

    function applyHumanoidPose(group, time, entityId) {
        const rig = group.userData.rig;
        if (!rig) return;
        const isJohn = entityId === "entity_john";
        const timing = motionTiming();
        const seated = isJohn ? time < timing.standStart : true;
        const standProgress = isJohn
            ? ease((time - timing.standStart) / timing.standDuration)
            : 0;
        const stepping = isJohn && Boolean(state.motionPlan?.stepDirection) &&
            time >= timing.stepStart && time <= timing.stepStart + timing.stepDuration;
        const walking = isJohn && (
            stepping ||
            (state.motionPlan?.walkToDoor &&
                time >= timing.walkStart &&
                time <= timing.exitStart + timing.exitDuration)
        );
        const walkPhase = walking ? (time - (stepping ? timing.stepStart : timing.walkStart)) * 5.8 : 0;
        const duckAmount = isJohn ? duckAmountAtTime(time) : 0;

        const seatAmount = isJohn ? 1 - standProgress : 1;
        rig.hips.position.y = lerp(1.02, 0.82, seatAmount) - duckAmount * 0.28;
        rig.hips.rotation.x = lerp(0, -0.08, seatAmount) - duckAmount * 0.18;

        [rig.leftLeg, rig.rightLeg].forEach((leg) => {
            leg.pivot.rotation.x = lerp(duckAmount * -0.42, -Math.PI * 0.47, seatAmount);
            leg.lowerPivot.rotation.x = lerp(duckAmount * 0.86, Math.PI * 0.5, seatAmount);
        });

        rig.leftArm.pivot.rotation.z = seated ? -0.14 : -0.04;
        rig.rightArm.pivot.rotation.z = seated ? 0.14 : 0.04;
        rig.leftArm.pivot.rotation.x = seated ? -0.18 : 0;
        rig.rightArm.pivot.rotation.x = seated ? -0.18 : 0;

        if (walking) {
            const swing = Math.sin(walkPhase) * 0.58;
            rig.leftLeg.pivot.rotation.x = swing;
            rig.rightLeg.pivot.rotation.x = -swing;
            rig.leftLeg.lowerPivot.rotation.x = Math.max(0, -swing) * 0.6;
            rig.rightLeg.lowerPivot.rotation.x = Math.max(0, swing) * 0.6;
            rig.leftArm.pivot.rotation.x = -swing * 0.72;
            rig.rightArm.pivot.rotation.x = swing * 0.72;
            rig.hips.position.y = 1.02 + Math.abs(Math.sin(walkPhase * 2)) * 0.025;
        }

        if (isJohn &&
            time >= timing.speakStart &&
            time <= timing.speakStart + timing.speakDuration) {
            rig.head.rotation.y = Math.sin((time - timing.speakStart) * 3) * 0.05;
            rig.rightArm.pivot.rotation.x = -0.46;
            rig.rightArm.pivot.rotation.z = 0.12;
        } else {
            rig.head.rotation.y = 0;
        }
    }

    function createDesk(entity) {
        const group = new THREE.Group();
        const wood = createMaterial(entity.color, entity);
        const edge = createMaterial("#61432F", entity, { roughness: 0.9 });
        group.add(mesh(new THREE.BoxGeometry(2.25, 0.16, 1.32), wood, [0, 1.08, 0]));
        [[-0.91, 0.53, -0.48], [0.91, 0.53, -0.48], [-0.91, 0.53, 0.48], [0.91, 0.53, 0.48]].forEach((p) => {
            group.add(mesh(new THREE.BoxGeometry(0.11, 1.05, 0.11), edge, p));
        });
        const paper = createMaterial("#D8D5C8", entity, { roughness: 1 });
        group.add(mesh(new THREE.BoxGeometry(0.48, 0.018, 0.34), paper, [-0.2, 1.18, 0.08], [0, -0.16, 0]));
        const mug = createMaterial("#4C675C", entity);
        group.add(mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.22, 12), mug, [0.7, 1.28, 0.2]));
        group.userData.materials = [wood, edge];
        return tagEntity(group, entity.id);
    }

    function createChair(entity) {
        const group = new THREE.Group();
        const material = createMaterial(entity.color, entity);
        group.add(mesh(new THREE.BoxGeometry(0.65, 0.13, 0.65), material, [0, 0.63, 0]));
        group.add(mesh(new THREE.BoxGeometry(0.64, 0.72, 0.11), material, [0, 0.98, -0.28], [-0.08, 0, 0]));
        [[-0.25, 0.28, -0.22], [0.25, 0.28, -0.22], [-0.25, 0.28, 0.22], [0.25, 0.28, 0.22]].forEach((p) => {
            group.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.57, 7), material, p));
        });
        group.userData.materials = [material];
        return tagEntity(group, entity.id);
    }

    function createDoor(entity) {
        const group = new THREE.Group();
        const frame = createMaterial("#303A35", entity);
        const doorMaterial = createMaterial(entity.color, entity);
        const handle = createMaterial("#BEA86C", entity, { metalness: 0.65, roughness: 0.35 });
        group.add(mesh(new THREE.BoxGeometry(0.16, 2.85, 0.16), frame, [0, 1.425, 0]));
        group.add(mesh(new THREE.BoxGeometry(0.16, 2.85, 0.16), frame, [0, 1.425, 1.52]));
        group.add(mesh(new THREE.BoxGeometry(0.16, 0.16, 1.68), frame, [0, 2.77, 0.76]));
        const pivot = new THREE.Group();
        pivot.position.set(0, 0, 0.07);
        group.add(pivot);
        const panel = mesh(new THREE.BoxGeometry(0.13, 2.6, 1.38), doorMaterial, [0, 1.36, 0.69]);
        const inset = mesh(new THREE.BoxGeometry(0.145, 1.75, 0.86), createMaterial("#5D6962", entity), [0, 1.45, 0.69]);
        const knob = mesh(new THREE.SphereGeometry(0.06, 10, 8), handle, [-0.1, 1.34, 1.19]);
        pivot.add(panel, inset, knob);
        group.userData.doorPivot = pivot;
        group.userData.materials = [doorMaterial, frame];
        return tagEntity(group, entity.id);
    }

    function createPrimitive(entity) {
        const material = createMaterial(entity.color, entity);
        let geometry;
        if (entity.type === "sphere") geometry = new THREE.SphereGeometry(0.48, 22, 14);
        else geometry = new THREE.BoxGeometry(0.85, 0.85, 0.85);
        const group = new THREE.Group();
        group.add(mesh(geometry, material, [0, 0.43, 0]));
        group.userData.materials = [material];
        return tagEntity(group, entity.id);
    }

    function createImported(entity) {
        const template = runtime.importedTemplates.get(entity.assetId);
        if (!template) return createPrimitive({ ...entity, type: "box" });
        const group = template.clone(true);
        const bounds = new THREE.Box3().setFromObject(group);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        bounds.getSize(size);
        bounds.getCenter(center);
        const maxSize = Math.max(size.x, size.y, size.z) || 1;
        const normalization = 1.8 / maxSize;
        group.scale.setScalar(normalization);
        group.position.sub(center.multiplyScalar(normalization));
        const wrapper = new THREE.Group();
        wrapper.add(group);
        wrapper.userData.materials = [];
        group.traverse((child) => {
            if (child.isMesh) {
                child.material = child.material.clone();
                wrapper.userData.materials.push(child.material);
            }
        });
        return tagEntity(wrapper, entity.id);
    }

    function createLightObject(entity) {
        const helper = new THREE.Group();
        const wire = new THREE.MeshBasicMaterial({ color: "#C1AE79", wireframe: true });
        helper.add(mesh(new THREE.SphereGeometry(0.14, 8, 6), wire));
        helper.add(mesh(new THREE.ConeGeometry(0.26, 0.45, 8, 1, true), wire, [0, -0.25, 0], [Math.PI, 0, 0]));
        helper.userData.materials = [wire];
        return tagEntity(helper, entity.id);
    }

    function createCameraObject(entity) {
        const group = new THREE.Group();
        const wire = new THREE.MeshBasicMaterial({ color: entity.color, wireframe: true });
        group.add(mesh(new THREE.BoxGeometry(0.35, 0.24, 0.28), wire));
        group.add(mesh(new THREE.ConeGeometry(0.28, 0.5, 4, 1, true), wire, [0, 0, -0.38], [Math.PI / 2, 0, 0]));
        group.scale.setScalar(0.45);
        group.userData.materials = [wire];
        return tagEntity(group, entity.id);
    }

    function createEntityObject(entity) {
        let object;
        switch (entity.type) {
            case "character": object = createHumanoid(entity, false); break;
            case "robot": object = createHumanoid(entity, true); break;
            case "desk": object = createDesk(entity); break;
            case "chair": object = createChair(entity); break;
            case "door": object = createDoor(entity); break;
            case "light": object = createLightObject(entity); break;
            case "camera": object = createCameraObject(entity); break;
            case "imported": object = createImported(entity); break;
            default: object = createPrimitive(entity); break;
        }
        object.name = entity.name;
        object.position.set(...entity.position);
        object.rotation.set(...entity.rotation);
        object.scale.set(...entity.scale);
        object.visible = entity.visible !== false;
        // Camera/light proxies are inspectable from the tree, but keeping them
        // out of the beauty viewport avoids a helper sitting inside the editor camera.
        if (entity.type === "camera" || entity.type === "light") {
            object.visible = false;
            object.userData.editorHelper = true;
        }
        return object;
    }

    function initThree() {
        if (!window.THREE) {
            window.SceneScriptLoading?.fail("The 3D runtime could not be loaded. Check your connection and retry.");
            toast("Three.js failed to load. Check your internet connection.");
            return false;
        }

        window.SceneScriptLoading?.set(63, "Building deterministic scene…", "Creating WebGL renderer", 67);
        const canvas = $("#sceneCanvas");
        runtime.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
        runtime.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        runtime.renderer.shadowMap.enabled = true;
        runtime.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        runtime.renderer.outputEncoding = THREE.sRGBEncoding;
        runtime.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        runtime.renderer.toneMappingExposure = 1.05;

        runtime.scene = new THREE.Scene();
        runtime.scene.background = new THREE.Color(state.environment.background);
        runtime.scene.fog = new THREE.Fog(state.environment.background, 10, 18);
        runtime.camera = new THREE.PerspectiveCamera(39, 1, 0.05, 100);
        runtime.camera.position.set(6.4, 4.5, 7.8);

        if (THREE.OrbitControls) {
            runtime.controls = new THREE.OrbitControls(runtime.camera, canvas);
            runtime.controls.enableDamping = true;
            runtime.controls.dampingFactor = 0.06;
            runtime.controls.target.set(0.4, 1, 0);
            runtime.controls.minDistance = 3;
            runtime.controls.maxDistance = 16;
            runtime.controls.maxPolarAngle = Math.PI * 0.49;
        }

        if (THREE.TransformControls) {
            runtime.transformControls = new THREE.TransformControls(runtime.camera, canvas);
            runtime.transformControls.visible = false;
            runtime.transformControls.addEventListener("dragging-changed", (event) => {
                if (runtime.controls) runtime.controls.enabled = !event.value && !state.isPlaying;
                if (event.value) pushHistory();
            });
            runtime.transformControls.addEventListener("objectChange", syncSelectedFromGizmo);
            runtime.scene.add(runtime.transformControls);
        }

        window.SceneScriptLoading?.set(68, "Building deterministic scene…", "Constructing lights and environment", 71);
        buildEnvironment();
        rebuildEntityObjects();
        hydratePersistedAssets();

        runtime.selectionBox = new THREE.BoxHelper(undefined, new THREE.Color("#D7F36B"));
        runtime.selectionBox.material.depthTest = false;
        runtime.selectionBox.material.transparent = true;
        runtime.selectionBox.material.opacity = 0.85;
        runtime.selectionBox.renderOrder = 20;
        runtime.selectionBox.visible = false;
        runtime.scene.add(runtime.selectionBox);

        runtime.clock = new THREE.Clock();
        runtime.resizeObserver = new ResizeObserver(resizeRenderer);
        runtime.resizeObserver.observe($("#viewportShell"));
        resizeRenderer();

        canvas.addEventListener("pointerdown", (event) => {
            runtime.pointerDown = { x: event.clientX, y: event.clientY };
        });
        canvas.addEventListener("pointerup", handleCanvasSelection);
        canvas.addEventListener("dblclick", () => focusSelected());

        runtime.renderer.setAnimationLoop(renderLoop);
        window.SceneScriptLoading?.set(74, "Preparing local prompt model…", "3D scene ready", 76);
        return true;
    }

    function hydratePersistedAssets() {
        if (!THREE.GLTFLoader) return;
        state.entities
            .filter((entity) =>
                entity.type === "imported" &&
                entity.metadata?.sourceUri &&
                !runtime.importedTemplates.has(entity.assetId))
            .forEach((entity) => {
                const loader = new THREE.GLTFLoader();
                loader.load(entity.metadata.sourceUri, (gltf) => {
                    runtime.importedTemplates.set(entity.assetId, gltf.scene);
                    const previous = runtime.objects.get(entity.id);
                    if (previous) runtime.scene.remove(previous);
                    const object = createEntityObject(entity);
                    runtime.objects.set(entity.id, object);
                    runtime.scene.add(object);
                    if (state.selectedId === entity.id) selectEntity(entity.id, false);
                }, undefined, () => {
                    toast(`${entity.name} could not be restored from asset storage`);
                });
            });
    }

    function buildEnvironment() {
        const scene = runtime.scene;
        const hemi = new THREE.HemisphereLight("#F4F0DD", "#26312B", 1.25);
        scene.add(hemi);

        const key = new THREE.DirectionalLight("#FFF0CF", 2.3);
        key.position.set(-3.5, 6, 4.2);
        key.castShadow = true;
        key.shadow.mapSize.set(1024, 1024);
        key.shadow.camera.left = -7;
        key.shadow.camera.right = 7;
        key.shadow.camera.top = 7;
        key.shadow.camera.bottom = -7;
        scene.add(key);

        const fill = new THREE.DirectionalLight("#B7D1E6", 0.72);
        fill.position.set(5, 3, -4);
        scene.add(fill);

        const room = new THREE.Group();
        const floorMat = new THREE.MeshStandardMaterial({ color: "#B8B2A2", roughness: 0.96 });
        const floor = mesh(new THREE.PlaneGeometry(13, 10), floorMat, [0, -0.015, 0], [-Math.PI / 2, 0, 0]);
        floor.receiveShadow = true;
        room.add(floor);

        const wallMat = new THREE.MeshStandardMaterial({ color: "#D4D1C4", roughness: 1 });
        const backWall = mesh(new THREE.PlaneGeometry(13, 4.5), wallMat, [0, 2.25, -4.2]);
        backWall.receiveShadow = true;
        room.add(backWall);
        const sideWall = mesh(new THREE.PlaneGeometry(9, 4.5), wallMat, [-6.25, 2.25, 0], [0, Math.PI / 2, 0]);
        room.add(sideWall);

        const windowFrame = new THREE.MeshStandardMaterial({ color: "#56625B", roughness: 0.72 });
        const glass = new THREE.MeshStandardMaterial({ color: "#98B9C4", roughness: 0.18, metalness: 0.1, transparent: true, opacity: 0.74 });
        room.add(mesh(new THREE.PlaneGeometry(2.9, 1.65), glass, [-2.15, 2.28, -4.17]));
        room.add(mesh(new THREE.BoxGeometry(3.08, 0.09, 0.09), windowFrame, [-2.15, 3.11, -4.12]));
        room.add(mesh(new THREE.BoxGeometry(3.08, 0.09, 0.09), windowFrame, [-2.15, 1.45, -4.12]));
        room.add(mesh(new THREE.BoxGeometry(0.09, 1.74, 0.09), windowFrame, [-3.69, 2.28, -4.12]));
        room.add(mesh(new THREE.BoxGeometry(0.09, 1.74, 0.09), windowFrame, [-0.61, 2.28, -4.12]));
        room.add(mesh(new THREE.BoxGeometry(0.07, 1.68, 0.08), windowFrame, [-2.15, 2.28, -4.1]));

        const plantPot = new THREE.MeshStandardMaterial({ color: "#A36F4F", roughness: 0.9 });
        const plantGreen = new THREE.MeshStandardMaterial({ color: "#4A7151", roughness: 0.92 });
        room.add(mesh(new THREE.CylinderGeometry(0.26, 0.2, 0.48, 12), plantPot, [-4.8, 0.24, -3.45]));
        for (let index = 0; index < 5; index++) {
            const leaf = mesh(new THREE.SphereGeometry(0.28, 8, 6), plantGreen, [-4.8 + Math.sin(index * 1.7) * 0.22, 0.68 + index * 0.12, -3.45 + Math.cos(index) * 0.12]);
            leaf.scale.set(0.65, 1.35, 0.45);
            leaf.rotation.z = (index - 2) * 0.18;
            room.add(leaf);
        }

        runtime.grid = new THREE.GridHelper(13, 26, "#69716B", "#555C57");
        runtime.grid.position.y = 0.006;
        runtime.grid.material.opacity = 0.2;
        runtime.grid.material.transparent = true;
        room.add(runtime.grid);

        runtime.room = room;
        scene.add(room);
    }

    function rebuildEntityObjects() {
        if (!runtime.scene) return;
        runtime.objects.forEach((object) => {
            runtime.scene.remove(object);
            object.traverse((child) => {
                if (child.geometry && child.userData.disposeGeometry !== false) child.geometry.dispose?.();
            });
        });
        runtime.objects.clear();

        state.entities.forEach((entity) => {
            const object = createEntityObject(entity);
            runtime.objects.set(entity.id, object);
            runtime.scene.add(object);
        });
        $("#objectCount").textContent = `${state.entities.length} objects`;
        updateEnvironmentColors();
    }

    function resizeRenderer() {
        if (!runtime.renderer || !runtime.camera) return;
        const shell = $("#viewportShell");
        const width = Math.max(shell.clientWidth, 1);
        const height = Math.max(shell.clientHeight, 1);
        runtime.renderer.setSize(width, height, false);
        runtime.camera.aspect = width / height;
        runtime.camera.updateProjectionMatrix();
    }

    function renderLoop() {
        if (!runtime.renderer) return;
        const now = performance.now();
        const delta = Math.min((now - runtime.lastFrame) / 1000, 0.1);
        runtime.lastFrame = now;

        if (state.isPlaying) {
            state.time += delta;
            if (state.time >= state.duration) {
                state.time = state.duration;
                setPlaying(false);
            }
            updateAtTime(state.time);
        }

        if (runtime.controls) runtime.controls.update();
        if (runtime.selectionBox?.visible) runtime.selectionBox.update();
        runtime.renderer.render(runtime.scene, runtime.camera);
    }

    function actionProgress(action, time) {
        const start = Number(action.start || 0);
        const duration = Math.max(Number(action.duration || 0), 0.0001);
        const linear = clamp((time - start) / duration, 0, 1);
        if (action.easing === "gravity") return linear * linear;
        if (action.easing === "linear") return linear;
        return ease(linear);
    }

    function actionsForEntity(entityId) {
        return (state.actions || [])
            .filter((action) => action.entityId === entityId)
            .sort((a, b) => Number(a.start || 0) - Number(b.start || 0));
    }

    function directionVector(direction) {
        return {
            left: [-1, 0, 0],
            right: [1, 0, 0],
            up: [0, 1, 0],
            down: [0, -1, 0],
            forward: [0, 0, -1],
            backward: [0, 0, 1],
            back: [0, 0, 1]
        }[String(direction || "").toLowerCase()] || [0, 0, 0];
    }

    function groundHeightForEntity(entity) {
        if (entity.type === "box" || entity.type === "sphere") {
            return 0.5 * Number(entity.scale?.[1] || 1);
        }
        return Number(entity.position?.[1] || 0);
    }

    function normalizeActionPlan(actions) {
        const transforms = new Map(state.entities.map((entity) => [
            entity.id,
            {
                position: [...entity.position],
                rotation: [...entity.rotation],
                scale: [...entity.scale]
            }
        ]));
        return cloneData(actions || [])
            .map((action, index) => ({
                id: action.id || `action_${stableHash(JSON.stringify(action))}_${index}`,
                start: Math.max(0, Number(action.start || 0)),
                duration: Math.max(0, Number(action.duration || 0)),
                ...action
            }))
            .sort((a, b) => a.start - b.start)
            .map((action) => {
                const entity = entityById(action.entityId);
                const transform = transforms.get(action.entityId);
                if (!entity || !transform) return action;
                if (action.type === "place") {
                    action.from ||= [...transform.position];
                    action.to ||= action.position || [...transform.position];
                    transform.position = [...action.to];
                } else if (action.type === "moveBy") {
                    const vector = directionVector(action.direction)
                        .map((value) => value * Number(action.distance || 1));
                    action.from ||= [...transform.position];
                    action.to ||= action.from.map((value, axis) => value + vector[axis]);
                    transform.position = [...action.to];
                } else if (action.type === "moveTo" || action.type === "fallToGround") {
                    action.from ||= [...transform.position];
                    if (action.type === "fallToGround") {
                        const groundY = entity.type === "box" || entity.type === "sphere"
                            ? 0.5 * Number(transform.scale[1] || 1)
                            : groundHeightForEntity(entity);
                        action.to = [action.from[0], groundY, action.from[2]];
                    } else {
                        action.to ||= [...transform.position];
                    }
                    transform.position = [...action.to];
                } else if (action.type === "rotateBy") {
                    action.from ||= [...transform.rotation];
                    const axis = { x: 0, y: 1, z: 2 }[action.axis || "y"];
                    action.to ||= [...action.from];
                    action.to[axis] += radians(Number(action.degrees || 0));
                    transform.rotation = [...action.to];
                } else if (action.type === "rotateTo") {
                    action.from ||= [...transform.rotation];
                    action.to ||= [...transform.rotation];
                    transform.rotation = [...action.to];
                } else if (action.type === "scaleTo") {
                    action.from ||= [...transform.scale];
                    action.to ||= Array.isArray(action.scale)
                        ? action.scale
                        : [Number(action.scale || 1), Number(action.scale || 1), Number(action.scale || 1)];
                    transform.scale = [...action.to];
                }
                return action;
            });
    }

    function evaluateEntityTransform(entity, time) {
        const transform = {
            position: [...entity.position],
            rotation: [...entity.rotation],
            scale: [...entity.scale]
        };
        actionsForEntity(entity.id).forEach((action) => {
            if (time < Number(action.start || 0)) return;
            const progress = actionProgress(action, time);
            if (["place", "moveBy", "moveTo", "fallToGround"].includes(action.type) &&
                action.from && action.to) {
                transform.position = action.from.map((value, axis) =>
                    lerp(value, action.to[axis], progress));
            } else if (["rotateBy", "rotateTo"].includes(action.type) &&
                action.from && action.to) {
                transform.rotation = action.from.map((value, axis) =>
                    lerpAngle(value, action.to[axis], progress));
            } else if (action.type === "scaleTo" && action.from && action.to) {
                transform.scale = action.from.map((value, axis) =>
                    lerp(value, action.to[axis], progress));
            }
            if (action.type === "duck") {
                const local = clamp((time - action.start) / Math.max(action.duration, 0.001), 0, 1);
                const amount = local < 0.3
                    ? ease(local / 0.3)
                    : local > 0.7 ? 1 - ease((local - 0.7) / 0.3) : 1;
                transform.position[1] -= 0.18 * amount;
            }
        });
        return transform;
    }

    function activeAction(entityId, time, types = null) {
        return actionsForEntity(entityId).findLast((action) => {
            if (types && !types.includes(action.type)) return false;
            const start = Number(action.start || 0);
            const end = start + Math.max(Number(action.duration || 0), 0.22);
            return time >= start && time <= end;
        }) || null;
    }

    function applyActionHumanoidPose(group, time, entityId) {
        const rig = group.userData.rig;
        if (!rig) return;
        const entity = entityById(entityId);
        const stand = actionsForEntity(entityId).find((action) => action.type === "stand");
        const seatedByDefault = entity?.type === "robot" || Boolean(stand);
        const standProgress = stand
            ? actionProgress(stand, time)
            : seatedByDefault ? 0 : 1;
        const seatAmount = seatedByDefault ? 1 - standProgress : 0;
        const duck = activeAction(entityId, time, ["duck"]);
        const duckProgress = duck
            ? clamp((time - duck.start) / Math.max(duck.duration, 0.001), 0, 1)
            : 0;
        const duckAmount = !duck
            ? 0
            : duckProgress < 0.3
                ? ease(duckProgress / 0.3)
                : duckProgress > 0.7 ? 1 - ease((duckProgress - 0.7) / 0.3) : 1;
        const locomotion = activeAction(entityId, time, ["moveBy", "moveTo", "fallToGround"]);
        const locomotionClip = activeAction(entityId, time, ["walk", "run"]);
        const walking = locomotion?.locomotion === "walk" || locomotionClip?.type === "walk";
        const running = locomotion?.locomotion === "run" || locomotionClip?.type === "run";
        const walkPhase = walking || running
            ? (time - (locomotion?.start ?? locomotionClip.start)) * (running ? 9.2 : 5.8)
            : 0;

        rig.hips.position.y = lerp(1.02, 0.82, seatAmount) - duckAmount * 0.28;
        rig.hips.rotation.x = lerp(0, -0.08, seatAmount) - duckAmount * 0.18;
        [rig.leftLeg, rig.rightLeg].forEach((leg) => {
            leg.pivot.rotation.x = lerp(duckAmount * -0.42, -Math.PI * 0.47, seatAmount);
            leg.lowerPivot.rotation.x = lerp(duckAmount * 0.86, Math.PI * 0.5, seatAmount);
        });
        rig.leftArm.pivot.rotation.z = seatAmount > 0.5 ? -0.14 : -0.04;
        rig.rightArm.pivot.rotation.z = seatAmount > 0.5 ? 0.14 : 0.04;
        rig.leftArm.pivot.rotation.x = seatAmount > 0.5 ? -0.18 : 0;
        rig.rightArm.pivot.rotation.x = seatAmount > 0.5 ? -0.18 : 0;

        if (walking || running) {
            const swing = Math.sin(walkPhase) * (running ? 0.82 : 0.58);
            rig.leftLeg.pivot.rotation.x = swing;
            rig.rightLeg.pivot.rotation.x = -swing;
            rig.leftLeg.lowerPivot.rotation.x = Math.max(0, -swing) * 0.6;
            rig.rightLeg.lowerPivot.rotation.x = Math.max(0, swing) * 0.6;
            rig.leftArm.pivot.rotation.x = -swing * 0.72;
            rig.rightArm.pivot.rotation.x = swing * 0.72;
            rig.hips.position.y = 1.02 + Math.abs(Math.sin(walkPhase * 2)) * 0.025;
        }

        const jumping = activeAction(entityId, time, ["jump"]);
        if (jumping) {
            const jumpProgress = actionProgress(jumping, time);
            rig.hips.position.y += Math.sin(jumpProgress * Math.PI) * 0.72;
            rig.leftLeg.pivot.rotation.x = -0.32;
            rig.rightLeg.pivot.rotation.x = -0.32;
            rig.leftLeg.lowerPivot.rotation.x = 0.68;
            rig.rightLeg.lowerPivot.rotation.x = 0.68;
            rig.leftArm.pivot.rotation.z = -0.75;
            rig.rightArm.pivot.rotation.z = 0.75;
        }

        const speaking = activeAction(entityId, time, ["speak"]);
        if (speaking) {
            rig.head.rotation.y = Math.sin((time - speaking.start) * 3) * 0.05;
            rig.rightArm.pivot.rotation.x = -0.46;
            rig.rightArm.pivot.rotation.z = 0.12;
        } else {
            rig.head.rotation.y = 0;
        }
    }

    function applyActionMaterials(entity, object, time) {
        const primary = object.userData.materials?.[0];
        if (!primary?.color) return;
        primary.color.set(entity.color || "#888888");
        actionsForEntity(entity.id)
            .filter((action) => action.type === "setColor" && time >= action.start)
            .forEach((action) => {
                if (!action.duration || !action.fromColor) {
                    primary.color.set(action.color || "#D85A4F");
                    return;
                }
                const from = new THREE.Color(action.fromColor);
                const to = new THREE.Color(action.color || "#D85A4F");
                primary.color.copy(from.lerp(to, actionProgress(action, time)));
            });
    }

    function updateCameraFromActions(time) {
        if (!runtime.camera || !runtime.controls) return;
        const cameraEntity = entityById("camera_main");
        const follow = activeAction("camera_main", time, ["cameraFollow"]);
        if (follow) {
            const targetObject = runtime.objects.get(follow.targetId);
            if (targetObject) {
                const offset = follow.offset || [3.7, 2.9, 4.8];
                runtime.camera.position.set(
                    targetObject.position.x + offset[0],
                    targetObject.position.y + offset[1],
                    targetObject.position.z + offset[2]
                );
                runtime.controls.target.set(
                    targetObject.position.x,
                    targetObject.position.y + 1.05,
                    targetObject.position.z
                );
                return;
            }
        }
        const lookAt = activeAction("camera_main", time, ["cameraLookAt"]);
        if (lookAt) {
            const targetObject = runtime.objects.get(lookAt.targetId);
            if (targetObject) runtime.controls.target.copy(targetObject.position);
        } else {
            const movement = activeAction("camera_main", time, ["moveBy", "moveTo"]);
            if (movement?.from && movement?.to) {
                const progress = actionProgress(movement, time);
                runtime.camera.position.set(
                    lerp(movement.from[0], movement.to[0], progress),
                    lerp(movement.from[1], movement.to[1], progress),
                    lerp(movement.from[2], movement.to[2], progress)
                );
                return;
            }
        }
        if (cameraEntity && time <= 0.001) {
            runtime.camera.position.set(...cameraEntity.position);
            runtime.controls.target.set(0, 1, 0);
        }
    }

    function updateAtTimeFromActions(time) {
        state.time = clamp(time, 0, state.duration);
        state.entities.forEach((entity) => {
            if (entity.type === "camera") return;
            const object = runtime.objects.get(entity.id);
            if (!object) return;
            const transform = evaluateEntityTransform(entity, state.time);
            object.position.set(...transform.position);
            object.rotation.set(...transform.rotation);
            object.scale.set(...transform.scale);
            applyActionMaterials(entity, object, state.time);
            if (entity.type === "character" || entity.type === "robot") {
                applyActionHumanoidPose(object, state.time, entity.id);
            }
            if (object.userData.doorPivot) {
                const opening = actionsForEntity(entity.id)
                    .filter((action) => ["open", "close"].includes(action.type))
                    .findLast((action) => state.time >= action.start);
                const amount = opening
                    ? actionProgress(opening, state.time) * (opening.type === "open" ? 1 : -1)
                    : 0;
                object.userData.doorPivot.rotation.y =
                    opening?.type === "close"
                        ? -Math.PI * 0.56 * (1 - actionProgress(opening, state.time))
                        : -amount * Math.PI * 0.56;
            }
        });

        const speech = (state.actions || []).find((action) =>
            action.type === "speak" &&
            state.time >= action.start &&
            state.time <= action.start + action.duration);
        $("#dialogueBubble").classList.toggle("is-visible", Boolean(speech));
        if (speech) {
            $("#dialogueBubble span").textContent = entityById(speech.entityId)?.name.toUpperCase() || "ENTITY";
            $("#dialogueBubble p").textContent = speech.text || "";
        }

        applyTransformKeyframes(state.time);
        updateCameraFromActions(state.time);
        applyCameraKeyframes(state.time);
        $("#runtimeState").textContent = runtimeStateForSelection();
        updateEvaluatedTransformInspector();
        updateTimelineUI();
    }

    function updateAtTime(time) {
        if (Array.isArray(state.actions)) {
            updateAtTimeFromActions(time);
            return;
        }
        state.time = clamp(time, 0, state.duration);
        const plan = state.motionPlan || DEFAULT_MOTION_PLAN;
        const timing = motionTiming();
        const johnEntity = entityById("entity_john");
        const john = runtime.objects.get("entity_john");
        const robot = runtime.objects.get("entity_robot");
        const door = runtime.objects.get("entity_door");

        if (john && johnEntity) {
            const initial = johnEntity.position;
            const stepOffset = Number(plan.stepDirection || 0) * 0.65;
            const stepProgress = timing.stepDuration
                ? ease((state.time - timing.stepStart) / timing.stepDuration)
                : 0;
            const steppedX = initial[0] + stepOffset;
            let x = initial[0] + stepOffset * stepProgress;
            let y = initial[1] - duckAmountAtTime(state.time) * 0.18;
            let z = initial[2];
            let rotationY = johnEntity.rotation[1];

            if (timing.stepDuration && state.time >= timing.stepStart + timing.stepDuration) {
                x = steppedX;
            }
            if (plan.walkToDoor && state.time >= timing.walkStart) {
                const t = ease((state.time - timing.walkStart) / timing.walkDuration);
                john.position.set(
                    lerp(steppedX, 3.5, t),
                    y,
                    lerp(initial[2], -1.16, t)
                );
                rotationY = lerp(johnEntity.rotation[1], -Math.PI / 2, ease(t * 2.2));
                if (state.time > timing.exitStart) {
                    const exitT = ease((state.time - timing.exitStart) / timing.exitDuration);
                    john.position.x = lerp(3.5, 5.3, exitT);
                }
            } else {
                john.position.set(x, y, z);
            }
            john.rotation.y = rotationY;
            applyHumanoidPose(john, state.time, "entity_john");
        }

        if (robot) {
            applyHumanoidPose(robot, state.time, "entity_robot");
            const robotRig = robot.userData.rig;
            if (robotRig) robotRig.head.rotation.y = Math.sin(state.time * 0.6) * 0.05;
        }

        if (door?.userData.doorPivot) {
            const open = plan.openDoor
                ? ease((state.time - timing.doorOpenStart) / timing.doorOpenDuration)
                : 0;
            door.userData.doorPivot.rotation.y = -open * Math.PI * 0.56;
        }

        applyTransformKeyframes(state.time);

        const dialogueVisible =
            plan.speak !== false &&
            state.time >= timing.speakStart &&
            state.time <= timing.speakStart + timing.speakDuration;
        $("#dialogueBubble p").textContent = plan.speakText || DEFAULT_MOTION_PLAN.speakText;
        $("#dialogueBubble").classList.toggle("is-visible", dialogueVisible);
        $("#runtimeState").textContent = runtimeStateForSelection();

        if (state.isPlaying) updateCameraTrack();
        applyCameraKeyframes(state.time);
        updateEvaluatedTransformInspector();
        updateTimelineUI();
    }

    function evaluateTransformKeyframes(entityId, time) {
        const frames = [...(state.keyframes[entityId] || [])].sort((a, b) => a.time - b.time);
        if (!frames.length) return null;
        if (frames.length === 1 || time <= frames[0].time) return cloneData(frames[0].transform);
        if (time >= frames[frames.length - 1].time) return cloneData(frames[frames.length - 1].transform);

        const nextIndex = frames.findIndex((frame) => frame.time >= time);
        const previous = frames[nextIndex - 1];
        const next = frames[nextIndex];
        const span = Math.max(next.time - previous.time, 0.0001);
        const alpha = previous.interpolation === "linear"
            ? clamp((time - previous.time) / span, 0, 1)
            : ease((time - previous.time) / span);

        return {
            position: previous.transform.position.map((value, index) =>
                lerp(value, next.transform.position[index], alpha)),
            rotation: previous.transform.rotation.map((value, index) =>
                lerpAngle(value, next.transform.rotation[index], alpha)),
            scale: previous.transform.scale.map((value, index) =>
                lerp(value, next.transform.scale[index], alpha))
        };
    }

    function lerpAngle(from, to, amount) {
        let delta = (to - from) % (Math.PI * 2);
        if (delta > Math.PI) delta -= Math.PI * 2;
        if (delta < -Math.PI) delta += Math.PI * 2;
        return from + delta * amount;
    }

    function applyTransformKeyframes(time) {
        Object.keys(state.keyframes).forEach((entityId) => {
            if (entityId === "camera_main") return;
            const transform = evaluateTransformKeyframes(entityId, time);
            const object = runtime.objects.get(entityId);
            if (!transform || !object) return;
            object.position.set(...transform.position);
            object.rotation.set(...transform.rotation);
            object.scale.set(...transform.scale);
        });
    }

    function applyCameraKeyframes(time) {
        const transform = evaluateTransformKeyframes("camera_main", time);
        if (!transform || !runtime.camera) return;
        runtime.camera.position.set(...transform.position);
        runtime.camera.rotation.set(...transform.rotation);
        if (runtime.controls) {
            const direction = new THREE.Vector3(0, 0, -1).applyEuler(runtime.camera.rotation);
            runtime.controls.target.copy(runtime.camera.position).add(direction.multiplyScalar(4));
        }
    }

    function evaluatedObjectForEntity(entityId) {
        return entityId === "camera_main" ? runtime.camera : runtime.objects.get(entityId);
    }

    function updateEvaluatedTransformInspector() {
        const entity = entityById(state.selectedId);
        const object = evaluatedObjectForEntity(state.selectedId);
        if (!entity || !object || document.activeElement?.closest(".property-row")) return;

        $("#positionX").value = round(object.position.x);
        $("#positionY").value = round(object.position.y);
        $("#positionZ").value = round(object.position.z);
        $("#rotationX").value = degrees(object.rotation.x);
        $("#rotationY").value = degrees(object.rotation.y);
        $("#rotationZ").value = degrees(object.rotation.z);
        $("#scaleX").value = round(object.scale.x);
        $("#scaleY").value = round(object.scale.y);
        $("#scaleZ").value = round(object.scale.z);
        const evaluatedMaterial = object.userData.materials?.[0];
        if (evaluatedMaterial?.color && document.activeElement?.id !== "materialColor") {
            $("#materialColor").value = `#${evaluatedMaterial.color.getHexString()}`;
        }

        const hasAnimation = state.time > 0.001 ||
            Boolean(state.keyframes[state.selectedId]?.length) ||
            actionsForEntity(state.selectedId).length > 0 ||
            ["entity_john", "entity_robot", "entity_door", "camera_main"].includes(state.selectedId);
        const badge = $("#animationBadge");
        badge.textContent = hasAnimation ? `EVAL ${state.time.toFixed(1)}s` : "BASE";
        badge.classList.toggle("is-evaluated", hasAnimation);
        badge.title = hasAnimation
            ? "Showing the transform evaluated at the current playhead time"
            : "Showing the authored base transform";
    }

    function updateCameraTrack() {
        if (!runtime.camera || !runtime.controls) return;
        const timing = motionTiming();
        let position;
        let target;
        const closeOffset = state.cameraCloser ? 0.72 : 1;
        if (!state.motionPlan?.followCamera || state.time < timing.walkStart) {
            const push = ease(state.time / Math.max(timing.walkStart, 0.1));
            position = new THREE.Vector3(
                lerp(6.4, 5.1, push) * closeOffset,
                lerp(4.5, 3.65, push) * closeOffset,
                lerp(7.8, 6.4, push) * closeOffset
            );
            target = new THREE.Vector3(-0.1, 1, 0.15);
        } else {
            const john = runtime.objects.get("entity_john");
            const johnPos = john?.position || new THREE.Vector3();
            position = new THREE.Vector3(johnPos.x + 3.7 * closeOffset, 2.9 * closeOffset, johnPos.z + 4.8 * closeOffset);
            target = new THREE.Vector3(johnPos.x, 1.05, johnPos.z);
        }
        runtime.camera.position.lerp(position, 0.09);
        runtime.controls.target.lerp(target, 0.11);
    }

    function runtimeStateForSelection() {
        if (Array.isArray(state.actions)) {
            const current = activeAction(state.selectedId, state.time);
            if (current) return actionPresentation(current)[0].toLowerCase();
            const completed = actionsForEntity(state.selectedId)
                .filter((action) => state.time >= action.start + Math.max(action.duration || 0, 0.22))
                .at(-1);
            return completed ? `${actionPresentation(completed)[0].toLowerCase()} complete` : "idle";
        }
        if (state.selectedId === "entity_john") {
            const plan = state.motionPlan || DEFAULT_MOTION_PLAN;
            const timing = motionTiming();
            if (state.time < timing.standStart) return "seated";
            if (state.time < timing.standStart + timing.standDuration) return "standing";
            if (plan.stepDirection && state.time < timing.stepStart + timing.stepDuration) {
                return plan.stepDirection < 0 ? "stepping left" : "stepping right";
            }
            if (plan.duck && state.time < timing.duckStart + timing.duckDuration) return "ducking";
            if (plan.walkToDoor && state.time < timing.walkEnd) return "walking";
            if (plan.openDoor && state.time < timing.exitStart) return "opening door";
            return "exiting";
        }
        if (state.selectedId === "entity_door") {
            const timing = motionTiming();
            return state.time >= timing.doorOpenStart + timing.doorOpenDuration
                ? "open"
                : state.time >= timing.doorOpenStart ? "opening" : "closed";
        }
        return "idle";
    }

    function renderSceneTree() {
        const groups = [
            { name: "Cameras", icon: "◉", types: ["camera"] },
            { name: "Lights", icon: "✦", types: ["light"] },
            { name: "Environment", icon: "▦", types: ["environment"] },
            { name: "Entities", icon: "◇", types: ["character", "robot", "desk", "chair", "door", "box", "sphere", "imported"] }
        ];
        const tree = $("#sceneTree");
        tree.innerHTML = "";

        groups.forEach((group) => {
            const entities = group.types.includes("environment")
                ? [{ id: "environment", name: "Office Room", type: "environment", visible: true }]
                : state.entities.filter((entity) => group.types.includes(entity.type));
            if (!entities.length) return;

            const groupNode = document.createElement("div");
            groupNode.className = "tree-group";
            groupNode.innerHTML = `
                <button class="tree-group-heading" type="button">
                    <span class="chevron">▼</span>
                    <span class="group-icon">${group.icon}</span>
                    <span>${escapeHtml(group.name)}</span>
                </button>
                <div class="tree-children"></div>`;
            const children = $(".tree-children", groupNode);
            entities.forEach((entity) => {
                const item = document.createElement("button");
                item.className = `tree-item${entity.id === state.selectedId ? " is-selected" : ""}${entity.visible === false ? " is-hidden" : ""}`;
                item.dataset.entityId = entity.id;
                item.type = "button";
                item.innerHTML = `
                    <span></span>
                    <span class="entity-icon">${entityIcon(entity.type)}</span>
                    <span>${escapeHtml(entity.name)}</span>
                    <span class="tree-visibility">${entity.visible === false ? "○" : "◉"}</span>`;
                children.appendChild(item);
            });
            tree.appendChild(groupNode);
        });

        $$(".tree-group-heading", tree).forEach((heading) => {
            heading.addEventListener("click", () => {
                const children = heading.nextElementSibling;
                const hidden = children.hidden;
                children.hidden = !hidden;
                $(".chevron", heading).textContent = hidden ? "▼" : "▶";
            });
        });
        $$(".tree-item", tree).forEach((item) => {
            item.addEventListener("click", (event) => {
                if (event.target.classList.contains("tree-visibility")) {
                    toggleEntityVisibility(item.dataset.entityId);
                    return;
                }
                if (item.dataset.entityId === "environment") {
                    toast("Environment settings are available through scene patches");
                    return;
                }
                selectEntity(item.dataset.entityId);
            });
        });
    }

    function entityIcon(type) {
        const icons = {
            character: "●",
            robot: "◆",
            desk: "▰",
            chair: "▱",
            door: "▯",
            light: "✦",
            camera: "◉",
            environment: "▦",
            imported: "⬡",
            box: "◇",
            sphere: "●"
        };
        return icons[type] || "◇";
    }

    function entityById(id) {
        return state.entities.find((entity) => entity.id === id);
    }

    function selectEntity(id, announce = true) {
        const entity = entityById(id);
        if (!entity) return;
        state.selectedId = id;
        renderSceneTree();
        updateInspector(entity);

        const object = runtime.objects.get(id);
        if (runtime.selectionBox && object) {
            runtime.selectionBox.setFromObject(object);
            runtime.selectionBox.visible = entity.visible !== false && !object.userData.editorHelper;
        }
        updateTransformGizmo();
        updateEvaluatedTransformInspector();
        $$("[data-track-label]").forEach((label) => {
            label.classList.toggle("is-selected", label.dataset.trackLabel === id);
        });
        if (announce) {
            const label = $("#selectionLabel");
            label.textContent = `${entity.name} · ${entity.subtype}`;
            label.classList.add("is-visible");
            clearTimeout(label._timer);
            label._timer = setTimeout(() => label.classList.remove("is-visible"), 1600);
        }
    }

    function updateInspector(entity) {
        $("#selectedId").textContent = entity.id;
        $("#entityName").value = entity.name;
        $("#entityType").textContent = entity.subtype;
        $("#entityAvatar").textContent = entity.name.charAt(0).toUpperCase();
        $("#entityAvatar").style.background = darkenColor(entity.color, 0.45);
        $("#entityAvatar").style.color = entity.color;
        $("#entityVisibleButton").classList.toggle("is-visible", entity.visible !== false);
        $("#positionX").value = round(entity.position[0]);
        $("#positionY").value = round(entity.position[1]);
        $("#positionZ").value = round(entity.position[2]);
        $("#rotationX").value = degrees(entity.rotation[0]);
        $("#rotationY").value = degrees(entity.rotation[1]);
        $("#rotationZ").value = degrees(entity.rotation[2]);
        $("#scaleX").value = round(entity.scale[0]);
        $("#scaleY").value = round(entity.scale[1]);
        $("#scaleZ").value = round(entity.scale[2]);
        $("#materialColor").value = entity.color;
        $("#materialHex").textContent = hex(entity.color);
        $("#roughness").value = entity.roughness ?? 0.8;
        $("#metalness").value = entity.metalness ?? 0;
        $("#roughnessValue").textContent = Number(entity.roughness ?? 0.8).toFixed(2);
        $("#metalnessValue").textContent = Number(entity.metalness ?? 0).toFixed(2);
        $("#assetId").textContent = entity.assetId;
        $("#entityRole").value = entity.role || "";
        $("#runtimeState").textContent = runtimeStateForSelection();

        const list = $("#capabilityList");
        list.innerHTML = "";
        (entity.capabilities || []).forEach((capability) => {
            const tag = document.createElement("span");
            tag.innerHTML = `${escapeHtml(capability)} <b data-remove-capability="${escapeHtml(capability)}">×</b>`;
            list.appendChild(tag);
        });
        const add = document.createElement("button");
        add.id = "addCapabilityButton";
        add.type = "button";
        add.textContent = "＋ Add capability";
        list.appendChild(add);
    }

    function round(value) {
        return Math.round(Number(value) * 100) / 100;
    }

    function darkenColor(color, amount) {
        if (!window.THREE) return "#463A38";
        const value = new THREE.Color(color);
        value.multiplyScalar(amount);
        return `#${value.getHexString()}`;
    }

    function toggleEntityVisibility(id = state.selectedId) {
        const entity = entityById(id);
        if (!entity) return;
        pushHistory();
        entity.visible = entity.visible === false;
        const object = runtime.objects.get(entity.id);
        if (object) object.visible = object.userData.editorHelper ? false : entity.visible;
        renderSceneTree();
        if (state.selectedId === id) updateInspector(entity);
        if (runtime.selectionBox && state.selectedId === id) runtime.selectionBox.visible = entity.visible;
        markDirty();
    }

    function applyEntityTransformFromInspector() {
        const entity = entityById(state.selectedId);
        if (!entity) return;
        const position = [Number($("#positionX").value), Number($("#positionY").value), Number($("#positionZ").value)];
        const rotation = [radians($("#rotationX").value), radians($("#rotationY").value), radians($("#rotationZ").value)];
        const scale = [Number($("#scaleX").value), Number($("#scaleY").value), Number($("#scaleZ").value)];
        const editingEvaluatedPose = state.time > 0.001 || Boolean(state.keyframes[entity.id]?.length);
        if (!editingEvaluatedPose) {
            entity.position = position;
            entity.rotation = rotation;
            entity.scale = scale;
        }
        const object = evaluatedObjectForEntity(entity.id);
        if (object) {
            object.position.set(...position);
            object.rotation.set(...rotation);
            object.scale.set(...scale);
        }
        if (editingEvaluatedPose) {
            runtime.pendingPoseEntityId = entity.id;
            $("#addKeyframeButton").classList.add("is-attention");
        }
        runtime.selectionBox?.update();
        if (!editingEvaluatedPose) markDirty();
    }

    function syncSelectedFromGizmo() {
        const entity = entityById(state.selectedId);
        const object = runtime.objects.get(state.selectedId);
        if (!entity || !object) return;
        const editingEvaluatedPose = state.time > 0.001 || Boolean(state.keyframes[entity.id]?.length);
        if (!editingEvaluatedPose) {
            entity.position = object.position.toArray();
            entity.rotation = [object.rotation.x, object.rotation.y, object.rotation.z];
            entity.scale = object.scale.toArray();
            markDirty();
        } else {
            runtime.pendingPoseEntityId = entity.id;
            $("#addKeyframeButton").classList.add("is-attention");
        }
        updateInspector(entity);
        updateEvaluatedTransformInspector();
        runtime.selectionBox?.update();
    }

    function updateTransformGizmo() {
        const gizmo = runtime.transformControls;
        const entity = entityById(state.selectedId);
        const object = runtime.objects.get(state.selectedId);
        if (!gizmo) return;
        if (!object || !entity || entity.type === "camera" || entity.type === "light" || state.currentTool === "select") {
            gizmo.detach();
            gizmo.visible = false;
            return;
        }
        const modes = { move: "translate", rotate: "rotate", scale: "scale" };
        gizmo.setMode(modes[state.currentTool] || "translate");
        gizmo.attach(object);
        gizmo.visible = true;
    }

    function applyMaterialChanges() {
        const entity = entityById(state.selectedId);
        const object = runtime.objects.get(state.selectedId);
        if (!entity || !object) return;
        entity.color = $("#materialColor").value;
        entity.roughness = Number($("#roughness").value);
        entity.metalness = Number($("#metalness").value);
        $("#materialHex").textContent = hex(entity.color);
        $("#roughnessValue").textContent = entity.roughness.toFixed(2);
        $("#metalnessValue").textContent = entity.metalness.toFixed(2);
        const materials = object.userData.materials || [];
        if (materials[0]?.color) materials[0].color.set(entity.color);
        materials.forEach((material) => {
            if ("roughness" in material) material.roughness = entity.roughness;
            if ("metalness" in material) material.metalness = entity.metalness;
            material.needsUpdate = true;
        });
        updateInspector(entity);
        markDirty();
    }

    function handleCanvasSelection(event) {
        if (!runtime.pointerDown || !runtime.camera) return;
        const moved = Math.hypot(event.clientX - runtime.pointerDown.x, event.clientY - runtime.pointerDown.y);
        runtime.pointerDown = null;
        if (moved > 5) return;

        const rect = $("#sceneCanvas").getBoundingClientRect();
        const pointer = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(pointer, runtime.camera);
        const hits = raycaster.intersectObjects(Array.from(runtime.objects.values()), true);
        const hit = hits.find((result) => result.object.userData.entityId);
        if (hit) selectEntity(hit.object.userData.entityId);
    }

    function focusSelected() {
        const object = runtime.objects.get(state.selectedId);
        if (!object || !runtime.controls) return;
        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3()).length();
        const direction = runtime.camera.position.clone().sub(runtime.controls.target).normalize();
        runtime.controls.target.copy(center);
        runtime.camera.position.copy(center.clone().add(direction.multiplyScalar(Math.max(size * 1.7, 2.2))));
        toast(`Focused ${entityById(state.selectedId)?.name || "entity"}`);
    }

    function setupTimeline() {
        renderTimelineRuler();

        const seek = (event) => {
            if (event.target.closest(".timeline-clip, .timeline-keyframe")) return;
            const content = $("#timelineContent");
            const rect = content.getBoundingClientRect();
            const t = clamp((event.clientX - rect.left) / rect.width, 0, 1) * state.duration;
            setPlaying(false);
            updateAtTime(t);
        };
        $("#timelineContent").addEventListener("pointerdown", seek);

        const labels = $("#trackLabels");
        const scroll = $("#timelineScroll");
        let syncingScroll = false;
        scroll.addEventListener("scroll", () => {
            if (syncingScroll) return;
            syncingScroll = true;
            labels.scrollTop = scroll.scrollTop;
            syncingScroll = false;
        });
        labels.addEventListener("scroll", () => {
            if (syncingScroll) return;
            syncingScroll = true;
            scroll.scrollTop = labels.scrollTop;
            syncingScroll = false;
        });
        labels.addEventListener("click", (event) => {
            const label = event.target.closest("[data-track-label]");
            if (!label) return;
            selectEntity(label.dataset.trackLabel);
            $(`.track-row[data-track="${label.dataset.trackLabel}"]`)?.scrollIntoView({
                block: "nearest",
                inline: "nearest"
            });
        });

        renderTimelineTracks();
    }

    function renderTimelineRuler() {
        const ruler = $("#timelineRuler");
        if (!ruler) return;
        ruler.innerHTML = "";
        const interval = state.duration > 30 ? 5 : state.duration > 15 ? 3 : 2;
        for (let second = 0; second <= state.duration; second += interval) {
            const mark = document.createElement("div");
            mark.className = "ruler-mark";
            mark.style.left = `${second / state.duration * 100}%`;
            mark.innerHTML = `<span>0:${String(second).padStart(2, "0")}</span>`;
            ruler.appendChild(mark);
        }
    }

    function bindTimelineClip(clip) {
        clip.addEventListener("click", (event) => {
            event.stopPropagation();
            $$(".timeline-clip").forEach((item) => item.classList.remove("selected"));
            clip.classList.add("selected");
            updateAtTime(Number(clip.dataset.start));
        });
        setupClipDrag(clip);
    }

    function ensureEntityTrack(entityId, shouldScroll = true) {
        const entity = entityById(entityId);
        if (!entity) return false;
        const exists = state.timelineTrackIds.includes(entityId);
        if (!exists) state.timelineTrackIds.push(entityId);
        renderTimelineTracks();
        if (shouldScroll) {
            requestAnimationFrame(() => {
                $(`.track-row[data-track="${entityId}"]`)?.scrollIntoView({
                    block: "nearest",
                    inline: "nearest"
                });
            });
        }
        return !exists;
    }

    function renderTimelineTracks() {
        const labels = $("#trackLabels");
        const content = $("#timelineContent");
        if (!labels || !content) return;

        $$("[data-dynamic-track]", labels).forEach((node) => node.remove());
        $$(".track-row[data-dynamic-track]", content).forEach((node) => node.remove());

        state.timelineTrackIds = state.timelineTrackIds.filter((entityId, index, list) =>
            list.indexOf(entityId) === index && Boolean(entityById(entityId)));

        state.timelineTrackIds.forEach((entityId) => {
            const entity = entityById(entityId);
            if (!entity) return;
            if (!DEFAULT_TRACK_IDS.includes(entityId)) {
                const label = document.createElement("button");
                label.className = "track-label";
                label.type = "button";
                label.dataset.trackLabel = entityId;
                label.dataset.dynamicTrack = "true";
                label.innerHTML = `
                    <span class="track-icon ${trackColorClass(entity)}">${entityIcon(entity.type)}</span>
                    <strong>${escapeHtml(entity.name)}</strong>
                    <small>Transform</small>`;
                labels.appendChild(label);

                const row = document.createElement("div");
                row.className = "track-row";
                row.dataset.track = entityId;
                row.dataset.dynamicTrack = "true";
                content.appendChild(row);
            }
        });

        const clipDefinitions = timelineClipDefinitions();
        $$(".timeline-clip", content).forEach((node) => node.remove());
        state.timelineTrackIds.forEach((entityId) => {
            const row = $(`.track-row[data-track="${entityId}"]`, content);
            if (!row) return;
            (clipDefinitions[entityId] || []).forEach((definition) => {
                if (definition.start >= state.duration || definition.duration <= 0) return;
                const clip = document.createElement("button");
                clip.className = `timeline-clip ${definition.className}`;
                clip.type = "button";
                clip.dataset.clipId = definition.id;
                clip.dataset.start = String(definition.start);
                clip.dataset.duration = String(Math.min(definition.duration, state.duration - definition.start));
                clip.style.setProperty("--start", `${definition.start / state.duration * 100}%`);
                clip.style.setProperty("--width", `${Math.min(definition.duration, state.duration - definition.start) / state.duration * 100}%`);
                clip.innerHTML = `<b>${escapeHtml(definition.icon)}</b> ${escapeHtml(definition.label)}`;
                bindTimelineClip(clip);
                row.appendChild(clip);
            });
            const count = (clipDefinitions[entityId] || []).length;
            const labelMeta = $(`[data-track-label="${entityId}"] small`, labels);
            if (labelMeta) labelMeta.textContent = `${count} clip${count === 1 ? "" : "s"}`;
        });

        $$("[data-track-label]", labels).forEach((label) => {
            label.classList.toggle("is-selected", label.dataset.trackLabel === state.selectedId);
        });

        $$(".timeline-keyframe", content).forEach((node) => node.remove());
        state.timelineTrackIds.forEach((entityId) => {
            const row = $(`.track-row[data-track="${entityId}"]`, content);
            if (!row) return;

            generatedTransformMarkerTimes(entityId)
                .filter((time) => time <= state.duration)
                .forEach((time) => {
                const marker = createKeyframeMarker(entityId, {
                    id: `generated_${entityId}_${time}`,
                    time
                }, true);
                row.appendChild(marker);
            });

            (state.keyframes[entityId] || []).forEach((keyframe) => {
                row.appendChild(createKeyframeMarker(entityId, keyframe, false));
            });
        });

        $("#deleteKeyframeButton").disabled = !state.selectedKeyframe;
    }

    function generatedTransformMarkerTimes(entityId) {
        if (Array.isArray(state.actions)) {
            return [...new Set(actionsForEntity(entityId).flatMap((action) => [
                Math.round(Number(action.start || 0) * 1000) / 1000,
                Math.round((Number(action.start || 0) + Number(action.duration || 0)) * 1000) / 1000
            ]))].sort((a, b) => a - b);
        }
        if (entityId !== "entity_john") return GENERATED_TRANSFORM_MARKERS[entityId] || [];
        const timing = motionTiming();
        const markers = [
            0,
            timing.standStart,
            timing.standStart + timing.standDuration,
            timing.walkStart,
            timing.walkEnd,
            timing.exitStart,
            timing.exitStart + timing.exitDuration
        ];
        if (state.motionPlan?.stepDirection) {
            markers.push(timing.stepStart, timing.stepStart + timing.stepDuration);
        }
        if (state.motionPlan?.duck) {
            markers.push(
                timing.duckStart,
                timing.duckStart + timing.duckDuration * 0.3,
                timing.duckStart + timing.duckDuration * 0.7,
                timing.duckStart + timing.duckDuration
            );
        }
        return [...new Set(markers.map((time) => Math.round(time * 1000) / 1000))]
            .sort((a, b) => a - b);
    }

    function trackColorClass(entity) {
        if (entity.type === "camera") return "yellow";
        if (entity.type === "door") return "green";
        if (entity.type === "robot") return "blue";
        return "red";
    }

    function createKeyframeMarker(entityId, keyframe, generated) {
        const marker = document.createElement("button");
        marker.className = `timeline-keyframe${generated ? " is-generated" : ""}`;
        marker.type = "button";
        marker.style.setProperty("--keyframe-left", `${keyframe.time / state.duration * 100}%`);
        marker.dataset.entityId = entityId;
        marker.dataset.keyframeId = keyframe.id;
        marker.dataset.time = keyframe.time;
        marker.title = generated
            ? `Generated motion point · ${keyframe.time.toFixed(2)}s`
            : `Transform keyframe · ${keyframe.time.toFixed(2)}s`;
        if (!generated &&
            state.selectedKeyframe?.entityId === entityId &&
            state.selectedKeyframe?.keyframeId === keyframe.id) {
            marker.classList.add("is-selected");
        }
        marker.addEventListener("pointerdown", (event) => event.stopPropagation());
        marker.addEventListener("click", (event) => {
            event.stopPropagation();
            setPlaying(false);
            selectEntity(entityId, false);
            updateAtTime(Number(keyframe.time));
            state.selectedKeyframe = generated
                ? null
                : { entityId, keyframeId: keyframe.id };
            renderTimelineTracks();
        });
        return marker;
    }

    function addTransformKeyframe() {
        const entity = entityById(state.selectedId);
        const object = evaluatedObjectForEntity(state.selectedId);
        if (!entity || !object) {
            toast("Select an entity before adding a keyframe");
            return;
        }

        pushHistory();
        ensureEntityTrack(entity.id, true);
        const snappedTime = state.snap ? Math.round(state.time * 4) / 4 : state.time;
        const frames = state.keyframes[entity.id] || [];
        const existing = frames.find((frame) => Math.abs(frame.time - snappedTime) < 0.02);
        const transform = {
            position: object.position.toArray(),
            rotation: [object.rotation.x, object.rotation.y, object.rotation.z],
            scale: object.scale.toArray()
        };

        if (existing) {
            existing.transform = transform;
            existing.interpolation = existing.interpolation || "smooth";
            state.selectedKeyframe = { entityId: entity.id, keyframeId: existing.id };
            toast(`Updated ${entity.name} keyframe at ${snappedTime.toFixed(2)}s`);
        } else {
            const keyframe = {
                id: uniqueId("keyframe"),
                time: snappedTime,
                interpolation: "smooth",
                transform
            };
            frames.push(keyframe);
            frames.sort((a, b) => a.time - b.time);
            state.keyframes[entity.id] = frames;
            state.selectedKeyframe = { entityId: entity.id, keyframeId: keyframe.id };
            toast(`Added ${entity.name} keyframe at ${snappedTime.toFixed(2)}s`);
        }

        renderTimelineTracks();
        runtime.pendingPoseEntityId = null;
        $("#addKeyframeButton").classList.remove("is-attention");
        markDirty();
        updateAtTime(state.time);
    }

    function deleteSelectedKeyframe() {
        const selected = state.selectedKeyframe;
        if (!selected) {
            toast("Select a keyframe diamond first");
            return;
        }
        const frames = state.keyframes[selected.entityId] || [];
        const keyframe = frames.find((frame) => frame.id === selected.keyframeId);
        if (!keyframe) return;
        pushHistory();
        state.keyframes[selected.entityId] = frames.filter((frame) => frame.id !== selected.keyframeId);
        state.selectedKeyframe = null;
        renderTimelineTracks();
        updateAtTime(state.time);
        markDirty();
        toast(`Deleted keyframe at ${keyframe.time.toFixed(2)}s`);
    }

    function setupClipDrag(clip) {
        let startX = 0;
        let originalStart = 0;
        const move = (event) => {
            const contentWidth = $("#timelineContent").getBoundingClientRect().width;
            const deltaSeconds = (event.clientX - startX) / contentWidth * state.duration;
            let newStart = clamp(originalStart + deltaSeconds, 0, state.duration - Number(clip.dataset.duration || 0));
            if (state.snap) newStart = Math.round(newStart * 4) / 4;
            clip.dataset.start = newStart;
            clip.style.setProperty("--start", `${newStart / state.duration * 100}%`);
        };
        const up = () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
            markDirty();
        };
        clip.addEventListener("pointerdown", (event) => {
            event.stopPropagation();
            startX = event.clientX;
            originalStart = Number(clip.dataset.start);
            clip.setPointerCapture?.(event.pointerId);
            window.addEventListener("pointermove", move);
            window.addEventListener("pointerup", up);
        });
    }

    function updateTimelineUI() {
        const ratio = state.time / state.duration;
        $("#playhead").style.left = `${ratio * 100}%`;
        $("#currentTimecode").textContent = formatTimecode(state.time);
        $("#durationTimecode").textContent = formatTimecode(state.duration);
    }

    function formatTimecode(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const frames = Math.floor((seconds % 1) * 24);
        return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}:${String(frames).padStart(2, "0")}`;
    }

    function setPlaying(value) {
        state.isPlaying = value;
        if (value && state.time >= state.duration) state.time = 0;
        $("#playIcon").textContent = value ? "Ⅱ" : "▶";
        $("#playButton").title = value ? "Pause" : "Play";
        if (runtime.controls) runtime.controls.enabled = !value;
    }

    function updateEnvironmentColors() {
        if (!runtime.scene) return;
        runtime.scene.background.set(state.environment.monochrome ? "#30332F" : state.environment.background);
        runtime.scene.fog.color.copy(runtime.scene.background);
        if (runtime.room) {
            runtime.room.traverse((child) => {
                if (!child.isMesh || !child.material?.color) return;
                if (!child.userData.originalColor) child.userData.originalColor = `#${child.material.color.getHexString()}`;
                if (state.environment.monochrome) {
                    const original = new THREE.Color(child.userData.originalColor);
                    const gray = original.r * 0.299 + original.g * 0.587 + original.b * 0.114;
                    child.material.color.setRGB(gray, gray, gray);
                } else {
                    child.material.color.set(child.userData.originalColor);
                }
            });
        }
        runtime.objects.forEach((object) => {
            object.traverse((child) => {
                if (!child.isMesh || !child.material?.color) return;
                if (!child.userData.originalColor) child.userData.originalColor = `#${child.material.color.getHexString()}`;
                if (state.environment.monochrome) {
                    const original = new THREE.Color(child.userData.originalColor);
                    const gray = original.r * 0.299 + original.g * 0.587 + original.b * 0.114;
                    child.material.color.setRGB(gray, gray, gray);
                } else {
                    child.material.color.set(child.userData.originalColor);
                }
            });
        });
    }

    function uniqueId(prefix) {
        return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    }

    function stableHash(value) {
        let first = 0x811c9dc5;
        let second = 0x9e3779b9;
        for (let index = 0; index < value.length; index++) {
            const code = value.charCodeAt(index);
            first = Math.imul(first ^ code, 0x01000193);
            second = Math.imul(second ^ code, 0x85ebca6b);
        }
        return `${(first >>> 0).toString(16).padStart(8, "0")}${(second >>> 0).toString(16).padStart(8, "0")}`;
    }

    function addPrimitive(kind = "box", options = {}, recordHistory = true) {
        if (recordHistory) pushHistory();
        const entity = {
            id: options.id || uniqueId(`entity_${kind}`),
            name: options.name || (kind === "sphere" ? "New Sphere" : "New Cube"),
            type: kind,
            subtype: "Procedural primitive",
            assetId: `primitive_${kind}`,
            color: options.color || "#718DDB",
            position: options.position || [0.2, 0, 2],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
            visible: true,
            role: "prop",
            capabilities: ["Movable"],
            roughness: 0.72,
            metalness: 0.02
        };
        state.entities.push(entity);
        const object = createEntityObject(entity);
        runtime.objects.set(entity.id, object);
        runtime.scene.add(object);
        renderSceneTree();
        selectEntity(entity.id);
        $("#objectCount").textContent = `${state.entities.length} objects`;
        markDirty();
        toast(`${entity.name} added as a structured entity`);
        return entity;
    }

    function addAsset(kind) {
        if (kind === "box") return addPrimitive("box");
        pushHistory();
        const index = state.entities.filter((entity) => entity.type === kind).length + 1;
        const templates = {
            character: { name: `Character ${index}`, type: "character", subtype: "Humanoid character", assetId: "character_minimal_01", color: "#D99A55", capabilities: ["Locomotion", "Speakable", "LookAt"] },
            desk: { name: `Desk ${index}`, type: "desk", subtype: "Furniture", assetId: "prop_desk_01", color: "#8E6040", capabilities: ["SurfaceProvider"] },
            chair: { name: `Chair ${index}`, type: "chair", subtype: "Seat provider", assetId: "prop_chair_01", color: "#5E716A", capabilities: ["SeatProvider"] }
        };
        const template = templates[kind];
        if (!template) return;
        const entity = {
            id: uniqueId(`entity_${kind}`),
            ...template,
            position: [0, 0, 2],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
            visible: true,
            role: "prop",
            roughness: 0.8,
            metalness: 0
        };
        state.entities.push(entity);
        const object = createEntityObject(entity);
        runtime.objects.set(entity.id, object);
        runtime.scene.add(object);
        renderSceneTree();
        selectEntity(entity.id);
        $("#objectCount").textContent = `${state.entities.length} objects`;
        markDirty();
        toast(`${entity.name} added from the asset library`);
    }

    function duplicateSelected() {
        const source = entityById(state.selectedId);
        if (!source) return;
        pushHistory();
        const entity = cloneData(source);
        entity.id = uniqueId(source.type);
        entity.name = `${source.name} copy`;
        entity.position[0] += 0.65;
        entity.position[2] += 0.45;
        state.entities.push(entity);
        const object = createEntityObject(entity);
        runtime.objects.set(entity.id, object);
        runtime.scene.add(object);
        renderSceneTree();
        selectEntity(entity.id);
        $("#objectCount").textContent = `${state.entities.length} objects`;
        markDirty();
        toast(`${source.name} duplicated`);
    }

    function deleteSelected() {
        const index = state.entities.findIndex((entity) => entity.id === state.selectedId);
        if (index < 0) return;
        if (["camera_main", "light_key"].includes(state.selectedId)) {
            toast("The primary camera and light are required by this scene");
            return;
        }
        pushHistory();
        const [removed] = state.entities.splice(index, 1);
        const object = runtime.objects.get(removed.id);
        if (object) runtime.scene.remove(object);
        runtime.objects.delete(removed.id);
        state.timelineTrackIds = state.timelineTrackIds.filter((entityId) => entityId !== removed.id);
        delete state.keyframes[removed.id];
        if (state.selectedKeyframe?.entityId === removed.id) state.selectedKeyframe = null;
        state.selectedId = state.entities[0]?.id || null;
        renderSceneTree();
        renderTimelineTracks();
        if (state.selectedId) selectEntity(state.selectedId, false);
        else runtime.selectionBox.visible = false;
        $("#objectCount").textContent = `${state.entities.length} objects`;
        markDirty();
        toast(`${removed.name} removed`);
    }

    async function saveProject() {
        state.projectName = $("#projectName").value.trim() || "Untitled scene";
        const documentData = sceneDocument();
        try {
            const response = await fetch(`/api/3d-animation/projects/${PROJECT_ID}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(documentData)
            });
            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.message || `Save failed (${response.status})`);
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(documentData));
            markSaved();
            toast("Project saved to the server · version history updated");
        } catch (error) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(documentData));
                markSaved();
                toast(`Server save unavailable · kept a local copy (${error.message})`);
            } catch {
                toast(`Project could not be saved · ${error.message}`);
            }
        }
    }

    function applyStoredDocument(documentData) {
        if (!documentData?.entities?.length) return false;
        state.projectName = documentData.scene?.name || state.projectName;
        state.duration = documentData.scene?.duration || DURATION;
        state.environment = documentData.environment || state.environment;
        state.entities = documentData.entities;
        state.motionPlan = documentData.motionPlan || cloneData(DEFAULT_MOTION_PLAN);
        state.actions = Array.isArray(documentData.actions)
            ? documentData.actions
            : cloneData(DEFAULT_ACTIONS);
        state.promptHistory = Array.isArray(documentData.promptHistory)
            ? documentData.promptHistory
            : [];
        state.currentPrompt = documentData.currentPrompt ||
            state.promptHistory[state.promptHistory.length - 1]?.prompt ||
            DEFAULT_PROMPT;
        state.currentPromptHistoryId = [...state.promptHistory]
            .reverse()
            .find((entry) => entry.prompt === state.currentPrompt)?.id || null;
        const storedTracks = Array.isArray(documentData.timeline?.tracks)
            ? documentData.timeline.tracks
            : [];
        state.timelineTrackIds = [...new Set([
            ...DEFAULT_TRACK_IDS,
            ...storedTracks.map((track) => track.entityId).filter(Boolean)
        ])].filter((entityId) => state.entities.some((entity) => entity.id === entityId));
        state.keyframes = {};
        storedTracks.forEach((track) => {
            if (!track.entityId || !Array.isArray(track.keyframes) || !track.keyframes.length) return;
            state.keyframes[track.entityId] = track.keyframes
                .filter((keyframe) => keyframe?.transform)
                .map((keyframe) => ({
                    id: keyframe.id || uniqueId("keyframe"),
                    time: Number(keyframe.time) || 0,
                    interpolation: keyframe.interpolation || "smooth",
                    transform: keyframe.transform
                }))
                .sort((a, b) => a.time - b.time);
        });
        state.selectedKeyframe = null;
        $("#projectName").value = state.projectName;
        return true;
    }

    async function loadSavedProject() {
        try {
            const response = await fetch(`/api/3d-animation/projects/${PROJECT_ID}`, {
                headers: { "Accept": "application/json" },
                cache: "no-store"
            });
            if (response.ok) {
                const documentData = await response.json();
                if (applyStoredDocument(documentData)) {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(documentData));
                    return;
                }
            }
        } catch {
            // The editor remains usable offline through the local backup.
        }

        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const documentData = JSON.parse(raw);
            applyStoredDocument(documentData);
        } catch {
            localStorage.removeItem(STORAGE_KEY);
        }
    }

    async function importFiles(files) {
        const file = Array.from(files || []).find((item) => /\.(glb|gltf)$/i.test(item.name));
        if (!file) {
            toast("Choose a .glb or .gltf asset");
            return;
        }
        if (!THREE.GLTFLoader) {
            toast("The GLB loader is unavailable");
            return;
        }
        const status = $("#patchStatus");
        status.classList.add("is-working");
        status.innerHTML = "<i></i> Uploading asset…";

        let persistedAsset = null;
        try {
            const form = new FormData();
            form.append("file", file, file.name);
            const response = await fetch("/api/3d-animation/assets", {
                method: "POST",
                body: form
            });
            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.message || `Upload failed (${response.status})`);
            }
            persistedAsset = await response.json();
            status.innerHTML = "<i></i> Inspecting asset…";
        } catch (error) {
            toast(`Asset server unavailable · importing for this session only (${error.message})`);
        }

        const url = URL.createObjectURL(file);
        const loader = new THREE.GLTFLoader();
        loader.load(url, (gltf) => {
            URL.revokeObjectURL(url);
            pushHistory();
            const assetId = persistedAsset?.assetId || uniqueId("asset_imported");
            runtime.importedTemplates.set(assetId, gltf.scene);
            const entity = {
                id: uniqueId("entity_imported"),
                name: file.name.replace(/\.(glb|gltf)$/i, ""),
                type: "imported",
                subtype: "Imported 3D asset",
                assetId,
                color: "#B0B6B1",
                position: [0, 0, 2],
                rotation: [0, 0, 0],
                scale: [1, 1, 1],
                visible: true,
                role: "unclassified",
                capabilities: ["Movable"],
                roughness: 0.75,
                metalness: 0,
                metadata: {
                    sourceName: file.name,
                    sourceUri: persistedAsset?.uri || null,
                    manifest: persistedAsset?.manifest || null,
                    animations: gltf.animations?.map((clip) => ({ name: clip.name, duration: clip.duration })) || []
                }
            };
            state.entities.push(entity);
            const object = createEntityObject(entity);
            runtime.objects.set(entity.id, object);
            runtime.scene.add(object);
            renderSceneTree();
            selectEntity(entity.id);
            $("#objectCount").textContent = `${state.entities.length} objects`;
            status.classList.remove("is-working");
            status.innerHTML = "<i></i> Asset is valid";
            markDirty();
            toast(`${file.name} imported · ${gltf.animations?.length || 0} animation clips`);
            openAssetWizard(entity);
        }, undefined, () => {
            URL.revokeObjectURL(url);
            status.classList.remove("is-working");
            status.innerHTML = "<i></i> Scene is valid";
            toast(`Could not parse ${file.name}`);
        });
    }

    function openAssetWizard(entity) {
        runtime.pendingWizardEntityId = entity.id;
        $("#assetClassification").value = entity.role === "unclassified" ? "prop" : entity.role;
        $("#assetForwardAxis").value = entity.metadata?.forwardAxis || "-Z";
        $("#assetWorldScale").value = entity.scale?.[0] || 1;
        $("#assetAnchors").value = (entity.metadata?.anchors || []).join(", ");
        $$('#assetWizardModal input[type="checkbox"]').forEach((input) => {
            input.checked = (entity.capabilities || []).includes(input.value);
        });
        $("#assetWizardModal").classList.add("is-open");
        $("#assetWizardModal").setAttribute("aria-hidden", "false");
    }

    function closeAssetWizard() {
        $("#assetWizardModal").classList.remove("is-open");
        $("#assetWizardModal").setAttribute("aria-hidden", "true");
        runtime.pendingWizardEntityId = null;
    }

    function saveAssetConfiguration() {
        const entity = entityById(runtime.pendingWizardEntityId);
        if (!entity) {
            closeAssetWizard();
            return;
        }
        pushHistory();
        const classification = $("#assetClassification").value;
        const scale = clamp(Number($("#assetWorldScale").value) || 1, 0.01, 100);
        const capabilities = $$('#assetWizardModal input[type="checkbox"]:checked').map((input) => input.value);
        entity.role = classification;
        entity.subtype = `${classification.charAt(0).toUpperCase()}${classification.slice(1)} · imported`;
        entity.scale = [scale, scale, scale];
        entity.capabilities = capabilities;
        entity.metadata = {
            ...(entity.metadata || {}),
            forwardAxis: $("#assetForwardAxis").value,
            anchors: $("#assetAnchors").value
                .split(",")
                .map((anchor) => anchor.trim())
                .filter(Boolean)
        };
        const object = runtime.objects.get(entity.id);
        if (object) object.scale.setScalar(scale);
        updateInspector(entity);
        runtime.selectionBox?.update();
        markDirty();
        closeAssetWizard();
        toast(`${entity.name} configured as ${classification} · ${capabilities.length} capabilities`);
    }

    function fallbackPlan(prompt, previousPrompt = "") {
        const normalized = prompt.replaceAll("**", "").toLowerCase();
        const normalizedPrevious = previousPrompt.replaceAll("**", "").toLowerCase();
        const inputHash = stableHash(`offline-action-planner-v2\n${normalizedPrevious}\n${normalized}\n${JSON.stringify(plannerSceneDocument())}`);
        if (normalized.trim() === normalizedPrevious.trim() && normalizedPrevious.trim()) {
            return {
                patchId: `patch_${inputHash}`,
                operations: [],
                warnings: ["The prompt is unchanged from the latest applied version."],
                changes: [],
                planner: "offline-action-planner-v2"
            };
        }

        const operations = [];
        const actions = [];
        if (normalized.includes("monochrome") || normalized.includes("black and white") || normalized.includes("grayscale")) {
            operations.push({ op: "updateStyle", style: "monochrome" });
        }

        if (normalized.includes("box") || normalized.includes("cube") || normalized.includes("sphere")) {
            let entity = state.entities.find((candidate) =>
                normalized.includes(candidate.name.toLowerCase()) ||
                (candidate.type === "box" && (normalized.includes("box") || normalized.includes("cube"))) ||
                (candidate.type === "sphere" && normalized.includes("sphere")));
            const primitive = normalized.includes("sphere") ? "sphere" : "box";
            const groundY = 0.5;
            const startPosition = normalized.includes("left bottom") || normalized.includes("bottom left")
                ? [-3, groundY, 0]
                : [0, groundY, 0];
            if (!entity) {
                const entityId = `entity_generated_${inputHash}_00`;
                entity = {
                    id: entityId,
                    name: `${normalized.includes("blue") ? "Blue " : ""}${primitive === "box" ? "Box" : "Sphere"}`,
                    type: primitive,
                    position: startPosition,
                    rotation: [0, 0, 0],
                    scale: [1, 1, 1]
                };
                operations.push({
                    op: "addPrimitive",
                    entityId,
                    primitive,
                    name: entity.name,
                    color: normalized.includes("green") ? "#5B9A68" : normalized.includes("red box") ? "#D85A4F" : "#5E80D5",
                    position: startPosition
                });
            }
            actions.push({ type: "place", entityId: entity.id, start: 0, duration: 0, from: entity.position, to: startPosition });
            const duration = Number(normalized.match(/(?:over|for)\s+(\d+(?:\.\d+)?)\s*s/)?.[1] || 1);
            let cursor = 0;
            let position = [...startPosition];
            if (normalized.includes("move")) {
                const to = [...position];
                if (normalized.includes("right")) to[0] = normalized.includes("screen") ? 3 : to[0] + 1;
                if (normalized.includes("left")) to[0] -= 1;
                if (normalized.includes("up")) to[1] += normalized.includes("half") ? 2.5 : 1;
                if (normalized.includes("down")) to[1] -= 1;
                actions.push({ type: "moveTo", entityId: entity.id, start: cursor, duration, from: position, to });
                position = to;
                cursor += duration;
            }
            const finalColor = normalized.match(/(?:turns?|turning|becomes?)\s+(red|blue|green|yellow)/)?.[1];
            if (finalColor) {
                const colors = { red: "#D85A4F", blue: "#5E80D5", green: "#5B9A68", yellow: "#D6A954" };
                actions.push({ type: "setColor", entityId: entity.id, start: cursor, duration: 0, color: colors[finalColor], colorName: finalColor });
            }
            if (normalized.includes("fall")) {
                actions.push({
                    type: "fallToGround",
                    entityId: entity.id,
                    start: cursor,
                    duration: 1.25,
                    from: position,
                    to: [position[0], groundY, position[2]],
                    easing: "gravity"
                });
            }
        } else if (normalized.includes("john")) {
            const john = entityById("entity_john");
            const door = state.entities.find((entity) => entity.type === "door");
            let cursor = 1.1;
            let position = [...john.position];
            const dialogue = prompt.match(/(?:says?|speaks?)\s+[“"']([^”"']+)[”"']/i);
            if (dialogue || normalized.includes("say")) {
                actions.push({ type: "speak", entityId: john.id, start: cursor, duration: 2.7, text: dialogue?.[1] || "We need to leave." });
                cursor = 4;
            }
            if (normalized.includes("stand")) {
                actions.push({ type: "stand", entityId: john.id, start: cursor, duration: 1.2 });
                cursor += 1.2;
            }
            if ((normalized.includes("step") || normalized.includes("move")) && (normalized.includes("left") || normalized.includes("right"))) {
                const to = [...position];
                to[0] += normalized.includes("left") ? -0.65 : 0.65;
                actions.push({ type: "moveTo", entityId: john.id, start: cursor, duration: 0.9, from: position, to, locomotion: "walk" });
                position = to;
                cursor += 0.9;
            }
            if (normalized.includes("duck") || normalized.includes("crouch")) {
                actions.push({ type: "duck", entityId: john.id, start: cursor, duration: 1.15 });
                cursor += 1.15;
            }
            let walkStart = cursor;
            if (normalized.includes("walk") && door) {
                const to = [door.position[0] - 0.7, position[1], door.position[2] + 0.14];
                actions.push({ type: "moveTo", entityId: john.id, start: cursor, duration: 3.2, from: position, to, locomotion: "walk", targetId: door.id });
                position = to;
                cursor += 3.2;
            }
            if (normalized.includes("open") && door) {
                actions.push({ type: "open", entityId: door.id, start: cursor - 0.25, duration: 1.2, actorId: john.id });
                cursor += 0.75;
            }
            if ((normalized.includes("exit") || normalized.includes("leave")) && door) {
                const to = [door.position[0] + 1.1, position[1], door.position[2] + 0.14];
                actions.push({ type: "moveTo", entityId: john.id, start: cursor, duration: 2.2, from: position, to, locomotion: "walk" });
                cursor += 2.2;
            }
            if (normalized.includes("camera") && normalized.includes("follow")) {
                actions.push({ type: "cameraFollow", entityId: "camera_main", targetId: john.id, start: walkStart, duration: Math.max(1, cursor - walkStart) });
            }
        }

        actions.forEach((action, index) => {
            action.id = `action_${inputHash}_${String(index).padStart(2, "0")}`;
        });
        if (actions.length) operations.push({ op: "setActionPlan", actions });
        return {
            patchId: `patch_${inputHash}`,
            operations,
            warnings: actions.length || operations.length ? [] : ["No supported action could be compiled."],
            changes: [{ changeType: "updated", text: prompt, verbs: [], nouns: [], intent: "action-plan" }],
            planner: "offline-action-planner-v2"
        };
    }

    function applyScenePatch(operations) {
        operations.forEach((operation) => {
            switch (operation.op) {
                case "updateCamera": {
                    state.cameraCloser = operation.framing === "closer" || state.cameraCloser;
                    if (operation.framing === "closer" && runtime.camera) {
                        runtime.camera.position.lerp(new THREE.Vector3(4.6, 3.35, 5.7), 0.8);
                        runtime.controls?.target.set(-0.2, 1, 0.2);
                    }
                    break;
                }
                case "updateStyle":
                    state.environment.monochrome = operation.style === "monochrome";
                    updateEnvironmentColors();
                    break;
                case "addPrimitive":
                    if (operation.entityId && entityById(operation.entityId)) {
                        selectEntity(operation.entityId);
                        break;
                    }
                    addPrimitive(operation.primitive || "box", {
                        id: operation.entityId,
                        name: operation.name,
                        color: operation.color,
                        position: operation.position || [0.25, 0.5, 2.1]
                    }, false);
                    break;
                case "removeEntity": {
                    const index = state.entities.findIndex((entity) => entity.id === operation.entityId);
                    if (index < 0 || ["camera_main", "light_key"].includes(operation.entityId)) break;
                    const [removed] = state.entities.splice(index, 1);
                    const object = runtime.objects.get(removed.id);
                    if (object) runtime.scene.remove(object);
                    runtime.objects.delete(removed.id);
                    state.timelineTrackIds = state.timelineTrackIds.filter((entityId) => entityId !== removed.id);
                    delete state.keyframes[removed.id];
                    if (state.selectedId === removed.id) state.selectedId = state.entities[0]?.id || null;
                    renderSceneTree();
                    break;
                }
                case "updateEntity": {
                    const entity = entityById(operation.entityId);
                    if (!entity || !operation.properties) break;
                    Object.assign(entity, cloneData(operation.properties));
                    const object = runtime.objects.get(entity.id);
                    if (object) {
                        if (entity.position) object.position.set(...entity.position);
                        if (entity.rotation) object.rotation.set(...entity.rotation);
                        if (entity.scale) object.scale.set(...entity.scale);
                    }
                    renderSceneTree();
                    break;
                }
                case "updateClip": {
                    if (operation.clipId === "john_walk" && operation.speedMultiplier) {
                        const clip = $('.timeline-clip[data-start="5.6"]');
                        if (clip) {
                            const duration = 3.9 / operation.speedMultiplier;
                            clip.dataset.duration = String(duration);
                            clip.style.setProperty("--width", `${duration / state.duration * 100}%`);
                        }
                    }
                    break;
                }
                case "configureCharacterSequence":
                    state.motionPlan = {
                        entityId: operation.entityId || "entity_john",
                        speak: operation.speak !== false,
                        speakText: operation.speakText || DEFAULT_MOTION_PLAN.speakText,
                        stepDirection: clamp(Number(operation.stepDirection || 0), -1, 1),
                        duck: Boolean(operation.duck),
                        walkToDoor: Boolean(operation.walkToDoor),
                        openDoor: Boolean(operation.openDoor),
                        followCamera: Boolean(operation.followCamera)
                    };
                    ensureEntityTrack(state.motionPlan.entityId, false);
                    break;
                case "setActionPlan": {
                    state.actions = normalizeActionPlan(operation.actions || []);
                    state.timelineTrackIds = [...new Set([
                        ...DEFAULT_TRACK_IDS,
                        ...state.actions.map((action) => action.entityId).filter(Boolean)
                    ])].filter((entityId) => Boolean(entityById(entityId)));
                    const planEnd = state.actions.reduce((end, action) =>
                        Math.max(end, Number(action.start || 0) + Number(action.duration || 0)), 0);
                    state.duration = clamp(Math.max(DURATION, planEnd + 0.5), 2, 120);
                    state.time = Math.min(state.time, state.duration);
                    renderTimelineRuler();
                    break;
                }
                case "trimTimeline":
                    state.duration = clamp(Number(operation.end), 2, DURATION);
                    state.time = Math.min(state.time, state.duration);
                    break;
                case "addClip":
                    // The prototype timeline already exposes the vertical-slice clips.
                    // The operation remains persisted in the canonical scene document.
                    break;
                case "setKeyframe": {
                    const entity = entityById(operation.entityId);
                    if (!entity) break;
                    const frames = state.keyframes[entity.id] || (state.keyframes[entity.id] = []);
                    frames.push({
                        id: operation.keyframeId || uniqueId("keyframe"),
                        time: clamp(Number(operation.time) || 0, 0, state.duration),
                        interpolation: operation.interpolation || "smooth",
                        transform: cloneData(operation.transform || {
                            position: entity.position,
                            rotation: entity.rotation,
                            scale: entity.scale
                        })
                    });
                    frames.sort((a, b) => a.time - b.time);
                    break;
                }
            }
        });
        renderTimelineTracks();
        updateAtTime(state.time);
    }

    function updateModelLoadingProgress(progress) {
        const loading = window.SceneScriptLoading;
        const ratio = progress.total ? clamp(progress.loaded / progress.total, 0, 1) : 0;
        const megabytes = (value) => `${(Number(value || 0) / 1024 / 1024).toFixed(1)} MB`;
        const modelStatus = $("#animationModelStatus");
        const previouslyLoaded = Boolean(localStorage.getItem(MODEL_CACHE_KEY));

        if (progress.phase === "loading-runtime") {
            const detail = progress.total
                ? `${progress.cached ? "Reading cached engine" : "Downloading inference engine"} · ${megabytes(progress.loaded)} / ${megabytes(progress.total)}`
                : "Starting the local inference worker";
            if (modelStatus) {
                const percent = progress.total ? Math.round(ratio * 100) : 0;
                modelStatus.textContent = progress.cached
                    ? `Loading cached model · ${percent}%`
                    : progress.total
                        ? `Downloading local model · ${percent}%`
                        : "Starting local model…";
                modelStatus.title = `${detail}. The editor remains usable while this finishes.`;
            }
            loading?.note(progress.cached || previouslyLoaded
                ? "The inference engine was found in this browser's cache; no server processing is used."
                : "First load only: about 13.5 MB is downloaded and cached in this browser. Future visits should be much faster.");
        } else if (progress.phase === "loading-model") {
            if (modelStatus) modelStatus.textContent = progress.cached ? "Loading cached vocabulary…" : "Loading animation vocabulary…";
        } else if (progress.phase === "initializing-model") {
            if (modelStatus) modelStatus.textContent = "Starting local inference…";
        } else if (progress.phase === "ready") {
            if (modelStatus) modelStatus.textContent = `ONNX intent model · ${String(progress.backend || "WASM").toUpperCase()}`;
        } else if (progress.phase === "error") {
            if (modelStatus) modelStatus.textContent = "Deterministic planner fallback";
            loading?.note("The local model could not start; the deterministic command parser will remain available.");
        }
    }

    async function initializeBrowserAnimationParser() {
        if (runtime.browserAnimationParser) return runtime.browserAnimationParser;
        if (runtime.animationParserInitialization) return runtime.animationParserInitialization;

        const modelStatus = $("#animationModelStatus");
        runtime.animationParserInitialization = (async () => {
            const parserModule = await import("/animation-parser/index.js");
            const parser = new parserModule.PlannerAnimationParser(
                new parserModule.BrowserAnimationParser({
                    baseUrl: "/animation-parser/",
                    onProgress: updateModelLoadingProgress
                })
            );
            let timeoutId;
            try {
                await Promise.race([
                    parser.initialize(),
                    new Promise((_, reject) => {
                        timeoutId = window.setTimeout(
                            () => reject(new Error("Local model initialization timed out after 45 seconds")),
                            45000
                        );
                    })
                ]);
            } catch (error) {
                parser.dispose();
                throw error;
            } finally {
                if (timeoutId) window.clearTimeout(timeoutId);
            }
            runtime.browserAnimationParser = parser;
            const progress = parser.getLoadProgress();
            if (modelStatus) {
                const backend = String(progress.backend || "local").toUpperCase();
                modelStatus.textContent = `ONNX intent model · ${backend}`;
                modelStatus.title = `${parser.getModelVersion()} running locally in this browser`;
            }
            localStorage.setItem(MODEL_CACHE_KEY, parser.getModelVersion());
            return parser;
        })().catch((error) => {
            runtime.animationParserInitialization = null;
            if (modelStatus) {
                modelStatus.textContent = "Deterministic planner fallback";
                modelStatus.title = error instanceof Error ? error.message : String(error);
            }
            throw error;
        });
        return runtime.animationParserInitialization;
    }

    async function generatePatch() {
        let prompt = getPromptText();
        if (!prompt) {
            prompt = DEFAULT_PROMPT;
            setPromptText(prompt);
        }
        state.currentPrompt = prompt;
        const previousPrompt =
            state.promptHistory.at(-1)?.prompt ||
            runtime.promptBaseline ||
            "";
        const status = $("#patchStatus");
        const button = $("#generateButton");
        status.classList.add("is-working");
        status.innerHTML = "<i></i> Translating prompt into motion…";
        button.disabled = true;

        try {
            const parserInput = {
                currentPrompt: prompt,
                previousPrompt,
                scene: plannerSceneDocument(),
                selectedEntityId: state.selectedId,
                actionCatalog: [
                    "place", "moveTo", "rotateBy", "scaleTo", "setColor",
                    "stand", "duck", "walk", "run", "jump", "idle",
                    "cameraFollow", "cameraLookAt", "open", "close",
                    "fallToGround", "keyframe"
                ].map((type) => ({ type }))
            };
            let plan;
            try {
                if (!runtime.browserAnimationParser) {
                    void initializeBrowserAnimationParser().catch(() => undefined);
                    throw new Error("Local model is still loading");
                }
                plan = await runtime.browserAnimationParser.parseToPlanner(parserInput);
            } catch (error) {
                try {
                    const parserModule = await import("/animation-parser/index.js");
                    const result = parserModule.parseAnimationPrompt(parserInput);
                    plan = parserModule.resolveToPlanner(result, parserInput.scene);
                    toast("Local model is still loading · deterministic parser used");
                } catch {
                    plan = fallbackPlan(prompt, previousPrompt);
                    toast(`Using deterministic fallback · ${error.message}`);
                }
            }

            const operations = plan.operations || [];
            const actionPlanOperation = operations.find((operation) =>
                operation.op === "setActionPlan");
            if (!operations.length) {
                const warnings = plan.warnings || [];
                status.classList.remove("is-working");
                status.innerHTML = `<i></i> ${plan.changes?.length ? "No executable actions found" : "Prompt is unchanged"}`;
                setPromptText(prompt, resolvePromptEntityLinks(prompt));
                if (!plan.changes?.length && state.actions?.length) {
                    updateAtTime(0);
                    setPlaying(true);
                }
                toast(warnings[0] || "No scene changes were generated");
                return;
            }
            pushHistory();
            applyScenePatch(operations);
            const entityLinks = resolvePromptEntityLinks(prompt, operations);
            addPromptHistoryVersion(prompt, plan, entityLinks);
            setPromptText(prompt, entityLinks);
            $$(".prompt-entity-link", $("#promptInput")).forEach((token, index) => {
                window.setTimeout(() => {
                    token.classList.add("is-link-pulse");
                    window.setTimeout(() => token.classList.remove("is-link-pulse"), 650);
                }, index * 80);
            });

            status.classList.remove("is-working");
            const warnings = plan.warnings?.length || 0;
            const changeCount = plan.changes?.length || 0;
            const actionCount = actionPlanOperation?.actions?.length || operations.length;
            status.innerHTML = `<i></i> Compiled ${actionCount} action${actionCount === 1 ? "" : "s"} from ${changeCount} prompt change${changeCount === 1 ? "" : "s"}`;
            markDirty();
            updateHistoryButtons();
            if (actionPlanOperation?.actions?.length) {
                updateAtTime(0);
                setPlaying(true);
            }
            toast(`Animation applied · ${entityLinks.length} entity phrase${entityLinks.length === 1 ? "" : "s"} linked · ${warnings} warning${warnings === 1 ? "" : "s"}`);
        } finally {
            button.disabled = false;
            status.classList.remove("is-working");
        }
    }

    function openExportModal() {
        $("#exportModal").classList.add("is-open");
        $("#exportModal").setAttribute("aria-hidden", "false");
    }

    function closeExportModal() {
        $("#exportModal").classList.remove("is-open");
        $("#exportModal").setAttribute("aria-hidden", "true");
    }

    function downloadBlob(name, blob) {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = name;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 500);
    }

    function exportScene() {
        const filename = `${slug(state.projectName)}.scene.json`;
        downloadBlob(filename, new Blob([JSON.stringify(sceneDocument(), null, 2)], { type: "application/json" }));
        closeExportModal();
        toast("Editable scene JSON exported");
    }

    function captureFrame() {
        if (!runtime.renderer) return;
        runtime.renderer.render(runtime.scene, runtime.camera);
        runtime.renderer.domElement.toBlob((blob) => {
            if (!blob) return;
            downloadBlob(`${slug(state.projectName)}-${state.time.toFixed(2)}s.png`, blob);
            closeExportModal();
            toast("Current frame exported as PNG");
        }, "image/png");
    }

    function supportedVideoType() {
        if (!window.MediaRecorder) return null;
        const candidates = [
            { type: "video/mp4;codecs=avc1.42E01E", extension: "mp4" },
            { type: "video/webm;codecs=vp9", extension: "webm" },
            { type: "video/webm;codecs=vp8", extension: "webm" },
            { type: "video/webm", extension: "webm" }
        ];
        return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate.type)) || null;
    }

    function exportVideo() {
        const videoType = supportedVideoType();
        const canvas = runtime.renderer?.domElement;
        if (!videoType || !canvas?.captureStream) {
            closeExportModal();
            toast("This browser cannot record the WebGL canvas");
            return;
        }

        const stream = canvas.captureStream(24);
        const recorder = new MediaRecorder(stream, {
            mimeType: videoType.type,
            videoBitsPerSecond: 8_000_000
        });
        const chunks = [];
        const previousTime = state.time;
        const previousPlaying = state.isPlaying;

        recorder.addEventListener("dataavailable", (event) => {
            if (event.data.size) chunks.push(event.data);
        });
        recorder.addEventListener("stop", () => {
            const blob = new Blob(chunks, { type: videoType.type });
            downloadBlob(`${slug(state.projectName)}.${videoType.extension}`, blob);
            stream.getTracks().forEach((track) => track.stop());
            updateAtTime(previousTime);
            setPlaying(previousPlaying);
            toast(`${videoType.extension.toUpperCase()} timeline render exported`);
        });

        closeExportModal();
        updateAtTime(0);
        setPlaying(true);
        recorder.start(1000);
        toast(`Rendering ${state.duration.toFixed(0)} seconds at 24 fps…`);

        const stopWhenComplete = () => {
            if (recorder.state === "inactive") return;
            if (!state.isPlaying || state.time >= state.duration) {
                recorder.stop();
                return;
            }
            requestAnimationFrame(stopWhenComplete);
        };
        requestAnimationFrame(stopWhenComplete);
    }

    function slug(value) {
        return String(value || "scene")
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");
    }

    function setupEvents() {
        $("#undoButton").addEventListener("click", undo);
        $("#redoButton").addEventListener("click", redo);
        $("#saveButton").addEventListener("click", saveProject);
        $("#exportButton").addEventListener("click", openExportModal);
        $("#playButton").addEventListener("click", () => setPlaying(!state.isPlaying));
        $("#jumpStartButton").addEventListener("click", () => { setPlaying(false); updateAtTime(0); });
        $("#jumpEndButton").addEventListener("click", () => { setPlaying(false); updateAtTime(state.duration); });
        $("#addTrackButton").addEventListener("click", () => {
            const entity = entityById(state.selectedId);
            if (!entity) {
                toast("Select an entity before adding a track");
                return;
            }
            if (state.timelineTrackIds.includes(entity.id)) {
                ensureEntityTrack(entity.id, true);
                toast(`${entity.name} already has a timeline track`);
                return;
            }
            pushHistory();
            ensureEntityTrack(entity.id, true);
            markDirty();
            toast(`Added a transform track for ${entity.name}`);
        });
        $("#addKeyframeButton").addEventListener("click", addTransformKeyframe);
        $("#deleteKeyframeButton").addEventListener("click", deleteSelectedKeyframe);
        $("#gridButton").addEventListener("click", (event) => {
            if (!runtime.grid) return;
            runtime.grid.visible = !runtime.grid.visible;
            event.currentTarget.classList.toggle("is-off", !runtime.grid.visible);
        });
        $("#viewModeButton").addEventListener("click", () => {
            if (!runtime.camera || !runtime.controls) return;
            runtime.camera.position.set(6.4, 4.5, 7.8);
            runtime.controls.target.set(0.4, 1, 0);
            toast("Perspective view reset");
        });
        $("#snapButton").addEventListener("click", (event) => {
            state.snap = !state.snap;
            event.currentTarget.classList.toggle("is-active", state.snap);
        });

        $$(".viewport-tool").forEach((button) => {
            button.addEventListener("click", () => {
                $$(".viewport-tool").forEach((item) => item.classList.remove("is-active"));
                button.classList.add("is-active");
                state.currentTool = button.dataset.tool;
                updateTransformGizmo();
                toast(`${button.dataset.tool[0].toUpperCase() + button.dataset.tool.slice(1)} tool active · edit values in the inspector`);
            });
        });

        $$(".panel-tab").forEach((tab) => {
            tab.addEventListener("click", () => activateLeftTab(tab.dataset.leftTab));
        });

        $("#addPrimitiveButton").addEventListener("click", () => addPrimitive("box"));
        $$("[data-add-asset]").forEach((button) => button.addEventListener("click", () => addAsset(button.dataset.addAsset)));
        $("#assetSearch").addEventListener("input", (event) => {
            const query = event.target.value.toLowerCase();
            $$(".asset-card").forEach((card) => {
                card.hidden = !card.textContent.toLowerCase().includes(query);
            });
        });

        const dropzone = $("#importDropzone");
        const fileInput = $("#assetUpload");
        fileInput.addEventListener("change", () => importFiles(fileInput.files));
        ["dragenter", "dragover"].forEach((eventName) => dropzone.addEventListener(eventName, (event) => {
            event.preventDefault();
            dropzone.classList.add("is-over");
        }));
        ["dragleave", "drop"].forEach((eventName) => dropzone.addEventListener(eventName, (event) => {
            event.preventDefault();
            dropzone.classList.remove("is-over");
        }));
        dropzone.addEventListener("drop", (event) => importFiles(event.dataTransfer.files));

        $("#entityName").addEventListener("change", (event) => {
            const entity = entityById(state.selectedId);
            if (!entity) return;
            pushHistory();
            entity.name = event.target.value.trim() || entity.name;
            renderSceneTree();
            updateInspector(entity);
            markDirty();
        });
        $("#entityRole").addEventListener("change", (event) => {
            const entity = entityById(state.selectedId);
            if (!entity) return;
            pushHistory();
            entity.role = event.target.value;
            markDirty();
        });
        $("#entityVisibleButton").addEventListener("click", () => toggleEntityVisibility());
        $("#moreButton").addEventListener("click", async () => {
            try {
                const response = await fetch(`/api/3d-animation/projects/${PROJECT_ID}/versions`, {
                    headers: { "Accept": "application/json" },
                    cache: "no-store"
                });
                if (!response.ok) throw new Error(`Request failed (${response.status})`);
                const versions = await response.json();
                if (!versions.length) {
                    toast("No earlier versions yet · save twice to create the first snapshot");
                    return;
                }
                const latest = new Date(versions[0].createdAt).toLocaleString();
                toast(`${versions.length} saved version${versions.length === 1 ? "" : "s"} · latest ${latest}`);
            } catch (error) {
                toast(`Version history is unavailable · ${error.message}`);
            }
        });
        $("#duplicateButton").addEventListener("click", duplicateSelected);
        $("#deleteButton").addEventListener("click", deleteSelected);

        const transformInputs = ["positionX", "positionY", "positionZ", "rotationX", "rotationY", "rotationZ", "scaleX", "scaleY", "scaleZ"];
        transformInputs.forEach((id) => {
            const input = $(`#${id}`);
            input.addEventListener("focus", () => pushHistory(), { once: false });
            input.addEventListener("input", applyEntityTransformFromInspector);
        });
        ["materialColor", "roughness", "metalness"].forEach((id) => {
            const input = $(`#${id}`);
            input.addEventListener("pointerdown", () => pushHistory(), { once: true });
            input.addEventListener("input", applyMaterialChanges);
        });

        $("#capabilityList").addEventListener("click", (event) => {
            const entity = entityById(state.selectedId);
            if (!entity) return;
            if (event.target.dataset.removeCapability) {
                pushHistory();
                entity.capabilities = entity.capabilities.filter((capability) => capability !== event.target.dataset.removeCapability);
                updateInspector(entity);
                markDirty();
                return;
            }
            if (event.target.id === "addCapabilityButton") {
                const defaults = ["Movable", "Interactable", "Openable", "LookAt", "PathFollower"];
                const capability = defaults.find((item) => !entity.capabilities.includes(item));
                if (!capability) {
                    toast("All prototype capabilities are already assigned");
                    return;
                }
                pushHistory();
                entity.capabilities.push(capability);
                updateInspector(entity);
                markDirty();
            }
        });

        $("#projectName").addEventListener("input", (event) => {
            state.projectName = event.target.value;
            markDirty();
        });
        $("#generateButton").addEventListener("click", generatePatch);
        $$(".prompt-suggestions button").forEach((button) => {
            button.addEventListener("click", () => {
                state.currentPromptHistoryId = null;
                setPromptText(button.dataset.prompt, [], true);
                renderPromptHistory();
                placeCaretAtPromptEnd();
            });
        });

        const promptInput = $("#promptInput");
        promptInput.addEventListener("input", () => {
            state.currentPrompt = getPromptText();
            state.currentPromptHistoryId = null;
            renderPromptHistory();
            markDirty();
        });
        promptInput.addEventListener("click", (event) => {
            const token = event.target.closest(".prompt-entity-link");
            if (!token) return;
            event.preventDefault();
            focusPromptEntity(token.dataset.entityId, token);
        });
        promptInput.addEventListener("paste", (event) => {
            event.preventDefault();
            const text = event.clipboardData?.getData("text/plain") || "";
            document.execCommand("insertText", false, text);
        });
        promptInput.addEventListener("keydown", (event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                generatePatch();
            }
        });
        $("#promptHistoryList").addEventListener("click", (event) => {
            const card = event.target.closest("[data-prompt-history-id]");
            if (!card) return;
            const entry = state.promptHistory.find((item) => item.id === card.dataset.promptHistoryId);
            if (!entry) return;
            state.currentPromptHistoryId = entry.id;
            setPromptText(entry.prompt, entry.entityLinks || [], true);
            renderPromptHistory();
            placeCaretAtPromptEnd();
            toast(`Prompt ${String(entry.version).padStart(2, "0")} pasted into the composer`);
        });
        $("#clearPromptHistoryButton").addEventListener("click", () => {
            if (!state.promptHistory.length) return;
            pushHistory();
            state.promptHistory = [];
            state.currentPromptHistoryId = null;
            renderPromptHistory();
            markDirty();
            toast("Prompt history cleared");
        });

        $("#timelineZoom").addEventListener("input", (event) => {
            $("#timelineContent").style.width = `${event.target.value}%`;
        });
        $("#timelineZoomIn").addEventListener("click", () => {
            const input = $("#timelineZoom");
            input.value = clamp(Number(input.value) + 10, 80, 180);
            input.dispatchEvent(new Event("input"));
        });
        $("#timelineZoomOut").addEventListener("click", () => {
            const input = $("#timelineZoom");
            input.value = clamp(Number(input.value) - 10, 80, 180);
            input.dispatchEvent(new Event("input"));
        });

        $$("[data-close-modal]").forEach((button) => button.addEventListener("click", closeExportModal));
        $("#exportModal").addEventListener("click", (event) => {
            if (event.target === $("#exportModal")) closeExportModal();
        });
        $("#exportSceneButton").addEventListener("click", exportScene);
        $("#captureFrameButton").addEventListener("click", captureFrame);
        $("#exportVideoButton").addEventListener("click", exportVideo);
        $$("[data-close-asset-wizard]").forEach((button) => button.addEventListener("click", closeAssetWizard));
        $("#assetWizardModal").addEventListener("click", (event) => {
            if (event.target === $("#assetWizardModal")) closeAssetWizard();
        });
        $("#saveAssetConfiguration").addEventListener("click", saveAssetConfiguration);

        $("#leftPanelToggle").addEventListener("click", () => {
            $("#leftPanel").classList.toggle("is-open");
            $("#rightPanel").classList.remove("is-open");
        });
        $("#rightPanelToggle").addEventListener("click", () => {
            $("#rightPanel").classList.toggle("is-open");
            $("#leftPanel").classList.remove("is-open");
        });

        window.addEventListener("keydown", (event) => {
            const target = event.target instanceof Element ? event.target : document.activeElement;
            const editing = Boolean(
                target?.closest("input, textarea, select, [contenteditable='true'], [role='textbox']") ||
                document.activeElement?.isContentEditable
            );
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
                event.preventDefault();
                saveProject();
            } else if (!editing && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
                event.preventDefault();
                if (event.shiftKey) redo(); else undo();
            } else if (!editing && event.code === "Space") {
                event.preventDefault();
                setPlaying(!state.isPlaying);
            } else if (!editing && event.key.toLowerCase() === "k") {
                event.preventDefault();
                addTransformKeyframe();
            } else if (!editing && ["v", "g", "r", "s"].includes(event.key.toLowerCase())) {
                const map = { v: "select", g: "move", r: "rotate", s: "scale" };
                $(`.viewport-tool[data-tool="${map[event.key.toLowerCase()]}"]`)?.click();
            } else if (event.key === "Escape") {
                closeExportModal();
                closeAssetWizard();
                $("#leftPanel").classList.remove("is-open");
                $("#rightPanel").classList.remove("is-open");
            }
        });

        window.addEventListener("beforeunload", (event) => {
            if (!runtime.dirty) return;
            event.preventDefault();
            event.returnValue = "";
        });
    }

    async function init() {
        const previouslyLoadedModel = localStorage.getItem(MODEL_CACHE_KEY);
        window.SceneScriptLoading?.note(previouslyLoadedModel
            ? "The local model has been loaded before; the browser will reuse its cached files when available."
            : "First load only: the local inference engine will be downloaded once and cached by this browser.");
        window.SceneScriptLoading?.set(52, "Restoring workspace…", "Loading your saved scene", 56);
        await loadSavedProject();
        runtime.promptBaseline = state.currentPrompt || DEFAULT_PROMPT;
        window.SceneScriptLoading?.set(57, "Preparing editor…", "Connecting controls and timeline", 61);
        setupEvents();
        const promptVersion =
            state.promptHistory.find((entry) => entry.id === state.currentPromptHistoryId) ||
            [...state.promptHistory].reverse().find((entry) => entry.prompt === state.currentPrompt);
        setPromptText(state.currentPrompt || DEFAULT_PROMPT, promptVersion?.entityLinks || []);
        renderPromptHistory();
        setupTimeline();
        renderSceneTree();
        updateHistoryButtons();
        if (!initThree()) return;
        selectEntity(state.selectedId, false);
        updateAtTime(0);
        window.SceneScriptLoading?.complete("Scene ready", "Local prompt model is starting in the background");
        void initializeBrowserAnimationParser().catch(() => undefined);
    }

    init().catch((error) => {
        window.SceneScriptLoading?.fail(error instanceof Error ? error.message : String(error));
    });
})();
