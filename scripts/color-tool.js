
const colorsButton = document.querySelector('#colors');
const colorPanel = document.querySelector('#color-popout');

const imageContainer = document.querySelector(
  '#editing-selected-images'
);

const overlayEnabled = document.querySelector('#overlay-enabled');
const overlayOpacity = document.querySelector('#overlay-opacity');
const opacityValue = document.querySelector('#overlay-opacity-value');

const customColor = document.querySelector('#custom-overlay-color');
const overlayColors = document.querySelectorAll('.overlay-color');
const clearOverlay = document.querySelector('#clear-overlay');

const mainPalette = document.querySelectorAll(
  '.color-palette .palette-swatch'
);

if (
  colorsButton &&
  colorPanel &&
  imageContainer &&
  overlayEnabled &&
  overlayOpacity &&
  opacityValue &&
  customColor &&
  clearOverlay
) {
  let selectedColor = '#DDD8C4';

  // Open and close the color popup.
  colorsButton.setAttribute('aria-expanded', 'false');

  const borderPanel = document.querySelector('#border-popout');
  const borderButton = document.querySelector('#boarders');
  
  colorsButton.addEventListener('click', () => {
    const willOpen = colorPanel.hidden;
  
    // Close the Borders popup.
    borderPanel.hidden = true;
    borderButton.setAttribute('aria-expanded', 'false');
  
    // Toggle the Colors popup.
    colorPanel.hidden = !willOpen;
    colorsButton.setAttribute('aria-expanded', String(willOpen));
  });

  // Read the current project palette colors.
  function updateOverlayPalette() {
    overlayColors.forEach((button, index) => {
      const paletteButton = mainPalette[index];

      if (!paletteButton) return;

      const color = getComputedStyle(
        paletteButton
      ).backgroundColor;

      button.style.backgroundColor = color;
      button.dataset.color = color;
    });
  }

  // Update selected color indicators.
  function updateSelectedColor(button) {
    overlayColors.forEach((swatch) => {
      const selected = swatch === button;

      swatch.classList.toggle('active', selected);
      swatch.setAttribute(
        'aria-pressed',
        String(selected)
      );
    });
  }

  // Convert a hex color into RGBA.
  function colorToRgba(color, opacity) {
    let red;
    let green;
    let blue;

    if (color.startsWith('#')) {
      const hex = color.replace('#', '');

      const fullHex = hex.length === 3
        ? hex.split('').map(char => char + char).join('')
        : hex;

      red = parseInt(fullHex.substring(0, 2), 16);
      green = parseInt(fullHex.substring(2, 4), 16);
      blue = parseInt(fullHex.substring(4, 6), 16);
    } else {
      const values = color.match(/[\d.]+/g);

      if (!values || values.length < 3) {
        return `rgba(221, 216, 196, ${opacity})`;
      }

      [red, green, blue] = values.map(Number);
    }

    return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
  }

  // Give each image its own overlay layer.
  function prepareImages() {
    const images = imageContainer.querySelectorAll('img');

    images.forEach((img) => {
      if (img.parentElement.classList.contains(
        'color-overlay-wrapper'
      )) {
        return;
      }

      const wrapper = document.createElement('div');
      wrapper.className = 'color-overlay-wrapper';
      
      wrapper.style.overflow = 'hidden';
      
      img.parentNode.insertBefore(wrapper, img);
      wrapper.appendChild(img);

      const layer = document.createElement('span');
      layer.className = 'color-overlay-layer';

      wrapper.appendChild(layer);
    });
  }

  // Apply the overlay to every selected image.
  function applyColorOverlay() {
    prepareImages();

    const opacity = Number(overlayOpacity.value) / 100;

    const overlayColor = colorToRgba(
      selectedColor,
      opacity
    );

    const images = imageContainer.querySelectorAll('img');

    images.forEach((img) => {
      const wrapper = img.parentElement;
    
      const layer = wrapper.querySelector(
        '.color-overlay-layer'
      );
    
      if (!layer) return;
    
      // Get the current image radius.
      const imageRadius = getComputedStyle(img).borderRadius;
    
      // Synchronize all three elements.
      wrapper.style.borderRadius = imageRadius;
      wrapper.style.overflow = 'hidden';
    
      layer.style.borderRadius = imageRadius;
    
      // Apply the overlay.
      layer.style.backgroundColor = overlayEnabled.checked
        ? overlayColor
        : 'transparent';
    });

    opacityValue.textContent = `${overlayOpacity.value}%`;
  
    saveColorSettings();

  }

  // Select a preset project color.
  overlayColors.forEach((button) => {
    button.addEventListener('click', () => {
      selectedColor = button.dataset.color;

      updateSelectedColor(button);

      // Keep the custom picker synchronized when possible.
      if (/^#[0-9a-f]{6}$/i.test(selectedColor)) {
        customColor.value = selectedColor;
      }

      applyColorOverlay();
    });
  });

  // Select any custom color.
  customColor.addEventListener('input', () => {
    selectedColor = customColor.value;

    overlayColors.forEach((button) => {
      button.classList.remove('active');
      button.setAttribute('aria-pressed', 'false');
    });

    applyColorOverlay();
  });

  // Enable or disable the overlay.
  overlayEnabled.addEventListener('change', applyColorOverlay);

  // Change overlay opacity.
  overlayOpacity.addEventListener('input', applyColorOverlay);

  // Remove overlay.
  clearOverlay.addEventListener('click', () => {
    overlayEnabled.checked = false;
    applyColorOverlay();
  });

  // Watch for new images.
  const imageObserver = new MutationObserver(() => {
    prepareImages();
    applyColorOverlay();
  });

  imageObserver.observe(imageContainer, {
    childList: true,
    subtree: true
  });

  // Watch for project palette changes.
  const paletteContainer = document.querySelector('.color-palette');

  if (paletteContainer) {
    const paletteObserver = new MutationObserver(() => {
      updateOverlayPalette();
    });

    paletteObserver.observe(paletteContainer, {
      attributes: true,
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  function saveColorSettings() {
    const settings = {
      enabled: overlayEnabled.checked,
      color: selectedColor,
      opacity: overlayOpacity.value
    };
  
    localStorage.setItem(
      'projectColorSettings',
      JSON.stringify(settings)
    );
  }

  // Initialize.
  updateOverlayPalette();
  prepareImages();
  applyColorOverlay();
}
