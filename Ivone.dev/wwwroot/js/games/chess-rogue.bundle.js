(function () {
    const root = document.getElementById('chess-rogue-root');
    if (!root) return;

    const BOARD_SIZE = 8;
    const MAX_FLOORS = 10;
    const INVENTORY_SIZE = 4;
    const META_KEY = 'chessRogueMeta';

    const PIECE_ORDER = ['pawn', 'knight', 'bishop', 'rook', 'queen'];

    const PIECES = {
        pawn: {
            name: 'Pawn',
            letter: 'P',
            maxHp: 12,
            attack: 1,
            rules: 'Forward one, capture diagonally. Abilities can bend movement.'
        },
        knight: {
            name: 'Knight',
            letter: 'N',
            maxHp: 14,
            attack: 2,
            rules: 'L-shaped leaps. Ignores blockers.'
        },
        bishop: {
            name: 'Bishop',
            letter: 'B',
            maxHp: 13,
            attack: 2,
            rules: 'Slides diagonally any distance.'
        },
        rook: {
            name: 'Rook',
            letter: 'R',
            maxHp: 16,
            attack: 3,
            rules: 'Slides orthogonally any distance.'
        },
        queen: {
            name: 'Queen',
            letter: 'Q',
            maxHp: 18,
            attack: 4,
            rules: 'Slides diagonally or orthogonally any distance.'
        },
        king: {
            name: 'King',
            letter: 'K',
            maxHp: 20,
            attack: 3,
            rules: 'Moves one tile any direction.'
        }
    };

    const ABILITIES = {
        double_move: {
            name: 'Double Move',
            description: 'Take two moves this turn.',
            maxCharges: 2
        },
        heal: {
            name: 'Heal',
            description: 'Restore 4 HP.',
            maxCharges: 1
        },
        diagonal_dash: {
            name: 'Diagonal Dash',
            description: 'Next move can dash two tiles diagonally through walls.',
            maxCharges: 1
        },
        clockstop: {
            name: 'Clockstop',
            description: 'Skip the enemy turn after your move.',
            maxCharges: 1
        },
        fortify: {
            name: 'Fortify',
            description: 'Gain a shield that absorbs one capture.',
            maxCharges: 1
        }
    };

    const ITEMS = {
        health_potion: {
            name: 'Health Potion',
            description: 'Restore 4 HP.'
        },
        ward_shield: {
            name: 'Ward Shield',
            description: 'Gain 1 shield.'
        },
        spark_wand: {
            name: 'Spark Wand',
            description: 'Deal 3 damage to an enemy within 3 tiles.'
        },
        smoke_bomb: {
            name: 'Smoke Bomb',
            description: 'Teleport to any empty tile.'
        },
        oil_lantern: {
            name: 'Oil Lantern',
            description: 'Reveal all traps in the room.'
        }
    };

    const ENEMY_POOL = [
        ['pawn', 'pawn', 'pawn', 'bishop'],
        ['pawn', 'bishop', 'bishop', 'rook'],
        ['bishop', 'rook', 'knight'],
        ['rook', 'rook', 'bishop', 'knight'],
        ['queen', 'rook', 'bishop'],
        ['queen', 'rook', 'bishop', 'knight'],
        ['queen', 'rook', 'bishop', 'knight']
    ];

    const state = {
        rng: Math.random,
        run: null,
        meta: null,
        selectedPiece: 'pawn',
        cells: [],
        log: [],
        targeting: null,
        timers: {
            tick: null
        }
    };

    const dom = {
        board: root.querySelector('#cr-board'),
        minimap: root.querySelector('#cr-minimap'),
        log: root.querySelector('#cr-log'),
        clearLog: root.querySelector('#cr-clear-log'),
        pieceIcon: root.querySelector('#cr-piece-icon'),
        pieceName: root.querySelector('#cr-piece-name'),
        moveRules: root.querySelector('#cr-move-rules'),
        healthBar: root.querySelector('#cr-health-bar'),
        healthText: root.querySelector('#cr-health-text'),
        inventory: root.querySelector('#cr-inventory'),
        abilities: root.querySelector('#cr-abilities'),
        floorProgress: root.querySelector('#cr-floor-progress'),
        floorProgressText: root.querySelector('#cr-floor-progress-text'),
        floorNumber: root.querySelector('#cr-floor'),
        score: root.querySelector('#cr-score'),
        time: root.querySelector('#cr-time'),
        runTag: root.querySelector('#cr-run-tag'),
        runTime: root.querySelector('#cr-run-time'),
        runFloors: root.querySelector('#cr-run-floors'),
        runEnemies: root.querySelector('#cr-run-enemies'),
        runScore: root.querySelector('#cr-run-score'),
        nearbyEnemies: root.querySelector('#cr-nearby-enemies'),
        upgrades: root.querySelector('#cr-upgrades'),
        roomStatus: root.querySelector('#cr-room-status'),
        mainMenu: root.querySelector('#cr-main-menu'),
        startRun: root.querySelector('#cr-start-run'),
        dailyRun: root.querySelector('#cr-daily-run'),
        pieceSelect: root.querySelector('#cr-piece-select'),
        accountLevel: root.querySelector('#cr-account-level'),
        accountXp: root.querySelector('#cr-account-xp'),
        accountXpText: root.querySelector('#cr-account-xp-text'),
        pauseOverlay: root.querySelector('#cr-pause-overlay'),
        pauseBtn: root.querySelector('#cr-pause'),
        resumeBtn: root.querySelector('#cr-resume'),
        exitBtn: root.querySelector('#cr-exit'),
        exitInline: root.querySelector('#cr-exit-inline'),
        upgradeOverlay: root.querySelector('#cr-upgrade-overlay'),
        upgradeChoices: root.querySelector('#cr-upgrade-choices'),
        gameOver: root.querySelector('#cr-game-over'),
        gameOverTitle: root.querySelector('#cr-game-over-title'),
        gameOverReason: root.querySelector('#cr-game-over-reason'),
        summaryScore: root.querySelector('#cr-summary-score'),
        summaryFloors: root.querySelector('#cr-summary-floors'),
        summaryEnemies: root.querySelector('#cr-summary-enemies'),
        summaryItems: root.querySelector('#cr-summary-items'),
        summaryTime: root.querySelector('#cr-summary-time'),
        summaryXp: root.querySelector('#cr-summary-xp'),
        summaryUnlocks: root.querySelector('#cr-summary-unlocks'),
        mainMenuBtn: root.querySelector('#cr-main-menu-btn'),
        newRunBtn: root.querySelector('#cr-new-run')
    };

    const upgradePool = [
        {
            id: 'max_hp',
            name: 'Reinforced Core',
            description: '+2 max HP.',
            apply: (run) => {
                run.player.maxHp += 2;
                run.player.hp += 2;
            }
        },
        {
            id: 'attack',
            name: 'Sharpened Edge',
            description: '+1 attack damage.',
            apply: (run) => {
                run.player.attack += 1;
            }
        },
        {
            id: 'ability_charge',
            name: 'Overclock',
            description: '+1 charge to a random ability.',
            apply: (run) => {
                const ability = randomChoice(run.player.abilities);
                ability.charges += 1;
                ability.maxCharges += 1;
            }
        },
        {
            id: 'relic',
            name: 'Map Scanner',
            description: 'Reveal all rooms on this floor.',
            apply: (run) => {
                Object.values(run.floor.rooms).forEach((room) => {
                    room.revealed = true;
                });
            }
        },
        {
            id: 'trap_resist',
            name: 'Shock Dampeners',
            description: 'Traps deal 1 less damage.',
            apply: (run) => {
                run.player.trapResist += 1;
            }
        },
        {
            id: 'ability_unlock',
            name: 'Arcane Circuit',
            description: 'Unlock a new ability for this run.',
            apply: (run) => {
                unlockRandomAbility(run);
            }
        }
    ];

    function defaultMeta() {
        return {
            level: 1,
            xp: 0,
            unlockedPieces: ['pawn'],
            unlockedAbilities: ['double_move', 'heal'],
            unlockedRelics: []
        };
    }

    function loadMeta() {
        try {
            const raw = localStorage.getItem(META_KEY);
            if (!raw) return defaultMeta();
            const meta = JSON.parse(raw);
            return { ...defaultMeta(), ...meta };
        } catch {
            return defaultMeta();
        }
    }

    function saveMeta() {
        localStorage.setItem(META_KEY, JSON.stringify(state.meta));
    }

    function setRng(seed) {
        if (seed === null || seed === undefined) {
            state.rng = Math.random;
            return;
        }
        let t = seed + 0x6d2b79f5;
        state.rng = function () {
            t |= 0;
            t = (t + 0x6d2b79f5) | 0;
            let r = Math.imul(t ^ (t >>> 15), 1 | t);
            r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
            return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
        };
    }

    function random() {
        return state.rng();
    }

    function randInt(min, max) {
        return Math.floor(random() * (max - min + 1)) + min;
    }

    function randomChoice(list) {
        return list[Math.floor(random() * list.length)];
    }

    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    function addLog(message) {
        state.log.unshift({ message, id: Date.now() + Math.random() });
        state.log = state.log.slice(0, 50);
        renderLog();
    }

    function renderLog() {
        dom.log.innerHTML = '';
        state.log.forEach((entry) => {
            const div = document.createElement('div');
            div.className = 'cr-log-entry';
            div.textContent = entry.message;
            dom.log.appendChild(div);
        });
    }

    function buildBoard() {
        dom.board.innerHTML = '';
        state.cells = [];
        for (let y = 0; y < BOARD_SIZE; y += 1) {
            const row = [];
            for (let x = 0; x < BOARD_SIZE; x += 1) {
                const cell = document.createElement('div');
                cell.className = `cr-cell ${(x + y) % 2 === 0 ? 'light' : ''}`;
                cell.dataset.x = x;
                cell.dataset.y = y;
                cell.addEventListener('click', () => handleCellClick(x, y));
                dom.board.appendChild(cell);
                row.push(cell);
            }
            state.cells.push(row);
        }
    }

    function handleCellClick(x, y) {
        if (!state.run || state.run.state !== 'active') return;
        if (state.run.paused) return;

        if (state.targeting) {
            handleTargeting(x, y);
            return;
        }

        if (state.run.turn.stunned) {
            addLog('You are stunned and miss a turn.');
            state.run.turn.stunned = false;
            endPlayerTurn();
            return;
        }

        const moves = getPlayerMoves();
        const move = moves.find((item) => item.x === x && item.y === y);
        if (!move) return;

        resolvePlayerMove(move);
    }

    function handleTargeting(x, y) {
        const mode = state.targeting;
        if (!mode) return;
        if (mode.type === 'spark_wand') {
            const enemy = getEnemyAt(x, y);
            if (!enemy) {
                addLog('No enemy there.');
                return;
            }
            const dist = distance(state.run.player.position, { x, y });
            if (dist > 3) {
                addLog('Target is out of range.');
                return;
            }
            enemy.hp -= 3;
            addLog(`Spark wand hits ${PIECES[enemy.type].name} for 3.`);
            if (enemy.hp <= 0) {
                removeEnemy(enemy);
                addLog(`${PIECES[enemy.type].name} disintegrated.`);
                state.run.stats.enemiesDefeated += 1;
                state.run.stats.score += 25;
            }
            if (typeof mode.itemIndex === 'number') {
                state.run.player.inventory.splice(mode.itemIndex, 1);
            }
            state.targeting = null;
            renderAll();
            endPlayerTurn();
            return;
        }

        if (mode.type === 'smoke_bomb') {
            if (!isInside(x, y) || isBlockedTile(x, y)) {
                addLog('Cannot teleport there.');
                return;
            }
            if (getEnemyAt(x, y)) {
                addLog('That tile is occupied.');
                return;
            }
            state.run.player.position = { x, y };
            addLog('Smoke bomb shifts your position.');
            if (typeof mode.itemIndex === 'number') {
                state.run.player.inventory.splice(mode.itemIndex, 1);
            }
            state.targeting = null;
            renderAll();
            endPlayerTurn();
        }
    }

    function isInside(x, y) {
        return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
    }

    function distance(a, b) {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }

    function isBlockedTile(x, y) {
        const room = getRoom();
        const tile = room.grid[y][x];
        if (tile.type === 'wall') return true;
        return false;
    }

    function getRoom() {
        return state.run.floor.rooms[state.run.currentRoom];
    }

    function getEnemyAt(x, y) {
        const room = getRoom();
        return room.enemies.find((enemy) => enemy.position.x === x && enemy.position.y === y);
    }

    function removeEnemy(enemy) {
        const room = getRoom();
        room.enemies = room.enemies.filter((entry) => entry !== enemy);
    }

    function getPlayerMoves() {
        const run = state.run;
        const pieceId = run.player.piece;
        const from = run.player.position;
        const moves = [];

        if (run.turn.dashMode) {
            const dashMoves = [
                { x: from.x + 2, y: from.y + 2 },
                { x: from.x - 2, y: from.y + 2 },
                { x: from.x + 2, y: from.y - 2 },
                { x: from.x - 2, y: from.y - 2 }
            ];
            dashMoves.forEach((pos) => {
                if (!isInside(pos.x, pos.y)) return;
                if (isBlockedTile(pos.x, pos.y)) return;
                if (getEnemyAt(pos.x, pos.y)) {
                    moves.push({ x: pos.x, y: pos.y, type: 'capture', dash: true });
                } else {
                    moves.push({ x: pos.x, y: pos.y, type: 'move', dash: true });
                }
            });
            return moves;
        }

        if (pieceId === 'pawn') {
            const forward = { x: from.x, y: from.y - 1 };
            if (isInside(forward.x, forward.y) && !isBlockedTile(forward.x, forward.y) && !getEnemyAt(forward.x, forward.y)) {
                moves.push({ x: forward.x, y: forward.y, type: 'move' });
            }
            const captures = [
                { x: from.x - 1, y: from.y - 1 },
                { x: from.x + 1, y: from.y - 1 }
            ];
            captures.forEach((pos) => {
                if (!isInside(pos.x, pos.y)) return;
                if (getEnemyAt(pos.x, pos.y)) {
                    moves.push({ x: pos.x, y: pos.y, type: 'capture' });
                }
            });
        }

        if (pieceId === 'knight') {
            const jumps = [
                { x: from.x + 1, y: from.y + 2 },
                { x: from.x + 2, y: from.y + 1 },
                { x: from.x - 1, y: from.y + 2 },
                { x: from.x - 2, y: from.y + 1 },
                { x: from.x + 1, y: from.y - 2 },
                { x: from.x + 2, y: from.y - 1 },
                { x: from.x - 1, y: from.y - 2 },
                { x: from.x - 2, y: from.y - 1 }
            ];
            jumps.forEach((pos) => {
                if (!isInside(pos.x, pos.y) || isBlockedTile(pos.x, pos.y)) return;
                const enemy = getEnemyAt(pos.x, pos.y);
                if (enemy) {
                    moves.push({ x: pos.x, y: pos.y, type: 'capture' });
                } else {
                    moves.push({ x: pos.x, y: pos.y, type: 'move' });
                }
            });
        }

        if (pieceId === 'bishop' || pieceId === 'rook' || pieceId === 'queen') {
            const directions = [];
            if (pieceId === 'bishop' || pieceId === 'queen') {
                directions.push(
                    { x: 1, y: 1 },
                    { x: -1, y: 1 },
                    { x: 1, y: -1 },
                    { x: -1, y: -1 }
                );
            }
            if (pieceId === 'rook' || pieceId === 'queen') {
                directions.push(
                    { x: 1, y: 0 },
                    { x: -1, y: 0 },
                    { x: 0, y: 1 },
                    { x: 0, y: -1 }
                );
            }
            directions.forEach((dir) => {
                let step = 1;
                while (step < BOARD_SIZE) {
                    const x = from.x + dir.x * step;
                    const y = from.y + dir.y * step;
                    if (!isInside(x, y)) break;
                    if (isBlockedTile(x, y)) break;
                    const enemy = getEnemyAt(x, y);
                    if (enemy) {
                        moves.push({ x, y, type: 'capture' });
                        break;
                    }
                    moves.push({ x, y, type: 'move' });
                    step += 1;
                }
            });
        }

        if (pieceId === 'king') {
            const steps = [
                { x: 1, y: 0 },
                { x: -1, y: 0 },
                { x: 0, y: 1 },
                { x: 0, y: -1 },
                { x: 1, y: 1 },
                { x: 1, y: -1 },
                { x: -1, y: 1 },
                { x: -1, y: -1 }
            ];
            steps.forEach((dir) => {
                const x = from.x + dir.x;
                const y = from.y + dir.y;
                if (!isInside(x, y) || isBlockedTile(x, y)) return;
                const enemy = getEnemyAt(x, y);
                if (enemy) {
                    moves.push({ x, y, type: 'capture' });
                } else {
                    moves.push({ x, y, type: 'move' });
                }
            });
        }

        return moves;
    }

    function resolvePlayerMove(move) {
        const run = state.run;
        const targetEnemy = getEnemyAt(move.x, move.y);

        if (targetEnemy) {
            const damage = run.player.attack;
            targetEnemy.hp -= damage;
            addLog(`You strike ${PIECES[targetEnemy.type].name} for ${damage}.`);
            if (targetEnemy.hp <= 0) {
                removeEnemy(targetEnemy);
                run.player.position = { x: move.x, y: move.y };
                run.stats.enemiesDefeated += 1;
                run.stats.score += 25;
                addLog(`${PIECES[targetEnemy.type].name} captured.`);
            } else {
                addLog(`${PIECES[targetEnemy.type].name} holds its ground.`);
                if (!applyPlayerDamage(1)) {
                    return;
                }
            }
        } else {
            run.player.position = { x: move.x, y: move.y };
        }

        if (move.dash) {
            run.turn.dashMode = false;
        }

        run.stats.moves += 1;
        run.stats.score += 2;

        handleTileEffects(move.x, move.y);

        if (run.turn.extraMoves > 0) {
            run.turn.extraMoves -= 1;
            renderAll();
            return;
        }

        endPlayerTurn();
    }

    function handleTileEffects(x, y) {
        const room = getRoom();
        const tile = room.grid[y][x];
        if (tile.type === 'trap' && !tile.triggered) {
            tile.triggered = true;
            const damage = Math.max(1, 3 - state.run.player.trapResist);
            addLog(`Trap triggers! You take ${damage} damage and are stunned.`);
            applyPlayerDamage(damage);
            state.run.turn.stunned = true;
        }

        if (tile.type === 'door') {
            transitionToRoom(tile.target);
            return;
        }

        if (tile.type === 'exit') {
            advanceFloor();
            return;
        }

        const itemIndex = room.items.findIndex((item) => item.position.x === x && item.position.y === y);
        if (itemIndex >= 0) {
            const item = room.items[itemIndex];
            room.items.splice(itemIndex, 1);
            addItem(item.id);
        }
    }

    function applyPlayerDamage(amount) {
        const run = state.run;
        if (run.player.shield > 0) {
            run.player.shield -= 1;
            addLog('Shield absorbs the hit.');
            return true;
        }
        run.player.hp -= amount;
        if (run.player.hp <= 0) {
            run.player.hp = 0;
            triggerGameOver('Captured', `Your ${PIECES[run.player.piece].name} fell on Floor ${run.floorIndex}.`);
            return false;
        }
        return true;
    }

    function endPlayerTurn() {
        if (state.run.turn.skipEnemy) {
            state.run.turn.skipEnemy = false;
            renderAll();
            checkRoomClear();
            return;
        }
        enemyTurn();
    }

    function enemyTurn() {
        const room = getRoom();
        const run = state.run;
        const enemies = [...room.enemies];
        for (const enemy of enemies) {
            const move = decideEnemyMove(enemy);
            if (!move) continue;
            if (move.capturePlayer) {
                if (run.player.shield > 0) {
                    run.player.shield -= 1;
                    addLog(`${PIECES[enemy.type].name} capture blocked by shield.`);
                    enemy.position = move.from;
                } else {
                    triggerGameOver('Captured', `An enemy ${PIECES[enemy.type].name} captured you on Floor ${run.floorIndex}.`);
                    return;
                }
            } else {
                enemy.position = move.to;
            }
        }

        run.turn = createTurnState();
        renderAll();
        checkRoomClear();
    }

    function decideEnemyMove(enemy) {
        const playerPos = state.run.player.position;
        const from = enemy.position;
        const captureMoves = getEnemyMoves(enemy, true);
        const capture = captureMoves.find((move) => move.x === playerPos.x && move.y === playerPos.y);
        if (capture) {
            return { capturePlayer: true, from: { ...from }, to: { x: playerPos.x, y: playerPos.y } };
        }

        const moves = getEnemyMoves(enemy, false).filter((move) => !getEnemyAt(move.x, move.y));
        if (!moves.length) return null;
        let best = moves[0];
        let bestScore = distance(best, playerPos);
        for (const move of moves) {
            const score = distance(move, playerPos);
            if (score < bestScore) {
                best = move;
                bestScore = score;
            }
        }
        return { capturePlayer: false, from: { ...from }, to: { x: best.x, y: best.y } };
    }

    function getEnemyMoves(enemy, allowCaptureOnly) {
        const moves = [];
        const from = enemy.position;
        const pieceId = enemy.type;
        const playerPos = state.run.player.position;

        if (pieceId === 'pawn') {
            const dirY = Math.sign(playerPos.y - from.y) || 1;
            const forward = { x: from.x, y: from.y + dirY };
            if (!allowCaptureOnly && isInside(forward.x, forward.y) && !isBlockedTile(forward.x, forward.y) && !getEnemyAt(forward.x, forward.y)) {
                moves.push({ x: forward.x, y: forward.y });
            }
            const captures = [
                { x: from.x - 1, y: from.y + dirY },
                { x: from.x + 1, y: from.y + dirY }
            ];
            captures.forEach((pos) => {
                if (!isInside(pos.x, pos.y)) return;
                if (playerPos.x === pos.x && playerPos.y === pos.y) {
                    moves.push({ x: pos.x, y: pos.y });
                }
            });
        }

        if (pieceId === 'knight') {
            const jumps = [
                { x: from.x + 1, y: from.y + 2 },
                { x: from.x + 2, y: from.y + 1 },
                { x: from.x - 1, y: from.y + 2 },
                { x: from.x - 2, y: from.y + 1 },
                { x: from.x + 1, y: from.y - 2 },
                { x: from.x + 2, y: from.y - 1 },
                { x: from.x - 1, y: from.y - 2 },
                { x: from.x - 2, y: from.y - 1 }
            ];
            jumps.forEach((pos) => {
                if (!isInside(pos.x, pos.y) || isBlockedTile(pos.x, pos.y)) return;
                moves.push({ x: pos.x, y: pos.y });
            });
        }

        if (pieceId === 'bishop' || pieceId === 'rook' || pieceId === 'queen') {
            const directions = [];
            if (pieceId === 'bishop' || pieceId === 'queen') {
                directions.push(
                    { x: 1, y: 1 },
                    { x: -1, y: 1 },
                    { x: 1, y: -1 },
                    { x: -1, y: -1 }
                );
            }
            if (pieceId === 'rook' || pieceId === 'queen') {
                directions.push(
                    { x: 1, y: 0 },
                    { x: -1, y: 0 },
                    { x: 0, y: 1 },
                    { x: 0, y: -1 }
                );
            }
            directions.forEach((dir) => {
                let step = 1;
                while (step < BOARD_SIZE) {
                    const x = from.x + dir.x * step;
                    const y = from.y + dir.y * step;
                    if (!isInside(x, y)) break;
                    if (isBlockedTile(x, y)) break;
                    moves.push({ x, y });
                    if (playerPos.x === x && playerPos.y === y) break;
                    if (getEnemyAt(x, y)) break;
                    step += 1;
                }
            });
        }

        if (pieceId === 'king') {
            const steps = [
                { x: 1, y: 0 },
                { x: -1, y: 0 },
                { x: 0, y: 1 },
                { x: 0, y: -1 },
                { x: 1, y: 1 },
                { x: 1, y: -1 },
                { x: -1, y: 1 },
                { x: -1, y: -1 }
            ];
            steps.forEach((dir) => {
                const x = from.x + dir.x;
                const y = from.y + dir.y;
                if (!isInside(x, y) || isBlockedTile(x, y)) return;
                moves.push({ x, y });
            });
        }

        return moves;
    }

    function checkRoomClear() {
        const room = getRoom();
        if (room.enemies.length > 0) return;
        if (!room.cleared) {
            room.cleared = true;
            state.run.stats.roomsCleared += 1;
            state.run.abilityPoints += 1;
            addLog('Room cleared. You gain 1 ability point.');
            dropRoomLoot(room);
            offerUpgrades();
        }

        if (room.isExitRoom && !room.exitUnlocked) {
            room.exitUnlocked = true;
            placeExit(room);
            addLog('The exit hums to life.');
        }
    }

    function dropRoomLoot(room) {
        if (room.lootDropped) return;
        room.lootDropped = true;
        const chance = random();
        if (chance < 0.6) {
            const empty = findRandomEmptyTile(room);
            if (empty) {
                const itemKeys = Object.keys(ITEMS);
                const itemId = randomChoice(itemKeys);
                room.items.push({ id: itemId, position: empty });
                addLog(`You spot a ${ITEMS[itemId].name}.`);
            }
        }
    }

    function placeExit(room) {
        const empty = findRandomEmptyTile(room);
        if (!empty) return;
        room.grid[empty.y][empty.x] = { type: 'exit' };
    }

    function offerUpgrades() {
        const run = state.run;
        const choices = [];
        const pool = [...upgradePool];
        while (choices.length < 3 && pool.length) {
            const pick = pool.splice(randInt(0, pool.length - 1), 1)[0];
            choices.push(pick);
        }
        if (!choices.length) return;

        dom.upgradeChoices.innerHTML = '';
        choices.forEach((choice) => {
            const card = document.createElement('div');
            card.className = 'cr-upgrade-card';
            const title = document.createElement('h3');
            title.textContent = choice.name;
            const desc = document.createElement('p');
            desc.className = 'cr-muted';
            desc.textContent = choice.description;
            const button = document.createElement('button');
            button.className = 'cr-btn primary';
            button.textContent = 'Select';
            button.addEventListener('click', () => {
                choice.apply(run);
                dom.upgradeOverlay.classList.add('hidden');
                renderAll();
            });
            card.appendChild(title);
            card.appendChild(desc);
            card.appendChild(button);
            dom.upgradeChoices.appendChild(card);
        });

        dom.upgradeOverlay.classList.remove('hidden');
    }

    function unlockRandomAbility(run) {
        const available = Object.keys(ABILITIES).filter((id) => !run.player.abilities.some((ab) => ab.id === id));
        if (!available.length) return;
        const id = randomChoice(available);
        run.player.abilities.push({ id, charges: ABILITIES[id].maxCharges, maxCharges: ABILITIES[id].maxCharges });
        addLog(`${ABILITIES[id].name} unlocked.`);
    }

    function addItem(itemId) {
        const run = state.run;
        if (run.player.inventory.length >= INVENTORY_SIZE) {
            run.player.inventory.shift();
            addLog('Inventory full. Oldest item discarded.');
        }
        run.player.inventory.push(itemId);
        run.stats.itemsCollected += 1;
        run.stats.score += 15;
        addLog(`${ITEMS[itemId].name} collected.`);
        renderInventory();
    }

    function useItem(index) {
        const run = state.run;
        const itemId = run.player.inventory[index];
        if (!itemId) return;

        if (itemId === 'health_potion') {
            run.player.hp = Math.min(run.player.maxHp, run.player.hp + 4);
            addLog('You feel restored.');
        }
        if (itemId === 'ward_shield') {
            run.player.shield += 1;
            addLog('A warding shield forms.');
        }
        if (itemId === 'spark_wand') {
            state.targeting = { type: 'spark_wand', itemIndex: index };
            addLog('Select a target for Spark Wand.');
            renderAll();
            return;
        }
        if (itemId === 'smoke_bomb') {
            state.targeting = { type: 'smoke_bomb', itemIndex: index };
            addLog('Select a tile to teleport.');
            renderAll();
            return;
        }
        if (itemId === 'oil_lantern') {
            const room = getRoom();
            room.grid.forEach((row) => {
                row.forEach((tile) => {
                    if (tile.type === 'trap') {
                        tile.revealed = true;
                    }
                });
            });
            addLog('Hidden traps revealed.');
        }

        run.player.inventory.splice(index, 1);
        renderAll();
        endPlayerTurn();
    }

    function useAbility(id) {
        const run = state.run;
        const ability = run.player.abilities.find((entry) => entry.id === id);
        if (!ability || ability.charges <= 0) return;
        if (state.targeting) return;
        ability.charges -= 1;

        if (id === 'double_move') {
            run.turn.extraMoves += 1;
            addLog('Double Move activated.');
        }
        if (id === 'heal') {
            run.player.hp = Math.min(run.player.maxHp, run.player.hp + 4);
            addLog('Self repair engaged.');
        }
        if (id === 'diagonal_dash') {
            run.turn.dashMode = true;
            addLog('Diagonal Dash ready.');
        }
        if (id === 'clockstop') {
            run.turn.skipEnemy = true;
            addLog('Clockstop will skip the next enemy turn.');
        }
        if (id === 'fortify') {
            run.player.shield += 1;
            addLog('Fortify grants a shield.');
        }

        renderAll();
    }

    function createTurnState() {
        return {
            extraMoves: 0,
            dashMode: false,
            skipEnemy: false,
            stunned: false
        };
    }

    function transitionToRoom(targetId) {
        const run = state.run;
        if (!run.floor.rooms[targetId]) return;
        const originId = run.currentRoom;
        run.currentRoom = targetId;
        const room = getRoom();
        if (!room.visited) {
            room.visited = true;
            addLog('You step into a new room.');
        } else {
            addLog('You return to a previous chamber.');
        }
        const doorSpawn = room.doors[originId];
        const spawn = doorSpawn ? { ...doorSpawn } : room.spawn || { x: 3, y: 6 };
        run.player.position = { ...spawn };
        renderAll();
    }

    function advanceFloor() {
        const run = state.run;
        run.floorIndex += 1;
        run.stats.floorsCleared += 1;
        run.stats.score += 100;
        if (run.floorIndex > MAX_FLOORS) {
            triggerGameOver('Victory', 'You conquered the Clockwork Citadel.');
            return;
        }
        addLog(`Floor ${run.floorIndex} begins.`);
        run.floor = generateFloor(run.floorIndex);
        run.currentRoom = run.floor.startRoom;
        const room = getRoom();
        room.visited = true;
        run.player.position = { ...room.spawn };
        renderAll();
    }

    function triggerGameOver(title, reason) {
        stopTimer();
        state.run.state = 'ended';
        dom.gameOverTitle.textContent = title;
        dom.gameOverReason.textContent = reason;
        dom.summaryScore.textContent = state.run.stats.score;
        dom.summaryFloors.textContent = state.run.stats.floorsCleared;
        dom.summaryEnemies.textContent = state.run.stats.enemiesDefeated;
        dom.summaryItems.textContent = state.run.stats.itemsCollected;
        dom.summaryTime.textContent = formatTime(state.run.stats.time);
        const xpGain = calculateXpGain(state.run.stats);
        dom.summaryXp.textContent = xpGain;
        const unlockMessages = applyMetaProgression(xpGain);
        dom.summaryUnlocks.textContent = unlockMessages.length ? unlockMessages.join(' ') : 'No new unlocks.';
        dom.gameOver.classList.remove('hidden');
        dom.pauseOverlay.classList.add('hidden');
        dom.upgradeOverlay.classList.add('hidden');
    }

    function calculateXpGain(stats) {
        return stats.floorsCleared * 40 + stats.enemiesDefeated * 10 + stats.itemsCollected * 5;
    }

    function applyMetaProgression(xpGain) {
        const unlocks = [];
        state.meta.xp += xpGain;
        let nextLevelXp = 100 + (state.meta.level - 1) * 35;
        while (state.meta.xp >= nextLevelXp) {
            state.meta.xp -= nextLevelXp;
            state.meta.level += 1;
            unlocks.push(`Level ${state.meta.level} reached.`);
            const pieceUnlock = pieceUnlockForLevel(state.meta.level);
            if (pieceUnlock && !state.meta.unlockedPieces.includes(pieceUnlock)) {
                state.meta.unlockedPieces.push(pieceUnlock);
                unlocks.push(`${PIECES[pieceUnlock].name} unlocked.`);
            }
            const abilityUnlock = abilityUnlockForLevel(state.meta.level);
            if (abilityUnlock && !state.meta.unlockedAbilities.includes(abilityUnlock)) {
                state.meta.unlockedAbilities.push(abilityUnlock);
                unlocks.push(`${ABILITIES[abilityUnlock].name} unlocked.`);
            }
            nextLevelXp = 100 + (state.meta.level - 1) * 35;
        }
        saveMeta();
        updateMetaUI();
        return unlocks;
    }

    function pieceUnlockForLevel(level) {
        if (level >= 10) return 'queen';
        if (level >= 7) return 'rook';
        if (level >= 5) return 'bishop';
        if (level >= 3) return 'knight';
        return null;
    }

    function abilityUnlockForLevel(level) {
        if (level >= 6) return 'clockstop';
        if (level >= 4) return 'diagonal_dash';
        if (level >= 2) return 'fortify';
        return null;
    }

    function generateFloor(floorIndex) {
        const roomCount = Math.min(9, 4 + Math.ceil(floorIndex * 0.7));
        const rooms = {};
        const positions = {};
        const coordLookup = {};
        const startId = 'room-0';
        positions[startId] = { x: 3, y: 3 };
        coordLookup['3,3'] = startId;
        rooms[startId] = createRoom(startId, floorIndex, false);

        let created = 1;
        while (created < roomCount) {
            const parentId = randomChoice(Object.keys(rooms));
            const parentPos = positions[parentId];
            const dirs = [
                { x: 1, y: 0 },
                { x: -1, y: 0 },
                { x: 0, y: 1 },
                { x: 0, y: -1 }
            ];
            const dir = randomChoice(dirs);
            const nx = parentPos.x + dir.x;
            const ny = parentPos.y + dir.y;
            const key = `${nx},${ny}`;
            if (coordLookup[key]) continue;
            const id = `room-${created}`;
            positions[id] = { x: nx, y: ny };
            coordLookup[key] = id;
            rooms[id] = createRoom(id, floorIndex, false);
            created += 1;
        }

        Object.entries(positions).forEach(([id, pos]) => {
            const neighbors = [];
            const dirs = [
                { x: 1, y: 0 },
                { x: -1, y: 0 },
                { x: 0, y: 1 },
                { x: 0, y: -1 }
            ];
            dirs.forEach((dir) => {
                const key = `${pos.x + dir.x},${pos.y + dir.y}`;
                if (coordLookup[key]) {
                    neighbors.push(coordLookup[key]);
                }
            });
            rooms[id].neighbors = neighbors;
        });

        Object.entries(positions).forEach(([id, pos]) => {
            rooms[id].mapPosition = { x: pos.x, y: pos.y };
        });

        const exitRoom = pickFarthestRoom(startId, positions);
        rooms[exitRoom].isExitRoom = true;
        rooms[exitRoom].enemies.push(createBossEnemy(floorIndex));

        Object.values(rooms).forEach((room) => {
            placeDoors(room, rooms, positions);
        });

        const floor = {
            index: floorIndex,
            rooms,
            startRoom: startId,
            exitRoom,
            positions
        };

        return floor;
    }

    function pickFarthestRoom(startId, positions) {
        const startPos = positions[startId];
        let farthest = startId;
        let maxDist = 0;
        Object.entries(positions).forEach(([id, pos]) => {
            const dist = Math.abs(pos.x - startPos.x) + Math.abs(pos.y - startPos.y);
            if (dist > maxDist) {
                maxDist = dist;
                farthest = id;
            }
        });
        return farthest;
    }

    function createRoom(id, floorIndex, isExit) {
        const grid = [];
        for (let y = 0; y < BOARD_SIZE; y += 1) {
            const row = [];
            for (let x = 0; x < BOARD_SIZE; x += 1) {
                row.push({ type: 'floor' });
            }
            grid.push(row);
        }

        const room = {
            id,
            grid,
            enemies: [],
            items: [],
            neighbors: [],
            doors: {},
            isExitRoom: isExit,
            exitUnlocked: false,
            visited: false,
            cleared: false,
            lootDropped: false,
            spawn: { x: 3, y: 6 },
            revealed: false
        };

        addWalls(room);
        addTraps(room, floorIndex);
        spawnEnemies(room, floorIndex);

        return room;
    }

    function addWalls(room) {
        const wallCount = randInt(6, 10);
        for (let i = 0; i < wallCount; i += 1) {
            const pos = findRandomEmptyTile(room);
            if (!pos) continue;
            room.grid[pos.y][pos.x] = { type: 'wall' };
        }
    }

    function addTraps(room, floorIndex) {
        const trapCount = Math.min(3, 1 + Math.floor(floorIndex / 3));
        for (let i = 0; i < trapCount; i += 1) {
            const pos = findRandomEmptyTile(room);
            if (!pos) continue;
            room.grid[pos.y][pos.x] = { type: 'trap', triggered: false, revealed: false };
        }
    }

    function spawnEnemies(room, floorIndex) {
        const count = Math.min(6, 2 + Math.floor(floorIndex / 2));
        for (let i = 0; i < count; i += 1) {
            const type = randomChoice(ENEMY_POOL[Math.min(ENEMY_POOL.length - 1, floorIndex - 1)]);
            const enemy = createEnemy(type, floorIndex);
            const pos = findRandomEmptyTile(room);
            if (!pos) continue;
            enemy.position = pos;
            room.enemies.push(enemy);
        }
    }

    function createEnemy(type, floorIndex) {
        const base = PIECES[type];
        const hp = base.maxHp ? Math.max(2, Math.floor(base.maxHp / 4) + Math.floor(floorIndex / 2)) : 4;
        return {
            id: `${type}-${Date.now()}-${Math.random()}`,
            type,
            hp,
            maxHp: hp,
            position: { x: 0, y: 0 }
        };
    }

    function createBossEnemy(floorIndex) {
        const type = floorIndex < 4 ? 'rook' : floorIndex < 7 ? 'queen' : 'king';
        const enemy = createEnemy(type, floorIndex + 2);
        enemy.hp += 4;
        enemy.maxHp += 4;
        return enemy;
    }

    function placeDoors(room, rooms, positions) {
        room.neighbors.forEach((neighborId) => {
            const posA = positions[room.id];
            const posB = positions[neighborId];
            const dx = posB.x - posA.x;
            const dy = posB.y - posA.y;
            let doorPos = { x: 3, y: 0 };
            if (dx === 1) doorPos = { x: BOARD_SIZE - 1, y: 3 };
            if (dx === -1) doorPos = { x: 0, y: 3 };
            if (dy === 1) doorPos = { x: 3, y: BOARD_SIZE - 1 };
            if (dy === -1) doorPos = { x: 3, y: 0 };
            room.grid[doorPos.y][doorPos.x] = { type: 'door', target: neighborId };
            room.doors[neighborId] = doorPos;
        });
    }

    function findRandomEmptyTile(room) {
        const candidates = [];
        for (let y = 0; y < BOARD_SIZE; y += 1) {
            for (let x = 0; x < BOARD_SIZE; x += 1) {
                const tile = room.grid[y][x];
                if (tile.type !== 'floor') continue;
                if (room.spawn && room.spawn.x === x && room.spawn.y === y) continue;
                if (room.enemies.some((enemy) => enemy.position.x === x && enemy.position.y === y)) continue;
                candidates.push({ x, y });
            }
        }
        if (!candidates.length) return null;
        return randomChoice(candidates);
    }

    function startRun(seed) {
        state.run = {
            state: 'active',
            floorIndex: 1,
            floor: generateFloor(1),
            currentRoom: null,
            player: createPlayer(state.selectedPiece),
            stats: {
                score: 0,
                time: 0,
                enemiesDefeated: 0,
                itemsCollected: 0,
                floorsCleared: 0,
                roomsCleared: 0,
                moves: 0
            },
            abilityPoints: 0,
            paused: false,
            turn: createTurnState()
        };

        state.run.currentRoom = state.run.floor.startRoom;
        const room = getRoom();
        room.visited = true;
        state.run.player.position = { ...room.spawn };
        addLog('Run begins.');
        dom.mainMenu.classList.add('hidden');
        dom.gameOver.classList.add('hidden');
        dom.upgradeOverlay.classList.add('hidden');
        dom.pauseOverlay.classList.add('hidden');
        dom.runTag.textContent = seed ? 'Daily Run Active' : 'Run Active';
        startTimer();
        renderAll();
    }

    function createPlayer(pieceId) {
        const base = PIECES[pieceId];
        const abilities = state.meta.unlockedAbilities.map((id) => ({
            id,
            charges: ABILITIES[id].maxCharges,
            maxCharges: ABILITIES[id].maxCharges
        }));
        return {
            piece: pieceId,
            hp: base.maxHp,
            maxHp: base.maxHp,
            attack: base.attack,
            position: { x: 3, y: 6 },
            inventory: [],
            abilities,
            shield: 0,
            trapResist: 0
        };
    }

    function startTimer() {
        stopTimer();
        state.timers.tick = setInterval(() => {
            if (!state.run || state.run.state !== 'active') return;
            if (state.run.paused) return;
            state.run.stats.time += 1;
            renderTopStats();
        }, 1000);
    }

    function stopTimer() {
        if (state.timers.tick) {
            clearInterval(state.timers.tick);
            state.timers.tick = null;
        }
    }

    function renderAll() {
        if (!state.run) {
            renderMeta();
            return;
        }
        renderTopStats();
        renderPlayerPanel();
        renderInventory();
        renderAbilities();
        renderBoard();
        renderMinimap();
        renderNearbyEnemies();
        renderUpgradesPanel();
        renderRoomStatus();
    }

    function renderTopStats() {
        const run = state.run;
        dom.floorNumber.textContent = run ? run.floorIndex : 0;
        dom.score.textContent = run ? run.stats.score : 0;
        dom.time.textContent = run ? formatTime(run.stats.time) : '0:00';
        dom.runTime.textContent = run ? formatTime(run.stats.time) : '0:00';
        dom.runFloors.textContent = run ? `${run.floorIndex}/${MAX_FLOORS}` : `0/${MAX_FLOORS}`;
        dom.runEnemies.textContent = run ? run.stats.enemiesDefeated : 0;
        dom.runScore.textContent = run ? run.stats.score : 0;
    }

    function renderPlayerPanel() {
        const run = state.run;
        const piece = PIECES[run.player.piece];
        dom.pieceIcon.textContent = piece.letter;
        dom.pieceName.textContent = piece.name;
        dom.moveRules.textContent = piece.rules;
        const hpPct = Math.max(0, (run.player.hp / run.player.maxHp) * 100);
        dom.healthBar.style.width = `${hpPct}%`;
        dom.healthText.textContent = `${run.player.hp} / ${run.player.maxHp}`;

        const visitedRooms = Object.values(run.floor.rooms).filter((room) => room.visited).length;
        const totalRooms = Object.keys(run.floor.rooms).length;
        const progress = Math.round((visitedRooms / totalRooms) * 100);
        dom.floorProgress.style.width = `${progress}%`;
        dom.floorProgressText.textContent = `Explore: ${progress}%`;
    }

    function renderInventory() {
        const run = state.run;
        dom.inventory.innerHTML = '';
        for (let i = 0; i < INVENTORY_SIZE; i += 1) {
            const slot = document.createElement('div');
            slot.className = 'cr-slot';
            const itemId = run.player.inventory[i];
            if (itemId) {
                slot.classList.add('filled');
                slot.textContent = ITEMS[itemId].name;
                slot.title = ITEMS[itemId].description;
                slot.addEventListener('click', () => useItem(i));
            } else {
                slot.textContent = 'Empty';
            }
            dom.inventory.appendChild(slot);
        }
    }

    function renderAbilities() {
        const run = state.run;
        dom.abilities.innerHTML = '';
        run.player.abilities.forEach((ability) => {
            const def = ABILITIES[ability.id];
            const row = document.createElement('div');
            row.className = 'cr-ability';
            const label = document.createElement('div');
            const name = document.createElement('div');
            name.className = 'cr-ability-name';
            name.textContent = def.name;
            const desc = document.createElement('div');
            desc.className = 'cr-muted';
            desc.textContent = def.description;
            label.appendChild(name);
            label.appendChild(desc);
            const badge = document.createElement('span');
            badge.className = 'cr-badge';
            badge.textContent = `${ability.charges}/${ability.maxCharges}`;
            const button = document.createElement('button');
            button.className = 'cr-btn ghost';
            button.textContent = 'Use';
            button.disabled = ability.charges <= 0;
            button.addEventListener('click', () => useAbility(ability.id));
            row.appendChild(label);
            row.appendChild(badge);
            row.appendChild(button);
            dom.abilities.appendChild(row);
        });
    }

    function renderBoard() {
        const run = state.run;
        const room = getRoom();
        const moves = run.state === 'active' ? getPlayerMoves() : [];
        for (let y = 0; y < BOARD_SIZE; y += 1) {
            for (let x = 0; x < BOARD_SIZE; x += 1) {
                const cell = state.cells[y][x];
                cell.className = `cr-cell ${(x + y) % 2 === 0 ? 'light' : ''}`;
                cell.textContent = '';
                const tile = room.grid[y][x];
                if (tile.type === 'wall') cell.classList.add('is-wall');
                if (tile.type === 'trap' && (tile.revealed || tile.triggered)) cell.classList.add('is-trap');
                if (tile.type === 'door') cell.classList.add('is-door');
                if (tile.type === 'exit') cell.classList.add('is-exit');
                if (tile.type === 'trap' && tile.revealed) cell.textContent = '!';
                if (tile.type === 'door') cell.textContent = '>';
                if (tile.type === 'exit') cell.textContent = 'X';

                const enemy = getEnemyAt(x, y);
                if (enemy) {
                    cell.classList.add('has-enemy');
                    cell.textContent = PIECES[enemy.type].letter;
                }

                if (run.player.position.x === x && run.player.position.y === y) {
                    cell.classList.add('has-player');
                    cell.textContent = PIECES[run.player.piece].letter;
                }

                const item = room.items.find((entry) => entry.position.x === x && entry.position.y === y);
                if (item && !enemy && !(run.player.position.x === x && run.player.position.y === y)) {
                    cell.textContent = 'I';
                }

                const move = moves.find((entry) => entry.x === x && entry.y === y);
                if (move) {
                    cell.classList.add(move.type === 'capture' ? 'is-capture' : 'is-move');
                }

                if (state.targeting) {
                    if (state.targeting.type === 'spark_wand') {
                        if (distance(run.player.position, { x, y }) <= 3 && enemy) {
                            cell.classList.add('is-capture');
                        }
                    }
                    if (state.targeting.type === 'smoke_bomb') {
                        if (!isBlockedTile(x, y) && !enemy) {
                            cell.classList.add('is-move');
                        }
                    }
                }
            }
        }
    }

    function renderMinimap() {
        const run = state.run;
        dom.minimap.innerHTML = '';
        const positions = Object.values(run.floor.rooms).map((room) => ({
            id: room.id,
            x: room.mapPosition.x,
            y: room.mapPosition.y
        }));
        const minX = Math.min(...positions.map((p) => p.x));
        const minY = Math.min(...positions.map((p) => p.y));
        const maxX = Math.max(...positions.map((p) => p.x));
        const maxY = Math.max(...positions.map((p) => p.y));
        const width = maxX - minX + 1;
        dom.minimap.style.gridTemplateColumns = `repeat(${width}, 1fr)`;

        const map = {};
        positions.forEach((pos) => {
            map[`${pos.x},${pos.y}`] = pos.id;
        });

        for (let y = minY; y <= maxY; y += 1) {
            for (let x = minX; x <= maxX; x += 1) {
                const cell = document.createElement('div');
                const id = map[`${x},${y}`];
                if (id) {
                    const room = run.floor.rooms[id];
                    cell.className = 'cr-mini-room';
                    if (room.visited || room.revealed) cell.classList.add('visited');
                    if (id === run.currentRoom) cell.classList.add('current');
                    if (id === run.floor.exitRoom) cell.classList.add('exit');
                } else {
                    cell.className = 'cr-mini-room';
                    cell.style.opacity = '0';
                }
                dom.minimap.appendChild(cell);
            }
        }
    }

    function calculateMinimapPositions(rooms) {
        return Object.values(rooms).map((room) => ({
            id: room.id,
            x: room.mapPosition.x,
            y: room.mapPosition.y
        }));
    }

    function renderNearbyEnemies() {
        const room = getRoom();
        dom.nearbyEnemies.innerHTML = '';
        if (!room.enemies.length) {
            const empty = document.createElement('div');
            empty.className = 'cr-muted';
            empty.textContent = 'No threats detected.';
            dom.nearbyEnemies.appendChild(empty);
            return;
        }
        const playerPos = state.run.player.position;
        const sorted = [...room.enemies].sort((a, b) => distance(a.position, playerPos) - distance(b.position, playerPos));
        sorted.slice(0, 4).forEach((enemy) => {
            const row = document.createElement('div');
            row.className = 'cr-enemy-item';
            const label = document.createElement('div');
            label.textContent = PIECES[enemy.type].name;
            const dist = document.createElement('span');
            dist.className = 'cr-badge';
            dist.textContent = `${distance(enemy.position, playerPos)} tiles`;
            row.appendChild(label);
            row.appendChild(dist);
            dom.nearbyEnemies.appendChild(row);
        });
    }

    function renderUpgradesPanel() {
        const run = state.run;
        dom.upgrades.innerHTML = '';
        const points = document.createElement('div');
        points.className = 'cr-upgrade-item';
        points.textContent = `Ability Points: ${run.abilityPoints}`;
        dom.upgrades.appendChild(points);

        const evolution = nextEvolution(run.player.piece);
        if (evolution && run.abilityPoints >= 3) {
            const card = document.createElement('div');
            card.className = 'cr-upgrade-item';
            const label = document.createElement('div');
            label.textContent = `Evolve to ${PIECES[evolution].name}`;
            const button = document.createElement('button');
            button.className = 'cr-btn ghost';
            button.textContent = 'Evolve';
            button.addEventListener('click', () => {
                run.abilityPoints -= 3;
                run.player.piece = evolution;
                run.player.maxHp += 2;
                run.player.hp = Math.min(run.player.maxHp, run.player.hp + 2);
                run.player.attack += 1;
                addLog(`Evolution complete: ${PIECES[evolution].name}.`);
                renderAll();
            });
            card.appendChild(label);
            card.appendChild(button);
            dom.upgrades.appendChild(card);
        }
    }

    function renderRoomStatus() {
        const room = getRoom();
        const status = room.cleared ? 'Room cleared.' : `${room.enemies.length} enemy signals detected.`;
        dom.roomStatus.textContent = status;
    }

    function nextEvolution(pieceId) {
        const index = PIECE_ORDER.indexOf(pieceId);
        if (index === -1 || index === PIECE_ORDER.length - 1) return null;
        return PIECE_ORDER[index + 1];
    }

    function renderMeta() {
        updateMetaUI();
        renderPieceOptions();
    }

    function updateMetaUI() {
        const meta = state.meta;
        dom.accountLevel.textContent = meta.level;
        const nextLevelXp = 100 + (meta.level - 1) * 35;
        const pct = Math.min(100, Math.round((meta.xp / nextLevelXp) * 100));
        dom.accountXp.style.width = `${pct}%`;
        dom.accountXpText.textContent = `${meta.xp} / ${nextLevelXp} XP`;
    }

    function renderPieceOptions() {
        dom.pieceSelect.innerHTML = '';
        PIECE_ORDER.forEach((id) => {
            const card = document.createElement('div');
            card.className = 'cr-piece-option';
            const unlocked = state.meta.unlockedPieces.includes(id);
            if (!unlocked) card.classList.add('locked');
            if (state.selectedPiece === id) card.classList.add('active');
            const letter = document.createElement('div');
            letter.className = 'cr-piece-letter';
            letter.textContent = PIECES[id].letter;
            const name = document.createElement('div');
            name.textContent = PIECES[id].name;
            const req = document.createElement('div');
            req.className = 'cr-muted';
            req.textContent = unlocked ? 'Unlocked' : `Level ${requiredLevelForPiece(id)}`;
            card.appendChild(letter);
            card.appendChild(name);
            card.appendChild(req);
            card.addEventListener('click', () => {
                if (!unlocked) return;
                state.selectedPiece = id;
                renderPieceOptions();
            });
            dom.pieceSelect.appendChild(card);
        });
    }

    function requiredLevelForPiece(id) {
        if (id === 'knight') return 3;
        if (id === 'bishop') return 5;
        if (id === 'rook') return 7;
        if (id === 'queen') return 10;
        return 1;
    }

    function setupEvents() {
        dom.clearLog.addEventListener('click', () => {
            state.log = [];
            renderLog();
        });
        dom.startRun.addEventListener('click', () => {
            setRng(null);
            startRun(false);
        });
        dom.dailyRun.addEventListener('click', () => {
            const today = new Date();
            const seed = parseInt(`${today.getFullYear()}${today.getMonth() + 1}${today.getDate()}`, 10);
            setRng(seed);
            startRun(true);
        });
        dom.pauseBtn.addEventListener('click', () => togglePause(true));
        dom.resumeBtn.addEventListener('click', () => togglePause(false));
        dom.exitBtn.addEventListener('click', () => exitToMenu());
        dom.exitInline.addEventListener('click', () => exitToMenu());
        dom.mainMenuBtn.addEventListener('click', () => exitToMenu());
        dom.newRunBtn.addEventListener('click', () => {
            dom.gameOver.classList.add('hidden');
            dom.mainMenu.classList.remove('hidden');
        });
    }

    function togglePause(paused) {
        if (!state.run) return;
        state.run.paused = paused;
        if (paused) {
            dom.pauseOverlay.classList.remove('hidden');
        } else {
            dom.pauseOverlay.classList.add('hidden');
        }
    }

    function exitToMenu() {
        stopTimer();
        state.run = null;
        dom.pauseOverlay.classList.add('hidden');
        dom.gameOver.classList.add('hidden');
        dom.upgradeOverlay.classList.add('hidden');
        dom.mainMenu.classList.remove('hidden');
        dom.runTag.textContent = 'Run Inactive';
        renderMeta();
    }

    function init() {
        state.meta = loadMeta();
        buildBoard();
        setupEvents();
        renderMeta();
        renderLog();
    }

    init();
})();
