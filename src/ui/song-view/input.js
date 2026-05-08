export function bindInputs({
  refs,
  playback,
  pxPerBeat,
  onResize,
  onRestartKey,
  onSpeedNudge,
  pause,
  play,
}) {
  const SPEED_FACTOR = 1.05;

  const onKey = (e) => {
    if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); playback.getState().playing ? pause() : play(); }
    else if (e.key === 'r' || e.key === 'R') { onRestartKey(); }
    else if (e.key === '+' || e.key === '=') { onSpeedNudge(SPEED_FACTOR); }
    else if (e.key === '-' || e.key === '_') { onSpeedNudge(1 / SPEED_FACTOR); }
    else if (e.key === 'Escape') { location.hash = '#/'; }
    else if (e.key === 'f' || e.key === 'F') {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen();
    }
    else if (e.key === 'ArrowDown') { playback.seekRelative(80 / pxPerBeat); }
    else if (e.key === 'ArrowUp') { playback.seekRelative(-80 / pxPerBeat); }
  };

  const onWheel = (e) => {
    e.preventDefault();
    playback.seekRelative(e.deltaY / pxPerBeat);
  };

  let dragging = false;
  let dragStartY = 0;
  let dragStartBeat = 0;
  let wasPlaying = false;
  function getY(e) { return e.touches ? e.touches[0].clientY : e.clientY; }

  const onDragStart = (e) => {
    if (e.target.closest('.song__pill, .song__back, .song__menu, .song__menu-btn, .song__title')) return;
    if (!e.touches) e.preventDefault();
    dragging = true;
    wasPlaying = playback.getState().playing;
    if (wasPlaying) pause();
    dragStartY = getY(e);
    dragStartBeat = playback.getState().beat;
  };
  const onDragMove = (e) => {
    if (!dragging) return;
    const dy = getY(e) - dragStartY;
    playback.seek(dragStartBeat - dy / pxPerBeat);
  };
  const onDragEnd = () => {
    if (!dragging) return;
    dragging = false;
    if (wasPlaying) play();
  };

  const onTitlePress = (e) => {
    e.preventDefault();
    playback.tapTempoStart();
  };
  const onTitleRelease = () => {
    playback.tapTempoStop();
  };

  window.addEventListener('keydown', onKey);
  window.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('resize', onResize);
  refs.scroll.addEventListener('mousedown', onDragStart);
  window.addEventListener('mousemove', onDragMove);
  window.addEventListener('mouseup', onDragEnd);
  refs.scroll.addEventListener('touchstart', onDragStart, { passive: true });
  window.addEventListener('touchmove', onDragMove, { passive: true });
  window.addEventListener('touchend', onDragEnd);
  refs.titleEl.addEventListener('mousedown', onTitlePress);
  refs.titleEl.addEventListener('mouseup', onTitleRelease);
  refs.titleEl.addEventListener('mouseleave', onTitleRelease);
  refs.titleEl.addEventListener('touchstart', onTitlePress, { passive: false });
  refs.titleEl.addEventListener('touchend', onTitleRelease);
  refs.titleEl.addEventListener('touchcancel', onTitleRelease);

  return function unbindInputs() {
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('wheel', onWheel);
    window.removeEventListener('resize', onResize);
    refs.scroll.removeEventListener('mousedown', onDragStart);
    window.removeEventListener('mousemove', onDragMove);
    window.removeEventListener('mouseup', onDragEnd);
    refs.scroll.removeEventListener('touchstart', onDragStart);
    window.removeEventListener('touchmove', onDragMove);
    window.removeEventListener('touchend', onDragEnd);
    refs.titleEl.removeEventListener('mousedown', onTitlePress);
    refs.titleEl.removeEventListener('mouseup', onTitleRelease);
    refs.titleEl.removeEventListener('mouseleave', onTitleRelease);
    refs.titleEl.removeEventListener('touchstart', onTitlePress);
    refs.titleEl.removeEventListener('touchend', onTitleRelease);
    refs.titleEl.removeEventListener('touchcancel', onTitleRelease);
  };
}
