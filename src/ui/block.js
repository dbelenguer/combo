import { renderChords } from './chord.js';
import { escapeHtml } from './escape.js';

export function computeBlockHeight(row, { bpm, pxPerSec, minHeight }) {
  const sec = parseSeconds(row, bpm);
  if (sec == null) return minHeight;
  return Math.max(minHeight, Math.round(sec * pxPerSec));
}

function parseSeconds(row, bpm) {
  if (row.seconds !== undefined && row.seconds !== '' && row.seconds !== null) {
    const s = Number(row.seconds);
    if (!Number.isNaN(s)) return s;
  }
  if (row.bars !== undefined && row.bars !== '' && row.bars !== null) {
    const b = Number(row.bars);
    if (!Number.isNaN(b)) return b * 4 * 60 / bpm;
  }
  return null;
}

const SECTION_COLORS = new Set(['verse', 'chorus', 'bridge', 'riff', 'solo', 'intro', 'outro', 'lead-in']);

export function renderBlock(row, height) {
  const section = (row.section || '').toLowerCase();
  const colorKey = SECTION_COLORS.has(section) ? section : 'neutral';

  const el = document.createElement('div');
  el.className = `block block--${colorKey}`;
  el.style.minHeight = `${height}px`;

  const bars = Number(row.bars);
  if (Number.isFinite(bars) && bars > 0) {
    el.style.setProperty('--bar-step', `${height / bars}px`);
  }

  const inner = document.createElement('div');
  inner.className = 'block__inner';
  el.appendChild(inner);

  const meta = row.bars ? `${row.bars} bars` : (row.seconds ? `${row.seconds}s` : '');
  const hasTitle = !!(row.title || row.emoji);
  if (!hasTitle) {
    inner.innerHTML = `
      <div class="block__head">
        <span class="block__label">${escapeHtml(row.section || '')}</span>
        <span class="block__meta">${escapeHtml(meta)}</span>
      </div>
    `;
  }

  if (hasTitle) {
    const t = document.createElement('div');
    t.className = 'block__title';
    t.innerHTML =
      (row.emoji ? `<span class="block__emoji">${escapeHtml(row.emoji)}</span>` : '') +
      escapeHtml(row.title || '') +
      (meta ? `<span class="block__meta">${escapeHtml(meta)}</span>` : '');
    inner.appendChild(t);
  }
  if (row.chords) {
    const c = document.createElement('div');
    c.className = 'block__chords';
    c.appendChild(renderChords(row.chords));
    inner.appendChild(c);
  }
  if (row.lyrics) {
    const l = document.createElement('div');
    l.className = 'block__lyrics';
    l.textContent = row.lyrics;
    inner.appendChild(l);
  }
  if (row.description) {
    const d = document.createElement('div');
    d.className = 'block__desc';
    d.textContent = row.description;
    inner.appendChild(d);
  }
  return el;
}
