import { imagesByCategory } from './category-images.js';


const gallery = document.querySelector('.style-preview__grid');
const heading = document.querySelector('#preview-title');
const categories = document.querySelectorAll('input[name="category"]');

// Build one square image tile for every photo in the category's list.
function showImages(category) {
  const photos = imagesByCategory[category];
  if (!photos) return;

  const tiles = photos.map((photo) => {
    const tile = document.createElement('figure');
    tile.className = 'style-preview__tile';

    const image = document.createElement('img');
    image.className = 'style-preview__image';
    image.src = photo.url;
    image.alt = photo.alt;
    image.width = 600;
    image.height = 600;
    image.loading = 'lazy';
    image.decoding = 'async';

    tile.append(image);
    return tile;
  });

  // Replace the old tiles so repeated clicks never accumulate images.
  gallery.replaceChildren(...tiles);
  heading.textContent = category.charAt(0).toUpperCase() + category.slice(1);
}

// Native radios handle clicks and keyboard selection; JS updates the gallery.
for (const input of categories) {
  input.addEventListener('change', () => {
    if (input.checked) showImages(input.value);
  });
}

// Read the actual selection, including a selection restored by the browser.
const selectedCategory = document.querySelector('input[name="category"]:checked');
showImages(selectedCategory?.value ?? 'modern');
