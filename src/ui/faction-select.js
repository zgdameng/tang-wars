/**
 * 势力选择面板——用 HTML DOM 覆盖在菜单上。
 * 玩家从 9 个势力中选一个，点卡片确定。
 */

import factionsData from '../data/factions.json';

let panelEl = null;

function getPanel() {
  if (panelEl) return panelEl;

  panelEl = document.createElement('div');
  panelEl.id = 'faction-select';
  panelEl.style.cssText = `
    display: none;
    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
    width: 620px; background: rgba(15, 15, 30, 0.96); border: 2px solid #665522;
    border-radius: 8px; padding: 20px; color: #ddd;
    font-family: 'Microsoft YaHei', sans-serif; z-index: 1000; user-select: none;
  `;
  document.body.appendChild(panelEl);
  return panelEl;
}

/**
 * 弹出势力选择面板。
 * @param {function} onSelect - 选中势力时回调，参数是 factionId
 */
export function showFactionSelect(onSelect) {
  const panel = getPanel();

  // 颜色转换：Phaser 整数 → CSS 十六进制
  const toHex = (c) => '#' + c.toString(16).padStart(6, '0');

  let cardsHtml = '';
  for (const f of factionsData) {
    const bg = toHex(f.color);
    cardsHtml += `
      <div class="faction-card" data-fid="${f.id}" style="
        background: #1a1a30; border: 2px solid #333355; border-radius: 6px;
        padding: 12px; cursor: pointer; text-align: center;
        transition: border-color 0.2s;
      " onmouseenter="this.style.borderColor='${bg}'" onmouseleave="this.style.borderColor='#333355'">
        <div style="width:72px;height:48px;background:${bg};border-radius:6px;margin:0 auto 8px;display:flex;align-items:center;justify-content:center"><span style="font-size:28px;color:#fff;font-weight:bold;text-shadow:0 0 6px #000">${f.name[0]}</span></div>
        <div style="font-size:18px;color:#ccaa44;font-weight:bold">${f.name}</div>
        <div style="font-size:12px;color:#888;margin-top:4px">
          💰${f.gold.toLocaleString()} · 👑${f.prestige}
        </div>
      </div>`;
  }

  panel.innerHTML = `
    <div style="font-size:22px;color:#ccaa44;font-weight:bold;margin-bottom:16px;text-align:center">
      选择势力
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
      ${cardsHtml}
    </div>
    <div style="margin-top:16px;text-align:right">
      <button id="btn-faction-close" style="
        padding:6px 22px;background:#443322;color:#ccaa44;border:1px solid #665522;
        border-radius:4px;cursor:pointer;font-size:14px
      ">返回</button>
    </div>
  `;

  // 绑定卡片点击
  const cards = panel.querySelectorAll('.faction-card');
  cards.forEach(card => {
    card.onclick = () => {
      const fid = card.getAttribute('data-fid');
      panel.style.display = 'none';
      if (onSelect) onSelect(fid);
    };
  });

  // 关闭按钮
  document.getElementById('btn-faction-close').onclick = hideFactionSelect;

  panel.style.display = 'block';
}

export function hideFactionSelect() {
  if (panelEl) panelEl.style.display = 'none';
}
