import Phaser from 'phaser';

type TraitId = 'balanced' | 'dense' | 'industrial';
type DefenseType = 'turret' | 'automaton';
type EnemyType = 'grunt' | 'runner' | 'shielder';

interface TraitDefinition {
  id: TraitId;
  name: string;
  description: string;
  modifier: (scene: RunScene) => void;
}

interface MetaState {
  maxWave: number;
  unlockedTraits: TraitId[];
  unlockedGadgets: string[];
}

interface BuildPad {
  nodeId: number;
  position: Phaser.Math.Vector2;
  active: boolean;
  sprite: Phaser.GameObjects.Rectangle;
  defense?: Defense;
}

class MetaStore {
  private key = 'clockwork-siege-meta';
  load(): MetaState {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) {
        return { maxWave: 0, unlockedTraits: ['balanced'], unlockedGadgets: [] };
      }
      const parsed = JSON.parse(raw) as MetaState;
      if (!parsed.unlockedTraits.includes('balanced')) {
        parsed.unlockedTraits.push('balanced');
      }
      return parsed;
    } catch {
      return { maxWave: 0, unlockedTraits: ['balanced'], unlockedGadgets: [] };
    }
  }
  save(state: MetaState) {
    localStorage.setItem(this.key, JSON.stringify(state));
  }
}

const TRAITS: TraitDefinition[] = [
  {
    id: 'balanced',
    name: 'Default Grid',
    description: 'Standard pads and streets.',
    modifier: () => {}
  },
  {
    id: 'dense',
    name: 'Dense City',
    description: 'More build pads, less income.',
    modifier: (scene) => {
      scene.incomeModifier = 0.8;
      scene.addExtraPads(2);
    }
  },
  {
    id: 'industrial',
    name: 'Industrial Hub',
    description: 'Fewer streets, extra cogs.',
    modifier: (scene) => {
      scene.cogs += 50;
      scene.reduceStreets();
    }
  }
];

class CityGraph {
  nodes: Phaser.Math.Vector2[] = [];
  edges: Map<number, Set<number>> = new Map();
  constructor(private scene: RunScene) {
    this.createBaseGraph();
  }

  createBaseGraph() {
    this.nodes = [
      new Phaser.Math.Vector2(100, 100),
      new Phaser.Math.Vector2(300, 100),
      new Phaser.Math.Vector2(500, 100),
      new Phaser.Math.Vector2(100, 250),
      new Phaser.Math.Vector2(300, 250),
      new Phaser.Math.Vector2(500, 250),
      new Phaser.Math.Vector2(100, 400),
      new Phaser.Math.Vector2(300, 400),
      new Phaser.Math.Vector2(500, 400)
    ];
    this.nodes.forEach((_node, index) => this.edges.set(index, new Set()));
    const connections = [
      [0, 1],
      [1, 2],
      [3, 4],
      [4, 5],
      [6, 7],
      [7, 8],
      [0, 3],
      [3, 6],
      [1, 4],
      [4, 7],
      [2, 5],
      [5, 8]
    ];
    connections.forEach(([a, b]) => this.connect(a, b));
  }

  connect(a: number, b: number) {
    this.edges.get(a)!.add(b);
    this.edges.get(b)!.add(a);
  }

  disconnect(a: number, b: number) {
    this.edges.get(a)!.delete(b);
    this.edges.get(b)!.delete(a);
  }

  toggleRandomStreets(count: number) {
    const allEdges: [number, number][] = [];
    this.edges.forEach((neighbors, node) => {
      neighbors.forEach((neighbor) => {
        if (node < neighbor) {
          allEdges.push([node, neighbor]);
        }
      });
    });
    Phaser.Utils.Array.Shuffle(allEdges)
      .slice(0, count)
      .forEach(([a, b]) => {
        if (this.edges.get(a)!.has(b)) {
          this.disconnect(a, b);
        } else {
          this.connect(a, b);
        }
      });
    this.scene.redrawStreets();
  }
}

class Pathfinder {
  constructor(private graph: CityGraph) {}
  findPath(start: number, goal: number) {
    const queue: number[] = [start];
    const cameFrom = new Map<number, number>();
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === goal) break;
      this.graph.edges.get(current)!.forEach((neighbor) => {
        if (!cameFrom.has(neighbor) && neighbor !== start) {
          cameFrom.set(neighbor, current);
          queue.push(neighbor);
        }
      });
    }
    if (!cameFrom.has(goal)) return [];
    const path: number[] = [goal];
    let current = goal;
    while (current !== start) {
      current = cameFrom.get(current)!;
      path.unshift(current);
    }
    return path;
  }
}

class Defense extends Phaser.GameObjects.Container {
  type: DefenseType;
  range: number;
  damage: number;
  cooldown = 0;
  level = 1;
  constructor(scene: Phaser.Scene, x: number, y: number, type: DefenseType) {
    super(scene, x, y);
    this.type = type;
    const base = scene.add.rectangle(0, 0, 30, 30, type === 'turret' ? 0x457b9d : 0x6a994e);
    this.range = type === 'turret' ? 140 : 90;
    this.damage = type === 'turret' ? 20 : 10;
    this.add(base);
    scene.add.existing(this);
  }

  updateDefense(delta: number, scene: RunScene) {
    if (this.type === 'turret') {
      this.cooldown -= delta;
      if (this.cooldown <= 0) {
        const target = scene.findNearestEnemy(this.x, this.y, this.range);
        if (target) {
          scene.damageEnemy(target, this.damage);
          this.cooldown = 1000;
        }
      }
    } else {
      this.cooldown -= delta;
      if (this.cooldown <= 0) {
        const unit = scene.spawnAutomaton(new Phaser.Math.Vector2(this.x, this.y));
        unit.damage = this.damage;
        unit.speed = 80 + this.level * 5;
        this.cooldown = 4000;
      }
    }
  }
}

class Enemy extends Phaser.GameObjects.Ellipse {
  type: EnemyType;
  hp: number;
  speed: number;
  path: Phaser.Math.Vector2[] = [];
  constructor(scene: Phaser.Scene, point: Phaser.Math.Vector2, type: EnemyType) {
    super(
      scene,
      point.x,
      point.y,
      type === 'shielder' ? 20 : 14,
      type === 'runner' ? 14 : 20,
      type === 'shielder' ? 0x6c757d : 0xf3722c
    );
    this.type = type;
    this.hp = type === 'shielder' ? 140 : type === 'runner' ? 60 : 90;
    this.speed = type === 'runner' ? 110 : 70;
    scene.add.existing(this);
  }

  updateEnemy(delta: number) {
    if (this.path.length === 0) return;
    const target = this.path[0];
    const dir = new Phaser.Math.Vector2(target.x - this.x, target.y - this.y);
    const dist = dir.length();
    if (dist < 5) {
      this.path.shift();
      return;
    }
    dir.normalize();
    this.x += dir.x * this.speed * (delta / 1000);
    this.y += dir.y * this.speed * (delta / 1000);
  }
}

class WaveController {
  wave = 1;
  currentEnemies: Enemy[] = [];
  constructor(private scene: RunScene) {}

  startWave() {
    const spawnNodes = [0, 2, 6, 8];
    for (let i = 0; i < this.wave + 2; i++) {
      const nodeIndex = Phaser.Utils.Array.GetRandom(spawnNodes);
      const enemyType: EnemyType = Phaser.Utils.Array.GetRandom(['grunt', 'runner', 'shielder']);
      const enemy = new Enemy(this.scene, this.scene.graph.nodes[nodeIndex], enemyType);
      const nodePath = this.scene.pathfinder.findPath(nodeIndex, 4);
      const finalPath = nodePath.length > 0 ? nodePath : [nodeIndex, 4];
      enemy.path = finalPath.map((nodeId) => this.scene.graph.nodes[nodeId]);
      this.scene.enemies.add(enemy);
    }
  }
}

class MenuScene extends Phaser.Scene {
  private metaStore = new MetaStore();
  private meta!: MetaState;
  private selectedTrait?: TraitDefinition;
  constructor() {
    super('MenuScene');
  }
  create() {
    this.meta = this.metaStore.load();
    this.add
      .text(this.scale.width / 2, 80, 'Clockwork Siege', { fontSize: '36px', color: '#fff' })
      .setOrigin(0.5);
    this.add
      .text(this.scale.width / 2, 130, `Best wave ${this.meta.maxWave}`, { color: '#ffd166' })
      .setOrigin(0.5);
    let y = 200;
    TRAITS.filter((trait) => this.meta.unlockedTraits.includes(trait.id)).forEach((trait) => {
      const btn = this.add
        .text(this.scale.width / 2, y, `${trait.name} - ${trait.description}`, {
          backgroundColor: '#1d3557',
          color: '#fff',
          padding: { x: 10, y: 6 }
        })
        .setOrigin(0.5)
        .setInteractive();
      btn.on('pointerup', () => {
        this.selectedTrait = trait;
        btn.setBackgroundColor('#2a9d8f');
      });
      y += 60;
    });
    this.add
      .text(this.scale.width / 2, this.scale.height - 100, 'Start Defense', {
        backgroundColor: '#1d3557',
        color: '#fff',
        padding: { x: 30, y: 14 }
      })
      .setOrigin(0.5)
      .setInteractive()
      .on('pointerup', () => {
        if (!this.selectedTrait) {
          this.selectedTrait = TRAITS[0];
        }
        this.scene.start('RunScene', { trait: this.selectedTrait?.id });
      });
  }
}

class RunScene extends Phaser.Scene {
  graph!: CityGraph;
  pathfinder!: Pathfinder;
  enemies!: Phaser.GameObjects.Group;
  defenses!: Phaser.GameObjects.Group;
  automata!: Phaser.GameObjects.Group;
  pads: BuildPad[] = [];
  cogs = 100;
  coreHp = 200;
  waveController!: WaveController;
  hud!: { cogs: Phaser.GameObjects.Text; wave: Phaser.GameObjects.Text; core: Phaser.GameObjects.Text };
  trait!: TraitId;
  incomeModifier = 1;
  phase: 'combat' | 'build' = 'combat';

  constructor() {
    super('RunScene');
  }

  init(data: { trait: TraitId }) {
    this.trait = data.trait;
  }

  create() {
    this.cameras.main.setBackgroundColor('#0b132b');
    this.graph = new CityGraph(this);
    this.pathfinder = new Pathfinder(this.graph);
    this.enemies = this.add.group();
    this.defenses = this.add.group();
    this.automata = this.add.group();
    this.createPads();
    this.waveController = new WaveController(this);
    const trait = TRAITS.find((t) => t.id === this.trait);
    trait?.modifier(this);
    this.hud = {
      cogs: this.add.text(20, 20, `Cogs ${this.cogs}`, { color: '#fff' }),
      wave: this.add.text(20, 50, 'Wave 1', { color: '#ffd166' }),
      core: this.add.text(20, 80, `Core ${this.coreHp}`, { color: '#a9def9' })
    };
    this.createBuildButtons();
    this.redrawStreets();
    this.waveController.startWave();
  }

  createPads() {
    this.pads = this.graph.nodes
      .map((pos, index) => {
        if (index === 4) return undefined;
        const sprite = this.add.rectangle(pos.x, pos.y, 26, 26, 0x1d3557, 0.6).setInteractive();
        const pad: BuildPad = {
          nodeId: index,
          position: pos,
          active: true,
          sprite
        };
        sprite.on('pointerup', () => this.handlePadClick(pad));
        return pad;
      })
      .filter((pad): pad is BuildPad => !!pad);
  }

  addExtraPads(count: number) {
    for (let i = 0; i < count; i++) {
      const newPad = Phaser.Utils.Array.GetRandom(this.pads.filter((pad) => !pad.defense));
      newPad.active = true;
      newPad.sprite.setFillStyle(0x2a9d8f, 0.8);
    }
  }

  reduceStreets() {
    this.graph.toggleRandomStreets(2);
  }

  shiftBuildPads() {
    const shuffled = Phaser.Utils.Array.Shuffle([...this.pads]);
    shuffled.slice(0, 2).forEach((pad) => {
      pad.active = false;
      pad.sprite.setFillStyle(0x555555, 0.3);
      if (pad.defense) {
        pad.defense.destroy();
        pad.defense = undefined;
      }
    });
    shuffled.slice(2, 4).forEach((pad) => {
      pad.active = true;
      pad.sprite.setFillStyle(0x2a9d8f, 0.8);
    });
  }

  redrawStreets() {
    const graphics = this.add.graphics();
    graphics.clear();
    graphics.lineStyle(4, 0xe5e5e5, 0.3);
    this.graph.edges.forEach((neighbors, node) => {
      neighbors.forEach((neighbor) => {
        if (node < neighbor) {
          const a = this.graph.nodes[node];
          const b = this.graph.nodes[neighbor];
          graphics.strokeLineShape(new Phaser.Geom.Line(a.x, a.y, b.x, b.y));
        }
      });
    });
  }

  createBuildButtons() {
    const turretBtn = this.add
      .text(this.scale.width - 220, this.scale.height - 80, 'Turret (40)', {
        backgroundColor: '#1d3557',
        color: '#fff',
        padding: { x: 10, y: 6 }
      })
      .setInteractive();
    turretBtn.on('pointerup', () => (this.selectedDefense = 'turret'));

    const autoBtn = this.add
      .text(this.scale.width - 100, this.scale.height - 80, 'Automaton (50)', {
        backgroundColor: '#1d3557',
        color: '#fff',
        padding: { x: 10, y: 6 }
      })
      .setInteractive();
    autoBtn.on('pointerup', () => (this.selectedDefense = 'automaton'));
  }

  selectedDefense: DefenseType = 'turret';

  handlePadClick(pad: BuildPad) {
    if (!pad.active) return;
    if (pad.defense) {
      pad.defense.level++;
      pad.defense.damage += 5;
      return;
    }
    const cost = this.selectedDefense === 'turret' ? 40 : 50;
    if (this.cogs < cost) return;
    this.cogs -= cost;
    const defense = new Defense(this, pad.position.x, pad.position.y, this.selectedDefense);
    pad.defense = defense;
    this.defenses.add(defense);
  }

  update(time: number, delta: number) {
    this.defenses.getChildren().forEach((defense) =>
      (defense as Defense).updateDefense(delta, this)
    );
    this.enemies.getChildren().forEach((enemy) => (enemy as Enemy).updateEnemy(delta));
    this.automata.getChildren().forEach((unit) => {
      const automaton = unit as Enemy;
      automaton.updateEnemy(delta);
    });
    this.checkCoreDamage();
    this.checkWaveComplete();
    this.hud.cogs.setText(`Cogs ${Math.floor(this.cogs)}`);
    this.hud.core.setText(`Core ${Math.floor(this.coreHp)}`);
  }

  findNearestEnemy(x: number, y: number, range: number) {
    let target: Enemy | undefined;
    let min = range;
    this.enemies.getChildren().forEach((enemy) => {
      const dist = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
      if (dist < min) {
        min = dist;
        target = enemy as Enemy;
      }
    });
    return target;
  }

  damageEnemy(enemy: Enemy, amount: number) {
    if (!enemy) return;
    const modifier = enemy.type === 'shielder' ? 0.6 : 1;
    enemy.hp -= amount * modifier;
    if (enemy.hp <= 0) {
      this.cogs += 5 * this.incomeModifier;
      enemy.destroy();
      this.enemies.remove(enemy, true, true);
    }
  }

  spawnAutomaton(position: Phaser.Math.Vector2) {
    const unit = new Enemy(this, position.clone(), 'grunt');
    unit.path = [this.graph.nodes[4]];
    this.automata.add(unit);
    return unit;
  }

  checkCoreDamage() {
    this.enemies.getChildren().forEach((enemy) => {
      if (Phaser.Math.Distance.Between(enemy.x, enemy.y, this.graph.nodes[4].x, this.graph.nodes[4].y) < 20) {
        this.coreHp -= 10;
        (enemy as Enemy).hp = 0;
        (enemy as Enemy).destroy();
        this.enemies.remove(enemy, true, true);
      }
    });
    if (this.coreHp <= 0) {
      this.scene.start('SummaryScene', { wave: this.waveController.wave });
    }
  }

  checkWaveComplete() {
    if (this.enemies.getLength() === 0) {
      this.phase = 'build';
      this.time.delayedCall(2000, () => {
        this.graph.toggleRandomStreets(2);
        this.shiftBuildPads();
        this.waveController.wave++;
        this.hud.wave.setText(`Wave ${this.waveController.wave}`);
        this.waveController.startWave();
      });
    }
  }
}

class SummaryScene extends Phaser.Scene {
  private metaStore = new MetaStore();
  constructor() {
    super('SummaryScene');
  }
  create(data: { wave: number }) {
    const meta = this.metaStore.load();
    if (data.wave > meta.maxWave) {
      meta.maxWave = data.wave;
      if (!meta.unlockedTraits.includes('industrial')) {
        meta.unlockedTraits.push('industrial');
      }
    }
    if (data.wave >= 5 && !meta.unlockedTraits.includes('dense')) {
      meta.unlockedTraits.push('dense');
    }
    this.metaStore.save(meta);
    this.add
      .text(this.scale.width / 2, 200, `Wave reached ${data.wave}`, {
        color: '#ffd166',
        fontSize: '28px'
      })
      .setOrigin(0.5);
    this.add
      .text(this.scale.width / 2, 260, 'Back to menu', {
        backgroundColor: '#1d3557',
        color: '#fff',
        padding: { x: 20, y: 10 }
      })
      .setOrigin(0.5)
      .setInteractive()
      .on('pointerup', () => this.scene.start('MenuScene'));
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
  backgroundColor: '#0b132b',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 640,
    height: 480,
    parent: 'clockwork-siege-root'
  },
  scene: [BootScene, MenuScene, RunScene, SummaryScene]
};

export function launchClockworkSiege() {
  return new Phaser.Game(config);
}

if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    if (!(window as any).__clockworkSiege) {
      (window as any).__clockworkSiege = launchClockworkSiege();
    }
  });
}
