const TOGGLE_KEYS = {
  'reading-line': 'readingLine',
  'high-contrast': 'highContrast',
  'subdivide': 'subdivide',
};

export function bindMenu({ refs, playback, onRestart, onSpeedNudge }) {
  const SPEED_FACTOR = 1.05;
  const { menu, menuBtn } = refs;

  menuBtn.addEventListener('click', () => { menu.hidden = !menu.hidden; });
  menu.addEventListener('click', (e) => {
    const a = e.target.closest('button')?.dataset.action;
    if (a === 'restart') onRestart();
    else if (a === 'faster') onSpeedNudge(SPEED_FACTOR);
    else if (a === 'slower') onSpeedNudge(1 / SPEED_FACTOR);
  });

  for (const btn of menu.querySelectorAll('button[data-toggle]')) {
    const cls = btn.dataset.toggle;
    if (cls === 'metronome') {
      const initial = playback.getState().metronomeEnabled;
      btn.setAttribute('aria-pressed', String(initial));
      document.body.classList.toggle(cls, initial);
      btn.addEventListener('click', () => {
        const next = btn.getAttribute('aria-pressed') !== 'true';
        btn.setAttribute('aria-pressed', String(next));
        document.body.classList.toggle(cls, next);
        playback.setMetronomeEnabled(next);
      });
      continue;
    }
    const key = TOGGLE_KEYS[cls];
    if (!key) continue;
    const initial = localStorage.getItem(key) === '1';
    btn.setAttribute('aria-pressed', String(initial));
    document.body.classList.toggle(cls, initial);
    btn.addEventListener('click', () => {
      const next = btn.getAttribute('aria-pressed') !== 'true';
      btn.setAttribute('aria-pressed', String(next));
      localStorage.setItem(key, next ? '1' : '0');
      document.body.classList.toggle(cls, next);
    });
  }
}
