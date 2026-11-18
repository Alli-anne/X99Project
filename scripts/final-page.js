import { decodeSnapshot, renderSnapshot, loadSnapshotFonts } from './design-snapshot.js';

const board = document.querySelector('#final-page');
const shared = new URLSearchParams(location.hash.slice(1)).get('design');
try {
  if (shared) {
    const snapshot = await decodeSnapshot(shared);
    const view = renderSnapshot(snapshot);
    loadSnapshotFonts(snapshot);
    board.replaceChildren(view);
    board.snapshotData = snapshot;
    board.classList.add('shared-board');
    document.title = snapshot.name || 'Shared design';
    const fit = () => {
      const scale = Math.min(1, board.clientWidth / snapshot.width);
      view.style.transformOrigin = 'top left';
      view.style.transform = `scale(${scale})`;
      view.style.left = `${Math.max(0, (board.clientWidth - snapshot.width * scale) / 2)}px`;
      board.style.height = `${snapshot.height * scale}px`;
    };
    new ResizeObserver(fit).observe(board);
    fit();
  } else {
    await import('./show-image.js');
    const { designReady } = await import('./generate-design.js');
    await designReady;
    await import('./final-styles.js');
    await import('./shapes-tool.js');
    const name = sessionStorage.getItem('x99-project-name');
    if (name) board.querySelector('#project-name').textContent = name;
  }
  await import('./final-download.js');
  await import('./final-actions.js');
} catch (error) {
  board.replaceChildren();
  document.querySelector('#final-status').textContent = `Could not open this design. ${error.message}`;
  document.querySelector('#final-options').hidden = true;
}
