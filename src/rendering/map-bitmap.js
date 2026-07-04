/**
 * 三国志风格地图生成器 v5
 *
 * 改进：
 *   山 → 鱼骨状脊线：主脊粗、分支细，峰叠峰，亮暗面
 *   林 → 密度翻 5 倍，大小树混搭，有阴影层
 *   地 → 小画布上铺草纹/岩纹细点，放大后自然纹理
 */

export const MAP_W = 2400;
export const MAP_H = 2000;
export const CELL_W = MAP_W / 30;
export const CELL_H = MAP_H / 30;

const S_W = 800;  // 小画布（3x 上采样）
const S_H = 667;

export function gridToPixel(col, row) {
  return {
    x: Math.round(col * CELL_W + CELL_W / 2),
    y: Math.round(row * CELL_H + CELL_H / 2),
  };
}

// ============================================================
export function generateMapBitmap(state) {
  const hm = buildHeightmap();

  // 1. 小画布：高度染色 + 光照 + 势力 + 地面纹理
  const small = renderSmall(hm, state);

  // 2. 放大
  const big = document.createElement('canvas');
  big.width = MAP_W;
  big.height = MAP_H;
  const ctx = big.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(small, 0, 0, MAP_W, MAP_H);

  // 3. 大图叠层
  paintRivers(ctx);
  paintMountains(ctx);
  paintForests(ctx);
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
      e = Math.max(0, Math.min(255, e));
      hm[y * S_W + x] = e;
    }
  }
  return hm;
}

function baseElev(col, row) {
  if (col < 3.5) return 220;
  if (col < 5 && row > 14 && row < 18) return 210;
  if (col < 5.5) return 180;
  if (col < 6.5) return 138;
  if (col < 7.5) return 98;
  // 四川盆地
  if (col >= 1.5 && col <= 5 && row >= 14 && row <= 18.5) return 25;
  // 秦岭
  if (row > 8.5 && row < 12 && col > 5 && col < 9) return 128 - Math.abs(row - 10.2) * 14;
  // 大巴山
  if (row > 12 && row < 14 && col > 5 && col < 9) return 98;
  // 关中
  if (col >= 3 && col <= 7.5 && row >= 7 && row <= 8.5) return 30;
  // 黄土高原
  if (col >= 7 && col < 10 && row >= 4 && row < 8) return 68;
  // 太行
  if (col >= 9 && col < 10.5 && row >= 4 && row < 11) return 88;
  // 巫山
  if (col >= 10 && col < 12 && row >= 13 && row < 18) return 68;
  // 南岭
  if (row >= 19 && row < 20.5 && col > 6 && col < 18) return 72;
  // 武夷
  if (col >= 18 && col < 21 && row >= 16 && row < 20) return 78;
  // 平原
  if (col >= 10 && row >= 4 && row < 9) return 14;
  if (col >= 10 && col < 18 && row >= 9 && row < 14) return 18;
  if (col >= 10 && col < 22 && row >= 14 && row < 19) return 11;
  // 丘陵
  if (row >= 19 && row < 24 && col >= 8) return 38;
  if (row >= 24) return 32;
  if (row < 4) return 52;
  if (col >= 22 && row >= 12 && row < 19) return 6;
  return 28;
}

// ============================================================
//  噪声
// ============================================================
function fbm(x, y, seed, oct) {
  let v = 0, a = 0.5, f = 1, m = 0;
  for (let i = 0; i < oct; i++) {
    v += a * noise2d(x * f, y * f, seed + i * 1000);
    m += a; a *= 0.5; f *= 2;
  }
  return v / m;
}
function noise2d(x, y, s) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const v00 = hash2d(ix, iy, s), v10 = hash2d(ix + 1, iy, s);
  const v01 = hash2d(ix, iy + 1, s), v11 = hash2d(ix + 1, iy + 1, s);
  return v00 + (v10 - v00) * sx + (v01 - v00) * sy + (v00 - v10 - v01 + v11) * sx * sy;
}
function hash2d(x, y, s) {
  let h = ((x * 374761393 + y * 668265263 + s * 1274126177) >>> 0);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = Math.imul(h ^ (h >>> 16), 1);
  return (h >>> 0) / 4294967296;
}

// ============================================================
//  小画布渲染
// ============================================================
function renderSmall(hm, state) {
  const canvas = document.createElement('canvas');
  canvas.width = S_W;
  canvas.height = S_H;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(S_W, S_H);
  const d = img.data;
  const owner = state ? buildOwnerMap(state) : null;

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

      // 势力色罩
      if (owner && elev >= 5) {
        const fid = owner[y * S_W + x];
        if (fid) {
          const fc = factionRGB(fid, state);
          if (fc) {
            const dist = owner._dist ? owner._dist[y * S_W + x] : 999;
            const alpha = Math.max(0, 0.32 - dist * 0.008);
            if (alpha > 0) {
              r = clamp(Math.round(r * (1 - alpha) + fc.r * alpha));
              g = clamp(Math.round(g * (1 - alpha) + fc.g * alpha));
              b = clamp(Math.round(b * (1 - alpha) + fc.b * alpha));
            }
          }
        }
      }

      const i = (y * S_W + x) * 4;
      d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  // 地面纹理：撒细密草纹/岩纹点
  addGroundGrain(ctx, hm);

  return canvas;
}

/** 势力归属图 */
function buildOwnerMap(state) {
  const cities = Object.values(state.cities).filter(c => c.owner);
  if (cities.length === 0) return null;
  const owner = new Array(S_W * S_H).fill(null);
  const distArr = new Float32Array(S_W * S_H).fill(9999);
  for (const city of cities) {
    const cx = Math.round((city.x / 30) * S_W);
    const cy = Math.round((city.y / 30) * S_H);
    const R = 130;
    for (let dy = -R; dy <= R; dy++) {
      for (let dx = -R; dx <= R; dx++) {
        const px = cx + dx, py = cy + dy;
        if (px < 0 || px >= S_W || py < 0 || py >= S_H) continue;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > R) continue;
        const idx = py * S_W + px;
        if (dist < distArr[idx]) { distArr[idx] = dist; owner[idx] = city.owner; }
      }
    }
  }
  owner._dist = distArr;
  return owner;
}
function factionRGB(fid, state) {
  const f = state.factions[fid];
  if (!f || !f.color) return null;
  return { r: (f.color >> 16) & 0xff, g: (f.color >> 8) & 0xff, b: f.color & 0xff };
}
function clamp(v) { return Math.max(0, Math.min(255, v)); }

// ============================================================
//  光影
// ============================================================
function computeShade(hm, x, y) {
  const w = S_W;
  const e = hm[y * w + x];
  const x2 = Math.min(x + 1, w - 1);
  const y2 = Math.min(y + 1, S_H - 1);
  const dx = (hm[y * w + x2] - e) * 12;
  const dy = (hm[y2 * w + x] - e) * 12;
  const lx = -0.707, ly = -0.707;
  const dot = (-dx * lx + -dy * ly + 1);
  const len = Math.sqrt(dx * dx + dy * dy + 1);
  let s = Math.max(0.35, Math.min(1.42, (dot / len) * 1.2));
  if (e < 5) s *= 0.55 + (e / 5) * 0.45;
  return s;
}

// ============================================================
//  地面纹理细点（在小画布上撒，放大后变自然纹理）
// ============================================================
function addGroundGrain(ctx, hm) {
  const step = 2; // 每 2px 一个采样点
  for (let y = 0; y < S_H; y += step) {
    for (let x = 0; x < S_W; x += step) {
      const elev = hm[y * S_W + x];
      const h = hash2d(x, y, 777);
      const ox = (hash2d(x + 99, y, 778) - 0.5) * 2.5;
      const oy = (hash2d(x, y + 99, 779) - 0.5) * 2.5;
      const px = x + ox; const py = y + oy;
      const sz = 0.5 + h * 0.8;

      let cr, cg, cb, alpha;
      if (elev < 5) {
        cr = 20 + h * 15; cg = 55 + h * 20; cb = 120 + h * 25; alpha = 0.3;
      } else if (elev < 20) {
        cr = 110 + h * 40; cg = 155 + h * 30; cb = 55 + h * 25; alpha = 0.22;
      } else if (elev < 50) {
        cr = 140 + h * 35; cg = 160 + h * 25; cb = 70 + h * 20; alpha = 0.18;
      } else if (elev < 100) {
        cr = 140 + h * 30; cg = 115 + h * 25; cb = 60 + h * 20; alpha = 0.22;
      } else {
        cr = 165 + h * 25; cg = 145 + h * 25; cb = 110 + h * 25; alpha = 0.2;
      }

      ctx.fillStyle = `rgba(${Math.round(cr)},${Math.round(cg)},${Math.round(cb)},${alpha})`;
      ctx.beginPath();
      ctx.arc(px, py, sz, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ============================================================
//  河流
// ============================================================
function paintRivers(ctx) {
  const yellow = [
    { x: 155, y: 345 }, { x: 285, y: 305 }, { x: 355, y: 345 },
    { x: 435, y: 425 }, { x: 525, y: 545 }, { x: 655, y: 625 },
    { x: 855, y: 565 }, { x: 1055, y: 625 }, { x: 1255, y: 665 },
    { x: 1455, y: 585 }, { x: 1700, y: 485 }, { x: 1955, y: 435 },
    { x: 2200, y: 415 }, { x: 2395, y: 405 },
  ];
  const yangtze = [
    { x: 245, y: 1035 }, { x: 355, y: 1045 }, { x: 505, y: 1085 },
    { x: 655, y: 1105 }, { x: 805, y: 1125 }, { x: 955, y: 1135 },
    { x: 1105, y: 1125 }, { x: 1305, y: 1115 }, { x: 1505, y: 1135 },
    { x: 1705, y: 1165 }, { x: 1955, y: 1195 }, { x: 2205, y: 1205 },
    { x: 2395, y: 1215 },
  ];
  const minjiang = [
    { x: 95, y: 985 }, { x: 155, y: 1005 }, { x: 205, y: 1025 }, { x: 245, y: 1035 },
  ];
  const hanjiang = [
    { x: 450, y: 820 }, { x: 580, y: 880 }, { x: 700, y: 940 }, { x: 810, y: 1000 },
    { x: 880, y: 1060 }, { x: 950, y: 1120 },
  ];

  paintRiverPath(ctx, yellow, '#4098d8', 18);
  paintRiverPath(ctx, yangtze, '#40a8e0', 19);
  paintRiverPath(ctx, minjiang, '#4098d0', 9);
  paintRiverPath(ctx, hanjiang, '#4098d0', 10);
}

function paintRiverPath(ctx, pts, color, w) {
  if (pts.length < 2) return;
  const p = smoothPath(pts);
  // 岸影
  ctx.save();
  ctx.strokeStyle = 'rgba(22,32,28,0.26)';
  ctx.lineWidth = w + 14; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(p[0].x, p[0].y);
  for (let i = 1; i < p.length - 2; i += 3) ctx.bezierCurveTo(p[i].x, p[i].y, p[i + 1].x, p[i + 1].y, p[i + 2].x, p[i + 2].y);
  ctx.stroke(); ctx.restore();
  // 水面
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.globalAlpha = 0.7;
  ctx.beginPath(); ctx.moveTo(p[0].x, p[0].y);
  for (let i = 1; i < p.length - 2; i += 3) ctx.bezierCurveTo(p[i].x, p[i].y, p[i + 1].x, p[i + 1].y, p[i + 2].x, p[i + 2].y);
  ctx.stroke(); ctx.restore();
  // 高光
  ctx.save();
  ctx.strokeStyle = 'rgba(180,225,250,0.26)';
  ctx.lineWidth = w * 0.25; ctx.lineCap = 'round';
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
//  山脉——鱼骨状脊线：主脊 + 两侧分支
// ============================================================
function paintMountains(ctx) {
  // 每条脊线定义：主脊点序列
  const ridges = [
    // 青藏高原东缘（主脊 + 向东分支）
    { main: [{ x: 55, y: 80 }, { x: 85, y: 380 }, { x: 115, y: 680 }, { x: 145, y: 980 }, { x: 175, y: 1380 }, { x: 195, y: 1680 }], branches: 5 },
    { main: [{ x: 115, y: 180 }, { x: 155, y: 480 }, { x: 185, y: 780 }, { x: 215, y: 1080 }, { x: 245, y: 1480 }], branches: 4 },
    // 秦岭
    { main: [{ x: 175, y: 535 }, { x: 325, y: 515 }, { x: 465, y: 495 }, { x: 605, y: 485 }, { x: 725, y: 515 }], branches: 4 },
    { main: [{ x: 155, y: 595 }, { x: 305, y: 575 }, { x: 445, y: 555 }, { x: 585, y: 545 }], branches: 3 },
    // 大巴山
    { main: [{ x: 165, y: 805 }, { x: 305, y: 775 }, { x: 445, y: 755 }, { x: 575, y: 735 }, { x: 665, y: 765 }], branches: 4 },
    // 太行山
    { main: [{ x: 615, y: 265 }, { x: 655, y: 425 }, { x: 685, y: 565 }, { x: 675, y: 705 }], branches: 4 },
    { main: [{ x: 655, y: 305 }, { x: 695, y: 445 }, { x: 725, y: 575 }, { x: 705, y: 685 }], branches: 3 },
    // 巫山/雪峰山
    { main: [{ x: 375, y: 905 }, { x: 485, y: 955 }, { x: 585, y: 1005 }, { x: 685, y: 1055 }], branches: 4 },
    { main: [{ x: 345, y: 1085 }, { x: 455, y: 1125 }, { x: 555, y: 1165 }, { x: 655, y: 1185 }], branches: 4 },
    // 南岭
    { main: [{ x: 275, y: 1465 }, { x: 555, y: 1445 }, { x: 855, y: 1465 }, { x: 1155, y: 1485 }, { x: 1455, y: 1505 }], branches: 4 },
    // 武夷山
    { main: [{ x: 1545, y: 1265 }, { x: 1655, y: 1425 }, { x: 1705, y: 1575 }, { x: 1655, y: 1725 }], branches: 4 },
    // 大娄山
    { main: [{ x: 320, y: 1020 }, { x: 400, y: 1070 }, { x: 500, y: 1120 }], branches: 3 },
  ];

  for (const ridge of ridges) {
    paintFishboneRidge(ctx, ridge.main, ridge.branches);
  }
}

/** 鱼骨状山脉：沿主脊线画峰，两侧各伸 N 条短分支 */
function paintFishboneRidge(ctx, mainPts, branchCount) {
  const len = pathLen(mainPts);
  const n = Math.floor(len / 13); // 沿主脊的峰数

  for (let i = 0; i < n; i++) {
    const t = i / n;
    const pt = pathAt(mainPts, t);

    // 主峰（稍大的三角）
    const ox = Math.sin(i * 3.7) * 22 + Math.cos(i * 1.3) * 8;
    const oy = Math.cos(i * 2.9) * 14 + Math.sin(i * 2.1) * 8;
    const px = pt.x + ox;
    const py = pt.y + oy;
    const sz = 7 + (i % 3) * 2.5 + Math.abs(Math.sin(i * 1.2)) * 5;

    drawPeak(ctx, px, py, sz);

    // 两侧分支峰（短脊线）
    const angle = getPathAngle(mainPts, t);
    const perpAngle = angle + Math.PI / 2; // 垂直于主脊方向

    for (let b = 0; b < branchCount; b++) {
      const dir = b % 2 === 0 ? 1 : -1; // 交替左右
      const bDist = 6 + (b % 3) * 5;
      const bx = px + Math.cos(perpAngle) * bDist * dir;
      const by = py + Math.sin(perpAngle) * bDist * dir;
      const bsz = sz * 0.45 + (b % 2) * 1.5;
      drawPeak(ctx, bx, by, bsz);

      // 分支再延伸一级
      if (b < branchCount - 2) {
        const bx2 = bx + Math.cos(perpAngle) * 7 * dir;
        const by2 = by + Math.sin(perpAngle) * 7 * dir;
        drawPeak(ctx, bx2, by2, bsz * 0.55);
      }
    }
  }
}

function drawPeak(ctx, px, py, sz) {
  // 暗面
  ctx.fillStyle = 'rgba(100,78,48,0.5)';
  ctx.beginPath();
  ctx.moveTo(px, py - sz);
  ctx.lineTo(px + sz * 0.55, py + sz * 0.32);
  ctx.lineTo(px - sz * 0.55, py + sz * 0.32);
  ctx.closePath();
  ctx.fill();
  // 亮面
  ctx.fillStyle = 'rgba(200,168,115,0.48)';
  ctx.beginPath();
  ctx.moveTo(px, py - sz);
  ctx.lineTo(px - sz * 0.18, py - sz * 0.08);
  ctx.lineTo(px - sz * 0.55, py + sz * 0.32);
  ctx.closePath();
  ctx.fill();
}

/** 获取路径上某点的切线方向 */
function getPathAngle(points, t) {
  if (points.length < 2) return 0;
  const pt1 = pathAt(points, Math.max(0, t - 0.02));
  const pt2 = pathAt(points, Math.min(1, t + 0.02));
  return Math.atan2(pt2.y - pt1.y, pt2.x - pt1.x);
}

// ============================================================
//  森林——密度 5 倍，大小树混搭
// ============================================================
function paintForests(ctx) {
  const patches = [
    { cx: 1500, cy: 1380, rx: 300, ry: 220 },
    { cx: 920, cy: 1480, rx: 340, ry: 240 },
    { cx: 510, cy: 1380, rx: 240, ry: 300 },
    { cx: 1700, cy: 1580, rx: 240, ry: 200 },
    { cx: 610, cy: 890, rx: 200, ry: 240 },
    { cx: 1100, cy: 1680, rx: 340, ry: 220 },
    { cx: 710, cy: 1200, rx: 220, ry: 200 },
    { cx: 1300, cy: 1300, rx: 220, ry: 180 },
    { cx: 1800, cy: 1250, rx: 200, ry: 170 },
    { cx: 410, cy: 1450, rx: 180, ry: 200 },
    { cx: 1600, cy: 1100, rx: 180, ry: 160 },
    { cx: 1000, cy: 1200, rx: 160, ry: 140 },
  ];

  for (const f of patches) {
    // 每块林区 1500~3000 棵树（密度翻 5 倍）
    const count = Math.floor((f.rx * f.ry) / 55);
    for (let i = 0; i < count; i++) {
      const h0 = hash2d(i, Math.floor(f.cx + f.cy), 99);
      const angle = hash2d(i, 1, 100) * Math.PI * 2;
      const dist = Math.sqrt(hash2d(i, 2, 101));
      const px = f.cx + Math.cos(angle) * f.rx * dist;
      const py = f.cy + Math.sin(angle) * f.ry * dist;

      // 三种树大小
      const sizeRand = hash2d(i, 3, 102);
      let sz;
      if (sizeRand < 0.5) sz = 1.5 + sizeRand * 2;       // 小灌木
      else if (sizeRand < 0.85) sz = 3 + (sizeRand - 0.5) * 4; // 中等树
      else sz = 5.5 + (sizeRand - 0.85) * 8;              // 大树

      // 颜色变化
      const greenType = hash2d(i, 4, 103);
      let darkG, lightG;
      if (greenType < 0.33) {
        darkG = 'rgba(22,45,16,0.58)'; lightG = 'rgba(50,105,38,0.62)';
      } else if (greenType < 0.66) {
        darkG = 'rgba(18,38,14,0.58)'; lightG = 'rgba(62,115,44,0.6)';
      } else {
        darkG = 'rgba(26,52,20,0.56)'; lightG = 'rgba(42,95,32,0.58)';
      }

      // 树影
      ctx.fillStyle = darkG;
      ctx.beginPath();
      ctx.arc(px + 0.7, py + 0.7, sz, 0, Math.PI * 2);
      ctx.fill();

      // 树冠
      ctx.fillStyle = lightG;
      ctx.beginPath();
      ctx.arc(px, py, sz, 0, Math.PI * 2);
      ctx.fill();

      // 大树加点高光
      if (sz > 5) {
        ctx.fillStyle = 'rgba(120,175,90,0.2)';
        ctx.beginPath();
        ctx.arc(px - sz * 0.2, py - sz * 0.2, sz * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

// ============================================================
//  地名标注
// ============================================================
function paintLabels(ctx) {
  // 山名
  ctx.save();
  ctx.font = 'bold 28px "Microsoft YaHei", "SimHei", sans-serif';
  ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(75,65,50,0.68)';
  ctx.strokeStyle = 'rgba(255,250,230,0.55)';
  ctx.lineWidth = 3;

  const mountains = [
    { t: '秦    岭', x: 550, y: 530, a: -0.05 },
    { t: '大巴山', x: 480, y: 760, a: -0.03 },
    { t: '太行山', x: 730, y: 500, a: 0.1 },
    { t: '南  岭', x: 1050, y: 1470, a: 0 },
    { t: '武夷山', x: 1740, y: 1530, a: 0.15 },
    { t: '巫  山', x: 620, y: 1030, a: 0.2 },
    { t: '青藏高原', x: 130, y: 880, a: -0.3 },
    { t: '四川盆地', x: 270, y: 1080, a: 0 },
    { t: '关中平原', x: 510, y: 660, a: 0 },
    { t: '华北平原', x: 1350, y: 680, a: 0 },
    { t: '江  南', x: 1550, y: 1350, a: 0 },
    { t: '岭  南', x: 1020, y: 1790, a: 0 },
  ];
  for (const m of mountains) {
    ctx.save();
    ctx.translate(m.x, m.y); ctx.rotate(m.a);
    ctx.strokeText(m.t, 0, 0); ctx.fillText(m.t, 0, 0);
    ctx.restore();
  }
  ctx.restore();

  // 河名
  ctx.save();
  ctx.font = 'bold 30px "Microsoft YaHei", "SimHei", sans-serif';
  ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(200,228,248,0.68)';
  ctx.strokeStyle = 'rgba(28,48,68,0.52)';
  ctx.lineWidth = 3;
  const rivers = [
    { t: '黄  河', x: 1050, y: 610, a: -0.02 },
    { t: '长  江', x: 1150, y: 1135, a: 0.02 },
    { t: '岷江', x: 175, y: 1005, a: 0.3 },
    { t: '汉江', x: 700, y: 980, a: 0.35 },
  ];
  for (const r of rivers) {
    ctx.save();
    ctx.translate(r.x, r.y); ctx.rotate(r.a);
    ctx.strokeText(r.t, 0, 0); ctx.fillText(r.t, 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

// ============================================================
//  路径工具
// ============================================================
function pathLen(points) {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    len += Math.sqrt(dx * dx + dy * dy);
  }
  return len;
}
function pathAt(points, t) {
  if (points.length === 1) return points[0];
  let target = t * pathLen(points);
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    const seg = Math.sqrt(dx * dx + dy * dy);
    if (target <= seg) {
      const f = seg > 0 ? target / seg : 0;
      return { x: points[i - 1].x + dx * f, y: points[i - 1].y + dy * f };
    }
    target -= seg;
  }
  return points[points.length - 1];
}
