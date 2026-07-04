/**
 * 城池内政面板 v2 —— HTML DOM 覆盖层。
 * 五个标签页：信息 | 征兵 | 建设 | 人事 | 内政
 */

import { recruitUnit } from '../logic/recruitment.js';
import { UNIT_TYPES } from '../logic/army.js';
import { setCityGovernor } from '../logic/city.js';
import { spendGold } from '../logic/faction.js';

let panelEl = null;
let _state = null;       // 当前游戏状态引用
let _cityId = null;      // 当前城池 ID
let _activeTab = 'info'; // 当前标签

function getPanel() {
  if (panelEl) return panelEl;
  panelEl = document.createElement('div');
  panelEl.id = 'city-panel';
  panelEl.style.cssText = `
    display:none; position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
    width:420px; background:rgba(15,15,30,0.97); border:2px solid #665522;
    border-radius:8px; padding:0; color:#ddd;
    font-family:'Microsoft YaHei',sans-serif; z-index:1000; user-select:none;
  `;
  document.body.appendChild(panelEl);
  return panelEl;
}

// ============================================================
//  公开 API
// ============================================================

export function showCityPanel(city, faction, governor, state) {
  _state = state;
  _cityId = city.id;
  _activeTab = 'info';
  render(city, faction, governor);
  getPanel().style.display = 'block';
}

export function hideCityPanel() {
  if (panelEl) panelEl.style.display = 'none';
}

// ============================================================
//  渲染主函数
// ============================================================

function render(city, faction, governor) {
  const panel = getPanel();
  const ownerName = faction ? faction.name : '无主';
  const govName = governor ? governor.name : '无';

  panel.innerHTML = `
    <div style="padding:16px 18px 0">
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #665522;padding-bottom:10px">
        <span style="font-size:22px;color:#ccaa44;font-weight:bold">${city.name}</span>
        <span style="font-size:12px;color:#888">${ownerName} · 太守：${govName}</span>
      </div>

      <div style="display:flex;gap:2px;margin:10px 0">
        ${tabBtn('info', '📋 信息')}
        ${tabBtn('recruit', '⚔️ 征兵')}
        ${tabBtn('build', '🏗️ 建设')}
        ${tabBtn('governor', '👤 人事')}
        ${tabBtn('internal', '📊 内政')}
      </div>
    </div>

    <div style="padding:8px 18px 16px;min-height:180px" id="city-tab-content"></div>

    <div style="padding:0 18px 14px;text-align:right">
      <button id="btn-close-panel" style="padding:6px 22px;background:#443322;color:#ccaa44;border:1px solid #665522;border-radius:4px;cursor:pointer;font-size:14px">关闭</button>
    </div>
  `;

  document.getElementById('btn-close-panel').onclick = hideCityPanel;

  // 绑定标签切换
  panel.querySelectorAll('.city-tab-btn').forEach(btn => {
    btn.onclick = () => { _activeTab = btn.dataset.tab; render(city, faction, governor); };
  });

  // 渲染标签内容
  const content = document.getElementById('city-tab-content');
  switch (_activeTab) {
    case 'info':     content.innerHTML = renderInfo(city); break;
    case 'recruit':  content.innerHTML = renderRecruit(city, faction); break;
    case 'build':    content.innerHTML = renderBuild(city, faction); break;
    case 'governor': content.innerHTML = renderGovernor(city, faction); break;
    case 'internal': content.innerHTML = renderInternal(city, faction); break;
  }

  // 绑定交互按钮（必须在 innerHTML 之后）
  bindRecruitButtons(city, faction);
  bindBuildButtons(city, faction);
  bindGovernorButtons(city, faction);
  bindInternalButtons(city, faction);
}

function tabBtn(tab, label) {
  const active = _activeTab === tab;
  return `<button class="city-tab-btn" data-tab="${tab}" style="
    flex:1; padding:6px 0; cursor:pointer; font-size:13px; font-family:inherit;
    background:${active ? '#332211' : '#1a1a30'}; color:${active ? '#ccaa44' : '#888'};
    border:1px solid ${active ? '#665522' : '#333355'}; border-radius:4px 4px 0 0;
    border-bottom:${active ? 'none' : '1px solid #333355'};
  ">${label}</button>`;
}

// ============================================================
//  标签 1：信息
// ============================================================

function renderInfo(city) {
  const g = city.garrison ? city.garrison.length : 0;
  const armies = _state && _state.armies ? Object.values(_state.armies).filter(a => a.inCity === city.id) : [];
  const totalTroops = armies.reduce((sum, a) => sum + a.units.reduce((s, u) => s + u.count, 0), 0);

  return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:14px;line-height:2">
      <div>👥 人口：<b>${city.population.toLocaleString()}</b></div>
      <div>🌾 农业：${starBar(city.agriculture)}</div>
      <div>💰 商业：${starBar(city.commerce)}</div>
      <div>🏰 城防：${starBar(city.defense)}</div>
      <div>😊 民心：<b style="color:${city.stability >= 60 ? '#5a5' : '#c55'}">${city.stability}</b></div>
      <div>⚔️ 驻军：${g} 队 / ${totalTroops} 兵</div>
      <div style="grid-column:1/-1;color:#888;font-size:12px">
        收入：${Math.floor(city.population / 1000 * city.commerce * 0.3)} 金/回合 · 人口增长：${Math.floor(city.population * 0.01 + city.agriculture * 50) * city.stability / 100} 人/回合
      </div>
    </div>`;
}

function starBar(v) {
  return '<span style="color:#ccaa44">' + '★'.repeat(v) + '</span>'
       + '<span style="color:#333">' + '☆'.repeat(10 - v) + '</span>';
}

// ============================================================
//  标签 2：征兵
// ============================================================

function renderRecruit(city, faction) {
  if (!faction) return '<div style="color:#888;text-align:center;padding:40px">此城无主，无法征兵</div>';

  const gold = faction.gold || 0;
  const pop = city.population || 0;

  let html = `
    <div style="font-size:13px;color:#aaa;margin-bottom:10px">
      💰 势力资金：<b style="color:#ccaa44">${gold.toLocaleString()}</b> 金 · 👥 本城人口：<b>${pop.toLocaleString()}</b>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px">`;

  for (const [key, def] of Object.entries(UNIT_TYPES)) {
    const cost = def.cost * 100; // 招 100 人一队
    const canAfford = gold >= cost && pop >= 100;
    html += `
      <div style="display:flex;align-items:center;justify-content:space-between;
        background:#1a1a30;border:1px solid #333355;border-radius:6px;padding:10px 14px">
        <div>
          <div style="font-size:15px;color:#ccaa44;font-weight:bold">${def.name}</div>
          <div style="font-size:12px;color:#888">
            攻${def.attack} 防${def.defense} 速${def.speed} · 克制${UNIT_TYPES[def.counters]?.name || '-'}
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-size:12px;color:${canAfford ? '#aaa' : '#c55'}">💰${cost}金 👥100人</div>
          <button class="btn-recruit" data-type="${key}" ${canAfford ? '' : 'disabled'}
            style="margin-top:4px;padding:4px 14px;background:${canAfford ? '#2a4a2a' : '#333'};
            color:${canAfford ? '#8c8' : '#555'};border:1px solid ${canAfford ? '#484' : '#444'};
            border-radius:3px;cursor:${canAfford ? 'pointer' : 'default'};font-size:13px;font-family:inherit">
            招募一队
          </button>
        </div>
      </div>`;
  }

  html += '</div>';
  return html;
}

function bindRecruitButtons(city, faction) {
  if (!_state || !faction) return;
  document.querySelectorAll('.btn-recruit').forEach(btn => {
    btn.onclick = () => {
      const unitType = btn.dataset.type;
      const result = recruitUnit(_state, city.id, unitType, 100);
      if (result) {
        // 刷新面板
        const updatedCity = _state.cities[city.id];
        const updatedFaction = _state.factions[city.owner];
        const governor = updatedCity.governor ? _state.generals[updatedCity.governor] : null;
        render(updatedCity, updatedFaction, governor);
      } else {
        alert('招募失败：资金不足或人口不够');
      }
    };
  });
}

// ============================================================
//  标签 3：建设
// ============================================================

const BUILD_COSTS = { agriculture: 600, commerce: 600, defense: 400 };

function renderBuild(city, faction) {
  if (!faction) return '<div style="color:#888;text-align:center;padding:40px">此城无主，无法建设</div>';

  const gold = faction.gold || 0;
  let html = `
    <div style="font-size:13px;color:#aaa;margin-bottom:10px">
      💰 势力资金：<b style="color:#ccaa44">${gold.toLocaleString()}</b> 金
    </div>
    <div style="display:flex;flex-direction:column;gap:10px">`;

  const items = [
    { key: 'agriculture', label: '🌾 农业', desc: '提升人口增长速度', cur: city.agriculture },
    { key: 'commerce', label: '💰 商业', desc: '提升每回合金币收入', cur: city.commerce },
    { key: 'defense', label: '🏰 城防', desc: '守城时增加防御加成', cur: city.defense },
  ];

  for (const item of items) {
    const cost = BUILD_COSTS[item.key] * (item.cur + 1);
    const canAfford = gold >= cost && item.cur < 10;
    html += `
      <div style="display:flex;align-items:center;justify-content:space-between;
        background:#1a1a30;border:1px solid #333355;border-radius:6px;padding:10px 14px">
        <div>
          <div style="font-size:14px;color:#ccaa44">${item.label} ${starBar(item.cur)}</div>
          <div style="font-size:12px;color:#888">${item.desc}</div>
        </div>
        <button class="btn-build" data-key="${item.key}" ${canAfford ? '' : 'disabled'}
          style="padding:4px 14px;background:${canAfford ? '#2a3a4a' : '#333'};
          color:${canAfford ? '#8ac' : '#555'};border:1px solid ${canAfford ? '#468' : '#444'};
          border-radius:3px;cursor:${canAfford ? 'pointer' : 'default'};font-size:13px;font-family:inherit;
          white-space:nowrap">
          ${item.cur >= 10 ? '已满级' : '升级 💰' + cost}
        </button>
      </div>`;
  }

  html += '</div>';
  return html;
}

function bindBuildButtons(city, faction) {
  if (!_state || !faction) return;
  document.querySelectorAll('.btn-build').forEach(btn => {
    btn.onclick = () => {
      const key = btn.dataset.key;
      const cost = BUILD_COSTS[key] * (city[key] + 1);
      if (city[key] >= 10) return;

      const spent = spendGold(faction, cost);
      if (spent) {
        city[key] += 1;
        const updatedCity = _state.cities[city.id];
        const updatedFaction = _state.factions[city.owner];
        const governor = updatedCity.governor ? _state.generals[updatedCity.governor] : null;
        render(updatedCity, updatedFaction, governor);
      } else {
        alert('资金不足！');
      }
    };
  });
}

// ============================================================
//  标签 5：内政（税率 + 招将）
// ============================================================

function renderInternal(city, faction) {
  if (!faction) return '<div style="color:#888;text-align:center;padding:40px">此城无主</div>';

  const taxRate = city.taxRate ?? 30;
  const income = Math.floor(city.population / 1000 * city.commerce * taxRate / 100);

  let html = `
    <div style="font-size:15px;color:#ccaa44;margin-bottom:10px;border-bottom:1px solid #333;padding-bottom:6px">💰 税率调节</div>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:4px">
      <span style="font-size:13px;color:#aaa">当前税率：</span>
      <b style="font-size:18px;color:#ccaa44">${taxRate}%</b>
    </div>
    <div style="margin:6px 0">`;

  for (const rate of [10, 20, 30, 40, 50]) {
    html += `<button class="btn-tax" data-rate="${rate}" style="
      margin:2px;padding:4px 12px;background:${taxRate === rate ? '#332211' : '#1a1a30'};
      color:${taxRate === rate ? '#ccaa44' : '#888'};border:1px solid ${taxRate === rate ? '#665522' : '#333355'};
      border-radius:3px;cursor:pointer;font-size:13px;font-family:inherit">${rate}%</button>`;
  }

  html += `</div>
    <div style="font-size:12px;color:#888;margin-bottom:2px">预计收入：<b style="color:#ccaa44">${income}</b> 金/回合</div>
    <div style="font-size:12px;color:#888">⚠️ 高税率会降低民心增长</div>`;

  // 招将
  html += `
    <div style="font-size:15px;color:#ccaa44;margin-top:14px;border-top:1px solid #333;padding-top:10px;margin-bottom:6px">🎯 招募武将</div>
    <div style="font-size:12px;color:#888;margin-bottom:6px">消耗 800 金币，随机招募一位武将加入本势力</div>
    <button class="btn-recruit-gen" style="
      padding:6px 16px;background:#2a3a4a;color:#8ac;border:1px solid #468;
      border-radius:4px;cursor:pointer;font-size:13px;font-family:inherit"
      ${(faction.gold || 0) >= 800 ? '' : 'disabled'}>
      ${(faction.gold || 0) >= 800 ? '招募 💰800' : '资金不足'}
    </button>`;

  return html;
}

function bindInternalButtons(city, faction) {
  if (!_state || !faction) return;

  // 税率按钮
  document.querySelectorAll('.btn-tax').forEach(btn => {
    btn.onclick = () => {
      const rate = parseInt(btn.dataset.rate);
      city.taxRate = rate;
      const updatedCity = _state.cities[city.id];
      const governor = updatedCity.governor ? _state.generals[updatedCity.governor] : null;
      render(updatedCity, faction, governor);
    };
  });

  // 招募武将
  const genBtn = document.querySelector('.btn-recruit-gen');
  if (genBtn) {
    genBtn.onclick = () => {
      if ((faction.gold || 0) < 800) { alert('资金不足！'); return; }
      faction.gold -= 800;
      const surnames = ['李','王','张','刘','陈','杨','赵','黄','周','吴','徐','孙','马','朱','胡','郭','何','高','林','郑'];
      const gNames = ['忠','勇','义','信','仁','智','礼','孝','武','文','德','威','霸','雄','英','杰','俊','秀','明','远'];
      const surname = surnames[Math.floor(Math.random() * surnames.length)];
      const gName = gNames[Math.floor(Math.random() * gNames.length)] + gNames[Math.floor(Math.random() * gNames.length)];
      const newGen = {
        id: 'gen-' + Date.now(),
        name: surname + gName,
        factionId: faction.id,
        leadership: 30 + Math.floor(Math.random() * 60),
        might: 30 + Math.floor(Math.random() * 60),
        intelligence: 30 + Math.floor(Math.random() * 60),
        politics: 30 + Math.floor(Math.random() * 60),
        charisma: 30 + Math.floor(Math.random() * 60),
        loyalty: 70 + Math.floor(Math.random() * 30),
        inCity: city.id,
        leadingArmy: null,
        skill: null
      };
      _state.generals[newGen.id] = newGen;
      faction.generals.push(newGen.id);
      const updatedCity = _state.cities[city.id];
      render(updatedCity, faction, newGen);
    };
  }
}

// ============================================================
//  标签 4：人事（任命太守）
// ============================================================

function renderGovernor(city, faction) {
  if (!faction) return '<div style="color:#888;text-align:center;padding:40px">此城无主，无法任命</div>';

  // 找出本势力下的所有武将
  const allGenerals = _state ? Object.values(_state.generals) : [];
  const factionGenerals = allGenerals.filter(g => g.factionId === faction.id);

  if (factionGenerals.length === 0) {
    return '<div style="color:#888;text-align:center;padding:30px">本势力暂无武将</div>';
  }

  const currentGov = city.governor;

  let html = '<div style="display:flex;flex-direction:column;gap:8px;max-height:220px;overflow-y:auto">';

  for (const g of factionGenerals) {
    const isCurrent = g.id === currentGov;
    const otherCity = findCityGovernedBy(g.id);
    const busy = otherCity && otherCity !== city.id;

    html += `
      <div style="display:flex;align-items:center;justify-content:space-between;
        background:${isCurrent ? '#2a2a10' : '#1a1a30'};border:1px solid ${isCurrent ? '#665522' : '#333355'};
        border-radius:6px;padding:10px 14px">
        <div>
          <div style="font-size:14px;color:${isCurrent ? '#ccaa44' : '#ddd'};font-weight:bold">
            ${g.name} ${isCurrent ? '👈 现任' : ''}
          </div>
          <div style="font-size:11px;color:#888">
            统${g.leadership} 武${g.might} 智${g.intelligence} 政${g.politics} · 忠诚${g.loyalty}
            ${busy ? `<span style="color:#c88"> · 已在「${otherCity.name}」任职</span>` : ''}
          </div>
        </div>
        ${isCurrent ? `
          <button class="btn-dismiss-gov" data-gid="${g.id}"
            style="padding:4px 10px;background:#4a2a2a;color:#c88;border:1px solid #844;
            border-radius:3px;cursor:pointer;font-size:12px;font-family:inherit">解任</button>
        ` : (busy ? '' : `
          <button class="btn-assign-gov" data-gid="${g.id}"
            style="padding:4px 10px;background:#2a4a2a;color:#8c8;border:1px solid #484;
            border-radius:3px;cursor:pointer;font-size:12px;font-family:inherit">任命</button>
        `)}
      </div>`;
  }

  html += '</div>';
  return html;
}

function findCityGovernedBy(generalId) {
  if (!_state) return null;
  for (const c of Object.values(_state.cities)) {
    if (c.governor === generalId) return c;
  }
  return null;
}

function bindGovernorButtons(city, faction) {
  if (!_state || !faction) return;

  document.querySelectorAll('.btn-assign-gov').forEach(btn => {
    btn.onclick = () => {
      const gid = btn.dataset.gid;
      setCityGovernor(city, gid);
      const g = _state.generals[gid];
      if (g) g.inCity = city.id;
      const updatedCity = _state.cities[city.id];
      render(updatedCity, faction, g || null);
    };
  });

  document.querySelectorAll('.btn-dismiss-gov').forEach(btn => {
    btn.onclick = () => {
      setCityGovernor(city, null);
      const gid = btn.dataset.gid;
      const g = _state.generals[gid];
      if (g) g.inCity = null;
      const updatedCity = _state.cities[city.id];
      render(updatedCity, faction, null);
    };
  });
}
