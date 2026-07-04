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
 * 第三期：立体菱形格——每个格有顶面 + 左右侧面，山高河低。
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
      drawIsoTile3D(graphics, x, y, tile.color, tile.height || 0);
    }
  }
  return graphics;
}

/**
 * 画一个立体菱形格。
 *
 * 生活类比：像一块方形积木，从斜上方看能看到顶面 + 左右两侧面。
 * 高度越大的格子（山）看起来越高，高度小的（河）像凹下去。
 *
 * 画法顺序：左侧面 → 右侧面 → 顶面 + 边框。
 *
 * @param {Phaser.GameObjects.Graphics} graphics
 * @param {number} cx - 格子中心 X（屏幕坐标）
 * @param {number} cy - 格子中心 Y（屏幕坐标，地面层）
 * @param {number} color - 顶面色（十六进制整数）
 * @param {number} height - 立体高度（像素），山≈10 平原≈2 河≈0
 */
function drawIsoTile3D(graphics, cx, cy, color, height) {
  const hw = CONFIG.TILE_WIDTH / 2;   // 半宽
  const hh = CONFIG.TILE_HEIGHT / 2;  // 半高

  if (height > 0) {
    // 用顶面色算出两个深色变体：左面暗、右面中暗
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;
    const leftColor = (Math.floor(r * 0.45) << 16) | (Math.floor(g * 0.45) << 8) | Math.floor(b * 0.45);
    const rightColor = (Math.floor(r * 0.6) << 16) | (Math.floor(g * 0.6) << 8) | Math.floor(b * 0.6);

    const topY = cy - height; // 顶面中心（往上移）

    // 左侧面：连接顶面左下 → 顶面底 → 地面底 → 地面左
    graphics.fillStyle(leftColor, 1);
    graphics.beginPath();
    graphics.moveTo(cx - hw, topY);      // 顶-左
    graphics.lineTo(cx, topY + hh);      // 顶-下
    graphics.lineTo(cx, cy + hh);        // 地-下
    graphics.lineTo(cx - hw, cy);        // 地-左
    graphics.closePath();
    graphics.fillPath();

    // 右侧面：连接顶面右上 → 顶面底 → 地面底 → 地面右
    graphics.fillStyle(rightColor, 1);
    graphics.beginPath();
    graphics.moveTo(cx + hw, topY);      // 顶-右
    graphics.lineTo(cx, topY + hh);      // 顶-下
    graphics.lineTo(cx, cy + hh);        // 地-下
    graphics.lineTo(cx + hw, cy);        // 地-右
    graphics.closePath();
    graphics.fillPath();
  }

  // 顶面（菱形）
  const faceY = height > 0 ? cy - height : cy;
  graphics.fillStyle(color, 1);
  graphics.beginPath();
  graphics.moveTo(cx, faceY - hh);       // 上
  graphics.lineTo(cx + hw, faceY);       // 右
  graphics.lineTo(cx, faceY + hh);       // 下
  graphics.lineTo(cx - hw, faceY);       // 左
  graphics.closePath();
  graphics.fillPath();

  // 边框
  graphics.lineStyle(1, 0x1a3a0e, 0.35);
  graphics.beginPath();
  graphics.moveTo(cx, faceY - hh);
  graphics.lineTo(cx + hw, faceY);
  graphics.lineTo(cx, faceY + hh);
  graphics.lineTo(cx - hw, faceY);
  graphics.closePath();
  graphics.strokePath();
}
