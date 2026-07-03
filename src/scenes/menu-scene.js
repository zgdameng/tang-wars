import Phaser from 'phaser';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // 标题：金色大字 + 黑体 + 双层描边（先粗黑再细金）
    this.add.text(w / 2, 120, '唐末风云', {
      fontSize: '68px', color: '#eebb55', fontFamily: 'SimHei, STHeiti, Microsoft YaHei, sans-serif',
      stroke: '#000000', strokeThickness: 8
    }).setOrigin(0.5);

    // 副标题
    this.add.text(w / 2, 200, '公元八八零 · 天下大乱', {
      fontSize: '22px', color: '#ccaa44', fontFamily: 'SimHei, STHeiti, Microsoft YaHei, sans-serif',
      stroke: '#000000', strokeThickness: 4
    }).setOrigin(0.5);

    // 三个按钮
    this.createButton(w / 2, 320, '新 游 戏', () => {
      this.scene.start('MapScene');
    });

    this.createButton(w / 2, 400, '读 取 存 档', () => {
      this.showNotice('存档功能尚未开放');
    });

    this.createButton(w / 2, 480, '游 戏 说 明', () => {
      this.showNotice('唐末五代，天下大乱。选择势力，征战天下，一统江山。');
    });
  }

  // 画一个按钮：深色底框 + 文字，hover 高亮
  createButton(x, y, label, callback) {
    const bg = this.add.rectangle(x, y, 240, 50, 0x333344)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => bg.setFillStyle(0x444466))
      .on('pointerout', () => bg.setFillStyle(0x333344))
      .on('pointerdown', callback);

    this.add.text(x, y, label, {
      fontSize: '24px', color: '#eebb55', fontFamily: 'SimHei, Microsoft YaHei, sans-serif',
      stroke: '#000000', strokeThickness: 4
    }).setOrigin(0.5);

    return bg;
  }

  // 在屏幕底部弹出提示，2 秒后消失
  showNotice(msg) {
    const w = this.cameras.main.width;
    const tip = this.add.text(w / 2, 600, msg, {
      fontSize: '16px', color: '#ccaa44', backgroundColor: '#1a1a2e',
      padding: { x: 16, y: 8 }, stroke: '#000000', strokeThickness: 2
    }).setOrigin(0.5).setDepth(100);

    this.time.delayedCall(2000, () => tip.destroy());
  }
}
