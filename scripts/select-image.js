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

function toggleImageSelection(photo, category, tile) {
  // Use category + ID because IDs may repeat between categories.
  const imageKey = `${category}-${photo.id}`;
  const selectedIndex = selectedImages.findIndex(
    (image) => image.key === imageKey
  );

  if (selectedIndex !== -1) {
    // Already selected: remove it.
    selectedImages.splice(selectedIndex, 1);
  } else {
    // Do not allow more than two.
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

  // Update the clicked tile.
  const isSelected = selectedImages.some(
    (image) => image.key === imageKey
  );

  tile.style.border = isSelected
    ? '3px solid #d6c5c7'
    : '3px solid transparent';

  tile.setAttribute(
    'aria-label',
    `${photo.alt}${isSelected ? ', selected' : ''}`
  );

  // Tell the rest of the app that the selection changed.
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

    
    tile.setAttribute(
      'aria-label',
      `${photo.alt}${isSelected ? ', selected' : ''}`
    );

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

// Show images when a category is selected.
categories.forEach((input) => {
  input.addEventListener('change', () => {
    if (input.checked) {
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

