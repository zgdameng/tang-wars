import Phaser from 'phaser';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    // 占位：菜单场景将在后续任务中实现
    this.add.text(640, 360, '唐末风云', { fontSize: '48px', color: '#ffffff' }).setOrigin(0.5);
  }
}
