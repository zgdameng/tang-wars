/**
 * 三国志风格地图大图生成器 v2。
 *
 * 改进：更饱和的色彩、更清晰的边界、地面细节纹理、密集山脉森林。
 */

export const MAP_W = 2400;
export const MAP_H = 2000;
export const CELL_W = MAP_W / 30; // 80
export const CELL_H = MAP_H / 30; // ≈66.67

export function gridToPixel(col, row) {
  return {
    x: Math.round(col * CELL_W + CELL_W / 2),
    y: Math.round(row * CELL_H + CELL_H / 2),
  };
}

// ============= 工具 =============

function srand(col, row, salt) {
  let h = ((col * 374761393 + row * 668265263 + salt * 1274126177) >>> 0);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = Math.imul(h ^ (h >>> 16), 1);
  return (h >>> 0) / 4294967296;
}

function hash(x, y) {
  let h = ((x * 374761393 + y * 668265263 + 1274126177) >>> 0);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = Math.imul(h ^ (h >>> 16), 1);
  return (h >>> 0) / 4294967296;
}

// ============= 主入口 =============

export function generateMapBitmap() {
  const canvas = document.createElement('canvas');
  canvas.width = MAP_W;
  canvas.height = MAP_H;
  const ctx = canvas.getContext('2d');

  // 1. 深海底色 → 陆地椭圆
  paintBase(ctx);

  // 2. 地形色块（更饱和、边界更清晰）
  paintTerrain(ctx);

  // 3. 地面细节——在整张地图上撒地形相应的纹理点
  paintGroundDetail(ctx);

  // 4. 山脉峰群（更密）
  paintMountainRidges(ctx);

  // 5. 森林（更多区域、更密）
  paintForests(ctx);

  // 6. 河流
  paintRivers(ctx);

  return canvas;
}

// ============================================================
//  1. 基底——深海 + 陆地椭圆
// ============================================================

function paintBase(ctx) {
  // 深海
  ctx.fillStyle = '#306898';
  ctx.fillRect(0, 0, MAP_W, MAP_H);

  // 近海浅水区
  const shallow = ctx.createRadialGradient(1300, 1100, 300, 1300, 1100, 1700);
  shallow.addColorStop(0, '#6098b8');
  shallow.addColorStop(1, '#306898');
  ctx.fillStyle = shallow;
  ctx.fillRect(0, 0, MAP_W, MAP_H);

  // 陆地主体（暖黄大地色）
  const land = ctx.createRadialGradient(1200, 1000, 100, 1200, 1000, 1450);
  land.addColorStop(0, '#ece0c0');
  land.addColorStop(0.88, '#d8c898');
  land.addColorStop(1, '#6098b8');
  ctx.fillStyle = land;
  ctx.fillRect(0, 0, MAP_W, MAP_H);
}

// ============================================================
//  2. 地形——饱和色块 + 锐利边界
// ============================================================

function paintTerrain(ctx) {
  // 青藏高原（西，灰白雪山）
  blobLayer(ctx, [
    { cx: 60, cy: 600, rx: 300, ry: 1000 },
    { cx: 180, cy: 300, rx: 250, ry: 500 },
    { cx: 150, cy: 1500, rx: 220, ry: 400 },
    { cx: 250, cy: 1000, rx: 280, ry: 600 },
  ], '#c8c0a8', 0.92, 80, 12);

  // 西部山区（秦岭大巴山，褐棕色）
  blobLayer(ctx, [
    { cx: 380, cy: 550, rx: 350, ry: 500 },
    { cx: 420, cy: 1050, rx: 300, ry: 420 },
    { cx: 320, cy: 800, rx: 330, ry: 550 },
    { cx: 500, cy: 750, rx: 200, ry: 300 },
  ], '#b89870', 0.88, 90, 14);

  // 关中平原（山区中的绿洲）
  blobLayer(ctx, [
    { cx: 500, cy: 640, rx: 180, ry: 130 },
    { cx: 480, cy: 690, rx: 150, ry: 110 },
    { cx: 530, cy: 660, rx: 130, ry: 100 },
  ], '#c8d870', 0.85, 50, 8);

  // 四川盆地
  blobLayer(ctx, [
    { cx: 220, cy: 1080, rx: 200, ry: 160 },
    { cx: 260, cy: 1030, rx: 170, ry: 140 },
    { cx: 190, cy: 1120, rx: 160, ry: 130 },
  ], '#b8c868', 0.82, 40, 6);

  // 北方草原（黄绿）
  blobLayer(ctx, [
    { cx: 700, cy: 80, rx: 850, ry: 200 },
    { cx: 1400, cy: 100, rx: 700, ry: 190 },
    { cx: 350, cy: 150, rx: 450, ry: 170 },
  ], '#c8c868', 0.85, 70, 10);

  // 华北平原
  blobLayer(ctx, [
    { cx: 950, cy: 480, rx: 550, ry: 280 },
    { cx: 1350, cy: 520, rx: 480, ry: 270 },
    { cx: 700, cy: 560, rx: 380, ry: 250 },
    { cx: 1100, cy: 600, rx: 450, ry: 260 },
  ], '#90c058', 0.88, 80, 12);

  // 中原
  blobLayer(ctx, [
    { cx: 1050, cy: 720, rx: 480, ry: 280 },
    { cx: 1350, cy: 780, rx: 420, ry: 270 },
    { cx: 850, cy: 800, rx: 350, ry: 240 },
    { cx: 1200, cy: 850, rx: 400, ry: 250 },
  ], '#80b848', 0.85, 70, 10);

  // 江南水乡（东部沿海，亮绿）
  blobLayer(ctx, [
    { cx: 1700, cy: 880, rx: 430, ry: 340 },
    { cx: 1900, cy: 1080, rx: 390, ry: 300 },
    { cx: 1600, cy: 1150, rx: 350, ry: 280 },
    { cx: 1750, cy: 1000, rx: 400, ry: 310 },
  ], '#78b840', 0.83, 70, 10);

  // 江南丘陵
  blobLayer(ctx, [
    { cx: 1000, cy: 1280, rx: 480, ry: 280 },
    { cx: 1400, cy: 1350, rx: 430, ry: 270 },
    { cx: 700, cy: 1350, rx: 390, ry: 250 },
    { cx: 1200, cy: 1400, rx: 400, ry: 250 },
  ], '#68a838', 0.84, 75, 11);

  // 岭南
  blobLayer(ctx, [
    { cx: 750, cy: 1750, rx: 580, ry: 240 },
    { cx: 1200, cy: 1780, rx: 480, ry: 220 },
    { cx: 450, cy: 1700, rx: 380, ry: 200 },
  ], '#509830', 0.85, 60, 8);
}

/**
 * 画一组色块——渐变短，颜色在 85% 半径内保持，只在边缘淡出。
 */
function blobLayer(ctx, blobs, color, alpha, scatter, edgeCount) {
  ctx.save();
  ctx.globalAlpha = alpha;

  for (const b of blobs) {
    const maxR = Math.max(b.rx, b.ry);
    const grad = ctx.createRadialGradient(b.cx, b.cy, maxR * 0.15, b.cx, b.cy, maxR);
    grad.addColorStop(0, color);
    grad.addColorStop(0.8, color);          // 80% 半径内保持纯色
    grad.addColorStop(0.95, color);
    grad.addColorStop(1, 'transparent');    // 只在最外缘淡出
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(b.cx, b.cy, b.rx, b.ry, 0, 0, Math.PI * 2);
    ctx.fill();

    // 周围散布小圆，模拟不规则边界
    for (let i = 0; i < edgeCount; i++) {
      const angle = (i / edgeCount) * Math.PI * 2 + (b.cx % 1.5);
      const dist = scatter * (0.5 + (i % 3) * 0.25);
      const sx = b.cx + Math.cos(angle) * dist;
      const sy = b.cy + Math.sin(angle) * dist;
      const sr = 12 + (i * 11) % 18;
      const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
      sg.addColorStop(0, color);
      sg.addColorStop(0.6, color);
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
//  3. 地面细节——在整个地图上按格撒纹理点
// ============================================================

/** 大概判断某像素位置属于哪种地形（和 paintTerrain 的逻辑大致对应） */
function getTerrainType(px, py) {
  // 极西 → 雪山
  if (px < 250) return 'snow';
  // 西部 → 山地
  if (px < 650 && !(px > 180 && px < 380 && py > 1000 && py < 1250) && !(px > 400 && px < 600 && py > 560 && py < 780)) return 'mountain';
  // 北方草原
  if (py < 280 && px > 300) return 'steppe';
  // 四川盆地
  if (px > 120 && px < 380 && py > 950 && py < 1200) return 'plain';
  // 关中平原
  if (px > 380 && px < 600 && py > 560 && py < 780) return 'plain';
  // 江南水乡
  if (px > 1500 && py > 750 && py < 1350) return 'farmland';
  // 江南丘陵
  if (py > 1200 && py < 1650 && px > 600) return 'hill';
  // 岭南
  if (py > 1650) return 'hill';
  // 华北/中原 → 平原
  if (py > 280 && py < 1200 && px > 500) return 'plain';
  // 默认
  return 'plain';
}

function paintGroundDetail(ctx) {
  // 用 20px 间隔的网格扫一遍，每个格点撒一个地形相关的小圆
  const step = 18;
  for (let y = 0; y < MAP_H; y += step) {
    for (let x = 0; x < MAP_W; x += step) {
      const terrain = getTerrainType(x, y);
      const h = hash(x, y);
      const ox = (hash(x + 99, y) - 0.5) * step;
      const oy = (hash(x, y + 99) - 0.5) * step;
      const px = x + ox;
      const py = y + oy;

      switch (terrain) {
        case 'plain':
          // 浅绿草斑
          ctx.fillStyle = `rgba(${70 + h * 40}, ${150 + h * 40}, ${50 + h * 30}, 0.25)`;
          ctx.beginPath();
          ctx.arc(px, py, 1.5 + h * 2.5, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'farmland':
          // 更亮的绿斑 + 偶尔小黄点（庄稼/花）
          ctx.fillStyle = `rgba(${100 + h * 40}, ${170 + h * 30}, ${60 + h * 30}, 0.22)`;
          ctx.beginPath();
          ctx.arc(px, py, 1.5 + h * 2, 0, Math.PI * 2);
          ctx.fill();
          if (h > 0.75) {
            ctx.fillStyle = 'rgba(220,210,100,0.3)';
            ctx.beginPath();
            ctx.arc(px, py, 0.8, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        case 'hill':
          // 深绿树丛小点
          ctx.fillStyle = 'rgba(40,100,30,0.28)';
          ctx.beginPath();
          ctx.arc(px, py, 1.8 + h * 3, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'mountain':
          // 褐灰岩点
          ctx.fillStyle = `rgba(${140 + h * 30}, ${120 + h * 25}, ${90 + h * 20}, 0.3)`;
          ctx.beginPath();
          ctx.arc(px, py, 1.2 + h * 2, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'snow':
          // 白灰斑
          ctx.fillStyle = `rgba(220,215,200,0.25)`;
          ctx.beginPath();
          ctx.arc(px, py, 1 + h * 2, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'steppe':
          // 枯黄草斑
          ctx.fillStyle = `rgba(${170 + h * 30}, ${170 + h * 25}, ${90 + h * 20}, 0.28)`;
          ctx.beginPath();
          ctx.arc(px, py, 1.5 + h * 2.5, 0, Math.PI * 2);
          ctx.fill();
          break;
      }
    }
  }
}

// ============================================================
//  4. 山脉——更多脊线、更密峰群
// ============================================================

function paintMountainRidges(ctx) {
  const ranges = [
    // 青藏高原东缘
    [{ x: 40, y: 100 }, { x: 70, y: 400 }, { x: 100, y: 700 }, { x: 130, y: 1000 }, { x: 160, y: 1300 }, { x: 190, y: 1550 }, { x: 220, y: 1700 }],
    // 青藏高原第二道
    [{ x: 100, y: 150 }, { x: 140, y: 450 }, { x: 170, y: 750 }, { x: 200, y: 1050 }, { x: 230, y: 1350 }, { x: 260, y: 1600 }],
    // 秦岭主脉
    [{ x: 180, y: 560 }, { x: 320, y: 540 }, { x: 460, y: 520 }, { x: 600, y: 500 }, { x: 720, y: 530 }],
    // 秦岭副脉
    [{ x: 160, y: 620 }, { x: 300, y: 600 }, { x: 440, y: 580 }, { x: 580, y: 560 }, { x: 700, y: 580 }],
    // 大巴山
    [{ x: 170, y: 820 }, { x: 300, y: 790 }, { x: 440, y: 770 }, { x: 570, y: 750 }, { x: 660, y: 780 }],
    // 太行山
    [{ x: 620, y: 280 }, { x: 660, y: 420 }, { x: 690, y: 560 }, { x: 670, y: 700 }],
    // 太行山副
    [{ x: 660, y: 300 }, { x: 700, y: 440 }, { x: 720, y: 570 }, { x: 700, y: 680 }],
    // 南岭
    [{ x: 280, y: 1480 }, { x: 550, y: 1460 }, { x: 850, y: 1480 }, { x: 1150, y: 1500 }, { x: 1450, y: 1520 }],
    // 武夷山/浙闽
    [{ x: 1550, y: 1280 }, { x: 1650, y: 1430 }, { x: 1700, y: 1580 }, { x: 1650, y: 1720 }],
    // 巫山/雪峰山
    [{ x: 380, y: 920 }, { x: 480, y: 970 }, { x: 580, y: 1020 }, { x: 680, y: 1070 }],
    // 大娄山
    [{ x: 350, y: 1100 }, { x: 450, y: 1140 }, { x: 550, y: 1180 }, { x: 650, y: 1200 }],
  ];

  for (const ridge of ranges) {
    paintRidge(ctx, ridge);
  }
}

function paintRidge(ctx, points) {
  if (points.length < 2) return;

  // 山基底阴影
  ctx.save();
  ctx.strokeStyle = 'rgba(80,65,42,0.22)';
  ctx.lineWidth = 45;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.stroke();
  ctx.restore();

  const totalLen = pathLength(points);
  const spacing = 22;
  const count = Math.floor(totalLen / spacing);

  for (let i = 0; i < count; i++) {
    const t = i / count;
    const pt = pointOnPath(points, t);
    // 山峰散开一些模拟双排峰
    const ox = Math.sin(i * 3.7) * 20 + Math.cos(i * 1.3) * 10;
    const oy = Math.cos(i * 2.9) * 16 + Math.sin(i * 2.1) * 10;
    const px = pt.x + ox;
    const py = pt.y + oy;
    const sz = 4 + (i % 4) * 2.5 + Math.abs(Math.sin(i * 1.3)) * 5;

    // 峰体暗面
    ctx.fillStyle = '#6a5840';
    ctx.beginPath();
    ctx.moveTo(px, py - sz);
    ctx.lineTo(px + sz * 0.55, py + sz * 0.3);
    ctx.lineTo(px - sz * 0.55, py + sz * 0.3);
    ctx.closePath();
    ctx.fill();

    // 峰体亮面（左上光）
    ctx.fillStyle = '#b09870';
    ctx.beginPath();
    ctx.moveTo(px, py - sz);
    ctx.lineTo(px - sz * 0.2, py - sz * 0.1);
    ctx.lineTo(px - sz * 0.55, py + sz * 0.3);
    ctx.closePath();
    ctx.fill();
  }
}

// ============================================================
//  5. 森林——更多、更密
// ============================================================

function paintForests(ctx) {
  const forests = [
    { cx: 1500, cy: 1380, rx: 280, ry: 200, density: 0.6 },
    { cx: 900, cy: 1480, rx: 320, ry: 220, density: 0.55 },
    { cx: 500, cy: 1380, rx: 220, ry: 280, density: 0.5 },
    { cx: 1700, cy: 1580, rx: 220, ry: 180, density: 0.6 },
    { cx: 600, cy: 880, rx: 180, ry: 220, density: 0.45 },
    { cx: 1100, cy: 1680, rx: 320, ry: 200, density: 0.5 },
    { cx: 700, cy: 1200, rx: 200, ry: 180, density: 0.4 },
    { cx: 1300, cy: 1300, rx: 200, ry: 160, density: 0.45 },
    { cx: 1800, cy: 1250, rx: 180, ry: 150, density: 0.5 },
    { cx: 400, cy: 1450, rx: 160, ry: 180, density: 0.4 },
  ];

  for (const f of forests) {
    paintForestPatch(ctx, f.cx, f.cy, f.rx, f.ry, f.density);
  }
}

function paintForestPatch(ctx, cx, cy, rx, ry, density) {
  const treeCount = Math.floor((rx * ry) / 300 * density);

  for (let i = 0; i < treeCount; i++) {
    const angle = srand(i, 0, Math.floor(cx + cy)) * Math.PI * 2;
    const dist = Math.sqrt(srand(i, 1, Math.floor(cx))) * 1.0;
    const px = cx + Math.cos(angle) * rx * dist;
    const py = cy + Math.sin(angle) * ry * dist;
    const sz = 1.8 + srand(i, 2, Math.floor(cy)) * 3.5;

    // 树影
    ctx.fillStyle = 'rgba(25,50,20,0.55)';
    ctx.beginPath();
    ctx.arc(px + 0.7, py + 0.7, sz, 0, Math.PI * 2);
    ctx.fill();

    // 树冠（两种绿混合）
    const green = srand(i, 3, 77) > 0.5 ? 'rgba(55,105,42,0.65)' : 'rgba(40,90,32,0.65)';
    ctx.fillStyle = green;
    ctx.beginPath();
    ctx.arc(px, py, sz, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ============================================================
//  6. 河流
// ============================================================

function paintRivers(ctx) {
  const yellow = [
    { x: 240, y: 400 }, { x: 400, y: 410 }, { x: 600, y: 430 },
    { x: 800, y: 480 }, { x: 950, y: 540 }, { x: 1100, y: 600 },
    { x: 1200, y: 640 }, { x: 1350, y: 620 }, { x: 1500, y: 560 },
    { x: 1650, y: 500 }, { x: 1850, y: 450 }, { x: 2100, y: 420 },
    { x: 2350, y: 410 },
  ];

  const yangtze = [
    { x: 100, y: 1080 }, { x: 250, y: 1080 }, { x: 400, y: 1090 },
    { x: 550, y: 1110 }, { x: 700, y: 1100 }, { x: 850, y: 1120 },
    { x: 1000, y: 1140 }, { x: 1150, y: 1130 }, { x: 1300, y: 1110 },
    { x: 1450, y: 1120 }, { x: 1600, y: 1150 }, { x: 1800, y: 1180 },
    { x: 2000, y: 1200 }, { x: 2200, y: 1210 }, { x: 2380, y: 1220 },
  ];

  paintRiver(ctx, yellow, '#4890c0', 12);
  paintRiver(ctx, yangtze, '#48a0c8', 13);
}

function paintRiver(ctx, points, color, width) {
  if (points.length < 2) return;
  const path = smoothPath(points);

  // 河岸暗影
  ctx.save();
  ctx.strokeStyle = 'rgba(30,40,50,0.35)';
  ctx.lineWidth = width + 8;
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
  ctx.globalAlpha = 0.75;
  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  for (let i = 1; i < path.length - 2; i += 3) {
    ctx.bezierCurveTo(path[i].x, path[i].y, path[i + 1].x, path[i + 1].y, path[i + 2].x, path[i + 2].y);
  }
  ctx.stroke();
  ctx.restore();

  // 河面高光
  ctx.save();
  ctx.strokeStyle = 'rgba(170,220,240,0.3)';
  ctx.lineWidth = width * 0.3;
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

function smoothPath(pts) {
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
//  路径工具
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
      const f = seg > 0 ? target / seg : 0;
      return { x: points[i - 1].x + dx * f, y: points[i - 1].y + dy * f };
    }
    target -= seg;
  }
  return points[points.length - 1];
}
