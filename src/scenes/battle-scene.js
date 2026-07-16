import Phaser from 'phaser';
import { createBattleState, checkBattleEnd } from '../logic/battle/battle-state.js';
import { getDamage } from '../logic/battle/battle-units.js';
import { getBattlePalette, getRidgeTrianglePoints, getBattleFormationOffsets, getBattleDustOffsets } from '../rendering/battle-visuals.js';

const UNIT_ICONS = {
  infantry: '🛡️', cavalry: '🐎', archer: '🏹'
};
const UNIT_NAMES = {
  infantry: '步兵', cavalry: '骑兵', archer: '弓兵'
};
const TERRAIN_NAMES = { plains: '平原', hills: '山地', river: '河畔', forest: '森林' };

export class BattleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BattleScene' });
  }

  init(data) {
    // data 可能是 { encounter: {...} } 包装对象，解包取出真正的遭遇战数据
    this.encounter = data.encounter || data;
    console.log('[DEBUG] BattleScene.init, data keys=', Object.keys(data), 'encounter type=', this.encounter?.type);
  }

  create() {
    console.log('[DEBUG] BattleScene.create 开始');
    const W = 1024, H = 768;
    this.cameras.main.setBackgroundColor('#1a2218');

    const enc = this.encounter;
    console.log('[DEBUG] enc=', {type: enc?.type, isSiege: enc?.isSiege, atk: !!enc?.attacker, def: !!enc?.defender});
    // 兼容两种命名：isSiege（布尔）或 type（'siege'/'field'）
    const isSiege = enc.isSiege || enc.type === 'siege';
    console.log('[DEBUG] isSiege=', isSiege, 'atkFactionId=', enc?.attacker?.factionId);

    this.battle = createBattleState({
      terrain: enc.terrain || 'plains',
      isSiege: !!isSiege,
      attackerFactionId: enc.attacker.factionId,
      attackerGeneralId: enc.attacker.generalId,
      attackerUnits: enc.attacker.units,
      defenderFactionId: isSiege ? enc.defender.owner : enc.defender.factionId,
      defenderGeneralId: enc.defender.generalId,
      defenderUnits: isSiege
        ? [{ type: 'infantry', count: 2000, morale: 80, exp: 0 }]
        : enc.defender.units,
    });

    // 背景——地形示意
    const terrain = enc.terrain || 'plains';
    const palette = getBattlePalette(terrain);
    this.cameras.main.setBackgroundColor(palette.sky);
    this.add.rectangle(W / 2, H / 2, W, H, palette.ground, 1);
    const leftRidge = getRidgeTrianglePoints('left');
    const rightRidge = getRidgeTrianglePoints('right');
    this.add.triangle(W * 0.22, H * 0.42, ...leftRidge.flatMap(point => [point.x, point.y]), palette.ridge, 0.72);
    this.add.triangle(W * 0.78, H * 0.42, ...rightRidge.flatMap(point => [point.x, point.y]), palette.ridge, 0.72);
    this.add.rectangle(W / 2, H * 0.72, W, 110, palette.dust, 0.22);

    // 中间分隔线
    this.add.line(W / 2, 100, 0, 0, 0, H - 200, 0x444422, 0.4);

    // 战斗日志区（左下）
    this.battleLog = [];
    this.logTexts = [];

    // 兵种图标
    this.unitSprites = [];
    const atkColor = 0xcc4433;
    const defColor = 0x3355cc;

    // 攻方在左，守方在右
    const atkUnits = this.battle.attacker.units.filter(u => u.count > 0);
    const defUnits = this.battle.defender.units.filter(u => u.count > 0);

    atkUnits.forEach((u, i) => {
      const x = 76 + i * 78;
      const y = 400 - (atkUnits.length - 1) * 40 + i * 80;
      this.createBattleCard(u, x, y, atkColor, 'attacker');
    });

    defUnits.forEach((u, i) => {
      const x = W - 76 - i * 78;
      const y = 400 - (defUnits.length - 1) * 40 + i * 80;
      this.createBattleCard(u, x, y, defColor, 'defender');
    });

    // 顶部 HUD
    this.createHUD(W);

    // 撤退按钮
    this.add.text(20, H - 40, '⚑ 撤退', {
      fontSize: '20px', color: '#ff8866', stroke: '#000', strokeThickness: 3,
      fontFamily: '"Microsoft YaHei",sans-serif'
    }).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.endBattle('defender'))
      .on('pointerover', function () { this.setColor('#ff4444'); })
      .on('pointerout', function () { this.setColor('#ff8866'); });

    // 自动战斗按钮
    this.add.text(W - 120, H - 40, '⚡ 自动', {
      fontSize: '18px', color: '#cccc88', stroke: '#000', strokeThickness: 3,
      fontFamily: '"Microsoft YaHei",sans-serif'
    }).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { this.autoMode = !this.autoMode; })
      .on('pointerover', function () { this.setColor('#ffff88'); })
      .on('pointerout', function () { this.setColor('#cccc88'); });

    this.autoMode = true;   // 默认自动战斗，避免低帧率下战斗卡住
    this.battleSpeed = 5;   // 5倍速
    this.timeAccum = 0;

    // 用 setInterval 驱动战斗模拟，不受 requestAnimationFrame 帧率影响
    this._battleTimer = this.time.addEvent({
      delay: 100,           // 每 100ms 推进一步
      loop: true,
      callback: () => this.battleTick(0.1)
    });

    // 胜负显示（初始隐藏）
    this.resultText = this.add.text(W / 2, H / 2, '', {
      fontSize: '48px', color: '#ffcc44', stroke: '#000', strokeThickness: 5,
      fontFamily: '"Microsoft YaHei",sans-serif'
    }).setOrigin(0.5).setDepth(100).setVisible(false);
  }

  createBattleCard(unit, x, y, color, side) {
    const formationX = side === 'attacker' ? x + 170 : x - 170;
    const formation = this.createBattleFormation(formationX, y, color, side);
    const card = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 62, 86, 0x111122, 0.92)
      .setStrokeStyle(2, color);
    card.add(bg);

    // 兵种大图标
    const icon = this.add.text(0, -24, UNIT_ICONS[unit.type] || '⚔️', {
      fontSize: '24px'
    }).setOrigin(0.5);
    card.add(icon);

    // 兵种名
    const name = this.add.text(0, 0, UNIT_NAMES[unit.type] || unit.type, {
      fontSize: '11px', color: '#ccaa44', fontFamily: '"Microsoft YaHei",sans-serif'
    }).setOrigin(0.5);
    card.add(name);

    // 兵力数字
    const countText = this.add.text(0, 17, `${unit.count}`, {
      fontSize: '15px', color: '#fff', fontFamily: '"Microsoft YaHei",sans-serif'
    }).setOrigin(0.5);
    card.add(countText);

    // 血条背景
    const hpBg = this.add.rectangle(0, 32, 48, 5, 0x333333);
    card.add(hpBg);
    // 血条
    const hpBar = this.add.rectangle(-24, 32, 48, 5, 0x00cc00).setOrigin(0, 0.5);
    card.add(hpBar);
    // 士气条背景
    const morBg = this.add.rectangle(0, 41, 48, 4, 0x333333);
    card.add(morBg);
    const morBar = this.add.rectangle(-24, 41, 48, 4, 0x4488cc).setOrigin(0, 0.5);
    card.add(morBar);

    card.setDepth(10);
    this.unitSprites.push({ container: card, formation, unit, hpBar, morBar, countText, side, color });
  }

  createBattleFormation(x, y, color, side) {
    const formation = this.add.container(x, y);
    const direction = side === 'attacker' ? 1 : -1;

    const mainPole = this.add.rectangle(-42 * direction, 6, 3, 78, 0x38291e);
    const mainFlag = this.add.triangle(-28 * direction, -22, 0, 0, 0, 26, 34 * direction, 13, color);
    const subPole = this.add.rectangle(42 * direction, 20, 2, 50, 0x38291e);
    const subFlag = this.add.triangle(52 * direction, 2, 0, 0, 0, 16, 22 * direction, 8, color, 0.78);
    formation.add([mainPole, mainFlag, subPole, subFlag]);

    for (const offset of getBattleFormationOffsets(side)) {
      const body = this.add.rectangle(offset.x, offset.y, 7, 12, 0x29251f);
      const head = this.add.circle(offset.x, offset.y - 8, 3, 0xd2b182);
      const shield = this.add.circle(offset.x + 4 * direction, offset.y + 1, 4, color);
      const spear = this.add.line(offset.x - 5 * direction, offset.y - 10, 0, 0, 11 * direction, -13, 0xb7a06b, 0.8).setLineWidth(1.5);
      formation.add([spear, body, head, shield]);
    }

    for (const dust of getBattleDustOffsets()) {
      formation.add(this.add.ellipse(dust.x, dust.y, 24, 7, 0xc5aa74, dust.alpha));
    }

    formation.setDepth(8);
    return formation;
  }

  createHUD(W) {
    const enc = this.encounter;
    const atkFid = enc.attacker.factionId || '攻方';
    // 守方可能是城池（有 owner）或部队（有 factionId）
    const defFid = enc.defender.owner || enc.defender.factionId || '守方';
    const terrainName = TERRAIN_NAMES[this.battle.terrain] || '平原';
    const battleType = this.battle.isSiege ? '🏰 攻城战' : '⚔️ 野战';

    this.add.text(W / 2, 12, `${battleType} · ${terrainName}`, {
      fontSize: '16px', color: '#ccaa44', stroke: '#000', strokeThickness: 2,
      fontFamily: '"Microsoft YaHei",sans-serif'
    }).setOrigin(0.5);

    this.add.text(20, 10, `🔴 ${atkFid}`, {
      fontSize: '14px', color: '#ff8888', stroke: '#000', strokeThickness: 2,
      fontFamily: '"Microsoft YaHei",sans-serif'
    });

    this.add.text(W - 20, 10, `🔵 ${defFid}`, {
      fontSize: '14px', color: '#8888ff', stroke: '#000', strokeThickness: 2,
      fontFamily: '"Microsoft YaHei",sans-serif'
    }).setOrigin(1, 0);
  }

  // 用 setInterval 驱动的战斗步骤，不依赖 requestAnimationFrame
  battleTick(dt) {
    if (this.battle.winner) {
      if (this._battleTimer) { this._battleTimer.destroy(); this._battleTimer = null; }
      return;
    }

    this.timeAccum += dt;

    // 自动模式下加速
    const simSpeed = this.autoMode ? 3 : this.battleSpeed;
    const simDt = dt * simSpeed;
    this.battle.time += simDt;

    const atkUnits = this.battle.attacker.units.filter(u => u.count > 0 && u.morale > 0);
    const defUnits = this.battle.defender.units.filter(u => u.count > 0 && u.morale > 0);

    for (const unit of [...atkUnits, ...defUnits]) {
      const enemies = unit.side === 'attacker' ? defUnits : atkUnits;
      if (enemies.length === 0) continue;

      // 最近敌人
      const sprite = this.findSprite(unit);
      if (!sprite) continue;

      let closest = enemies[0];
      let closestDist = Infinity;
      let closestSprite = this.findSprite(closest);
      for (const e of enemies) {
        const es = this.findSprite(e);
        if (!es) continue;
        const dx = es.container.x - sprite.container.x;
        const dy = es.container.y - sprite.container.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < closestDist) { closestDist = d; closest = e; closestSprite = es; }
      }

      if (!closestSprite) continue;

      // 移向敌人
      if (closestDist > 60) {
        const dx = closestSprite.container.x - sprite.container.x;
        const dy = closestSprite.container.y - sprite.container.y;
        const move = (unit.speed || 3) * 80 * simDt;  // 提速 80→让部队更快交锋
        const moveX = (dx / closestDist) * move;
        const moveY = (dy / closestDist) * move;
        sprite.container.x += moveX;
        sprite.container.y += moveY;
        if (sprite.formation) {
          sprite.formation.x += moveX;
          sprite.formation.y += moveY;
        }
      }

      // 攻击
      unit.attackCooldown = (unit.attackCooldown || 0) - simDt;
      if (unit.attackCooldown <= 0 && closestDist < 70) {
        const dmg = getDamage(unit, closest);
        // 保底至少扣 1 兵，避免小部队打大城伤害被抹零
        const countLoss = Math.max(1, Math.floor(dmg / 10));
        closest.count = Math.max(0, closest.count - countLoss);
        unit.attackCooldown = 1.5;

        // 击中闪白
        if (closestSprite) {
          this.tweens.add({
            targets: closestSprite.container,
            alpha: 0.3, duration: 80, yoyo: true, repeat: 1
          });
          const clash = this.add.line(
            closestSprite.container.x, closestSprite.container.y - 6,
            -16, -10, 16, 10, 0xffe59a, 1
          ).setLineWidth(3).setDepth(40);
          this.tweens.add({
            targets: clash,
            alpha: 0,
            scaleX: 1.8,
            scaleY: 1.8,
            duration: 220,
            onComplete: () => clash.destroy(),
          });
        }

        // 伤害数字飘出
        const dmgText = this.add.text(
          closestSprite.container.x, closestSprite.container.y - 40,
          `-${Math.floor(dmg / 10)}`, {
            fontSize: '18px', color: '#ff4444', stroke: '#000', strokeThickness: 2,
            fontFamily: '"Microsoft YaHei",sans-serif'
          }).setOrigin(0.5).setDepth(50);
        this.tweens.add({
          targets: dmgText, y: dmgText.y - 30, alpha: 0, duration: 800,
          onComplete: () => dmgText.destroy()
        });

        // 击杀降敌士气
        if (closest.count <= 0) {
          for (const e of enemies) e.morale = Math.max(0, e.morale - 10);
          this.addLog(`${UNIT_NAMES[unit.type] || unit.type} 击溃了 ${UNIT_NAMES[closest.type] || closest.type}！`);
        }

        // 更新显示
        this.updateAllCards();
      }
    }

    // 检查结束（立即标记 winner，防止 500ms 延迟期内重复触发）
    const winner = checkBattleEnd(this.battle);
    if (winner && !this.battle.winner) {
      this.battle.winner = winner;
      this.time.delayedCall(500, () => this.endBattle(winner));
    }
  }

  findSprite(unit) {
    return this.unitSprites.find(s => s.unit === unit);
  }

  updateAllCards() {
    for (const s of this.unitSprites) {
      const u = s.unit;
      const pct = Math.max(0, u.count / (u.initialCount || u.count || 1));
      s.hpBar.setScale(Math.max(0.01, pct), 1);
      s.hpBar.setFillStyle(pct > 0.5 ? 0x00cc00 : pct > 0.25 ? 0xcc8800 : 0xcc0000);
      s.morBar.setScale(Math.max(0.01, u.morale / 100), 1);
      s.countText.setText(`${Math.max(0, u.count)}`);

      // HP 归零隐藏
      if (u.count <= 0 || u.morale <= 0) {
        s.container.setAlpha(0.3);
        s.container.setScale(0.8);
      }
    }
  }

  addLog(msg) {
    this.battleLog.push(msg);
    if (this.battleLog.length > 8) this.battleLog.shift();

    // 清除旧的
    this.logTexts.forEach(t => t.destroy());
    this.logTexts = [];

    // 显示最新的
    this.battleLog.slice(-6).forEach((m, i) => {
      const t = this.add.text(14, 690 - (5 - i) * 22, m, {
        fontSize: '12px', color: '#aaaacc', stroke: '#000', strokeThickness: 2,
        fontFamily: '"Microsoft YaHei",sans-serif'
      }).setDepth(20);
      this.logTexts.push(t);
    });
  }

  endBattle(winner) {
    console.log('[DEBUG] BattleScene.endBattle, winner=', winner);
    // 清除定时器
    if (this._battleTimer) { this._battleTimer.destroy(); this._battleTimer = null; }
    this.battle.winner = winner;
    const W = 1024, H = 768;

    // 胜负大字
    const isAttackerWin = winner === 'attacker';
    const msg = isAttackerWin ? '🎉 大胜！' : '💀 败退...';
    const color = isAttackerWin ? '#ffcc44' : '#886644';
    this.resultText.setText(msg).setColor(color).setVisible(true);

    // 显示 2 秒后返回
    this.time.delayedCall(2000, () => {
      const atk = this.battle.attacker.units;
      const def = this.battle.defender.units;
      const result = {
        winner,
        attackerLosses: atk.map(u => ({
          type: u.type, lost: Math.max(0, (u.initialCount || u.count) - u.count)
        })),
        defenderLosses: def.map(u => ({
          type: u.type, lost: Math.max(0, (u.initialCount || u.count) - u.count)
        }))
      };

      const mapScene = this.scene.get('MapScene');
      mapScene.events.emit('battle-ended', result);
      this.scene.stop('BattleScene');
      this.scene.wake('MapScene');
      mapScene.restoreMapUi();
    });
  }
}
