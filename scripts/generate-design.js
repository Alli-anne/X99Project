import { imagesByCategory } from './category-images.js';

const designStorageKey = 'x99-generated-design';
const readableText = '#1f2937';
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

function applyDesign(board, options, design) {
  const palette = options.palettes.find((item) => item.id === design.paletteId);
  const pairing = options.fontPairings.find((item) => item.id === design.fontPairingId);
  if (!palette || !pairing) throw new Error('Saved design options are missing.');

  const savedPalette = JSON.parse(sessionStorage.getItem('x99-palette-colors') || 'null');
  const colors = {
    ...palette.colors,
    ...(savedPalette || {}),
    primary: sessionStorage.getItem('x99-main-color') || savedPalette?.primary || palette.colors.primary
  };
  board.style.backgroundColor = '#fffdfd';
  board.style.color = readableText;

  const title = board.querySelector('#project-name');
  title.textContent = sessionStorage.getItem('x99-project-name') || palette.name;
  title.style.fontFamily = `"${pairing.heading.family}", ${pairing.heading.fallback}`;
  title.style.fontWeight = pairing.heading.weight;

  const fontLists = [
    [board.querySelector('#header-font'), pairing.heading],
    [board.querySelector('#body-font'), pairing.body]
  ];
  fontLists.forEach(([list, font]) => {
    list.style.fontFamily = `"${font.family}", ${font.fallback}`;
    list.style.color = readableText;
    list.style.backgroundColor = colors.secondary;
    const weights = Array.isArray(font.weights)
      ? font.weights
      : [font.weight];
    list.querySelectorAll('li').forEach((item, index) => {
      const weight = weights[index];
      item.hidden = weight === undefined;
      if (weight === undefined) return;
      item.textContent = font.family;
      item.style.fontWeight = weight;
    });
  });

  let fontStylesheet = document.querySelector('#generated-fonts');
  if (!fontStylesheet) {
    fontStylesheet = document.createElement('link');
    fontStylesheet.id = 'generated-fonts';
    fontStylesheet.rel = 'stylesheet';
    document.head.append(fontStylesheet);
  }
  fontStylesheet.href = pairing.googleFontsCssUrl;

  const roles = ['primary', 'secondary', 'accent', 'background'];
  const textRoles = ['onPrimary', 'onSecondary', 'onAccent', 'text'];
  board.querySelectorAll('.palette-swatch').forEach((swatch, index) => {
    swatch.style.backgroundColor = colors[roles[index]];
    swatch.style.color = colors[textRoles[index]];
    swatch.textContent = colors[roles[index]].replace('#', '');
  });
  board.querySelectorAll('.btn').forEach((button, index) => {
    const roleIndex = index % 3;
    button.style.backgroundColor = colors[roles[roleIndex]];
    button.style.color = readableText;
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
  if (!design) return;

  try {
    applyDesign(board, await loadDesignOptions(), design);
  } catch (error) {
    console.error(error);
  }
}

generateFromVibe();
applySavedDesign();
