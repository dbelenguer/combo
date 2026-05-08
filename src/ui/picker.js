import { loadIndex } from '../data/song-loader.js';
import { escapeHtml } from './escape.js';

export async function mountPicker(root) {
  root.innerHTML = `
    <div class="picker">
      <header class="picker__head">
        <h1 class="picker__title">Band Companion</h1>
        <input class="picker__search" type="search" placeholder="Search songs…" autocomplete="off">
      </header>
      <ul class="picker__list" id="picker-list"></ul>
      <p class="picker__error" id="picker-error" hidden></p>
    </div>
  `;

  const list = root.querySelector('#picker-list');
  const errEl = root.querySelector('#picker-error');
  const search = root.querySelector('.picker__search');

  let songs = [];
  try {
    songs = await loadIndex();
  } catch (e) {
    errEl.hidden = false;
    errEl.textContent = `Could not load songs/index.json: ${e.message}`;
    return;
  }

  if (songs.length === 0) {
    errEl.hidden = false;
    errEl.textContent = 'No songs in songs/index.json yet. Add one to get started.';
    return;
  }

  const render = (filter = '') => {
    const f = filter.toLowerCase();
    list.innerHTML = '';
    for (const s of songs) {
      if (f && !s.title.toLowerCase().includes(f)) continue;
      const li = document.createElement('li');
      li.className = 'picker__item';
      const stem = s.file.replace(/\.csv$/i, '');
      li.innerHTML = `
        <a href="#/song/${encodeURIComponent(stem)}" class="picker__link">
          <div class="picker__song-title">${escapeHtml(s.title)}</div>
          <div class="picker__song-meta">
            ${s.key ? `Key: <strong>${escapeHtml(s.key)}</strong>` : ''}
            ${s.bpm ? ` · ${escapeHtml(String(s.bpm))} BPM` : ''}
            ${s.notes ? ` · ${escapeHtml(s.notes)}` : ''}
          </div>
        </a>
      `;
      list.appendChild(li);
    }
  };

  render();
  search.addEventListener('input', () => render(search.value));
  search.focus();
}
