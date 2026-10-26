import { imagesByCategory } from './category-images.js';

const categories = document.querySelectorAll('input[name="category"]');
const previewGrid = document.querySelector('.style-preview__grid');
const previewTitle = document.querySelector('#preview-title');

// Store up to two selected image objects.
const selectedImages = [];

function notifySelectionChange() {
  document.dispatchEvent(
    new CustomEvent('imagesselectionchange', {
      detail: { selectedImages: [...selectedImages] }
    })
  );
}

function clearSelectedImages() {
  selectedImages.length = 0;
  notifySelectionChange();
}


function toggleImageSelection(photo, category, tile) {
  const imageKey = `${category}-${photo.id}`;

  const selectedIndex = selectedImages.findIndex(
    (image) => image.key === imageKey
  );

  if (selectedIndex !== -1) {
    // Clicking a selected image deselects it.
    selectedImages.splice(selectedIndex, 1);
  } else {
    // If two images are selected, do nothing.
    if (selectedImages.length >= 2) {
      return;
    }

    selectedImages.push({
      key: imageKey,
      id: photo.id,
      category,
      url: photo.url,
      alt: photo.alt
    });
  }

  // Update the visual state of every tile using its unique key.
  const tiles = previewGrid.querySelectorAll('.style-preview__tile');

  tiles.forEach((currentTile) => {
    const isSelected = selectedImages.some(
      (image) => image.key === currentTile.dataset.imageKey
    );

    currentTile.style.border = isSelected
      ? '3px solid #839096'
      : 'none';

    currentTile.setAttribute('aria-checked', String(isSelected));
    currentTile.setAttribute(
      'aria-label',
      `${currentTile.querySelector('img').alt}${isSelected ? ', selected' : ''}`
    );
  });

  notifySelectionChange();
}


// Build one square image tile for every photo in the category's list.
function showImages(category) {
  const photos = imagesByCategory[category];
  if (!photos || !previewGrid) return;

  if (previewTitle) {
    previewTitle.textContent =
      category.charAt(0).toUpperCase() + category.slice(1);
  }

  previewGrid.replaceChildren();

  const tiles = photos.map((photo) => {
    const tile = document.createElement('figure');
    tile.className = 'style-preview__tile';
    tile.setAttribute('role', 'checkbox');
    tile.setAttribute('tabindex', '0');

    const imageKey = `${category}-${photo.id}`;
    const isSelected = selectedImages.some(
      (image) => image.key === imageKey
    );

    tile.dataset.imageKey = imageKey;
    
    tile.setAttribute('aria-checked', String(isSelected));
    tile.style.border = isSelected
      ? '3px solid #839096'
      : 'none';

    const image = document.createElement('img');
    image.className = 'style-preview__image';
    image.src = photo.url;
    image.alt = photo.alt;
    image.width = 600;
    image.height = 600;
    image.loading = 'lazy';
    image.decoding = 'async';

    tile.append(image);

    tile.addEventListener('click', () => {
      toggleImageSelection(photo, category, tile);
    });

    tile.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleImageSelection(photo, category, tile);
      }
    });

    return tile;
  });

  previewGrid.append(...tiles);
}

// Clear previous selections when a new category is selected.
categories.forEach((input) => {
  input.addEventListener('change', () => {
    if (input.checked) {
      clearSelectedImages();
      showImages(input.value);
    }
  });
});

// Display the initially selected category.
const initialCategory = [...categories].find(
  (input) => input.checked
);

if (initialCategory) {
  showImages(initialCategory.value);
}

const generateButton = document.querySelector(
  '.vibe-page__generate-button'
);

if (generateButton) {
  generateButton.addEventListener('click', () => {
    sessionStorage.setItem(
      'selectedImages',
      JSON.stringify(selectedImages)
    );
  });
}

