import { parseCSV } from './csv.js';

export function findSongInIndex(index, fileStem) {
  for (const entry of index) {
    const stem = entry.file.replace(/\.csv$/i, '');
    if (stem === fileStem) return entry;
  }
  return null;
}

export async function loadIndex() {
  const res = await fetch('songs/index.json');
  if (!res.ok) throw new Error(`Failed to load songs/index.json: ${res.status}`);
  return res.json();
}

export async function loadSong(fileStem) {
  const index = await loadIndex();
  const meta = findSongInIndex(index, fileStem);
  if (!meta) throw new Error(`Song not in index: ${fileStem}`);
  const res = await fetch(`songs/${meta.file}`);
  if (!res.ok) throw new Error(`Failed to load songs/${meta.file}: ${res.status}`);
  const blocks = parseCSV(await res.text());
  return { meta, blocks };
}
