export function buildScaffold(root) {
  root.innerHTML = `
    <div class="song">
      <div class="song__progress" id="song-progress"></div>
      <div class="song__topbar">
        <a class="song__back" href="#/" title="Back (Esc)">←</a>
        <button class="song__menu-btn" id="song-menu-btn" aria-label="Menu">☰</button>
        <div class="song__title" id="song-title"></div>
        <div class="song__menu" id="song-menu" hidden>
          <button data-action="restart">Restart</button>
          <button data-action="slower">Speed −</button>
          <button data-action="faster">Speed +</button>
          <button data-toggle="reading-line" aria-pressed="false">Reading line</button>
          <button data-toggle="high-contrast" aria-pressed="false">High contrast</button>
          <button data-toggle="subdivide" aria-pressed="false">Subdivide bars</button>
          <button data-toggle="metronome" aria-pressed="false">Metronome</button>
        </div>
        <div class="song__pill" id="song-pill" hidden>
          <span class="song__pill-icon">▶</span>
          <span class="song__pill-speed">— bpm</span>
        </div>
      </div>
      <div class="song__hint" id="song-hint" hidden>Press space to start</div>
      <main class="song__scroll" id="song-scroll"></main>
      <p class="song__error" id="song-error" hidden></p>
    </div>
  `;
  const scroll = root.querySelector('#song-scroll');
  const chart = document.createElement('div');
  chart.className = 'song__chart';
  scroll.appendChild(chart);

  return {
    scroll,
    errEl: root.querySelector('#song-error'),
    hint: root.querySelector('#song-hint'),
    pill: root.querySelector('#song-pill'),
    pillIcon: root.querySelector('#song-pill .song__pill-icon'),
    pillSpeed: root.querySelector('#song-pill .song__pill-speed'),
    titleEl: root.querySelector('#song-title'),
    progress: root.querySelector('#song-progress'),
    menuBtn: root.querySelector('#song-menu-btn'),
    menu: root.querySelector('#song-menu'),
    chart,
  };
}
