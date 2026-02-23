import Phaser from 'phaser';

type Faction = 'player' | 'enemy';

interface CommanderDefinition {
  id: string;
  name: string;
  description: string;
  bonus: (scene: RunScene) => void;
  unlockShifts: number;
}

interface MetaState {
  bestShift: number;
  totalShifts: number;
  unlockedCommanders: string[];
}

interface UpgradeOption {
  id: string;
  label: string;
  description: string;
  apply: (scene: RunScene) => void;
}

const COMMANDERS: CommanderDefinition[] = [
  {
    id: 'default',
    name: 'Captain Aerie',
    description: 'Balanced balloon with +1 troop at start.',
    bonus: (scene) => scene.spawnTroop(scene.balloon.currentIsland),
    unlockShifts: 0
  },
  {
    id: 'swift',
    name: 'Swift Laurel',
    description: '+30% capture speed.',
    bonus: (scene) => (scene.captureBonus = 1.3),
    unlockShifts: 3
  },
  {
    id: 'bulwark',
    name: 'Bulwark Hest',
    description: 'Balloon gains +50 HP.',
    bonus: (scene) => (scene.balloon.maxHp += 50),
    unlockShifts: 5
  }
];

class MetaStore {
  private key = 'sky-island-sprint-meta';
  load(): MetaState {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) {
        return { bestShift: 0, totalShifts: 0, unlockedCommanders: ['default'] };
      }
      const parsed = JSON.parse(raw) as MetaState;
      if (!parsed.unlockedCommanders.includes('default')) {
        parsed.unlockedCommanders.push('default');
      }
      return parsed;
    } catch {
      return { bestShift: 0, totalShifts: 0, unlockedCommanders: ['default'] };
    }
  }
  save(state: MetaState) {
    localStorage.setItem(this.key, JSON.stringify(state));
  }
}

class Island {
  id: number;
  sprite: Phaser.GameObjects.Ellipse;
  neighbors: Island[] = [];
  hasResource: boolean;
  owner: 'neutral' | Faction = 'neutral';
  dropWarning = false;
  captureProgress = 0;

  constructor(public scene: Phaser.Scene, x: number, y: number, id: number) {
    this.id = id;
    this.hasResource = Math.random() > 0.6;
    this.sprite = scene.add.ellipse(x, y, 150, 100, 0x74c69d, 1);
    this.sprite.setStrokeStyle(2, 0x1b4332);
  }

  setOwner(owner: 'neutral' | Faction) {
    this.owner = owner;
    const colors: Record<typeof owner, number> = {
      neutral: 0x74c69d,
      player: 0x8ecae6,
      enemy: 0xf94144
    };
    this.sprite.setFillStyle(colors[owner], 1);
  }
}

class IslandGraph {
  islands: Island[] = [];
  bridgeGraphics: Phaser.GameObjects.Graphics;
  constructor(private scene: RunScene) {
    this.bridgeGraphics = this.scene.add.graphics();
  }

  generate(count: number) {
    this.bridgeGraphics.clear();
    this.islands.forEach((island) => island.sprite.destroy());
    this.islands = [];
    const radius = 220;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const x = this.scene.scale.width / 2 + Math.cos(angle) * (radius + Phaser.Math.Between(-50, 50));
      const y = this.scene.scale.height / 2 + Math.sin(angle) * (radius + Phaser.Math.Between(-40, 40));
      this.islands.push(new Island(this.scene, x, y, i));
    }
    this.link();
  }

  link() {
    this.bridgeGraphics.clear();
    this.bridgeGraphics.lineStyle(3, 0xffffff, 0.4);
    this.islands.forEach((island) => (island.neighbors = []));
    for (let i = 0; i < this.islands.length; i++) {
      const current = this.islands[i];
      const next = this.islands[(i + 1) % this.islands.length];
      current.neighbors.push(next);
      next.neighbors.push(current);
    }
    // random extra bridges
    for (let i = 0; i < this.islands.length; i++) {
      const target = Phaser.Utils.Array.GetRandom(this.islands.filter((isl) => isl !== this.islands[i]));
      if (!this.islands[i].neighbors.includes(target)) {
        this.islands[i].neighbors.push(target);
        target.neighbors.push(this.islands[i]);
      }
    }
    this.drawBridges();
  }

  dropRandomIslands(count: number, balloonIsland: Island) {
    const candidates = this.islands.filter((isl) => isl !== balloonIsland);
    const chosen = Phaser.Utils.Array.Shuffle(candidates).slice(0, count);
    chosen.forEach((island) => {
      this.scene.units.getChildren().forEach((unit) => {
        if ((unit as Unit).currentIsland === island) {
          (unit as Unit).destroy();
          this.scene.units.remove(unit);
        }
      });
      island.sprite.destroy();
      this.islands = this.islands.filter((i) => i !== island);
    });
    this.link();
  }

  drawBridges() {
    this.bridgeGraphics.clear();
    this.bridgeGraphics.lineStyle(3, 0xffffff, 0.4);
    this.islands.forEach((island) => {
      island.neighbors.forEach((neighbor) => {
        this.bridgeGraphics.strokeLineShape(
          new Phaser.Geom.Line(island.sprite.x, island.sprite.y, neighbor.sprite.x, neighbor.sprite.y)
        );
      });
    });
  }
}

class Unit extends Phaser.GameObjects.Ellipse {
  currentIsland: Island;
  hp = 60;
  maxHp = 60;
  attack = 8;
  faction: Faction;
  moving = false;
  targetIsland?: Island;
  constructor(scene: Phaser.Scene, island: Island, faction: Faction) {
    super(scene, island.sprite.x, island.sprite.y, 16, 16, faction === 'player' ? 0x1d3557 : 0xf3722c);
    this.currentIsland = island;
    this.faction = faction;
    scene.add.existing(this);
  }

  moveTo(island: Island) {
    if (this.moving || island === this.currentIsland) return;
    this.moving = true;
    this.targetIsland = island;
    this.scene.tweens.add({
      targets: this,
      x: island.sprite.x,
      y: island.sprite.y,
      duration: 800,
      onComplete: () => {
        this.currentIsland = island;
        this.moving = false;
      }
    });
  }

  updateBattle(scene: RunScene, delta: number) {
    if (this.hp <= 0) {
      this.destroy();
      scene.units.remove(this);
      return;
    }
    const opponents = scene.units
      .getChildren()
      .filter(
        (unit) =>
          unit !== this &&
          (unit as Unit).currentIsland === this.currentIsland &&
          (unit as Unit).faction !== this.faction
      ) as Unit[];
    if (opponents.length > 0) {
      const target = Phaser.Utils.Array.GetRandom(opponents);
      target.hp -= (this.attack * delta) / 1000;
      if (target.hp <= 0) {
        target.destroy();
        scene.units.remove(target);
      }
    }
  }
}

class Balloon extends Phaser.GameObjects.Ellipse {
  hp = 120;
  maxHp = 120;
  currentIsland!: Island;
  constructor(scene: Phaser.Scene, island: Island) {
    super(scene, island.sprite.x, island.sprite.y - 60, 30, 40, 0x90e0ef, 1);
    this.currentIsland = island;
    scene.add.existing(this);
  }

  moveTo(island: Island) {
    if (island === this.currentIsland) return;
    this.scene.tweens.add({
      targets: this,
      x: island.sprite.x,
      y: island.sprite.y - 60,
      duration: 1200,
      onComplete: () => {
        this.currentIsland = island;
      }
    });
  }
}

class UpgradeSystem {
  getOptions(): UpgradeOption[] {
    return [
      {
        id: 'troop',
        label: 'Reinforce squad',
        description: 'Add 2 melee troops.',
        apply: (scene) => {
          scene.spawnTroop(scene.balloon.currentIsland);
          scene.spawnTroop(scene.balloon.currentIsland);
        }
      },
      {
        id: 'balloonArmor',
        label: '+Balloon armor',
        description: '+40 HP to the command balloon.',
        apply: (scene) => {
          scene.balloon.maxHp += 40;
          scene.balloon.hp += 40;
        }
      },
      {
        id: 'resourceBonus',
        label: 'Shard surge',
        description: 'Resources +20 immediately.',
        apply: (scene) => {
          scene.shards += 20;
        }
      }
    ];
  }
}

class ShiftController {
  timer = 60;
  private event!: Phaser.Time.TimerEvent;
  constructor(private scene: RunScene) {}

  start() {
    this.event = this.scene.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => this.tick()
    });
  }

  stop() {
    this.event?.remove();
  }

  private tick() {
    this.timer--;
    this.scene.updateCountdown(this.timer);
    if (this.timer <= 0) {
      this.triggerShift();
    }
  }

  triggerShift() {
    this.stop();
    this.scene.onSkyShift();
  }

  reset() {
    this.timer = 60;
    this.start();
  }
}

class MenuScene extends Phaser.Scene {
  private metaStore = new MetaStore();
  private meta!: MetaState;
  private selectedCommander?: CommanderDefinition;
  constructor() {
    super('MenuScene');
  }
  create() {
    this.meta = this.metaStore.load();
    this.cameras.main.setBackgroundColor('#03045e');
    this.add
      .text(this.scale.width / 2, 80, 'Sky Island Sprint', {
        fontSize: '36px',
        color: '#fff'
      })
      .setOrigin(0.5);
    this.add
      .text(
        this.scale.width / 2,
        130,
        `Best Shift ${this.meta.bestShift} | Total ${this.meta.totalShifts}`,
        { color: '#caf0f8' }
      )
      .setOrigin(0.5);
    const available = COMMANDERS.filter((cmd) =>
      this.meta.unlockedCommanders.includes(cmd.id)
    );
    let y = 190;
    available.forEach((cmd) => {
      const btn = this.add
        .text(this.scale.width / 2, y, `${cmd.name} - ${cmd.description}`, {
          backgroundColor: '#1d3557',
          color: '#fff',
          padding: { x: 10, y: 6 }
        })
        .setOrigin(0.5)
        .setInteractive();
      btn.on('pointerup', () => {
        this.selectedCommander = cmd;
        btn.setBackgroundColor('#2a9d8f');
      });
      y += 60;
    });
    const playBtn = this.add
      .text(this.scale.width / 2, this.scale.height - 100, 'Start Run', {
        backgroundColor: '#1d3557',
        padding: { x: 30, y: 14 },
        color: '#fff'
      })
      .setOrigin(0.5)
      .setInteractive();
    playBtn.on('pointerup', () => {
      if (!this.selectedCommander) {
        this.selectedCommander = available[0];
      }
      this.scene.start('RunScene', { commander: this.selectedCommander!.id });
    });
  }
}

class RunScene extends Phaser.Scene {
  graph!: IslandGraph;
  balloon!: Balloon;
  units!: Phaser.GameObjects.Group;
  shiftController!: ShiftController;
  upgradeSystem = new UpgradeSystem();
  shards = 0;
  commanderId!: string;
  captureBonus = 1;
  commandersById = new Map(COMMANDERS.map((cmd) => [cmd.id, cmd]));
  hud!: { timer: Phaser.GameObjects.Text; resource: Phaser.GameObjects.Text; shift: Phaser.GameObjects.Text; commander: Phaser.GameObjects.Text };
  shiftCount = 0;
  pointerStart?: Phaser.Math.Vector2;
  selectionRect?: Phaser.GameObjects.Rectangle;
  selection: Unit[] = [];
  overlay?: Phaser.GameObjects.Container;
  paused = false;
  private balloonCommandMode = false;
  private balloonButton!: Phaser.GameObjects.Text;

  constructor() {
    super('RunScene');
  }

  init(data: { commander: string }) {
    this.commanderId = data.commander;
  }

  create() {
    this.cameras.main.setBackgroundColor('#14213d');
    this.graph = new IslandGraph(this);
    this.graph.generate(7);
    const startIsland = this.graph.islands[0];
    startIsland.setOwner('player');
    this.balloon = new Balloon(this, startIsland);
    this.units = this.add.group();
    this.spawnTroop(startIsland);
    this.spawnTroop(startIsland);
    this.spawnTroop(startIsland);
    const commander = this.commandersById.get(this.commanderId);
    commander?.bonus(this);
    this.shiftController = new ShiftController(this);
    this.shiftController.start();
    this.createHUD(commander);
    this.createInput();
    this.scheduleEnemies();
  }

  createHUD(commander?: CommanderDefinition) {
    this.hud = {
      timer: this.add.text(20, 20, 'Shift in 60', { color: '#fff' }),
      resource: this.add.text(20, 50, 'Shards 0', { color: '#ffd166' }),
      shift: this.add.text(this.scale.width - 160, 20, 'Shift 0', { color: '#fff' }),
      commander: this.add.text(this.scale.width - 160, 50, commander?.name || '', {
        color: '#a9def9'
      })
    };
    this.balloonButton = this.add
      .text(20, this.scale.height - 60, 'Balloon Orders', {
        backgroundColor: '#1d3557',
        color: '#fff',
        padding: { x: 10, y: 6 }
      })
      .setInteractive();
    this.balloonButton.on('pointerup', () => {
      this.balloonCommandMode = !this.balloonCommandMode;
      this.balloonButton.setBackgroundColor(this.balloonCommandMode ? '#2a9d8f' : '#1d3557');
    });

    const upgradeBtn = this.add
      .text(this.scale.width - 150, this.scale.height - 60, 'Upgrades', {
        backgroundColor: '#1d3557',
        color: '#fff',
        padding: { x: 10, y: 6 }
      })
      .setInteractive();
    upgradeBtn.on('pointerup', () => this.showUpgradeOverlay(false));
  }

  createInput() {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) {
        this.pointerStart = new Phaser.Math.Vector2(pointer.worldX, pointer.worldY);
        this.selectionRect?.destroy();
        this.selectionRect = this.add.rectangle(pointer.worldX, pointer.worldY, 1, 1, 0xffffff, 0.1);
        this.selectionRect.setStrokeStyle(1, 0xffffff);
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
            .filter(
              (unit) =>
                bounds.contains(unit.x, unit.y) && (unit as Unit).faction === 'player'
            ) as Unit[];
          this.selectionRect.destroy();
          this.selectionRect = undefined;
        }
      } else if (pointer.rightButtonReleased()) {
        const island = this.getIslandAt(pointer.worldX, pointer.worldY);
        if (island && this.selection.length > 0 && !this.balloonCommandMode) {
          this.selection.forEach((unit) => {
            if (unit.currentIsland.neighbors.includes(island)) {
              unit.moveTo(island);
            }
          });
        } else if (island && this.balloonCommandMode) {
          if (this.balloon.currentIsland.neighbors.includes(island)) {
            this.balloon.moveTo(island);
            this.balloonCommandMode = false;
            this.balloonButton.setBackgroundColor('#1d3557');
          }
        }
      }
      this.pointerStart = undefined;
    });
  }

  getIslandAt(x: number, y: number) {
    return this.graph.islands.find((island) =>
      Phaser.Math.Distance.Between(x, y, island.sprite.x, island.sprite.y) < 80
    );
  }

  spawnTroop(island: Island, faction: Faction = 'player') {
    const unit = new Unit(this, island, faction);
    this.units.add(unit);
    return unit;
  }

  scheduleEnemies() {
    this.time.addEvent({
      delay: 8000,
      loop: true,
      callback: () => {
        const targetIsland = Phaser.Utils.Array.GetRandom(this.graph.islands);
        const unit = this.spawnTroop(targetIsland, 'enemy');
        unit.attack = 10;
      }
    });
  }

  update(time: number, delta: number) {
    if (this.paused) {
      return;
    }
    this.units.getChildren().forEach((unit) => (unit as Unit).updateBattle(this, delta));
    this.captureIslands(delta);
    this.generateShards(delta);
    this.checkBalloonThreats(delta);
  }

  captureIslands(delta: number) {
    this.graph.islands.forEach((island) => {
      const playerUnits = this.units
        .getChildren()
        .filter((unit) => (unit as Unit).currentIsland === island && (unit as Unit).faction === 'player');
      const enemyUnits = this.units
        .getChildren()
        .filter((unit) => (unit as Unit).currentIsland === island && (unit as Unit).faction === 'enemy');
      if (playerUnits.length > enemyUnits.length) {
        island.captureProgress += delta * 0.02 * this.captureBonus;
        if (island.captureProgress >= 100) {
          island.setOwner('player');
          island.captureProgress = 100;
        }
      } else if (enemyUnits.length > playerUnits.length) {
        island.captureProgress -= delta * 0.02;
        if (island.captureProgress <= -100) {
          island.setOwner('enemy');
          island.captureProgress = -100;
        }
      }
    });
  }

  generateShards(delta: number) {
    this.graph.islands.forEach((island) => {
      if (island.hasResource && island.owner === 'player') {
        this.shards += (delta / 1000) * 0.5;
      }
    });
    this.hud.resource.setText(
      `Shards ${Math.floor(this.shards)} | Balloon ${Math.round(this.balloon.hp)}/${this.balloon.maxHp}`
    );
  }

  updateCountdown(seconds: number) {
    this.hud.timer.setText(`Shift in ${seconds}`);
  }

  onSkyShift() {
    this.shiftCount++;
    this.hud.shift.setText(`Shift ${this.shiftCount}`);
    this.paused = true;
    this.time.delayedCall(500, () => {
      this.graph.dropRandomIslands(1, this.balloon.currentIsland);
      this.showUpgradeOverlay(true);
    });
  }

  showUpgradeOverlay(fromShift: boolean) {
    if (this.overlay) {
      this.overlay.destroy();
    }
    const options = this.upgradeSystem.getOptions();
    this.overlay = this.add.container(this.scale.width / 2, this.scale.height / 2);
    const bg = this.add.rectangle(0, 0, 420, 260, 0x000000, 0.8);
    this.overlay.add(bg);
    let y = -80;
    options.forEach((option) => {
      const text = this.add
        .text(-180, y, `${option.label}\n${option.description}`, {
          color: '#fff',
          wordWrap: { width: 360 }
        })
        .setInteractive();
      text.on('pointerup', () => {
        option.apply(this);
        this.overlay?.destroy();
        this.overlay = undefined;
        if (fromShift) {
          this.paused = false;
          this.shiftController.reset();
        } else {
          this.paused = false;
        }
      });
      this.overlay.add(text);
      y += 90;
    });
    this.paused = true;
  }

  checkBalloonThreats(delta: number) {
    const enemies = this.units
      .getChildren()
      .filter(
        (unit) =>
          (unit as Unit).currentIsland === this.balloon.currentIsland && (unit as Unit).faction === 'enemy'
      );
    if (enemies.length > 0) {
      this.balloon.hp -= (delta / 1000) * 5 * enemies.length;
      if (this.balloon.hp <= 0) {
        this.endRun();
      }
    }
  }

  endRun() {
    this.scene.start('SummaryScene', { shifts: this.shiftCount });
  }
}

class SummaryScene extends Phaser.Scene {
  private metaStore = new MetaStore();
  constructor() {
    super('SummaryScene');
  }
  create(data: { shifts: number }) {
    const meta = this.metaStore.load();
    meta.totalShifts += data.shifts;
    if (data.shifts > meta.bestShift) {
      meta.bestShift = data.shifts;
    }
    COMMANDERS.forEach((cmd) => {
      if (data.shifts >= cmd.unlockShifts && !meta.unlockedCommanders.includes(cmd.id)) {
        meta.unlockedCommanders.push(cmd.id);
      }
    });
    this.metaStore.save(meta);
    this.cameras.main.setBackgroundColor('#03045e');
    this.add
      .text(this.scale.width / 2, 150, 'Run Complete', {
        fontSize: '32px',
        color: '#fff'
      })
      .setOrigin(0.5);
    this.add
      .text(this.scale.width / 2, 220, `Shifts survived: ${data.shifts}`, {
        color: '#ffd166'
      })
      .setOrigin(0.5);
    const btn = this.add
      .text(this.scale.width / 2, 320, 'Back to Menu', {
        backgroundColor: '#1d3557',
        color: '#fff',
        padding: { x: 20, y: 12 }
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
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    parent: 'sky-island-sprint-root',
    width: 960,
    height: 540
  },
  scene: [BootScene, MenuScene, RunScene, SummaryScene]
};

export function launchSkyIslandSprint() {
  return new Phaser.Game(config);
}

if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    if (!(window as any).__skyIslandSprint) {
      (window as any).__skyIslandSprint = launchSkyIslandSprint();
    }
  });
}
