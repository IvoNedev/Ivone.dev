(function () {
  'use strict';

  const root = document.getElementById('road-game-root');
  if (!root) return;

  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 600;
  root.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const W = 900, H = 600;

  // ── Road geometry ─────────────────────────────────────────────────────────
  const SCROLL    = 2.2;     // camera px / frame
  const LANE_W    = 54;      // px per lane
  const N_LANES   = 3;
  const ROAD_HW   = LANE_W * N_LANES / 2;  // 81 px half-width
  const SHLDR     = 13;      // shoulder strip width each side
  const FULL_HW   = ROAD_HW + SHLDR;       // 94

  // World-Y of road centreline at world-X wx.
  // Result is screen-Y (Y axis shared between world and screen – only X scrolls).
  function roadY(wx) {
    return H * 0.5
      + 88  * Math.sin(wx * 0.00128)
      + 36  * Math.sin(wx * 0.00330 + 1.82)
      + 18  * Math.sin(wx * 0.00710 + 0.93)
      +  9  * Math.sin(wx * 0.01380 + 3.10);
  }

  // Angle of road tangent at wx (for rotating cars)
  function roadAngle(wx) {
    return Math.atan2(roadY(wx + 1) - roadY(wx - 1), 2);
  }

  // ── Branch definitions ────────────────────────────────────────────────────
  // Branches peel off from the main road edge and curve away.
  // They repeat every PERIOD world-units so the road never ends.
  const PERIOD = 10000;

  // relSX : start offset within period
  // relEX : end offset (null = exit that leaves screen)
  // side  : +1 right / -1 left of road
  // nL    : lanes on this branch
  // label : sign text (null = no sign)
  const BRANCH_DEFS = [
    { relSX: 1000, relEX: null,  side: +1, nL: 1, label: 'Town'      },
    { relSX: 2400, relEX: 3200,  side: -1, nL: 1, label: null         },
    { relSX: 4100, relEX: null,  side: +1, nL: 2, label: 'Services'   },
    { relSX: 5600, relEX: 6400,  side: -1, nL: 1, label: null         },
    { relSX: 7200, relEX: null,  side: -1, nL: 1, label: 'City'       },
    { relSX: 8500, relEX: 9300,  side: +1, nL: 1, label: null         },
  ];

  // Screen-Y of branch centre at world-X wx, given epoch base-X bx.
  function branchY(def, bx, wx) {
    const startX = bx + def.relSX;
    const endX   = def.relEX !== null ? bx + def.relEX : null;
    if (wx < startX) return null;
    if (endX !== null && wx > endX) return null;

    const brHW   = LANE_W * def.nL / 2;
    const edgeY  = roadY(wx) + def.side * ROAD_HW;
    const span   = endX !== null ? endX - startX : 1800;
    const t      = Math.min((wx - startX) / span, 1);

    let sep;
    if (endX !== null) {
      sep = Math.sin(t * Math.PI) * 160;            // loop: out-and-back
    } else {
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      sep = e * 170;                                 // exit: ease away
    }

    return edgeY + def.side * (brHW + sep);
  }

  // ── World objects ─────────────────────────────────────────────────────────
  // Trees at fixed world positions (wx, wy = screen-Y).
  // Placed away from the centreline; we cull on road during draw.
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a[(Math.random() * a.length) | 0]; }

  const TREE_POOL = Array.from({ length: 700 }, () => ({
    wx  : rnd(0, PERIOD),
    wy  : rnd(0, H),
    r   : rnd(5, 13),
    hue : (110 + rnd(-20, 20)) | 0,
    lt  : rnd(18, 35),
  }));

  // ── Traffic ───────────────────────────────────────────────────────────────
  const CAR_COLORS = [
    '#c0392b','#e74c3c','#922b21',
    '#2471a3','#1a5276','#3498db',
    '#1e8449','#27ae60',
    '#d35400','#e67e22',
    '#7d3c98','#6c3483',
    '#bdc3c7','#ecf0f1',
    '#2c3e50','#17202a',
    '#f1c40f',
  ];

  function newCar(wx) {
    const laneIdx = (Math.random() * N_LANES) | 0;
    return {
      wx,
      laneIdx,
      laneOff   : -ROAD_HW + LANE_W * 0.5 + laneIdx * LANE_W,
      worldSpeed: rnd(1.1, 3.8),
      color     : pick(CAR_COLORS),
      len       : rnd(30, 42),
      wid       : rnd(18, 24),
    };
  }

  let cars = Array.from({ length: 22 }, () => newCar(rnd(200, W + 1500)));

  // ── State ─────────────────────────────────────────────────────────────────
  let camX = 0;
  let tick = 0;

  // ── Helpers ───────────────────────────────────────────────────────────────
  function darken(hex, f) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${(r * f) | 0},${(g * f) | 0},${(b * f) | 0})`;
  }

  function rr(x, y, w, h, r) {
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
  }

  // Build top/bottom point arrays for a strip centred on getCY(wx), half-width hw.
  // getCY returns null when outside the strip's valid range.
  function buildStrip(getCY, hw, step) {
    const top = [], bot = [];
    for (let sx = 0; sx <= W; sx += step) {
      const cy = getCY(sx + camX);
      if (cy === null) continue;
      top.push([sx, cy - hw]);
      bot.push([sx, cy + hw]);
    }
    return { top, bot };
  }

  function fillStrip(top, bot, color) {
    if (top.length < 2) return;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(top[0][0], top[0][1]);
    for (let i = 1; i < top.length; i++) ctx.lineTo(top[i][0], top[i][1]);
    for (let i = bot.length - 1; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1]);
    ctx.closePath();
    ctx.fill();
  }

  function strokeLine(getCY, offset, color, lw, dash) {
    ctx.strokeStyle = color;
    ctx.lineWidth   = lw;
    if (dash) { ctx.setLineDash(dash); ctx.lineDashOffset = -(camX % (dash[0] + dash[1])); }
    ctx.beginPath();
    let first = true;
    for (let sx = 0; sx <= W; sx += 4) {
      const cy = getCY(sx + camX);
      if (cy === null) continue;
      const y = cy + offset;
      if (first) { ctx.moveTo(sx, y); first = false; } else ctx.lineTo(sx, y);
    }
    ctx.stroke();
    if (dash) { ctx.setLineDash([]); ctx.lineDashOffset = 0; }
  }

  // ── Background ────────────────────────────────────────────────────────────
  function drawBackground() {
    ctx.fillStyle = '#2a5218';
    ctx.fillRect(0, 0, W, H);

    // Field colour variation – slow horizontal bands
    const ph = camX * 0.04;
    for (let y = 0; y < H; y += 60) {
      const a = 0.04 + 0.035 * Math.sin(y * 0.06 + ph);
      ctx.fillStyle = `rgba(0,0,0,${a.toFixed(3)})`;
      ctx.fillRect(0, y, W, 30);
    }

    // Occasional lighter field patches (very slow parallax)
    const ph2 = camX * 0.018;
    for (let i = 0; i < 6; i++) {
      const px = ((Math.sin(i * 73.1 + ph2) * 0.5 + 0.5) * W * 1.4 - W * 0.2) | 0;
      const py = ((Math.sin(i * 47.3) * 0.5 + 0.5) * H) | 0;
      const pr = 80 + (Math.sin(i * 31.7) * 0.5 + 0.5) * 100;
      const g  = ctx.createRadialGradient(px, py, 0, px, py, pr);
      g.addColorStop(0, 'rgba(90,160,40,0.18)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── Trees ─────────────────────────────────────────────────────────────────
  function drawTrees() {
    for (const tr of TREE_POOL) {
      // Tile the wx across screen
      let wx = tr.wx;
      // Bring into viewport vicinity (repeating tile of PERIOD)
      wx = ((wx - camX % PERIOD + PERIOD) % PERIOD) + camX - PERIOD * 0.1;
      const sx = wx - camX;
      if (sx < -20 || sx > W + 20) continue;

      const cy = roadY(wx);
      const dy = Math.abs(tr.wy - cy);
      if (dy < FULL_HW + tr.r + 2) continue;   // sits on or too near the road

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath();
      ctx.ellipse(sx + 3, tr.wy + 3, tr.r * 1.0, tr.r * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      // Outer canopy
      ctx.fillStyle = `hsl(${tr.hue},52%,${tr.lt - 8}%)`;
      ctx.beginPath();
      ctx.arc(sx, tr.wy, tr.r, 0, Math.PI * 2);
      ctx.fill();
      // Inner highlight
      ctx.fillStyle = `hsl(${tr.hue},56%,${tr.lt + 4}%)`;
      ctx.beginPath();
      ctx.arc(sx - tr.r * 0.25, tr.wy - tr.r * 0.25, tr.r * 0.58, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── Branch roads ──────────────────────────────────────────────────────────
  function drawBranchRoads() {
    const viL = camX - 300, viR = camX + W + 300;

    for (const def of BRANCH_DEFS) {
      const brHW = LANE_W * def.nL / 2;
      const firstEpoch = Math.floor(viL / PERIOD);
      const lastEpoch  = Math.ceil(viR / PERIOD);

      for (let ep = firstEpoch; ep <= lastEpoch; ep++) {
        const bx = ep * PERIOD;
        const getCY = (wx) => branchY(def, bx, wx);

        // Shoulder
        const { top: sTop, bot: sBot } = buildStrip(getCY, brHW + SHLDR, 5);
        fillStrip(sTop, sBot, '#33321e');

        // Asphalt
        const { top, bot } = buildStrip(getCY, brHW, 5);
        fillStrip(top, bot, '#242424');

        // Edge lines
        strokeLine(getCY, -brHW, 'rgba(255,255,255,0.7)', 2, null);
        strokeLine(getCY,  brHW, 'rgba(255,255,255,0.7)', 2, null);

        // Centre dash for multi-lane branches
        if (def.nL > 1) strokeLine(getCY, 0, 'rgba(255,255,255,0.45)', 1.5, [36, 28]);

        // Exit sign
        if (def.label && def.relEX === null) {
          const signWX = bx + def.relSX + 500;
          const signSX = signWX - camX;
          if (signSX > -80 && signSX < W + 80) {
            const bcy = branchY(def, bx, signWX);
            if (bcy !== null) drawExitSign(signSX, bcy, def.label);
          }
        }
      }
    }
  }

  function drawExitSign(sx, sy, text) {
    ctx.fillStyle = '#004d8c';
    ctx.beginPath();
    rr(sx - 36, sy - 13, 72, 26, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, sx, sy);
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
  }

  // ── Main road ─────────────────────────────────────────────────────────────
  function drawMainRoad() {
    const getCY = (wx) => roadY(wx);

    // Shoulder
    const { top: sTop, bot: sBot } = buildStrip(getCY, FULL_HW, 5);
    fillStrip(sTop, sBot, '#33321e');

    // Asphalt
    const { top, bot } = buildStrip(getCY, ROAD_HW, 5);
    fillStrip(top, bot, '#242424');
  }

  function drawMainMarkings() {
    const getCY = (wx) => roadY(wx);

    // Solid white edges
    strokeLine(getCY, -ROAD_HW, 'rgba(255,255,255,0.85)', 2.5, null);
    strokeLine(getCY,  ROAD_HW, 'rgba(255,255,255,0.85)', 2.5, null);

    // Dashed white between lanes
    for (let l = 1; l < N_LANES; l++) {
      const off = -ROAD_HW + l * LANE_W;
      strokeLine(getCY, off, 'rgba(255,255,255,0.5)', 1.5, [42, 32]);
    }

    // Cat's eyes
    const eyePeriod = 74, eyeOff = camX % eyePeriod;
    ctx.fillStyle = 'rgba(255,250,140,0.65)';
    for (let l = 1; l < N_LANES; l++) {
      const off = -ROAD_HW + l * LANE_W;
      for (let sx = -eyePeriod + eyeOff; sx < W + eyePeriod; sx += eyePeriod) {
        const cy = roadY(sx + camX) + off;
        ctx.beginPath();
        ctx.arc(sx, cy, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // ── Cars ──────────────────────────────────────────────────────────────────
  function drawCar(car, isPlayer) {
    const sx  = car.wx - camX;
    if (sx < -60 || sx > W + 60) return;

    const cy    = roadY(car.wx) + car.laneOff;
    const angle = roadAngle(car.wx);
    const len   = car.len, wid = car.wid;
    const col   = car.color;

    ctx.save();
    ctx.translate(sx, cy);
    ctx.rotate(angle);

    // Ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(3, 4, len * 0.56, wid * 0.48, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = col;
    ctx.beginPath();
    rr(-len / 2, -wid / 2, len, wid, 4);
    ctx.fill();

    // Roof / cabin
    ctx.fillStyle = darken(col, 0.72);
    ctx.beginPath();
    rr(-len * 0.18, -wid * 0.38, len * 0.38, wid * 0.76, 3);
    ctx.fill();

    // Windscreen
    ctx.fillStyle = 'rgba(160,228,255,0.38)';
    ctx.fillRect(len * 0.08, -wid * 0.32, len * 0.22, wid * 0.64);

    if (isPlayer) {
      // Glowing headlights for player
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ccffff';
      ctx.shadowBlur  = 14;
      ctx.fillRect(len * 0.44, -wid * 0.33, len * 0.08, wid * 0.3);
      ctx.fillRect(len * 0.44,  wid * 0.03, len * 0.08, wid * 0.3);
      ctx.shadowBlur = 0;
    } else {
      ctx.fillStyle = '#ffff99';
      ctx.fillRect(len * 0.44, -wid * 0.33, len * 0.07, wid * 0.28);
      ctx.fillRect(len * 0.44,  wid * 0.05, len * 0.07, wid * 0.28);
    }

    // Taillights
    ctx.fillStyle = isPlayer ? '#ff2222' : '#cc3333';
    ctx.fillRect(-len * 0.52, -wid * 0.35, len * 0.06, wid * 0.3);
    ctx.fillRect(-len * 0.52,  wid * 0.05, len * 0.06, wid * 0.3);

    ctx.restore();
  }

  // ── HUD ───────────────────────────────────────────────────────────────────
  function drawHUD() {
    const km = (camX * 0.00012).toFixed(2);

    ctx.fillStyle = 'rgba(4,4,18,0.58)';
    ctx.beginPath();
    rr(12, 12, 118, 52, 9);
    ctx.fill();
    ctx.strokeStyle = 'rgba(210,140,30,0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#f39c12';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('70 mph', 20, 44);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = '10px monospace';
    ctx.fillText(`${km} km`, 20, 56);
  }

  // ── Update ────────────────────────────────────────────────────────────────
  function update() {
    tick++;
    camX += SCROLL;

    // Move traffic
    for (const c of cars) c.wx += c.worldSpeed;

    // Remove cars that fell too far behind and spawn new ones ahead
    for (let i = cars.length - 1; i >= 0; i--) {
      if (cars[i].wx < camX - 300) cars.splice(i, 1);
    }
    while (cars.length < 22) cars.push(newCar(camX + W + rnd(50, 600)));
  }

  // ── Player car definition (constant) ─────────────────────────────────────
  // Player is always in the middle lane at fixed screen-X 200.
  const PLAYER = {
    get wx()     { return camX + 200; },
    laneOff      : -ROAD_HW + LANE_W * 1.5,   // middle lane
    color        : '#e8880f',
    len          : 42,
    wid          : 22,
    get laneIdx() { return 1; },
  };

  // ── Render frame ──────────────────────────────────────────────────────────
  function frame() {
    update();

    drawBackground();
    drawTrees();
    drawBranchRoads();
    drawMainRoad();
    drawMainMarkings();

    // Traffic (sorted back-to-front by screen-X so overlapping looks right)
    const sorted = cars.slice().sort((a, b) => b.wx - a.wx);
    for (const c of sorted) drawCar(c, false);

    drawCar(PLAYER, true);
    drawHUD();

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();
