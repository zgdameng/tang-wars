import Phaser from 'phaser';
import { showFactionSelect, hideFactionSelect } from '../ui/faction-select.js';
import { showLoadPanel, hideSavePanel } from '../ui/save-panel.js';
import { showHelpPanel, hideHelpPanel } from '../ui/help-panel.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // 标题：金色大字 + 黑体 + 双层描边（先粗黑再细金）
    const title = this.add.text(w / 2, 120, '唐末风云', {
      fontSize: '68px', color: '#C43A30', fontFamily: 'KaiTi, STKaiti, SimSun, serif',
      stroke: '#3D2B1F', strokeThickness: 6
    }).setOrigin(0.5).setAlpha(0).setScale(0.5);
    // 标题淡入动画
    this.tweens.add({ targets: title, alpha: 1, scaleX: 1, scaleY: 1, duration: 600, ease: 'Back.easeOut' });

    // 副标题
    const sub = this.add.text(w / 2, 200, '公元八八零 · 天下大乱', {
      fontSize: '22px', color: '#3D2B1F', fontFamily: 'KaiTi, STKaiti, SimSun, serif',
      stroke: '#F0E8D8', strokeThickness: 3
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: sub, alpha: 1, duration: 500, delay: 200 });

    // 三个按钮——放在画布内部（用 Phaser text），不再用 DOM 避免手机竖屏重叠
    const btnYStart = h * 0.50;
    const btnGap = h * 0.10;
    this._menuBtns = [];
    this._menuBtns.push(this.createPhaserBtn(this, w / 2, btnYStart, '新 游 戏', () => {
      showFactionSelect((chosenId) => {
        this.scene.start('MapScene', { playerFactionId: chosenId });
      });
    }));
    this._menuBtns.push(this.createPhaserBtn(this, w / 2, btnYStart + btnGap, '读 取 存 档', () => {
      showLoadPanel((loadedState) => {
        this.scene.start('MapScene', { savedGame: loadedState });
      });
    }));
    this._menuBtns.push(this.createPhaserBtn(this, w / 2, btnYStart + btnGap * 2, '游 戏 说 明', () => {
      showHelpPanel();
    }));

    // 切走场景时清理 DOM 面板
    this.events.on('shutdown', () => {
      hideFactionSelect();
      hideSavePanel();
      hideHelpPanel();
    });
  }

  // Phaser 画布内按钮——跟随画布缩放，手机竖屏不重叠
  createPhaserBtn(scene, x, y, label, callback) {
    const bw = 260, bh = 52;
    const bg = scene.add.graphics();
    const drawBtn = (hover) => {
      bg.clear();
      bg.fillStyle(hover ? 0xE0D8C8 : 0xF7F2E8, 0.96);
      bg.fillRoundedRect(x - bw/2, y - bh/2, bw, bh, 8);
      bg.lineStyle(2, hover ? 0xC43A30 : 0xD4C5A0, 1);
      bg.strokeRoundedRect(x - bw/2, y - bh/2, bw, bh, 8);
    };
    drawBtn(false);

    const txt = scene.add.text(x, y, label, {
      fontSize: '24px', color: '#3D2B1F',
      fontFamily: 'KaiTi, STKaiti, SimSun, serif'
    }).setOrigin(0.5);

    // 用透明矩形做点击区域
    const hit = scene.add.rectangle(x, y, bw, bh, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => drawBtn(true));
    hit.on('pointerout', () => drawBtn(false));
    hit.on('pointerup', callback);

    return { graphics: bg, text: txt, hit };
  }

  // 在屏幕底部弹出提示，2 秒后消失
  showNotice(msg) {
    const w = this.cameras.main.width;
    const tip = this.add.text(w / 2, 600, msg, {
      fontSize: '16px', color: '#3D2B1F', backgroundColor: '#F7F2E8',
      padding: { x: 16, y: 8 }, stroke: '#D4C5A0', strokeThickness: 2
    }).setOrigin(0.5).setDepth(100);

    this.time.delayedCall(2000, () => tip.destroy());
  }
}
