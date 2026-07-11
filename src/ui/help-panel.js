/**
 * 游戏说明面板——DOM 覆盖层。
 * 从菜单的"游戏说明"按钮打开。
 */

let panelEl = null;

function getPanel() {
  if (panelEl) return panelEl;
  panelEl = document.createElement('div');
  panelEl.id = 'help-panel';
  panelEl.style.cssText = `
    display:none; position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
    width: min(560px, 95vw); max-height: 85vh; overflow-y: auto;
    background:rgba(247,242,232,0.97); border:2px solid #D4C5A0;
    border-radius:8px; padding:22px; color:#3D2B1F;
    font-family:'Microsoft YaHei',sans-serif; z-index:1000; user-select:none;
    line-height:1.8;
  `;
  document.body.appendChild(panelEl);
  return panelEl;
}

export function showHelpPanel() {
  const panel = getPanel();
  panel.innerHTML = `
    <h2 style="color:#C43A30;margin:0 0 12px;border-bottom:1px solid #D4C5A0;padding-bottom:10px;font-family:'KaiTi','STKaiti',serif">📖 唐末风云 · 游戏说明</h2>

    <h3 style="color:#C43A30;font-size:15px">🎯 游戏目标</h3>
    <p style="font-size:13px;color:#3D2B1F;margin:4px 0 12px">
      唐末天下大乱，群雄割据。选择一方势力，发展城池、招募军队、
      征战四方，最终统一天下。
    </p>

    <h3 style="color:#C43A30;font-size:15px">🏙️ 城池经营</h3>
    <p style="font-size:13px;color:#3D2B1F;margin:4px 0 12px">
      点击城池可打开内政面板：<br>
      · <b>征兵</b>：消耗金币和人口招募步兵/骑兵/弓兵<br>
      · <b>建设</b>：升级农业(人口增长)、商业(金币收入)、城防(守城加成)<br>
      · <b>人事</b>：任命武将担任太守——政治高的武将更适合守城
    </p>

    <h3 style="color:#C43A30;font-size:15px">⚔️ 兵种克制</h3>
    <p style="font-size:13px;color:#3D2B1F;margin:4px 0 12px">
      🛡️ 步兵克 🐎 骑兵 → 🐎 骑兵克 🏹 弓兵 → 🏹 弓兵克 🛡️ 步兵<br>
      克制方攻击力 +50%，善用克制可扭转战局。
    </p>

    <h3 style="color:#C43A30;font-size:15px">🗺️ 部队移动</h3>
    <p style="font-size:13px;color:#3D2B1F;margin:4px 0 12px">
      点击部队可查看详情。行军速度取决于兵种——骑兵最快、弓兵次之、步兵最慢。
      两支敌对部队相遇时自动触发战斗。
    </p>

    <h3 style="color:#C43A30;font-size:15px">🤝 外交</h3>
    <p style="font-size:13px;color:#3D2B1F;margin:4px 0 12px">
      点右下角"外交"按钮可查看所有势力关系：<br>
      · <b>结盟</b>：需要关系值 > 0，结盟后互不攻击<br>
      · <b>宣战</b>：开战后可攻击对方城池和部队<br>
      · <b>求和</b>：战争中可求和，需要关系值 > -30<br>
      · <b>撕毁盟约</b>：声望 -100，大幅降低其他势力好感
    </p>

    <h3 style="color:#C43A30;font-size:15px">🔄 回合制</h3>
    <p style="font-size:13px;color:#3D2B1F;margin:4px 0 12px">
      点右下角"下回合"按钮推进时间。每回合自动结算：<br>
      · 所有城池人口增长 + 金币收入<br>
      · AI 势力执行内政和军事行动<br>
      · 行军中的部队前进<br>
      · 遭遇战自动触发<br>
      · 回合结束自动存档
    </p>

    <h3 style="color:#C43A30;font-size:15px">👤 武将属性</h3>
    <p style="font-size:13px;color:#3D2B1F;margin:4px 0 12px">
      · <b>统率</b>：决定带兵上限（每点统率 = 100兵）<br>
      · <b>武力</b>：影响单挑和攻击力加成<br>
      · <b>智力</b>：影响计谋成功率和防御<br>
      · <b>政治</b>：担任太守时提升城池发展速度<br>
      · <b>忠诚</b>：低于30可能反叛独立
    </p>

    <h3 style="color:#C43A30;font-size:15px">💾 存档</h3>
    <p style="font-size:13px;color:#3D2B1F;margin:4px 0 12px">
      5个存档位。每回合结束自动存档到第1位。
      点击右下角"存档"按钮可手动保存/读取/删除存档。
    </p>

    <div style="margin-top:16px;text-align:right;border-top:1px solid #D4C5A0;padding-top:10px">
      <button id="btn-help-close" style="
        padding:6px 28px;background:#C43A30;color:#F7F2E8;border:1px solid #A83227;
        border-radius:4px;cursor:pointer;font-size:15px;font-family:'KaiTi','STKaiti',serif
      ">知道了</button>
    </div>
  `;

  document.getElementById('btn-help-close').onclick = hideHelpPanel;
  panel.style.display = 'block';
}

export function hideHelpPanel() {
  if (panelEl) panelEl.style.display = 'none';
}
