import Phaser from 'phaser';

type TileType = 'grass' | 'forest' | 'gold';

interface Tile {
  type: TileType;
  x: number;
  y: number;
}

interface UnitDefinition {
  id: string;
  name: string;
  role: 'swordsman' | 'archer' | 'knight' | 'healer';
  hp: number;
  damage: number;
  range: number;
  speed: number;
  costGold: number;
  costFood: number;
}

interface DraftChoice {
  options: UnitDefinition[];
  picked: UnitDefinition[];
}

interface DraftResult {
  draftedUnits: UnitDefinition[];
}

interface MatchState {
  gold: number;
  food: number;
  selectedUnits: Unit[];
  draftedUnits: UnitDefinition[];
  peasants: Unit[];
  allUnits: Phaser.GameObjects.Group;
}

interface MetaState {
  unlockedUnits: string[];
  kingdomLevel: number;
}

interface ResultData {
  victory: boolean;
  unlockedUnit?: UnitDefinition;
}

const TILE_SIZE = 32;
const MAP_SIZE = 20;

const UNIT_POOL: UnitDefinition[] = [
  { id: 'sword', name: 'Swordsman', role: 'swordsman', hp: 70, damage: 10, range: 15, speed: 110, costGold: 40, costFood: 1 },
  { id: 'archer', name: 'Archer', role: 'archer', hp: 48, damage: 8, range: 120, speed: 120, costGold: 45, costFood: 1 },
  { id: 'knight', name: 'Knight', role: 'knight', hp: 90, damage: 14, range: 20, speed: 150, costGold: 80, costFood: 2 },
  { id: 'healer', name: 'Healer', role: 'healer', hp: 40, damage: 0, range: 100, speed: 100, costGold: 60, costFood: 1 },
  { id: 'pike', name: 'Pikeman', role: 'swordsman', hp: 60, damage: 12, range: 25, speed: 100, costGold: 55, costFood: 1 },
  { id: 'scout', name: 'Scout', role: 'knight', hp: 45, damage: 8, range: 25, speed: 160, costGold: 30, costFood: 1 },
  { id: 'warpriest', name: 'War Priest', role: 'healer', hp: 70, damage: 6, range: 80, speed: 90, costGold: 75, costFood: 1 },
  { id: 'ranger', name: 'Ranger', role: 'archer', hp: 55, damage: 11, range: 140, speed: 120, costGold: 65, costFood: 1 },
  { id: 'crusher', name: 'Crusher', role: 'swordsman', hp: 110, damage: 18, range: 20, speed: 80, costGold: 90, costFood: 2 }
];

class MetaStore {
  private key = 'micro-kingdom-meta';
  load(): MetaState {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) {
        return { unlockedUnits: ['sword', 'archer', 'knight'], kingdomLevel: 1 };
      }
      const parsed = JSON.parse(raw) as MetaState;
      if (parsed.unlockedUnits.length === 0) {
        parsed.unlockedUnits = ['sword', 'archer'];
      }
      return parsed;
    } catch {
      return { unlockedUnits: ['sword', 'archer', 'knight'], kingdomLevel: 1 };
    }
  }
  save(state: MetaState) {
    localStorage.setItem(this.key, JSON.stringify(state));
  }
}

class TileMap {
  tiles: Tile[][] = [];
  width = MAP_SIZE;
  height = MAP_SIZE;
  constructor() {
    for (let y = 0; y < this.height; y++) {
      const row: Tile[] = [];
      for (let x = 0; x < this.width; x++) {
        const noise = Math.random();
        let type: TileType = 'grass';
        if (noise > 0.8) {
          type = 'forest';
        } else if (noise > 0.65) {
          type = 'gold';
        }
        row.push({ type, x, y });
      }
      this.tiles.push(row);
    }
    // carve base clearings
    this.circleFill(2, 10, 3, 'grass');
    this.circleFill(17, 10, 3, 'grass');
  }

  circleFill(cx: number, cy: number, radius: number, type: TileType) {
    for (let y = cy - radius; y <= cy + radius; y++) {
      for (let x = cx - radius; x <= cx + radius; x++) {
        if (!this.inBounds(x, y)) continue;
        const dist = Math.hypot(x - cx, y - cy);
        if (dist <= radius) {
          this.tiles[y][x].type = type;
        }
      }
    }
  }

  inBounds(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  draw(scene: Phaser.Scene) {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const tile = this.tiles[y][x];
        const color =
          tile.type === 'grass'
            ? 0x7cb518
            : tile.type === 'forest'
            ? 0x386641
            : 0xffd166;
        const rect = scene.add.rectangle(
          x * TILE_SIZE + TILE_SIZE / 2,
          y * TILE_SIZE + TILE_SIZE / 2,
          TILE_SIZE,
          TILE_SIZE,
          color,
          tile.type === 'forest' ? 0.9 : 1
        );
        rect.setStrokeStyle(1, 0x1f2d16, 0.3);
      }
    }
  }

  worldToTile(worldX: number, worldY: number) {
    return {
      x: Phaser.Math.Clamp(Math.floor(worldX / TILE_SIZE), 0, this.width - 1),
      y: Phaser.Math.Clamp(Math.floor(worldY / TILE_SIZE), 0, this.height - 1)
    };
  }

  tileCenter(tileX: number, tileY: number) {
    return new Phaser.Math.Vector2(
      tileX * TILE_SIZE + TILE_SIZE / 2,
      tileY * TILE_SIZE + TILE_SIZE / 2
    );
  }

  movementCost(tile: TileType) {
    if (tile === 'forest') {
      return 3;
    }
    if (tile === 'gold') {
      return 1;
    }
    return 1;
  }

  blocked(tile: TileType) {
    return tile === 'forest';
  }

  findPath(start: Phaser.Math.Vector2, goal: Phaser.Math.Vector2) {
    const startTile = this.worldToTile(start.x, start.y);
    const goalTile = this.worldToTile(goal.x, goal.y);
    const frontier: { x: number; y: number; priority: number }[] = [
      { ...startTile, priority: 0 }
    ];
    const cameFrom = new Map<string, { x: number; y: number }>();
    const costSoFar = new Map<string, number>();
    const key = (x: number, y: number) => `${x},${y}`;
    costSoFar.set(key(startTile.x, startTile.y), 0);
    while (frontier.length > 0) {
      frontier.sort((a, b) => a.priority - b.priority);
      const current = frontier.shift()!;
      if (current.x === goalTile.x && current.y === goalTile.y) {
        break;
      }
      const neighbors = [
        { x: current.x + 1, y: current.y },
        { x: current.x - 1, y: current.y },
        { x: current.x, y: current.y + 1 },
        { x: current.x, y: current.y - 1 }
      ];
      for (const next of neighbors) {
        if (!this.inBounds(next.x, next.y)) {
          continue;
        }
        if (this.tiles[next.y][next.x].type === 'forest') {
          continue;
        }
        const newCost =
          (costSoFar.get(key(current.x, current.y)) || 0) +
          this.movementCost(this.tiles[next.y][next.x].type);
        if (!costSoFar.has(key(next.x, next.y)) || newCost < costSoFar.get(key(next.x, next.y))!) {
          costSoFar.set(key(next.x, next.y), newCost);
          const priority = newCost + Phaser.Math.Distance.Between(next.x, next.y, goalTile.x, goalTile.y);
          frontier.push({ x: next.x, y: next.y, priority });
          cameFrom.set(key(next.x, next.y), { x: current.x, y: current.y });
        }
      }
    }
    const path: Phaser.Math.Vector2[] = [];
    let current = goalTile;
    const currentKey = key(current.x, current.y);
    if (!cameFrom.has(currentKey) && (current.x !== startTile.x || current.y !== startTile.y)) {
      return path;
    }
    while (!(current.x === startTile.x && current.y === startTile.y)) {
      path.push(this.tileCenter(current.x, current.y));
      const prev = cameFrom.get(key(current.x, current.y));
      if (!prev) break;
      current = prev;
    }
    path.reverse();
    return path;
  }
}

class Unit extends Phaser.GameObjects.Rectangle {
  faction: 'player' | 'ai';
  hp: number;
  maxHp: number;
  damage: number;
  range: number;
  speed: number;
  target?: Unit | TownCenter;
  role: UnitDefinition['role'];
  path: Phaser.Math.Vector2[] = [];
  attackCooldown = 0;
  gatherCooldown = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    def: UnitDefinition,
    faction: 'player' | 'ai'
  ) {
    const color =
      faction === 'player'
        ? 0x1d3557
        : 0xe63946;
    super(scene, x, y, 16, 16, color);
    this.role = def.role;
    this.hp = def.hp;
    this.maxHp = def.hp;
    this.damage = def.damage;
    this.range = def.range;
    this.speed = def.speed;
    this.faction = faction;
    scene.add.existing(this);
  }

  updateUnit(delta: number, map: TileMap, enemies: (Unit | TownCenter)[]) {
    const dt = delta / 1000;
    if (this.hp <= 0) {
      this.destroy();
      return;
    }
    if (this.target && !this.target.active) {
      this.target = undefined;
    }
    if (!this.target && enemies.length > 0) {
      this.target = enemies.sort(
        (a, b) => Phaser.Math.Distance.Between(this.x, this.y, a.x, a.y) - Phaser.Math.Distance.Between(this.x, this.y, b.x, b.y)
      )[0];
    }
    if (this.target) {
      const distance = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
      if (distance <= this.range) {
        this.path = [];
        this.attackCooldown -= delta;
        if (this.attackCooldown <= 0) {
          if (this.role === 'healer' && this.faction === 'player' && this.damage === 0) {
            this.healAllies(map);
          } else {
            this.target.takeDamage(this.damage);
          }
          this.attackCooldown = 800;
        }
      } else {
        if (this.path.length === 0) {
          this.path = map.findPath(new Phaser.Math.Vector2(this.x, this.y), new Phaser.Math.Vector2(this.target.x, this.target.y));
        }
        this.followPath(dt);
      }
    } else {
      this.followPath(dt);
    }
  }

  healAllies(_map: TileMap) {
    const scene = this.scene as MatchScene;
    const allies = scene.units.getChildren().filter(
      (unit) => unit !== this && (unit as Unit).faction === this.faction
    );
    allies.forEach((ally) => {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, ally.x, ally.y);
      if (dist < this.range / 2) {
        (ally as Unit).hp = Math.min((ally as Unit).maxHp, (ally as Unit).hp + 10);
      }
    });
  }

  followPath(dt: number) {
    if (this.path.length === 0) return;
    const target = this.path[0];
    const dir = new Phaser.Math.Vector2(target.x - this.x, target.y - this.y);
    if (dir.length() < 4) {
      this.path.shift();
      return;
    }
    dir.normalize();
    this.x += dir.x * this.speed * dt;
    this.y += dir.y * this.speed * dt;
  }

  takeDamage(amount: number) {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.destroy();
    }
  }
}

class TownCenter extends Phaser.GameObjects.Rectangle {
  hp = 500;
  maxHp = 500;
  faction: 'player' | 'ai';
  constructor(scene: Phaser.Scene, x: number, y: number, faction: 'player' | 'ai') {
    super(scene, x, y, 40, 40, faction === 'player' ? 0x577590 : 0xd62839);
    this.faction = faction;
    scene.add.existing(this);
  }
  takeDamage(amount: number) {
    this.hp -= amount;
    if (this.hp <= 0) {
      (this.scene as MatchScene).handleTownDestroyed(this.faction);
    }
  }
}

class DraftSystem {
  constructor(private meta: MetaState) {}
  createDraft(): DraftChoice {
    const unlockedDefs = UNIT_POOL.filter((unit) =>
      this.meta.unlockedUnits.includes(unit.id)
    );
    const options = Phaser.Utils.Array.Shuffle(unlockedDefs).slice(0, 4);
    return { options, picked: [] };
  }
}

class AIController {
  private wave = 1;
  private timer!: Phaser.Time.TimerEvent;
  constructor(private scene: MatchScene, private map: TileMap, private aiTown: TownCenter) {}

  start() {
    this.timer = this.scene.time.addEvent({
      delay: 10000,
      callback: () => this.launchWave(),
      loop: true
    });
  }

  stop() {
    this.timer?.remove();
  }

  launchWave() {
    const roster: UnitDefinition[] = Phaser.Utils.Array.Shuffle(UNIT_POOL).slice(0, 3);
    roster.forEach((def) => {
      for (let i = 0; i < this.wave; i++) {
        this.scene.spawnUnit(def, 'ai', this.map.tileCenter(MAP_SIZE - 3, MAP_SIZE / 2));
      }
    });
    this.scene.showWave(this.wave);
    this.wave++;
  }
}

class MatchScene extends Phaser.Scene {
  map!: TileMap;
  town!: TownCenter;
  aiTown!: TownCenter;
  units!: Phaser.GameObjects.Group;
  peasants: Unit[] = [];
  gold = 100;
  food = 5;
  draftedUnits: UnitDefinition[] = [];
  selection: Unit[] = [];
  selectionRect?: Phaser.GameObjects.Rectangle;
  pointerStart?: Phaser.Math.Vector2;
  draftResult!: DraftResult;
  aiController!: AIController;
  hud!: { top: Phaser.GameObjects.Text; bottom: Phaser.GameObjects.Text; wave: Phaser.GameObjects.Text };

  constructor() {
    super('MatchScene');
  }

  init(data: DraftResult) {
    this.draftResult = data;
    this.draftedUnits = data.draftedUnits;
  }

  create() {
    this.map = new TileMap();
    this.map.draw(this);
    this.units = this.add.group();
    this.town = new TownCenter(this, TILE_SIZE * 2, TILE_SIZE * 10, 'player');
    this.aiTown = new TownCenter(this, TILE_SIZE * (MAP_SIZE - 2), TILE_SIZE * 10, 'ai');
    this.aiController = new AIController(this, this.map, this.aiTown);
    this.hud = {
      top: this.add.text(10, 5, '', { color: '#fff' }),
      bottom: this.add.text(10, MAP_SIZE * TILE_SIZE + 10, '', { color: '#fff' }),
      wave: this.add.text(250, 5, 'Wave 1', { color: '#ffd166' })
    };
    this.spawnPeasants();
    this.createInput();
    this.createUIButtons();
    this.aiController.start();
  }

  spawnUnit(def: UnitDefinition, faction: 'player' | 'ai', spawnPoint: Phaser.Math.Vector2) {
    const unit = new Unit(this, spawnPoint.x, spawnPoint.y, def, faction);
    this.units.add(unit);
    if (faction === 'player') {
      unit.path = [];
    } else {
      const goal = faction === 'ai' ? this.town : this.aiTown;
      unit.target = goal;
    }
    return unit;
  }

  spawnPeasants() {
    const peasantDef: UnitDefinition = {
      id: 'peasant',
      name: 'Peasant',
      role: 'swordsman',
      hp: 40,
      damage: 5,
      range: 20,
      speed: 90,
      costGold: 0,
      costFood: 0
    };
    for (let i = 0; i < 3; i++) {
      const peasant = this.spawnUnit(
        peasantDef,
        'player',
        new Phaser.Math.Vector2(this.town.x + i * 20, this.town.y + 20)
      );
      this.peasants.push(peasant);
      peasant.setFillStyle(0xf4a261);
      peasant.path = [];
      peasant.updateUnit = (delta: number) => {
        this.handlePeasant(peasant, delta);
      };
    }
  }

  handlePeasant(peasant: Unit, delta: number) {
    const dt = delta / 1000;
    peasant.gatherCooldown -= delta;
    const goldTile = this.map.tiles.flat().find((tile) => tile.type === 'gold');
    if (!goldTile) return;
    const target = this.map.tileCenter(goldTile.x, goldTile.y);
    const dist = Phaser.Math.Distance.Between(peasant.x, peasant.y, target.x, target.y);
    if (dist > 8) {
      if (peasant.path.length === 0) {
        peasant.path = this.map.findPath(new Phaser.Math.Vector2(peasant.x, peasant.y), target);
      }
      peasant.followPath(dt);
    } else if (peasant.gatherCooldown <= 0) {
      this.gold += 10;
      peasant.gatherCooldown = 2000;
    }
  }

  createInput() {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) {
        this.pointerStart = new Phaser.Math.Vector2(pointer.worldX, pointer.worldY);
        if (this.selectionRect) {
          this.selectionRect.destroy();
        }
        this.selectionRect = this.add.rectangle(
          pointer.worldX,
          pointer.worldY,
          1,
          1,
          0xffffff,
          0.1
        );
        this.selectionRect.setStrokeStyle(1, 0xffffff, 0.5);
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.pointerStart && this.selectionRect) {
        const width = pointer.worldX - this.pointerStart.x;
        const height = pointer.worldY - this.pointerStart.y;
        this.selectionRect.setSize(Math.abs(width), Math.abs(height));
        this.selectionRect.setPosition(
          this.pointerStart.x + width / 2,
          this.pointerStart.y + height / 2
        );
      }
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonReleased()) {
        if (this.selectionRect) {
          const bounds = this.selectionRect.getBounds();
          this.selection = this.units
            .getChildren()
            .filter((unit) => unit.active && (unit as Unit).faction === 'player' && bounds.contains(unit.x, unit.y)) as Unit[];
          this.selectionRect.destroy();
          this.selectionRect = undefined;
        }
      } else if (pointer.rightButtonReleased()) {
        if (this.selection.length > 0) {
          const targetTile = this.map.worldToTile(pointer.worldX, pointer.worldY);
          const targetPos = this.map.tileCenter(targetTile.x, targetTile.y);
          const unitAtTarget = this.units.getChildren().find(
            (unit) =>
              unit.active &&
              (unit as Unit).faction === 'ai' &&
              Phaser.Math.Distance.Between(pointer.worldX, pointer.worldY, unit.x, unit.y) < 20
          );
          this.selection.forEach((unit) => {
            if (unitAtTarget) {
              unit.target = unitAtTarget as Unit;
            } else {
              unit.path = this.map.findPath(new Phaser.Math.Vector2(unit.x, unit.y), targetPos);
            }
          });
        }
      }
      this.pointerStart = undefined;
    });
  }

  createUIButtons() {
    let x = 10;
    this.draftedUnits.forEach((def) => {
      const btn = this.add
        .text(x, MAP_SIZE * TILE_SIZE + 40, `${def.name} (${def.costGold}g)`, {
          backgroundColor: '#1d3557',
          padding: { x: 6, y: 4 },
          color: '#fff'
        })
        .setInteractive();
      btn.on('pointerup', () => this.trainUnit(def));
      x += 150;
    });
  }

  trainUnit(def: UnitDefinition) {
    if (this.gold < def.costGold || this.food < def.costFood) {
      return;
    }
    this.gold -= def.costGold;
    this.food -= def.costFood;
    const spawn = new Phaser.Math.Vector2(this.town.x + Phaser.Math.Between(-20, 20), this.town.y);
    const unit = this.spawnUnit(def, 'player', spawn);
    this.selection = [unit];
  }

  update(time: number, delta: number) {
    this.units.getChildren().forEach((unit) => {
      (unit as Unit).updateUnit(delta, this.map, this.getEnemyTargets((unit as Unit).faction));
    });
    this.updateHUD();
    if (this.town.hp <= 0 || this.aiTown.hp <= 0) {
      this.aiController.stop();
    }
  }

  getEnemyTargets(faction: 'player' | 'ai') {
    if (faction === 'player') {
      return [
        ...this.units.getChildren().filter((unit) => (unit as Unit).faction === 'ai'),
        this.aiTown
      ];
    }
    return [
      ...this.units.getChildren().filter((unit) => (unit as Unit).faction === 'player'),
      this.town
    ];
  }

  updateHUD() {
    this.hud.top.setText(
      `Gold ${this.gold} | Food ${this.food} | Units ${this.units.getChildren().filter((unit) => (unit as Unit).faction === 'player').length}`
    );
    if (this.selection.length > 0) {
      const unit = this.selection[0];
      this.hud.bottom.setText(
        `${unit.role} HP ${Math.round(unit.hp)}/${unit.maxHp} | Range ${unit.range}`
      );
    } else {
      this.hud.bottom.setText('No unit selected');
    }
  }

  showWave(wave: number) {
    this.hud.wave.setText(`Wave ${wave}`);
    const banner = this.add
      .text(MAP_SIZE * TILE_SIZE / 2, 40, `Wave ${wave}`, {
        color: '#ffd166',
        fontSize: '24px',
        backgroundColor: '#1d3557',
        padding: { x: 10, y: 4 }
      })
      .setOrigin(0.5);
    this.tweens.add({
      targets: banner,
      alpha: 0,
      duration: 1500,
      onComplete: () => banner.destroy()
    });
  }

  handleTownDestroyed(faction: 'player' | 'ai') {
    this.aiController.stop();
    this.scene.start('ResultScene', {
      victory: faction === 'ai'
    });
  }
}

class DraftScene extends Phaser.Scene {
  private meta!: MetaState;
  private draft!: DraftChoice;
  constructor() {
    super('DraftScene');
  }

  init(data: { meta: MetaState }) {
    this.meta = data.meta;
  }

  create() {
    const draftSystem = new DraftSystem(this.meta);
    this.draft = draftSystem.createDraft();
    this.add.text(400, 50, 'Draft 2 Units', { color: '#fff', fontSize: '28px' }).setOrigin(0.5);
    let y = 120;
    this.draft.options.forEach((option) => {
      const text = this.add
        .text(400, y, `${option.name} - ${option.role}`, {
          backgroundColor: '#1d3557',
          padding: { x: 10, y: 6 },
          color: '#fff'
        })
        .setOrigin(0.5)
        .setInteractive();
      text.on('pointerup', () => this.pick(option, text));
      y += 80;
    });
  }

  pick(option: UnitDefinition, text: Phaser.GameObjects.Text) {
    if (this.draft.picked.includes(option)) return;
    if (this.draft.picked.length >= 2) return;
    this.draft.picked.push(option);
    text.setBackgroundColor('#2a9d8f');
    if (this.draft.picked.length === 2) {
      this.time.delayedCall(800, () => {
        this.scene.start('MatchScene', { draftedUnits: this.draft.picked });
      });
    }
  }
}

class MenuScene extends Phaser.Scene {
  private metaStore = new MetaStore();
  private meta!: MetaState;
  constructor() {
    super('MenuScene');
  }

  create() {
    this.meta = this.metaStore.load();
    this.add.text(400, 70, 'Micro Kingdom Skirmish', { fontSize: '32px', color: '#fff' }).setOrigin(0.5);
    this.add
      .text(400, 120, `Kingdom Level ${this.meta.kingdomLevel}`, { color: '#ffd166' })
      .setOrigin(0.5);
    this.add.text(400, 160, 'Unlocked Units:', { color: '#bde0fe' }).setOrigin(0.5);
    this.meta.unlockedUnits.forEach((id, index) => {
      const unit = UNIT_POOL.find((u) => u.id === id);
      if (unit) {
        this.add.text(400, 190 + index * 20, unit.name, { color: '#fff' }).setOrigin(0.5);
      }
    });

    const playBtn = this.add
      .text(400, 420, 'Play', {
        backgroundColor: '#1d3557',
        padding: { x: 40, y: 20 },
        color: '#fff'
      })
      .setOrigin(0.5)
      .setInteractive();
    playBtn.on('pointerup', () => {
      this.scene.start('DraftScene', { meta: this.meta });
    });
  }
}

class ResultScene extends Phaser.Scene {
  private metaStore = new MetaStore();
  constructor() {
    super('ResultScene');
  }
  create(data: ResultData) {
    const meta = this.metaStore.load();
    let unlocked: UnitDefinition | undefined;
    if (data.victory) {
      meta.kingdomLevel++;
      unlocked = UNIT_POOL.find((unit) => !meta.unlockedUnits.includes(unit.id));
      if (unlocked) {
        meta.unlockedUnits.push(unlocked.id);
      }
    }
    this.metaStore.save(meta);
    this.cameras.main.setBackgroundColor('#1b263b');
    this.add
      .text(400, 200, data.victory ? 'Victory!' : 'Defeat', {
        fontSize: '32px',
        color: data.victory ? '#ffd166' : '#e63946'
      })
      .setOrigin(0.5);
    if (unlocked) {
      this.add
        .text(400, 260, `Unlocked ${unlocked.name}`, { color: '#a9def9' })
        .setOrigin(0.5);
    }
    const btn = this.add
      .text(400, 360, 'Back to Menu', {
        backgroundColor: '#1d3557',
        padding: { x: 30, y: 14 },
        color: '#fff'
      })
      .setOrigin(0.5)
      .setInteractive();
    btn.on('pointerup', () => this.scene.start('MenuScene'));
  }
}

class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }
  create() {
    this.scene.start('MenuScene');
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  backgroundColor: '#14213d',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    parent: 'micro-kingdom-skirmish-root',
    width: MAP_SIZE * TILE_SIZE,
    height: MAP_SIZE * TILE_SIZE + 120
  },
  scene: [BootScene, MenuScene, DraftScene, MatchScene, ResultScene]
};

export function launchMicroKingdomSkirmish() {
  return new Phaser.Game(config);
}

if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    if (!(window as any).__microKingdomSkirmish) {
      (window as any).__microKingdomSkirmish = launchMicroKingdomSkirmish();
    }
  });
}
