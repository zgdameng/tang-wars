import Phaser from 'phaser';
import { createBattleState, checkBattleEnd } from '../logic/battle/battle-state.js';
import { getDamage } from '../logic/battle/battle-units.js';

export class BattleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BattleScene' });
  }

  init(data) {
    // 从地图场景传来的遭遇战数据
    this.encounter = data;
  }

  create() {
    const bg = this.cameras.main.setBackgroundColor('#1a2a1a');
    const { attacker, defender, terrain, isSiege } = this.encounter;

    // 构建战斗状态
    this.battle = createBattleState({
      terrain: terrain || 'plains',
      isSiege: !!isSiege,
      attackerFactionId: attacker.factionId,
      attackerGeneralId: attacker.generalId,
      attackerUnits: attacker.units,
      defenderFactionId: isSiege ? defender.owner : defender.factionId,
      defenderGeneralId: defender.generalId,
      defenderUnits: isSiege
        ? [{ type: 'infantry', count: 2000, morale: 80, exp: 0 }]
        : defender.units
    });

    // 画出双方部队（彩色方块）
    this.unitSprites = [];
    const attackerColor = 0xff4444;
    const defenderColor = 0x4444ff;

    this.battle.attacker.units.forEach((u, i) => {
      this.createUnitSprite(u, 200 + i * 70, 300, attackerColor);
    });
    this.battle.defender.units.forEach((u, i) => {
      this.createUnitSprite(u, 800 + i * 70, 250, defenderColor);
    });

    // 顶部信息栏
    this.createHUD();

    // 撤退按钮
    this.add.text(10, 680, '⚑ 撤退', {
      fontSize: '18px', color: '#ff6644',
      stroke: '#000', strokeThickness: 3
    }).setInteractive().on('pointerdown', () => this.endBattle('defender'));
  }

  createUnitSprite(battleUnit, x, y, color) {
    const w = 40;
    const h = 30;
    const rect = this.add.rectangle(x, y, w, h, color);
    rect.battleUnit = battleUnit;
    battleUnit.sprite = rect;
    battleUnit.position = { x, y };

    // 兵种标签
    this.add.text(x, y - 20, battleUnit.type[0], {
      fontSize: '12px', color: '#fff', stroke: '#000', strokeThickness: 2
    }).setOrigin(0.5);

    // 血量条
    const hpBar = this.add.rectangle(x, y - 35, 30, 4, 0x00ff00);
    battleUnit.hpBar = hpBar;

    this.unitSprites.push(rect);
  }

  createHUD() {
    const atk = this.battle.attacker;
    const def = this.battle.defender;

    this.atkText = this.add.text(10, 10,
      `攻: ${atk.units[0]?.count || 0}人  士气 ${atk.units[0]?.morale || 0}`,
      { fontSize: '14px', color: '#ff8888', stroke: '#000', strokeThickness: 2 }
    );

    this.defText = this.add.text(10, 30,
      `守: ${def.units[0]?.count || 0}人  士气 ${def.units[0]?.morale || 0}`,
      { fontSize: '14px', color: '#8888ff', stroke: '#000', strokeThickness: 2 }
    );

    const terrainName = { plains: '平原', hills: '山地', river: '河畔' };
    this.add.text(10, 52,
      `地形: ${terrainName[this.battle.terrain]}  ${this.battle.isSiege ? '攻城战' : '野战'}`,
      { fontSize: '12px', color: '#888', stroke: '#000', strokeThickness: 2 }
    );
  }

  update(_time, delta) {
    if (this.battle.winner) return;

    const dt = delta / 1000;
    this.battle.time += dt;

    // 自动战斗：同侧部队向最近敌军移动并攻击
    const atkUnits = this.battle.attacker.units.filter(u => u.hp > 0 && u.morale > 0);
    const defUnits = this.battle.defender.units.filter(u => u.hp > 0 && u.morale > 0);

    for (const unit of [...atkUnits, ...defUnits]) {
      const enemies = unit.side === 'attacker' ? defUnits : atkUnits;
      if (enemies.length === 0) continue;

      // 找最近敌人
      let closest = enemies[0];
      let closestDist = Infinity;
      for (const e of enemies) {
        const dx = e.sprite.x - unit.sprite.x;
        const dy = e.sprite.y - unit.sprite.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < closestDist) { closestDist = d; closest = e; }
      }

      // 靠近敌人
      if (closestDist > 50) {
        const dx = closest.sprite.x - unit.sprite.x;
        const dy = closest.sprite.y - unit.sprite.y;
        const move = unit.speed * 0.5;
        unit.sprite.x += (dx / closestDist) * move;
        unit.sprite.y += (dy / closestDist) * move;
        // 更新血条位置
        if (unit.hpBar) {
          unit.hpBar.x = unit.sprite.x;
          unit.hpBar.y = unit.sprite.y - 35;
        }
      }

      // 攻击冷却后打一次
      unit.attackCooldown -= dt;
      if (unit.attackCooldown <= 0 && closestDist < 60) {
        const dmg = getDamage(unit, closest);
        closest.hp -= dmg;
        unit.attackCooldown = 1.5; // 1.5秒打一次

        // 更新对方血条
        if (closest.hpBar) {
          const pct = Math.max(0, closest.hp / closest.maxHp);
          closest.hpBar.setScale(pct, 1);
          closest.hpBar.setFillStyle(pct > 0.5 ? 0x00ff00 : pct > 0.25 ? 0xffaa00 : 0xff0000);
        }

        // 击杀降对方士气
        if (closest.hp <= 0) {
          for (const e of enemies) {
            e.morale = Math.max(0, e.morale - 10);
          }
        }
      }
    }

    // 更新 HUD
    this.updateHUD();

    // 检查战斗结束
    const winner = checkBattleEnd(this.battle);
    if (winner) this.endBattle(winner);
  }

  updateHUD() {
    const atk = this.battle.attacker.units[0];
    const def = this.battle.defender.units[0];
    if (atk && this.atkText) {
      this.atkText.setText(`攻: ${Math.max(0, Math.floor(atk.hp / 10))}人  士气 ${atk.morale}`);
    }
    if (def && this.defText) {
      this.defText.setText(`守: ${Math.max(0, Math.floor(def.hp / 10))}人  士气 ${def.morale}`);
    }
  }

  endBattle(winner) {
    this.battle.winner = winner;

    const result = {
      winner,
      attackerLosses: this.battle.attacker.units.map(u => ({
        type: u.type, lost: u.count - Math.max(0, Math.floor(u.hp / 10))
      })),
      defenderLosses: this.battle.defender.units.map(u => ({
        type: u.type, lost: u.count - Math.max(0, Math.floor(u.hp / 10))
      }))
    };

    // 把结果发给地图场景，然后自己关掉
    this.scene.get('MapScene').events.emit('battle-ended', result);
    this.scene.stop('BattleScene');
    this.scene.wake('MapScene');
  }
}
