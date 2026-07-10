import { gridToPixel } from './map-bitmap.js';

let containerEl = null;
const markers = []; // { cityId, el, circle }

/**
 * 在地图上创建城池标记——用 HTML DOM 做标签（完美中文），
 * Phaser 圆点做交互（点击检测）。
 *
 * @param {Phaser.Scene} scene
 * @param {object} cities
 * @param {object} factions
 */
export function createCityMarkers(scene, cities, factions) {
  // 创建标签容器（绝对定位，盖在游戏画布上）
  if (!containerEl) {
    containerEl = document.createElement('div');
    containerEl.id = 'city-labels';
    containerEl.style.cssText = `
      position: fixed; top: 0; left: 0;
      width: 100vw; height: 100vh;
      pointer-events: none; z-index: 100;
    `;
    document.body.appendChild(containerEl);
  }

  for (const city of Object.values(cities)) {
    const { x, y } = gridToPixel(city.x, city.y);
    const faction = factions[city.owner];
    const cityColor = faction ? colorToHex(faction.color) : '#888888';

    // 城池图标（城楼形状，Phaser Graphics 绘制）
    const gfx = scene.add.graphics();
    const fc = faction ? faction.color : 0x888888;
    _drawCastle(gfx, x, y - 4, fc);
    gfx.setDepth(10);
    // 交互区用透明矩形覆盖城楼（放大以匹配新图标）
    const hitZone = scene.add.rectangle(x, y - 8, 50, 36, 0x000000, 0);
    hitZone.setInteractive({ useHandCursor: true });
    hitZone.setDepth(11);
    hitZone.cityId = city.id;
    hitZone.on('pointerover', () => { gfx.clear(); _drawCastle(gfx, x, y - 4, 0xd4c5a0); });
    hitZone.on('pointerout',  () => { gfx.clear(); _drawCastle(gfx, x, y - 4, fc); });
    // 按下记录起点，抬手判断移动距离 < 8px 才算点击（避免拖拽地图时误触）
    hitZone.on('pointerdown', (pointer) => { hitZone._tapX = pointer.x; hitZone._tapY = pointer.y; });
    hitZone.on('pointerup', (pointer) => {
      const dx = pointer.x - (hitZone._tapX ?? pointer.x);
      const dy = pointer.y - (hitZone._tapY ?? pointer.y);
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) scene.events.emit('city-clicked', city.id);
    });
    // 把 hitZone 当作 circle 记录，方便 destroyCityMarkers 清理
    const circle = hitZone;
    circle._gfx = gfx;

    // 城池标签（DOM 元素，完美中文渲染）
    const el = document.createElement('div');
    el.textContent = city.name;
    el.style.cssText = `
      position: absolute;
      font-size: 14px; font-weight: bold; color: #3D2B1F;
      font-family: 'KaiTi', 'STKaiti', 'Microsoft YaHei', sans-serif;
      text-shadow: 0 0 3px #F0E8D8, 0 0 3px #F0E8D8, 1px 1px 1px #F0E8D8;
      transform: translate(-50%, -50%);
      white-space: nowrap;
      background: rgba(247,242,232,0.82);
      padding: 2px 6px; border-radius: 3px;
    `;
    containerEl.appendChild(el);

    markers.push({ cityId: city.id, el, circle, worldX: x, worldY: y - 26 });
  }
}

/**
 * 每次镜头移动后调用，更新所有标签的屏幕位置。
 * 必须在 Phaser 场景的 postrender 事件或 update() 中调用。
 *
 * 原理：不自己算坐标，而是用 Phaser 内置的 getWorldPoint 反推。
 * 这样保证 DOM 标签和 Phaser 画出来的东西永远对齐。
 *
 * @param {Phaser.Cameras.Scene2D.Camera} camera - scene.cameras.main
 */
export function updateCityLabelPositions(camera) {
  const canvas = document.querySelector('canvas');
  if (!canvas || markers.length === 0) return;
  const rect = canvas.getBoundingClientRect();

  // 用 Phaser 自己的坐标转换：取屏幕 (0,0) 和 (w,h) 在世界里的位置
  const tl = { x: 0, y: 0 };
  const br = { x: 0, y: 0 };
  camera.getWorldPoint(0, 0, tl);
  camera.getWorldPoint(camera.width, camera.height, br);

  const worldW = br.x - tl.x;  // 屏幕宽度对应多少世界单位
  const worldH = br.y - tl.y;  // 屏幕高度对应多少世界单位
  if (worldW === 0 || worldH === 0) return;

  // 画布内部分辨率 vs CSS 显示尺寸的比例（Phaser Scale.FIT 会缩放画布）
  const scaleX = rect.width / camera.width;
  const scaleY = rect.height / camera.height;

  for (const m of markers) {
    // 标签在世界中的位置，占屏幕宽高的比例
    const fx = (m.worldX - tl.x) / worldW;  // 0=左 1=右
    const fy = (m.worldY - tl.y) / worldH;  // 0=上 1=下

    // 比例 × 屏幕像素 = 最终 CSS 位置
    m.el.style.left = (rect.left + fx * rect.width) + 'px';
    m.el.style.top = (rect.top + fy * rect.height) + 'px';
  }
}

/** 清理 DOM 元素和 Phaser Graphics */
export function destroyCityMarkers() {
  if (containerEl && containerEl.parentNode) {
    containerEl.parentNode.removeChild(containerEl);
    containerEl = null;
  }
  for (const m of markers) {
    if (m.circle && m.circle._gfx) m.circle._gfx.destroy();
    if (m.circle && m.circle.destroy) m.circle.destroy();
  }
  markers.length = 0;
}

/** 把 Phaser 颜色整数转成 CSS 十六进制 */
function colorToHex(color) {
  return '#' + color.toString(16).padStart(6, '0');
}

/**
 * 3D 城楼图标——等角透视，带深度感
 * 主墙体 + 背墙偏移 + 顶面平行四边形 + 箭垛 + 角楼 + 城门拱
 */
function _drawCastle(gfx, cx, cy, color) {
  const W = 38, H = 20;   // 主墙宽高
  const D = 6;             // 3D 深度偏移量
  const x0 = Math.round(cx - W / 2);
  const y0 = Math.round(cy - H / 2) + 4; // 稍微往下，给顶面留空间

  // 颜色派生
  const r = (color >> 16) & 0xff, g = (color >> 8) & 0xff, b = color & 0xff;
  const darkC  = ((r * 0.45 | 0) << 16) | ((g * 0.45 | 0) << 8) | (b * 0.45 | 0);
  const lightC = (Math.min(255, r + 90) << 16) | (Math.min(255, g + 90) << 8) | Math.min(255, b + 90);

  // ── 1. 地面阴影
  gfx.fillStyle(0x000000, 0.28);
  gfx.fillEllipse(cx + 2, y0 + H + 2, W + 10, 6);

  // ── 2. 背墙（深色，偏移 D 像素）
  gfx.fillStyle(darkC, 1);
  gfx.fillRect(x0 + D, y0 - D, W, H);

  // ── 3. 右侧面（连接前后墙）
  gfx.fillStyle(darkC, 0.85);
  gfx.fillPoints([
    { x: x0 + W,     y: y0 },
    { x: x0 + W + D, y: y0 - D },
    { x: x0 + W + D, y: y0 - D + H },
    { x: x0 + W,     y: y0 + H }
  ], true);

  // ── 4. 顶面（浅色平行四边形，营造厚度感）
  gfx.fillStyle(lightC, 1);
  gfx.fillPoints([
    { x: x0,         y: y0 },
    { x: x0 + W,     y: y0 },
    { x: x0 + W + D, y: y0 - D },
    { x: x0 + D,     y: y0 - D }
  ], true);

  // ── 5. 前墙主体
  gfx.fillStyle(color, 1);
  gfx.fillRect(x0, y0, W, H);

  // ── 6. 箭垛（4个，带3D顶面）
  const mW = 5, mH = 7, mGap = 3, mN = 4;
  const mTotal = mN * mW + (mN - 1) * mGap;
  const mx0 = Math.round(cx - mTotal / 2);
  for (let i = 0; i < mN; i++) {
    const bx = mx0 + i * (mW + mGap);
    // 箭垛背面
    gfx.fillStyle(darkC, 1);
    gfx.fillRect(bx + D, y0 - mH - D, mW, mH);
    // 箭垛正面
    gfx.fillStyle(color, 1);
    gfx.fillRect(bx, y0 - mH, mW, mH);
    // 箭垛顶面（浅色）
    gfx.fillStyle(lightC, 1);
    gfx.fillPoints([
      { x: bx,         y: y0 - mH },
      { x: bx + mW,    y: y0 - mH },
      { x: bx + mW + D, y: y0 - mH - D },
      { x: bx + D,     y: y0 - mH - D }
    ], true);
  }

  // ── 7. 角楼（左右各一，稍宽稍高）
  const tW = 9, tExtraH = 5;
  // 左角楼
  gfx.fillStyle(darkC, 1);
  gfx.fillRect(x0 + D - tW / 2 | 0, y0 - D - tExtraH, tW, H + tExtraH);
  gfx.fillStyle(color, 1);
  gfx.fillRect(x0 - tW / 2 | 0, y0 - tExtraH, tW, H + tExtraH);
  // 右角楼
  gfx.fillStyle(darkC, 1);
  gfx.fillRect(x0 + W + D - tW / 2 | 0, y0 - D - tExtraH, tW, H + tExtraH);
  gfx.fillStyle(color, 1);
  gfx.fillRect(x0 + W - tW / 2 | 0, y0 - tExtraH, tW, H + tExtraH);

  // ── 8. 城门拱洞
  gfx.fillStyle(0x000000, 0.9);
  gfx.fillRect(cx - 5, y0 + H - 9, 10, 9);
  gfx.fillEllipse(cx, y0 + H - 9, 10, 8);

  // ── 9. 白色描边
  gfx.lineStyle(1.5, 0xffffff, 0.75);
  gfx.strokeRect(x0, y0, W, H);
}
