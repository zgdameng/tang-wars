import Phaser from 'phaser';
import { BootScene } from './scenes/boot-scene.js';
import { MenuScene } from './scenes/menu-scene.js';
import { MapScene } from './scenes/map-scene.js';
import { BattleScene } from './scenes/battle-scene.js';

const config = {
  type: Phaser.CANVAS,  // Canvas 对中文渲染比 WebGL 好，不裁切文字
  width: 1280,
  height: 720,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  scene: [BootScene, MenuScene, MapScene, BattleScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};

new Phaser.Game(config);
