/**
 * 部队标记——Phaser 三角箭头 + DOM 标签。
 * 在地图上显示各势力的部队位置、人数、状态。
 */

import { gridToPixel } from './map-bitmap.js';

let containerEl = null;
const markers = []; // { armyId, el, sprite, worldX, worldY }

export function createArmyMarkers(scene, armies, factions) {
  if (!containerEl) {
    containerEl = document.createElement('div');
    containerEl.id = 'army-labels';
    containerEl.style.cssText = `
      position:fixed; top:0; left:0; width:100vw; height:100vh;
      pointer-events:none; z-index:101; font-family:'Microsoft YaHei',sans-serif;
    `;
    document.body.appendChild(containerEl);
  }

  for (const army of Object.values(armies)) {
    const faction = factions[army.factionId];
    const color = faction ? faction.color : 0x888888;
    const { x, y } = gridToPixel(army.position.x, army.position.y);

    // 小三角箭头（Phaser 画）
    const size = 8;
    const sprite = scene.add.triangle(x, y - 4, 0, -size, size * 0.7, size * 0.5, -size * 0.7, size * 0.5, color);
    sprite.setDepth(15);
    sprite.setInteractive({ useHandCursor: true });
    sprite.armyId = army.id;
    sprite.on('pointerdown', () => scene.events.emit('army-clicked', army.id));

    // 人数标签
    const totalCount = army.units.reduce((s, u) => s + u.count, 0);
    const el = document.createElement('div');
    el.style.cssText = `
      position:absolute; font-size:11px; font-weight:bold; color:#fff;
      text-shadow:0 0 3px #000, 0 0 3px #000;
      transform:translate(-50%,-50%); white-space:nowrap;
      background:rgba(10,8,0,0.7); padding:1px 5px; border-radius:2px;
    `;
    el.textContent = `${totalCount}兵`;
    containerEl.appendChild(el);

    markers.push({ armyId: army.id, el, sprite, worldX: x, worldY: y - 18 });
  }
}

/** 每帧更新部队位置（行军中的插值） */
export function updateArmyPositions(camera, armies) {
  const canvas = document.querySelector('canvas');
  if (!canvas || markers.length === 0) return;
  const rect = canvas.getBoundingClientRect();

  const tl = { x: 0, y: 0 };
  const br = { x: 0, y: 0 };
  camera.getWorldPoint(0, 0, tl);
  camera.getWorldPoint(camera.width, camera.height, br);
  const worldW = br.x - tl.x;
  const worldH = br.y - tl.y;
  if (worldW === 0 || worldH === 0) return;

  for (const m of markers) {
    const army = armies[m.armyId];
    if (!army) continue;

    // 如果在行军：线性插值当前位置
    let wx, wy;
    if (army.state === 'moving' && army.moveTarget && army.moveTurnsRemaining > 0) {
      const progress = 1 - (army.moveTurnsRemaining / (army.moveTurnsRemaining + 0.01));
      wx = army.position.x + (army.moveTarget.x - army.position.x) * progress;
      wy = army.position.y + (army.moveTarget.y - army.position.y) * progress;
    } else {
      wx = army.position.x;
      wy = army.position.y;
    }

    const pos = gridToPixel(wx, wy);
    m.worldX = pos.x;
    m.worldY = pos.y - 18;

    // Phaser 三角形位置
    if (m.sprite && m.sprite.active) {
      m.sprite.x = pos.x;
      m.sprite.y = pos.y - 4;
    }

    // DOM 标签位置
    const fx = (m.worldX - tl.x) / worldW;
    const fy = (m.worldY - tl.y) / worldH;
    m.el.style.left = (rect.left + fx * rect.width) + 'px';
    m.el.style.top = (rect.top + fy * rect.height) + 'px';

    // 只在有部队时显示
    const visible = army.units.reduce((s, u) => s + u.count, 0) > 0;
    m.el.style.display = visible ? '' : 'none';
    if (m.sprite) m.sprite.setVisible(visible);
  }
}

/** 有部队变化时重建标记（征兵/战斗后调用） */
export function refreshArmyMarkers(scene, armies, factions) {
  destroyArmyMarkers();
  createArmyMarkers(scene, armies, factions);
}

export function destroyArmyMarkers() {
  markers.forEach(m => { if (m.sprite) m.sprite.destroy(); if (m.el && m.el.parentNode) m.el.parentNode.removeChild(m.el); });
  markers.length = 0;
  if (containerEl && containerEl.parentNode) {
    containerEl.parentNode.removeChild(containerEl);
    containerEl = null;
  }
}
