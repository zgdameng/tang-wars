/**
 * 存档/读档面板——用 HTML DOM 覆盖在画面上。
 * 两种模式：读档（菜单进入）+ 存档（地图进入）。
 */

import { saveGame, loadGame, listSaves, deleteSave } from '../logic/save-load.js';

let panelEl = null;
let currentMode = null; // 'load' | 'save'
let currentState = null; // 存档模式下的游戏状态
let onLoadCallback = null; // 读档模式下的回调

function getPanel() {
  if (panelEl) return panelEl;

  panelEl = document.createElement('div');
  panelEl.id = 'save-panel';
  panelEl.style.cssText = `
    display: none;
    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
    width: min(480px, 95vw); max-height: 85vh; overflow-y: auto;
    background: rgba(247,242,232,0.97); border: 2px solid #D4C5A0;
    border-radius: 8px; padding: 18px; color: #3D2B1F;
    font-family: 'Microsoft YaHei', sans-serif; z-index: 1000; user-select: none;
  `;
  document.body.appendChild(panelEl);
  return panelEl;
}

/** 格式化日期字符串 */
function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${mm}-${dd} ${hh}:${mi}`;
}

/** 渲染面板内容 */
function renderContent() {
  if (!panelEl) return;
  const saves = listSaves();
  const mode = currentMode;
  const title = mode === 'load' ? '读取存档' : '保存游戏';

  // 把已有存档建个按 slot 索引的 Map
  const saveMap = {};
  for (const s of saves) {
    saveMap[s.slot] = s;
  }

  let rowsHtml = '';
  for (let slot = 1; slot <= 5; slot++) {
    const info = saveMap[slot];

    if (info) {
      // 已有存档
      const turnStr = `第 ${info.turn} 回合`;
      const dateStr = fmtDate(info.savedAt);

      let actionBtns = '';
      if (mode === 'load') {
        actionBtns = `<button data-load="${slot}" style="
          padding:3px 12px;background:#4A6B8A;color:#F7F2E8;border:1px solid #3A5A7A;
          border-radius:3px;cursor:pointer;font-size:12px">读取</button>`;
      } else {
        actionBtns = `
          <button data-overwrite="${slot}" style="
            padding:3px 10px;background:#C43A30;color:#F7F2E8;border:1px solid #A83227;
            border-radius:3px;cursor:pointer;font-size:12px;margin-right:4px">覆盖</button>
          <button data-delete="${slot}" style="
            padding:3px 10px;background:#B8960C;color:#F7F2E8;border:1px solid #9A7E0A;
            border-radius:3px;cursor:pointer;font-size:12px">删除</button>`;
      }

      rowsHtml += `
        <div style="display:flex;align-items:center;justify-content:space-between;
          background:#F0E8D8;border:1px solid #D4C5A0;border-radius:6px;
          padding:10px 14px">
          <span style="color:#3D2B1F;font-weight:bold;min-width:40px">[${slot}]</span>
          <span style="flex:1;margin-left:12px;font-size:14px">${info.name}</span>
          <span style="color:#6B5B4F;margin:0 12px;font-size:12px">${turnStr}</span>
          <span style="color:#6B5B4F;margin-right:12px;font-size:11px">${dateStr}</span>
          ${actionBtns}
        </div>`;
    } else {
      // 空存档位
      if (mode === 'load') {
        rowsHtml += `
          <div style="display:flex;align-items:center;
            background:#F0E8D8;border:1px dashed #D4C5A0;border-radius:6px;
            padding:10px 14px;color:#6B5B4F">
            <span style="min-width:40px;color:#6B5B4F">[${slot}]</span>
            <span style="margin-left:12px">空</span>
          </div>`;
      } else {
        rowsHtml += `
          <div style="display:flex;align-items:center;
            background:#F0E8D8;border:1px dashed #D4C5A0;border-radius:6px;
            padding:10px 14px">
            <span style="color:#6B5B4F;min-width:40px">[${slot}]</span>
            <input type="text" id="save-name-${slot}" placeholder="输入存档名"
              style="flex:1;margin:0 12px;padding:4px 8px;background:#F7F2E8;color:#3D2B1F;
              border:1px solid #D4C5A0;border-radius:3px;font-size:13px;font-family:inherit">
            <button data-save-new="${slot}" style="
              padding:3px 14px;background:#C43A30;color:#F7F2E8;border:1px solid #A83227;
              border-radius:3px;cursor:pointer;font-size:12px">保存</button>
          </div>`;
      }
    }
  }

  panelEl.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;border-bottom:1px solid #D4C5A0;padding-bottom:10px">
      <span style="font-size:22px;color:#C43A30;font-weight:bold;font-family:'KaiTi','STKaiti',serif">${title}</span>
      <button id="btn-save-close" style="
        padding:6px 22px;background:#D4C5A0;color:#3D2B1F;border:1px solid #B8960C;
        border-radius:4px;cursor:pointer;font-size:14px">关闭</button>
    </div>
    <div style="display:flex;flex-direction:column;gap:8px">
      ${rowsHtml}
    </div>
  `;

  // 关闭按钮
  document.getElementById('btn-save-close').onclick = hideSavePanel;

  // 绑定各按钮
  bindButtons();
}

/** 绑定操作按钮事件 */
function bindButtons() {
  if (!panelEl) return;

  // 读档按钮
  panelEl.querySelectorAll('[data-load]').forEach(btn => {
    const slot = parseInt(btn.getAttribute('data-load'));
    btn.onclick = () => {
      const state = loadGame(slot);
      if (state && onLoadCallback) {
        panelEl.style.display = 'none';
        onLoadCallback(state);
      }
    };
  });

  // 保存新档按钮
  panelEl.querySelectorAll('[data-save-new]').forEach(btn => {
    const slot = parseInt(btn.getAttribute('data-save-new'));
    btn.onclick = () => {
      const input = document.getElementById(`save-name-${slot}`);
      const name = input ? input.value.trim() : '';
      if (!name) { alert('请输入存档名'); return; }
      if (!currentState) return;
      const result = saveGame(currentState, slot, name);
      if (result.success) {
        renderContent();
      } else {
        alert(result.error || '保存失败');
      }
    };
  });

  // 覆盖按钮
  panelEl.querySelectorAll('[data-overwrite]').forEach(btn => {
    const slot = parseInt(btn.getAttribute('data-overwrite'));
    btn.onclick = () => {
      if (!currentState) return;
      // 找到原有的存档名
      const saves = listSaves();
      const old = saves.find(s => s.slot === slot);
      const name = old ? old.name : '存档';
      if (!confirm(`确定要覆盖「${name}」吗？`)) return;
      saveGame(currentState, slot, name);
      renderContent();
    };
  });

  // 删除按钮
  panelEl.querySelectorAll('[data-delete]').forEach(btn => {
    const slot = parseInt(btn.getAttribute('data-delete'));
    btn.onclick = () => {
      if (!confirm('确定要删除这个存档吗？')) return;
      deleteSave(slot);
      renderContent();
    };
  });
}

/** 弹出读档面板 */
export function showLoadPanel(onLoad) {
  currentMode = 'load';
  currentState = null;
  onLoadCallback = onLoad;
  getPanel();
  renderContent();
  panelEl.style.display = 'block';
}

/** 弹出存档面板 */
export function showSavePanel(state, onComplete) {
  currentMode = 'save';
  currentState = state;
  onLoadCallback = null;
  getPanel();
  renderContent();
  panelEl.style.display = 'block';
}

/** 关闭面板 */
export function hideSavePanel() {
  if (panelEl) panelEl.style.display = 'none';
}
