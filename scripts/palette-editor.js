const paletteKey = 'x99-palette-colors';
const roles = ['primary', 'secondary', 'accent', 'background'];

const fallbackPalettes = [
  { primary: '#DDD8C4', secondary: '#A3C9A8', accent: '#84B59F', background: '#69A297' },
  { primary: '#C49578', secondary: '#A0D0CB', accent: '#E6C874', background: '#181211' },
  { primary: '#6990C9', secondary: '#C5D6E9', accent: '#D8A872', background: '#101419' },
  { primary: '#9A5551', secondary: '#8FB8B2', accent: '#C9AA69', background: '#FCF5F2' }
];

const swatches = [...document.querySelectorAll('.palette-swatch[data-color-role]')];
const refreshButton = document.querySelector('#refresh-palette');
const accessibilityWarning = document.querySelector('#accessibility-warning');

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

function normalizeColor(value) {
  return value.toUpperCase();
}

function applyPalette(palette, save = true) {
  const colors = Object.fromEntries(
    roles.map((role) => [role, normalizeColor(palette[role])])
  );
  const chosenMainColor = sessionStorage.getItem('x99-main-color');
  if (chosenMainColor) colors.primary = normalizeColor(chosenMainColor);

  swatches.forEach((swatch) => {
    const color = colors[swatch.dataset.colorRole];
    swatch.style.backgroundColor = color;
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
    board.querySelectorAll('.btn').forEach((button, index) => {
      const role = roles[index % 3];
      button.style.backgroundColor = colors[role];
      button.style.color = paletteTextColor(colors[role], colors);
    });
  }

  updateAccessibilityWarning(colors);


  if (save) sessionStorage.setItem(paletteKey, JSON.stringify(colors));
  return colors;
}

function randomPalette() {
  const current = readPalette();
  const choices = fallbackPalettes.filter((palette) =>
    !current || palette.primary !== current.primary
  );
  const next = choices[Math.floor(Math.random() * choices.length)] || fallbackPalettes[0];
  const displayedBackground = swatches.find((swatch) => swatch.dataset.colorRole === 'background')?.textContent;
  return {
    ...next,
    primary: sessionStorage.getItem('x99-main-color') || current?.primary || next.primary,
    background: current?.background || (displayedBackground ? `#${displayedBackground.trim().replace('#', '')}` : next.background)
  };
}

swatches.forEach((swatch) => {
  swatch.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'color';
    input.value = `#${swatch.textContent.trim().replace('#', '')}`;
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    document.body.append(input);
    input.addEventListener('input', () => {
      const palette = readPalette() || Object.fromEntries(roles.map((role) => [role, '#FFFFFF']));
      palette[swatch.dataset.colorRole] = input.value;
      applyPalette(palette);
    });
    input.addEventListener('change', () => input.remove(), { once: true });
    input.click();
  });
});

refreshButton?.addEventListener('click', () => applyPalette(randomPalette()));

const saved = readPalette();
if (saved) applyPalette(saved, false);

document.addEventListener('x99-design-applied', (event) => {
  if (!readPalette()) applyPalette(event.detail, false);
});
