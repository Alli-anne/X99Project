import { imagesByCategory } from './category-images.js';

const designStorageKey = 'x99-generated-design';
const fontOverridesKey = 'x99-font-overrides';
const paletteRoles = ['primary', 'secondary', 'accent', 'background'];

function paletteLuminance(hex) {
  const value = hex.replace('#', '');
  const full = value.length === 3 ? value.split('').map((part) => part + part).join('') : value;
  return [0, 2, 4].map((index) => Number.parseInt(full.slice(index, index + 2), 16) / 255)
    .map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
    .reduce((total, channel, index) => total + channel * [0.2126, 0.7152, 0.0722][index], 0);
}

function readablePaletteColor(background, colors) {
  return paletteRoles
    .map((role) => colors[role])
    .sort((first, second) => {
      const contrast = (color) => {
        const firstLuminance = paletteLuminance(background);
        const secondLuminance = paletteLuminance(color);
        return (Math.max(firstLuminance, secondLuminance) + 0.05) /
          (Math.min(firstLuminance, secondLuminance) + 0.05);
      };
      return contrast(second) - contrast(first);
    })[0];
}

function blackOrWhite(hex) {
  return paletteLuminance(hex) > 0.45 ? '#000000' : '#ffffff';
}

function blendHex(first, second, amount = 0.5) {
  const toRgb = (hex) => hex.replace('#', '').match(/.{2}/g).map((part) => Number.parseInt(part, 16));
  const firstRgb = toRgb(first);
  const secondRgb = toRgb(second);
  return `#${firstRgb.map((channel, index) => Math.round(channel + (secondRgb[index] - channel) * amount).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

function distinctBlend(first, second, existing) {
  for (const amount of [0.35, 0.5, 0.65, 0.8]) {
    const candidate = blendHex(first, second, amount);
    if (!existing.has(candidate)) return candidate;
  }
  return blendHex(first, second, 0.5);
}
const imageLookup = new Map(
  Object.entries(imagesByCategory).flatMap(([category, photos]) =>
    photos.map((photo) => [`${category}-${photo.id}`, photo])
  )
);

let optionsPromise;

async function loadDesignOptions() {
  optionsPromise ??= fetch('./data/design-options.json').then((response) => {
    if (!response.ok) throw new Error('Design options could not be loaded.');
    return response.json();
  });
  return optionsPromise;
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function getSelectedDesign() {
  return JSON.parse(sessionStorage.getItem('selectedImages') || '[]');
}

function chooseDesign(options, category, selectedImages) {
  const palettes = options.palettes.filter((palette) =>
    palette.categories.includes(category)
  );
  if (!palettes.length) {
    throw new Error('No palettes are available for this category.');
  }
  const palette = randomItem(palettes);
  const pairings = options.fontPairings.filter((pairing) =>
    palette.recommendedFontPairingIds.includes(pairing.id)
  );
  const pairing = randomItem(pairings);

  if (!palette || !pairing) {
    throw new Error('No matching palette and font pairing was found.');
  }

  return {
    category,
    imageKeys: selectedImages.map((image) => image.key),
    paletteId: palette.id,
    fontPairingId: pairing.id
  };
}

function saveDesign(design) {
  sessionStorage.setItem(designStorageKey, JSON.stringify(design));
}

function getSavedDesign() {
  return JSON.parse(sessionStorage.getItem(designStorageKey) || 'null');
}

function getFontOverrides() {
  return JSON.parse(sessionStorage.getItem(fontOverridesKey) || '{}');
}

// Resolve saved choices back to the JSON, so it remains the source of font data.
function getDesignFonts(options, design = getSavedDesign()) {
  const pairing = options.fontPairings.find((item) => item.id === design?.fontPairingId)
    || options.fontPairings[0];
  const overrides = getFontOverrides();
  return Object.fromEntries(['heading', 'body'].map((role) => [role,
    options.fontPairings.map((item) => item[role])
      .find((font) => font.family === overrides[role]?.family) || pairing[role]
  ]));
}

function applyFonts(board, options, design) {
  const { heading, body } = getDesignFonts(options, design);
  const title = board.querySelector('#project-name');
  title.style.fontFamily = `"${heading.family}", ${heading.fallback}`;
  title.style.fontWeight = heading.weight;
  [[board.querySelector('#header-font'), heading], [board.querySelector('#body-font'), body]]
    .forEach(([list, font]) => {
      list.style.fontFamily = `"${font.family}", ${font.fallback}`;
      const weights = [...new Set(font.weights?.length ? font.weights : [font.weight])];
      list.replaceChildren(...weights.map((weight) => {
        const item = document.createElement('li');
        item.textContent = font.family;
        item.style.fontWeight = weight;
        return item;
      }));
    });
  let stylesheet = document.querySelector('#generated-fonts');
  if (!stylesheet) {
    stylesheet = document.createElement('link');
    stylesheet.id = 'generated-fonts';
    stylesheet.rel = 'stylesheet';
    document.head.append(stylesheet);
  }
  stylesheet.href = fontCssUrl([heading, body]);
}

function fontCssUrl(fonts) {
  const families = fonts.map((font) => {
    const family = encodeURIComponent(font.family).replace(/%20/g, '+');
    const weights = Array.isArray(font.weights) && font.weights.length
      ? font.weights
      : [font.weight];
    return `family=${family}:wght@${weights.join(';')}`;
  });
  return `https://fonts.googleapis.com/css2?${families.join('&')}&display=swap`;
}

function applyDesign(board, options, design) {
  const palette = options.palettes.find((item) => item.id === design.paletteId);
  const pairing = options.fontPairings.find((item) => item.id === design.fontPairingId);
  if (!palette || !pairing) throw new Error('Saved design options are missing.');

  const savedPalette = JSON.parse(sessionStorage.getItem('x99-palette-colors') || 'null');
  const colors = {
    ...palette.colors,
    ...(savedPalette || {}),
    primary: savedPalette?.primary || sessionStorage.getItem('x99-main-color') || palette.colors.primary
  };
  board.designColors = colors;
  const existingColors = new Set(Object.values(colors).map((color) => color.toUpperCase()));
  const extraOne = distinctBlend(colors.primary, colors.secondary, existingColors);
  existingColors.add(extraOne);
  const extraColors = JSON.parse(sessionStorage.getItem('x99-palette-extra-colors') || 'null') || { 'extra-1': extraOne };
  sessionStorage.setItem('x99-palette-extra-colors', JSON.stringify(extraColors));
  if (!sessionStorage.getItem('x99-palette-count')) sessionStorage.setItem('x99-palette-count', '5');
  board.style.backgroundColor = '#fffdfd';
  board.style.color = readablePaletteColor('#fffdfd', colors);

  const title = board.querySelector('#project-name');
  title.textContent = sessionStorage.getItem('x99-project-name') || palette.name;
  applyFonts(board, options, design);
  board.querySelectorAll('#header-font, #body-font').forEach((list) => {
    list.style.color = readablePaletteColor(colors.secondary, colors);
    list.style.backgroundColor = colors.secondary;
  });

  const roles = ['primary', 'secondary', 'accent', 'background'];
  const textRoles = ['onPrimary', 'onSecondary', 'onAccent', 'text'];
  board.querySelectorAll('.palette-swatch').forEach((swatch, index) => {
    if (!roles[index]) return;
    swatch.style.backgroundColor = colors[roles[index]];
    swatch.style.color = blackOrWhite(colors[roles[index]]);
    swatch.textContent = colors[roles[index]].replace('#', '');
  });
  board.querySelectorAll('.btn').forEach((button, index) => {
    const roleIndex = index % 3;
    button.style.backgroundColor = colors[roles[roleIndex]];
    button.style.color = readablePaletteColor(colors[roles[roleIndex]], colors);
  });

  const imageContainer = board.querySelector('#editing-selected-images');
  const imageKeys = design.imageKeys || design.imageIds || [];
  const images = imageKeys
    .map((id) => imageLookup.get(id))
    .filter(Boolean)
    .map((photo) => {
      const image = document.createElement('img');
      image.className = 'catagory-img';
      image.src = photo.url;
      image.alt = photo.alt;
      image.loading = 'lazy';
      return image;
    });
  imageContainer.replaceChildren(...images);
  document.dispatchEvent(new CustomEvent('x99-design-applied', { detail: colors }));
}

async function generateFromVibe() {
  const generateButton = document.querySelector('.vibe-page__generate-button');
  if (!generateButton) return;

  generateButton.addEventListener('click', async (event) => {
    event.preventDefault();
    const selectedImages = getSelectedDesign();
    const selectedCategory =
      document.querySelector('input[name="category"]:checked')?.value ||
      selectedImages[0]?.category;

    if (!selectedImages.length) {
      alert('Choose at least one image before generating.');
      return;
    }

    try {
      const options = await loadDesignOptions();
      saveDesign(chooseDesign(options, selectedCategory, selectedImages));
      sessionStorage.removeItem(fontOverridesKey);
      window.location.href = generateButton.href;
    } catch (error) {
      alert(error.message);
    }
  });
}

async function applySavedDesign() {
  const board = document.querySelector('#edit-page, #final-page');
  if (!board) return;
  const design = getSavedDesign();
  try {
    const options = await loadDesignOptions();
    if (design) applyDesign(board, options, design);
    else applyFonts(board, options);
  } catch (error) {
    console.error(error);
  }
}

async function setupFontRefresh() {
  const buttons = [...document.querySelectorAll('#edit-page .fonts h3 .refresh-button')];
  if (!buttons.length) return;
  buttons.forEach((button, index) => {
    button.addEventListener('click', async () => {
      try {
        const options = await loadDesignOptions();
        const role = index === 0 ? 'heading' : 'body';
        const currentOverrides = getFontOverrides();
        const currentFamily = getDesignFonts(options)[role].family;
        const candidates = [...new Map(options.fontPairings
          .map((item) => [item[role].family, item[role]])).values()]
          .filter((font) => font.family !== currentFamily);
        const nextFont = randomItem(candidates);
        if (!nextFont) return;
        sessionStorage.setItem(fontOverridesKey, JSON.stringify({
          ...currentOverrides,
          [role]: nextFont
        }));
        // Refresh typography without rebuilding colors, images, or the layout.
        applyFonts(document.querySelector('#edit-page'), options);
      } catch (error) {
        console.error('Could not refresh font.', error);
      }
    });
  });
}

generateFromVibe();
export const designReady = applySavedDesign();
setupFontRefresh();
