// Share only text, images and approved styles, never executable HTML.
const properties = ['color', 'background-color', 'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing', 'text-align', 'text-transform', 'white-space', 'overflow-wrap', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width', 'border-style', 'border-color', 'border-radius', 'object-fit', 'object-position', 'opacity', 'box-shadow', '--element-color'];
properties.push('display', 'align-items', 'justify-items', 'align-content', 'justify-content', 'flex-direction', 'list-style-type', 'overflow');
const tags = new Set(['div', 'section', 'h2', 'h3', 'p', 'ul', 'li', 'span', 'button', 'img']);

export async function waitForDesignAssets(board) {
  const images = [...board.querySelectorAll('img')];
  images.forEach(image => { image.loading = 'eager'; });
  const stylesheet = document.querySelector('#generated-fonts');
  const fontStyles = !stylesheet || stylesheet.sheet ? Promise.resolve() : new Promise((resolve, reject) => {
    stylesheet.addEventListener('load', resolve, { once: true });
    stylesheet.addEventListener('error', reject, { once: true });
  });
  let timeout;
  try {
    await Promise.race([
      Promise.all([fontStyles.then(() => document.fonts.ready), ...images.map(image => image.decode())]),
      new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error()), 15000); })
    ]);
  } catch {
    throw new Error('Images or fonts could not finish loading. Check your connection and try again.');
  } finally { clearTimeout(timeout); }
}

export function captureDesign(board) {
  if (board.snapshotData) return board.snapshotData;
  const origin = board.getBoundingClientRect();
  let left = origin.left, top = origin.top, right = origin.right, bottom = origin.bottom;
  function capture(element, parentRect) {
    const css = getComputedStyle(element);
    if (element.hidden || css.display === 'none' || css.visibility === 'hidden') return null;
    const rect = element.getBoundingClientRect();
    left = Math.min(left, rect.left); top = Math.min(top, rect.top);
    right = Math.max(right, rect.right); bottom = Math.max(bottom, rect.bottom);
    const children = [...element.childNodes].map(child => child.nodeType === Node.TEXT_NODE
      ? child.textContent : child.nodeType === Node.ELEMENT_NODE ? capture(child, rect) : null).filter(child => child !== null);
    return { tag: element.tagName.toLowerCase(), id: element.id, classes: [...element.classList],
      x: rect.left - parentRect.left, y: rect.top - parentRect.top, w: rect.width, h: rect.height,
      style: Object.fromEntries(properties.map(key => [key, css.getPropertyValue(key)])), children,
      ...(element.tagName === 'IMG' ? { src: element.src, alt: element.alt } : {}) };
  }
  const tree = capture(board, origin);
  tree.x = origin.left - left; tree.y = origin.top - top;
  return { version: 1, width: right - left, height: bottom - top, tree,
    fonts: document.querySelector('#generated-fonts')?.href || '',
    name: board.querySelector('#project-name')?.textContent.trim() || 'My project' };
}

export function renderSnapshot(snapshot) {
  if (snapshot?.version !== 1 || !Number.isFinite(snapshot.width) || !Number.isFinite(snapshot.height)
    || snapshot.width <= 0 || snapshot.width > 20000 || snapshot.height <= 0 || snapshot.height > 50000) throw new Error('This project link is invalid.');
  let count = 0;
  function render(data, depth = 0) {
    if (++count > 2000 || depth > 30) throw new Error('This project is too large.');
    if (typeof data === 'string') return document.createTextNode(data.slice(0, 20000));
    if (!data || !tags.has(data.tag)) throw new Error('This project contains an unsupported element.');
    const element = document.createElement(data.tag === 'button' ? 'div' : data.tag);
    for (const key of ['x', 'y', 'w', 'h']) {
      if (!Number.isFinite(data[key]) || Math.abs(data[key]) > 50000) throw new Error('Invalid element dimensions.');
    }
    element.style.cssText = `all:initial;display:block;box-sizing:border-box;position:absolute;margin:0;left:${data.x}px;top:${data.y}px;width:${data.w}px;height:${data.h}px;`;
    for (const key of properties) {
      const value = data.style?.[key];
      if (typeof value === 'string' && value.length < 500 && !/url\s*\(|expression|[<>;]/i.test(value)) element.style.setProperty(key, value);
    }
    element.className = (data.classes || []).filter(name => /^design-element(?:--(?:rectangle|circle|triangle|line|text|button))?$/.test(name)).join(' ');
    if (data.tag === 'img') {
      const url = new URL(data.src);
      if (url.protocol !== 'https:') throw new Error('Shared images must use HTTPS.');
      element.src = url.href; element.alt = String(data.alt || '').slice(0, 500);
    }
    (data.children || []).forEach(child => element.append(render(child, depth + 1)));
    return element;
  }
  const wrapper = document.createElement('div');
  wrapper.className = 'design-snapshot';
  wrapper.style.cssText = `position:relative;width:${snapshot.width}px;height:${snapshot.height}px;`;
  wrapper.append(render(snapshot.tree));
  return wrapper;
}

export async function encodeSnapshot(snapshot) {
  const compressed = await new Response(new Blob([JSON.stringify(snapshot)]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
  let binary = '';
  new Uint8Array(compressed).forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

export async function decodeSnapshot(encoded) {
  if (encoded.length > 100000) throw new Error('This project link is too large.');
  const bytes = Uint8Array.from(atob(encoded.replaceAll('-', '+').replaceAll('_', '/')), char => char.charCodeAt(0));
  const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();
  let length = 0;
  const chunks = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > 1000000) { await reader.cancel(); throw new Error('This project link is too large.'); }
    chunks.push(value);
  }
  return JSON.parse(await new Blob(chunks).text());
}

export function loadSnapshotFonts(snapshot) {
  if (!snapshot.fonts) return;
  const url = new URL(snapshot.fonts);
  if (url.origin !== 'https://fonts.googleapis.com' || url.pathname !== '/css2') return;
  const link = document.createElement('link');
  link.id = 'generated-fonts'; link.rel = 'stylesheet'; link.href = url.href;
  document.head.append(link);
}
