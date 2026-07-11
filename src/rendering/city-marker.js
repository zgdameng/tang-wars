import { gridToPixel } from './map-bitmap.js';

let containerEl = null;
const markers = []; // { cityId, el, circle }
const CITY_MARKER_SCALE = 1.65;

export function getCityMarkerMetrics() {
  return {
    scale: CITY_MARKER_SCALE,
    hitWidth: 108,
    hitHeight: 82,
    labelOffsetY: -78,
  };
}

export function getCityTowerMetrics() {
  return {
    width: 14,
    height: 22,
    battlementHeight: 5,
  };
}

/**
 * 在地图上创建城池标记——用 HTML DOM 做标签（完美中文），
 * Phaser 圆点做交互（点击检测）。
 *
 * @param {Phaser.Scene} scene
 * @param {object} cities
 * @param {object} factions
 */
export function createCityMarkers(scene, cities, factions) {
  const metrics = getCityMarkerMetrics();
  // 创建标签容器（绝对定位，盖在游戏画布上）
  if (!containerEl) {
    containerEl = document.createElement('div');
    containerEl.id = 'city-labels';
    containerEl.style.cssText = `
      position: fixed; top: 0; left: 0;
      width: 100vw; height: 100vh;
      pointer-events: none; z-index: 100;
    `;
    document.body.appendChild(containerEl);
  }

  for (const city of Object.values(cities)) {
    const { x, y } = gridToPixel(city.x, city.y);
    const faction = factions[city.owner];
    const cityColor = faction ? colorToHex(faction.color) : '#888888';

    // 城池图标（城楼形状，Phaser Graphics 绘制）
    const gfx = scene.add.graphics();
    const fc = faction ? faction.color : 0x888888;
    _drawCastle(gfx, x, y - 4, fc, city.province);
    gfx.setDepth(10);
    // 交互区用透明矩形覆盖城楼（放大以匹配新图标）
    const hitZone = scene.add.rectangle(x, y - 18, metrics.hitWidth, metrics.hitHeight, 0x000000, 0);
    hitZone.setInteractive({ useHandCursor: true });
    hitZone.setDepth(11);
    hitZone.cityId = city.id;
    hitZone.on('pointerover', () => { gfx.clear(); _drawCastle(gfx, x, y - 4, 0xd4c5a0, city.province); });
    hitZone.on('pointerout',  () => { gfx.clear(); _drawCastle(gfx, x, y - 4, fc, city.province); });
    // 按下记录起点，抬手判断移动距离 < 8px 才算点击（避免拖拽地图时误触）
    hitZone.on('pointerdown', (pointer) => { hitZone._tapX = pointer.x; hitZone._tapY = pointer.y; });
    hitZone.on('pointerup', (pointer) => {
      const dx = pointer.x - (hitZone._tapX ?? pointer.x);
      const dy = pointer.y - (hitZone._tapY ?? pointer.y);
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) scene.events.emit('city-clicked', city.id);
    });
    // 把 hitZone 当作 circle 记录，方便 destroyCityMarkers 清理
    const circle = hitZone;
    circle._gfx = gfx;

    // 城池标签（DOM 元素，完美中文渲染）
    const el = document.createElement('div');
    el.textContent = city.name;
    el.style.cssText = `
      position: absolute;
      font-size: 15px; font-weight: bold; color: #2B241B;
      font-family: 'KaiTi', 'STKaiti', 'Microsoft YaHei', sans-serif;
      text-shadow: 0 0 3px #F0E8D8, 0 0 3px #F0E8D8, 1px 1px 1px #F0E8D8;
      transform: translate(-50%, -50%);
      white-space: nowrap;
      background: rgba(239,229,202,0.90); border: 1px solid rgba(80,62,42,0.72);
      box-shadow: 0 1px 0 rgba(255,255,255,0.45), 0 2px 5px rgba(0,0,0,0.40);
      padding: 2px 6px; border-radius: 3px;
    `;
    containerEl.appendChild(el);

    markers.push({ cityId: city.id, el, circle, worldX: x, worldY: y + metrics.labelOffsetY });
  }
}

/**
 * 每次镜头移动后调用，更新所有标签的屏幕位置。
 * 必须在 Phaser 场景的 postrender 事件或 update() 中调用。
 *
 * 原理：不自己算坐标，而是用 Phaser 内置的 getWorldPoint 反推。
 * 这样保证 DOM 标签和 Phaser 画出来的东西永远对齐。
 *
 * @param {Phaser.Cameras.Scene2D.Camera} camera - scene.cameras.main
 */
export function updateCityLabelPositions(camera) {
  const canvas = document.querySelector('canvas');
  if (!canvas || markers.length === 0) return;
  const rect = canvas.getBoundingClientRect();

  // 用 Phaser 自己的坐标转换：取屏幕 (0,0) 和 (w,h) 在世界里的位置
  const tl = { x: 0, y: 0 };
  const br = { x: 0, y: 0 };
  camera.getWorldPoint(0, 0, tl);
  camera.getWorldPoint(camera.width, camera.height, br);

  const worldW = br.x - tl.x;  // 屏幕宽度对应多少世界单位
  const worldH = br.y - tl.y;  // 屏幕高度对应多少世界单位
  if (worldW === 0 || worldH === 0) return;

  // 画布内部分辨率 vs CSS 显示尺寸的比例（Phaser Scale.FIT 会缩放画布）
  const scaleX = rect.width / camera.width;
  const scaleY = rect.height / camera.height;

  for (const m of markers) {
    // 标签在世界中的位置，占屏幕宽高的比例
    const fx = (m.worldX - tl.x) / worldW;  // 0=左 1=右
    const fy = (m.worldY - tl.y) / worldH;  // 0=上 1=下

    // 比例 × 屏幕像素 = 最终 CSS 位置
    m.el.style.left = (rect.left + fx * rect.width) + 'px';
    m.el.style.top = (rect.top + fy * rect.height) + 'px';
  }
}

/** 清理 DOM 元素和 Phaser Graphics */
export function destroyCityMarkers() {
  if (containerEl && containerEl.parentNode) {
    containerEl.parentNode.removeChild(containerEl);
    containerEl = null;
  }
  for (const m of markers) {
    if (m.circle && m.circle._gfx) m.circle._gfx.destroy();
    if (m.circle && m.circle.destroy) m.circle.destroy();
  }
  markers.length = 0;
}

/** 把 Phaser 颜色整数转成 CSS 十六进制 */
function colorToHex(color) {
  return '#' + color.toString(16).padStart(6, '0');
}

// ============================================================
//  城池造型系统 —— 四种地域风格，3D 等距视角
// ============================================================

/** 省份→建筑风格分组 */
function _provinceGroup(province) {
  const map = {
    guanzhong: 'imperial', henan: 'imperial',
    hebei: 'frontier', hedong: 'frontier',
    huainan: 'water', jiangnan: 'water', zhenhai: 'water',
    xichuan: 'southern', jingnan: 'southern', lingnan: 'southern'
  };
  return map[province] || 'imperial';
}

/** 每组建筑配色 + 尺寸 + 造型 */
function _styleFor(group) {
  switch (group) {
    case 'imperial':  // 关中/河南 — 帝都：重檐庑殿顶，朱红宫墙
      return _scaleCityStyle({
        shape: 'double-eave',
        wall: 0xCC3333, wallLight: 0xDD5544, wallDark: 0x992222,
        roof: 0x2A1008, roofBright: 0x6A3020, roofMid: 0x4A2012,
        gold: 0xC4A060, goldBright: 0xDDB870,
        pillar: 0xCC4444, pillarLight: 0xDD6666,
        gate: 'wide-arch', gateW: 15, gateH: 11,
        W: 54, H: 28, D: 8, platH: 4, platExt: 5,
        roofH1: 6, roofH2: 5, eave1: 8, eave2: 4,
      });
    case 'frontier':  // 河北/河东 — 边塞：望楼烽燧，铁灰
      return _scaleCityStyle({
        shape: 'watchtower',
        wall: 0x556677, wallLight: 0x778899, wallDark: 0x334455,
        roof: 0x1A1A22, roofBright: 0x3A3A4A, roofMid: 0x282838,
        gold: 0x999999, goldBright: 0xAAAAAA,
        pillar: 0x667788, pillarLight: 0x8899AA,
        gate: 'rect', gateW: 8, gateH: 9,
        W: 34, H: 30, D: 6, platH: 4, platExt: 4,
        roofH1: 3, roofH2: 0, eave1: 2, eave2: 0,
        towerW: 12, towerH: 10,
      });
    case 'water':     // 淮南/江南/镇海 — 水乡：粉墙黛瓦，月门水桥
      return _scaleCityStyle({
        shape: 'water-town',
        wall: 0x8899AA, wallLight: 0xAABBCC, wallDark: 0x667788,
        roof: 0x0A0A1A, roofBright: 0x2A2A4A, roofMid: 0x181830,
        gold: 0xB8A888, goldBright: 0xCCC0A0,
        pillar: 0x99AABB, pillarLight: 0xBBCCDD,
        stone: 0x8A8A80, stoneLight: 0xA0A098,
        gate: 'moon', gateW: 11, gateH: 11,
        W: 44, H: 22, D: 6, platH: 4, platExt: 4,
        roofH1: 7, roofH2: 0, eave1: 8, eave2: 0,
      });
    case 'southern':  // 西川/荆南/岭南 — 蜀楚：楼阁飞檐，赭红暖调
      return _scaleCityStyle({
        shape: 'pavilion',
        wall: 0xCC6633, wallLight: 0xDD8855, wallDark: 0x994422,
        roof: 0x2A1808, roofBright: 0x6A3820, roofMid: 0x4A2812,
        gold: 0xC4A060, goldBright: 0xDDB870,
        pillar: 0xBB5533, pillarLight: 0xDD7755,
        gate: 'arch', gateW: 12, gateH: 10,
        W: 44, H: 26, D: 7, platH: 4, platExt: 4,
        roofH1: 6, roofH2: 0, eave1: 6, eave2: 0,
        upperH: 10,
      });
    default:
      return _styleFor('imperial');
  }
}

function _scaleCityStyle(style) {
  const scaled = { ...style };
  const fields = ['W', 'H', 'D', 'platH', 'platExt', 'roofH1', 'roofH2', 'eave1', 'eave2', 'gateW', 'gateH', 'towerW', 'towerH', 'upperH'];

  for (const field of fields) {
    if (Number.isFinite(scaled[field])) scaled[field] = Math.round(scaled[field] * CITY_MARKER_SCALE);
  }

  return scaled;
}

/**
 * 唐风城楼图标——四种地域造型，3D 等距，层次丰富。
 * 所有城池共享：石基座 → 背墙 → 侧墙 → 屋顶 → 前墙 → 门 → 旗
 */
function _drawCastle(gfx, cx, cy, factionColor, province) {
  const grp = _provinceGroup(province);
  const st = _styleFor(grp);
  const { W, H, D, platH, platExt } = st;
  const x0 = Math.round(cx - W / 2);
  const y0 = Math.round(cy - H / 2) + 4;

  // 提取颜色分量
  const fR = (factionColor >> 16) & 0xff;
  const fG = (factionColor >> 8) & 0xff;
  const fB = factionColor & 0xff;
  const fDark  = ((fR * 0.5 | 0) << 16) | ((fG * 0.5 | 0) << 8) | (fB * 0.5 | 0);
  const fLight = (Math.min(255, fR + 50) << 16) | (Math.min(255, fG + 50) << 8) | Math.min(255, fB + 50);

  // ── 地面阴影 —— 椭圆形，给城池"落地"的感觉
  gfx.fillStyle(0x000000, 0.2);
  gfx.fillEllipse(cx + 2, y0 + H + platH + 4, W + platExt * 2 + 14, 7);

  // ── 石基座（背面 + 右侧面，被建筑遮挡的部分）
  const px0 = x0 - platExt;
  const py0 = y0 + H;
  const pW = W + platExt * 2;

  // 基座顶面（平行四边形，位于建筑下方）
  gfx.fillStyle(0xB0A898, 0.9);
  gfx.fillPoints([
    { x: px0 + D, y: py0 - D },
    { x: px0 + pW + D, y: py0 - D },
    { x: px0 + pW, y: py0 },
    { x: px0, y: py0 }
  ], true);

  // 基座右侧面
  gfx.fillStyle(0x908878, 0.8);
  gfx.fillPoints([
    { x: px0 + pW, y: py0 },
    { x: px0 + pW + D, y: py0 - D },
    { x: px0 + pW + D, y: py0 - D + platH },
    { x: px0 + pW, y: py0 + platH }
  ], true);

  // 基座前立面
  gfx.fillStyle(0xC0B8A8, 1);
  gfx.fillRect(px0, py0, pW, platH);
  // 基座石缝线
  gfx.fillStyle(0xA09888, 0.4);
  gfx.fillRect(px0 + 1, py0 + Math.round(platH / 2), pW - 2, 1);

  // ── 背墙（3D 深度 —— 建筑物"厚度"的暗面）
  gfx.fillStyle(st.wallDark, 0.7);
  gfx.fillRect(x0 + D, y0 - D, W, H);

  // ── 右侧面（3D 右侧厚度）
  gfx.fillStyle(st.wallDark, 0.6);
  gfx.fillPoints([
    { x: x0 + W, y: y0 },
    { x: x0 + W + D, y: y0 - D },
    { x: x0 + W + D, y: y0 - D + H },
    { x: x0 + W, y: y0 + H }
  ], true);

  // ── 按造型分派绘制主体
  switch (st.shape) {
    case 'double-eave': drawImperial(gfx, st, cx, cy, x0, y0, W, H, D, factionColor, fLight, fDark, px0, py0, pW, platH); break;
    case 'watchtower':  drawFrontier(gfx, st, cx, cy, x0, y0, W, H, D, factionColor, fLight, fDark, px0, py0, pW, platH); break;
    case 'water-town':  drawWaterTown(gfx, st, cx, cy, x0, y0, W, H, D, factionColor, fLight, fDark, px0, py0, pW, platH); break;
    case 'pavilion':    drawPavilion(gfx, st, cx, cy, x0, y0, W, H, D, factionColor, fLight, fDark, px0, py0, pW, platH); break;
    default:            drawImperial(gfx, st, cx, cy, x0, y0, W, H, D, factionColor, fLight, fDark, px0, py0, pW, platH);
  }

  _drawGateTowers(gfx, st, x0, y0, W, H);
}

function _drawGateTowers(gfx, st, x0, y0, W, H) {
  const metrics = getCityTowerMetrics();
  const towerW = Math.min(metrics.width, Math.round(W * 0.18));
  const towerH = Math.min(metrics.height, Math.round(H * 0.58));
  const towerY = y0 + H - towerH;
  const offsets = [x0 - Math.round(towerW * 0.25), x0 + W - Math.round(towerW * 0.75)];

  for (const towerX of offsets) {
    gfx.fillStyle(st.wallDark, 0.75);
    gfx.fillRect(towerX + 2, towerY - 2, towerW, towerH);
    gfx.fillStyle(st.wallLight, 1);
    gfx.fillRect(towerX, towerY, towerW, towerH);
    _drawStoneBlocks(gfx, towerX + 1, towerY + 4, towerW - 2, towerH - 7, st.wallDark, 5, 0.18);
    gfx.fillStyle(st.roofBright, 1);
    for (let i = 0; i < 3; i++) {
      gfx.fillRect(towerX + 1 + i * Math.round(towerW / 3), towerY - metrics.battlementHeight, Math.max(2, Math.round(towerW / 3) - 1), metrics.battlementHeight);
    }
  }
}

// ============================================================
//  帝都 — 重檐庑殿顶（双层屋顶 + 斗拱 + 立柱 + 宽拱门）
// ============================================================
function drawImperial(gfx, st, cx, cy, x0, y0, W, H, D, factionColor, fLight, fDark, px0, py0, pW, platH) {
  const { roofH1, roofH2, eave1, eave2, gold, goldBright } = st;

  // — 下层屋顶（大飞檐）—
  _drawRoof3D(gfx, st.roof, st.roofBright, st.roofMid, x0, y0, W, D, eave1, roofH1);

  // 下层飞檐翘角
  gfx.fillStyle(st.roofBright, 1);
  gfx.fillTriangle(x0 - eave1, y0, x0 - eave1 + 7, y0, x0 - eave1 - 1, y0 - 6);
  gfx.fillTriangle(x0 + W + eave1, y0, x0 + W + eave1 - 7, y0, x0 + W + eave1 + 1, y0 - 6);

  // 下层屋顶金色脊线
  gfx.fillStyle(gold, 0.7);
  gfx.fillRect(x0 + 2, y0 - roofH1, W - 4, 1.5);

  // — 斗拱层（下层屋顶之上的横枋 + 小方块）—
  const dougongY = y0 - roofH1;
  gfx.fillStyle(st.roof, 0.8);
  gfx.fillRect(x0 + 4, dougongY - 3, W - 8, 3);
  // 斗拱小方块（6 个，均匀分布）
  gfx.fillStyle(st.roofBright, 0.6);
  const dgCount = 6, dgSpacing = (W - 14) / (dgCount - 1);
  for (let i = 0; i < dgCount; i++) {
    const dx = x0 + 7 + Math.round(i * dgSpacing) - 1;
    gfx.fillRect(dx, dougongY - 4, 3, 4);
  }

  // — 上层屋顶（居中缩进）—
  const ux0 = x0 + 10, uW = W - 20;
  const uy0 = dougongY - 3;
  _drawRoof3D(gfx, st.roof, st.roofBright, st.roofMid, ux0, uy0, uW, D, eave2, roofH2);

  // 上层飞檐翘角
  gfx.fillStyle(st.roofBright, 1);
  gfx.fillTriangle(ux0 - eave2, uy0, ux0 - eave2 + 5, uy0, ux0 - eave2, uy0 - 4);
  gfx.fillTriangle(ux0 + uW + eave2, uy0, ux0 + uW + eave2 - 5, uy0, ux0 + uW + eave2, uy0 - 4);

  // 正脊鸱吻（金色三角装饰）
  const ridgeTop = uy0 - roofH2;
  gfx.fillStyle(goldBright, 0.9);
  gfx.fillTriangle(cx - 5, ridgeTop, cx + 5, ridgeTop, cx, ridgeTop - 5);

  // — 前墙（朱红宫墙）—
  gfx.fillStyle(st.wall, 1);
  gfx.fillRect(x0, y0, W, H);

  // 墙面砖缝纹理
  _drawMasonryLines(gfx, x0 + 1, y0 + 3, W - 2, H - 13, st.wallDark, 5, 0.12);

  // — 立柱（5 根，带柱础）—
  const pillarCount = 5;
  const pillarSpacing = (W - 6) / (pillarCount - 1);
  for (let i = 0; i < pillarCount; i++) {
    const px = x0 + 3 + Math.round(i * pillarSpacing);
    // 柱身
    gfx.fillStyle(st.pillar, 1);
    gfx.fillRect(px - 1.5, y0 + 2, 3, H - 4);
    // 柱身高光
    gfx.fillStyle(st.pillarLight, 0.35);
    gfx.fillRect(px - 0.5, y0 + 2, 1, H - 4);
    // 柱础（小方块）
    gfx.fillStyle(0x908070, 0.7);
    gfx.fillRect(px - 2.5, y0 + H - 6, 5, 3);
  }

  // — 宽拱门（居中，金色门框）—
  const gateW = st.gateW, gateH = st.gateH;
  const gateX = cx - gateW / 2, gateY = y0 + H - gateH;
  // 门洞
  gfx.fillStyle(0x0A0808, 0.9);
  gfx.fillRect(gateX + 1, gateY + 2, gateW - 2, gateH - 2);
  // 门上弧顶
  gfx.fillStyle(0x0A0808, 0.85);
  gfx.fillEllipse(cx, gateY + 2, gateW - 2, 6);
  // 金色门框
  gfx.lineStyle(1.5, gold, 0.8);
  gfx.strokeRect(gateX, gateY, gateW, gateH - 2);
  // 门楣横梁
  gfx.fillStyle(gold, 0.7);
  gfx.fillRect(gateX - 1, gateY - 1, gateW + 2, 2);

  // — 旗杆 —
  const flagTop = ridgeTop - 10;
  _drawFlag(gfx, factionColor, cx, flagTop, ridgeTop, CITY_MARKER_SCALE);

  // — 金边（宫墙轮廓）—
  gfx.lineStyle(1.5, gold, 0.5);
  gfx.strokeRect(x0, y0, W, H);
}

// ============================================================
//  边塞 — 望楼烽燧（平顶垛口 + 望楼 + 箭窗 + 窄方门）
// ============================================================
function drawFrontier(gfx, st, cx, cy, x0, y0, W, H, D, factionColor, fLight, fDark, px0, py0, pW, platH) {
  const { roofH1, eave1, gold, towerW, towerH } = st;

  // — 平顶（窄檐口）—
  _drawRoof3D(gfx, st.roof, st.roofBright, st.roofMid, x0, y0, W, D, eave1, roofH1);

  // 垛口（5 个城垛，军事风格）
  const battlementH = 5, battlementCount = 5;
  const battlementW = (W - 6) / battlementCount;
  gfx.fillStyle(st.roofBright, 1);
  for (let i = 0; i < battlementCount; i++) {
    const bx = x0 + 3 + Math.round(i * (battlementW + 1));
    gfx.fillRect(bx, y0 - roofH1 - battlementH, Math.round(battlementW) - 1, battlementH);
    // 垛口顶线
    gfx.fillStyle(st.roofMid, 0.5);
    gfx.fillRect(bx, y0 - roofH1 - battlementH, Math.round(battlementW) - 1, 1);
    gfx.fillStyle(st.roofBright, 1);
  }

  // — 前墙（铁灰城墙）—
  gfx.fillStyle(st.wall, 1);
  gfx.fillRect(x0, y0, W, H);

  // 墙面石砌纹理（方格状）
  _drawStoneBlocks(gfx, x0 + 1, y0 + 3, W - 2, H - 12, st.wallDark, 5, 0.15);

  // 箭窗（左右各一个窄长黑孔）
  gfx.fillStyle(0x080808, 0.8);
  gfx.fillRect(x0 + 5, y0 + 6, 3, 7);
  gfx.fillRect(x0 + W - 8, y0 + 6, 3, 7);

  // — 望楼（墙顶正中的窄高结构）—
  const tx0 = cx - towerW / 2, ty0 = y0 - roofH1 - battlementH - towerH;
  // 望楼背侧面
  gfx.fillStyle(st.wallDark, 0.5);
  gfx.fillRect(tx0 + 3, ty0 - 3, towerW, towerH);
  // 望楼正面
  gfx.fillStyle(st.wallLight, 1);
  gfx.fillRect(tx0, ty0, towerW, towerH);
  // 望楼石砌纹理
  _drawStoneBlocks(gfx, tx0 + 1, ty0 + 2, towerW - 2, towerH - 4, st.wallDark, 4, 0.12);
  // 望楼瞭望窗
  gfx.fillStyle(0x080808, 0.85);
  gfx.fillRect(tx0 + towerW / 2 - 2, ty0 + 3, 4, 5);
  // 望楼小顶
  gfx.fillStyle(st.roofBright, 1);
  gfx.fillPoints([
    { x: tx0 - 1, y: ty0 },
    { x: tx0 + towerW + 1, y: ty0 },
    { x: tx0 + towerW, y: ty0 - 3 },
    { x: tx0, y: ty0 - 3 }
  ], true);

  // — 窄方门 —
  const gateW = st.gateW, gateH = st.gateH;
  const gateX = cx - gateW / 2, gateY = y0 + H - gateH;
  gfx.fillStyle(0x080808, 0.9);
  gfx.fillRect(gateX, gateY, gateW, gateH);
  // 门框（铁色）
  gfx.lineStyle(1.5, 0x777777, 0.7);
  gfx.strokeRect(gateX, gateY, gateW, gateH);

  // — 旗杆（从望楼顶升起）—
  const flagTop = ty0 - 3 - 10;
  _drawFlag(gfx, factionColor, cx, flagTop, ty0 - 3, CITY_MARKER_SCALE);

  // — 铁灰边 —
  gfx.lineStyle(1.5, 0x888888, 0.6);
  gfx.strokeRect(x0, y0, W, H);
}

// ============================================================
//  水乡 — 粉墙黛瓦 · 月门水桥（大飞檐 + 圆月门 + 花窗 + 桥 + 水纹）
// ============================================================
function drawWaterTown(gfx, st, cx, cy, x0, y0, W, H, D, factionColor, fLight, fDark, px0, py0, pW, platH) {
  const { roofH1, eave1, gold, goldBright, stone, stoneLight } = st;

  // — 屋顶（大飞檐，弧线感）—
  _drawRoof3D(gfx, st.roof, st.roofBright, st.roofMid, x0, y0, W, D, eave1, roofH1);

  // 飞檐大翘角
  gfx.fillStyle(st.roofBright, 1);
  gfx.fillTriangle(x0 - eave1, y0, x0 - eave1 + 8, y0, x0 - eave1 - 2, y0 - 7);
  gfx.fillTriangle(x0 + W + eave1, y0, x0 + W + eave1 - 8, y0, x0 + W + eave1 + 2, y0 - 7);

  // 屋脊线（淡金）
  gfx.fillStyle(gold, 0.55);
  gfx.fillRect(x0 + 3, y0 - roofH1, W - 6, 1);

  // — 前墙（粉墙：上半白色，下半石基）—
  const stoneLine = y0 + Math.round(H * 0.55);
  // 上半粉墙
  gfx.fillStyle(st.wall, 1);
  gfx.fillRect(x0, y0, W, stoneLine - y0);
  // 下半石基
  gfx.fillStyle(stone, 1);
  gfx.fillRect(x0, stoneLine, W, y0 + H - stoneLine);
  // 石基纹理
  _drawStoneBlocks(gfx, x0 + 2, stoneLine + 2, W - 4, y0 + H - stoneLine - 4, stoneLight, 3, 0.15);
  // 粉墙石基分界线
  gfx.fillStyle(st.wallDark, 0.3);
  gfx.fillRect(x0, stoneLine, W, 1.5);

  // 黑瓦压檐
  gfx.fillStyle(st.roof, 0.6);
  gfx.fillRect(x0, y0, W, 2);

  // — 花窗（粉墙上的十字格窗）—
  const winCX = cx, winCY = y0 + Math.round(H * 0.28);
  const winHW = 5;
  // 窗框
  gfx.fillStyle(0x1A1A1A, 0.7);
  gfx.fillRect(winCX - winHW, winCY - winHW, winHW * 2, winHW * 2);
  // 十字格
  gfx.fillStyle(st.wallLight, 0.5);
  gfx.fillRect(winCX - 0.5, winCY - winHW + 1, 1, winHW * 2 - 2);
  gfx.fillRect(winCX - winHW + 1, winCY - 0.5, winHW * 2 - 2, 1);

  // — 圆形月门 —
  const gateW = st.gateW, gateH = st.gateH;
  const gateCY = y0 + H - gateH / 2 - 1;
  // 门洞
  gfx.fillStyle(0x0A0808, 0.9);
  gfx.fillEllipse(cx, gateCY, gateW, gateH);
  // 门框（石质圆环）
  gfx.lineStyle(2, stone, 0.8);
  gfx.strokeEllipse(cx, gateCY, gateW + 2, gateH + 2);

  // — 门前小桥（拱形 + 栏杆柱）—
  gfx.lineStyle(2, 0x6B5B4F, 0.55);
  gfx.beginPath();
  gfx.moveTo(cx - 9, y0 + H);
  gfx.lineTo(cx - 4, y0 + H - 3);
  gfx.lineTo(cx, y0 + H - 2);
  gfx.lineTo(cx + 4, y0 + H - 3);
  gfx.lineTo(cx + 9, y0 + H);
  gfx.strokePath();
  // 栏杆小柱
  gfx.fillStyle(0x6B5B4F, 0.5);
  for (let bx = cx - 8; bx <= cx + 6; bx += 4) {
    gfx.fillRect(bx - 0.5, y0 + H - 3, 1, 3);
  }

  // — 水纹 —
  gfx.fillStyle(0x6688CC, 0.3);
  gfx.fillEllipse(cx, y0 + H + 3, W - 2, 5);

  // — 旗杆 —
  const flagTop = y0 - roofH1 - 10;
  _drawFlag(gfx, factionColor, cx, flagTop, y0 - roofH1, CITY_MARKER_SCALE);

  // — 淡金边 —
  gfx.lineStyle(1, gold, 0.45);
  gfx.strokeRect(x0, y0, W, H);
}

// ============================================================
//  蜀楚 — 楼阁飞檐（大翘角 + 两层楼 + 栏杆 + 屋脊装饰）
// ============================================================
function drawPavilion(gfx, st, cx, cy, x0, y0, W, H, D, factionColor, fLight, fDark, px0, py0, pW, platH) {
  const { roofH1, eave1, gold, goldBright, upperH } = st;
  const floorBeamY = y0 + upperH;

  // — 屋顶（大飞檐）—
  _drawRoof3D(gfx, st.roof, st.roofBright, st.roofMid, x0, y0, W, D, eave1, roofH1);

  // 飞檐大翘角
  gfx.fillStyle(st.roofBright, 1);
  gfx.fillTriangle(x0 - eave1, y0, x0 - eave1 + 7, y0, x0 - eave1 - 1, y0 - 7);
  gfx.fillTriangle(x0 + W + eave1, y0, x0 + W + eave1 - 7, y0, x0 + W + eave1 + 1, y0 - 7);

  // 屋脊装饰（正脊吻兽——金色尖顶）
  const ridgeTop = y0 - roofH1;
  gfx.fillStyle(goldBright, 0.9);
  gfx.fillTriangle(cx - 4, ridgeTop, cx + 4, ridgeTop, cx, ridgeTop - 6);
  // 脊线
  gfx.fillStyle(gold, 0.6);
  gfx.fillRect(x0 + 4, ridgeTop, W - 8, 1.5);

  // — 上层楼（退进 3px 两侧）—
  const ux0 = x0 + 3, uW = W - 6;
  // 上层背侧面
  gfx.fillStyle(st.wallDark, 0.5);
  gfx.fillRect(ux0 + D, y0 - D, uW, upperH);
  gfx.fillStyle(st.wallDark, 0.45);
  gfx.fillPoints([
    { x: ux0 + uW, y: y0 },
    { x: ux0 + uW + D, y: y0 - D },
    { x: ux0 + uW + D, y: y0 - D + upperH },
    { x: ux0 + uW, y: y0 + upperH }
  ], true);
  // 上层正面
  gfx.fillStyle(st.wallLight, 1);
  gfx.fillRect(ux0, y0, uW, upperH);
  // 上层窗（小方窗）
  gfx.fillStyle(0x0A0808, 0.7);
  gfx.fillRect(cx - 4, y0 + 4, 8, 5);

  // — 栏杆（上层底部的横枋 + 小柱）—
  const railY = floorBeamY;
  gfx.fillStyle(st.wallDark, 0.6);
  gfx.fillRect(ux0, railY - 2, uW, 2);
  // 栏杆小柱
  gfx.fillStyle(st.wall, 0.7);
  const railPostCount = 6;
  const railSpacing = (uW - 4) / (railPostCount - 1);
  for (let i = 0; i < railPostCount; i++) {
    const rx = ux0 + 2 + Math.round(i * railSpacing);
    gfx.fillRect(rx - 0.5, railY - 4, 1, 4);
  }

  // — 楼层分隔横枋 —
  gfx.fillStyle(st.wallDark, 0.5);
  gfx.fillRect(x0 + 1, floorBeamY, W - 2, 2.5);
  // 横枋高光
  gfx.fillStyle(gold, 0.3);
  gfx.fillRect(x0 + 1, floorBeamY, W - 2, 0.8);

  // — 下层墙 —
  gfx.fillStyle(st.wall, 1);
  gfx.fillRect(x0, floorBeamY + 2.5, W, H - upperH - 2.5);

  // 下层墙面纹理
  _drawMasonryLines(gfx, x0 + 1, floorBeamY + 5, W - 2, H - upperH - 12, st.wallDark, 5, 0.1);

  // — 圆拱门 —
  const gateW = st.gateW, gateH = st.gateH;
  const gateX = cx - gateW / 2, gateY = y0 + H - gateH;
  gfx.fillStyle(0x0A0808, 0.9);
  gfx.fillRect(gateX + 1, gateY + 2, gateW - 2, gateH - 2);
  gfx.fillEllipse(cx, gateY + 2, gateW - 2, 6);
  // 门框（金色）
  gfx.lineStyle(1.5, gold, 0.7);
  gfx.strokeRect(gateX, gateY, gateW, gateH - 2);

  // — 旗杆 —
  const flagTop = ridgeTop - 6 - 10;
  _drawFlag(gfx, factionColor, cx, flagTop, ridgeTop - 6, CITY_MARKER_SCALE);

  // — 金边 —
  gfx.lineStyle(1.5, gold, 0.55);
  gfx.strokeRect(x0, y0, W, H);
}

// ============================================================
//  共享：3D 屋顶（背面暗梯形 + 正面亮梯形 + 瓦线纹理）
// ============================================================
function _drawRoof3D(gfx, roofColor, roofBright, roofMid, x0, y0, W, D, eave, roofH) {
  if (roofH <= 0) return;

  // 屋顶背面（3D 深度侧）
  gfx.fillStyle(roofColor, 0.75);
  gfx.fillPoints([
    { x: x0 - eave + D,     y: y0 - D },
    { x: x0 + W + eave + D, y: y0 - D },
    { x: x0 + W + D,        y: y0 - D - roofH },
    { x: x0 + D,            y: y0 - D - roofH }
  ], true);

  // 屋顶正面（亮面）
  gfx.fillStyle(roofBright, 1);
  gfx.fillPoints([
    { x: x0 - eave,     y: y0 },
    { x: x0 + W + eave, y: y0 },
    { x: x0 + W,        y: y0 - roofH },
    { x: x0,            y: y0 - roofH }
  ], true);

  // 瓦线纹理（横向线条模拟瓦片排列）
  if (roofH >= 4) {
    gfx.fillStyle(roofMid, 0.35);
    for (let ty = y0 - 1; ty > y0 - roofH; ty -= 2) {
      const t = (y0 - ty) / roofH;  // 0=底部 1=顶部
      const inset = Math.round(eave * (1 - t));
      gfx.fillRect(x0 + inset, ty, W - inset * 2, 0.8);
    }
  }

  // 屋顶顶线（脊线高光）
  gfx.fillStyle(roofMid, 0.25);
  gfx.fillRect(x0 + 1, y0 - roofH, W - 2, 1);
}

// ============================================================
//  共享：墙面砖缝纹理（横向线条）
// ============================================================
function _drawMasonryLines(gfx, rx, ry, rw, rh, color, spacing, alpha) {
  gfx.fillStyle(color, alpha);
  for (let my = ry; my < ry + rh; my += spacing) {
    gfx.fillRect(rx, my, rw, 0.6);
  }
}

// ============================================================
//  共享：石砌纹理（方格状，横向+纵向短线）
// ============================================================
function _drawStoneBlocks(gfx, rx, ry, rw, rh, color, spacing, alpha) {
  gfx.fillStyle(color, alpha);
  // 横线
  for (let my = ry; my < ry + rh; my += spacing) {
    gfx.fillRect(rx, my, rw, 0.6);
  }
  // 纵向短线（每行错开）
  let rowIdx = 0;
  for (let my = ry; my < ry + rh; my += spacing) {
    const offset = (rowIdx % 2) * Math.round(spacing / 2);
    for (let mx = rx + offset; mx < rx + rw; mx += spacing * 2) {
      gfx.fillRect(mx, my, 0.6, Math.min(spacing, ry + rh - my));
    }
    rowIdx++;
  }
}

// ============================================================
//  共享：旗杆 + 三角旗
// ============================================================
function _drawFlag(gfx, factionColor, px, top, bottom, scale = 1) {
  // 旗杆
  gfx.fillStyle(0x3D2B1F, 1);
  gfx.fillRect(px - scale, top, scale * 2, bottom - top + scale * 2);
  // 杆顶小球
  gfx.fillStyle(0xD4C5A0, 0.8);
  gfx.fillCircle(px, top, scale * 2);
  // 三角旗
  gfx.fillStyle(factionColor, 1);
  gfx.fillTriangle(px + scale, top + scale * 2, px + scale, top + scale * 7, px + scale * 7, top + scale * 4);
  // 旗尾飘带
  gfx.fillStyle(factionColor, 0.6);
  gfx.fillTriangle(px - scale * 2, top + scale * 7, px + scale, top + scale * 7, px + scale, top + scale * 12);
}
