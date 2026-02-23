import * as PIXI from 'pixi.js';

type TileOwner = 'player' | 'enemy' | 'neutral';
type MutationBranch = 'runners' | 'spikers' | 'gas';
type StrainId = 'balanced' | 'aggressive' | 'adaptive';
const BUILD_COSTS: Record<MutationBranch, number> = {
  runners: 20,
  spikers: 35,
  gas: 45
};

interface TileData {
  nutrient: number;
  moisture: number;
  owner: TileOwner;
  structure?: MutationBranch;
  sprite: PIXI.Graphics;
}

interface Unit {
  x: number;
  y: number;
  type: MutationBranch;
  hp: number;
  maxHp: number;
  damage: number;
  speed: number;
  target?: Enemy;
}

interface Enemy {
  x: number;
  y: number;
  hp: number;
  speed: number;
}

interface MetaState {
  bestWave: number;
  unlockedStrains: StrainId[];
}

const GRID_SIZE = 40;
const TILE_SIZE = 18;

const STRAINS: Record<StrainId, { name: string; description: string; bonus: string }> = {
  balanced: { name: 'Balanced Strain', description: 'Standard growth.', bonus: '+0' },
  aggressive: {
    name: 'Aggressive Strain',
    description: 'Cheaper units, slower expansion.',
    bonus: 'Units -10% cost'
  },
  adaptive: {
    name: 'Adaptive Strain',
    description: 'Mutation unlocks cheaper.',
    bonus: 'Unlocks -20% cost'
  }
};

class MetaStore {
  private key = 'fungal-frontier-meta';
  load(): MetaState {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) {
        return { bestWave: 0, unlockedStrains: ['balanced'] };
      }
      const parsed = JSON.parse(raw) as MetaState;
      if (!parsed.unlockedStrains.includes('balanced')) {
        parsed.unlockedStrains.push('balanced');
      }
      return parsed;
    } catch {
      return { bestWave: 0, unlockedStrains: ['balanced'] };
    }
  }
  save(state: MetaState) {
    localStorage.setItem(this.key, JSON.stringify(state));
  }
}

class MapGenerator {
  tiles: TileData[][] = [];
  constructor(private app: PIXI.Application) {
    this.generate();
  }

  generate() {
    for (let y = 0; y < GRID_SIZE; y++) {
      const row: TileData[] = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        const noise = Math.random();
        const nutrient = noise > 0.7 ? 2 : noise > 0.35 ? 1 : 0;
        const moisture = Math.random() > 0.5 ? 1 : 0;
        const sprite = new PIXI.Graphics();
        sprite.x = x * TILE_SIZE;
        sprite.y = y * TILE_SIZE;
        this.app.stage.addChild(sprite);
        row.push({
          nutrient,
          moisture,
          owner: 'neutral',
          sprite
        });
      }
      this.tiles.push(row);
    }
    this.refreshColors();
  }

  refreshColors() {
    this.tiles.forEach((row) =>
      row.forEach((tile) => {
        const color =
          tile.owner === 'player'
            ? 0x90e0ef
            : tile.owner === 'enemy'
            ? 0xf94144
            : this.neutralColor(tile.nutrient, tile.moisture);
        tile.sprite.clear();
        tile.sprite.beginFill(color, 1);
        tile.sprite.drawRect(0, 0, TILE_SIZE - 1, TILE_SIZE - 1);
        tile.sprite.endFill();
      })
    );
  }

  neutralColor(nutrient: number, moisture: number) {
    const base = [0x2a9d8f, 0x1b4332, 0x0b2838][nutrient];
    const offset = moisture === 0 ? 0 : 0x111111 * moisture;
    return base + offset;
  }
}

class MutationTree {
  unlocked: Set<MutationBranch> = new Set(['runners']);
  costs: Record<MutationBranch, number> = {
    runners: 30,
    spikers: 50,
    gas: 70
  };
  unlock(branch: MutationBranch, biomass: number, strain: StrainId) {
    if (this.unlocked.has(branch)) return { success: false, biomass };
    const modifier = strain === 'adaptive' ? 0.8 : 1;
    const cost = Math.round(this.costs[branch] * modifier);
    if (biomass < cost) return { success: false, biomass };
    this.unlocked.add(branch);
    return { success: true, biomass: biomass - cost };
  }
}

class EnemyWaveController {
  wave = 1;
  timer = 0;
  interval = 15000;
  enemies: Enemy[] = [];

  update(delta: number, game: FungalFrontierGame) {
    this.timer += delta;
    if (this.timer >= this.interval) {
      this.spawnWave(game);
      this.timer = 0;
      this.wave++;
    }
    this.enemies.forEach((enemy) => {
      const dir = {
        x: (game.heartPosition.x - enemy.x) / 100,
        y: (game.heartPosition.y - enemy.y) / 100
      };
      const length = Math.hypot(dir.x, dir.y);
      enemy.x += (dir.x / length) * enemy.speed * (delta / 1000);
      enemy.y += (dir.y / length) * enemy.speed * (delta / 1000);
      if (Math.hypot(enemy.x - game.heartPosition.x, enemy.y - game.heartPosition.y) < 10) {
        game.heartHp -= 5 * (delta / 1000);
      }
    });
    this.enemies = this.enemies.filter((enemy) => enemy.hp > 0);
  }

  spawnWave(game: FungalFrontierGame) {
    for (let i = 0; i < this.wave + 1; i++) {
      this.enemies.push({
        x: Math.random() * GRID_SIZE * TILE_SIZE,
        y: 0,
        hp: 80 + this.wave * 10,
        speed: 30 + Math.random() * 10
      });
    }
  }
}

class FungalFrontierGame {
  app: PIXI.Application;
  map: MapGenerator;
  mutationTree = new MutationTree();
  metaStore = new MetaStore();
  strain: StrainId = 'balanced';
  biomass = 50;
  claimedTiles: Set<string> = new Set();
  units: Unit[] = [];
  enemies: Enemy[] = [];
  waveController = new EnemyWaveController();
  heartPosition = { x: (GRID_SIZE / 2) * TILE_SIZE, y: (GRID_SIZE / 2) * TILE_SIZE };
  heartHp = 100;
  uiRoot: HTMLDivElement;
  meta = this.metaStore.load();
  overlay?: HTMLDivElement;

  constructor(private container: HTMLElement) {
    this.app = new PIXI.Application({
      width: GRID_SIZE * TILE_SIZE,
      height: GRID_SIZE * TILE_SIZE,
      backgroundColor: 0x0b0c10
    });
    container.appendChild(this.app.view as HTMLCanvasElement);
    this.map = new MapGenerator(this.app);
    this.claimTile(Math.floor(GRID_SIZE / 2), Math.floor(GRID_SIZE / 2));
    this.spawnUnit('runners');
    this.app.ticker.add((delta) => this.update(delta));
    this.uiRoot = this.createUI();
    this.buildMenu();
    this.app.view.addEventListener('click', (event) => this.handleGridClick(event));
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  resize() {
    const scale = Math.min(
      window.innerWidth / (GRID_SIZE * TILE_SIZE),
      (window.innerHeight - 160) / (GRID_SIZE * TILE_SIZE)
    );
    this.app.stage.scale.set(scale);
  }

  createUI() {
    const ui = document.createElement('div');
    ui.className = 'fungal-ui';
    ui.innerHTML = `
      <div class="hud">
        <div id="biomassDisplay">Biomass: ${Math.floor(this.biomass)}</div>
        <div id="waveDisplay">Wave 1</div>
        <div>Heart HP: <span id="heartHp">${this.heartHp}</span></div>
      </div>
      <div class="sidebar">
        <h3>Mutations</h3>
        <button data-mutation="runners">Runners</button>
        <button data-mutation="spikers">Spikers</button>
        <button data-mutation="gas">Gas Pods</button>
      <h3>Build Pit</h3>
        <button data-build="runners">Runner Pit (${BUILD_COSTS.runners})</button>
        <button data-build="spikers">Spiker Pit (${BUILD_COSTS.spikers})</button>
        <button data-build="gas">Gas Pit (${BUILD_COSTS.gas})</button>
      </div>
    `;
    this.container.appendChild(ui);
    ui.querySelectorAll('button[data-mutation]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const branch = (btn as HTMLButtonElement).dataset.mutation as MutationBranch;
        const result = this.mutationTree.unlock(branch, this.biomass, this.strain);
        if (result.success) {
          this.biomass = result.biomass;
          (btn as HTMLButtonElement).disabled = true;
        }
      });
    });
    ui.querySelectorAll('button[data-build]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const branch = (btn as HTMLButtonElement).dataset.build as MutationBranch;
        this.pendingBuild = branch;
      });
    });
    return ui;
  }

  buildMenu() {
    const menu = document.createElement('div');
    menu.className = 'fungal-overlay';
    menu.innerHTML = `
      <h2>Fungal Frontier</h2>
      <p>Best wave: ${this.meta.bestWave}</p>
      <div class="strain-options"></div>
      <button id="startRun">Start Run</button>
    `;
    this.container.appendChild(menu);
    const options = menu.querySelector('.strain-options')!;
    this.meta.unlockedStrains.forEach((id) => {
      const btn = document.createElement('button');
      btn.textContent = STRAINS[id].name;
      btn.addEventListener('click', () => {
        this.strain = id;
        Array.from(options.children).forEach((child) => child.classList.remove('active'));
        btn.classList.add('active');
      });
      options.appendChild(btn);
    });
    menu.querySelector('#startRun')!.addEventListener('click', () => {
      this.overlay = menu;
      menu.remove();
    });
  }

  claimedKey(x: number, y: number) {
    return `${x},${y}`;
  }

  claimTile(x: number, y: number) {
    const tile = this.map.tiles[y][x];
    if (tile.owner === 'player') return;
    tile.owner = 'player';
    this.claimedTiles.add(this.claimedKey(x, y));
    this.map.refreshColors();
  }

  handleGridClick(event: MouseEvent) {
    const rect = (this.app.view as HTMLCanvasElement).getBoundingClientRect();
    const x = Math.floor(((event.clientX - rect.left) / rect.width) * GRID_SIZE);
    const y = Math.floor(((event.clientY - rect.top) / rect.height) * GRID_SIZE);
    if (x < 0 || y < 0 || x >= GRID_SIZE || y >= GRID_SIZE) return;
    if (!this.isAdjacentToClaimed(x, y)) return;
    const cost = 5;
    if (this.biomass >= cost) {
      this.biomass -= cost;
      this.claimTile(x, y);
      if (this.pendingBuild && this.mutationTree.unlocked.has(this.pendingBuild)) {
        this.buildMutationPit(x, y, this.pendingBuild);
        this.pendingBuild = undefined;
      }
    }
  }

  isAdjacentToClaimed(x: number, y: number) {
    const key = this.claimedKey(x, y);
    if (this.claimedTiles.has(key)) return false;
    const neighbors = [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1]
    ];
    return neighbors.some(([nx, ny]) => this.claimedTiles.has(this.claimedKey(nx, ny)));
  }

  pendingBuild?: MutationBranch;

  buildMutationPit(x: number, y: number, branch: MutationBranch) {
    const cost = BUILD_COSTS[branch];
    if (this.biomass < cost) return;
    this.biomass -= cost;
    const tile = this.map.tiles[y][x];
    tile.structure = branch;
    setInterval(() => this.spawnUnit(branch, x, y), 8000);
  }

  spawnUnit(branch: MutationBranch, tileX?: number, tileY?: number) {
    const stats: Record<MutationBranch, Partial<Unit>> = {
      runners: { speed: 60, damage: 6, hp: 40 },
      spikers: { speed: 50, damage: 8, hp: 50 },
      gas: { speed: 40, damage: 4, hp: 60 }
    };
    const x = tileX ? tileX * TILE_SIZE : this.heartPosition.x;
    const y = tileY ? tileY * TILE_SIZE : this.heartPosition.y;
    this.units.push({
      x,
      y,
      type: branch,
      maxHp: stats[branch].hp || 40,
      hp: stats[branch].hp || 40,
      damage: stats[branch].damage || 6,
      speed: stats[branch].speed || 50
    });
  }

  update(delta: number) {
    this.biomass += this.claimedTiles.size * 0.01 * (delta / 16);
    this.waveController.update(delta, this);
    this.enemies = this.waveController.enemies;
    this.units.forEach((unit) => {
      if (!unit.target || unit.target.hp <= 0) {
        unit.target = this.enemies.sort(
          (a, b) => Math.hypot(unit.x - a.x, unit.y - a.y) - Math.hypot(unit.x - b.x, unit.y - b.y)
        )[0];
      }
      if (unit.target) {
        const dir = { x: unit.target.x - unit.x, y: unit.target.y - unit.y };
        const dist = Math.hypot(dir.x, dir.y);
        if (dist > 5) {
          unit.x += (dir.x / dist) * unit.speed * (delta / 1000);
          unit.y += (dir.y / dist) * unit.speed * (delta / 1000);
        } else {
          unit.target.hp -= (unit.damage * delta) / 1000;
        }
      }
    });
    this.units = this.units.filter((unit) => unit.hp > 0);
    this.checkGameOver();
    this.renderUnits();
    this.renderEnemies();
    this.updateHUD();
  }

  updateHUD() {
    const biomassDisplay = document.getElementById('biomassDisplay');
    const waveDisplay = document.getElementById('waveDisplay');
    const hpDisplay = document.getElementById('heartHp');
    if (biomassDisplay) biomassDisplay.textContent = `Biomass: ${Math.floor(this.biomass)}`;
    if (waveDisplay) waveDisplay.textContent = `Wave ${this.waveController.wave}`;
    if (hpDisplay) hpDisplay.textContent = this.heartHp.toFixed(0);
  }

  unitSprites: PIXI.Graphics[] = [];
  enemySprites: PIXI.Graphics[] = [];

  renderUnits() {
    this.unitSprites.forEach((sprite) => this.app.stage.removeChild(sprite));
    this.unitSprites = this.units.map((unit) => {
      const sprite = new PIXI.Graphics();
      sprite.beginFill(0xffffff);
      sprite.drawCircle(0, 0, 5);
      sprite.endFill();
      sprite.x = unit.x;
      sprite.y = unit.y;
      this.app.stage.addChild(sprite);
      return sprite;
    });
  }

  renderEnemies() {
    this.enemySprites.forEach((sprite) => this.app.stage.removeChild(sprite));
    this.enemySprites = this.enemies.map((enemy) => {
      const sprite = new PIXI.Graphics();
      sprite.beginFill(0xff4d6d);
      sprite.drawCircle(0, 0, 6);
      sprite.endFill();
      sprite.x = enemy.x;
      sprite.y = enemy.y;
      this.app.stage.addChild(sprite);
      return sprite;
    });
  }

  checkGameOver() {
    if (this.heartHp <= 0) {
      this.endRun();
    }
  }

  endRun() {
    this.app.ticker.stop();
    const meta = this.metaStore.load();
    if (this.waveController.wave > meta.bestWave) {
      meta.bestWave = this.waveController.wave;
      if (!meta.unlockedStrains.includes('aggressive')) {
        meta.unlockedStrains.push('aggressive');
      }
    }
    this.metaStore.save(meta);
    const summary = document.createElement('div');
    summary.className = 'fungal-overlay';
    summary.innerHTML = `
      <h2>Colony Overrun</h2>
      <p>Waves survived: ${this.waveController.wave}</p>
      <button id="restartFungal">Back to Menu</button>
    `;
    this.container.appendChild(summary);
    summary.querySelector('#restartFungal')!.addEventListener('click', () => {
      window.location.reload();
    });
  }
}

export function launchFungalFrontier() {
  const root = document.getElementById('fungal-frontier-root');
  if (!root) return;
  new FungalFrontierGame(root);
}

if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    launchFungalFrontier();
  });
}
