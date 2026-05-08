import { mountPicker } from './ui/picker.js';
import { mountSongView } from './ui/song-view/index.js';

function migrateLocalStorage() {
  const VERSION = '2';
  if (localStorage.getItem('band-companion:version') === VERSION) return;
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i);
    if (k && k.startsWith('speed:')) localStorage.removeItem(k);
  }
  localStorage.setItem('band-companion:version', VERSION);
}
migrateLocalStorage();

const app = document.getElementById('app');

function route() {
  const hash = location.hash || '#/';
  app.innerHTML = '';
  if (hash === '#/' || hash === '') {
    mountPicker(app);
    return;
  }
  const songMatch = hash.match(/^#\/song\/(.+)$/);
  if (songMatch) {
    mountSongView(app, decodeURIComponent(songMatch[1]));
    return;
  }
  const p = document.createElement('p');
  p.style.padding = '24px';
  p.textContent = `Unknown route: ${hash}`;
  app.appendChild(p);
}

window.addEventListener('hashchange', route);
window.addEventListener('DOMContentLoaded', route);

document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());
