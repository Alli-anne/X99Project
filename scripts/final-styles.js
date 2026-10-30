
function getSavedSettings(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch (error) {
    console.error(`Could not read ${key}:`, error);
    return null;
  }
}

function colorToRgba(color, opacity) {
  if (color.startsWith('rgb')) {
    const values = color.match(/[\d.]+/g);

    if (!values || values.length < 3) {
      return `rgba(221, 216, 196, ${opacity})`;
    }

    return `rgba(${values[0]}, ${values[1]}, ${values[2]}, ${opacity})`;
  }

  let hex = color.replace('#', '');

  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }

  const red = parseInt(hex.substring(0, 2), 16);
  const green = parseInt(hex.substring(2, 4), 16);
  const blue = parseInt(hex.substring(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

function applyFinalStyles() {
  const imageContainer = document.querySelector(
    '#editing-selected-images'
  );

  if (!imageContainer) return;

  const images = imageContainer.querySelectorAll('img');

  const buttons = document.querySelectorAll(
    '.button-div .btn'
  );

  const borderSettings = getSavedSettings(
    'projectBorderSettings'
  );

  const colorSettings = getSavedSettings(
    'projectColorSettings'
  );

  // Apply image and button borders independently.
  if (borderSettings) {

    function applyBorder(elements, settings) {
      if (!settings) return;

      elements.forEach((element) => {
        element.style.boxSizing = 'border-box';

        element.style.border = settings.enabled
          ? `${settings.thickness}px solid ${settings.color}`
          : 'none';

        element.style.borderRadius =
          `${settings.radius}px`;
      });
    }

    applyBorder(images, borderSettings.images);
    applyBorder(buttons, borderSettings.buttons);
  }

  // Apply saved color overlays to images.
  if (colorSettings) {

    images.forEach((img) => {
      let wrapper = img.parentElement;

      // Create wrapper if needed.
      if (!wrapper.classList.contains('color-overlay-wrapper')) {
        wrapper = document.createElement('div');
        wrapper.className = 'color-overlay-wrapper';

        img.parentNode.insertBefore(wrapper, img);
        wrapper.appendChild(img);
      }

      // Find or create overlay layer.
      let layer = wrapper.querySelector(
        '.color-overlay-layer'
      );

      if (!layer) {
        layer = document.createElement('span');
        layer.className = 'color-overlay-layer';
        wrapper.appendChild(layer);
      }

      const opacity = Number(colorSettings.opacity) / 100;

      // Apply the overlay color.
      layer.style.backgroundColor = colorSettings.enabled
        ? colorToRgba(colorSettings.color, opacity)
        : 'transparent';
      
      // Get the image's existing border radius.
      const imageRadius = getComputedStyle(img).borderRadius;
      
      // Synchronize the image, wrapper and overlay corners.
      img.style.borderRadius = imageRadius;
      wrapper.style.borderRadius = imageRadius;
      wrapper.style.overflow = 'hidden';
      layer.style.borderRadius = imageRadius;
    });
  }
}

// Apply styles when images are loaded.
document.addEventListener('DOMContentLoaded', () => {
  applyFinalStyles();

  const imageContainer = document.querySelector(
    '#editing-selected-images'
  );

  if (imageContainer) {
    const observer = new MutationObserver(() => {
      applyFinalStyles();
    });

    observer.observe(imageContainer, {
      childList: true
    });
  }
});

// Also respond to the custom image-loaded event.
document.addEventListener('finalimagesloaded', () => {
  applyFinalStyles();
});
