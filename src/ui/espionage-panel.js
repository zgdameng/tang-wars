/**
 * 间谍面板——派遣武将执行刺探/破坏/离间/谣言。
 */

import { spyScout, spySabotage, spySowDiscord, spySpreadRumors } from '../logic/espionage.js';

let panelEl = null;
let _state = null;

function getPanel() {
  if (panelEl) return panelEl;
  panelEl = document.createElement('div');
  panelEl.id = 'espionage-panel';
  panelEl.style.cssText = `
    display:none; position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
    width: min(520px, 95vw); max-height: 85vh; overflow-y: auto;
    background:rgba(247,242,232,0.97); border:2px solid #D4C5A0;
    border-radius:8px; padding:16px; color:#3D2B1F;
    font-family:'Microsoft YaHei',sans-serif; z-index:1000; user-select:none;
  `;
  document.body.appendChild(panelEl);
  return panelEl;
}

export function showEspionagePanel(state) {
  _state = state;
  renderSpySelect();
  getPanel().style.display = 'block';
}

export function hideEspionagePanel() {
  if (panelEl) panelEl.style.display = 'none';
}

// ===== 第一步：选择间谍武将 =====

function renderSpySelect() {
  const panel = getPanel();
  const playerId = _state.playerFactionId;
  const faction = _state.factions[playerId];
  const generals = Object.values(_state.generals).filter(g => g.factionId === playerId);

  panel.innerHTML = `
    <div style="font-size:20px;color:#C43A30;font-weight:bold;border-bottom:1px solid #D4C5A0;padding-bottom:10px;margin-bottom:12px;font-family:'KaiTi','STKaiti',serif">
      🕵️ 间谍行动
    </div>
    <div style="font-size:13px;color:#6B5B4F;margin-bottom:10px">选择执行任务的武将（智力越高成功率越大）：</div>
    <div style="display:flex;flex-direction:column;gap:6px">
      ${generals.map(g => `
        <div class="spy-card" data-gid="${g.id}" style="display:flex;align-items:center;justify-content:space-between;
          background:#F0E8D8;border:1px solid #D4C5A0;border-radius:5px;padding:10px 14px;cursor:pointer"
          onmouseenter="this.style.borderColor='#C43A30'" onmouseleave="this.style.borderColor='#D4C5A0'">
          <div>
            <span style="color:#3D2B1F;font-weight:bold">${g.name}</span>
            <span style="font-size:12px;color:#6B5B4F;margin-left:8px">智力${g.intelligence} 魅力${g.charisma}</span>
          </div>
          <span style="font-size:12px;color:#6B5B4F">${g.inCity ? '在' + (_state.cities[g.inCity]?.name || g.inCity) : '空闲'}</span>
        </div>
      `).join('')}
    </div>
    <div style="margin-top:12px;text-align:right">
      <button id="btn-spy-close" style="padding:6px 22px;background:#D4C5A0;color:#3D2B1F;border:1px solid #B8960C;border-radius:4px;cursor:pointer;font-size:14px;font-family:inherit">关闭</button>
    </div>
  `;

  document.getElementById('btn-spy-close').onclick = hideEspionagePanel;
  panel.querySelectorAll('.spy-card').forEach(card => {
    card.onclick = () => {
      const gid = card.dataset.gid;
      const spy = _state.generals[gid];
      renderActionSelect(spy);
    };
  });
}

// ===== 第二步：选择行动 =====

function renderActionSelect(spy) {
  const panel = getPanel();
  const cities = Object.values(_state.cities).filter(c => c.owner !== _state.playerFactionId);

  panel.innerHTML = `
    <div style="font-size:20px;color:#C43A30;font-weight:bold;border-bottom:1px solid #D4C5A0;padding-bottom:10px;margin-bottom:12px;font-family:'KaiTi','STKaiti',serif">
      🕵️ 间谍：${spy.name} （智力${spy.intelligence}）
    </div>
    <div style="font-size:13px;color:#6B5B4F;margin-bottom:8px">选择行动和目标：</div>
    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px">
      ${renderAction('scout', '🔍 刺探', '获取目标城池详细情报', 300)}
      ${renderAction('sabotage', '💣 破坏', '降低目标城池城防 2 点', 300)}
      ${renderAction('rumor', '🗣️ 谣言', '降低目标城池民心 10 点', 300)}
    </div>
    <div style="font-size:13px;color:#3D2B1F;margin-bottom:6px">选择目标城池：</div>
    <div style="display:flex;flex-direction:column;gap:4px;max-height:180px;overflow-y:auto;margin-bottom:10px">
      ${cities.map(c => `
        <button class="btn-spy-target" data-cid="${c.id}" data-act="" style="text-align:left;
          padding:6px 12px;background:#F0E8D8;border:1px solid #D4C5A0;border-radius:4px;cursor:pointer;font-family:inherit;font-size:13px;color:#3D2B1F"
          onmouseenter="this.style.borderColor='#C43A30'" onmouseleave="this.style.borderColor='#D4C5A0'">
          ${c.name} <span style="color:#6B5B4F;font-size:11px">${_state.factions[c.owner]?.name || '无主'} · 城防${c.defense} · 民心${c.stability}</span>
        </button>
      `).join('')}
    </div>
    <div style="margin-top:10px;text-align:right">
      <button class="btn-back-spy" style="padding:6px 14px;background:#D4C5A0;color:#3D2B1F;border:1px solid #B8960C;border-radius:4px;cursor:pointer;font-size:13px;font-family:inherit;margin-right:8px">← 换人</button>
      <button id="btn-spy-close2" style="padding:6px 22px;background:#D4C5A0;color:#3D2B1F;border:1px solid #B8960C;border-radius:4px;cursor:pointer;font-size:14px;font-family:inherit">关闭</button>
    </div>
  `;

  document.getElementById('btn-spy-close2').onclick = hideEspionagePanel;
  panel.querySelector('.btn-back-spy').onclick = renderSpySelect;

  let selectedAct = 'scout';

  panel.querySelectorAll('[data-act]').forEach(btn => {
    btn.onclick = () => {
      selectedAct = btn.dataset.act;
      panel.querySelectorAll('[data-act]').forEach(b => b.style.borderColor = '#D4C5A0');
      btn.style.borderColor = '#C43A30';
    };
  });

  panel.querySelectorAll('.btn-spy-target').forEach(btn => {
    btn.onclick = () => {
      const cid = btn.dataset.cid;
      let result;
      switch (selectedAct) {
        case 'scout': result = spyScout(_state, _state.playerFactionId, spy.id, cid); break;
        case 'sabotage': result = spySabotage(_state, _state.playerFactionId, spy.id, cid); break;
        case 'rumor': result = spySpreadRumors(_state, _state.playerFactionId, spy.id, cid); break;
      }
      if (result) {
        if (result.success && result.info) {
          const info = result.info;
          alert(`成功刺探 ${info.name}！\n人口:${info.population.toLocaleString()} 农业:${info.agriculture} 商业:${info.commerce} 城防:${info.defense} 民心:${info.stability} 驻军:${info.garrison}队`);
        } else {
          alert(result.message);
        }
        renderActionSelect(spy);
      }
    };
  });
}

function renderAction(act, label, desc, cost) {
  return `
    <div class="spy-action" data-act="${act}" style="display:flex;align-items:center;justify-content:space-between;
      background:#F0E8D8;border:1px solid ${act === 'scout' ? '#C43A30' : '#D4C5A0'};border-radius:5px;padding:10px 14px;cursor:pointer">
      <div>
        <span style="color:#3D2B1F;font-weight:bold">${label}</span>
        <span style="font-size:11px;color:#6B5B4F;margin-left:8px">${desc}</span>
      </div>
      <span style="font-size:12px;color:#6B5B4F">💰${cost}金</span>
    </div>`;
}
