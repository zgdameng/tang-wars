import Phaser from 'phaser';
import { BootScene } from './scenes/boot-scene.js';
import { MenuScene } from './scenes/menu-scene.js';
import { MapScene } from './scenes/map-scene.js';
import { BattleScene } from './scenes/battle-scene.js';

const config = {
  type: Phaser.CANVAS,  // Canvas 对中文渲染比 WebGL 好，不裁切文字
  width: window.innerWidth,
  height: window.innerHeight,
  parent: 'game-container',
  backgroundColor: '#F0E8D8',
  scene: [BootScene, MenuScene, MapScene, BattleScene],
  scale: {
    mode: Phaser.Scale.RESIZE,  // 画布填满屏幕，横竖屏都无黑边
    autoCenter: Phaser.Scale.NO_CENTER
  },
  input: {
    activePointers: 3
  }
};

const game = new Phaser.Game(config);

// 手机触屏：JS 侧强制禁止浏览器手势
game.events.on('ready', () => {
  const canvas = game.canvas;
  if (canvas) {
    canvas.style.touchAction = 'none';
    canvas.style.msTouchAction = 'none';
  }
});
