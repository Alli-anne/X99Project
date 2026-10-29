const paletteKey = 'x99-palette-colors';
const readableText = '#1f2937';
const roles = ['primary', 'secondary', 'accent', 'background'];

const fallbackPalettes = [
  { primary: '#DDD8C4', secondary: '#A3C9A8', accent: '#84B59F', background: '#69A297' },
  { primary: '#C49578', secondary: '#A0D0CB', accent: '#E6C874', background: '#181211' },
  { primary: '#6990C9', secondary: '#C5D6E9', accent: '#D8A872', background: '#101419' },
  { primary: '#9A5551', secondary: '#8FB8B2', accent: '#C9AA69', background: '#FCF5F2' }
];

const swatches = [...document.querySelectorAll('.palette-swatch[data-color-role]')];
const refreshButton = document.querySelector('#refresh-palette');

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
    board.style.color = readableText;
    board.querySelectorAll('.fonts ul').forEach((list) => {
      list.style.backgroundColor = colors.secondary;
      list.style.color = readableText;
    });
    board.querySelectorAll('.fonts h3').forEach((heading) => {
      heading.style.color = readableText;
    });
    board.querySelectorAll('.btn').forEach((button, index) => {
      const role = roles[index % 3];
      button.style.backgroundColor = colors[role];
      button.style.color = readableText;
    });
  }


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
