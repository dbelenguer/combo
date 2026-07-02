import { createPlayer } from '../core/player.js';
import { createMetronome } from '../core/metronome.js';

const defaultScheduler = {
  request: (cb) => requestAnimationFrame(cb),
  cancel: (id) => cancelAnimationFrame(id),
};

function readStorage(key) {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(key);
}

function writeStorage(key, value) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(key, value);
}

function clearStorage(key) {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(key);
}

export function createPlayback({
  bpm,
  totalBeats,
  fileStem,
  initialUserFactor,
  scheduler = defaultScheduler,
  metronomeFactory,
}) {
  const persistedFactor = Number(readStorage(`userFactor:${fileStem}`));
  const userFactor =
    Number.isFinite(persistedFactor) && persistedFactor > 0
      ? persistedFactor
      : (typeof initialUserFactor === 'number' ? initialUserFactor : 1);

  const metronomeEnabled = readStorage('metronome') === '1';

  const player = createPlayer({ bpm, totalBeats, initialRate: userFactor });
  const metronome = (metronomeFactory ?? createMetronome)();

  const session = {
    userFactor,
    ended: false,
    metronomeEnabled,
  };

  const EVENTS = ['change', 'beat', 'ended'];
  const listeners = { change: new Set(), beat: new Set(), ended: new Set() };

  function on(event, fn) {
    if (!EVENTS.includes(event)) throw new Error(`unknown event: ${event}`);
    listeners[event].add(fn);
    return () => listeners[event].delete(fn);
  }

  function emit(event, payload) {
    for (const fn of listeners[event]) fn(payload);
  }

  player.on('change', () => {
    const beat = player.getState().beat;
    const wasEnded = session.ended;
    const isEnded = beat >= totalBeats - 1e-6;
    session.ended = isEnded;
    if (!wasEnded && isEnded) {
      if (player.getState().playing) {
        player.pause();
        stopScheduling();
      }
      emit('ended');
    }
    emit('change', getState());
  });
  player.on('beat', (i) => {
    if (session.metronomeEnabled && player.getState().playing && metronome && !metronome.isSuppressed()) {
      metronome.tickAtBeat(i);
    }
    emit('beat', i);
  });

  function getState() {
    const s = player.getState();
    return {
      beat: s.beat,
      playing: s.playing,
      rate: s.rate,
      bpm: s.bpm,
      totalBeats: s.totalBeats,
      userFactor: session.userFactor,
      ended: session.ended,
      metronomeEnabled: session.metronomeEnabled,
    };
  }

  function seek(beat) {
    player.seek(beat);
  }
  function seekRelative(delta) {
    player.seek(player.getState().beat + delta);
  }

  let rafId = 0;
  let lastTs = null;

  function frame(ts) {
    if (!player.getState().playing) return;
    if (lastTs === null) lastTs = ts;
    const dt = (ts - lastTs) / 1000;
    lastTs = ts;
    player.tick(dt);
    if (player.getState().playing) rafId = scheduler.request(frame);
  }

  function startScheduling() {
    if (rafId) return;
    lastTs = null;
    rafId = scheduler.request(frame);
  }

  function stopScheduling() {
    if (rafId) { scheduler.cancel(rafId); rafId = 0; }
  }

  function play() {
    if (player.getState().playing) return;
    if (session.metronomeEnabled && metronome) metronome.prime();
    player.play();
    startScheduling();
  }

  function pause() {
    if (!player.getState().playing) return;
    player.pause();
    stopScheduling();
  }

  function toggle() {
    player.getState().playing ? pause() : play();
  }

  function setRate(rate) {
    const next = Math.max(0, rate);
    session.userFactor = next;
    player.setRate(next);
    writeStorage(`userFactor:${fileStem}`, String(next));
  }

  function nudgeRate(factor) {
    setRate(session.userFactor * factor);
  }

  function restart() {
    pause();
    session.userFactor = 1;
    session.ended = false;
    player.setRate(1);
    player.restart();
    clearStorage(`userFactor:${fileStem}`);
  }

  function setMetronomeEnabled(enabled) {
    session.metronomeEnabled = !!enabled;
    writeStorage('metronome', enabled ? '1' : '0');
    if (session.metronomeEnabled && metronome) metronome.prime();
    emit('change', getState());
  }

  function tapTempoStart() {
    if (metronome) metronome.startHold(bpm * session.userFactor);
  }

  function tapTempoStop() {
    if (metronome) metronome.stopHold();
  }

  function setTotalBeats(n) {
    player.setTotalBeats(n);
  }

  function destroy() {
    stopScheduling();
    if (metronome) metronome.destroy();
    for (const event of EVENTS) listeners[event].clear();
  }

  return { getState, on, seek, seekRelative, play, pause, toggle, setRate, nudgeRate, restart, setMetronomeEnabled, tapTempoStart, tapTempoStop, setTotalBeats, destroy };
}
