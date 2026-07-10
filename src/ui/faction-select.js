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
    width: 620px; max-width: 96vw; max-height: 92vh; overflow-y: auto;
    background: rgba(247,242,232,0.97); border: 2px solid #D4C5A0;
    border-radius: 8px; padding: 16px; color: #3D2B1F;
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

  // 注入 CSS hover 规则（用 CSS 变量控制高亮色，比 JS 事件更可靠）
  if (!document.getElementById('faction-card-style')) {
    const style = document.createElement('style');
    style.id = 'faction-card-style';
    style.textContent = '.faction-card { transition: border-color 0.2s, transform 0.15s; } .faction-card:hover, .faction-card:active { border-color: var(--hc) !important; transform: translateY(-2px); }';
    document.head.appendChild(style);
  }

  // 势力特色描述
  const descMap = {
    'li-keyong': '沙陀飞虎 · 骑兵无双',
    'zhu-wen': '宣武霸主 · 兵力雄厚',
    'li-maozhen': '凤翔铁壁 · 易守难攻',
    'yang-xingmi': '淮南富甲 · 钱粮充足',
    'wang-jian': '西川潜龙 · 偏安蓄势',
    'qian-liu': '镇海水师 · 江南屏障',
    'ind-minor-1': '幽州边镇 · 河朔劲旅',
    'ind-minor-2': '镇州藩镇 · 河北强兵',
    'ind-minor-3': '魏博牙兵 · 骄兵悍将'
  };

  let cardsHtml = '';
  for (const f of factionsData) {
    const bg = toHex(f.color);
    const tagline = descMap[f.id] || '';
    // 变暗版势力色（铜镜暗面）
    const darkBg = '#' + Math.floor((f.color >> 16 & 0xff) * 0.65).toString(16).padStart(2,'0')
                      + Math.floor((f.color >> 8 & 0xff) * 0.65).toString(16).padStart(2,'0')
                      + Math.floor((f.color & 0xff) * 0.65).toString(16).padStart(2,'0');
    cardsHtml += `
      <div class="faction-card" data-fid="${f.id}" style="
        --hc:${bg}; background: #F7F2E8; border: 2px solid #D4C5A0; border-radius: 10px;
        padding: 14px 10px 12px; cursor: pointer; text-align: center;
      ">
        <!-- 铜镜肖像环 -->
        <div style="
          width:68px; height:68px; border-radius:50%; margin:0 auto 10px;
          background: conic-gradient(${bg} 0deg 180deg, ${darkBg} 180deg 360deg);
          border: 3px solid #B8960C; box-shadow: 0 0 0 3px #D4C5A0, 0 3px 10px rgba(61,43,31,0.2);
          display:flex; align-items:center; justify-content:center;
        ">
          <span style="font-size:34px; color:#F7F2E8; font-weight:bold;
            font-family:'KaiTi','STKaiti','SimSun',serif;
            text-shadow: 0 1px 3px rgba(0,0,0,0.3);">${f.name[0]}</span>
        </div>
        <div style="font-size:17px;color:#3D2B1F;font-weight:bold;font-family:'KaiTi','STKaiti',serif">${f.name}</div>
        <div style="font-size:11px;color:#6B5B4F;margin:4px 0 6px">${tagline}</div>
        <div style="font-size:12px;color:#6B5B4F">
          💰${f.gold.toLocaleString()} · 👑${f.prestige}
        </div>
      </div>`;
  }

  // 手机窄屏用2列，宽屏用3列
  const cols = window.innerWidth < 500 ? 2 : 3;

  panel.innerHTML = `
    <div style="font-size:22px;color:#C43A30;font-weight:bold;margin-bottom:16px;text-align:center;font-family:'KaiTi','STKaiti',serif">
      选择势力
    </div>
    <div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:10px">
      ${cardsHtml}
    </div>
    <div style="margin-top:16px;text-align:right">
      <button id="btn-faction-close" style="
        padding:6px 22px;background:#D4C5A0;color:#3D2B1F;border:1px solid #B8960C;
        border-radius:4px;cursor:pointer;font-size:14px;font-family:'KaiTi','STKaiti',serif
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
