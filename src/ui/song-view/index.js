import { loadSong } from '../../data/song-loader.js';
import { computeBlockHeight, renderBlock } from '../block.js';
import { DEFAULT_PX_PER_SEC, clampDensity, clampUserFactor } from '../density.js';
import { createPlayback } from '../../playback/playback.js';
import { buildScaffold } from './scaffold.js';
import { sumBars, refreshLayout, recomputePhaseSpans } from './layout.js';
import { createRenderer } from './render.js';
import { bindInputs } from './input.js';
import { bindMenu } from './menu.js';

const DEFAULTS = { pxPerSec: DEFAULT_PX_PER_SEC, minHeight: 80 };

let wakeLock = null;

async function acquireWakeLock() {
  if (!('wakeLock' in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => { wakeLock = null; });
  } catch (e) {
    console.warn('Wake lock denied:', e.message);
  }
}
function releaseWakeLock() {
  if (wakeLock) { wakeLock.release(); wakeLock = null; }
}

export async function mountSongView(root, fileStem) {
  const refs = buildScaffold(root);
  const { errEl, hint, pill, titleEl, chart } = refs;

  let cancelled = false;
  const cancelOnEarlyNav = () => { cancelled = true; };
  window.addEventListener('hashchange', cancelOnEarlyNav, { once: true });

  let data;
  try {
    data = await loadSong(fileStem);
  } catch (e) {
    window.removeEventListener('hashchange', cancelOnEarlyNav);
    if (cancelled) return;
    errEl.hidden = false;
    errEl.textContent = `Could not load song: ${e.message}`;
    return;
  }
  window.removeEventListener('hashchange', cancelOnEarlyNav);
  if (cancelled) return;

  titleEl.textContent = data.meta.title || '';

  data.blocks = [{ section: 'lead-in', bars: '2' }, ...data.blocks];

  const density = clampDensity(data.meta.density);
  const baseRate = DEFAULTS.pxPerSec * density;
  const initialUserFactor = clampUserFactor(readUserFactor(fileStem));

  const bpm = data.meta.bpm || 100;
  const opts = { bpm, pxPerSec: baseRate, minHeight: DEFAULTS.minHeight };

  const blockEls = [];
  for (const row of data.blocks) {
    if (!row.bars && !row.seconds) {
      console.warn('Block has neither bars nor seconds:', row);
    }
    const blockOpts = row.section === 'lead-in' ? { ...opts, minHeight: 0 } : opts;
    const h = computeBlockHeight(row, blockOpts);
    const el = renderBlock(row, h);
    chart.appendChild(el);
    blockEls.push(el);
  }

  const geometryRef = { current: refreshLayout(blockEls, chart) };

  const totalBeats = sumBars(data.blocks) * 4;
  const pxPerBeat = baseRate * (60 / bpm);

  const CHROME_TOP = 80;
  const CHROME_BOTTOM = 40;

  const phaseSpansRef = { current: recomputePhaseSpans(geometryRef.current.contentHeight, CHROME_TOP, CHROME_BOTTOM) };
  const playback = createPlayback({
    bpm,
    totalBeats,
    fileStem,
    initialUserFactor,
  });

  const render = createRenderer({
    refs,
    geometryRef,
    phaseSpansRef,
    pxPerBeat,
    totalBeats,
    bpm,
    CHROME_TOP,
  });

  playback.on('change', render);
  playback.on('ended', showDoneHint);
  render(playback.getState());

  pill.hidden = false;
  hint.hidden = false;

  acquireWakeLock();

  function play() {
    if (playback.getState().playing) return;
    hint.hidden = true;
    playback.play();
  }
  function pause() {
    if (!playback.getState().playing) return;
    playback.pause();
  }
  function toggle() {
    playback.getState().playing ? pause() : play();
  }
  function restart() {
    playback.restart();
    hint.hidden = false;
    hint.textContent = 'Press space to start';
  }
  function nudgeSpeed(factor) {
    playback.nudgeRate(factor);
  }
  function showDoneHint() {
    hint.hidden = false;
    hint.textContent = 'Done — press Esc to go back';
  }

  // ---- bindings ----
  pill.addEventListener('click', toggle);

  const onResize = () => {
    geometryRef.current = refreshLayout(blockEls, chart);
    phaseSpansRef.current = recomputePhaseSpans(geometryRef.current.contentHeight, CHROME_TOP, CHROME_BOTTOM);
    playback.seek(playback.getState().beat);
  };
  const unbindInputs = bindInputs({
    refs,
    playback,
    pxPerBeat,
    onResize,
    onRestartKey: restart,
    onSpeedNudge: nudgeSpeed,
    pause,
    play,
  });

  // ---- menu wiring ----
  bindMenu({ refs, playback, onRestart: restart, onSpeedNudge: nudgeSpeed });

  // ---- cleanup on route change ----
  const cleanup = () => {
    releaseWakeLock();
    pause();
    playback.destroy();
    document.body.classList.remove('reading-line');
    unbindInputs();
    window.removeEventListener('hashchange', cleanup);
  };
  window.addEventListener('hashchange', cleanup);
}

function readUserFactor(fileStem) {
  const v = localStorage.getItem(`userFactor:${fileStem}`);
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}
