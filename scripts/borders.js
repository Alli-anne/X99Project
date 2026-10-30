
const borderButton = document.querySelector('#boarders');
const borderPanel = document.querySelector('#border-popout');
const borderEnabled = document.querySelector('#border-enabled');
const borderRadius = document.querySelector('#border-radius');
const borderThickness = document.querySelector('#border-thickness');
const borderTarget = document.querySelector('#border-target');
const radiusValue = document.querySelector('#border-radius-value');
const thicknessValue = document.querySelector('#border-thickness-value');

const imageContainer = document.querySelector('#editing-selected-images');
const buttonContainer = document.querySelector('.button-div');

const borderColors = document.querySelectorAll('.border-color');

const STORAGE_KEY = 'projectBorderSettings';

if (
  borderButton &&
  borderPanel &&
  borderEnabled &&
  borderRadius &&
  borderThickness &&
  borderTarget &&
  imageContainer &&
  buttonContainer
) {
  const defaultSettings = {
    images: {
      enabled: false,
      color: '#DDD8C4',
      radius: 0,
      thickness: 2
    },
    buttons: {
      enabled: false,
      color: '#DDD8C4',
      radius: 0,
      thickness: 2
    }
  };

  function loadSettings() {
    try {
      const saved = JSON.parse(
        localStorage.getItem(STORAGE_KEY)
      );

      return {
        images: {
          ...defaultSettings.images,
          ...saved?.images
        },
        buttons: {
          ...defaultSettings.buttons,
          ...saved?.buttons
        }
      };
    } catch {
      return structuredClone(defaultSettings);
    }
  }

  const settings = loadSettings();

  let selectedBorderColor = '#DDD8C4';

  function currentTarget() {
    return borderTarget.value;
  }

  function saveSettings() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(settings)
    );
  }

  function loadTargetControls() {
    const current = settings[currentTarget()];

    borderEnabled.checked = current.enabled;
    borderRadius.value = current.radius;
    borderThickness.value = current.thickness;
    selectedBorderColor = current.color;

    radiusValue.textContent = `${current.radius}px`;
    thicknessValue.textContent = `${current.thickness}px`;

    borderColors.forEach((button) => {
      const selected =
        button.dataset.color === selectedBorderColor;

      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }

  function applyBorderSettings() {
    const target = currentTarget();

    const current = settings[target];

    current.enabled = borderEnabled.checked;
    current.color = selectedBorderColor;
    current.radius = Number(borderRadius.value);
    current.thickness = Number(borderThickness.value);

    radiusValue.textContent = `${current.radius}px`;
    thicknessValue.textContent = `${current.thickness}px`;

    const elements = target === 'images'
      ? imageContainer.querySelectorAll('img')
      : buttonContainer.querySelectorAll('.btn');

    elements.forEach((element) => {
      element.style.boxSizing = 'border-box';

      element.style.border = current.enabled
        ? `${current.thickness}px solid ${current.color}`
        : 'none';

      element.style.borderRadius = `${current.radius}px`;
    });

    // Synchronize overlay rounding when editing image borders.
    if (borderTarget.value === 'images') {
      const images = imageContainer.querySelectorAll('img');
    
      images.forEach((img) => {
        const wrapper = img.closest('.color-overlay-wrapper');
    
        if (!wrapper) return;
    
        const radius = getComputedStyle(img).borderRadius;
    
        wrapper.style.borderRadius = radius;
        wrapper.style.overflow = 'hidden';
    
        const layer = wrapper.querySelector(
          '.color-overlay-layer'
        );
    
        if (layer) {
          layer.style.borderRadius = radius;
        }
      });
    }

    saveSettings();
  }

  // Popup behavior.
  borderButton.setAttribute('aria-expanded', 'false');

  const colorPanel = document.querySelector('#color-popout');
  const colorsButton = document.querySelector('#colors');

  borderButton.addEventListener('click', () => {
    const willOpen = borderPanel.hidden;

    if (colorPanel) colorPanel.hidden = true;

    if (colorsButton) {
      colorsButton.setAttribute('aria-expanded', 'false');
    }

    borderPanel.hidden = !willOpen;
    borderButton.setAttribute('aria-expanded', String(willOpen));
  });

  // Update border color palette from the project palette.
  function updateBorderPalette() {
    const mainColors = document.querySelectorAll(
      '.color-palette .palette-swatch'
    );

    borderColors.forEach((button, index) => {
      const mainButton = mainColors[index];

      if (!mainButton) return;

      const color = getComputedStyle(mainButton).backgroundColor;

      button.style.backgroundColor = color;

      // Keep the actual selected color in sync.
      button.dataset.color = color;
    });
  }

  borderColors.forEach((button) => {
    button.addEventListener('click', () => {
      selectedBorderColor = button.dataset.color;

      borderColors.forEach((swatch) => {
        const selected = swatch === button;

        swatch.classList.toggle('active', selected);
        swatch.setAttribute('aria-pressed', String(selected));
      });

      applyBorderSettings();
    });
  });

  borderEnabled.addEventListener('change', applyBorderSettings);
  borderRadius.addEventListener('input', applyBorderSettings);
  borderThickness.addEventListener('input', applyBorderSettings);

  // Switching targets loads their independent settings.
  borderTarget.addEventListener('change', () => {
    loadTargetControls();
    applyBorderSettings();
  });

  // Watch for newly added images.
  const imageObserver = new MutationObserver(() => {
    applyBorderSettings();
  });

  imageObserver.observe(imageContainer, {
    childList: true
  });

  // Watch for palette changes.
  const paletteContainer = document.querySelector('.color-palette');

  if (paletteContainer) {
    const paletteObserver = new MutationObserver(() => {
      updateBorderPalette();
    });

    paletteObserver.observe(paletteContainer, {
      attributes: true,
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  updateBorderPalette();
  loadTargetControls();
  applyBorderSettings();
}
