import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // 第一期没有外部图片资源（用彩色方块代替美工）
    // 留一个加载进度条，为以后添加图片做准备
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const bar = this.add.graphics();
    this.load.on('progress', (val) => {
      bar.clear();
      bar.fillStyle(0xccaa44, 1);
      bar.fillRect(w / 2 - 150, h / 2 - 10, 300 * val, 20);
    });
  }

  create() {
    this.scene.start('MenuScene');
  }
}
