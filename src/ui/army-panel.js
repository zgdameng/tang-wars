/**
 * 军队操作面板——点击部队后弹出。
 * 列出可达城池/位置，玩家选目标后下令行军。
 */

import { moveArmy } from '../logic/movement.js';
import { UNIT_TYPES, getArmyStrength } from '../logic/army.js';

let panelEl = null;
let _state = null;
let _army = null;
let _onClose = null;

function getPanel() {
  if (panelEl) return panelEl;
  panelEl = document.createElement('div');
  panelEl.id = 'army-panel';
  panelEl.style.cssText = `
    display:none; position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
    width:440px; max-height:70vh; overflow-y:auto;
    background:rgba(15,15,30,0.97); border:2px solid #665522;
    border-radius:8px; padding:16px; color:#ddd;
    font-family:'Microsoft YaHei',sans-serif; z-index:1000; user-select:none;
  `;
  document.body.appendChild(panelEl);
  return panelEl;
}

export function showArmyPanel(army, state, onClose) {
  _state = state;
  _army = army;
  _onClose = onClose;
  render();
  getPanel().style.display = 'block';
}

export function hideArmyPanel() {
  if (panelEl) panelEl.style.display = 'none';
  if (_onClose) _onClose();
}

export function isArmyPanelOpen() {
  return panelEl && panelEl.style.display === 'block';
}

function render() {
  const panel = getPanel();
  const army = _army;
  const state = _state;
  const faction = state.factions[army.factionId];
  const isPlayer = faction && faction.id === state.playerFactionId;
  const totalCount = army.units.reduce((s, u) => s + u.count, 0);
  const strength = getArmyStrength(army);

  const unitList = army.units.map(u => {
    const def = UNIT_TYPES[u.type];
    return `<div style="font-size:13px;margin:2px 0">${def?.name || u.type} ×${u.count} 士气${u.morale}</div>`;
  }).join('');

  const statusText = army.state === 'idle' ? '待命中' : army.state === 'moving' ? `行军至 (${army.moveTarget?.x},${army.moveTarget?.y}) 剩余${army.moveTurnsRemaining}回合` : army.state;

  panel.innerHTML = `
    <div style="border-bottom:1px solid #665522;padding-bottom:10px;margin-bottom:12px">
      <div style="font-size:20px;color:#ccaa44;font-weight:bold">${faction ? faction.name : '未知'}军</div>
      <div style="font-size:12px;color:#888">战力 ${strength} · ${totalCount} 兵 · ${statusText}</div>
    </div>
    <div style="margin-bottom:10px">${unitList}</div>
    ${isPlayer && army.state === 'idle' ? renderMoveTargets(army, state) : (army.state === 'moving' ? `<div style="color:#888;font-size:13px">行军预计剩余 ${army.moveTurnsRemaining} 回合</div>` : '<div style="color:#888">此部队无法操作</div>')}
    <div style="margin-top:14px;text-align:right;border-top:1px solid #333;padding-top:10px">
      <button id="btn-army-close" style="padding:6px 22px;background:#443322;color:#ccaa44;border:1px solid #665522;border-radius:4px;cursor:pointer;font-size:14px;font-family:inherit">关闭</button>
    </div>
  `;

  document.getElementById('btn-army-close').onclick = hideArmyPanel;
  bindMoveButtons(army, state);
}

function renderMoveTargets(army, state) {
  // 列出所有城池作为行军目标
  const cities = Object.values(state.cities);
  const currentCity = army.inCity ? state.cities[army.inCity] : null;
  const srcX = currentCity ? currentCity.x : army.position.x;
  const srcY = currentCity ? currentCity.y : army.position.y;

  let html = '<div style="font-size:14px;color:#ccaa44;margin-bottom:6px">🎯 选择行军目标：</div>';
  html += '<div style="display:flex;flex-direction:column;gap:5px;max-height:260px;overflow-y:auto">';

  for (const city of cities) {
    // 跳过自己所在的城
    if (army.inCity === city.id) continue;

    const dx = city.x - srcX;
    const dy = city.y - srcY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = army.units.length > 0 ? Math.min(...army.units.map(u => UNIT_TYPES[u.type]?.speed || 3)) : 3;
    const turns = Math.max(1, Math.ceil(dist / speed));

    const isEnemy = city.owner && state.factions[state.playerFactionId] &&
      (state.factions[state.playerFactionId].atWarWith || []).includes(city.owner);
    const ownerName = city.owner ? (state.factions[city.owner]?.name || city.owner) : '无主';
    const actionLabel = isEnemy ? '⚔️攻城' : '行军';

    html += `
      <div style="display:flex;align-items:center;justify-content:space-between;
        background:#1a1a30;border:1px solid ${isEnemy ? '#603030' : '#333355'};border-radius:5px;padding:8px 12px">
        <div>
          <span style="color:#ccaa44;font-weight:bold">${city.name}</span>
          <span style="font-size:11px;color:#888;margin-left:8px">${ownerName}</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:11px;color:#888">${turns} 回合</span>
          <button class="btn-army-move" data-cx="${city.x}" data-cy="${city.y}" data-cid="${city.id}" style="
            padding:3px 12px;background:${isEnemy ? '#4a2a2a' : '#2a3a4a'};
            color:${isEnemy ? '#c88' : '#8ac'};border:1px solid ${isEnemy ? '#844' : '#468'};
            border-radius:3px;cursor:pointer;font-size:12px;font-family:inherit">${actionLabel}</button>
        </div>
      </div>`;
  }
  html += '</div>';
  return html;
}

function bindMoveButtons(army, state) {
  document.querySelectorAll('.btn-army-move').forEach(btn => {
    btn.onclick = () => {
      const tx = parseInt(btn.dataset.cx);
      const ty = parseInt(btn.dataset.cy);
      const result = moveArmy(state, army.id, tx, ty);
      if (result) {
        hideArmyPanel();
      } else {
        alert('行军失败：部队可能已在移动中');
      }
    };
  });
}
