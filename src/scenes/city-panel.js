/**
 * 城池信息面板——用 HTML DOM 覆盖在游戏画面上。
 * 比 Phaser 自带文字更适合中文显示，也方便后续加按钮。
 */

let panelEl = null;

function getPanel() {
  if (panelEl) return panelEl;

  panelEl = document.createElement('div');
  panelEl.id = 'city-panel';
  panelEl.style.cssText = `
    display: none;
    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
    width: 340px; background: rgba(15, 15, 30, 0.96); border: 2px solid #665522;
    border-radius: 8px; padding: 18px; color: #ddd; font-family: 'Microsoft YaHei', sans-serif;
    z-index: 1000; user-select: none;
  `;
  document.body.appendChild(panelEl);
  return panelEl;
}

/**
 * 弹出城池信息面板。
 * @param {object} city - 城池对象
 * @param {object} faction - 所属势力对象（可为 null）
 * @param {object} governor - 太守对象（可为 null）
 */
export function showCityPanel(city, faction, governor) {
  const panel = getPanel();

  const ownerName = faction ? faction.name : '无主';
  const govName = governor ? governor.name : '无';
  const govStars = governor ? `统${governor.leadership} 武${governor.might} 智${governor.intelligence}` : '';

  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;border-bottom:1px solid #665522;padding-bottom:10px">
      <span style="font-size:24px;color:#ccaa44;font-weight:bold">${city.name}</span>
      <span style="font-size:13px;color:#888">${ownerName}</span>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:14px;line-height:1.8">
      <div>👥 人口：<b>${city.population.toLocaleString()}</b></div>
      <div>🌾 农业：${starBar(city.agriculture, 10)}</div>
      <div>💰 商业：${starBar(city.commerce, 10)}</div>
      <div>🏰 城防：${starBar(city.defense, 10)}</div>
      <div>😊 民心：${city.stability}</div>
      <div>⚔️ 驻军：${city.garrison.length} 队</div>
      <div>🎯 太守：${govName}</div>
      <div>${govStars ? '　能力：' + govStars : ''}</div>
    </div>
    <div style="margin-top:14px;text-align:right">
      <button id="btn-close-panel" style="
        padding:6px 22px;background:#443322;color:#ccaa44;border:1px solid #665522;
        border-radius:4px;cursor:pointer;font-size:14px
      ">关闭</button>
    </div>
  `;

  document.getElementById('btn-close-panel').onclick = hideCityPanel;
  panel.style.display = 'block';
}

export function hideCityPanel() {
  if (panelEl) panelEl.style.display = 'none';
}

/** 用星星条显示 0-10 的数值 */
function starBar(value, max) {
  const filled = Math.min(value, max);
  return '<span style="color:#ccaa44">' + '★'.repeat(filled) + '</span>'
       + '<span style="color:#333">' + '☆'.repeat(max - filled) + '</span>';
}
