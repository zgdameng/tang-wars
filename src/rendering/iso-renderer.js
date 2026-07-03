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
 * 第一期用纯色菱形代替真实地形图。
 *
 * @param {Phaser.Scene} scene
 * @param {{ cols: number, rows: number, tiles: Array }} mapData
 * @returns {Phaser.GameObjects.Graphics}
 */
export function drawIsoMap(scene, mapData) {
  const graphics = scene.add.graphics();
  const { cols, rows, tiles } = mapData;

  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      const { x, y } = gridToScreen(col, row);
      const tile = (tiles[row] && tiles[row][col]) ? tiles[row][col] : { type: 'plain', color: 0x2d5a1e };
      drawIsoTile(graphics, x, y, tile.color);
    }
  }
  return graphics;
}

/**
 * 画一个菱形瓦片（菱形 = 四条边围起来的格子）。
 *   top
 *  /    \
 * left  right
 *  \    /
 *  bottom
 */
function drawIsoTile(graphics, cx, cy, color) {
  const hw = CONFIG.TILE_WIDTH / 2;   // 半宽
  const hh = CONFIG.TILE_HEIGHT / 2;  // 半高

  // 填色
  graphics.fillStyle(color, 1);
  graphics.beginPath();
  graphics.moveTo(cx, cy - hh);        // 顶
  graphics.lineTo(cx + hw, cy);        // 右
  graphics.lineTo(cx, cy + hh);        // 底
  graphics.lineTo(cx - hw, cy);        // 左
  graphics.closePath();
  graphics.fillPath();

  // 边框
  graphics.lineStyle(1, 0x1a3a0e, 0.5);
  graphics.beginPath();
  graphics.moveTo(cx, cy - hh);
  graphics.lineTo(cx + hw, cy);
  graphics.lineTo(cx, cy + hh);
  graphics.lineTo(cx - hw, cy);
  graphics.closePath();
  graphics.strokePath();
}
