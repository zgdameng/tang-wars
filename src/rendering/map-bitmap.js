/**
 * 三国志风格地图大图生成器。
 *
 * 不用方块格子，而是在一张大画布（Canvas 2D）上画出：
 *  - 羊皮纸底色
 *  - 柔边渐变的草原/山地/雪原/丘陵/平原
 *  - 黄河长江（贝塞尔曲线河流）
 *  - 山脉峰脊（沿山线画小三角峰群）
 *  - 森林树丛（深绿小圆簇）
 *  - 东/南海岸线
 *
 * 这张图作为地图背景，镜头在上面平移缩放。
 * cols 0..29 → x 0..MAP_W, rows 0..29 → y 0..MAP_H。
 */

export const MAP_W = 2400;
export const MAP_H = 2000;
export const CELL_W = MAP_W / 30; // 80
export const CELL_H = MAP_H / 30; // ≈66.67

/**
 * 网格坐标 → 地图像素中心点。
 * 城池圆点 / DOM 标签都放在这个位置。
 */
export function gridToPixel(col, row) {
  return {
    x: Math.round(col * CELL_W + CELL_W / 2),
    y: Math.round(row * CELL_H + CELL_H / 2),
  };
}

// ============================================================
//  小型工具
// ============================================================

/** 种子伪随机（col,row 级别） */
function srand(col, row, salt) {
  let h = ((col * 374761393 + row * 668265263 + salt * 1274126177) >>> 0);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = Math.imul(h ^ (h >>> 16), 1);
  return (h >>> 0) / 4294967296;
}

/** 在 min..max 内随机 */
function between(rng, min, max) {
  return min + rng * (max - min);
}

// ============================================================
//  主入口：生成整张地图位图
// ============================================================

export function generateMapBitmap() {
  const canvas = document.createElement('canvas');
  canvas.width = MAP_W;
  canvas.height = MAP_H;
  const ctx = canvas.getContext('2d');

  // 1. 羊皮纸底色
  ctx.fillStyle = '#e8dcc8';
  ctx.fillRect(0, 0, MAP_W, MAP_H);

  // 2. 海洋（地图外的蓝色底边）
  paintOcean(ctx);

  // 3. 地形区块——用大号径向渐变 + 不规则圆堆叠，边界自然柔和
  paintTerrain(ctx);

  // 4. 山脉脊线
  paintMountainRidges(ctx);

  // 5. 森林覆盖
  paintForests(ctx);

  // 6. 河流（在山上画，让河在森林之上）
  paintRivers(ctx);

  // 7. 全局纹理噪点（最后加一层极淡的噪点模拟纸纹）
  addPaperTexture(ctx);

  return canvas;
}

// ============================================================
//  1. 海洋
// ============================================================

function paintOcean(ctx) {
  // 右侧（东海）和底部（南海）
  ctx.fillStyle = '#8ab8d8';
  ctx.fillRect(0, 0, MAP_W, MAP_H);

  // 地图陆地主体是淡黄色大椭圆，盖在蓝色上
  const landGrad = ctx.createRadialGradient(1200, 1000, 200, 1200, 1000, 1600);
  landGrad.addColorStop(0, '#e8dcc8');
  landGrad.addColorStop(0.85, '#e0d4c0');
  landGrad.addColorStop(1, '#8ab8d8');
  ctx.fillStyle = landGrad;
  ctx.fillRect(0, 0, MAP_W, MAP_H);
}

// ============================================================
//  2. 地形区块——用多层半透明椭圆叠出自然过渡
// ============================================================

function paintTerrain(ctx) {
  // 每层是一个大椭圆 + 几团小椭圆，模拟不规则地形边界

  // 青藏高原（极西，灰白）
  blobLayer(ctx, [
    { cx: 80, cy: 800, rx: 350, ry: 900 },
    { cx: 200, cy: 400, rx: 280, ry: 500 },
    { cx: 150, cy: 1500, rx: 240, ry: 400 },
  ], '#c0bca8', 0.9, 120);

  // 西部山脉（秦岭大巴山，褐色）
  blobLayer(ctx, [
    { cx: 350, cy: 600, rx: 380, ry: 550 },
    { cx: 400, cy: 1100, rx: 320, ry: 450 },
    { cx: 300, cy: 900, rx: 350, ry: 500 },
  ], '#b0a080', 0.85, 100);

  // 关中平原（山脉中的一块绿洲）
  blobLayer(ctx, [
    { cx: 500, cy: 650, rx: 180, ry: 130 },
    { cx: 480, cy: 700, rx: 140, ry: 100 },
  ], '#d0d4a0', 0.7, 60);

  // 四川盆地（西南高山中的洼地）
  blobLayer(ctx, [
    { cx: 200, cy: 1100, rx: 200, ry: 150 },
    { cx: 250, cy: 1050, rx: 160, ry: 130 },
  ], '#c8d090', 0.8, 50);

  // 北方草原（顶部黄绿带）
  blobLayer(ctx, [
    { cx: 800, cy: 80, rx: 900, ry: 180 },
    { cx: 1400, cy: 120, rx: 800, ry: 200 },
    { cx: 400, cy: 160, rx: 500, ry: 160 },
  ], '#d8d8a0', 0.7, 80);

  // 华北平原（中北部，黄河流域）
  blobLayer(ctx, [
    { cx: 1000, cy: 500, rx: 600, ry: 300 },
    { cx: 1400, cy: 550, rx: 500, ry: 280 },
    { cx: 700, cy: 600, rx: 400, ry: 250 },
  ], '#c8d898', 0.75, 90);

  // 中原（中部，洛阳汴州一带）
  blobLayer(ctx, [
    { cx: 1100, cy: 750, rx: 500, ry: 300 },
    { cx: 1400, cy: 800, rx: 400, ry: 280 },
    { cx: 900, cy: 850, rx: 350, ry: 250 },
  ], '#c0d888', 0.8, 80);

  // 江南水乡（东部沿海低地）
  blobLayer(ctx, [
    { cx: 1700, cy: 900, rx: 450, ry: 350 },
    { cx: 1900, cy: 1100, rx: 400, ry: 300 },
    { cx: 1600, cy: 1200, rx: 350, ry: 280 },
  ], '#b8d878', 0.75, 70);

  // 江南丘陵（长江以南）
  blobLayer(ctx, [
    { cx: 1000, cy: 1300, rx: 500, ry: 300 },
    { cx: 1400, cy: 1400, rx: 450, ry: 280 },
    { cx: 700, cy: 1400, rx: 400, ry: 250 },
  ], '#a0c870', 0.7, 80);

  // 岭南（极南湿热）
  blobLayer(ctx, [
    { cx: 800, cy: 1750, rx: 600, ry: 250 },
    { cx: 1200, cy: 1800, rx: 500, ry: 220 },
    { cx: 500, cy: 1700, rx: 400, ry: 200 },
  ], '#80a860', 0.8, 60);
}

/**
 * 画一组柔边色块。
 * 每个色块是径向渐变椭圆 + 周围撒几个小圆模拟不规则边界。
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<{cx,cy,rx,ry}>} blobs - 椭圆列表
 * @param {string} color - CSS 颜色
 * @param {number} alpha - 透明度
 * @param {number} scatter - 小圆散射范围（像素）
 */
function blobLayer(ctx, blobs, color, alpha, scatter) {
  ctx.save();
  ctx.globalAlpha = alpha;

  for (const b of blobs) {
    // 主椭圆：径向渐变，中心实、边缘虚
    const grad = ctx.createRadialGradient(b.cx, b.cy, b.rx * 0.1, b.cx, b.cy, Math.max(b.rx, b.ry));
    grad.addColorStop(0, color);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(b.cx, b.cy, b.rx, b.ry, 0, 0, Math.PI * 2);
    ctx.fill();

    // 周围撒 5~8 个小圆，模拟自然边界
    const n = 5 + Math.floor(Math.abs(b.cx + b.cy) % 4);
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 2 + (b.cx % 1.3);
      const dist = scatter * (0.6 + (i % 3) * 0.3);
      const sx = b.cx + Math.cos(angle) * dist;
      const sy = b.cy + Math.sin(angle) * dist;
      const sr = 20 + (i * 7) % 30;
      const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
      sg.addColorStop(0, color);
      sg.addColorStop(1, 'transparent');
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

// ============================================================
//  3. 山脉脊线——沿路径画三角峰群
// ============================================================

function paintMountainRidges(ctx) {
  // 定义几条主山脉的走向（x,y 点序列）
  const ranges = [
    // 青藏高原东缘（从北向南的大山脉）
    [{ x: 50, y: 100 }, { x: 80, y: 400 }, { x: 120, y: 700 }, { x: 160, y: 1000 }, { x: 200, y: 1300 }, { x: 240, y: 1600 }],
    // 秦岭（从青藏高原向东延伸）
    [{ x: 200, y: 600 }, { x: 350, y: 580 }, { x: 500, y: 550 }, { x: 650, y: 530 }, { x: 750, y: 560 }],
    // 大巴山（秦岭以南）
    [{ x: 180, y: 850 }, { x: 320, y: 820 }, { x: 480, y: 800 }, { x: 600, y: 780 }],
    // 太行山（华北平原西沿）
    [{ x: 650, y: 300 }, { x: 680, y: 450 }, { x: 720, y: 600 }, { x: 700, y: 750 }],
    // 南岭（岭南以北的东西向山脉）
    [{ x: 300, y: 1500 }, { x: 600, y: 1480 }, { x: 900, y: 1500 }, { x: 1200, y: 1520 }, { x: 1500, y: 1540 }],
    // 武夷山/浙闽丘陵（东南沿海）
    [{ x: 1600, y: 1300 }, { x: 1700, y: 1450 }, { x: 1750, y: 1600 }, { x: 1700, y: 1750 }],
    // 巫山/雪峰山（四川盆地东侧）
    [{ x: 400, y: 950 }, { x: 500, y: 1000 }, { x: 600, y: 1050 }, { x: 700, y: 1100 }],
  ];

  for (const ridge of ranges) {
    paintRidge(ctx, ridge);
  }
}

/** 沿一条山脉点序列画峰群 */
function paintRidge(ctx, points) {
  if (points.length < 2) return;

  // 山脉主色
  const baseColor = '#8a7860';

  // 先画一条模糊的粗线做山脉基底（影）
  ctx.save();
  ctx.strokeStyle = 'rgba(100,85,65,0.25)';
  ctx.lineWidth = 40;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();
  ctx.restore();

  // 沿路径每隔一段画一个小三角峰
  const totalLen = pathLength(points);
  const spacing = 28 + Math.floor(Math.random() * 10); // 峰间距
  const count = Math.floor(totalLen / spacing);

  for (let i = 0; i < count; i++) {
    const t = (i / count);
    const pt = pointOnPath(points, t);
    // 加点随机偏移，显得自然
    const ox = (Math.sin(i * 3.7) * 18);
    const oy = (Math.cos(i * 2.9) * 14);
    const px = pt.x + ox;
    const py = pt.y + oy;

    // 峰的大小随机变化
    const sz = 5 + (i % 5) * 2.5 + Math.abs(Math.sin(i * 1.3)) * 4;

    // 峰体——深色三角形
    ctx.fillStyle = '#7a6850';
    ctx.beginPath();
    ctx.moveTo(px, py - sz);
    ctx.lineTo(px + sz * 0.5, py + sz * 0.25);
    ctx.lineTo(px - sz * 0.5, py + sz * 0.25);
    ctx.closePath();
    ctx.fill();

    // 亮面（左侧高光模拟光照）
    ctx.fillStyle = '#a09070';
    ctx.beginPath();
    ctx.moveTo(px, py - sz);
    ctx.lineTo(px - sz * 0.1, py);
    ctx.lineTo(px - sz * 0.5, py + sz * 0.25);
    ctx.closePath();
    ctx.fill();
  }
}

// ============================================================
//  4. 森林——撒深绿树冠圆
// ============================================================

function paintForests(ctx) {
  // 定义森林区域（中心+半径的椭圆）
  const forests = [
    { cx: 1500, cy: 1400, rx: 250, ry: 180, density: 0.5 },  // 江南森林
    { cx: 900, cy: 1500, rx: 300, ry: 200, density: 0.45 },   // 荆襄丘陵
    { cx: 500, cy: 1400, rx: 200, ry: 250, density: 0.4 },    // 巴蜀山林
    { cx: 1700, cy: 1600, rx: 200, ry: 150, density: 0.5 },   // 闽浙山林
    { cx: 600, cy: 900, rx: 150, ry: 200, density: 0.35 },    // 秦岭森林
    { cx: 1100, cy: 1700, rx: 300, ry: 180, density: 0.4 },   // 岭南密林
  ];

  for (const f of forests) {
    paintForestPatch(ctx, f.cx, f.cy, f.rx, f.ry, f.density);
  }
}

function paintForestPatch(ctx, cx, cy, rx, ry, density) {
  // 在椭圆内随机撒树冠圆
  const treeCount = Math.floor((rx * ry) / 400 * density);
  ctx.fillStyle = '#4a7a38';

  for (let i = 0; i < treeCount; i++) {
    const angle = srand(i, 0, 1) * Math.PI * 2;
    const dist = Math.sqrt(srand(i, 1, 2)) * 1.0; // sqrt 让分布均匀
    const px = cx + Math.cos(angle) * rx * dist;
    const py = cy + Math.sin(angle) * ry * dist;
    const sz = 2 + srand(i, 2, 3) * 3;

    // 树冠影
    ctx.fillStyle = 'rgba(30,60,24,0.5)';
    ctx.beginPath();
    ctx.arc(px + 0.8, py + 0.8, sz, 0, Math.PI * 2);
    ctx.fill();

    // 树冠主体
    ctx.fillStyle = 'rgba(60,110,46,0.6)';
    ctx.beginPath();
    ctx.arc(px, py, sz, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ============================================================
//  5. 河流——贝塞尔曲线 + 多层半透明渐变
// ============================================================

function paintRivers(ctx) {
  const yellow = [
    { x: 250, y: 420 },
    { x: 400, y: 430 },
    { x: 600, y: 450 },
    { x: 800, y: 500 },
    { x: 950, y: 560 },
    { x: 1100, y: 620 },
    { x: 1200, y: 660 },
    { x: 1350, y: 640 },
    { x: 1500, y: 580 },
    { x: 1650, y: 520 },
    { x: 1850, y: 470 },
    { x: 2100, y: 440 },
    { x: 2300, y: 420 },
  ];

  const yangtze = [
    { x: 120, y: 1100 },
    { x: 250, y: 1100 },
    { x: 400, y: 1110 },
    { x: 550, y: 1130 },
    { x: 700, y: 1120 },
    { x: 850, y: 1140 },
    { x: 1000, y: 1160 },
    { x: 1150, y: 1150 },
    { x: 1300, y: 1130 },
    { x: 1450, y: 1140 },
    { x: 1600, y: 1170 },
    { x: 1800, y: 1200 },
    { x: 2000, y: 1220 },
    { x: 2200, y: 1230 },
    { x: 2350, y: 1240 },
  ];

  paintRiver(ctx, yellow, '#5a90b8', 10);
  paintRiver(ctx, yangtze, '#5a98c0', 11);
}

/**
 * 画一条河：先画粗的深色底边，再画稍细的亮色河面。
 * 生活类比：先画河岸阴影，再画河水本身。
 */
function paintRiver(ctx, points, color, width) {
  if (points.length < 2) return;

  // 平滑路径
  const path = smoothPath(points);

  // 河岸阴影（比河面宽、颜色深）
  ctx.save();
  ctx.strokeStyle = 'rgba(40,60,50,0.3)';
  ctx.lineWidth = width + 6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  for (let i = 1; i < path.length - 2; i += 3) {
    const cp1 = path[i];
    const cp2 = path[i + 1];
    const end = path[i + 2];
    ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, end.x, end.y);
  }
  ctx.stroke();
  ctx.restore();

  // 河面主体
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  for (let i = 1; i < path.length - 2; i += 3) {
    const cp1 = path[i];
    const cp2 = path[i + 1];
    const end = path[i + 2];
    ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, end.x, end.y);
  }
  ctx.stroke();
  ctx.restore();

  // 河面高光（河中间偏亮的一条细线）
  ctx.save();
  ctx.strokeStyle = 'rgba(180,210,230,0.25)';
  ctx.lineWidth = width * 0.35;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  for (let i = 1; i < path.length - 2; i += 3) {
    const cp1 = path[i];
    const cp2 = path[i + 1];
    const end = path[i + 2];
    ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, end.x, end.y);
  }
  ctx.stroke();
  ctx.restore();
}

/** 在原始控制点之间插值出平滑曲线（Catmull-Rom 风格） */
function smoothPath(pts) {
  if (pts.length < 3) return pts;
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];

    out.push(p1);
    // 在两个点之间插 3 个贝塞尔控制点
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    out.push({ x: cp1x, y: cp1y });
    out.push({ x: cp2x, y: cp2y });
    out.push(p2);
  }
  return out;
}

// ============================================================
//  6. 纸纹理噪点（最终层）
// ============================================================

function addPaperTexture(ctx) {
  const imageData = ctx.getImageData(0, 0, MAP_W, MAP_H);
  const data = imageData.data;

  for (let y = 0; y < MAP_H; y += 2) {
    for (let x = 0; x < MAP_W; x += 2) {
      const i = (y * MAP_W + x) * 4;
      const noise = (Math.random() - 0.5) * 6; // ±3 颜色抖动
      data[i] = Math.max(0, Math.min(255, data[i] + noise));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

// ============================================================
//  路径几何工具
// ============================================================

function pathLength(points) {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    len += Math.sqrt(dx * dx + dy * dy);
  }
  return len;
}

function pointOnPath(points, t) {
  if (points.length === 1) return points[0];
  const total = pathLength(points);
  let target = t * total;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    const seg = Math.sqrt(dx * dx + dy * dy);
    if (target <= seg) {
      const f = target / seg;
      return {
        x: points[i - 1].x + dx * f,
        y: points[i - 1].y + dy * f,
      };
    }
    target -= seg;
  }
  return points[points.length - 1];
}
