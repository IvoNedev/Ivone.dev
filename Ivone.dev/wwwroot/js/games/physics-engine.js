(function () {
    "use strict";

    const canvas = document.getElementById("physics-canvas");
    const root = document.getElementById("physics-engine-root");
    if (!canvas || !root) {
        return;
    }

    const ctx = canvas.getContext("2d");
    const fixedDt = 1 / 60;
    const state = {
        bodies: [],
        contacts: [],
        visualEntities: [],
        nextId: 1,
        accumulator: 0,
        lastTime: 0,
        paused: false,
        currentScenario: "mixed",
        playerId: null,
        jumpMode: "1",
        keys: new Set(),
        game: {
            active: false,
            room: 0,
            score: 0,
            hp: 3,
            roomType: "climb",
            rule: "normal",
            orbsCollected: 0,
            orbsTotal: 0,
            damageCooldown: 0,
            upgrades: {
                bounceBonus: 0,
                radiusScale: 1,
                massScale: 1
            },
            message: "Sandbox"
        },
        metrics: { fps: 0, ticks: 0, frames: 0, tickFrames: 0, timer: 0, pairs: 0 },
        toggles: {
            gravity: true,
            colliders: true,
            aabbs: false,
            velocities: true,
            contacts: true
        },
        settings: {
            gravityX: 0,
            gravityY: 980,
            restitution: 0.45,
            staticFriction: 0.55,
            dynamicFriction: 0.32,
            damping: 0.998,
            correction: 0.8,
            slop: 0.01,
            timeScale: 1,
            playerForce: 1500,
            playerJump: 520,
            playerMaxSpeed: 520
        }
    };

    function vec(x, y) {
        return { x, y };
    }

    function add(a, b) {
        return vec(a.x + b.x, a.y + b.y);
    }

    function sub(a, b) {
        return vec(a.x - b.x, a.y - b.y);
    }

    function mul(a, scalar) {
        return vec(a.x * scalar, a.y * scalar);
    }

    function dot(a, b) {
        return a.x * b.x + a.y * b.y;
    }

    function lenSq(a) {
        return dot(a, a);
    }

    function normalize(a) {
        const length = Math.sqrt(lenSq(a));
        return length <= 0.000001 ? vec(0, 0) : vec(a.x / length, a.y / length);
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function createBody(options) {
        const body = {
            id: state.nextId++,
            shape: options.shape,
            position: vec(options.x, options.y),
            previousPosition: vec(options.x, options.y),
            velocity: vec(options.vx || 0, options.vy || 0),
            force: vec(0, 0),
            radius: options.radius || 0,
            halfWidth: options.halfWidth || 0,
            halfHeight: options.halfHeight || 0,
            isStatic: Boolean(options.isStatic),
            mass: options.isStatic ? Infinity : Math.max(options.mass || 1, 0.001),
            restitution: options.restitution ?? state.settings.restitution,
            staticFriction: options.staticFriction ?? state.settings.staticFriction,
            dynamicFriction: options.dynamicFriction ?? state.settings.dynamicFriction,
            color: options.color || "#38bdf8",
            isPlayer: Boolean(options.isPlayer),
            jumpLatch: false,
            grounded: false,
            jumpsRemaining: currentJumpLimit()
        };
        body.inverseMass = body.isStatic ? 0 : 1 / body.mass;
        state.bodies.push(body);
        return body;
    }

    function aabb(body) {
        if (body.shape === "circle") {
            return {
                minX: body.position.x - body.radius,
                minY: body.position.y - body.radius,
                maxX: body.position.x + body.radius,
                maxY: body.position.y + body.radius
            };
        }

        return {
            minX: body.position.x - body.halfWidth,
            minY: body.position.y - body.halfHeight,
            maxX: body.position.x + body.halfWidth,
            maxY: body.position.y + body.halfHeight
        };
    }

    function aabbIntersects(a, b) {
        return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
    }

    function testCollision(a, b) {
        if (a.shape === "circle" && b.shape === "circle") {
            return circleCircle(a, b);
        }

        if (a.shape === "box" && b.shape === "box") {
            return boxBox(a, b);
        }

        if (a.shape === "circle" && b.shape === "box") {
            return circleBox(a, b);
        }

        if (a.shape === "box" && b.shape === "circle") {
            const manifold = circleBox(b, a);
            if (!manifold) {
                return null;
            }

            return {
                a,
                b,
                normal: mul(manifold.normal, -1),
                penetration: manifold.penetration,
                contact: manifold.contact
            };
        }

        return null;
    }

    function circleCircle(a, b) {
        const delta = sub(b.position, a.position);
        const distanceSquared = lenSq(delta);
        const radiusSum = a.radius + b.radius;
        if (distanceSquared >= radiusSum * radiusSum) {
            return null;
        }

        const distance = Math.sqrt(distanceSquared);
        const normal = distance <= 0.000001 ? vec(1, 0) : mul(delta, 1 / distance);
        return {
            a,
            b,
            normal,
            penetration: radiusSum - distance,
            contact: add(a.position, mul(normal, a.radius))
        };
    }

    function boxBox(a, b) {
        const delta = sub(b.position, a.position);
        const overlapX = a.halfWidth + b.halfWidth - Math.abs(delta.x);
        const overlapY = a.halfHeight + b.halfHeight - Math.abs(delta.y);
        if (overlapX <= 0 || overlapY <= 0) {
            return null;
        }

        if (overlapX < overlapY) {
            return {
                a,
                b,
                normal: vec(delta.x < 0 ? -1 : 1, 0),
                penetration: overlapX,
                contact: mul(add(a.position, b.position), 0.5)
            };
        }

        return {
            a,
            b,
            normal: vec(0, delta.y < 0 ? -1 : 1),
            penetration: overlapY,
            contact: mul(add(a.position, b.position), 0.5)
        };
    }

    function circleBox(circle, box) {
        const minX = box.position.x - box.halfWidth;
        const maxX = box.position.x + box.halfWidth;
        const minY = box.position.y - box.halfHeight;
        const maxY = box.position.y + box.halfHeight;
        let closest = vec(clamp(circle.position.x, minX, maxX), clamp(circle.position.y, minY, maxY));
        const delta = sub(circle.position, closest);
        const distanceSquared = lenSq(delta);

        if (distanceSquared > circle.radius * circle.radius) {
            return null;
        }

        let normal;
        let penetration;

        if (distanceSquared <= 0.000001) {
            const left = Math.abs(circle.position.x - minX);
            const right = Math.abs(maxX - circle.position.x);
            const top = Math.abs(circle.position.y - minY);
            const bottom = Math.abs(maxY - circle.position.y);
            const nearest = Math.min(left, right, top, bottom);

            if (nearest === left) {
                normal = vec(1, 0);
                penetration = circle.radius + left;
                closest = vec(minX, circle.position.y);
            } else if (nearest === right) {
                normal = vec(-1, 0);
                penetration = circle.radius + right;
                closest = vec(maxX, circle.position.y);
            } else if (nearest === top) {
                normal = vec(0, 1);
                penetration = circle.radius + top;
                closest = vec(circle.position.x, minY);
            } else {
                normal = vec(0, -1);
                penetration = circle.radius + bottom;
                closest = vec(circle.position.x, maxY);
            }
        } else {
            const distance = Math.sqrt(distanceSquared);
            normal = mul(delta, -1 / distance);
            penetration = circle.radius - distance;
        }

        return { a: circle, b: box, normal, penetration, contact: closest };
    }

    function step(dt) {
        state.contacts.length = 0;
        state.metrics.pairs = 0;

        for (const body of state.bodies) {
            if (body.isStatic) {
                continue;
            }

            body.force.x = state.toggles.gravity ? state.settings.gravityX * body.mass : 0;
            body.force.y = state.toggles.gravity ? state.settings.gravityY * body.mass : 0;
            applyPlayerControl(body, dt);
            body.previousPosition.x = body.position.x;
            body.previousPosition.y = body.position.y;
            body.velocity.x += body.force.x * body.inverseMass * dt;
            body.velocity.y += body.force.y * body.inverseMass * dt;
            body.velocity.x *= state.settings.damping;
            body.velocity.y *= state.settings.damping;
            body.position.x += body.velocity.x * dt;
            body.position.y += body.velocity.y * dt;
            body.restitution = state.settings.restitution;
            body.staticFriction = state.settings.staticFriction;
            body.dynamicFriction = state.settings.dynamicFriction;
        }

        for (let i = 0; i < state.bodies.length; i += 1) {
            for (let j = i + 1; j < state.bodies.length; j += 1) {
                const a = state.bodies[i];
                const b = state.bodies[j];
                if (a.isStatic && b.isStatic) {
                    continue;
                }

                state.metrics.pairs += 1;
                if (!aabbIntersects(aabb(a), aabb(b))) {
                    continue;
                }

                const manifold = testCollision(a, b);
                if (manifold) {
                    state.contacts.push(manifold);
                    resolve(manifold);
                }
            }
        }

        for (const contact of state.contacts) {
            correctPosition(contact);
        }

        updatePlayerGrounding();
        updateGame(dt);
        state.metrics.tickFrames += 1;
    }

    function applyPlayerControl(body, dt) {
        if (!body.isPlayer) {
            return;
        }

        let direction = 0;
        if (state.keys.has("ArrowLeft")) {
            direction -= 1;
        }
        if (state.keys.has("ArrowRight")) {
            direction += 1;
        }

        body.force.x += direction * state.settings.playerForce * body.mass;

        if ((state.keys.has("ArrowUp") || state.keys.has("Space")) && !body.jumpLatch && canPlayerJump(body)) {
            body.velocity.y = Math.min(body.velocity.y, 0) - state.settings.playerJump;
            body.grounded = false;
            if (state.jumpMode !== "infinite") {
                body.jumpsRemaining = Math.max(0, body.jumpsRemaining - 1);
            }
            body.jumpLatch = true;
        }

        if (!state.keys.has("ArrowUp") && !state.keys.has("Space")) {
            body.jumpLatch = false;
        }

        if (state.keys.has("ArrowDown")) {
            body.force.y += state.settings.playerForce * 0.9 * body.mass;
        }

        body.velocity.x = clamp(body.velocity.x, -state.settings.playerMaxSpeed, state.settings.playerMaxSpeed);
        body.velocity.y = clamp(body.velocity.y, -state.settings.playerMaxSpeed * 1.6, state.settings.playerMaxSpeed * 1.8);

        if (direction === 0) {
            body.velocity.x *= Math.pow(0.88, dt * 60);
        }
    }

    function canPlayerJump(body) {
        return state.jumpMode === "infinite" || body.jumpsRemaining > 0;
    }

    function currentJumpLimit() {
        return state.jumpMode === "infinite" ? Number.POSITIVE_INFINITY : Number(state.jumpMode);
    }

    function updatePlayerGrounding() {
        const player = getPlayer();
        if (!player) {
            return;
        }

        let grounded = false;
        for (const contact of state.contacts) {
            if (contact.a === player && contact.normal.y > 0.45) {
                grounded = true;
                break;
            }
            if (contact.b === player && contact.normal.y < -0.45) {
                grounded = true;
                break;
            }
        }

        player.grounded = grounded;
        if (grounded) {
            player.jumpsRemaining = currentJumpLimit();
        }
    }

    function updateGame(dt) {
        if (!state.game.active) {
            updateGameHud();
            return;
        }

        const player = getPlayer();
        if (!player) {
            updateGameHud();
            return;
        }

        state.game.damageCooldown = Math.max(0, state.game.damageCooldown - dt);

        for (const entity of state.visualEntities) {
            if (entity.type === "orb" && !entity.collected && distance(player.position, entity) <= player.radius + entity.radius) {
                entity.collected = true;
                state.game.orbsCollected += 1;
                state.game.score += 1;
            }

            if (entity.type === "hazard") {
                entity.phase += dt * entity.speed;
                entity.x += Math.cos(entity.phase) * entity.drift * dt;
                entity.y += Math.sin(entity.phase * 0.8) * entity.drift * dt;
                if (distance(player.position, entity) <= player.radius + entity.radius) {
                    damagePlayer(player);
                }
            }

            if (entity.type === "exit" && state.game.orbsCollected >= state.game.orbsTotal && distance(player.position, entity) <= player.radius + entity.radius) {
                nextGameRoom();
                return;
            }
        }

        if (player.position.y > worldHeight() + 180) {
            damagePlayer(player, true);
        }

        updateGameHud();
    }

    function damagePlayer(player, respawn) {
        if (state.game.damageCooldown > 0) {
            return;
        }

        state.game.hp -= 1;
        state.game.damageCooldown = 1.1;
        player.velocity.x = -player.velocity.x * 0.35;
        player.velocity.y = -Math.max(state.settings.playerJump * 0.55, 260);

        if (respawn) {
            player.position.x = Math.max(90, worldWidth() * 0.16);
            player.position.y = Math.max(120, worldHeight() * 0.22);
            player.velocity.x = 0;
            player.velocity.y = 0;
        }

        if (state.game.hp <= 0) {
            state.game.active = false;
            state.game.message = `Run ended at room ${state.game.room}`;
            state.visualEntities.length = 0;
        }
    }

    function distance(a, b) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function resolve(contact) {
        const a = contact.a;
        const b = contact.b;
        const inverseMassSum = a.inverseMass + b.inverseMass;
        if (inverseMassSum <= 0) {
            return;
        }

        const relativeVelocity = sub(b.velocity, a.velocity);
        const velocityAlongNormal = dot(relativeVelocity, contact.normal);
        if (velocityAlongNormal > 0) {
            return;
        }

        const restitution = Math.min(a.restitution, b.restitution);
        let impulseMagnitude = -(1 + restitution) * velocityAlongNormal;
        impulseMagnitude /= inverseMassSum;

        const impulse = mul(contact.normal, impulseMagnitude);
        a.velocity.x -= impulse.x * a.inverseMass;
        a.velocity.y -= impulse.y * a.inverseMass;
        b.velocity.x += impulse.x * b.inverseMass;
        b.velocity.y += impulse.y * b.inverseMass;

        const rvAfter = sub(b.velocity, a.velocity);
        let tangent = sub(rvAfter, mul(contact.normal, dot(rvAfter, contact.normal)));
        tangent = normalize(tangent);
        if (tangent.x === 0 && tangent.y === 0) {
            return;
        }

        let jt = -dot(rvAfter, tangent);
        jt /= inverseMassSum;
        const mu = Math.sqrt(a.staticFriction * b.staticFriction);
        let frictionImpulse;

        if (Math.abs(jt) < impulseMagnitude * mu) {
            frictionImpulse = mul(tangent, jt);
        } else {
            const dynamicFriction = Math.sqrt(a.dynamicFriction * b.dynamicFriction);
            frictionImpulse = mul(tangent, -impulseMagnitude * dynamicFriction);
        }

        a.velocity.x -= frictionImpulse.x * a.inverseMass;
        a.velocity.y -= frictionImpulse.y * a.inverseMass;
        b.velocity.x += frictionImpulse.x * b.inverseMass;
        b.velocity.y += frictionImpulse.y * b.inverseMass;
    }

    function correctPosition(contact) {
        const a = contact.a;
        const b = contact.b;
        const inverseMassSum = a.inverseMass + b.inverseMass;
        if (inverseMassSum <= 0) {
            return;
        }

        const magnitude = Math.max(contact.penetration - state.settings.slop, 0) / inverseMassSum * state.settings.correction;
        const correction = mul(contact.normal, magnitude);
        a.position.x -= correction.x * a.inverseMass;
        a.position.y -= correction.y * a.inverseMass;
        b.position.x += correction.x * b.inverseMass;
        b.position.y += correction.y * b.inverseMass;
    }

    function clearWorld() {
        state.bodies.length = 0;
        state.contacts.length = 0;
        state.visualEntities.length = 0;
        state.nextId = 1;
        state.playerId = null;
        state.accumulator = 0;
    }

    function addBounds() {
        const w = worldWidth();
        const h = worldHeight();
        createBody({ shape: "box", x: w / 2, y: h + 24, halfWidth: w / 2, halfHeight: 32, isStatic: true, color: "#64748b", restitution: state.settings.restitution });
        createBody({ shape: "box", x: -24, y: h / 2, halfWidth: 32, halfHeight: h / 2, isStatic: true, color: "#64748b", restitution: state.settings.restitution });
        createBody({ shape: "box", x: w + 24, y: h / 2, halfWidth: 32, halfHeight: h / 2, isStatic: true, color: "#64748b", restitution: state.settings.restitution });
        createBody({ shape: "box", x: w * 0.68, y: h * 0.72, halfWidth: 180, halfHeight: 12, isStatic: true, color: "#475569", restitution: state.settings.restitution });
    }

    function loadScenario(name) {
        state.currentScenario = name;
        clearWorld();

        if (name === "empty") {
            return;
        }

        addBounds();

        if (name === "random-platforms") {
            createRandomPlatformBodies();
            return;
        }

        if (name === "ball-pit") {
            for (let i = 0; i < 36; i += 1) {
                const radius = 11 + (i % 4) * 3;
                createBody({
                    shape: "circle",
                    x: 130 + (i % 9) * 48,
                    y: 62 + Math.floor(i / 9) * 48,
                    radius,
                    mass: radius / 10,
                    restitution: 0.72,
                    color: i % 2 ? "#38bdf8" : "#22c55e"
                });
            }
            return;
        }

        if (name === "crate-stack") {
            for (let row = 0; row < 6; row += 1) {
                for (let col = 0; col < 6 - row; col += 1) {
                    createBody({
                        shape: "box",
                        x: 240 + col * 52 + row * 26,
                        y: 540 - row * 46,
                        halfWidth: 22,
                        halfHeight: 22,
                        mass: 2,
                        restitution: 0.08,
                        color: "#f97316"
                    });
                }
            }
            createBody({ shape: "circle", x: 930, y: 180, vx: -520, vy: 70, radius: 34, mass: 8, restitution: 0.28, color: "#eab308" });
            return;
        }

        if (name === "low-gravity") {
            state.settings.gravityY = 180;
            syncSettingControls();
            for (let i = 0; i < 18; i += 1) {
                createBody({
                    shape: i % 3 === 0 ? "box" : "circle",
                    x: 150 + i * 56,
                    y: 120 + (i % 4) * 26,
                    vx: -120 + i * 15,
                    vy: -80,
                    radius: 19,
                    halfWidth: 20,
                    halfHeight: 20,
                    mass: 1,
                    restitution: 0.86,
                    color: i % 2 ? "#a78bfa" : "#14b8a6"
                });
            }
            return;
        }

        state.settings.gravityY = 980;
        syncSettingControls();
        for (let i = 0; i < 10; i += 1) {
            createBody({ shape: "circle", x: 180 + i * 64, y: 80 + (i % 2) * 18, radius: 18 + (i % 3) * 5, mass: 1.4, restitution: 0.55, color: "#38bdf8" });
        }
        for (let i = 0; i < 8; i += 1) {
            createBody({ shape: "box", x: 280 + i * 58, y: 250 + (i % 2) * 24, halfWidth: 24, halfHeight: 24, mass: 1.8, restitution: 0.2, color: "#f97316" });
        }
        createBody({ shape: "circle", x: 980, y: 140, vx: -360, vy: -80, radius: 30, mass: 5, restitution: 0.42, color: "#22c55e" });
    }

    function clearEverything() {
        state.currentScenario = "empty";
        state.game.active = false;
        state.game.message = "Sandbox";
        clearWorld();
        updateGameHud();
        setMetric("bodies", 0);
        setMetric("contacts", 0);
        setMetric("pairs", 0);
    }

    function startRun() {
        state.game.active = true;
        state.game.room = 0;
        state.game.score = 0;
        state.game.hp = 3;
        state.game.upgrades.bounceBonus = 0;
        state.game.upgrades.radiusScale = 1;
        state.game.upgrades.massScale = 1;
        state.game.message = "Run active";
        nextGameRoom();
    }

    function nextGameRoom() {
        state.game.active = true;
        state.game.room += 1;
        if (state.game.room > 1 && state.game.orbsCollected >= state.game.orbsTotal) {
            offerRandomUpgrade();
        }
        generateGameRoom();
    }

    function rerollGameRoom() {
        if (!state.game.active) {
            state.game.active = true;
            state.game.room = Math.max(1, state.game.room);
        }
        generateGameRoom();
    }

    function endRun() {
        state.game.active = false;
        state.game.message = state.game.room > 0 ? `Run ended at room ${state.game.room}` : "Sandbox";
        state.visualEntities.length = 0;
        updateGameHud();
    }

    function generateGameRoom() {
        state.currentScenario = "game";
        clearWorld();
        applyRoomRule(state.game.rule);
        applyRunUpgradesToSettings();
        createGameBounds();

        const w = worldWidth();
        const h = worldHeight();
        const type = state.game.roomType;
        const difficulty = Math.min(1 + state.game.room * 0.08, 2.2);

        createPlatform(w * 0.16, h * 0.82, 112, 12, "#0f766e");

        if (type === "climb") {
            for (let i = 0; i < 8; i += 1) {
                createPlatform(randomRange(w * 0.18, w * 0.86), h * 0.74 - i * h * 0.075, randomRange(82, 170), 12, i % 2 ? "#475569" : "#334155");
            }
        } else if (type === "descent") {
            for (let i = 0; i < 9; i += 1) {
                createPlatform(randomRange(w * 0.14, w * 0.88), h * 0.2 + i * h * 0.072, randomRange(90, 190), 12, i % 2 ? "#475569" : "#334155");
            }
        } else if (type === "bounce") {
            for (let i = 0; i < 7; i += 1) {
                createPlatform(w * (0.2 + (i % 3) * 0.24), h * (0.75 - i * 0.085), randomRange(86, 150), 14, "#0e7490", 1.12);
            }
        } else if (type === "crates") {
            for (let i = 0; i < 7; i += 1) {
                createPlatform(randomRange(w * 0.15, w * 0.88), h * (0.78 - i * 0.08), randomRange(92, 178), 12, "#475569");
            }
            for (let i = 0; i < 8 + state.game.room; i += 1) {
                createBody({
                    shape: "box",
                    x: randomRange(w * 0.25, w * 0.85),
                    y: randomRange(80, h * 0.45),
                    halfWidth: 18,
                    halfHeight: 18,
                    mass: 1.5,
                    restitution: state.settings.restitution,
                    color: "#f97316"
                });
            }
        } else {
            for (let i = 0; i < 10; i += 1) {
                createPlatform(randomRange(w * 0.12, w * 0.9), randomRange(h * 0.22, h * 0.82), randomRange(70, 190), 12, i % 3 ? "#334155" : "#0e7490", i % 3 ? undefined : 0.95);
            }
        }

        const player = createPlayerBody(w * 0.16, h * 0.7, 0, 0);
        state.playerId = player.id;
        state.game.orbsCollected = 0;
        state.game.orbsTotal = 3 + Math.min(4, Math.floor(state.game.room / 2));
        state.game.damageCooldown = 0;
        state.game.message = `${labelFromId(type)} room`;

        for (let i = 0; i < state.game.orbsTotal; i += 1) {
            createOrb(randomRange(w * 0.18, w * 0.88), randomRange(h * 0.16, h * 0.7));
        }

        const hazardCount = Math.min(2 + Math.floor(state.game.room / 2), 8);
        for (let i = 0; i < hazardCount; i += 1) {
            createHazard(randomRange(w * 0.25, w * 0.9), randomRange(h * 0.18, h * 0.76), difficulty);
        }

        createExit(w * 0.9, h * 0.18);
        updateGameHud();
    }

    function createGameBounds() {
        const w = worldWidth();
        const h = worldHeight();
        createBody({ shape: "box", x: w / 2, y: h + 24, halfWidth: w / 2, halfHeight: 32, isStatic: true, color: "#475569", restitution: state.settings.restitution });
        createBody({ shape: "box", x: -24, y: h / 2, halfWidth: 32, halfHeight: h / 2, isStatic: true, color: "#475569", restitution: state.settings.restitution });
        createBody({ shape: "box", x: w + 24, y: h / 2, halfWidth: 32, halfHeight: h / 2, isStatic: true, color: "#475569", restitution: state.settings.restitution });
    }

    function createPlatform(x, y, width, height, color, restitution) {
        createBody({
            shape: "box",
            x,
            y,
            halfWidth: width / 2,
            halfHeight: height / 2,
            isStatic: true,
            restitution: restitution ?? state.settings.restitution,
            color
        });
    }

    function createOrb(x, y) {
        state.visualEntities.push({ type: "orb", x, y, radius: 10, collected: false, phase: Math.random() * Math.PI * 2 });
    }

    function createHazard(x, y, difficulty) {
        state.visualEntities.push({
            type: "hazard",
            x,
            y,
            radius: 15,
            phase: Math.random() * Math.PI * 2,
            speed: randomRange(1.5, 2.8) * difficulty,
            drift: randomRange(16, 42)
        });
    }

    function createExit(x, y) {
        state.visualEntities.push({ type: "exit", x, y, radius: 24, phase: 0 });
    }

    function applyRoomRule(rule) {
        state.settings.gravityX = 0;
        state.settings.gravityY = 980;
        state.settings.restitution = 0.45;
        state.settings.staticFriction = 0.55;
        state.settings.dynamicFriction = 0.32;
        state.settings.damping = 0.998;

        if (rule === "low-gravity") {
            state.settings.gravityY = 360;
            state.settings.damping = 0.999;
        } else if (rule === "bouncy") {
            state.settings.restitution = 0.96;
            state.settings.damping = 0.999;
        } else if (rule === "ice") {
            state.settings.staticFriction = 0.02;
            state.settings.dynamicFriction = 0.01;
            state.settings.damping = 0.999;
        } else if (rule === "heavy") {
            state.settings.gravityY = 1380;
            state.settings.restitution = 0.22;
        }

        syncSettingControls();
    }

    function applyRunUpgradesToSettings() {
        state.settings.restitution = Math.min(1.2, state.settings.restitution + state.game.upgrades.bounceBonus);
        syncSettingControls();
    }

    function offerRandomUpgrade() {
        const upgrades = ["extra-jump", "spring-body", "tiny-body", "heavy-body", "fast-roll"];
        applyUpgrade(upgrades[Math.floor(Math.random() * upgrades.length)]);
    }

    function applyUpgrade(upgrade) {
        const player = getPlayer();

        if (upgrade === "extra-jump") {
            if (state.jumpMode === "1") {
                setJumpMode("2");
            } else if (state.jumpMode === "2") {
                setJumpMode("3");
            } else {
                setJumpMode("infinite");
            }
            state.game.message = "Upgrade: extra jump";
        } else if (upgrade === "spring-body") {
            state.game.upgrades.bounceBonus = Math.min(0.55, state.game.upgrades.bounceBonus + 0.18);
            state.settings.restitution = Math.min(1.2, state.settings.restitution + 0.18);
            syncSettingControls();
            applyBounceToBodies();
            state.game.message = "Upgrade: spring body";
        } else if (upgrade === "tiny-body") {
            state.game.upgrades.radiusScale = Math.max(0.55, state.game.upgrades.radiusScale - 0.16);
            if (player) {
                player.radius = Math.max(13, player.radius - 5);
            }
            state.game.message = "Upgrade: tiny body";
        } else if (upgrade === "heavy-body") {
            state.game.upgrades.massScale = Math.min(2.6, state.game.upgrades.massScale + 0.35);
            if (player) {
                player.mass *= 1.35;
                player.inverseMass = 1 / player.mass;
            }
            state.settings.playerJump += 50;
            syncSettingControls();
            state.game.message = "Upgrade: heavy body";
        } else if (upgrade === "fast-roll") {
            state.settings.playerForce += 250;
            state.settings.playerMaxSpeed += 80;
            syncSettingControls();
            state.game.message = "Upgrade: fast roll";
        }

        updateGameHud();
    }

    function spawnPlayer() {
        const previous = getPlayer();
        if (previous) {
            state.bodies = state.bodies.filter((body) => body.id !== previous.id);
        }

        const player = createPlayerBody(
            Math.max(90, worldWidth() * 0.16),
            Math.max(120, worldHeight() * 0.28),
            0,
            0);
        state.playerId = player.id;
    }

    function getPlayer() {
        return state.playerId === null ? null : state.bodies.find((body) => body.id === state.playerId) || null;
    }

    function burst() {
        const center = vec(worldWidth() * 0.5, worldHeight() * 0.38);
        for (let i = 0; i < 16; i += 1) {
            const angle = (Math.PI * 2 * i) / 16;
            const speed = 220 + (i % 4) * 35;
            createBody({
                shape: i % 4 === 0 ? "box" : "circle",
                x: center.x + Math.cos(angle) * 12,
                y: center.y + Math.sin(angle) * 12,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: 14,
                halfWidth: 15,
                halfHeight: 15,
                mass: 1,
                restitution: 0.62,
                color: i % 2 ? "#67e8f9" : "#fb7185"
            });
        }
    }

    function enableHighBounce() {
        state.settings.restitution = 0.92;
        state.settings.damping = 0.999;
        syncSettingControls();
        applyBounceToBodies();
    }

    function applyBounceToBodies() {
        for (const body of state.bodies) {
            body.restitution = state.settings.restitution;
        }
    }

    function spawnRandomPlatforms() {
        const player = getPlayer();
        const playerSnapshot = player ? {
            x: player.position.x,
            y: player.position.y,
            vx: player.velocity.x,
            vy: player.velocity.y
        } : null;

        state.currentScenario = "random-platforms";
        clearWorld();
        addBounds();
        createRandomPlatformBodies();

        if (playerSnapshot) {
            const restored = createPlayerBody(
                clamp(playerSnapshot.x, 80, worldWidth() - 80),
                clamp(playerSnapshot.y, 80, worldHeight() - 160),
                playerSnapshot.vx,
                playerSnapshot.vy);
            state.playerId = restored.id;
        }
    }

    function createRandomPlatformBodies() {
        const w = worldWidth();
        const h = worldHeight();
        const platformCount = 10 + Math.floor(Math.random() * 6);
        for (let i = 0; i < platformCount; i += 1) {
            const width = randomRange(76, 220);
            const height = randomRange(10, 20);
            const x = randomRange(width * 0.6, w - width * 0.6);
            const y = randomRange(h * 0.22, h * 0.86);
            createBody({
                shape: "box",
                x,
                y,
                halfWidth: width / 2,
                halfHeight: height / 2,
                isStatic: true,
                restitution: state.settings.restitution,
                color: i % 2 ? "#475569" : "#334155"
            });
        }

        createBody({
            shape: "box",
            x: w * 0.18,
            y: h * 0.78,
            halfWidth: 110,
            halfHeight: 12,
            isStatic: true,
            restitution: state.settings.restitution,
                color: "#0f766e"
        });
    }

    function randomRange(min, max) {
        return min + Math.random() * (max - min);
    }

    function createPlayerBody(x, y, vx, vy) {
        const radius = 24 * state.game.upgrades.radiusScale;
        const mass = 2.2 * state.game.upgrades.massScale;
        return createBody({
            shape: "circle",
            x,
            y,
            vx,
            vy,
            radius,
            mass,
            restitution: state.settings.restitution,
            staticFriction: 0.42,
            dynamicFriction: 0.24,
            color: "#facc15",
            isPlayer: true
        });
    }

    function resizeCanvas() {
        const rect = root.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const cssWidth = Math.max(320, Math.floor(rect.width));
        const cssHeight = Math.max(420, Math.floor(rect.height));
        canvas.width = Math.floor(cssWidth * dpr);
        canvas.height = Math.floor(cssHeight * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        canvas.dataset.cssWidth = String(cssWidth);
        canvas.dataset.cssHeight = String(cssHeight);
    }

    function worldWidth() {
        return Number(canvas.dataset.cssWidth || canvas.width);
    }

    function worldHeight() {
        return Number(canvas.dataset.cssHeight || canvas.height);
    }

    function render() {
        const w = worldWidth();
        const h = worldHeight();
        ctx.clearRect(0, 0, w, h);
        drawGrid(w, h);

        for (const body of state.bodies) {
            drawBody(body);
        }

        drawVisualEntities();

        if (state.toggles.aabbs) {
            for (const body of state.bodies) {
                drawAabb(body);
            }
        }

        if (state.toggles.velocities) {
            for (const body of state.bodies) {
                drawVelocity(body);
            }
        }

        if (state.toggles.contacts) {
            drawContacts();
        }
    }

    function drawVisualEntities() {
        for (const entity of state.visualEntities) {
            if (entity.type === "orb") {
                if (entity.collected) {
                    continue;
                }
                ctx.save();
                ctx.fillStyle = "#facc15";
                ctx.strokeStyle = "#fef3c7";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(entity.x, entity.y + Math.sin(performance.now() * 0.004 + entity.phase) * 3, entity.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            } else if (entity.type === "hazard") {
                ctx.save();
                ctx.fillStyle = "#ef4444";
                ctx.strokeStyle = "#fecaca";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(entity.x, entity.y, entity.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            } else if (entity.type === "exit") {
                const ready = state.game.orbsCollected >= state.game.orbsTotal;
                ctx.save();
                ctx.strokeStyle = ready ? "#22c55e" : "rgba(148, 163, 184, 0.82)";
                ctx.fillStyle = ready ? "rgba(34, 197, 94, 0.18)" : "rgba(51, 65, 85, 0.34)";
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(entity.x, entity.y, entity.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            }
        }
    }

    function drawGrid(w, h) {
        ctx.fillStyle = "#030712";
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = "rgba(51, 65, 85, 0.34)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x <= w; x += 40) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
        }
        for (let y = 0; y <= h; y += 40) {
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
        }
        ctx.stroke();
    }

    function drawBody(body) {
        ctx.save();
        ctx.fillStyle = body.isStatic ? "#475569" : body.color;
        ctx.strokeStyle = state.toggles.colliders ? "#e2e8f0" : "rgba(226, 232, 240, 0.22)";
        ctx.lineWidth = body.isStatic ? 1 : 2;
        ctx.beginPath();

        if (body.shape === "circle") {
            ctx.arc(body.position.x, body.position.y, body.radius, 0, Math.PI * 2);
            ctx.fill();
            if (state.toggles.colliders) {
                ctx.stroke();
            }
            if (body.isPlayer) {
                drawPlayerMarker(body);
            }
        } else {
            ctx.rect(body.position.x - body.halfWidth, body.position.y - body.halfHeight, body.halfWidth * 2, body.halfHeight * 2);
            ctx.fill();
            if (state.toggles.colliders) {
                ctx.stroke();
            }
        }

        ctx.restore();
    }

    function drawPlayerMarker(body) {
        ctx.save();
        ctx.strokeStyle = "#111827";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(body.position.x - 9, body.position.y - 3);
        ctx.lineTo(body.position.x, body.position.y - 12);
        ctx.lineTo(body.position.x + 9, body.position.y - 3);
        ctx.stroke();
        ctx.restore();
    }

    function drawAabb(body) {
        const box = aabb(body);
        ctx.save();
        ctx.strokeStyle = "rgba(250, 204, 21, 0.85)";
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(box.minX, box.minY, box.maxX - box.minX, box.maxY - box.minY);
        ctx.restore();
    }

    function drawVelocity(body) {
        if (body.isStatic) {
            return;
        }

        ctx.save();
        ctx.strokeStyle = "#22c55e";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(body.position.x, body.position.y);
        ctx.lineTo(body.position.x + body.velocity.x * 0.08, body.position.y + body.velocity.y * 0.08);
        ctx.stroke();
        ctx.restore();
    }

    function drawContacts() {
        ctx.save();
        ctx.fillStyle = "#fb7185";
        ctx.strokeStyle = "#fb7185";
        ctx.lineWidth = 2;

        for (const contact of state.contacts) {
            ctx.beginPath();
            ctx.arc(contact.contact.x, contact.contact.y, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(contact.contact.x, contact.contact.y);
            ctx.lineTo(contact.contact.x + contact.normal.x * 28, contact.contact.y + contact.normal.y * 28);
            ctx.stroke();
        }

        ctx.restore();
    }

    function updateMetrics(delta) {
        state.metrics.frames += 1;
        state.metrics.timer += delta;
        if (state.metrics.timer >= 0.5) {
            state.metrics.fps = Math.round(state.metrics.frames / state.metrics.timer);
            state.metrics.ticks = Math.round(state.metrics.tickFrames / state.metrics.timer);
            state.metrics.frames = 0;
            state.metrics.tickFrames = 0;
            state.metrics.timer = 0;

            setMetric("fps", state.metrics.fps);
            setMetric("ticks", state.metrics.ticks);
            setMetric("bodies", state.bodies.length);
            setMetric("contacts", state.contacts.length);
            setMetric("pairs", state.metrics.pairs);
        }
    }

    function setMetric(name, value) {
        const element = document.querySelector(`[data-metric="${name}"]`);
        if (element) {
            element.textContent = String(value);
        }
    }

    function updateGameHud() {
        setGameMetric("room", state.game.active ? String(state.game.room) : state.game.message);
        setGameMetric("rule", labelFromId(state.game.rule));
        setGameMetric("orbs", `${state.game.orbsCollected}/${state.game.orbsTotal}`);
        setGameMetric("hp", state.game.active ? state.game.hp : "-");
        setGameMetric("status", state.game.message);
    }

    function setGameMetric(name, value) {
        const element = document.querySelector(`[data-game-metric="${name}"]`);
        if (element) {
            element.textContent = String(value);
        }
    }

    function labelFromId(value) {
        return String(value)
            .split("-")
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(" ");
    }

    function frame(now) {
        if (!state.lastTime) {
            state.lastTime = now;
        }

        const rawDelta = Math.min((now - state.lastTime) / 1000, 0.12);
        state.lastTime = now;
        const delta = rawDelta * state.settings.timeScale;

        if (!state.paused) {
            state.accumulator += delta;
            while (state.accumulator >= fixedDt) {
                step(fixedDt);
                state.accumulator -= fixedDt;
            }
        }

        render();
        updateMetrics(rawDelta);
        requestAnimationFrame(frame);
    }

    function syncSettingControls() {
        for (const [key, value] of Object.entries(state.settings)) {
            const input = document.querySelector(`[data-setting="${key}"]`);
            const output = document.querySelector(`[data-output="${key}"]`);
            if (input) {
                input.value = String(value);
            }
            if (output) {
                output.textContent = formatSetting(key, value);
            }
        }
    }

    function formatSetting(key, value) {
        if (key === "gravityX" || key === "gravityY" || key === "playerForce" || key === "playerJump" || key === "playerMaxSpeed") {
            return String(Math.round(value));
        }
        if (key === "restitution") {
            return `${Math.round(Number(value) * 100)}%`;
        }
        if (key === "damping") {
            return Number(value).toFixed(3);
        }
        if (key === "timeScale") {
            return Number(value).toFixed(2);
        }
        return Number(value).toFixed(2);
    }

    function wireControls() {
        const panel = document.getElementById("physics-settings-panel");
        const toggle = document.getElementById("physics-settings-toggle");
        const close = document.getElementById("physics-settings-close");
        const gamePanel = document.getElementById("physics-game-panel");
        const gameToggle = document.getElementById("physics-game-toggle");
        const gameClose = document.getElementById("physics-game-close");

        function setPanel(open) {
            panel.classList.toggle("open", open);
            panel.setAttribute("aria-hidden", open ? "false" : "true");
            toggle.setAttribute("aria-expanded", open ? "true" : "false");
        }

        function setGamePanel(open) {
            gamePanel.classList.toggle("open", open);
            gamePanel.setAttribute("aria-hidden", open ? "false" : "true");
            gameToggle.setAttribute("aria-expanded", open ? "true" : "false");
        }

        toggle.addEventListener("click", () => setPanel(!panel.classList.contains("open")));
        close.addEventListener("click", () => setPanel(false));
        gameToggle.addEventListener("click", () => setGamePanel(!gamePanel.classList.contains("open")));
        gameClose.addEventListener("click", () => setGamePanel(false));

        document.querySelectorAll("[data-setting]").forEach((input) => {
            input.addEventListener("input", () => {
                const key = input.dataset.setting;
                const value = Number(input.value);
                state.settings[key] = value;
                const output = document.querySelector(`[data-output="${key}"]`);
                if (output) {
                    output.textContent = formatSetting(key, value);
                }
                if (key === "restitution") {
                    applyBounceToBodies();
                }
            });
        });

        document.querySelectorAll("[data-toggle]").forEach((input) => {
            input.addEventListener("change", () => {
                state.toggles[input.dataset.toggle] = input.checked;
            });
        });

        document.querySelectorAll("[data-scenario]").forEach((button) => {
            button.addEventListener("click", () => loadScenario(button.dataset.scenario));
        });

        document.querySelectorAll("[data-action]").forEach((button) => {
            button.addEventListener("click", () => {
                const action = button.dataset.action;
                if (action === "pause") {
                    state.paused = !state.paused;
                    button.textContent = state.paused ? "Resume" : "Pause";
                } else if (action === "step") {
                    step(fixedDt);
                } else if (action === "reset") {
                    if (state.currentScenario === "game") {
                        rerollGameRoom();
                    } else {
                        loadScenario(state.currentScenario);
                    }
                } else if (action === "burst") {
                    burst();
                } else if (action === "spawn-player") {
                    spawnPlayer();
                } else if (action === "bounce-mode") {
                    enableHighBounce();
                } else if (action === "clear-world") {
                    clearEverything();
                } else if (action === "random-platforms") {
                    spawnRandomPlatforms();
                }
            });
        });

        document.querySelectorAll("[data-jump-mode]").forEach((button) => {
            button.addEventListener("click", () => {
                setJumpMode(button.dataset.jumpMode);
            });
        });

        document.querySelectorAll("[data-game-action]").forEach((button) => {
            button.addEventListener("click", () => {
                const action = button.dataset.gameAction;
                if (action === "start-run") {
                    startRun();
                } else if (action === "next-room") {
                    nextGameRoom();
                } else if (action === "reroll-room") {
                    rerollGameRoom();
                } else if (action === "end-run") {
                    endRun();
                }
            });
        });

        document.querySelectorAll("[data-room-type]").forEach((button) => {
            button.addEventListener("click", () => {
                state.game.roomType = button.dataset.roomType;
                setPressedGroup("[data-room-type]", state.game.roomType);
                if (state.game.active) {
                    rerollGameRoom();
                } else {
                    updateGameHud();
                }
            });
        });

        document.querySelectorAll("[data-room-rule]").forEach((button) => {
            button.addEventListener("click", () => {
                state.game.rule = button.dataset.roomRule;
                setPressedGroup("[data-room-rule]", state.game.rule);
                applyRoomRule(state.game.rule);
                applyBounceToBodies();
                if (state.game.active) {
                    rerollGameRoom();
                } else {
                    updateGameHud();
                }
            });
        });

        document.querySelectorAll("[data-upgrade]").forEach((button) => {
            button.addEventListener("click", () => applyUpgrade(button.dataset.upgrade));
        });

        canvas.addEventListener("click", (event) => {
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            if (event.shiftKey) {
                createBody({ shape: "box", x, y, halfWidth: 22, halfHeight: 22, mass: 1.8, restitution: state.settings.restitution, color: "#f97316" });
            } else {
                createBody({ shape: "circle", x, y, radius: 18, mass: 1.2, restitution: state.settings.restitution, color: "#38bdf8" });
            }
        });

        window.addEventListener("keydown", (event) => {
            if (event.target && ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName)) {
                return;
            }

            if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.code)) {
                event.preventDefault();
                state.keys.add(event.code);
                return;
            }

            if (event.code === "Space") {
                event.preventDefault();
                if (getPlayer()) {
                    state.keys.add("Space");
                } else {
                    state.paused = !state.paused;
                    const pauseButton = document.querySelector('[data-action="pause"]');
                    if (pauseButton) {
                        pauseButton.textContent = state.paused ? "Resume" : "Pause";
                    }
                }
            } else if (event.key.toLowerCase() === "n") {
                step(fixedDt);
            } else if (event.key.toLowerCase() === "r") {
                loadScenario(state.currentScenario);
            } else if (event.key.toLowerCase() === "p") {
                spawnPlayer();
            }
        });

        window.addEventListener("keyup", (event) => {
            if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(event.code)) {
                state.keys.delete(event.code);
            }
        });
    }

    function setPressedGroup(selector, value) {
        document.querySelectorAll(selector).forEach((button) => {
            const active = button.dataset.roomType === value || button.dataset.roomRule === value;
            button.classList.toggle("active", active);
            button.setAttribute("aria-pressed", active ? "true" : "false");
        });
    }

    function setJumpMode(mode) {
        state.jumpMode = mode;
        document.querySelectorAll("[data-jump-mode]").forEach((button) => {
            const active = button.dataset.jumpMode === mode;
            button.classList.toggle("active", active);
            button.setAttribute("aria-pressed", active ? "true" : "false");
        });

        const player = getPlayer();
        if (player) {
            player.jumpsRemaining = currentJumpLimit();
        }
    }

    resizeCanvas();
    wireControls();
    syncSettingControls();
    setJumpMode(state.jumpMode);
    loadScenario("mixed");
    window.addEventListener("resize", () => {
        resizeCanvas();
        if (state.currentScenario === "game") {
            generateGameRoom();
        } else {
            loadScenario(state.currentScenario);
        }
    });
    requestAnimationFrame(frame);
}());
