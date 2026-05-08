const CHORD_RE = /^[A-G][#b]?[a-zA-Z0-9()#]*(\/[A-G][#b]?)?$/;
const PARSE_RE = /^([A-G][#b]?)(m(?!aj))?(.*)$/;
const SYNC_RE = /^>(.+)$/;
const LATE_RE = /^_(.+)$/;
const SUSTAIN_RE = /^(.+)<$/;
const RHYTHM_RE = /^(.+):([\/QHWES]+)$/;
const REST_INFO = {
  Q: { kind: 'rest', duration: 'quarter',   beats: 1 },
  H: { kind: 'rest', duration: 'half',      beats: 2 },
  W: { kind: 'rest', duration: 'whole',     beats: 4 },
  E: { kind: 'rest', duration: 'eighth',    beats: 0.5 },
  S: { kind: 'rest', duration: 'sixteenth', beats: 0.25 },
};
const SVG_NS = 'http://www.w3.org/2000/svg';
const BARS_PER_LINE = 4;

export function isChord(token) {
  if (typeof token !== 'string' || token.length === 0) return false;
  return CHORD_RE.test(token);
}

export function parseChord(token) {
  if (typeof token !== 'string') return null;
  const m = PARSE_RE.exec(token);
  if (!m) return null;
  return { root: m[1], quality: m[2] || '', extension: m[3] || '' };
}

export function splitSlash(token) {
  const i = token.indexOf('/');
  if (i === -1) return { main: token, bass: null };
  return { main: token.slice(0, i), bass: token.slice(i + 1) };
}

export function parseChordToken(token) {
  if (typeof token !== 'string' || token.length === 0) return null;

  let syncopated = false;
  let lateInBar = false;
  let sustained = false;
  let rhythmPattern = null;
  let rest = token;

  const sync = SYNC_RE.exec(rest);
  if (sync) {
    syncopated = true;
    rest = sync[1];
  }

  const late = LATE_RE.exec(rest);
  if (late) {
    lateInBar = true;
    rest = late[1];
  }

  const sustain = SUSTAIN_RE.exec(rest);
  if (sustain) {
    sustained = true;
    rest = sustain[1];
  }

  const rhythm = RHYTHM_RE.exec(rest);
  if (rhythm) {
    rhythmPattern = [];
    for (const ch of rhythm[2]) {
      if (ch === '/') {
        rhythmPattern.push({ kind: 'slash', duration: 'quarter', beats: 1 });
      } else {
        rhythmPattern.push({ ...REST_INFO[ch] });
      }
    }
    rest = rhythm[1];
  }

  if (!isChord(rest)) return null;

  const { main, bass } = splitSlash(rest);
  const parsed = parseChord(main);
  if (!parsed) return null;

  return {
    syncopated,
    lateInBar,
    sustained,
    root: parsed.root,
    quality: parsed.quality,
    extension: parsed.extension,
    bass,
    rhythmPattern,
  };
}

export function groupChordRow(text) {
  if (typeof text !== 'string' || text.length === 0) return [];

  const parts = text.split(/(\s+)/).filter(p => p.length > 0);

  const items = parts.map((p) => {
    if (/^\s+$/.test(p)) return { kind: 'ws', text: p };
    if (p === '|') return { kind: 'bar' };
    if (p === '|:') return { kind: 'bar', repeatStart: true };
    if (p === ':|') return { kind: 'bar', repeatEnd: true };
    const parsed = parseChordToken(p);
    if (parsed) return { kind: 'chord', token: p, parsed };
    return { kind: 'text', text: p };
  });

  const barred = new Array(items.length).fill(false);

  function nearestNonWs(idx, dir) {
    for (let i = idx + dir; i >= 0 && i < items.length; i += dir) {
      if (items[i].kind !== 'ws') return i;
    }
    return -1;
  }

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (it.kind === 'bar') {
      barred[i] = true;
    } else if (it.kind === 'chord') {
      if (it.parsed.rhythmPattern !== null) {
        barred[i] = true;
        continue;
      }
      const left = nearestNonWs(i, -1);
      const right = nearestNonWs(i, +1);
      if ((left >= 0 && items[left].kind === 'bar') || (right >= 0 && items[right].kind === 'bar')) {
        barred[i] = true;
      }
    }
  }

  // Propagate barred-ness through chord-ws-chord chains (multi-chord-per-bar).
  // A chord whose nearest non-ws neighbor (left or right) is a chord that's
  // already barred must also be barred — they share a bar via whitespace.
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind !== 'chord' || barred[i]) continue;
      const left = nearestNonWs(i, -1);
      const right = nearestNonWs(i, +1);
      if ((left >= 0 && items[left].kind === 'chord' && barred[left]) ||
          (right >= 0 && items[right].kind === 'chord' && barred[right])) {
        barred[i] = true;
        changed = true;
      }
    }
  }

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (it.kind === 'text' && it.text === '—') {
      const left = nearestNonWs(i, -1);
      const right = nearestNonWs(i, +1);
      if (left >= 0 && right >= 0 && items[left].kind === 'chord' && items[right].kind === 'chord' && barred[left] && barred[right]) {
        barred[i] = true;
      }
    }
  }

  for (let i = 0; i < items.length; i++) {
    if (items[i].kind === 'ws') {
      const left = nearestNonWs(i, -1);
      const right = nearestNonWs(i, +1);
      if (left >= 0 && right >= 0 && barred[left] && barred[right]) {
        barred[i] = true;
      }
    }
  }

  const result = [];
  let i = 0;
  while (i < items.length) {
    if (!barred[i]) {
      const it = items[i];
      if (it.kind === 'chord') {
        result.push({ type: 'inline-chord', token: it.token, parsed: it.parsed });
      } else {
        result.push({ type: 'text', text: it.text });
      }
      i++;
    } else {
      const runStart = i;
      while (i < items.length && barred[i]) i++;
      const runItems = items.slice(runStart, i);

      const bars = [];
      let currentBar = [];
      let seenChord = false;
      let pendingStart = false;
      let lastSep = null;

      const flushBar = () => {
        if (currentBar.length > 0 || seenChord) {
          if (pendingStart) {
            currentBar.repeatStart = true;
            pendingStart = false;
          }
          bars.push(currentBar);
          currentBar = [];
        }
      };

      for (const r of runItems) {
        if (r.kind === 'chord') {
          currentBar.push(r);
          seenChord = true;
        } else if (r.kind === 'bar' && r.repeatStart) {
          // `:| |:` handoff: don't push an empty bar between sequential repeats.
          if (!(lastSep === ':|' && currentBar.length === 0)) {
            flushBar();
          }
          pendingStart = true;
          lastSep = '|:';
        } else if (r.kind === 'bar' && r.repeatEnd) {
          flushBar();
          if (bars.length > 0) bars[bars.length - 1].repeatEnd = true;
          lastSep = ':|';
        } else if (r.kind === 'bar') {
          flushBar();
          lastSep = '|';
        } else if (r.kind === 'text' && r.text === '—') {
          flushBar();
          lastSep = '—';
        }
      }
      if (currentBar.length > 0) {
        if (pendingStart) currentBar.repeatStart = true;
        bars.push(currentBar);
      }

      const barsWithFlags = bars.map((bar, barIdx) => {
        const mapped = bar.map((c, chordIdx) => ({
          token: c.token,
          parsed: c.parsed,
          isFirstInBar: chordIdx === 0,
          isFirstBar: barIdx === 0,
        }));
        if (bar.repeatStart) mapped.repeatStart = true;
        if (bar.repeatEnd) mapped.repeatEnd = true;
        return mapped;
      });

      result.push({ type: 'run', bars: barsWithFlags });
    }
  }

  return result;
}

export function renderChords(text) {
  const frag = document.createDocumentFragment();
  const items = groupChordRow(text);
  for (const item of items) {
    if (item.type === 'text') {
      frag.appendChild(document.createTextNode(item.text));
    } else if (item.type === 'inline-chord') {
      frag.appendChild(renderInlineChord(item));
    } else if (item.type === 'run') {
      frag.appendChild(renderRun(item));
    }
  }
  return frag;
}

function renderInlineChord(item) {
  const span = document.createElement('span');
  span.className = 'chord';
  appendChordParts(span, {
    parsed: item.parsed,
    isFirstInBar: false,
    isFirstBar: true,
  });
  return span;
}

function renderRun(run) {
  const wrapper = document.createElement('span');
  wrapper.className = 'run';
  for (let i = 0; i < run.bars.length; i += BARS_PER_LINE) {
    const chunk = run.bars.slice(i, i + BARS_PER_LINE);
    const measure = document.createElement('span');
    measure.className = 'measure';
    for (const bar of chunk) {
      measure.appendChild(renderBar(bar));
    }
    wrapper.appendChild(measure);
  }
  return wrapper;
}

function renderBar(chords) {
  const barEl = document.createElement('span');
  barEl.className = 'measure__bar';

  if (chords.repeatStart) barEl.classList.add('measure__bar--repeat-start');
  if (chords.repeatEnd) barEl.classList.add('measure__bar--repeat-end');

  const labels = document.createElement('span');
  labels.className = 'labels';
  for (const c of chords) {
    const label = document.createElement('span');
    label.className = 'label';
    if (c.parsed.lateInBar) label.classList.add('label--late');
    appendChordParts(label, c);
    labels.appendChild(label);
  }
  barEl.appendChild(labels);

  const barArea = document.createElement('span');
  barArea.className = 'bar-area';

  const rhythmChord = chords.find(c => c.parsed.rhythmPattern !== null);
  if (rhythmChord) {
    barArea.appendChild(createSlashOverlay(rhythmChord.parsed.rhythmPattern));
  }

  if (chords.repeatStart) barArea.appendChild(createRepeatMark('start'));
  if (chords.repeatEnd) barArea.appendChild(createRepeatMark('end'));

  barEl.appendChild(barArea);
  return barEl;
}

function appendChordParts(parent, c) {
  if (c.parsed.syncopated) {
    parent.appendChild(createSyncopationArc());
  }

  const strong = document.createElement('strong');
  strong.textContent = c.parsed.root + c.parsed.quality;
  parent.appendChild(strong);

  if (c.parsed.extension) {
    const sup = document.createElement('sup');
    sup.textContent = c.parsed.extension;
    parent.appendChild(sup);
  }

  if (c.parsed.bass !== null) {
    const bassSpan = document.createElement('span');
    bassSpan.className = 'chord__bass';
    bassSpan.textContent = '/' + c.parsed.bass;
    parent.appendChild(bassSpan);
  }

  if (c.parsed.sustained) {
    parent.appendChild(createSustainArc());
  }
}

function createSyncopationArc() {
  return createArc('chord__sync');
}

function createSustainArc() {
  return createArc('chord__sustain');
}

function createArc(className) {
  const wrapper = document.createElement('span');
  wrapper.className = className;
  wrapper.setAttribute('aria-hidden', 'true');

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('width', '22');
  svg.setAttribute('height', '12');
  svg.setAttribute('viewBox', '0 0 22 12');

  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', 'M 2 10 Q 11 2 20 10');
  path.setAttribute('stroke', 'var(--chord-sync)');
  path.setAttribute('stroke-width', '2.2');
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke-linecap', 'round');

  svg.appendChild(path);
  wrapper.appendChild(svg);
  return wrapper;
}

function createSlashOverlay(pattern) {
  const wrapper = document.createElement('span');
  wrapper.className = 'strokes-overlay';
  wrapper.style.gridTemplateColumns = pattern.map(p => p.beats + 'fr').join(' ');

  for (const item of pattern) {
    if (item.kind === 'slash') {
      wrapper.appendChild(createSlashSvg());
    } else {
      wrapper.appendChild(createRestSvg(item.duration));
    }
  }

  return wrapper;
}

function createSlashSvg() {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('width', '8');
  svg.setAttribute('height', '12');
  svg.setAttribute('viewBox', '0 0 8 12');

  const line = document.createElementNS(SVG_NS, 'line');
  line.setAttribute('x1', '1');
  line.setAttribute('y1', '11');
  line.setAttribute('x2', '7');
  line.setAttribute('y2', '1');
  line.setAttribute('stroke', 'var(--chord)');
  line.setAttribute('stroke-width', '2.4');
  line.setAttribute('stroke-linecap', 'round');

  svg.appendChild(line);
  return svg;
}

function createRestSvg(duration) {
  const svg = document.createElementNS(SVG_NS, 'svg');

  if (duration === 'whole' || duration === 'half') {
    svg.setAttribute('width', '10');
    svg.setAttribute('height', '14');
    svg.setAttribute('viewBox', '0 0 10 14');
    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', '1');
    rect.setAttribute('y', duration === 'whole' ? '3' : '6');
    rect.setAttribute('width', '8');
    rect.setAttribute('height', '2.5');
    rect.setAttribute('fill', 'var(--chord)');
    svg.appendChild(rect);
  } else if (duration === 'quarter') {
    svg.setAttribute('width', '6');
    svg.setAttribute('height', '14');
    svg.setAttribute('viewBox', '0 0 6 14');
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', 'M 1 1 L 5 5 L 1 7 L 5 11 L 2 13');
    path.setAttribute('stroke', 'var(--chord)');
    path.setAttribute('stroke-width', '1.8');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(path);
  } else if (duration === 'eighth' || duration === 'sixteenth') {
    svg.setAttribute('width', '6');
    svg.setAttribute('height', '14');
    svg.setAttribute('viewBox', '0 0 6 14');
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', '1');
    line.setAttribute('y1', '13');
    line.setAttribute('x2', '5');
    line.setAttribute('y2', '3');
    line.setAttribute('stroke', 'var(--chord)');
    line.setAttribute('stroke-width', '1.4');
    line.setAttribute('stroke-linecap', 'round');
    svg.appendChild(line);
    const flag1 = document.createElementNS(SVG_NS, 'circle');
    flag1.setAttribute('cx', '5');
    flag1.setAttribute('cy', '3');
    flag1.setAttribute('r', duration === 'eighth' ? '1.6' : '1.4');
    flag1.setAttribute('fill', 'var(--chord)');
    svg.appendChild(flag1);
    if (duration === 'sixteenth') {
      const flag2 = document.createElementNS(SVG_NS, 'circle');
      flag2.setAttribute('cx', '4');
      flag2.setAttribute('cy', '7');
      flag2.setAttribute('r', '1.4');
      flag2.setAttribute('fill', 'var(--chord)');
      svg.appendChild(flag2);
    }
  }

  return svg;
}

function createRepeatMark(side) {
  const wrapper = document.createElement('span');
  wrapper.className = `repeat-mark repeat-mark--${side}`;
  wrapper.setAttribute('aria-hidden', 'true');

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('width', '10');
  svg.setAttribute('height', '28');
  svg.setAttribute('viewBox', '0 0 10 28');

  const lineX = side === 'start' ? 1.5 : 8.5;
  const line = document.createElementNS(SVG_NS, 'line');
  line.setAttribute('x1', String(lineX));
  line.setAttribute('y1', '2');
  line.setAttribute('x2', String(lineX));
  line.setAttribute('y2', '26');
  line.setAttribute('stroke', 'var(--chord)');
  line.setAttribute('stroke-width', '3');
  line.setAttribute('stroke-linecap', 'round');
  svg.appendChild(line);

  const dotX = side === 'start' ? 8 : 2;
  for (const dotY of [9, 19]) {
    const dot = document.createElementNS(SVG_NS, 'circle');
    dot.setAttribute('cx', String(dotX));
    dot.setAttribute('cy', String(dotY));
    dot.setAttribute('r', '1.6');
    dot.setAttribute('fill', 'var(--chord)');
    svg.appendChild(dot);
  }

  wrapper.appendChild(svg);
  return wrapper;
}
