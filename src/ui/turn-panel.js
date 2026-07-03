/**
 * 回合面板——右下角的固定小面板，显示回合数和"结束回合"按钮。
 * 用 HTML DOM 覆盖在游戏画面上。
 */

let panelEl = null;
let turnLabel = null;

export function createTurnPanel(onEndTurn) {
  if (panelEl) return panelEl;

  panelEl = document.createElement('div');
  panelEl.id = 'turn-panel';
  panelEl.style.cssText = `
    position: fixed; bottom: 16px; right: 16px;
    display: flex; align-items: center; gap: 12px;
    background: rgba(15, 15, 30, 0.92); border: 1px solid #665522;
    border-radius: 6px; padding: 10px 18px; color: #ccaa44;
    font-family: 'Microsoft YaHei', sans-serif; z-index: 500;
  `;

  turnLabel = document.createElement('span');
  turnLabel.id = 'turn-label';
  turnLabel.textContent = '第 1 回合';
  turnLabel.style.fontSize = '15px';

  const btn = document.createElement('button');
  btn.textContent = '结束回合';
  btn.style.cssText = `
    padding: 6px 18px; background: #443322; color: #ccaa44;
    border: 1px solid #665522; border-radius: 4px;
    cursor: pointer; font-size: 14px;
  `;
  btn.onmouseenter = () => { btn.style.background = '#554433'; };
  btn.onmouseleave = () => { btn.style.background = '#443322'; };
  btn.onclick = onEndTurn;

  panelEl.appendChild(turnLabel);
  panelEl.appendChild(btn);
  document.body.appendChild(panelEl);
  return panelEl;
}

export function setTurnDisplay(turn) {
  if (turnLabel) {
    turnLabel.textContent = `第 ${turn} 回合`;
  }
}

export function removeTurnPanel() {
  if (panelEl && panelEl.parentNode) {
    panelEl.parentNode.removeChild(panelEl);
    panelEl = null;
    turnLabel = null;
  }
}
