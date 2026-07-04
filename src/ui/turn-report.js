/**
 * 回合报告——每回合结束后弹出，显示 AI 行动摘要和胜利条件检查。
 */

let panelEl = null;

function getPanel() {
  if (panelEl) return panelEl;
  panelEl = document.createElement('div');
  panelEl.id = 'turn-report';
  panelEl.style.cssText = `
    display:none; position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
    width:480px; max-height:70vh; overflow-y:auto;
    background:rgba(15,15,30,0.97); border:2px solid #665522;
    border-radius:8px; padding:18px; color:#ddd;
    font-family:'Microsoft YaHei',sans-serif; z-index:1000; user-select:none;
  `;
  document.body.appendChild(panelEl);
  return panelEl;
}

export function showTurnReport(state) {
  const panel = getPanel();
  const faction = state.factions[state.playerFactionId];
  const cities = faction ? faction.cities.map(id => state.cities[id]).filter(Boolean) : [];
  const totalPop = cities.reduce((s, c) => s + c.population, 0);
  const gold = faction ? faction.gold : 0;

  let aiReport = '';
  const aiFactions = Object.values(state.factions).filter(f => !f.isHuman);
  for (const f of aiFactions) {
    const aiCities = f.cities.map(id => state.cities[id]).filter(Boolean);
    const armies = Object.values(state.armies).filter(a => a.factionId === f.id);
    aiReport += `<div style="font-size:12px;color:#888;margin:2px 0">${f.name}：${aiCities.length} 城 · ${armies.length} 支部队</div>`;
  }

  // 胜利条件检查
  const allCities = Object.values(state.cities);
  const playerCities = allCities.filter(c => c.owner === state.playerFactionId);
  const victoryProgress = Math.round(playerCities.length / allCities.length * 100);
  const victoryMsg = victoryProgress >= 100
    ? '<div style="color:#ffcc44;font-size:18px;font-weight:bold;text-align:center;margin:8px 0">🎉 天下统一！你赢了！</div>'
    : `<div style="font-size:13px;color:#aaa;text-align:center;margin:6px 0">统一进度：${playerCities.length}/${allCities.length} 城（${victoryProgress}%）</div>`;

  panel.innerHTML = `
    <div style="font-size:20px;color:#ccaa44;font-weight:bold;border-bottom:1px solid #665522;padding-bottom:10px;margin-bottom:10px">
      📋 第 ${state.turn} 回合报告
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px;margin-bottom:10px">
      <div>🏙️ 城池：<b>${playerCities.length}</b></div>
      <div>👥 人口：<b>${totalPop.toLocaleString()}</b></div>
      <div>💰 金币：<b>${gold.toLocaleString()}</b></div>
      <div>⚔️ 军队：<b>${Object.values(state.armies).filter(a => a.factionId === state.playerFactionId).length}</b> 队</div>
    </div>
    ${victoryMsg}
    <div style="border-top:1px solid #333;padding-top:8px;margin-top:8px">
      <div style="font-size:14px;color:#ccaa44;margin-bottom:4px">🤖 AI 势力动态</div>
      ${aiReport}
    </div>
    <div style="margin-top:14px;text-align:right;border-top:1px solid #333;padding-top:10px">
      <button id="btn-report-close" style="padding:8px 28px;background:#443322;color:#ccaa44;border:1px solid #665522;border-radius:4px;cursor:pointer;font-size:15px;font-family:inherit">继续</button>
    </div>
  `;

  document.getElementById('btn-report-close').onclick = hideTurnReport;
  panel.style.display = 'block';
}

export function hideTurnReport() {
  if (panelEl) panelEl.style.display = 'none';
}
