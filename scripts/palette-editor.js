const paletteKey = 'x99-palette-colors';
const locksKey = 'x99-palette-locks';
const extrasKey = 'x99-palette-extra-colors';
const paletteCountKey = 'x99-palette-count';
const paletteHistoryKey = 'x99-palette-history';
const buttonColorRolesKey = 'x99-button-color-roles';
const paletteOrderKey = 'x99-palette-order';
const roles = ['primary', 'secondary', 'accent', 'background'];
const defaultLocks = { primary: true };

const fallbackPalettes = [
  { primary: '#2563EB', secondary: '#7DD3FC', accent: '#F59E0B', background: '#F8FAFC' },
  { primary: '#2F5D50', secondary: '#84A98C', accent: '#D69E2E', background: '#F8F5F0' },
  { primary: '#7C3F58', secondary: '#C08497', accent: '#EAD7D7', background: '#FFF8F0' },
  { primary: '#4C1D4D', secondary: '#9F7AEA', accent: '#F6AD55', background: '#FFF5F7' }
];

let swatches = [...document.querySelectorAll('.palette-swatch[data-color-role]')];
const refreshButton = document.querySelector('#refresh-palette');
const accessibilityWarning = document.querySelector('#accessibility-warning');
let lockButtons = [...document.querySelectorAll('.palette-lock[data-lock-role]')];
const addColorButton = document.querySelector('#palette-add');
const removeColorButton = document.querySelector('#palette-remove');
const clampPaletteCount = (value) => Math.min(5, Math.max(3, Number(value) || 4));
let paletteCount = clampPaletteCount(sessionStorage.getItem(paletteCountKey));

function readExtraColors() {
  try { return JSON.parse(sessionStorage.getItem(extrasKey) || '{}'); } catch { return {}; }
}

function readButtonColorRoles() {
  try { return JSON.parse(sessionStorage.getItem(buttonColorRolesKey) || '{}'); } catch { return {}; }
}

function readPaletteOrder() {
  try { return JSON.parse(sessionStorage.getItem(paletteOrderKey) || '[]'); } catch { return []; }
}

function savePaletteOrder() {
  const order = [...document.querySelectorAll('.palette-slot [data-color-role]')]
    .map((swatch) => swatch.dataset.colorRole);
  sessionStorage.setItem(paletteOrderKey, JSON.stringify(order));
}

function applyPaletteOrder() {
  const palette = document.querySelector('.color-palette');
  const refresh = document.querySelector('#refresh-palette');
  if (!palette || !refresh) return;
  const slots = new Map([...palette.querySelectorAll('.palette-slot')].map((slot) => [
    slot.querySelector('[data-color-role]')?.dataset.colorRole,
    slot
  ]));
  readPaletteOrder().forEach((role) => {
    const slot = slots.get(role);
    if (slot) palette.insertBefore(slot, refresh);
  });
  [...slots.values()].forEach((slot) => {
    if (slot.parentElement === palette) palette.insertBefore(slot, refresh);
  });
}

function updateColorCountControls() {
  const count = swatches.length;
  if (addColorButton) addColorButton.disabled = count >= 5;
  if (removeColorButton) removeColorButton.disabled = count <= 3;
}

function bindSwatch(swatch) {
  swatch.addEventListener('click', () => {
    if (readLocks()[swatch.dataset.colorRole]) return;
    const input = document.createElement('input');
    input.type = 'color';
    input.value = `#${swatch.textContent.trim().replace('#', '')}`;
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    document.body.append(input);
    input.addEventListener('input', () => {
      if (!input.dataset.historyStarted) {
        recordPaletteChange();
        input.dataset.historyStarted = 'true';
      }
      const role = swatch.dataset.colorRole;
      const palette = readPalette() || Object.fromEntries(roles.map((item) => [item, '#FFFFFF']));
      if (roles.includes(role)) palette[role] = input.value;
      else sessionStorage.setItem(extrasKey, JSON.stringify({ ...readExtraColors(), [role]: input.value }));
      applyPalette(palette);
    });
    input.addEventListener('change', () => {
      delete input.dataset.historyStarted;
      input.remove();
    }, { once: true });
    input.click();
  });
}

function bindLock(button) {
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    recordPaletteChange();
    const locks = readLocks();
    const role = button.dataset.lockRole;
    locks[role] = !locks[role];
    sessionStorage.setItem(locksKey, JSON.stringify(locks));
    syncLockState();
  });
}

if (paletteCount < 4) {
  document.querySelector('[data-color-role="background"]')?.closest('.palette-slot')?.remove();
}
swatches = [...document.querySelectorAll('.palette-swatch[data-color-role]')];
Object.entries(readExtraColors()).forEach(([role, color]) => {
  if (swatches.length >= paletteCount) return;
  const slot = document.createElement('div');
  slot.className = 'palette-slot';
  slot.dataset.extraColor = role;
  slot.innerHTML = `<button class="palette-swatch palette-swatch--extra" type="button" data-color-role="${role}" aria-label="Change extra color">${color.replace('#', '')}</button><button class="palette-lock" type="button" data-lock-role="${role}" aria-label="Lock extra color" aria-pressed="false">🔓</button>`;
  document.querySelector('.color-palette')?.insertBefore(slot, document.querySelector('#refresh-palette'));
});
swatches = [...document.querySelectorAll('.palette-swatch[data-color-role]')];
lockButtons = [...document.querySelectorAll('.palette-lock[data-lock-role]')];
sessionStorage.setItem(paletteCountKey, String(paletteCount));
applyPaletteOrder();
if (!readPaletteOrder().length) savePaletteOrder();

function hexToRgb(hex) {
  const value = hex.replace('#', '');
  const full = value.length === 3 ? value.split('').map((part) => part + part).join('') : value;
  return [0, 2, 4].map((index) => Number.parseInt(full.slice(index, index + 2), 16) / 255);
}

function luminance(hex) {
  return hexToRgb(hex).map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  ).reduce((total, channel, index) => total + channel * [0.2126, 0.7152, 0.0722][index], 0);
}

function contrastRatio(first, second) {
  const light = Math.max(luminance(first), luminance(second));
  const dark = Math.min(luminance(first), luminance(second));
  return (light + 0.05) / (dark + 0.05);
}

function mixHex(first, second, amount = 0.5) {
  const a = hexToRgb(first).map((channel) => Math.round(channel * 255));
  const b = hexToRgb(second).map((channel) => Math.round(channel * 255));
  return `#${a.map((channel, index) => Math.round(channel + (b[index] - channel) * amount).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

function derivedExtraColor(index, palette) {
  const pairs = [
    ['primary', 'secondary'],
    ['secondary', 'accent'],
    ['accent', 'primary']
  ];
  const [first, second] = pairs[Math.max(0, index - 1) % pairs.length];
  const existing = Object.values(palette).map((color) => color.toUpperCase());
  for (const amount of [0.35, 0.5, 0.65, 0.8]) {
    const candidate = mixHex(palette[first], palette[second], amount);
    if (!existing.includes(candidate)) return candidate;
  }
  return mixHex(palette[first], palette[second], 0.5);
}

function paletteTextColor(background, colors) {
  const candidates = roles.map((role) => colors[role]);
  return candidates.sort((first, second) =>
    contrastRatio(second, background) - contrastRatio(first, background)
  )[0];
}

function updateAccessibilityWarning(colors) {
  if (!accessibilityWarning) return;
  const combinations = [
    [colors.secondary, paletteTextColor(colors.secondary, colors)],
    [colors.primary, paletteTextColor(colors.primary, colors)],
    [colors.accent, paletteTextColor(colors.accent, colors)]
  ];
  const hasLowContrast = combinations.some(([background, foreground]) =>
    contrastRatio(background, foreground) < 4.5
  );
  accessibilityWarning.hidden = !hasLowContrast;
  accessibilityWarning.textContent = hasLowContrast
    ? 'Warning: some palette colors may be difficult to read together. Try a different palette or choose a stronger color contrast.'
    : '';
}

function readPalette() {
  try {
    return JSON.parse(sessionStorage.getItem(paletteKey) || 'null');
  } catch {
    return null;
  }
}

function readLocks() {
  try {
    return { ...defaultLocks, ...JSON.parse(sessionStorage.getItem(locksKey) || '{}') };
  } catch {
    return { ...defaultLocks };
  }
}

function readHistory(key) {
  try { return JSON.parse(sessionStorage.getItem(key) || '[]'); } catch { return []; }
}

let paletteHistory = readHistory(paletteHistoryKey);
let paletteFuture = readHistory(`${paletteHistoryKey}-future`);

function paletteSnapshot() {
  return { palette: readPalette(), extras: readExtraColors(), locks: readLocks(), count: paletteCount, buttonRoles: readButtonColorRoles(), order: readPaletteOrder() };
}

function saveHistory() {
  sessionStorage.setItem(paletteHistoryKey, JSON.stringify(paletteHistory));
  sessionStorage.setItem(`${paletteHistoryKey}-future`, JSON.stringify(paletteFuture));
  const layoutMode = document.querySelector('#edit-page')?.classList.contains('layout-mode');
  if (!layoutMode) {
    const undo = document.querySelector('#undo');
    const redo = document.querySelector('#redo');
    if (undo) undo.disabled = paletteHistory.length === 0;
    if (redo) redo.disabled = paletteFuture.length === 0;
  }
}

function recordPaletteChange() {
  paletteHistory.push(paletteSnapshot());
  paletteFuture = [];
  saveHistory();
}

function syncLockState() {
  const locks = readLocks();
  swatches.forEach((swatch) => {
    const locked = Boolean(locks[swatch.dataset.colorRole]);
    swatch.classList.toggle('is-locked', locked);
    swatch.setAttribute('aria-disabled', String(locked));
  });
  lockButtons.forEach((button) => {
    const locked = Boolean(locks[button.dataset.lockRole]);
    button.setAttribute('aria-pressed', String(locked));
    button.setAttribute('aria-label', `${locked ? 'Unlock' : 'Lock'} ${button.dataset.lockRole} color`);
    button.innerHTML = locked
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2"></rect><path d="M8 10V7a4 4 0 0 1 8 0v3"></path></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2"></rect><path d="M8 10V7a4 4 0 0 1 7-2"></path></svg>';
  });
}

function normalizeColor(value) {
  return value.toUpperCase();
}

function blackOrWhite(hex) {
  return luminance(hex) > 0.45 ? '#000000' : '#ffffff';
}

function applyPalette(palette, save = true) {
  const colors = Object.fromEntries(
    roles.map((role) => [role, normalizeColor(palette[role])])
  );
  const allColors = { ...colors, ...readExtraColors() };

  swatches.forEach((swatch) => {
    const color = allColors[swatch.dataset.colorRole];
    if (!color) return;
    swatch.style.backgroundColor = color;
    swatch.style.color = blackOrWhite(color);
    swatch.textContent = color.replace('#', '');
  });

  const board = document.querySelector('#edit-page');
  if (board) {
    board.style.backgroundColor = '#fffdfd';
    board.style.color = paletteTextColor('#fffdfd', colors);
    board.querySelectorAll('.fonts ul').forEach((list) => {
      list.style.backgroundColor = colors.secondary;
      list.style.color = paletteTextColor(colors.secondary, colors);
    });
    board.querySelectorAll('.fonts h3').forEach((heading) => {
      heading.style.color = paletteTextColor('#fffdfd', colors);
    });
    const buttonRoles = readButtonColorRoles();
    board.querySelectorAll('.btn').forEach((button, index) => {
      const role = buttonRoles[index] || roles[index % 3];
      button.dataset.colorRole = role;
      button.style.backgroundColor = allColors[role] || colors[roles[index % 3]];
      button.style.color = paletteTextColor(button.style.backgroundColor, colors);
    });
  }

  updateAccessibilityWarning(colors);


  if (save) sessionStorage.setItem(paletteKey, JSON.stringify(colors));
  updateColorCountControls();
  syncLockState();
  return colors;
}

function randomPalette() {
  const current = readPalette();
  const locks = readLocks();
  const choices = fallbackPalettes.filter((palette) =>
    !current || palette.primary !== current.primary
  );
  const next = choices[Math.floor(Math.random() * choices.length)] || fallbackPalettes[0];
  const nextPalette = {
    ...next,
    primary: locks.primary
      ? (current?.primary || sessionStorage.getItem('x99-main-color') || next.primary)
      : next.primary,
    background: next.background
  };
  roles.forEach((role) => {
    if (locks[role] && current?.[role]) nextPalette[role] = current[role];
  });
  const extraColors = readExtraColors();
  Object.keys(extraColors).forEach((role) => {
    const index = Number(role.replace('extra-', '')) || 1;
    nextPalette[role] = derivedExtraColor(index, nextPalette);
  });
  return nextPalette;
}

swatches.forEach(bindSwatch);

function bindPaletteDragging() {
  const slots = [...document.querySelectorAll('.palette-slot')];
  slots.forEach((slot) => {
    if (slot.dataset.dragBound) return;
    slot.dataset.dragBound = 'true';
    const swatch = slot.querySelector('[data-color-role]');
    const role = swatch?.dataset.colorRole;
    const handle = document.createElement('button');
    handle.type = 'button';
    handle.className = 'palette-drag-handle';
    handle.draggable = true;
    handle.textContent = '⋮⋮';
    handle.title = 'Drag to move this color';
    handle.setAttribute('aria-label', 'Move color');
    slot.prepend(handle);
    swatch.draggable = true;
    const startPaletteDrag = (event) => {
      if (readLocks()[role]) {
        event.preventDefault();
        return;
      }
      slot.classList.add('is-dragging');
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', role || '');
      event.dataTransfer.setData('application/x99-palette-reorder', 'true');
    };
    handle.addEventListener('dragstart', startPaletteDrag);
    swatch.addEventListener('dragstart', startPaletteDrag);
    handle.addEventListener('dragend', () => slot.classList.remove('is-dragging'));
    swatch.addEventListener('dragend', () => slot.classList.remove('is-dragging'));
    slot.addEventListener('dragover', (event) => event.preventDefault());
    slot.addEventListener('drop', (event) => {
      event.preventDefault();
      const fromRole = event.dataTransfer.getData('text/plain');
      const fromSlot = document.querySelector(`[data-color-role="${fromRole}"]`)?.closest('.palette-slot');
      if (!fromSlot || fromSlot === slot) return;
      if (event.dataTransfer.getData('application/x99-palette-reorder') === 'true') {
        if (readLocks()[fromRole] || readLocks()[role]) return;
        recordPaletteChange();
        const rect = slot.getBoundingClientRect();
        const insertBefore = event.clientX < rect.left + rect.width / 2;
        slot.parentElement.insertBefore(fromSlot, insertBefore ? slot : slot.nextSibling);
        savePaletteOrder();
        return;
      }
      recordPaletteChange();
      const toRole = slot.querySelector('[data-color-role]')?.dataset.colorRole;
      const palette = readPalette() || {};
      const extras = readExtraColors();
      const getColor = (role) => roles.includes(role) ? palette[role] : extras[role];
      const fromColor = getColor(fromRole);
      const toColor = getColor(toRole);
      if (!fromColor || !toColor) return;
      if (roles.includes(fromRole)) palette[fromRole] = toColor;
      else extras[fromRole] = toColor;
      if (roles.includes(toRole)) palette[toRole] = fromColor;
      else extras[toRole] = fromColor;
      sessionStorage.setItem(paletteKey, JSON.stringify(palette));
      sessionStorage.setItem(extrasKey, JSON.stringify(extras));
      applyPalette(palette);
    });
  });
}

bindPaletteDragging();

function setupButtonColorPicker() {
  const buttons = [...document.querySelectorAll('.button-div .btn')];
  if (!buttons.length) return;
  const picker = document.createElement('div');
  picker.className = 'button-color-popover';
  picker.hidden = true;
  picker.setAttribute('role', 'dialog');
  picker.setAttribute('aria-label', 'Choose button color');
  document.body.append(picker);
  let activeButton = null;
  const close = () => { picker.hidden = true; activeButton = null; };
  buttons.forEach((button, index) => {
    button.addEventListener('click', (event) => {
      if (document.querySelector('#edit-page')?.classList.contains('layout-mode')) return;
      event.stopPropagation();
      activeButton = button;
      const styleSettings = picker.querySelector('#button-style-popout');
      picker.replaceChildren();
      const colors = { ...(readPalette() || fallbackPalettes[0]), ...readExtraColors() };
      Object.entries(colors).forEach(([role, color]) => {
        const option = document.createElement('button');
        option.type = 'button';
        option.className = 'button-color-option';
        option.style.backgroundColor = color;
        option.style.color = blackOrWhite(color);
        option.textContent = color.replace('#', '');
        option.setAttribute('aria-label', `Use ${color} for button`);
        option.addEventListener('click', () => {
          recordPaletteChange();
          const selected = readButtonColorRoles();
          selected[index] = role;
          sessionStorage.setItem(buttonColorRolesKey, JSON.stringify(selected));
          applyPalette(readPalette() || fallbackPalettes[0]);
          if (!picker.dataset.docked) close();
        });
        picker.append(option);
      });
      if (styleSettings) picker.append(styleSettings);
      const rect = button.getBoundingClientRect();
      picker.style.left = `${Math.min(window.innerWidth - 220, Math.max(8, rect.left))}px`;
      picker.style.top = `${Math.min(window.innerHeight - 80, rect.bottom + 8)}px`;
      picker.hidden = false;
    });
  });
  document.addEventListener('click', (event) => {
    if (picker.dataset.docked) return;
    if (activeButton && !picker.contains(event.target) && !event.target.closest('.button-div .btn')) close();
  });
}

setupButtonColorPicker();

addColorButton?.addEventListener('click', () => {
  if (paletteCount >= 5) return;
  recordPaletteChange();
  paletteCount += 1;
  sessionStorage.setItem(paletteCountKey, String(paletteCount));
  if (paletteCount === 4 && !document.querySelector('[data-color-role="background"]')) {
    const color = readPalette()?.background || '#FFFFFF';
    const slot = document.createElement('div');
    slot.className = 'palette-slot';
    slot.innerHTML = `<button class="palette-swatch palette-swatch--teal" type="button" data-color-role="background" aria-label="Change background color">${color.replace('#', '')}</button><button class="palette-lock" type="button" data-lock-role="background" aria-label="Lock background color" aria-pressed="false">🔓</button>`;
    document.querySelector('.color-palette')?.insertBefore(slot, document.querySelector('#refresh-palette'));
    swatches = [...document.querySelectorAll('.palette-swatch[data-color-role]')];
    lockButtons = [...document.querySelectorAll('.palette-lock[data-lock-role]')];
    bindSwatch(slot.querySelector('.palette-swatch'));
    bindLock(slot.querySelector('.palette-lock'));
    bindPaletteDragging();
    savePaletteOrder();
    applyPalette(readPalette() || fallbackPalettes[0]);
    return;
  }
  const index = Math.max(1, paletteCount - 4);
  const role = `extra-${index}`;
  const currentPalette = readPalette() || fallbackPalettes[0];
  const extraColor = derivedExtraColor(index, { ...currentPalette, ...readExtraColors() });
  const slot = document.createElement('div');
  slot.className = 'palette-slot';
  slot.dataset.extraColor = role;
  slot.innerHTML = `<button class="palette-swatch palette-swatch--extra" type="button" data-color-role="${role}" aria-label="Change extra color">${extraColor.replace('#', '')}</button><button class="palette-lock" type="button" data-lock-role="${role}" aria-label="Lock extra color" aria-pressed="false">🔓</button>`;
  document.querySelector('.color-palette')?.insertBefore(slot, document.querySelector('#refresh-palette'));
  sessionStorage.setItem(extrasKey, JSON.stringify({ ...readExtraColors(), [role]: extraColor }));
  savePaletteOrder();
  swatches = [...document.querySelectorAll('.palette-swatch[data-color-role]')];
  lockButtons = [...document.querySelectorAll('.palette-lock[data-lock-role]')];
  bindSwatch(slot.querySelector('.palette-swatch'));
  bindLock(slot.querySelector('.palette-lock'));
  bindPaletteDragging();
  applyPalette(readPalette() || fallbackPalettes[0]);
});

removeColorButton?.addEventListener('click', () => {
  if (paletteCount <= 3) return;
  recordPaletteChange();
  paletteCount -= 1;
  sessionStorage.setItem(paletteCountKey, String(paletteCount));
  const extras = readExtraColors();
  const role = swatches.at(-1).dataset.colorRole;
  document.querySelector(`[data-extra-color="${role}"]`)?.remove();
  if (role.startsWith('extra-')) delete extras[role];
  if (role === 'background') document.querySelector('[data-color-role="background"]')?.closest('.palette-slot')?.remove();
  sessionStorage.setItem(extrasKey, JSON.stringify(extras));
  savePaletteOrder();
  swatches = [...document.querySelectorAll('.palette-swatch[data-color-role]')];
  lockButtons = [...document.querySelectorAll('.palette-lock[data-lock-role]')];
  updateColorCountControls();
  syncLockState();
});

refreshButton?.addEventListener('click', () => {
  recordPaletteChange();
  const next = randomPalette();
  const extras = readExtraColors();
  const nextExtras = Object.fromEntries(Object.keys(extras).map((role) => [role, next[role]]));
  sessionStorage.setItem(extrasKey, JSON.stringify(nextExtras));
  applyPalette(next);
});

lockButtons.forEach(bindLock);

const saved = readPalette();
if (saved) applyPalette(saved, false);

syncLockState();
saveHistory();

const undoControl = document.querySelector('#undo');
const redoControl = document.querySelector('#redo');
function restorePaletteSnapshot(snapshot) {
  sessionStorage.setItem(paletteKey, JSON.stringify(snapshot.palette || {}));
  sessionStorage.setItem(extrasKey, JSON.stringify(snapshot.extras || {}));
  sessionStorage.setItem(locksKey, JSON.stringify(snapshot.locks || {}));
  sessionStorage.setItem(paletteCountKey, String(clampPaletteCount(snapshot.count)));
  sessionStorage.setItem(buttonColorRolesKey, JSON.stringify(snapshot.buttonRoles || {}));
  sessionStorage.setItem(paletteOrderKey, JSON.stringify(snapshot.order || []));
  window.location.reload();
}
undoControl?.addEventListener('click', () => {
  if (document.querySelector('#edit-page')?.classList.contains('layout-mode')) return;
  const previous = paletteHistory.pop();
  if (!previous) return;
  paletteFuture.push(paletteSnapshot());
  saveHistory();
  restorePaletteSnapshot(previous);
});
redoControl?.addEventListener('click', () => {
  if (document.querySelector('#edit-page')?.classList.contains('layout-mode')) return;
  const next = paletteFuture.pop();
  if (!next) return;
  paletteHistory.push(paletteSnapshot());
  saveHistory();
  restorePaletteSnapshot(next);
});

document.addEventListener('x99-design-applied', (event) => {
  if (!readPalette()) applyPalette(event.detail, false);
});
