import Phaser from 'phaser';
import { CONFIG } from '../config.js';

/**
 * 把网格坐标 (col, row) 转成屏幕坐标 (x, y)。
 *
 * 生活类比：就像把一张平铺的地图斜着放，让它是菱形格（等距视角）。
 * 同列往右上走，同行往右下走，叠加形成菱形。
 */
export function gridToScreen(col, row) {
  const x = (col - row) * (CONFIG.TILE_WIDTH / 2);
  const y = (col + row) * (CONFIG.TILE_HEIGHT / 2);
  return { x, y };
}

/**
 * 反过来：屏幕点击位置 → 网格坐标。
 */
export function screenToGrid(screenX, screenY) {
  const col = (screenX / (CONFIG.TILE_WIDTH / 2) + screenY / (CONFIG.TILE_HEIGHT / 2)) / 2;
  const row = (screenY / (CONFIG.TILE_HEIGHT / 2) - screenX / (CONFIG.TILE_WIDTH / 2)) / 2;
  return { col: Math.round(col), row: Math.round(row) };
}

/**
 * 在 Phaser 场景中绘制整张等距地图。
 * 第四期：立体菱形格 + 纹理斑驳 + 地形装饰（山峰、树丛、波纹、田垄）。
 *
 * @param {Phaser.Scene} scene
 * @param {{ cols: number, rows: number, tiles: Array }} mapData
 * @returns {Phaser.GameObjects.Graphics}
 */
export function drawIsoMap(scene, mapData) {
  const graphics = scene.add.graphics();
  const { cols, rows, tiles } = mapData;

  // 从后往前画：先画远处（上排），再画近处（下排），近的挡住远的
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const { x, y } = gridToScreen(col, row);
      const tile = (tiles[row] && tiles[row][col])
        ? tiles[row][col]
        : { type: 'plain', color: 0x2d5a1e, height: 2 };
      drawIsoTile3D(graphics, x, y, tile.color, tile.height || 0, tile.type, col, row);
    }
  }
  return graphics;
}

// ============================================================
//  工具函数
// ============================================================

/**
 * 确定性伪随机数（给定格子坐标和盐值，永远返回同一个 0~1 小数）。
 * 生活类比：像身份证号，同一个 col+row+salt 查出来永远是同一个值。
 * 这样每次重画时纹理不变，不会一闪一闪。
 */
function seededRand(col, row, salt) {
  let h = ((col * 374761393 + row * 668265263 + salt * 1274126177) >>> 0);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = Math.imul(h ^ (h >>> 16), 1);
  return (h >>> 0) / 4294967296;
}

/** 判断 (px,py) 是否在菱形格子内。留 2% 边距防止画出边界。 */
function inDiamond(px, py, cx, cy, hw, hh) {
  return Math.abs(px - cx) / hw + Math.abs(py - cy) / hh <= 0.98;
}

/** 把颜色整体调亮或调暗一点（delta 正=亮，负=暗），RGB 三通道同步。 */
function tintColor(base, delta) {
  const r = Math.max(0, Math.min(255, ((base >> 16) & 0xff) + delta));
  const g = Math.max(0, Math.min(255, ((base >> 8) & 0xff) + delta));
  const b = Math.max(0, Math.min(255, (base & 0xff) + delta));
  return (r << 16) | (g << 8) | b;
}

// ============================================================
//  核心绘制：一个立体菱形格
// ============================================================

/**
 * 画一个立体菱形格——侧面（3D）+ 顶面纹理 + 地形装饰。
 *
 * @param {Phaser.GameObjects.Graphics} g
 * @param {number} cx - 格子中心 X（屏幕坐标）
 * @param {number} cy - 格子中心 Y（屏幕坐标，地面层）
 * @param {number} color - 顶面基础色（十六进制整数）
 * @param {number} height - 立体高度（像素），山≈10 平原≈2 河≈0
 * @param {string} type - 地形类型（plain/mountain/hill/water/snow/steppe/farmland）
 * @param {number} col - 网格列号（用于纹理随机种子）
 * @param {number} row - 网格行号
 */
function drawIsoTile3D(g, cx, cy, color, height, type, col, row) {
  const hw = CONFIG.TILE_WIDTH / 2;   // 半宽
  const hh = CONFIG.TILE_HEIGHT / 2;  // 半高

  // --- 侧面（3D 效果）---
  if (height > 0) {
    const r = (color >> 16) & 0xff;
    const gv = (color >> 8) & 0xff;
    const b = color & 0xff;
    const leftColor = (Math.floor(r * 0.4) << 16) | (Math.floor(gv * 0.4) << 8) | Math.floor(b * 0.4);
    const rightColor = (Math.floor(r * 0.55) << 16) | (Math.floor(gv * 0.55) << 8) | Math.floor(b * 0.55);

    const topY = cy - height;

    // 左侧面
    g.fillStyle(leftColor, 1);
    g.beginPath();
    g.moveTo(cx - hw, topY);
    g.lineTo(cx, topY + hh);
    g.lineTo(cx, cy + hh);
    g.lineTo(cx - hw, cy);
    g.closePath();
    g.fillPath();

    // 右侧面
    g.fillStyle(rightColor, 1);
    g.beginPath();
    g.moveTo(cx + hw, topY);
    g.lineTo(cx, topY + hh);
    g.lineTo(cx, cy + hh);
    g.lineTo(cx + hw, cy);
    g.closePath();
    g.fillPath();
  }

  const faceY = height > 0 ? cy - height : cy;

  // --- 顶面（底色 + 纹理 + 装饰）---
  drawTopFace(g, cx, faceY, hw, hh, color, type, col, row);

  // --- 边框（半透明黑线，轻轻勾勒格线）---
  g.lineStyle(1, 0x000000, 0.12);
  g.beginPath();
  g.moveTo(cx, faceY - hh);
  g.lineTo(cx + hw, faceY);
  g.lineTo(cx, faceY + hh);
  g.lineTo(cx - hw, faceY);
  g.closePath();
  g.strokePath();
}

// ============================================================
//  顶面绘制：底色 → 斑驳纹理 → 地形装饰
// ============================================================

function drawTopFace(g, cx, cy, hw, hh, baseColor, type, col, row) {
  // 用 (col, row) 做种子的确定性随机——同一格永远同一纹理
  const r = (salt) => seededRand(col, row, salt);

  // 1) 纯色底
  g.fillStyle(baseColor, 1);
  g.fillDiamond(cx, cy, hw, hh);

  // 2) 斑驳纹理——在菱形内撒大小不一的色斑
  const dotCount = (type === 'water') ? 6 : (type === 'snow') ? 8 : 14;
  for (let i = 0; i < dotCount; i++) {
    const s = i * 3;
    const px = cx + (r(s) - 0.5) * hw * 1.9;
    const py = cy + (r(s + 1) - 0.5) * hh * 1.9;
    if (!inDiamond(px, py, cx, cy, hw, hh)) continue;

    const delta = Math.floor((r(s + 100) - 0.5) * 28); // ±14 颜色偏移
    const dotColor = tintColor(baseColor, delta);
    const size = 0.8 + r(s + 200) * 1.6;
    g.fillStyle(dotColor, 0.45);
    g.fillCircle(px, py, size);
  }

  // 3) 地形专属装饰
  switch (type) {
    case 'mountain': decorateMountain(g, cx, cy, hw, hh, baseColor, r); break;
    case 'snow':     decorateSnow(g, cx, cy, hw, hh, r); break;
    case 'hill':     decorateTrees(g, cx, cy, hw, hh, r, 4); break;
    case 'plain':    decorateTrees(g, cx, cy, hw, hh, r, 1); break;
    case 'farmland': decorateFarmland(g, cx, cy, hw, hh, baseColor, r); break;
    case 'steppe':   decorateSteppe(g, cx, cy, hw, hh, baseColor, r); break;
    case 'water':    decorateWater(g, cx, cy, hw, hh, baseColor, r); break;
  }
}

// ============================================================
//  各类型地形装饰
// ============================================================

/** 山地：在顶面画 1~3 个灰色小三角，模拟山峰凸起 */
function decorateMountain(g, cx, cy, hw, hh, baseColor, r) {
  const peakColor = tintColor(baseColor, -30); // 比山体更暗一点
  const count = 1 + Math.floor(r(400) * 2);    // 1~2 个峰
  for (let i = 0; i < count; i++) {
    const s = i * 4;
    const px = cx + (r(401 + s) - 0.5) * hw * 1.2;
    const py = cy + (r(402 + s) - 0.7) * hh * 1.1; // 偏上半部
    if (!inDiamond(px, py, cx, cy, hw, hh)) continue;

    const sz = 2.5 + r(403 + s) * 2.5; // 峰的大小
    g.fillStyle(peakColor, 0.65);
    g.beginPath();
    g.moveTo(px, py - sz);               // 尖顶
    g.lineTo(px + sz * 0.55, py + sz * 0.35);
    g.lineTo(px - sz * 0.55, py + sz * 0.35);
    g.closePath();
    g.fillPath();

    // 小阴影：峰右侧加条暗线
    g.lineStyle(0.6, 0x000000, 0.2);
    g.beginPath();
    g.moveTo(px, py - sz);
    g.lineTo(px + sz * 0.3, py + sz * 0.2);
    g.strokePath();
  }
}

/** 雪地：几颗白色十字亮星，模拟雪地反光 */
function decorateSnow(g, cx, cy, hw, hh, r) {
  for (let i = 0; i < 4; i++) {
    const s = i * 3;
    const px = cx + (r(500 + s) - 0.5) * hw * 1.3;
    const py = cy + (r(501 + s) - 0.5) * hh * 1.3;
    if (!inDiamond(px, py, cx, cy, hw, hh)) continue;

    g.fillStyle(0xffffff, 0.5);
    g.fillRect(px - 1.5, py - 0.3, 3, 0.6);
    g.fillRect(px - 0.3, py - 1.5, 0.6, 3);
  }
}

/** 森林/平原：深绿色小圆点代表树冠（山丘多、平原少） */
function decorateTrees(g, cx, cy, hw, hh, r, count) {
  for (let i = 0; i < count; i++) {
    const s = i * 3;
    const px = cx + (r(600 + s) - 0.5) * hw * 1.5;
    const py = cy + (r(601 + s) - 0.5) * hh * 1.5;
    if (!inDiamond(px, py, cx, cy, hw, hh)) continue;

    const sz = 1.8 + r(602 + s) * 1.8;
    // 树冠阴影
    g.fillStyle(0x0a3a0a, 0.35);
    g.fillCircle(px + 0.6, py + 0.6, sz);
    // 树冠主体
    g.fillStyle(0x1a5a1a, 0.55);
    g.fillCircle(px, py, sz);
  }
}

/** 农田：浅色横线模拟田垄 */
function decorateFarmland(g, cx, cy, hw, hh, baseColor, r) {
  const lineColor = tintColor(baseColor, 18);
  for (let i = 0; i < 3; i++) {
    const yOff = (r(700 + i) - 0.5) * hh * 1.1;
    const y = cy + yOff;
    const maxHalfW = hw * (1 - Math.abs(yOff) / hh) * 0.65;
    if (maxHalfW < 3) continue;

    g.lineStyle(0.8, lineColor, 0.25);
    g.beginPath();
    g.moveTo(cx - maxHalfW, y);
    g.lineTo(cx + maxHalfW, y);
    g.strokePath();
  }
}

/** 草原：三五根深色小草簇 */
function decorateSteppe(g, cx, cy, hw, hh, baseColor, r) {
  const tuftColor = tintColor(baseColor, -12);
  for (let i = 0; i < 3; i++) {
    const sx = i * 5;
    const cx0 = cx + (r(800 + sx) - 0.5) * hw * 1.4;
    const cy0 = cy + (r(801 + sx) - 0.5) * hh * 1.4;
    if (!inDiamond(cx0, cy0, cx, cy, hw, hh)) continue;

    // 每簇 3 根小草：从中心向上方画小线段
    g.lineStyle(0.5, tuftColor, 0.4);
    for (let j = 0; j < 3; j++) {
      const angle = -1.2 + r(810 + i * 3 + j) * 0.8; // 大致朝上
      const len = 2 + r(820 + i * 3 + j) * 2;
      const ex = cx0 + Math.cos(angle) * len;
      const ey = cy0 + Math.sin(angle) * len;
      g.beginPath();
      g.moveTo(cx0, cy0);
      g.lineTo(ex, ey);
      g.strokePath();
    }
  }
}

/** 河流：浅蓝横波线 + 几点白沫 */
function decorateWater(g, cx, cy, hw, hh, baseColor, r) {
  const waveColor = tintColor(baseColor, 35);
  for (let i = 0; i < 3; i++) {
    const s = i * 3;
    const yBase = cy + (r(900 + s) - 0.5) * hh * 1.1;
    const maxHalfW = hw * (1 - Math.abs(yBase - cy) / hh) * 0.6;
    if (maxHalfW < 3) continue;

    // 画一条轻微波浪线
    const midY = yBase + (r(901 + s) - 0.5) * 2.5;
    g.lineStyle(0.7, waveColor, 0.3);
    g.beginPath();
    g.moveTo(cx - maxHalfW, yBase);
    g.lineTo(cx, midY);
    g.lineTo(cx + maxHalfW, yBase + (r(902 + s) - 0.5) * 2);
    g.strokePath();
  }

  // 几颗白沫点
  for (let i = 0; i < 2; i++) {
    const px = cx + (r(950 + i * 2) - 0.5) * hw * 1.3;
    const py = cy + (r(951 + i * 2) - 0.5) * hh * 1.3;
    if (!inDiamond(px, py, cx, cy, hw, hh)) continue;
    g.fillStyle(0xffffff, 0.25);
    g.fillCircle(px, py, 0.8);
  }
}

// ============================================================
//  Graphics 快捷方法：填充菱形
// ============================================================

/**
 * 给 Phaser Graphics 补一个 fillDiamond 方法。
 * 生活类比：就像 stamp 印章——给定中心和高宽，自动按菱形印上去。
 */
if (!Phaser.GameObjects.Graphics.prototype.fillDiamond) {
  Phaser.GameObjects.Graphics.prototype.fillDiamond = function (cx, cy, hw, hh) {
    this.beginPath();
    this.moveTo(cx, cy - hh);
    this.lineTo(cx + hw, cy);
    this.lineTo(cx, cy + hh);
    this.lineTo(cx - hw, cy);
    this.closePath();
    this.fillPath();
  };
}
