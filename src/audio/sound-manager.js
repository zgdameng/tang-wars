/**
 * 音效管理器 —— 用 Web Audio API 程序生成音效和背景音乐
 * 无需任何音频文件，全部代码合成
 */

let ctx = null;

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  // iOS 需要 resume（用户交互后才能播放）
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// ─────────────────────────────────────────────
// 音效：短促敲击（类似古代木鱼/编钟）
// ─────────────────────────────────────────────
export function playClick() {
  try {
    const ac = getCtx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ac.currentTime + 0.08);

    gain.gain.setValueAtTime(0.18, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.12);

    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + 0.13);
  } catch (e) { /* 静默失败 */ }
}

// 军队/战斗点击：低沉鼓声
export function playDrum() {
  try {
    const ac = getCtx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ac.currentTime + 0.15);

    gain.gain.setValueAtTime(0.3, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.18);

    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + 0.2);
  } catch (e) { /* 静默失败 */ }
}

// ─────────────────────────────────────────────
// 背景音乐：五声音阶循环旋律（宫调式，古代气息）
// C D E G A = 宫商角徵羽
// ─────────────────────────────────────────────

// 五声音阶频率（Hz），C大调宫调
const PENTATONIC = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25];

// 主旋律音符序列（音高索引 + 时值，单位=拍）
const MELODY = [
  [4,1],[3,0.5],[2,0.5],[4,1],[5,2],
  [3,1],[2,0.5],[1,0.5],[3,1],[4,2],
  [2,1],[3,0.5],[4,0.5],[5,1],[4,0.5],[3,0.5],[2,2],
  [1,1],[2,0.5],[3,0.5],[4,2],[3,1],[2,1],
];

// 低音伴奏（每拍一个低八度音）
const BASS = [0,2,4,2, 0,2,3,2, 0,2,4,3, 0,2,3,2];

let bgMusicNode = null;
let bgGain = null;
let bgPlaying = false;
let bgScheduled = false;

export function startBgMusic() {
  if (bgPlaying) return;
  bgPlaying = true;
  _scheduleBgLoop();
}

export function stopBgMusic() {
  bgPlaying = false;
  if (bgGain) {
    bgGain.gain.exponentialRampToValueAtTime(0.001, getCtx().currentTime + 1);
  }
}

export function setBgVolume(v) {
  if (bgGain) bgGain.gain.setValueAtTime(v, getCtx().currentTime);
}

function _scheduleBgLoop() {
  if (!bgPlaying) return;
  try {
    const ac = getCtx();
    const BPM = 72;
    const beat = 60 / BPM; // 秒/拍

    // 主增益
    if (!bgGain) {
      bgGain = ac.createGain();
      bgGain.gain.setValueAtTime(0.12, ac.currentTime);
      bgGain.connect(ac.destination);
    }

    let t = ac.currentTime + 0.05;

    // 播放主旋律
    for (const [idx, dur] of MELODY) {
      _playNote(ac, bgGain, PENTATONIC[idx], t, dur * beat, 0.15, 'sine');
      t += dur * beat;
    }

    const loopLen = t - ac.currentTime;

    // 播放低音伴奏（整个循环内每拍一次）
    let bt = ac.currentTime + 0.05;
    const totalBeats = Math.round(loopLen / beat);
    for (let i = 0; i < totalBeats; i++) {
      const bassIdx = BASS[i % BASS.length];
      _playNote(ac, bgGain, PENTATONIC[bassIdx] * 0.5, bt, beat * 0.6, 0.07, 'triangle');
      bt += beat;
    }

    // 循环结束前 0.1 秒重新调度
    const loopMs = (loopLen - 0.1) * 1000;
    setTimeout(_scheduleBgLoop, loopMs);

  } catch (e) { /* 静默失败 */ }
}

function _playNote(ac, dest, freq, time, dur, vol, type) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain);
  gain.connect(dest);

  osc.type = type;
  osc.frequency.setValueAtTime(freq, time);

  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(vol, time + 0.04);
  gain.gain.setValueAtTime(vol, time + dur * 0.6);
  gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

  osc.start(time);
  osc.stop(time + dur + 0.01);
}
