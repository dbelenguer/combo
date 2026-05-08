export function phaseSplit(docY, { chromeTop, contentHeight, p1Span, p3Span }) {
  const p2Span = Math.max(0, contentHeight - p1Span - p3Span);
  if (docY < p1Span) {
    return { chartScroll: 0, linePos: chromeTop + docY };
  }
  if (docY < contentHeight - p3Span) {
    return { chartScroll: docY - p1Span, linePos: chromeTop + p1Span };
  }
  return {
    chartScroll: p2Span,
    linePos: chromeTop + p1Span + (docY - (contentHeight - p3Span)),
  };
}

export function findCurrentBlock(docY, blockStartYs, blockHeights) {
  if (blockStartYs.length === 0) return -1;
  if (docY <= blockStartYs[0]) return 0;
  let lo = 0, hi = blockStartYs.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (blockStartYs[mid] <= docY) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}
