// Self-contained so Playwright can evaluate this exact function in the page.
// Unit counterexamples execute the same function against measured DOM doubles.
export function measurePtmmReadability(element, { requireTargetInViewport = false } = {}) {
  const violations = [], tolerance = 1, maxFragments = 256, maxAncestors = 64;
  const fail = code => { if (!violations.includes(code)) violations.push(code); };
  // Detail unit text is a sibling of dd; API comparison units live in th.
  const cell = element.closest('td, dd, th') || element.closest('.technical-specs > div');
  if (!cell) return { readable: false, violations: ['missing-cell'], fragments: 0, ancestors: 0 };
  const range = document.createRange(); range.selectNodeContents(element);
  const allFragments = [...range.getClientRects()];
  if (allFragments.length > maxFragments) fail('fragment-limit');
  const fragments = allFragments.slice(0, maxFragments).filter(rect => rect.width > 0 && rect.height > 0);
  if (!fragments.length) fail('missing-text');
  const rect = cell.getBoundingClientRect();
  if (cell.clientWidth <= 0 || cell.clientHeight <= 0) fail('empty-cell');
  if (cell.scrollWidth > cell.clientWidth + tolerance) fail('cell-horizontal-overflow');
  if (cell.scrollHeight > cell.clientHeight + tolerance) fail('cell-vertical-overflow');
  const insideX = (part, box) => part.left >= box.left - tolerance && part.right <= box.right + tolerance;
  const insideY = (part, box) => part.top >= box.top - tolerance && part.bottom <= box.bottom + tolerance;
  const viewport = { left: 0, right: window.innerWidth, top: 0, bottom: window.innerHeight };
  for (const part of fragments) {
    if (![part.left, part.right, part.top, part.bottom].every(Number.isFinite)) fail('invalid-text-geometry');
    if (!insideX(part, rect)) fail('text-outside-cell-width');
    if (!insideY(part, rect)) fail('text-outside-cell-height');
    if (!insideX(part, viewport)) fail('text-outside-horizontal-viewport');
    if (requireTargetInViewport && !insideY(part, viewport)) fail('target-outside-vertical-viewport');
  }
  // Vertical viewport clipping is normal page scrolling. The whole caveat may
  // be taller than the viewport, but its entire range must remain reachable.
  const scrolling = document.scrollingElement || document.documentElement;
  const documentHeight = scrolling.scrollHeight;
  for (const part of fragments) {
    if (part.top + window.scrollY < -tolerance || part.bottom + window.scrollY > documentHeight + tolerance) fail('text-outside-document-scroll-range');
  }
  let ancestors = 0;
  for (let ancestor = element; ancestor; ancestor = ancestor.parentElement) {
    if (++ancestors > maxAncestors) { fail('ancestor-limit'); break; }
    const style = getComputedStyle(ancestor);
    if (style.display === 'none' || ['hidden', 'collapse'].includes(style.visibility) || style.contentVisibility === 'hidden' || Number(style.opacity) === 0) fail('hidden-content');
    if ((style.clipPath && style.clipPath !== 'none') || (style.clip && style.clip !== 'auto')) fail('unmeasured-css-clip');
    const bounds = ancestor.getBoundingClientRect();
    const scaleX = ancestor.offsetWidth ? bounds.width / ancestor.offsetWidth : 1;
    const scaleY = ancestor.offsetHeight ? bounds.height / ancestor.offsetHeight : 1;
    // The root's rectangle moves with document scroll; its actual scrollport
    // stays at viewport origin. Do not subtract document scroll twice.
    const rootScroller = ancestor === scrolling;
    const client = rootScroller ? { left: 0, right: ancestor.clientWidth, top: 0, bottom: ancestor.clientHeight }
      : { left: bounds.left + ancestor.clientLeft * scaleX, right: bounds.left + (ancestor.clientLeft + ancestor.clientWidth) * scaleX,
        top: bounds.top + ancestor.clientTop * scaleY, bottom: bounds.top + (ancestor.clientTop + ancestor.clientHeight) * scaleY };
    const paintClip = /(?:^|\s)(?:paint|strict|content)(?:\s|$)/.test(style.contain || '');
    const overflowX = style.overflowX || 'visible', overflowY = style.overflowY || 'visible';
    const clipsX = paintClip || ['hidden', 'clip', 'auto', 'scroll'].includes(overflowX);
    const clipsY = paintClip || ['hidden', 'clip'].includes(overflowY);
    const scrollsY = !paintClip && ['auto', 'scroll'].includes(overflowY);
    for (const part of fragments) {
      if (clipsX && !insideX(part, client)) fail('ancestor-horizontal-clipping');
      if (clipsY && !insideY(part, client)) fail('ancestor-vertical-clipping');
      if (scrollsY) {
        const scrollTop = rootScroller ? window.scrollY : ancestor.scrollTop, verticalScale = rootScroller ? 1 : scaleY;
        const reachable = { top: client.top - scrollTop * verticalScale, bottom: client.top + (ancestor.scrollHeight - scrollTop) * verticalScale };
        if (!insideY(part, reachable)) fail('text-outside-ancestor-scroll-range');
        if (requireTargetInViewport && !insideY(part, client)) fail('target-outside-ancestor-scroll-viewport');
      }
    }
  }
  return { readable: violations.length === 0, violations, fragments: fragments.length, ancestors, requireTargetInViewport };
}

// Read only the actual unit-bearing DOM location, never the caveat or fixture.
// The spec separately measures visibility/clipping on that same unit node.
export function measurePtmmRenderedUnit(element, { mode, label, value, family }) {
  const detail = element.closest('dd');
  let kind, actual = '', expected;
  if (detail) {
    kind = 'detail';
    const unit = detail.parentElement.querySelector(':scope > span.catalog-spec-text');
    actual = unit ? [...unit.childNodes].filter(node => node.nodeType === 3).map(node => node.textContent).join('').trim() : '';
    expected = 'мм';
  } else if (mode === 'static') {
    kind = 'static-comparison';
    actual = element.firstElementChild?.textContent.trim() || '';
    expected = `${family} в таблице источника: ${value} мм.`;
  } else if (mode === 'api') {
    kind = 'api-comparison';
    actual = element.closest('tr')?.querySelector('th')?.textContent.trim() || '';
    expected = `${label}, мм`;
  } else return { valid: false, kind: 'unknown', actual, expected: 'unit-bearing DOM node' };
  return { valid: actual === expected, kind, actual, expected };
}
