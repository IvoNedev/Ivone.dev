import Phaser from 'phaser';

type ModuleType = 'gun' | 'engine' | 'shield' | 'utility';

interface ModuleDefinition {
  id: string;
  type: ModuleType;
  powerCost: number;
  color: number;
  label: string;
  description: string;
}

interface HullDefinition {
  id: string;
  name: string;
  stats: ShipStats;
  unlockScore: number;
}

interface ShipStats {
  hull: number;
  shield: number;
  speed: number;
  shieldRegen: number;
  powerCapacity: number;
}

interface MetaState {
  totalScore: number;
  unlockedHulls: string[];
}

interface SectorModifier {
  id: string;
  label: string;
  description: string;
  apply(game: GameScene): void;
}

const HULLS: HullDefinition[] = [
  {
    id: 'standard',
    name: 'Standard Hull',
    stats: { hull: 100, shield: 60, speed: 160, shieldRegen: 2, powerCapacity: 5 },
    unlockScore: 0
  },
  {
    id: 'fast',
    name: 'Fast Hull',
    stats: { hull: 80, shield: 40, speed: 210, shieldRegen: 1.5, powerCapacity: 4 },
    unlockScore: 300
  },
  {
    id: 'tank',
    name: 'Tank Hull',
    stats: { hull: 150, shield: 90, speed: 120, shieldRegen: 3, powerCapacity: 6 },
    unlockScore: 600
  }
];

class MetaService {
  private key = 'space-salvage-swarm-meta';

  load(): MetaState {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) {
        return { totalScore: 0, unlockedHulls: ['standard'] };
      }
      const parsed = JSON.parse(raw) as MetaState;
      if (!parsed.unlockedHulls.includes('standard')) {
        parsed.unlockedHulls.push('standard');
      }
      return parsed;
    } catch {
      return { totalScore: 0, unlockedHulls: ['standard'] };
    }
  }

  save(state: MetaState) {
    localStorage.setItem(this.key, JSON.stringify(state));
  }
}

class BaseModule {
  readonly def: ModuleDefinition;
  constructor(def: ModuleDefinition) {
    this.def = def;
  }
  attach(_ship: CommandShip) {
    // implemented in subclasses when needed
  }
  detach(_ship: CommandShip) {
    // implemented in subclasses when needed
  }
}

class GunModule extends BaseModule {
  private timer?: Phaser.Time.TimerEvent;
  attach(ship: CommandShip) {
    this.timer = ship.scene.time.addEvent({
      delay: 800,
      loop: true,
      callback: () => ship.fireAtNearestEnemy()
    });
  }
  detach(_ship: CommandShip) {
    this.timer?.remove();
    this.timer = undefined;
  }
}

class EngineModule extends BaseModule {
  attach(ship: CommandShip) {
    ship.speedBonus += 30;
  }
  detach(ship: CommandShip) {
    ship.speedBonus -= 30;
  }
}

class ShieldModule extends BaseModule {
  attach(ship: CommandShip) {
    ship.maxShield += 20;
    ship.shield += 20;
    ship.shieldRegen += 1;
  }
  detach(ship: CommandShip) {
    ship.maxShield -= 20;
    ship.shield = Phaser.Math.Clamp(ship.shield, 0, ship.maxShield);
    ship.shieldRegen -= 1;
  }
}

class UtilityModule extends BaseModule {
  attach(ship: CommandShip) {
    ship.salvageRange += 20;
  }
  detach(ship: CommandShip) {
    ship.salvageRange -= 20;
  }
}

const MODULE_POOL: ModuleDefinition[] = [
  {
    id: 'pulse',
    type: 'gun',
    powerCost: 2,
    color: 0xffd166,
    label: 'Pulse Gun',
    description: 'Auto-fires kinetic bolts.'
  },
  {
    id: 'rail',
    type: 'gun',
    powerCost: 3,
    color: 0xef476f,
    label: 'Rail Battery',
    description: 'High damage bursts.'
  },
  {
    id: 'boost',
    type: 'engine',
    powerCost: 1,
    color: 0x06d6a0,
    label: 'Thruster Boost',
    description: 'Increase speed.'
  },
  {
    id: 'shield',
    type: 'shield',
    powerCost: 2,
    color: 0x118ab2,
    label: 'Barrier Core',
    description: 'Extra shield & regen.'
  },
  {
    id: 'tractor',
    type: 'utility',
    powerCost: 1,
    color: 0x8d99ae,
    label: 'Tractor Beam',
    description: 'Bigger salvage radius.'
  }
];

class CommandShip extends Phaser.GameObjects.Rectangle {
  declare body: Phaser.Physics.Arcade.Body;
  hull: number;
  shield: number;
  maxHull: number;
  maxShield: number;
  shieldRegen: number;
  speed: number;
  powerCapacity: number;
  powerUsed = 0;
  modules: BaseModule[] = [];
  moduleMarkers: Phaser.GameObjects.Rectangle[] = [];
  escorts: EscortShip[] = [];
  salvageRange = 80;
  speedBonus = 0;
  aggressiveEscorts = false;
  pendingMove?: Phaser.Math.Vector2;
  maxModules = 6;

  constructor(scene: Phaser.Scene, stats: ShipStats, x: number, y: number) {
    super(scene, x, y, 32, 32, 0xffffff, 1);
    this.hull = stats.hull;
    this.shield = stats.shield;
    this.maxHull = stats.hull;
    this.maxShield = stats.shield;
    this.shieldRegen = stats.shieldRegen;
    this.speed = stats.speed;
    this.powerCapacity = stats.powerCapacity;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setCollideWorldBounds(true);
    this.body.setDrag(300, 300);
  }

  attachModule(module: BaseModule) {
    if (this.modules.length >= this.maxModules) {
      const removed = this.modules.shift();
      if (removed) {
        this.powerUsed -= removed.def.powerCost;
        removed.detach(this);
      }
    }
    if (this.powerUsed + module.def.powerCost > this.powerCapacity) {
      return false;
    }
    this.powerUsed += module.def.powerCost;
    this.modules.push(module);
    module.attach(this);
    this.refreshModuleMarkers();
    return true;
  }

  detachModule(module: BaseModule) {
    const index = this.modules.indexOf(module);
    if (index >= 0) {
      this.modules.splice(index, 1);
      this.powerUsed -= module.def.powerCost;
      module.detach(this);
      this.refreshModuleMarkers();
    }
  }

  refreshModuleMarkers() {
    this.moduleMarkers.forEach((marker) => marker.destroy());
    this.moduleMarkers = this.modules.map((mod) => {
      const rect = this.scene.add.rectangle(this.x, this.y, 12, 6, mod.def.color, 1);
      return rect;
    });
  }

  updateModuleMarkers() {
    const count = this.moduleMarkers.length;
    if (count === 0) {
      return;
    }
    this.moduleMarkers.forEach((marker, index) => {
      const angle = (index / count) * Math.PI * 2;
      marker.setPosition(
        this.x + Math.cos(angle) * 28,
        this.y + Math.sin(angle) * 28
      );
    });
  }

  fireAtNearestEnemy() {
    const scene = this.scene as GameScene;
    if (scene.enemies.getChildren().length === 0) {
      return;
    }
    const nearest = scene.findNearestEnemy(this.x, this.y);
    if (!nearest) {
      return;
    }
    scene.spawnBullet(this.x, this.y, nearest.x, nearest.y, 'player');
  }

  takeDamage(amount: number) {
    const leftover = amount - this.shield;
    this.shield = Math.max(0, this.shield - amount);
    if (leftover > 0) {
      this.hull -= leftover;
    }
    if (this.hull <= 0) {
      (this.scene as GameScene).handlePlayerDeath();
    }
  }
}

class EscortShip extends Phaser.GameObjects.Arc {
  declare body: Phaser.Physics.Arcade.Body;
  private angle = 0;
  constructor(scene: Phaser.Scene, x: number, y: number, color: number) {
    super(scene, x, y, 8, 0, 360, false, color, 1);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setCircle(8);
  }

  updateOrbit(anchor: CommandShip, delta: number, aggressive: boolean) {
    this.angle += delta * 0.001;
    const radius = aggressive ? 70 : 50;
    const targetX = anchor.x + Math.cos(this.angle) * radius;
    const targetY = anchor.y + Math.sin(this.angle) * radius;
    this.body.velocity.x = (targetX - this.x) * 3;
    this.body.velocity.y = (targetY - this.y) * 3;
  }
}

type EnemyArchetype = 'chaser' | 'kiter' | 'tank';

class EnemyShip extends Phaser.GameObjects.Arc {
  declare body: Phaser.Physics.Arcade.Body;
  hp: number;
  archetype: EnemyArchetype;
  private fireTimer = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, archetype: EnemyArchetype) {
    const color =
      archetype === 'chaser' ? 0xe63946 : archetype === 'kiter' ? 0xffba08 : 0x457b9d;
    super(scene, x, y, archetype === 'tank' ? 18 : 12, 0, 360, false, color, 1);
    this.archetype = archetype;
    this.hp = archetype === 'tank' ? 80 : archetype === 'kiter' ? 40 : 30;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setCircle(this.radius);
    this.body.setCollideWorldBounds(true);
  }

  updateBehavior(scene: GameScene, delta: number) {
    const target = scene.commandShip;
    if (!target) {
      return;
    }
    const dir = new Phaser.Math.Vector2(target.x - this.x, target.y - this.y);
    const distance = dir.length();
    if (distance === 0) {
      return;
    }
    dir.normalize();
    switch (this.archetype) {
      case 'chaser':
        this.body.setVelocity(dir.x * 110, dir.y * 110);
        if (distance < 25) {
          target.takeDamage(6 * scene.enemyDamageMultiplier);
        }
        break;
      case 'kiter':
        const desired = distance < 150 ? -80 : 80;
        this.body.setVelocity(dir.x * desired, dir.y * desired);
        this.fireTimer += delta;
        if (this.fireTimer > 1200) {
          scene.spawnBullet(this.x, this.y, target.x, target.y, 'enemy');
          this.fireTimer = 0;
        }
        break;
      case 'tank':
        this.body.setVelocity(dir.x * 60, dir.y * 60);
        break;
    }
  }

  takeDamage(amount: number) {
    this.hp -= amount;
    if (this.hp <= 0) {
      (this.scene as GameScene).handleEnemyDestroyed(this);
    }
  }
}

class SectorGenerator {
  constructor(private scene: GameScene) {}

  generate(sector: number) {
    this.scene.clearSector();
    const asteroidCount = Phaser.Math.Between(4, 6) + sector;
    for (let i = 0; i < asteroidCount; i++) {
      const asteroid = this.scene.add.rectangle(
        Phaser.Math.Between(80, this.scene.scale.width - 80),
        Phaser.Math.Between(80, this.scene.scale.height - 80),
        Phaser.Math.Between(30, 60),
        Phaser.Math.Between(30, 60),
        0x4a4e69,
        0.6
      );
      this.scene.physics.add.existing(asteroid, true);
      this.scene.asteroids.add(asteroid);
    }

    const salvageCount = Phaser.Math.Between(3, 5);
    for (let i = 0; i < salvageCount; i++) {
      const crate = this.scene.add.circle(
        Phaser.Math.Between(60, this.scene.scale.width - 60),
        Phaser.Math.Between(60, this.scene.scale.height - 60),
        12,
        0xffd166,
        1
      );
      this.scene.physics.add.existing(crate);
      const body = crate.body as Phaser.Physics.Arcade.Body;
      body.setCircle(12);
      body.setAllowGravity(false);
      (crate as any).isSalvage = true;
      this.scene.salvage.add(crate);
    }
  }
}

class GameState {
  score = 0;
  sector = 1;
  crateCollected = 0;
  enemiesKilled = 0;
  constructor(public selectedHull: HullDefinition) {}

  computeScore() {
    return this.score + this.sector * 10 + this.enemiesKilled * 2 + this.crateCollected * 5;
  }
}

class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }
  preload() {
    this.add.text(this.scale.width / 2, this.scale.height / 2, 'Booting...', {
      color: '#fff'
    });
  }
  create() {
    this.scene.start('MenuScene');
  }
}

class MenuScene extends Phaser.Scene {
  private meta = new MetaService();
  private state!: MetaState;

  constructor() {
    super('MenuScene');
  }

  create() {
    this.state = this.meta.load();
    this.add
      .text(this.scale.width / 2, 60, 'Space Salvage Swarm', {
        fontSize: '36px',
        color: '#ffffff'
      })
      .setOrigin(0.5, 0.5);

    this.add
      .text(
        this.scale.width / 2,
        110,
        `Total Score: ${this.state.totalScore} | Unlocked hulls: ${this.state.unlockedHulls.length}`,
        { color: '#bde0fe' }
      )
      .setOrigin(0.5, 0.5);

    let y = 180;
    HULLS.forEach((hull) => {
      const unlocked = this.state.unlockedHulls.includes(hull.id);
      const text = this.add
        .text(
          this.scale.width / 2,
          y,
          `${hull.name} - hull ${hull.stats.hull} / shield ${hull.stats.shield} ${unlocked ? '' : '(locked)'}`,
          { color: unlocked ? '#ffffff' : '#999999', fontSize: '20px' }
        )
        .setOrigin(0.5, 0.5)
        .setInteractive();
      text.on('pointerup', () => {
        if (unlocked) {
          this.scene.start('GameScene', { hull });
        }
      });
      y += 50;
    });

    this.add
      .text(this.scale.width / 2, this.scale.height - 60, 'Click a hull to launch a run', {
        color: '#ffd166'
      })
      .setOrigin(0.5, 0.5);
  }

  updateMeta(score: number) {
    this.state.totalScore += score;
    HULLS.forEach((hull) => {
      if (
        !this.state.unlockedHulls.includes(hull.id) &&
        this.state.totalScore >= hull.unlockScore
      ) {
        this.state.unlockedHulls.push(hull.id);
      }
    });
    this.meta.save(this.state);
  }
}

class SummaryScene extends Phaser.Scene {
  constructor() {
    super('SummaryScene');
  }
  create(data: { score: number }) {
    this.add
      .text(this.scale.width / 2, this.scale.height / 2 - 60, 'Run Complete', {
        color: '#ffffff',
        fontSize: '32px'
      })
      .setOrigin(0.5);
    this.add
      .text(this.scale.width / 2, this.scale.height / 2, `Score: ${data.score}`, {
        color: '#ffd166',
        fontSize: '24px'
      })
      .setOrigin(0.5);
    const btn = this.add
      .text(this.scale.width / 2, this.scale.height / 2 + 80, 'Back to Menu', {
        backgroundColor: '#1d3557',
        padding: { x: 20, y: 10 }
      })
      .setOrigin(0.5)
      .setInteractive();
    btn.on('pointerup', () => this.scene.start('MenuScene'));
  }
}

class GameScene extends Phaser.Scene {
  commandShip!: CommandShip;
  escorts!: Phaser.GameObjects.Group;
  enemies!: Phaser.GameObjects.Group;
  asteroids!: Phaser.Physics.Arcade.StaticGroup;
  salvage!: Phaser.Physics.Arcade.Group;
  bullets!: Phaser.Physics.Arcade.Group;
  private generator!: SectorGenerator;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: { [key: string]: Phaser.Input.Keyboard.Key };
  private hudTexts: { hull: Phaser.GameObjects.Text; sector: Phaser.GameObjects.Text; modules: Phaser.GameObjects.Text; modifier: Phaser.GameObjects.Text };
  private paused = false;
  private modifierText = '';
  private state!: GameState;
  private metaSvc = new MetaService();
  private modifiersQueue: SectorModifier[] = [];
  private pendingChoices: Phaser.GameObjects.Container[] = [];
  enemyDamageMultiplier = 1;
  enemyScoreBonus = 0;

  constructor() {
    super('GameScene');
    this.hudTexts = {} as any;
  }

  init(data: { hull: HullDefinition }) {
    this.state = new GameState(data.hull);
  }

  create() {
    this.cameras.main.setBackgroundColor('#0b1d2c');
    this.physics.world.setBounds(0, 0, this.scale.width, this.scale.height);
    this.commandShip = new CommandShip(
      this,
      this.state.selectedHull.stats,
      this.scale.width / 2,
      this.scale.height / 2
    );
    this.escorts = this.add.group();
    this.enemies = this.add.group();
    this.asteroids = this.physics.add.staticGroup();
    this.salvage = this.physics.add.group();
    this.bullets = this.physics.add.group();
    this.generator = new SectorGenerator(this);

    this.spawnEscorts();
    this.generator.generate(1);
    this.spawnInitialModules();
    this.spawnWave();

    this.setupInput();
    this.createHud();

    this.add
      .text(20, this.scale.height - 70, 'Restart Run', {
        color: '#ffffff',
        backgroundColor: '#1d3557',
        padding: { x: 10, y: 6 }
      })
      .setInteractive()
      .on('pointerup', () => this.scene.restart({ hull: this.state.selectedHull }));

    this.add
      .text(150, this.scale.height - 70, 'Back to Menu', {
        color: '#ffffff',
        backgroundColor: '#1d3557',
        padding: { x: 10, y: 6 }
      })
      .setInteractive()
      .on('pointerup', () => this.scene.start('MenuScene'));

    this.physics.add.collider(this.commandShip, this.asteroids);
    this.physics.add.collider(this.enemies, this.asteroids);
    this.physics.add.overlap(this.commandShip, this.salvage, (_ship, crate) => {
      crate.destroy();
      this.state.crateCollected++;
      this.offerModuleReward();
    });
    this.physics.add.overlap(this.bullets, this.enemies, (bullet, enemyObj) => {
      const bulletData = bullet.getData('owner');
      if (bulletData !== 'player') {
        return;
      }
      bullet.destroy();
      (enemyObj as EnemyShip).takeDamage(20);
    });
    this.physics.add.overlap(this.commandShip, this.bullets, (ship, bullet) => {
      if (bullet.getData('owner') === 'enemy') {
        bullet.destroy();
        this.commandShip.takeDamage(12 * this.enemyDamageMultiplier);
      }
    });
    this.physics.add.overlap(this.commandShip, this.enemies, () => {
      this.commandShip.takeDamage(8 * this.enemyDamageMultiplier);
    });
  }

  private spawnEscorts() {
    for (let i = 0; i < 2; i++) {
      const escort = new EscortShip(
        this,
        this.commandShip.x + (i === 0 ? 40 : -40),
        this.commandShip.y,
        0x98c1d9
      );
      this.escorts.add(escort);
      this.commandShip.escorts.push(escort);
    }
  }

  private spawnInitialModules() {
    const starter = new GunModule(MODULE_POOL[0]);
    this.commandShip.attachModule(starter);
  }

  private offerModuleReward() {
    const def = Phaser.Utils.Array.GetRandom(MODULE_POOL);
    const module = this.instantiateModule(def);
    const accepted = this.commandShip.attachModule(module);
    if (!accepted) {
      this.commandShip.detachModule(module);
    }
  }

  private instantiateModule(def: ModuleDefinition) {
    switch (def.type) {
      case 'gun':
        return new GunModule(def);
      case 'engine':
        return new EngineModule(def);
      case 'shield':
        return new ShieldModule(def);
      default:
        return new UtilityModule(def);
    }
  }

  private spawnWave() {
    const count = 3 + this.state.sector;
    for (let i = 0; i < count; i++) {
      const archetype = (['chaser', 'kiter', 'tank'] as EnemyArchetype[])[
        Phaser.Math.Between(0, 2)
      ];
      const enemy = new EnemyShip(
        this,
        Phaser.Math.Between(40, this.scale.width - 40),
        Phaser.Math.Between(40, this.scale.height - 40),
        archetype
      );
      this.enemies.add(enemy);
    }
  }

  private setupInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,SPACE');
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) {
        this.commandShip.aggressiveEscorts = !this.commandShip.aggressiveEscorts;
      }
      if (pointer.rightButtonDown()) {
        this.commandShip.pendingMove = new Phaser.Math.Vector2(pointer.worldX, pointer.worldY);
      }
    });
    this.keys.SPACE.on('down', () => this.togglePause());
  }

  private togglePause() {
    this.paused = !this.paused;
    this.physics.world.isPaused = this.paused;
  }

  private createHud() {
    this.hudTexts = {
      hull: this.add.text(20, 20, '', { color: '#ffffff' }),
      sector: this.add.text(this.scale.width - 220, 20, '', { color: '#ffafcc' }),
      modules: this.add.text(this.scale.width / 2, this.scale.height - 40, '', {
        color: '#edf2f4'
      }).setOrigin(0.5, 0.5),
      modifier: this.add.text(this.scale.width - 220, 50, '', { color: '#ffd166', wordWrap: { width: 200 } })
    };
  }

  update(time: number, delta: number) {
    if (!this.commandShip) {
      return;
    }
    this.handleMovement(delta);
    this.commandShip.shield = Phaser.Math.Clamp(
      this.commandShip.shield + this.commandShip.shieldRegen * (delta / 1000),
      0,
      this.commandShip.maxShield
    );
    this.commandShip.escorts.forEach((escort) =>
      escort.updateOrbit(this.commandShip, delta, this.commandShip.aggressiveEscorts)
    );
    this.commandShip.updateModuleMarkers();
    this.updateSalvagePull();
    this.enemies.getChildren().forEach((enemy) =>
      (enemy as EnemyShip).updateBehavior(this, delta)
    );
    this.updateHud();
    this.checkSectorClear();
  }

  private updateSalvagePull() {
    this.salvage.getChildren().forEach((crate) => {
      const body = crate.body as Phaser.Physics.Arcade.Body;
      if (!body) {
        return;
      }
      const dist = Phaser.Math.Distance.Between(
        crate.x,
        crate.y,
        this.commandShip.x,
        this.commandShip.y
      );
      if (dist < this.commandShip.salvageRange) {
        const dir = new Phaser.Math.Vector2(
          this.commandShip.x - crate.x,
          this.commandShip.y - crate.y
        ).normalize();
        body.setVelocity(dir.x * 80, dir.y * 80);
      } else {
        body.setVelocity(0, 0);
      }
    });
  }

  private handleMovement(delta: number) {
    const speed = this.commandShip.speed + this.commandShip.speedBonus;
    const body = this.commandShip.body;
    let vx = 0;
    let vy = 0;
    if (this.cursors.left.isDown || this.keys.A.isDown) {
      vx -= speed;
    }
    if (this.cursors.right.isDown || this.keys.D.isDown) {
      vx += speed;
    }
    if (this.cursors.up.isDown || this.keys.W.isDown) {
      vy -= speed;
    }
    if (this.cursors.down.isDown || this.keys.S.isDown) {
      vy += speed;
    }
    if (vx !== 0 || vy !== 0) {
      body.setVelocity(vx, vy);
      this.commandShip.pendingMove = undefined;
    } else if (this.commandShip.pendingMove) {
      const dir = new Phaser.Math.Vector2(
        this.commandShip.pendingMove.x - this.commandShip.x,
        this.commandShip.pendingMove.y - this.commandShip.y
      );
      if (dir.length() < 5) {
        this.commandShip.pendingMove = undefined;
        body.setVelocity(0, 0);
      } else {
        dir.normalize();
        body.setVelocity(dir.x * speed, dir.y * speed);
      }
    } else {
      body.setVelocity(0, 0);
    }
  }

  private updateHud() {
    this.hudTexts.hull.setText(
      `Hull ${Math.round(this.commandShip.hull)}/${this.commandShip.maxHull}\nShield ${Math.round(this.commandShip.shield)}/${this.commandShip.maxShield}`
    );
    this.hudTexts.sector.setText(`Sector ${this.state.sector}/3`);
    const moduleLabels = this.commandShip.modules.map((m) => m.def.label).join(' | ');
    this.hudTexts.modules.setText(moduleLabels || 'No modules');
    this.hudTexts.modifier.setText(this.modifierText);
  }

  spawnBullet(sx: number, sy: number, tx: number, ty: number, owner: 'player' | 'enemy') {
    const bullet = this.add.rectangle(sx, sy, 6, 2, owner === 'player' ? 0xffffff : 0xff595e);
    this.physics.add.existing(bullet);
    this.bullets.add(bullet);
    const body = bullet.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    const dir = new Phaser.Math.Vector2(tx - sx, ty - sy).normalize();
    body.setVelocity(dir.x * 250, dir.y * 250);
    bullet.setData('owner', owner);
    this.time.delayedCall(1500, () => bullet.destroy());
  }

  findNearestEnemy(x: number, y: number) {
    let nearest: EnemyShip | undefined;
    let minDist = Number.MAX_VALUE;
    this.enemies.getChildren().forEach((enemy) => {
      const dist = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
      if (dist < minDist) {
        minDist = dist;
        nearest = enemy as EnemyShip;
      }
    });
    return nearest;
  }

  handleEnemyDestroyed(enemy: EnemyShip) {
    enemy.destroy();
    this.state.enemiesKilled++;
    this.state.score += 5 + this.enemyScoreBonus;
    if (Phaser.Math.Between(0, 100) < 30) {
      const crate = this.add.circle(enemy.x, enemy.y, 10, 0xffd166, 1);
      this.physics.add.existing(crate);
      (crate.body as Phaser.Physics.Arcade.Body).setCircle(10);
      (crate as any).isSalvage = true;
      this.salvage.add(crate);
    }
  }

  handlePlayerDeath() {
    const finalScore = this.state.computeScore();
    const meta = this.metaSvc.load();
    meta.totalScore += finalScore;
    this.metaSvc.save(meta);
    this.scene.start('SummaryScene', { score: finalScore });
  }

  clearSector() {
    this.asteroids.clear(true, true);
    this.salvage.clear(true, true);
    this.enemies.clear(true, true);
  }

  private checkSectorClear() {
    if (this.enemies.getLength() === 0 && this.pendingChoices.length === 0) {
      if (this.state.sector >= 3) {
        this.endRun();
      } else {
        this.presentSectorChoices();
      }
    }
  }

  private presentSectorChoices() {
    this.modifiersQueue = this.generateModifiers();
    const container = this.add.container(this.scale.width / 2, this.scale.height / 2);
    const bg = this.add.rectangle(0, 0, 420, 220, 0x1d3557, 0.9);
    container.add(bg);
    let y = -70;
    this.modifiersQueue.forEach((mod) => {
      const text = this.add
        .text(
          -180,
          y,
          `${mod.label}\n${mod.description}`,
          { color: '#fff', wordWrap: { width: 360 } }
        )
        .setInteractive();
      text.on('pointerup', () => {
        this.enemyDamageMultiplier = 1;
        this.enemyScoreBonus = 0;
        this.modifierText = '';
        this.applyModifier(mod);
        container.destroy();
        this.pendingChoices = [];
        this.state.sector++;
        this.generator.generate(this.state.sector);
        this.spawnWave();
      });
      container.add(text);
      y += 70;
    });
    this.pendingChoices.push(container);
  }

  private generateModifiers(): SectorModifier[] {
    const mods: SectorModifier[] = [
      {
        id: 'enemyDamage',
        label: '+25% enemy damage',
        description: 'Enemies hit harder but give +5 score.',
        apply: (scene) => {
          scene.enemyDamageMultiplier = 1.25;
          scene.enemyScoreBonus = 5;
          scene.modifierText = '+25% enemy damage';
        }
      },
      {
        id: 'extraSalvage',
        label: 'More salvage',
        description: 'Spawns extra crates on arrival.',
        apply: (scene) => {
          for (let i = 0; i < 2; i++) {
            const crate = scene.add.circle(
              Phaser.Math.Between(60, scene.scale.width - 60),
              Phaser.Math.Between(60, scene.scale.height - 60),
              10,
              0xffd166,
              1
            );
            scene.physics.add.existing(crate);
            (crate.body as Phaser.Physics.Arcade.Body).setCircle(10);
            scene.salvage.add(crate);
          }
          scene.modifierText = 'Bonus salvage';
        }
      },
      {
        id: 'asteroidField',
        label: 'Dense asteroids',
        description: 'Obstacles make movement trickier but +shield regen.',
        apply: (scene) => {
          scene.commandShip.shieldRegen += 0.5;
          scene.modifierText = 'Asteroid density + shield regen';
        }
      }
    ];
    return Phaser.Utils.Array.Shuffle(mods).slice(0, 3);
  }

  private applyModifier(mod: SectorModifier) {
    mod.apply(this);
  }

  private endRun() {
    const finalScore = this.state.computeScore();
    const meta = this.metaSvc.load();
    meta.totalScore += finalScore;
    HULLS.forEach((hull) => {
      if (
        !meta.unlockedHulls.includes(hull.id) &&
        meta.totalScore >= hull.unlockScore
      ) {
        meta.unlockedHulls.push(hull.id);
      }
    });
    this.metaSvc.save(meta);
    this.scene.start('SummaryScene', { score: finalScore });
  }
}

const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  backgroundColor: '#05090f',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    parent: 'space-salvage-swarm-root',
    width: window.innerWidth,
    height: window.innerHeight
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: [BootScene, MenuScene, GameScene, SummaryScene]
};

export function launchSpaceSalvageSwarm() {
  return new Phaser.Game(gameConfig);
}

if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    if (!window.hasOwnProperty('__spaceSalvageSwarm')) {
      (window as any).__spaceSalvageSwarm = launchSpaceSalvageSwarm();
    }
  });
}
