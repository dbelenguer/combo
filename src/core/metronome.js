import { isAccent } from './beat-tracker.js';

const ACCENT_FREQ = 1500;
const BEAT_FREQ = 800;
const ACCENT_GAIN = 0.85;
const BEAT_GAIN = 0.6;
const ATTACK = 0.001;
const DECAY = 0.03;

export function createMetronome() {
  let ctx = null;
  let suppressed = false;
  let holdId = 0;
  let holdBeat = 0;
  let primed = false;

  function ensureCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function click(accent, peak) {
    const c = ensureCtx();
    if (!c) return;
    const t = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.frequency.value = accent ? ACCENT_FREQ : BEAT_FREQ;
    osc.type = 'sine';
    const g = peak ?? (accent ? ACCENT_GAIN : BEAT_GAIN);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(g, t + ATTACK);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + ATTACK + DECAY);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + ATTACK + DECAY + 0.01);
  }

  return {
    prime() {
      const c = ensureCtx();
      if (!c || primed) return;
      primed = true;
      // Warm the audio graph with one inaudible tick so the first real
      // click has no cold-start latency.
      click(false, 0.0001);
    },
    tickAtBeat(beat) {
      click(isAccent(beat));
    },
    startHold(bpm) {
      if (holdId) return;
      suppressed = true;
      holdBeat = 0;
      click(isAccent(holdBeat));
      holdBeat = 1;
      const intervalMs = 60000 / bpm;
      holdId = setInterval(() => {
        click(isAccent(holdBeat));
        holdBeat++;
      }, intervalMs);
    },
    stopHold() {
      if (holdId) {
        clearInterval(holdId);
        holdId = 0;
      }
      suppressed = false;
    },
    isSuppressed() {
      return suppressed;
    },
    destroy() {
      if (holdId) {
        clearInterval(holdId);
        holdId = 0;
      }
      suppressed = false;
      if (ctx && ctx.state !== 'closed') {
        ctx.close().catch(() => {});
      }
      ctx = null;
    },
  };
}
