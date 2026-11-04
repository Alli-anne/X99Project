const layoutButton = document.querySelector('#eyedropper');
const board = document.querySelector('#edit-page');
const sidebar = document.querySelector('#edit-tools');
const layoutKey = 'x99-layout-settings';
const layoutParts = [
  ['project-name', 'Project name'],
  ['color-palette', 'Color palette'],
  ['accessibility-warning', 'Accessibility warning'],
  ['fonts-div', 'Fonts'],
  ['button-div', 'Buttons'],
  ['img-div', 'Images']
];

if (layoutButton && board) {
  const panel = document.createElement('div');
  panel.id = 'layout-popout';
  panel.className = 'border-popout';
  panel.hidden = true;
  panel.innerHTML = '<div class="tool-panel-heading"><h3>Arrange layout</h3><button class="tool-close" type="button" aria-label="Close layout settings">×</button></div><p class="layout-help">Turn Arrange on, then drag pieces directly on the board. Pieces can overlap. Select a piece and press Delete to remove it.</p><div class="layout-spacing"><label for="layout-gap">Section gap <output id="layout-gap-value">24px</output></label><input id="layout-gap" type="range" min="0" max="80" value="24"><label for="layout-padding">Board padding <output id="layout-padding-value">26px</output></label><input id="layout-padding" type="range" min="0" max="80" value="26"></div><button class="layout-restore" type="button">Restore removed pieces</button><div class="layout-list"></div>';
  document.querySelector('#edit-tools')?.append(panel);

  const list = panel.querySelector('.layout-list');
  const defaults = { order: layoutParts.map(([id]) => id), hidden: {} };
  let saved = {};
  try { saved = JSON.parse(sessionStorage.getItem(layoutKey) || '{}'); } catch { saved = {}; }
  const state = { order: [...(saved.order || defaults.order)], hidden: { ...(saved.hidden || {}) }, positions: { ...(saved.positions || {}) }, removed: [...(saved.removed || [])], gap: saved.gap ?? 24, padding: saved.padding ?? 26, panelPosition: saved.panelPosition || { x: 0, y: 0 } };
  let selectedPiece = null;
  const undoButton = document.querySelector('#undo');
  const redoButton = document.querySelector('#redo');
  const history = [];
  const future = [];

  function save() {
    sessionStorage.setItem(layoutKey, JSON.stringify(state));
    if (undoButton) undoButton.disabled = history.length === 0;
    if (redoButton) redoButton.disabled = future.length === 0;
  }
  function copyState() { return JSON.parse(JSON.stringify(state)); }
  function recordChange() { history.push(copyState()); future.length = 0; save(); }
  function restoreState(next) {
    Object.keys(state).forEach((key) => delete state[key]);
    Object.assign(state, next);
    applyOrder();
    renderControls();
    save();
  }

  function findPart(id) {
    return board.querySelector(`#${id}, .${id}`);
  }

  function applyOrder() {
    board.style.setProperty('display', 'flex', 'important');
    board.style.setProperty('flex-direction', 'column', 'important');
    state.order.forEach((id) => {
      const element = findPart(id);
      if (element) {
        element.style.setProperty('order', String(state.order.indexOf(id)), 'important');
        board.appendChild(element);
      }
    });
    layoutParts.forEach(([id]) => {
      const element = findPart(id);
      if (element) element.hidden = Boolean(state.hidden[id]);
    });
    board.style.setProperty('gap', `${state.gap}px`);
    board.style.setProperty('padding-top', `${state.padding}px`);
    board.style.setProperty('padding-right', `${state.padding}px`);
    board.style.setProperty('padding-bottom', '48px');
    board.style.setProperty('padding-left', `${state.padding}px`);
    applyPositions();
  }

  function applyPositions() {
    getDraggablePieces().forEach(({ key, element }) => {
      const position = state.positions[key];
      element.hidden = state.removed.includes(key);
      if (!position) return;
      element.style.transform = `translate(${position.x}px, ${position.y}px)`;
    });
    panel.style.transform = `translate(${state.panelPosition.x}px, ${state.panelPosition.y}px)`;
  }

  function getDraggablePieces() {
    const pieces = [];
    layoutParts.filter(([id]) => !['fonts-div', 'button-div', 'img-div'].includes(id)).forEach(([id]) => {
      const element = findPart(id);
      if (element) pieces.push({ key: id, element });
    });
    board.querySelectorAll('.fonts, .button-div .btn, #editing-selected-images img').forEach((element, index) => {
      pieces.push({ key: `piece-${index}`, element });
    });
    if (sidebar) pieces.push({ key: 'sidebar', element: sidebar });
    return pieces;
  }

  function renderControls() {
    list.replaceChildren();
    state.order.filter((id) => id !== 'img-div').forEach((id) => {
      const label = layoutParts.find(([partId]) => partId === id)?.[1] || id;
      const row = document.createElement('div');
      row.className = 'layout-item';
      row.draggable = true;
      row.dataset.layoutId = id;
      row.innerHTML = `<span class="layout-handle" aria-hidden="true">⋮⋮</span><span class="layout-label">${label}</span><button class="layout-visibility" type="button" aria-pressed="${!state.hidden[id]}" aria-label="${state.hidden[id] ? 'Show' : 'Hide'} ${label}">${state.hidden[id] ? '○' : '●'}</button>`;
      row.querySelector('.layout-visibility').addEventListener('click', () => {
        recordChange();
        state.hidden[id] = !state.hidden[id];
        applyOrder();
        save();
        renderControls();
      });
      row.addEventListener('dragstart', (event) => {
        event.dataTransfer.setData('text/plain', id);
        row.classList.add('is-dragging');
      });
      row.addEventListener('dragend', () => row.classList.remove('is-dragging'));
      row.addEventListener('dragover', (event) => event.preventDefault());
      row.addEventListener('drop', (event) => {
        event.preventDefault();
        const fromId = event.dataTransfer.getData('text/plain');
        const from = state.order.indexOf(fromId);
        const to = state.order.indexOf(id);
        if (from < 0 || to < 0 || from === to) return;
        recordChange();
        const [moved] = state.order.splice(from, 1);
        state.order.splice(to, 0, moved);
        applyOrder();
        save();
        renderControls();
      });
      list.append(row);
    });
  }

  function close() {
    panel.hidden = true;
    layoutButton.setAttribute('aria-expanded', 'false');
  }

  layoutButton.addEventListener('click', () => {
    const opening = panel.hidden;
    document.querySelector('#border-popout')?.setAttribute('hidden', '');
    document.querySelector('#color-popout')?.setAttribute('hidden', '');
    panel.hidden = !opening;
    layoutButton.setAttribute('aria-expanded', String(opening));
    board.classList.toggle('layout-mode', opening);
    if (opening) renderControls();
  });
  panel.querySelector('.tool-close').addEventListener('click', close);
  panel.querySelector('.layout-restore').addEventListener('click', () => {
    recordChange();
    state.removed = [];
    applyPositions();
    save();
  });

  const panelHeading = panel.querySelector('.tool-panel-heading');
  panelHeading.addEventListener('pointerdown', (event) => {
    if (event.target.closest('button')) return;
    const start = state.panelPosition;
    recordChange();
    const originX = event.clientX;
    const originY = event.clientY;
    panelHeading.setPointerCapture(event.pointerId);
    const move = (moveEvent) => {
      state.panelPosition = {
        x: start.x + moveEvent.clientX - originX,
        y: start.y + moveEvent.clientY - originY
      };
      panel.style.transform = `translate(${state.panelPosition.x}px, ${state.panelPosition.y}px)`;
    };
    const end = () => {
      panelHeading.removeEventListener('pointermove', move);
      panelHeading.removeEventListener('pointerup', end);
      panelHeading.releasePointerCapture?.(event.pointerId);
      save();
    };
    panelHeading.addEventListener('pointermove', move);
    panelHeading.addEventListener('pointerup', end, { once: true });
  });

  const gapInput = panel.querySelector('#layout-gap');
  const paddingInput = panel.querySelector('#layout-padding');
  const updateSpacing = () => {
    if (!gapInput.dataset.historyStarted) {
      recordChange();
      gapInput.dataset.historyStarted = 'true';
    }
    state.gap = Number(gapInput.value);
    state.padding = Number(paddingInput.value);
    panel.querySelector('#layout-gap-value').textContent = `${state.gap}px`;
    panel.querySelector('#layout-padding-value').textContent = `${state.padding}px`;
    applyOrder();
    save();
  };
  gapInput.value = state.gap;
  paddingInput.value = state.padding;
  gapInput.addEventListener('input', updateSpacing);
  paddingInput.addEventListener('input', updateSpacing);
  gapInput.addEventListener('change', () => { delete gapInput.dataset.historyStarted; });
  paddingInput.addEventListener('change', () => { delete gapInput.dataset.historyStarted; });

  function enablePieceDragging() {
    getDraggablePieces().forEach(({ key, element }) => {
      element.dataset.layoutPiece = key;
      element.draggable = false;
      element.addEventListener('pointerdown', (event) => {
        if (!board.classList.contains('layout-mode') || event.button !== 0) return;
        if (element === sidebar && event.target.closest('button, input, .border-popout')) return;
        selectedPiece?.classList.remove('layout-selected');
        selectedPiece = element;
        element.classList.add('layout-selected');
        recordChange();
        const start = state.positions[key] || { x: 0, y: 0 };
        const originX = event.clientX;
        const originY = event.clientY;
        element.setPointerCapture(event.pointerId);
        const move = (moveEvent) => {
          const position = { x: start.x + moveEvent.clientX - originX, y: start.y + moveEvent.clientY - originY };
          state.positions[key] = position;
          element.style.transform = `translate(${position.x}px, ${position.y}px)`;
        };
        const end = () => {
          element.removeEventListener('pointermove', move);
          element.removeEventListener('pointerup', end);
          element.releasePointerCapture?.(event.pointerId);
          save();
        };
        element.addEventListener('pointermove', move);
        element.addEventListener('pointerup', end, { once: true });
      });
    });
  }

  layoutParts.forEach(([id]) => {
    const element = findPart(id);
    if (!element) return;
    element.draggable = false;
    element.addEventListener('dragstart', (event) => {
      if (!board.classList.contains('layout-mode')) { event.preventDefault(); return; }
      event.dataTransfer.setData('text/plain', id);
    });
    element.addEventListener('dragover', (event) => {
      if (board.classList.contains('layout-mode')) event.preventDefault();
    });
    element.addEventListener('drop', (event) => {
      event.preventDefault();
      const from = state.order.indexOf(event.dataTransfer.getData('text/plain'));
      const to = state.order.indexOf(id);
      if (from < 0 || to < 0 || from === to) return;
      const [moved] = state.order.splice(from, 1);
      state.order.splice(to, 0, moved);
      applyOrder();
      renderControls();
      save();
    });
  });
  enablePieceDragging();
  document.addEventListener('keydown', (event) => {
    if (!board.classList.contains('layout-mode') || !selectedPiece || !['Delete', 'Backspace'].includes(event.key)) return;
    const key = selectedPiece.dataset.layoutPiece;
    if (!key || key === 'sidebar') return;
    event.preventDefault();
    recordChange();
    state.removed = [...new Set([...state.removed, key])];
    selectedPiece.hidden = true;
    selectedPiece.classList.remove('layout-selected');
    selectedPiece = null;
    save();
  });
  undoButton?.addEventListener('click', () => {
    const previous = history.pop();
    if (!previous) return;
    future.push(copyState());
    restoreState(previous);
  });
  redoButton?.addEventListener('click', () => {
    const next = future.pop();
    if (!next) return;
    history.push(copyState());
    restoreState(next);
  });
  save();
  applyOrder();
}
