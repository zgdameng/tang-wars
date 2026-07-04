/**
 * 三国志风格地图生成器 v3 — 基于海拔高度图的地形渲染。
 *
 * 原理（生活类比）：
 *   像捏橡皮泥——先铺一层高低不平的高度图（西高东低、盆地洼下去），
 *   然后按高度染色（低处绿、中间黄、高处褐、顶白），
 *   最后从左上角打一束光，坡面该亮的地方亮、该暗的地方暗，
 *   就有了立体凹凸感。
 *
 * 步骤：
 *   1. 在 300×250 小画布上生成高度图 + 染色 + 光照阴影
 *   2. 用画布自带缩放拉到 2400×2000 大图（浏览器硬件加速）
 *   3. 在大图上叠加河流、山峰、森林装饰
 */

export const MAP_W = 2400;
export const MAP_H = 2000;
export const CELL_W = MAP_W / 30; // 80
export const CELL_H = MAP_H / 30; // ≈66.67

// 小画布尺寸（1/8 大图，处理快）
const SMALL_W = 300;
const SMALL_H = 250;

export function gridToPixel(col, row) {
  return {
    x: Math.round(col * CELL_W + CELL_W / 2),
    y: Math.round(row * CELL_H + CELL_H / 2),
  };
}

// ============================================================
//  主入口
// ============================================================

export function generateMapBitmap() {
  // 1. 生成高度图数组（单位：米，0=海平面）
  const hm = buildHeightmap();

  // 2. 在小画布上绘制高度染色 + 光影
  const smallCanvas = renderTerrainSmall(hm);

  // 3. 放大到大图
  const bigCanvas = document.createElement('canvas');
  bigCanvas.width = MAP_W;
  bigCanvas.height = MAP_H;
  const ctx = bigCanvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'medium';
  ctx.drawImage(smallCanvas, 0, 0, MAP_W, MAP_H);

  // 4. 在大图上叠加河流 / 山峰 / 森林（全分辨率）
  paintRivers(ctx);
  paintPeaks(ctx, hm);
  paintForests(ctx, hm);

  return bigCanvas;
}

// ============================================================
//  高度图：用真实中国地形逻辑算出每个格点海拔
// ============================================================

function buildHeightmap() {
  const w = SMALL_W;
  const h = SMALL_H;
  const hm = new Float32Array(w * h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const col = (x / w) * 30;
      const row = (y / h) * 30;

      let elev = baseElevation(col, row);

      // 叠加分形噪声（模拟真实地形褶皱）
      const noise = fbm(col * 0.7, row * 0.7, 42, 4) * 35;
      elev += noise - 10;

      // 限制在合理范围
      elev = Math.max(0, Math.min(250, elev));

      hm[y * w + x] = elev;
    }
  }
  return hm;
}

/**
 * 基础海拔（按中国地理分区的大趋势）。
 * 取值单位约等于实际海拔的 1/20（方便映射到 0..255）。
 *
 * 中国真实地势：西高东低，三级阶梯：
 *   第一级：青藏高原 4000m+
 *   第二级：蒙古/黄土/云贵高原 1000-2000m
 *   第三级：东部平原/丘陵 <500m
 */
function baseElevation(col, row) {
  // === 第一阶梯：青藏高原（极西，极高） ===
  if (col < 3.5) return 220;                       // 青藏高原主体
  if (col < 5 && row > 14 && row < 18) return 210;  // 高原南延

  // === 青藏高原东缘陡降（横断山脉）===
  if (col < 5.5) return 180;
  if (col < 6.5) return 140;
  if (col < 7.5) return 100;

  // === 四川盆地（第二阶梯中的洼地，约 500m）===
  if (col >= 1.5 && col <= 5 && row >= 14 && row <= 18.5) return 25;

  // === 秦岭（关中以南的东西向高脊，约 2000-3000m）===
  if (row > 8.5 && row < 12 && col > 5 && col < 9) {
    const distFromCenter = Math.abs(row - 10.2);
    return 130 - distFromCenter * 12;  // 山脊高，向两侧递减
  }

  // === 大巴山（四川盆地北侧）===
  if (row > 12 && row < 14 && col > 5 && col < 9) return 100;

  // === 关中平原（秦岭以北的谷地，约 400-600m）===
  if (col >= 3 && col <= 7.5 && row >= 7 && row <= 8.5) return 30;

  // === 黄土高原（第二阶梯，约 1000-2000m）===
  if (col >= 7 && col < 10 && row >= 4 && row < 8) return 70;

  // === 太行山（华北平原西沿，约 1000-2000m）===
  if (col >= 9 && col < 10.5 && row >= 4 && row < 11) return 90;

  // === 巫山/雪峰山（第二→第三阶梯过渡）===
  if (col >= 10 && col < 12 && row >= 13 && row < 18) return 70;

  // === 南岭（岭南以北分水岭，约 1000m）===
  if (row >= 19 && row < 20.5 && col > 6 && col < 18) return 75;

  // === 武夷山/浙闽丘陵 ===
  if (col >= 18 && col < 21 && row >= 16 && row < 20) return 80;

  // === 第三阶梯：华北平原（约 50-200m）===
  if (col >= 10 && row >= 4 && row < 9) return 15;
  // 中原（约 100-300m）
  if (col >= 10 && col < 18 && row >= 9 && row < 14) return 20;

  // === 第三阶梯：长江中下游平原 ===
  if (col >= 10 && col < 22 && row >= 14 && row < 19) return 12;

  // === 江南丘陵（约 200-500m）===
  if (row >= 19 && row < 24 && col >= 8) return 40;

  // === 岭南（约 200-500m）===
  if (row >= 24) return 35;

  // === 北方草原/蒙古高原（约 1000-1500m）===
  if (row < 4) return 55;

  // === 东部沿海低地 ===
  if (col >= 22 && row >= 12 && row < 19) return 6;

  // === 默认：中等海拔 ===
  return 30;
}

// ============================================================
//  分形噪声（模拟自然地形粗糙度）
// ============================================================

function fbm(x, y, seed, octaves) {
  let value = 0;
  let amp = 0.5;
  let freq = 1;
  let max = 0;
  for (let i = 0; i < octaves; i++) {
    value += amp * noise2d(x * freq, y * freq, seed + i * 1000);
    max += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return value / max;
}

/** 简单值噪声（无数组查找，纯运算） */
function noise2d(x, y, seed) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  // smoothstep
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);

  const v00 = hash2d(ix, iy, seed);
  const v10 = hash2d(ix + 1, iy, seed);
  const v01 = hash2d(ix, iy + 1, seed);
  const v11 = hash2d(ix + 1, iy + 1, seed);

  const a = v00 + (v10 - v00) * sx;
  const b = v01 + (v11 - v01) * sx;
  return a + (b - a) * sy;
}

function hash2d(x, y, seed) {
  let h = ((x * 374761393 + y * 668265263 + seed * 1274126177) >>> 0);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = Math.imul(h ^ (h >>> 16), 1);
  return (h >>> 0) / 4294967296;
}

// ============================================================
//  在小画布上：海拔染色 + 光影阴影
// ============================================================

function renderTerrainSmall(hm) {
  const canvas = document.createElement('canvas');
  canvas.width = SMALL_W;
  canvas.height = SMALL_H;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(SMALL_W, SMALL_H);
  const data = img.data;

  for (let y = 0; y < SMALL_H; y++) {
    for (let x = 0; x < SMALL_W; x++) {
      const elev = hm[y * SMALL_W + x];

      // 海拔→颜色（分级渐变）
      let r, g, b;
      if (elev < 3) {
        // 深海
        r = 30; g = 70; b = 140;
        const t = elev / 3;
        r = Math.round(30 + t * 20);
        g = Math.round(70 + t * 40);
        b = Math.round(140 - t * 20);
      } else if (elev < 8) {
        // 浅海/海滩
        const t = (elev - 3) / 5;
        r = Math.round(50 + t * 100);
        g = Math.round(110 + t * 60);
        b = Math.round(120 + t * 30);
      } else if (elev < 20) {
        // 低地平原（翠绿）
        const t = (elev - 8) / 12;
        r = Math.round(150 - t * 30);
        g = Math.round(170 + t * 10);
        b = Math.round(70 + t * 20);
      } else if (elev < 50) {
        // 丘陵（黄绿过渡）
        const t = (elev - 20) / 30;
        r = Math.round(120 + t * 50);
        g = Math.round(180 - t * 40);
        b = Math.round(90 - t * 20);
      } else if (elev < 100) {
        // 山地（褐色）
        const t = (elev - 50) / 50;
        r = Math.round(170 - t * 10);
        g = Math.round(140 - t * 30);
        b = Math.round(70 - t * 10);
      } else if (elev < 160) {
        // 高山（灰褐）
        const t = (elev - 100) / 60;
        r = Math.round(160 + t * 30);
        g = Math.round(110 + t * 50);
        b = Math.round(60 + t * 50);
      } else if (elev < 210) {
        // 雪线以上
        const t = (elev - 160) / 50;
        r = Math.round(190 + t * 40);
        g = Math.round(160 + t * 50);
        b = Math.round(110 + t * 80);
      } else {
        // 雪山之巅
        r = 235; g = 230; b = 220;
      }

      // 计算光影（从左上打光）
      const shade = computeShade(hm, x, y, SMALL_W, SMALL_H);

      // 应用光影
      const sr = Math.max(0, Math.min(255, Math.round(r * shade)));
      const sg = Math.max(0, Math.min(255, Math.round(g * shade)));
      const sb = Math.max(0, Math.min(255, Math.round(b * shade)));

      const i = (y * SMALL_W + x) * 4;
      data[i] = sr;
      data[i + 1] = sg;
      data[i + 2] = sb;
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  return canvas;
}

/**
 * 计算一个像素的光照值。
 * 原理：看这个点相对于右边/下边邻居的高度差，
 * 朝向光源（左上）的坡面亮，背向光源的坡面暗。
 *
 * 返回 0.4~1.35 之间的系数（<1=阴影，>1=高亮）。
 */
function computeShade(hm, x, y, w, h) {
  const elev = hm[y * w + x];

  // 取右边和下边邻居高度，计算坡度
  const x2 = Math.min(x + 1, w - 1);
  const y2 = Math.min(y + 1, h - 1);
  const dx = (hm[y * w + x2] - elev) * 8;  // *8 因为小图画布高度值范围大
  const dy = (hm[y2 * w + x] - elev) * 8;

  // 光源方向：从左上照来 (lightX=-1, lightY=-1)，归一化
  const lx = -0.707;
  const ly = -0.707;

  // 表面法线的水平分量: (-dx, -dy, 1)
  const dot = (-dx * lx + -dy * ly + 1);
  const len = Math.sqrt(dx * dx + dy * dy + 1);
  let shade = dot / len;

  // 映射：min 0.4（暗面），max 1.35（亮面），1.0 = 平地
  shade = Math.max(0.4, Math.min(1.35, shade * 1.15));

  // 让深水区稍暗（水深越深越暗）
  if (elev < 5) {
    shade *= 0.65 + (elev / 5) * 0.35;
  }

  return shade;
}

// ============================================================
//  从高度图中取某一点的海拔（用于在大图上定位装饰）
// ============================================================

function sampleElevation(hm, col, row) {
  // col, row 在 0..30 范围
  const x = Math.round((col / 30) * (SMALL_W - 1));
  const y = Math.round((row / 30) * (SMALL_H - 1));
  return hm[Math.max(0, Math.min(SMALL_H - 1, y)) * SMALL_W + Math.max(0, Math.min(SMALL_W - 1, x))];
}

// ============================================================
//  河流：在大图上画（贝塞尔曲线）
// ============================================================

function paintRivers(ctx) {
  // 黄河——从青藏高原向北拐到河套，再向南到关中，再向东入海
  const yellow = [
    { x: 160, y: 340 },   // 源头（青藏高原东缘，col≈2,row≈5）
    { x: 280, y: 300 },   // 河套（北拐）
    { x: 350, y: 340 },
    { x: 430, y: 420 },
    { x: 520, y: 540 },   // 向南拐到关中北部
    { x: 650, y: 620 },
    { x: 850, y: 560 },   // 洛阳一带
    { x: 1050, y: 620 },
    { x: 1250, y: 660 },  // 汴州附近
    { x: 1450, y: 580 },
    { x: 1700, y: 480 },  // 向东
    { x: 1950, y: 430 },
    { x: 2200, y: 410 },
    { x: 2380, y: 400 },  // 入海
  ];

  // 长江——从四川盆地东流出，经三峡、江陵、襄阳，过扬州入海
  const yangtze = [
    { x: 240, y: 1030 },  // 四川盆地出口
    { x: 350, y: 1040 },
    { x: 500, y: 1080 },  // 三峡
    { x: 650, y: 1100 },
    { x: 800, y: 1120 },  // 江陵附近
    { x: 950, y: 1130 },
    { x: 1100, y: 1120 }, // 襄阳
    { x: 1300, y: 1110 },
    { x: 1500, y: 1130 },
    { x: 1700, y: 1160 }, // 扬州
    { x: 1950, y: 1190 },
    { x: 2200, y: 1200 },
    { x: 2380, y: 1210 }, // 入海
  ];

  // 岷江（四川盆地内，都江堰水系）
  const minjiang = [
    { x: 100, y: 980 },
    { x: 150, y: 1000 },
    { x: 200, y: 1020 },
    { x: 240, y: 1030 },  // 汇入长江
  ];

  paintRiverPath(ctx, yellow, '#4898d0', 14);
  paintRiverPath(ctx, yangtze, '#48a8d8', 15);
  paintRiverPath(ctx, minjiang, '#4898c8', 7);
}

function paintRiverPath(ctx, pts, color, width) {
  if (pts.length < 2) return;
  const path = makeSmoothPath(pts);

  // 河床暗边（比河面宽）
  ctx.save();
  ctx.strokeStyle = 'rgba(30,40,30,0.30)';
  ctx.lineWidth = width + 10;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  for (let i = 1; i < path.length - 2; i += 3) {
    ctx.bezierCurveTo(path[i].x, path[i].y, path[i + 1].x, path[i + 1].y, path[i + 2].x, path[i + 2].y);
  }
  ctx.stroke();
  ctx.restore();

  // 河面
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  for (let i = 1; i < path.length - 2; i += 3) {
    ctx.bezierCurveTo(path[i].x, path[i].y, path[i + 1].x, path[i + 1].y, path[i + 2].x, path[i + 2].y);
  }
  ctx.stroke();
  ctx.restore();

  // 水面高光（细亮线）
  ctx.save();
  ctx.strokeStyle = 'rgba(180,220,245,0.3)';
  ctx.lineWidth = width * 0.28;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  for (let i = 1; i < path.length - 2; i += 3) {
    ctx.bezierCurveTo(path[i].x, path[i].y, path[i + 1].x, path[i + 1].y, path[i + 2].x, path[i + 2].y);
  }
  ctx.stroke();
  ctx.restore();
}

function makeSmoothPath(pts) {
  if (pts.length < 3) return pts;
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    out.push(p1);
    out.push({ x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 });
    out.push({ x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 });
    out.push(p2);
  }
  return out;
}

// ============================================================
//  山峰三角——只在高海拔区域（山区）画
// ============================================================

function paintPeaks(ctx, hm) {
  // 定义几条山脉脊线的走向（大图坐标）
  const ridges = [
    [{ x: 60, y: 100 }, { x: 90, y: 400 }, { x: 120, y: 700 }, { x: 150, y: 1000 }, { x: 180, y: 1400 }, { x: 200, y: 1700 }],
    [{ x: 120, y: 200 }, { x: 160, y: 500 }, { x: 190, y: 800 }, { x: 220, y: 1100 }, { x: 250, y: 1500 }],
    [{ x: 180, y: 540 }, { x: 330, y: 520 }, { x: 470, y: 500 }, { x: 610, y: 490 }, { x: 730, y: 520 }],
    [{ x: 160, y: 600 }, { x: 310, y: 580 }, { x: 450, y: 560 }, { x: 590, y: 550 }],
    [{ x: 170, y: 810 }, { x: 310, y: 780 }, { x: 450, y: 760 }, { x: 580, y: 740 }, { x: 670, y: 770 }],
    [{ x: 620, y: 270 }, { x: 660, y: 430 }, { x: 690, y: 570 }, { x: 680, y: 710 }],
    [{ x: 660, y: 310 }, { x: 700, y: 450 }, { x: 730, y: 580 }, { x: 710, y: 690 }],
    [{ x: 280, y: 1470 }, { x: 560, y: 1450 }, { x: 860, y: 1470 }, { x: 1160, y: 1490 }, { x: 1460, y: 1510 }],
    [{ x: 1550, y: 1270 }, { x: 1660, y: 1430 }, { x: 1710, y: 1580 }, { x: 1660, y: 1730 }],
    [{ x: 380, y: 910 }, { x: 490, y: 960 }, { x: 590, y: 1010 }, { x: 690, y: 1060 }],
    [{ x: 350, y: 1090 }, { x: 460, y: 1130 }, { x: 560, y: 1170 }, { x: 660, y: 1190 }],
  ];

  for (const ridge of ridges) {
    const totalLen = pathLen(ridge);
    const steps = Math.floor(totalLen / 18);
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const pt = pathAt(ridge, t);
      const ox = Math.sin(i * 3.7) * 22 + Math.cos(i * 1.3) * 10;
      const oy = Math.cos(i * 2.9) * 16 + Math.sin(i * 2.1) * 10;
      const px = pt.x + ox;
      const py = pt.y + oy;
      const sz = 5 + (i % 4) * 2.5 + Math.abs(Math.sin(i * 1.3)) * 5;

      // 峰体暗面
      ctx.fillStyle = 'rgba(120,95,60,0.6)';
      ctx.beginPath();
      ctx.moveTo(px, py - sz);
      ctx.lineTo(px + sz * 0.55, py + sz * 0.3);
      ctx.lineTo(px - sz * 0.55, py + sz * 0.3);
      ctx.closePath();
      ctx.fill();

      // 峰体亮面
      ctx.fillStyle = 'rgba(190,160,110,0.55)';
      ctx.beginPath();
      ctx.moveTo(px, py - sz);
      ctx.lineTo(px - sz * 0.2, py - sz * 0.1);
      ctx.lineTo(px - sz * 0.55, py + sz * 0.3);
      ctx.closePath();
      ctx.fill();
    }
  }
}

// ============================================================
//  森林——在中海拔（丘陵）区域撒树冠点
// ============================================================

function paintForests(ctx, hm) {
  const forests = [
    { cx: 1500, cy: 1380, rx: 280, ry: 200, n: 500 },
    { cx: 900, cy: 1480, rx: 320, ry: 220, n: 550 },
    { cx: 500, cy: 1380, rx: 220, ry: 280, n: 480 },
    { cx: 1700, cy: 1580, rx: 220, ry: 180, n: 400 },
    { cx: 600, cy: 880, rx: 180, ry: 220, n: 350 },
    { cx: 1100, cy: 1680, rx: 320, ry: 200, n: 450 },
    { cx: 700, cy: 1200, rx: 200, ry: 180, n: 300 },
    { cx: 1300, cy: 1300, rx: 200, ry: 160, n: 280 },
    { cx: 1800, cy: 1250, rx: 180, ry: 150, n: 250 },
    { cx: 400, cy: 1450, rx: 160, ry: 180, n: 260 },
  ];

  for (const f of forests) {
    for (let i = 0; i < f.n; i++) {
      const h = hash2d(i, Math.floor(f.cx + f.cy), 99);
      const angle = hash2d(i, 1, 100) * Math.PI * 2;
      const dist = Math.sqrt(hash2d(i, 2, 101));
      const px = f.cx + Math.cos(angle) * f.rx * dist;
      const py = f.cy + Math.sin(angle) * f.ry * dist;
      const sz = 1.5 + hash2d(i, 3, 102) * 3.5;

      // 树影
      ctx.fillStyle = 'rgba(20,40,16,0.55)';
      ctx.beginPath();
      ctx.arc(px + 0.7, py + 0.7, sz, 0, Math.PI * 2);
      ctx.fill();

      // 树冠
      const g = hash2d(i, 4, 103) > 0.5 ? 'rgba(55,105,42,0.65)' : 'rgba(40,90,32,0.65)';
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, py, sz, 0, Math.PI * 2);
      ctx.fill();
    }
  }
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
  const total = pathLen(points);
  let target = t * total;
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
