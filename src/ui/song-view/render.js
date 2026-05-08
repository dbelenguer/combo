import { phaseSplit } from '../phases.js';
import { applyManualSticky } from './layout.js';

export function createRenderer({
  refs,
  geometryRef,
  phaseSpansRef,
  pxPerBeat,
  totalBeats,
  bpm,
  CHROME_TOP,
}) {
  return function render(state) {
    const docY = state.beat * pxPerBeat;
    const { p1Span, p3Span } = phaseSpansRef.current;
    const { contentHeight } = geometryRef.current;
    const { chartScroll, linePos } = phaseSplit(docY, {
      chromeTop: CHROME_TOP, contentHeight, p1Span, p3Span,
    });
    refs.chart.style.transform = `translateY(${-chartScroll}px)`;
    document.documentElement.style.setProperty('--reading-line', `${linePos}px`);
    refs.progress.style.transform = `scaleX(${totalBeats > 0 ? state.beat / totalBeats : 0})`;
    applyManualSticky(docY, geometryRef.current);

    refs.pillSpeed.textContent = `${Math.round(bpm * state.userFactor)} bpm`;
    refs.titleEl.style.right = `${refs.pill.offsetWidth + 24}px`;
    refs.pillIcon.textContent = state.playing ? '❚❚' : '▶';
  };
}
