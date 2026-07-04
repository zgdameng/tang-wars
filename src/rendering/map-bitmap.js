/**
 * 三国志风格地图生成器 v6
 *
 * 改：
 *   势力边界柔化（双势力混合过渡，去方块感）
 *   城池画在地图上（色圈+白边+城名）
 *   山川河流走向调准
 *   地名标注加粗加亮
 */

export const MAP_W = 2400;
export const MAP_H = 2000;
export const CELL_W = MAP_W / 30;
export const CELL_H = MAP_H / 30;
const S_W = 800, S_H = 667;

export function gridToPixel(col, row) {
  return { x: Math.round(col * CELL_W + CELL_W / 2), y: Math.round(row * CELL_H + CELL_H / 2) };
}

// ============================================================
export function generateMapBitmap(state) {
  const hm = buildHeightmap();
  const small = renderSmall(hm, state);
  const big = document.createElement('canvas');
  big.width = MAP_W; big.height = MAP_H;
  const ctx = big.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(small, 0, 0, MAP_W, MAP_H);

  paintRivers(ctx);
  paintMountains(ctx);
  paintForests(ctx);
  paintCities(ctx, state);   // ← 城池直接画在大图上
  paintLabels(ctx);

  return big;
}

// ============================================================
//  高度图
// ============================================================
function buildHeightmap() {
  const hm = new Float32Array(S_W * S_H);
  for (let y = 0; y < S_H; y++) {
    const row = (y / S_H) * 30;
    for (let x = 0; x < S_W; x++) {
      const col = (x / S_W) * 30;
      let e = baseElev(col, row);
      e += fbm(col * 0.65, row * 0.65, 42, 6) * 32 - 8;
      hm[y * S_W + x] = Math.max(0, Math.min(255, e));
    }
  }
  return hm;
}

function baseElev(col, row) {
  // 第一阶梯：青藏高原
  if (col < 3.5) return 220;
  if (col < 5 && row > 14 && row < 18) return 210;
  if (col < 5.5) return 180;
  if (col < 6.5) return 138;
  if (col < 7.5) return 98;
  // 四川盆地
  if (col >= 1.5 && col <= 5.5 && row >= 14 && row <= 18.5) return 24;
  // 秦岭（东西向高脊，黄河长江分水岭）
  if (row > 8.8 && row < 11.5 && col > 5 && col < 9.5) return 128 - Math.abs(row - 10.2) * 14;
  // 大巴山
  if (row > 12 && row < 14.5 && col > 5 && col < 9) return 96;
  // 关中平原（渭河谷地，长安凤翔一带）
  if (col >= 4 && col <= 8.5 && row >= 8.8 && row <= 10.5) return 28;
  // 黄土高原
  if (col >= 7 && col < 10.5 && row >= 4 && row < 7.2) return 66;
  // 太行山
  if (col >= 9.5 && col < 11 && row >= 3.5 && row < 11) return 86;
  // 巫山/雪峰山
  if (col >= 10 && col < 12.5 && row >= 13 && row < 18) return 66;
  // 南岭（岭南分水岭）
  if (row >= 19.2 && row < 20.8 && col > 5 && col < 18.5) return 70;
  // 武夷山
  if (col >= 18.5 && col < 21.5 && row >= 16 && row < 20.5) return 76;
  // 平原
  if (col >= 10 && row >= 4 && row < 9) return 13;
  if (col >= 10 && col < 18 && row >= 9 && row < 14) return 17;
  if (col >= 10 && col < 22 && row >= 14 && row < 19.2) return 10;
  // 丘陵
  if (row >= 19.2 && row < 24 && col >= 8) return 36;
  if (row >= 24) return 30;
  if (row < 4) return 50;
  if (col >= 22 && row >= 12 && row < 19.2) return 6;
  return 26;
}

// ============================================================
//  噪声
// ============================================================
function fbm(x, y, seed, oct) {
  let v = 0, a = 0.5, f = 1, m = 0;
  for (let i = 0; i < oct; i++) { v += a * noise2d(x * f, y * f, seed + i * 1000); m += a; a *= 0.5; f *= 2; }
  return v / m;
}
function noise2d(x, y, s) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const v00 = hash2d(ix, iy, s), v10 = hash2d(ix + 1, iy, s);
  const v01 = hash2d(ix, iy + 1, s), v11 = hash2d(ix + 1, iy + 1, s);
  return v00 + (v10 - v00) * sx + (v01 - v00) * sy + (v00 - v10 - v01 + v11) * sx * sy;
}
function hash2d(x, y, s) {
  let h = ((x * 374761393 + y * 668265263 + s * 1274126177) >>> 0);
  h = Math.imul(h ^ (h >>> 13), 1274126177); h = Math.imul(h ^ (h >>> 16), 1);
  return (h >>> 0) / 4294967296;
}
function clamp(v) { return Math.max(0, Math.min(255, v)); }

// ============================================================
//  小画布渲染
// ============================================================
function renderSmall(hm, state) {
  const canvas = document.createElement('canvas');
  canvas.width = S_W; canvas.height = S_H;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(S_W, S_H);
  const d = img.data;
  const nearInfo = state ? buildNearInfo(state) : null;

  for (let y = 0; y < S_H; y++) {
    for (let x = 0; x < S_W; x++) {
      const elev = hm[y * S_W + x];
      const shade = computeShade(hm, x, y);

      let r, g, b;
      if (elev < 3)       { r = 32; g = 72; b = 148; }
      else if (elev < 8)  { const t = (elev - 3) / 5; r = 52 + t * 20; g = 108 + t * 8; b = 152 - t * 8; }
      else if (elev < 20) { const t = (elev - 8) / 12; r = 148 - t * 22; g = 170 + t * 12; b = 78 + t * 16; }
      else if (elev < 50) { const t = (elev - 20) / 30; r = 126 + t * 44; g = 182 - t * 38; b = 94 - t * 20; }
      else if (elev < 95) { const t = (elev - 50) / 45; r = 170 - t * 5; g = 144 - t * 28; b = 74 - t * 12; }
      else if (elev < 150){ const t = (elev - 95) / 55; r = 165 + t * 28; g = 116 + t * 44; b = 62 + t * 52; }
      else if (elev < 205){ const t = (elev - 150) / 55; r = 193 + t * 40; g = 160 + t * 50; b = 114 + t * 78; }
      else                 { r = 238; g = 232; b = 222; }

      r = clamp(Math.round(r * shade));
      g = clamp(Math.round(g * shade));
      b = clamp(Math.round(b * shade));

      // 势力色——双势力混合过渡，无方块边界
      if (nearInfo && elev >= 5) {
        const ni = nearInfo[y * S_W + x];
        if (ni && ni.f1) {
          const fc1 = factionRGB(ni.f1, state);
          const fc2 = ni.f2 ? factionRGB(ni.f2, state) : null;
          const w1 = Math.max(0, 1 - ni.d1 / 150);
          const w2 = fc2 ? Math.max(0, 1 - ni.d2 / 150) : 0;
          const tw = w1 + w2;
          if (tw > 0.01 && fc1) {
            let br = fc1.r * w1, bg = fc1.g * w1, bb = fc1.b * w1;
            if (fc2) { br += fc2.r * w2; bg += fc2.g * w2; bb += fc2.b * w2; }
            br /= tw; bg /= tw; bb /= tw;
            const alpha = Math.min(0.28, tw * 0.45);
            r = clamp(Math.round(r * (1 - alpha) + br * alpha));
            g = clamp(Math.round(g * (1 - alpha) + bg * alpha));
            b = clamp(Math.round(b * (1 - alpha) + bb * alpha));
          }
        }
      }

      const i = (y * S_W + x) * 4;
      d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  addGroundGrain(ctx, hm);
  return canvas;
}

/** 每个像素记录最近两个势力的距离 */
function buildNearInfo(state) {
  const cities = Object.values(state.cities).filter(c => c.owner);
  if (cities.length === 0) return null;
  const info = new Array(S_W * S_H);
  for (let i = 0; i < info.length; i++) info[i] = { f1: null, d1: 999, f2: null, d2: 999 };

  for (const city of cities) {
    const cx = Math.round((city.x / 30) * S_W);
    const cy = Math.round((city.y / 30) * S_H);
    const R = 160;
    for (let dy = -R; dy <= R; dy++) {
      for (let dx = -R; dx <= R; dx++) {
        const px = cx + dx, py = cy + dy;
        if (px < 0 || px >= S_W || py < 0 || py >= S_H) continue;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > R) continue;
        const e = info[py * S_W + px];
        if (dist < e.d1) { e.d2 = e.d1; e.f2 = e.f1; e.d1 = dist; e.f1 = city.owner; }
        else if (dist < e.d2) { e.d2 = dist; e.f2 = city.owner; }
      }
    }
  }
  return info;
}

function factionRGB(fid, state) {
  const f = state.factions[fid];
  if (!f || !f.color) return null;
  return { r: (f.color >> 16) & 0xff, g: (f.color >> 8) & 0xff, b: f.color & 0xff };
}

// ============================================================
//  光影
// ============================================================
function computeShade(hm, x, y) {
  const w = S_W;
  const e = hm[y * w + x];
  const x2 = Math.min(x + 1, w - 1), y2 = Math.min(y + 1, S_H - 1);
  const dx = (hm[y * w + x2] - e) * 12, dy = (hm[y2 * w + x] - e) * 12;
  const lx = -0.707, ly = -0.707;
  const dot = (-dx * lx + -dy * ly + 1);
  const len = Math.sqrt(dx * dx + dy * dy + 1);
  let s = Math.max(0.35, Math.min(1.42, (dot / len) * 1.2));
  if (e < 5) s *= 0.55 + (e / 5) * 0.45;
  return s;
}

// ============================================================
//  地面纹理
// ============================================================
function addGroundGrain(ctx, hm) {
  const step = 2;
  for (let y = 0; y < S_H; y += step) {
    for (let x = 0; x < S_W; x += step) {
      const elev = hm[y * S_W + x];
      const h = hash2d(x, y, 777);
      const ox = (hash2d(x + 99, y, 778) - 0.5) * 2.5;
      const oy = (hash2d(x, y + 99, 779) - 0.5) * 2.5;
      const px = x + ox, py = y + oy, sz = 0.5 + h * 0.8;
      let cr, cg, cb, alpha;
      if (elev < 5)      { cr = 20 + h * 15; cg = 55 + h * 20; cb = 120 + h * 25; alpha = 0.3; }
      else if (elev < 20) { cr = 110 + h * 40; cg = 155 + h * 30; cb = 55 + h * 25; alpha = 0.22; }
      else if (elev < 50) { cr = 140 + h * 35; cg = 160 + h * 25; cb = 70 + h * 20; alpha = 0.18; }
      else if (elev < 100){ cr = 140 + h * 30; cg = 115 + h * 25; cb = 60 + h * 20; alpha = 0.22; }
      else               { cr = 165 + h * 25; cg = 145 + h * 25; cb = 110 + h * 25; alpha = 0.2; }
      ctx.fillStyle = `rgba(${Math.round(cr)},${Math.round(cg)},${Math.round(cb)},${alpha})`;
      ctx.beginPath(); ctx.arc(px, py, sz, 0, Math.PI * 2); ctx.fill();
    }
  }
}

// ============================================================
//  河流——调准走向
//  黄河"几"字弯：源出青海→向北到河套→向南经河中→向东过洛阳汴州→入海
//  长江：出四川盆地→穿三峡→过江陵→经扬州→入海
//  汉江：秦岭以南→流经襄阳→在武汉附近汇入长江
// ============================================================
function paintRivers(ctx) {
  const yellow = [
    { x: 280, y: 367 },   // 源头（青海，col≈3,row≈5）
    { x: 360, y: 280 },   // 向北拐
    { x: 440, y: 233 },   // 河套最北端
    { x: 520, y: 300 },
    { x: 600, y: 400 },
    { x: 700, y: 500 },
    { x: 800, y: 600 },   // 向南到潼关附近
    { x: 840, y: 633 },   // 经过河中（col≈10,row≈9）
    { x: 960, y: 667 },
    { x: 1080, y: 700 },  // 经过洛阳（col≈13,row≈10）
    { x: 1200, y: 700 },
    { x: 1320, y: 700 },  // 经过汴州（col≈16,row≈10）
    { x: 1480, y: 667 },
    { x: 1640, y: 600 },
    { x: 1840, y: 500 },
    { x: 2040, y: 433 },
    { x: 2240, y: 380 },
    { x: 2395, y: 370 },  // 入海
  ];
  const yangtze = [
    { x: 160, y: 1033 },  // 源头（青藏高原东）
    { x: 240, y: 1067 },
    { x: 360, y: 1100 },  // 四川盆地（成都南，col≈4,row≈16）
    { x: 480, y: 1100 },
    { x: 600, y: 1133 },  // 三峡（col≈7,row≈16.5）
    { x: 720, y: 1167 },
    { x: 840, y: 1200 },
    { x: 920, y: 1233 },  // 经过江陵（col≈11,row≈18）
    { x: 1040, y: 1200 },
    { x: 1160, y: 1167 },
    { x: 1320, y: 1167 },
    { x: 1480, y: 1167 },
    { x: 1640, y: 1167 },
    { x: 1720, y: 1167 }, // 经过扬州（col≈21,row≈17）
    { x: 1880, y: 1200 },
    { x: 2080, y: 1233 },
    { x: 2320, y: 1233 },
    { x: 2395, y: 1235 }, // 入海
  ];
  const hanjiang = [
    { x: 600, y: 833 },   // 发源秦岭南麓（col≈7,row≈12）
    { x: 680, y: 900 },
    { x: 800, y: 967 },
    { x: 920, y: 1033 },
    { x: 1000, y: 1067 },
    { x: 1080, y: 1100 }, // 穿过襄阳（col≈13,row≈16）
    { x: 1160, y: 1133 },
    { x: 1240, y: 1167 }, // 武汉附近汇入长江（col≈15,row≈17）
  ];
  const minjiang = [
    { x: 100, y: 967 }, { x: 160, y: 1000 }, { x: 220, y: 1033 }, { x: 260, y: 1050 },
  ];

  paintRiverPath(ctx, yellow, '#4098d8', 18);
  paintRiverPath(ctx, yangtze, '#40a8e0', 19);
  paintRiverPath(ctx, hanjiang, '#4098d0', 10);
  paintRiverPath(ctx, minjiang, '#4098d0', 9);
}

function paintRiverPath(ctx, pts, color, w) {
  if (pts.length < 2) return;
  const p = smoothPath(pts);
  ctx.save();
  ctx.strokeStyle = 'rgba(22,32,28,0.26)'; ctx.lineWidth = w + 14;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(p[0].x, p[0].y);
  for (let i = 1; i < p.length - 2; i += 3) ctx.bezierCurveTo(p[i].x, p[i].y, p[i + 1].x, p[i + 1].y, p[i + 2].x, p[i + 2].y);
  ctx.stroke(); ctx.restore();
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.globalAlpha = 0.7;
  ctx.beginPath(); ctx.moveTo(p[0].x, p[0].y);
  for (let i = 1; i < p.length - 2; i += 3) ctx.bezierCurveTo(p[i].x, p[i].y, p[i + 1].x, p[i + 1].y, p[i + 2].x, p[i + 2].y);
  ctx.stroke(); ctx.restore();
  ctx.save();
  ctx.strokeStyle = 'rgba(180,225,250,0.26)'; ctx.lineWidth = w * 0.25; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(p[0].x, p[0].y);
  for (let i = 1; i < p.length - 2; i += 3) ctx.bezierCurveTo(p[i].x, p[i].y, p[i + 1].x, p[i + 1].y, p[i + 2].x, p[i + 2].y);
  ctx.stroke(); ctx.restore();
}

function smoothPath(pts) {
  if (pts.length < 3) return pts;
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    out.push(p1);
    out.push({ x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 });
    out.push({ x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 });
    out.push(p2);
  }
  return out;
}

// ============================================================
//  鱼骨山脉
// ============================================================
function paintMountains(ctx) {
  const ridges = [
    { main: [{ x: 55, y: 80 }, { x: 85, y: 380 }, { x: 115, y: 680 }, { x: 145, y: 980 }, { x: 175, y: 1380 }, { x: 195, y: 1680 }], br: 5 },
    { main: [{ x: 115, y: 180 }, { x: 155, y: 480 }, { x: 185, y: 780 }, { x: 215, y: 1080 }, { x: 245, y: 1480 }], br: 4 },
    { main: [{ x: 180, y: 535 }, { x: 330, y: 515 }, { x: 470, y: 500 }, { x: 610, y: 490 }, { x: 730, y: 520 }], br: 5 },
    { main: [{ x: 155, y: 595 }, { x: 305, y: 575 }, { x: 450, y: 560 }, { x: 590, y: 550 }], br: 4 },
    { main: [{ x: 165, y: 810 }, { x: 310, y: 780 }, { x: 450, y: 760 }, { x: 580, y: 745 }, { x: 670, y: 770 }], br: 4 },
    { main: [{ x: 625, y: 280 }, { x: 660, y: 430 }, { x: 690, y: 570 }, { x: 680, y: 710 }], br: 5 },
    { main: [{ x: 665, y: 310 }, { x: 700, y: 455 }, { x: 730, y: 585 }, { x: 710, y: 695 }], br: 4 },
    { main: [{ x: 380, y: 915 }, { x: 490, y: 965 }, { x: 595, y: 1015 }, { x: 695, y: 1065 }], br: 5 },
    { main: [{ x: 350, y: 1095 }, { x: 460, y: 1135 }, { x: 565, y: 1175 }, { x: 665, y: 1195 }], br: 4 },
    { main: [{ x: 280, y: 1475 }, { x: 560, y: 1455 }, { x: 860, y: 1475 }, { x: 1160, y: 1495 }, { x: 1460, y: 1515 }], br: 5 },
    { main: [{ x: 1555, y: 1280 }, { x: 1665, y: 1430 }, { x: 1715, y: 1580 }, { x: 1665, y: 1730 }], br: 4 },
    { main: [{ x: 330, y: 1030 }, { x: 410, y: 1080 }, { x: 510, y: 1130 }], br: 3 },
  ];
  for (const r of ridges) paintFishboneRidge(ctx, r.main, r.br);
}

function paintFishboneRidge(ctx, mainPts, branchCount) {
  const len = pathLen(mainPts);
  const n = Math.floor(len / 12);
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const pt = pathAt(mainPts, t);
    const ox = Math.sin(i * 3.7) * 22 + Math.cos(i * 1.3) * 8;
    const oy = Math.cos(i * 2.9) * 14 + Math.sin(i * 2.1) * 8;
    const px = pt.x + ox, py = pt.y + oy;
    const sz = 7 + (i % 3) * 2.5 + Math.abs(Math.sin(i * 1.2)) * 5;
    drawPeak(ctx, px, py, sz);
    const angle = getPathAngle(mainPts, t);
    const perp = angle + Math.PI / 2;
    for (let b = 0; b < branchCount; b++) {
      const dir = b % 2 === 0 ? 1 : -1;
      const bd = 6 + (b % 3) * 6;
      const bx = px + Math.cos(perp) * bd * dir, by = py + Math.sin(perp) * bd * dir;
      const bsz = sz * 0.45 + (b % 2) * 1.5;
      drawPeak(ctx, bx, by, bsz);
      if (b < branchCount - 2) {
        const bx2 = bx + Math.cos(perp) * 8 * dir, by2 = by + Math.sin(perp) * 8 * dir;
        drawPeak(ctx, bx2, by2, bsz * 0.52);
      }
    }
  }
}

function drawPeak(ctx, px, py, sz) {
  ctx.fillStyle = 'rgba(100,78,48,0.5)';
  ctx.beginPath(); ctx.moveTo(px, py - sz); ctx.lineTo(px + sz * 0.55, py + sz * 0.32); ctx.lineTo(px - sz * 0.55, py + sz * 0.32);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(200,168,115,0.48)';
  ctx.beginPath(); ctx.moveTo(px, py - sz); ctx.lineTo(px - sz * 0.18, py - sz * 0.08); ctx.lineTo(px - sz * 0.55, py + sz * 0.32);
  ctx.closePath(); ctx.fill();
}

function getPathAngle(points, t) {
  if (points.length < 2) return 0;
  const pt1 = pathAt(points, Math.max(0, t - 0.02)), pt2 = pathAt(points, Math.min(1, t + 0.02));
  return Math.atan2(pt2.y - pt1.y, pt2.x - pt1.x);
}

// ============================================================
//  密林
// ============================================================
function paintForests(ctx) {
  const patches = [
    { cx: 1510, cy: 1390, rx: 310, ry: 230 },
    { cx: 930, cy: 1490, rx: 350, ry: 250 },
    { cx: 520, cy: 1390, rx: 250, ry: 310 },
    { cx: 1710, cy: 1590, rx: 250, ry: 210 },
    { cx: 620, cy: 900, rx: 210, ry: 250 },
    { cx: 1110, cy: 1690, rx: 350, ry: 230 },
    { cx: 720, cy: 1210, rx: 230, ry: 210 },
    { cx: 1310, cy: 1310, rx: 230, ry: 190 },
    { cx: 1810, cy: 1260, rx: 210, ry: 180 },
    { cx: 420, cy: 1460, rx: 190, ry: 210 },
    { cx: 1610, cy: 1110, rx: 190, ry: 170 },
    { cx: 1010, cy: 1210, rx: 170, ry: 150 },
  ];
  for (const f of patches) {
    const count = Math.floor((f.rx * f.ry) / 50);
    for (let i = 0; i < count; i++) {
      const a = hash2d(i, 1, 100) * Math.PI * 2;
      const d = Math.sqrt(hash2d(i, 2, 101));
      const px = f.cx + Math.cos(a) * f.rx * d, py = f.cy + Math.sin(a) * f.ry * d;
      const sr = hash2d(i, 3, 102);
      let sz = sr < 0.5 ? 1.5 + sr * 2 : sr < 0.85 ? 3 + (sr - 0.5) * 4 : 5.5 + (sr - 0.85) * 8;
      const gt = hash2d(i, 4, 103);
      const dk = gt < 0.33 ? 'rgba(22,45,16,0.58)' : gt < 0.66 ? 'rgba(18,38,14,0.58)' : 'rgba(26,52,20,0.56)';
      const lt = gt < 0.33 ? 'rgba(50,105,38,0.62)' : gt < 0.66 ? 'rgba(62,115,44,0.6)' : 'rgba(42,95,32,0.58)';
      ctx.fillStyle = dk; ctx.beginPath(); ctx.arc(px + 0.7, py + 0.7, sz, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = lt; ctx.beginPath(); ctx.arc(px, py, sz, 0, Math.PI * 2); ctx.fill();
      if (sz > 5) { ctx.fillStyle = 'rgba(120,175,90,0.2)'; ctx.beginPath(); ctx.arc(px - sz * 0.2, py - sz * 0.2, sz * 0.45, 0, Math.PI * 2); ctx.fill(); }
    }
  }
}

// ============================================================
//  城池——画在大图上（色圈+白边+城名）
// ============================================================
function paintCities(ctx, state) {
  for (const city of Object.values(state.cities)) {
    const pos = gridToPixel(city.x, city.y);
    const faction = state.factions[city.owner];
    const hex = faction && faction.color ? '#' + faction.color.toString(16).padStart(6, '0') : '#888888';

    // 发光底圈
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.arc(pos.x + 1, pos.y + 2, 11, 0, Math.PI * 2); ctx.fill();

    // 城池圆
    ctx.fillStyle = hex;
    ctx.beginPath(); ctx.arc(pos.x, pos.y, 8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(pos.x, pos.y, 8, 0, Math.PI * 2); ctx.stroke();

    // 内圈高光
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath(); ctx.arc(pos.x - 2, pos.y - 2, 3.5, 0, Math.PI * 2); ctx.fill();

    // 城名（白字黑边）
    ctx.font = 'bold 15px "Microsoft YaHei","SimHei",sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.strokeStyle = '#000000'; ctx.lineWidth = 3.5;
    ctx.strokeText(city.name, pos.x, pos.y - 13);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(city.name, pos.x, pos.y - 13);
  }
}

// ============================================================
//  地名标注——加粗加亮，和周围颜色明显区分
// ============================================================
function paintLabels(ctx) {
  // 山名——暖白字深棕边
  ctx.save();
  ctx.font = 'bold 28px "Microsoft YaHei","SimHei",sans-serif';
  ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  ctx.fillStyle = '#fffef0';
  ctx.strokeStyle = '#2a2010'; ctx.lineWidth = 4;

  const mtns = [
    { t: '秦    岭', x: 550, y: 540, a: -0.05 },
    { t: '大巴山', x: 480, y: 770, a: -0.03 },
    { t: '太行山', x: 740, y: 510, a: 0.1 },
    { t: '南  岭', x: 1060, y: 1480, a: 0 },
    { t: '武夷山', x: 1750, y: 1540, a: 0.15 },
    { t: '巫  山', x: 630, y: 1040, a: 0.2 },
    { t: '青藏高原', x: 130, y: 900, a: -0.3, sz: 26 },
    { t: '四川盆地', x: 280, y: 1090, a: 0, sz: 24 },
    { t: '关中平原', x: 520, y: 670, a: 0, sz: 22 },
    { t: '华北平原', x: 1350, y: 690, a: 0, sz: 24 },
    { t: '江  南', x: 1550, y: 1360, a: 0, sz: 24 },
    { t: '岭  南', x: 1020, y: 1800, a: 0, sz: 24 },
  ];
  for (const m of mtns) {
    ctx.save();
    ctx.font = `bold ${m.sz || 28}px "Microsoft YaHei","SimHei",sans-serif`;
    ctx.translate(m.x, m.y); ctx.rotate(m.a);
    ctx.strokeText(m.t, 0, 0); ctx.fillText(m.t, 0, 0);
    ctx.restore();
  }
  ctx.restore();

  // 河名——亮蓝字深蓝边
  ctx.save();
  ctx.font = 'bold 30px "Microsoft YaHei","SimHei",sans-serif';
  ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  ctx.fillStyle = '#e0f0ff';
  ctx.strokeStyle = '#0a2840'; ctx.lineWidth = 4;

  const rivers = [
    { t: '黄  河', x: 1100, y: 680, a: -0.02 },
    { t: '长  江', x: 1200, y: 1180, a: 0.02 },
    { t: '汉  江', x: 920, y: 1050, a: 0.3, sz: 22 },
    { t: '岷  江', x: 180, y: 1010, a: 0.3, sz: 20 },
  ];
  for (const r of rivers) {
    ctx.save();
    ctx.font = `bold ${r.sz || 30}px "Microsoft YaHei","SimHei",sans-serif`;
    ctx.translate(r.x, r.y); ctx.rotate(r.a);
    ctx.strokeText(r.t, 0, 0); ctx.fillText(r.t, 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

// ============================================================
function pathLen(p) { let l = 0; for (let i = 1; i < p.length; i++) { const dx = p[i].x - p[i - 1].x, dy = p[i].y - p[i - 1].y; l += Math.sqrt(dx * dx + dy * dy); } return l; }
function pathAt(p, t) {
  if (p.length === 1) return p[0];
  let target = t * pathLen(p);
  for (let i = 1; i < p.length; i++) {
    const dx = p[i].x - p[i - 1].x, dy = p[i].y - p[i - 1].y, seg = Math.sqrt(dx * dx + dy * dy);
    if (target <= seg) { const f = seg > 0 ? target / seg : 0; return { x: p[i - 1].x + dx * f, y: p[i - 1].y + dy * f }; }
    target -= seg;
  }
  return p[p.length - 1];
}
