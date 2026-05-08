export function sumBars(blocks) {
  let total = 0;
  for (const b of blocks) {
    const n = Number(b.bars);
    if (Number.isFinite(n) && n > 0) total += n;
  }
  return total;
}

export function refreshLayout(blockEls, chart) {
  const blockHeights = [];
  const blockInnerHeights = [];
  const blockStartYs = [];
  const lastOffsets = [];
  for (let i = 0; i < blockEls.length; i++) {
    const el = blockEls[i];
    blockHeights[i] = el.offsetHeight;
    blockInnerHeights[i] = el.firstElementChild.offsetHeight;
    blockStartYs[i] = el.offsetTop;
    lastOffsets[i] = -1;
  }
  return {
    blockEls,
    blockHeights,
    blockInnerHeights,
    blockStartYs,
    lastOffsets,
    contentHeight: chart.offsetHeight,
  };
}

export function recomputePhaseSpans(contentHeight, chromeTop, chromeBottom) {
  const chartArea = window.innerHeight - chromeTop - chromeBottom;
  const span = Math.max(0, Math.min(chartArea / 2, contentHeight / 2));
  return { p1Span: span, p3Span: span };
}

export function applyManualSticky(docY, geometry) {
  const { blockEls, blockHeights, blockInnerHeights, blockStartYs, lastOffsets } = geometry;
  for (let i = 0; i < blockEls.length; i++) {
    const startY = blockStartYs[i];
    const blockH = blockHeights[i];
    const innerH = blockInnerHeights[i];
    const max = Math.max(0, blockH - innerH);
    const offset = Math.max(0, Math.min(docY - startY - innerH, max));
    if (offset !== lastOffsets[i]) {
      blockEls[i].firstElementChild.style.transform = `translateY(${offset}px)`;
      lastOffsets[i] = offset;
    }
  }
}
