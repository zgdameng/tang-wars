import { gridToScreen } from './iso-renderer.js';

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
    const { x, y } = gridToScreen(city.x, city.y);
    const faction = factions[city.owner];
    const cityColor = faction ? colorToHex(faction.color) : '#888888';

    // 城池圆点（Phaser 画，处理点击）
    const circle = scene.add.circle(x, y - 4, 7, faction ? faction.color : 0x888888);
    circle.setInteractive({ useHandCursor: true });
    circle.cityId = city.id;
    circle.setDepth(10);

    circle.on('pointerover', () => circle.setFillStyle(0xffffff));
    circle.on('pointerout', () => circle.setFillStyle(faction ? faction.color : 0x888888));
    circle.on('pointerdown', () => scene.events.emit('city-clicked', city.id));

    // 城池标签（DOM 元素，完美中文渲染）
    const el = document.createElement('div');
    el.textContent = city.name;
    el.style.cssText = `
      position: absolute;
      font-size: 14px; font-weight: bold; color: #fff;
      font-family: 'Microsoft YaHei', SimHei, sans-serif;
      text-shadow: 0 0 4px #000, 0 0 4px #000, 1px 1px 2px #000;
      transform: translate(-50%, -50%);
      white-space: nowrap;
      background: rgba(10, 8, 0, 0.65);
      padding: 2px 6px; border-radius: 3px;
    `;
    containerEl.appendChild(el);

    markers.push({ cityId: city.id, el, circle, worldX: x, worldY: y - 26 });
  }
}

/**
 * 每次镜头移动后调用，更新所有标签的屏幕位置。
 * 必须在 Phaser 场景的 update() 或相机事件中调用。
 *
 * @param {Phaser.Cameras.Scene2D.Camera} camera - scene.cameras.main
 */
export function updateCityLabelPositions(camera) {
  const canvas = document.querySelector('canvas');
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();

  for (const m of markers) {
    // 世界坐标 → 屏幕坐标：worldXY * zoom + scroll offset
    const sx = (m.worldX + camera.scrollX) * camera.zoom;
    const sy = (m.worldY + camera.scrollY) * camera.zoom;

    m.el.style.left = (rect.left + sx + rect.width / 2) + 'px';
    m.el.style.top = (rect.top + sy + rect.height / 2) + 'px';
  }
}

/** 清理 DOM 元素 */
export function destroyCityMarkers() {
  if (containerEl && containerEl.parentNode) {
    containerEl.parentNode.removeChild(containerEl);
    containerEl = null;
  }
  markers.length = 0;
}

/** 把 Phaser 颜色整数转成 CSS 十六进制 */
function colorToHex(color) {
  return '#' + color.toString(16).padStart(6, '0');
}
