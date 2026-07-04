/**
 * 外交面板——用 HTML DOM 覆盖在地图场景上。
 * 列出所有势力、关系状态，提供结盟/宣战/求和/撕毁盟约操作。
 */

import { proposeAlliance, declareWar, breakAlliance, sueForPeace } from '../logic/diplomacy.js';
import { hideCityPanel } from '../scenes/city-panel.js';

let panelEl = null;
let currentState = null; // 当前游戏状态引用，操作完刷新用

function getPanel() {
  if (panelEl) return panelEl;

  panelEl = document.createElement('div');
  panelEl.id = 'diplomacy-panel';
  panelEl.style.cssText = `
    display: none;
    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
    width: 580px; background: rgba(15, 15, 30, 0.96); border: 2px solid #665522;
    border-radius: 8px; padding: 18px; color: #ddd;
    font-family: 'Microsoft YaHei', sans-serif; z-index: 1000; user-select: none;
  `;
  document.body.appendChild(panelEl);
  return panelEl;
}

/** 判断两个势力之间的关系状态 */
function getStatus(playerId, otherId, state) {
  if (playerId === otherId) return 'self';
  const player = state.factions[playerId];
  if (!player) return 'neutral';
  if (player.atWarWith.includes(otherId)) return 'atWar';
  if (player.alliances.includes(otherId)) return 'allied';
  return 'neutral';
}

/** 关系值对应的颜色 */
function relationColor(val) {
  if (val > 20) return '#55aa55';
  if (val < -20) return '#cc5555';
  return '#ccaa44';
}

/** 颜色整数转 CSS 十六进制 */
function toHex(c) {
  return '#' + c.toString(16).padStart(6, '0');
}

/** 弹出一个确认框后执行动作 */
function confirmAction(msg, action) {
  if (confirm(msg)) {
    action();
    renderContent(); // 操作后刷新面板
  }
}

/** 渲染面板内容 */
function renderContent() {
  if (!panelEl || !currentState) return;
  const state = currentState;
  const playerId = state.playerFactionId;
  const factions = Object.values(state.factions);

  let rowsHtml = '';
  for (const f of factions) {
    const status = getStatus(playerId, f.id, state);
    const rel = playerId ? (state.factions[playerId].relations[f.id] || 0) : 0;
    const relStr = status === 'self' ? '---' : (rel >= 0 ? '+' + rel : String(rel));

    // 状态标签
    let statusBadge = '';
    switch (status) {
      case 'self': statusBadge = '<span style="color:#ccaa44">👤 玩家</span>'; break;
      case 'allied': statusBadge = '<span style="color:#55aa55">🤝 同盟</span>'; break;
      case 'atWar': statusBadge = '<span style="color:#cc5555">⚔️ 战争</span>'; break;
      default: statusBadge = '<span style="color:#888">中立</span>'; break;
    }

    // 操作按钮
    let btns = '';
    switch (status) {
      case 'self':
        btns = '<span style="color:#555">---</span>';
        break;
      case 'neutral':
        btns = `<button data-act="ally-${f.id}" style="margin:0 2px;padding:3px 8px;background:#2a4a2a;color:#8c8;border:1px solid #484;border-radius:3px;cursor:pointer;font-size:12px">结盟</button>
                <button data-act="war-${f.id}" style="margin:0 2px;padding:3px 8px;background:#4a2a2a;color:#c88;border:1px solid #844;border-radius:3px;cursor:pointer;font-size:12px">宣战</button>`;
        break;
      case 'allied':
        btns = `<button data-act="break-${f.id}" style="margin:0 2px;padding:3px 8px;background:#4a3a2a;color:#ca8;border:1px solid #864;border-radius:3px;cursor:pointer;font-size:12px">撕毁盟约</button>`;
        break;
      case 'atWar':
        btns = `<button data-act="peace-${f.id}" style="margin:0 2px;padding:3px 8px;background:#2a3a4a;color:#8ac;border:1px solid #468;border-radius:3px;cursor:pointer;font-size:12px">求和</button>`;
        break;
    }

    rowsHtml += `
      <tr>
        <td><div style="width:18px;height:18px;background:${toHex(f.color)};border-radius:3px;margin:0 auto"></div></td>
        <td style="color:#ccaa44;font-weight:bold">${f.name}</td>
        <td style="color:${relationColor(rel)}">${relStr}</td>
        <td>${statusBadge}</td>
        <td>${btns}</td>
      </tr>`;
  }

  panelEl.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;border-bottom:1px solid #665522;padding-bottom:10px">
      <span style="font-size:22px;color:#ccaa44;font-weight:bold">外交</span>
      <button id="btn-diplo-close" style="
        padding:6px 22px;background:#443322;color:#ccaa44;border:1px solid #665522;
        border-radius:4px;cursor:pointer;font-size:14px
      ">关闭</button>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <tr style="color:#888;border-bottom:1px solid #333">
        <th style="width:30px;padding:4px"></th>
        <th style="text-align:left;padding:4px">势力</th>
        <th style="text-align:center;padding:4px">关系</th>
        <th style="text-align:center;padding:4px">状态</th>
        <th style="text-align:center;padding:4px">操作</th>
      </tr>
      ${rowsHtml}
    </table>
  `;

  // 关闭按钮
  document.getElementById('btn-diplo-close').onclick = hideDiplomacyPanel;

  // 绑定操作按钮
  bindActions(state, playerId);
}

/** 给各操作按钮绑定外交函数 */
function bindActions(state, playerId) {
  if (!panelEl || !playerId) return;

  // 结盟
  panelEl.querySelectorAll('[data-act^="ally-"]').forEach(btn => {
    const targetId = btn.getAttribute('data-act').replace('ally-', '');
    btn.onclick = () => {
      const result = proposeAlliance(state, playerId, targetId);
      alert(result.message);
      renderContent();
    };
  });

  // 宣战（需要确认）
  panelEl.querySelectorAll('[data-act^="war-"]').forEach(btn => {
    const targetId = btn.getAttribute('data-act').replace('war-', '');
    const targetName = state.factions[targetId]?.name || targetId;
    btn.onclick = () => confirmAction(`确定要向 ${targetName} 宣战吗？`, () => {
      declareWar(state, playerId, targetId);
    });
  });

  // 撕毁盟约（需要确认）
  panelEl.querySelectorAll('[data-act^="break-"]').forEach(btn => {
    const targetId = btn.getAttribute('data-act').replace('break-', '');
    const targetName = state.factions[targetId]?.name || targetId;
    btn.onclick = () => confirmAction(`确定要撕毁与 ${targetName} 的盟约吗？（声望 -100）`, () => {
      breakAlliance(state, playerId, targetId);
    });
  });

  // 求和
  panelEl.querySelectorAll('[data-act^="peace-"]').forEach(btn => {
    const targetId = btn.getAttribute('data-act').replace('peace-', '');
    btn.onclick = () => {
      const result = sueForPeace(state, playerId, targetId);
      alert(result.message);
      renderContent();
    };
  });
}

/** 弹出外交面板 */
export function showDiplomacyPanel(state) {
  hideCityPanel(); // 避免面板重叠
  currentState = state;
  getPanel();
  renderContent();
  panelEl.style.display = 'block';
}

/** 关闭外交面板 */
export function hideDiplomacyPanel() {
  if (panelEl) panelEl.style.display = 'none';
}
