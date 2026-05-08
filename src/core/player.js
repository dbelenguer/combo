const EVENTS = ['change', 'beat'];

export function createPlayer({ bpm, totalBeats, initialRate = 1 }) {
  const state = {
    beat: 0,
    playing: false,
    rate: initialRate,
    bpm,
    totalBeats,
    lastEmittedBeat: -1,
  };
  const listeners = { change: new Set(), beat: new Set() };

  function getState() {
    return {
      beat: state.beat,
      playing: state.playing,
      rate: state.rate,
      bpm: state.bpm,
      totalBeats: state.totalBeats,
    };
  }

  function on(event, fn) {
    if (!EVENTS.includes(event)) throw new Error(`unknown event: ${event}`);
    listeners[event].add(fn);
    return () => listeners[event].delete(fn);
  }

  function emit(event, payload) {
    for (const fn of listeners[event]) fn(payload);
  }

  function seek(beat) {
    state.beat = Math.max(0, Math.min(state.totalBeats, beat));
    const newInt = Math.floor(state.beat);
    if (newInt > state.lastEmittedBeat) {
      for (let i = state.lastEmittedBeat + 1; i <= newInt; i++) emit('beat', i);
    }
    state.lastEmittedBeat = newInt;
    emit('change', getState());
  }

  function play() {
    if (state.playing) return;
    state.playing = true;
    emit('change', getState());
  }

  function pause() {
    if (!state.playing) return;
    state.playing = false;
    emit('change', getState());
  }

  function setRate(rate) {
    state.rate = Math.max(0, rate);
    emit('change', getState());
  }

  function setTotalBeats(n) {
    state.totalBeats = Math.max(0, n);
    if (state.beat > state.totalBeats) state.beat = state.totalBeats;
    emit('change', getState());
  }

  function tick(dt) {
    if (!state.playing) return;
    const beatsPerSec = state.rate * (state.bpm / 60);
    const next = Math.max(0, Math.min(state.totalBeats, state.beat + beatsPerSec * dt));
    state.beat = next;
    const newInt = Math.floor(state.beat);
    if (newInt > state.lastEmittedBeat) {
      for (let i = state.lastEmittedBeat + 1; i <= newInt; i++) emit('beat', i);
      state.lastEmittedBeat = newInt;
    }
    emit('change', getState());
  }

  function restart() {
    state.beat = 0;
    state.playing = false;
    state.lastEmittedBeat = -1;
    emit('change', getState());
  }

  return { getState, on, seek, play, pause, setRate, setTotalBeats, tick, restart };
}
