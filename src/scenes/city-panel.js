/**
 * 城池内政面板 v3 —— 「唐风卷宗」HTML DOM 覆盖层。
 * 五个标签页：信息 | 征兵 | 建设 | 人事 | 内政
 * 设计：绢底纸纹 + 朱笔批注填充条 + 书签式标签 + 印章归属
 */

import { recruitUnit } from '../logic/recruitment.js';
import { UNIT_TYPES } from '../logic/army.js';
import { setCityGovernor } from '../logic/city.js';
import { spendGold } from '../logic/faction.js';

export function getCityPanelTheme() {
  return {
    ink: '#2B241B',
    paper: '#E9DEC6',
    vermilion: '#9E3025',
    bronze: '#7A5A33',
  };
}

// ============================================================
//  toast 提示
// ============================================================
function showToast(msg) {
  const toast = document.createElement('div');
  toast.textContent = msg;
  toast.style.cssText = `
    position:fixed; bottom:60px; left:50%; transform:translateX(-50%);
    background:rgba(247,242,232,0.97); border:1px solid #D4C5A0;
    border-radius:8px; padding:10px 24px; color:#3D2B1F;
    font-family:'KaiTi','STKaiti','Microsoft YaHei',serif; z-index:2000;
    font-size:14px; pointer-events:none;
    animation:toastFade 2.5s ease forwards;
  `;
  document.body.appendChild(toast);
  setTimeout(() => { if (toast.parentNode) toast.remove(); }, 2600);
}

// ============================================================
//  面板 DOM 缓存
// ============================================================
let panelEl = null;
let _state = null;
let _cityId = null;
let _activeTab = 'info';

let overlayEl = null;

// 纸纹肌理 —— 用多层 CSS 渐变模拟宣纸纤维感
const PAPER_TEXTURE = `
  background: linear-gradient(135deg, rgba(240,232,216,0.5) 0%, transparent 50%),
              linear-gradient(45deg, rgba(212,197,160,0.15) 0%, transparent 40%),
              linear-gradient(0deg, rgba(247,242,232,0.97) 0%, rgba(245,238,225,0.97) 50%, rgba(247,242,232,0.97) 100%);
`;

function getPanel() {
  if (panelEl) return panelEl;
  const theme = getCityPanelTheme();
  panelEl = document.createElement('div');
  panelEl.id = 'city-panel';
  panelEl.style.cssText = `
    display:none; position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
    width:90vw; max-width:440px; max-height:88vh; overflow-y:auto;
    background:${theme.paper}; border:2px solid ${theme.bronze};
    border-radius:6px; padding:0; color:${theme.ink};
    font-family:'Microsoft YaHei',sans-serif; z-index:1000; user-select:none;
    box-shadow: 0 8px 28px rgba(31,25,18,0.38), inset 0 0 0 2px rgba(255,248,225,0.42);
  `;
  document.body.appendChild(panelEl);

  overlayEl = document.createElement('div');
  overlayEl.id = 'city-overlay';
  overlayEl.style.cssText = 'display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.45); z-index:999;';
  overlayEl.addEventListener('click', hideCityPanel);
  document.body.appendChild(overlayEl);

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
  if (overlayEl) overlayEl.style.display = 'block';
}

export function hideCityPanel() {
  if (panelEl) panelEl.style.display = 'none';
  if (overlayEl) overlayEl.style.display = 'none';
}

// ============================================================
//  渲染主函数
// ============================================================

function render(city, faction, governor) {
  const panel = getPanel();
  const theme = getCityPanelTheme();
  const ownerName = faction ? faction.name : '无主';
  const govName = governor ? governor.name : '无';

  panel.innerHTML = `
    <!-- 头部：城名 + 归属印章 -->
    <div style="padding:18px 20px 12px;border-bottom:2px solid ${theme.bronze};background:linear-gradient(180deg,rgba(122,90,51,0.20),rgba(233,222,198,0.72));position:relative">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">
        <div>
          <div style="font-size:26px;color:${theme.ink};font-weight:bold;font-family:'KaiTi','STKaiti',serif;letter-spacing:4px">${city.name}</div>
          ${city.desc ? `<div style="font-size:12px;color:#6B5B4F;margin-top:2px;font-style:italic">「${city.desc}」</div>` : ''}
        </div>
        <div style="text-align:center;min-width:52px">
          <div style="
            display:inline-block; border:1.5px solid ${theme.vermilion}; border-radius:2px;
            padding:3px 8px; color:${theme.vermilion}; font-size:10px;
            font-family:'KaiTi','STKaiti',serif; letter-spacing:1px;
            transform:rotate(-3deg);
          ">${ownerName}</div>
          <div style="font-size:10px;color:#6B5B4F;margin-top:3px">太守 ${govName}</div>
        </div>
      </div>
      ${/* 装饰分割线 */''}
      <div style="height:2px;background:linear-gradient(90deg,transparent,${theme.bronze},transparent);margin:8px 0 0"></div>
    </div>

    ${/* ── 标签页 —— 唐风书签式 ── */''}
    <div style="display:flex;gap:0;margin:12px 16px 0;position:relative;top:2px">
      ${tabBtn('info', '📋', '信息')}
      ${tabBtn('recruit', '⚔️', '征兵')}
      ${tabBtn('build', '🏗️', '建设')}
      ${tabBtn('governor', '👤', '人事')}
      ${tabBtn('internal', '📊', '内政')}
    </div>

    ${/* ── 内容区 ── */''}
    <div style="margin:0 16px;border:1.5px solid #D4C5A0;border-radius:6px;background:rgba(240,232,216,0.5);padding:14px 16px;min-height:180px" id="city-tab-content"></div>

    ${/* ── 底部按钮 ── */''}
    <div style="padding:12px 20px 16px;text-align:right">
      <button id="btn-close-panel" style="
        padding:8px 28px;background:#D4C5A0;color:#3D2B1F;
        border:1px solid #B8960C;border-radius:4px;cursor:pointer;
        font-size:15px;font-family:'KaiTi','STKaiti',serif;
      ">关 闭</button>
    </div>
  `;

  document.getElementById('btn-close-panel').onclick = hideCityPanel;

  // 标签切换
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

  bindRecruitButtons(city, faction);
  bindBuildButtons(city, faction);
  bindGovernorButtons(city, faction);
  bindInternalButtons(city, faction);
}

// ============================================================
//  标签按钮 —— 书签式：选中时像从卷宗里抽出的签条
// ============================================================
function tabBtn(tab, icon, label) {
  const active = _activeTab === tab;
  return `<button class="city-tab-btn" data-tab="${tab}" style="
    flex:1; padding:8px 4px 7px; cursor:pointer; font-size:13px;
    font-family:'KaiTi','STKaiti',serif;
    background:${active ? 'rgba(240,232,216,0.5)' : '#E8E0D0'};
    color:${active ? '#C43A30' : '#6B5B4F'};
    border:1.5px solid ${active ? '#D4C5A0' : '#D4C5A0'};
    border-bottom:${active ? '1.5px solid rgba(240,232,216,0.5)' : '1.5px solid #D4C5A0'};
    border-radius:6px 6px 0 0;
    font-weight:${active ? 'bold' : 'normal'};
    letter-spacing:1px;
  ">${icon} ${label}</button>`;
}

// ============================================================
//  标签 1：信息 —— 朱笔批注式数值条
// ============================================================

function renderInfo(city) {
  const g = city.garrison ? city.garrison.length : 0;
  const armies = _state && _state.armies ? Object.values(_state.armies).filter(a => a.inCity === city.id) : [];
  const totalTroops = armies.reduce((sum, a) => sum + a.units.reduce((s, u) => s + u.count, 0), 0);
  const income = Math.floor(city.population / 1000 * city.commerce * (city.taxRate || 30) / 100);
  const growth = Math.floor(city.population * 0.01 + city.agriculture * 50) * (city.stability || 50) / 100;

  return `
    ${/* 三大核心数值 */''}
    <div style="display:flex;gap:10px;margin-bottom:12px">
      <div style="flex:1;text-align:center;background:rgba(247,242,232,0.8);border:1px solid #D4C5A0;border-radius:6px;padding:10px 6px">
        <div style="font-size:11px;color:#6B5B4F">人口</div>
        <div style="font-size:20px;font-weight:bold;color:#3D2B1F;font-family:'KaiTi','STKaiti',serif">${(city.population / 10000).toFixed(1)}<span style="font-size:12px">万</span></div>
      </div>
      <div style="flex:1;text-align:center;background:rgba(247,242,232,0.8);border:1px solid #D4C5A0;border-radius:6px;padding:10px 6px">
        <div style="font-size:11px;color:#6B5B4F">每回合金</div>
        <div style="font-size:20px;font-weight:bold;color:#B8960C;font-family:'KaiTi','STKaiti',serif">+${income}</div>
      </div>
      <div style="flex:1;text-align:center;background:rgba(247,242,232,0.8);border:1px solid #D4C5A0;border-radius:6px;padding:10px 6px">
        <div style="font-size:11px;color:#6B5B4F">人口增长</div>
        <div style="font-size:20px;font-weight:bold;color:#4A6B8A;font-family:'KaiTi','STKaiti',serif">+${growth}</div>
      </div>
    </div>

    ${/* 数值条 — 朱笔批注风格 */''}
    <div style="display:flex;flex-direction:column;gap:8px;font-size:13px">
      ${statBar('🌾 农业', city.agriculture, '#C43A30')}
      ${statBar('💰 商业', city.commerce, '#B8960C')}
      ${statBar('🏰 城防', city.defense, '#4A6B8A')}
      ${statBar('😊 民心', Math.round(city.stability / 10), city.stability >= 60 ? '#5a8a5a' : '#C43A30')}
    </div>

    ${/* 底部驻军 */''}
    <div style="margin-top:12px;padding-top:10px;border-top:1px dashed #D4C5A0;display:flex;justify-content:space-between;font-size:12px;color:#6B5B4F">
      <span>⚔️ 驻军：<b style="color:#3D2B1F">${g} 队 / ${totalTroops} 兵</b></span>
      <span>税率：<b style="color:#C43A30">${city.taxRate || 30}%</b></span>
    </div>`;
}

/** 朱笔批注风格的填充条 */
function statBar(label, value, color) {
  const pct = Math.min(100, value * 10); // 0-10 → 0-100%
  return `
    <div style="display:flex;align-items:center;gap:8px">
      <span style="width:72px;font-size:12px;color:#3D2B1F">${label}</span>
      <div style="flex:1;height:8px;background:#E8E0D0;border-radius:4px;overflow:hidden;border:1px solid #D4C5A0">
        <div style="width:${pct}%;height:100%;background:${color};border-radius:3px;
          background-image:linear-gradient(180deg, rgba(255,255,255,0.3) 0%, transparent 50%);
        "></div>
      </div>
      <span style="font-size:12px;font-weight:bold;color:${color};min-width:18px;text-align:right">${value}</span>
    </div>`;
}

// ============================================================
//  标签 2：征兵
// ============================================================

function renderRecruit(city, faction) {
  if (!faction) return emptyState('此城无主，无法征兵');

  const gold = faction.gold || 0;
  const pop = city.population || 0;

  let html = `
    <div style="display:flex;justify-content:space-between;margin-bottom:10px;font-size:12px;color:#6B5B4F">
      <span>💰 势力资金：<b style="color:#B8960C">${gold.toLocaleString()}</b> 金</span>
      <span>👥 本城人口：<b style="color:#3D2B1F">${pop.toLocaleString()}</b></span>
    </div>
    <div style="display:flex;flex-direction:column;gap:8px">`;

  for (const [key, def] of Object.entries(UNIT_TYPES)) {
    const cost = def.cost * 100;
    const canAfford = gold >= cost && pop >= 100;
    const barColor = key === 'infantry' ? '#C43A30' : key === 'cavalry' ? '#B8960C' : '#4A6B8A';
    html += `
      <div style="display:flex;align-items:center;justify-content:space-between;
        background:rgba(247,242,232,0.8);border:1px solid ${canAfford ? '#D4C5A0' : '#E8E0D0'};border-radius:6px;padding:10px 12px">
        <div style="flex:1">
          <div style="font-size:15px;color:${barColor};font-weight:bold;font-family:'KaiTi','STKaiti',serif">${def.name}</div>
          <div style="font-size:11px;color:#6B5B4F">
            <span>攻${def.attack}</span> · <span>防${def.defense}</span> · <span>速${def.speed}</span>
            <span style="margin-left:6px">克${UNIT_TYPES[def.counters]?.name || '-'}</span>
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-size:11px;color:${canAfford ? '#3D2B1F' : '#C43A30'}">💰${cost}金 👥100人</div>
          <button class="btn-recruit" data-type="${key}" ${canAfford ? '' : 'disabled'} style="
            margin-top:3px;padding:7px 16px;font-size:14px;
            background:${canAfford ? barColor : '#D4C5A0'};
            color:${canAfford ? '#F7F2E8' : '#999'};
            border:1px solid ${canAfford ? 'rgba(0,0,0,0.15)' : '#D4C5A0'};
            border-radius:4px;cursor:${canAfford ? 'pointer' : 'default'};
            font-family:'KaiTi','STKaiti',serif;
          ">招募一队</button>
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
        showToast(`招募成功：${UNIT_TYPES[unitType]?.name || unitType} ×100`);
        const updatedCity = _state.cities[city.id];
        const updatedFaction = _state.factions[city.owner];
        const governor = updatedCity.governor ? _state.generals[updatedCity.governor] : null;
        render(updatedCity, updatedFaction, governor);
      } else {
        showToast('招募失败：资金不足或人口不够');
      }
    };
  });
}

// ============================================================
//  标签 3：建设
// ============================================================

const BUILD_COSTS = { agriculture: 600, commerce: 600, defense: 400 };

function renderBuild(city, faction) {
  if (!faction) return emptyState('此城无主，无法建设');

  const gold = faction.gold || 0;
  let html = `
    <div style="font-size:12px;color:#6B5B4F;margin-bottom:10px">
      💰 势力资金：<b style="color:#B8960C">${gold.toLocaleString()}</b> 金
    </div>
    <div style="display:flex;flex-direction:column;gap:8px">`;

  const items = [
    { key: 'agriculture', icon: '🌾', label: '农业', desc: '提升人口增长速度', cur: city.agriculture, color: '#C43A30' },
    { key: 'commerce', icon: '💰', label: '商业', desc: '提升每回合金币收入', cur: city.commerce, color: '#B8960C' },
    { key: 'defense', icon: '🏰', label: '城防', desc: '守城时增加防御加成', cur: city.defense, color: '#4A6B8A' },
  ];

  for (const item of items) {
    const cost = BUILD_COSTS[item.key] * (item.cur + 1);
    const canAfford = gold >= cost && item.cur < 10;
    html += `
      <div style="display:flex;align-items:center;justify-content:space-between;
        background:rgba(247,242,232,0.8);border:1px solid #D4C5A0;border-radius:6px;padding:10px 12px">
        <div style="flex:1">
          <div style="font-size:14px;color:#3D2B1F;font-weight:bold">${item.icon} ${item.label}</div>
          ${statBarMini(item.cur, item.color)}
          <div style="font-size:11px;color:#6B5B4F">${item.desc}</div>
        </div>
        <button class="btn-build" data-key="${item.key}" ${canAfford ? '' : 'disabled'} style="
          margin-left:10px;padding:7px 14px;font-size:13px;white-space:nowrap;
          background:${canAfford ? item.color : '#D4C5A0'};
          color:${canAfford ? '#F7F2E8' : '#999'};
          border:1px solid ${canAfford ? 'rgba(0,0,0,0.15)' : '#D4C5A0'};
          border-radius:4px;cursor:${canAfford ? 'pointer' : 'default'};
          font-family:'KaiTi','STKaiti',serif;
        ">${item.cur >= 10 ? '已满级' : '升级 💰' + cost}</button>
      </div>`;
  }

  html += '</div>';
  return html;
}

function statBarMini(value, color) {
  const pct = value * 10;
  return `<div style="height:4px;background:#E8E0D0;border-radius:2px;margin:3px 0;width:120px">
    <div style="width:${pct}%;height:100%;background:${color};border-radius:2px"></div>
  </div>`;
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
        showToast(`${key === 'agriculture' ? '农业' : key === 'commerce' ? '商业' : '城防'} 升级至 ${city[key]} 级`);
        const updatedCity = _state.cities[city.id];
        const updatedFaction = _state.factions[city.owner];
        const governor = updatedCity.governor ? _state.generals[updatedCity.governor] : null;
        render(updatedCity, updatedFaction, governor);
      } else {
        showToast('资金不足！');
      }
    };
  });
}

// ============================================================
//  标签 4：人事（任命太守）
// ============================================================

function renderGovernor(city, faction) {
  if (!faction) return emptyState('此城无主，无法任命');

  const allGenerals = _state ? Object.values(_state.generals) : [];
  const factionGenerals = allGenerals.filter(g => g.factionId === faction.id);

  if (factionGenerals.length === 0) {
    return emptyState('本势力暂无武将，可到「内政」页招募');
  }

  const currentGov = city.governor;

  let html = '<div style="display:flex;flex-direction:column;gap:6px;max-height:240px;overflow-y:auto">';

  for (const g of factionGenerals) {
    const isCurrent = g.id === currentGov;
    const otherCity = findCityGovernedBy(g.id);
    const busy = otherCity && otherCity !== city.id;

    html += `
      <div style="display:flex;align-items:center;justify-content:space-between;
        background:${isCurrent ? 'rgba(196,58,48,0.06)' : 'rgba(247,242,232,0.8)'};
        border:1px solid ${isCurrent ? '#C43A30' : '#D4C5A0'};
        border-radius:6px;padding:10px 12px">
        <div>
          <div style="font-size:14px;color:${isCurrent ? '#C43A30' : '#3D2B1F'};font-weight:bold;font-family:'KaiTi','STKaiti',serif">
            ${g.name} ${isCurrent ? '· 现任' : ''}
          </div>
          <div style="font-size:11px;color:#6B5B4F">
            统${g.leadership} 武${g.might} 智${g.intelligence} 政${g.politics} · 忠${g.loyalty}
            ${busy ? `<span style="color:#C43A30"> · 已在「${otherCity.name}」</span>` : ''}
          </div>
        </div>
        ${isCurrent ? `
          <button class="btn-dismiss-gov" data-gid="${g.id}" style="
            padding:6px 14px;background:#C43A30;color:#F7F2E8;
            border:1px solid rgba(0,0,0,0.15);border-radius:4px;
            cursor:pointer;font-size:13px;font-family:'KaiTi','STKaiti',serif">解任</button>
        ` : (busy ? '' : `
          <button class="btn-assign-gov" data-gid="${g.id}" style="
            padding:6px 14px;background:#4A6B8A;color:#F7F2E8;
            border:1px solid rgba(0,0,0,0.15);border-radius:4px;
            cursor:pointer;font-size:13px;font-family:'KaiTi','STKaiti',serif">任命</button>
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
      showToast(`已任命 ${g?.name || ''} 为 ${city.name} 太守`);
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
      render(city, faction, null);
    };
  });
}

// ============================================================
//  标签 5：内政（税率 + 招将）
// ============================================================

function renderInternal(city, faction) {
  if (!faction) return emptyState('此城无主');

  const taxRate = city.taxRate ?? 30;
  const income = Math.floor(city.population / 1000 * city.commerce * taxRate / 100);

  let html = `
    ${/* 税率 */''}
    <div style="font-size:14px;color:#3D2B1F;font-weight:bold;font-family:'KaiTi','STKaiti',serif;margin-bottom:8px">💰 税率调节</div>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
      <span style="font-size:12px;color:#6B5B4F">当前：</span>
      <b style="font-size:20px;color:#C43A30;font-family:'KaiTi','STKaiti',serif">${taxRate}%</b>
    </div>
    <div style="display:flex;gap:4px;margin-bottom:6px">`;

  for (const rate of [10, 20, 30, 40, 50]) {
    const active = taxRate === rate;
    html += `<button class="btn-tax" data-rate="${rate}" style="
      flex:1;padding:8px 0;font-size:14px;
      background:${active ? '#C43A30' : '#E8E0D0'};
      color:${active ? '#F7F2E8' : '#6B5B4F'};
      border:1px solid ${active ? '#A83227' : '#D4C5A0'};
      border-radius:4px;cursor:pointer;font-family:'KaiTi','STKaiti',serif;
    ">${rate}%</button>`;
  }

  html += `</div>
    <div style="font-size:12px;color:#6B5B4F;margin-bottom:2px">
      预计收入：<b style="color:#C43A30">${income}</b> 金/回合
      ${taxRate >= 40 ? '<span style="color:#C43A30"> ⚠️ 高税率降低民心</span>' : ''}
    </div>`;

  // 招将
  html += `
    <div style="margin-top:16px;padding-top:10px;border-top:1px dashed #D4C5A0">
      <div style="font-size:14px;color:#3D2B1F;font-weight:bold;font-family:'KaiTi','STKaiti',serif;margin-bottom:4px">🎯 招募武将</div>
      <div style="font-size:11px;color:#6B5B4F;margin-bottom:6px">消耗 800 金币，随机招募一位武将加入本势力</div>
      <button class="btn-recruit-gen" style="
        padding:8px 20px;background:#4A6B8A;color:#F7F2E8;
        border:1px solid rgba(0,0,0,0.15);border-radius:4px;
        cursor:pointer;font-size:14px;font-family:'KaiTi','STKaiti',serif"
        ${(faction.gold || 0) >= 800 ? '' : 'disabled'}>
        ${(faction.gold || 0) >= 800 ? '招募 💰800' : '资金不足'}
      </button>
    </div>`;

  return html;
}

function bindInternalButtons(city, faction) {
  if (!_state || !faction) return;

  document.querySelectorAll('.btn-tax').forEach(btn => {
    btn.onclick = () => {
      const rate = parseInt(btn.dataset.rate);
      city.taxRate = rate;
      showToast(`税率已调整为 ${rate}%`);
      const updatedCity = _state.cities[city.id];
      const governor = updatedCity.governor ? _state.generals[updatedCity.governor] : null;
      render(updatedCity, faction, governor);
    };
  });

  const genBtn = document.querySelector('.btn-recruit-gen');
  if (genBtn) {
    genBtn.onclick = () => {
      if ((faction.gold || 0) < 800) { showToast('资金不足！'); return; }
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
      showToast(`招募成功：${newGen.name} 加入！`);
      const updatedCity = _state.cities[city.id];
      render(updatedCity, faction, newGen);
    };
  }
}

// ============================================================
//  工具函数
// ============================================================

function emptyState(msg) {
  return `<div style="color:#6B5B4F;text-align:center;padding:40px 20px;font-family:'KaiTi','STKaiti',serif;font-size:15px">${msg}</div>`;
}
