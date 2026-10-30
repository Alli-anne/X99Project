
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

// Border color elements
const borderColors = document.querySelectorAll('.border-color');

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
  // Default border color
  let selectedBorderColor = '#DDD8C4';

  // Open and close border settings.
  borderButton.setAttribute('aria-expanded', 'false');

  borderButton.addEventListener('click', () => {
    const willOpen = borderPanel.hidden;

    borderPanel.hidden = !willOpen;
    borderButton.setAttribute('aria-expanded', String(willOpen));
  });

  // Get the current colors from the main project palette.
  function updateBorderPalette() {
    const mainPaletteButtons = document.querySelectorAll(
      '.color-palette .palette-swatch'
    );
  
    borderColors.forEach((colorButton, index) => {
      const mainButton = mainPaletteButtons[index];
  
      if (!mainButton) return;
  
      // Get the actual displayed color.
      const color = getComputedStyle(mainButton).backgroundColor;
  
      // Update the popup swatch.
      colorButton.style.backgroundColor = color;
  
      // Store the exact color for border application.
      colorButton.dataset.color = color;
    });
  }

  // Watch the main palette for color changes.
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
  
  // Apply border settings to selected elements.
  function applyBorderSettings() {
    const enabled = borderEnabled.checked;
    const radius = `${borderRadius.value}px`;
    const thickness = `${borderThickness.value}px`;

    radiusValue.textContent = radius;
    thicknessValue.textContent = thickness;

    const targets = borderTarget.value === 'images'
      ? imageContainer.querySelectorAll('img')
      : buttonContainer.querySelectorAll('.btn');

    targets.forEach((element) => {
      element.style.border = enabled
        ? `${thickness} solid ${selectedBorderColor}`
        : 'none';

      element.style.borderRadius = radius;
    });
  }

  // Let users select one of the four palette colors.
  borderColors.forEach((colorButton) => {
    colorButton.addEventListener('click', () => {
      selectedBorderColor = colorButton.dataset.color;

      // Update the selected color indicator.
      borderColors.forEach((button) => {
        const isSelected = button === colorButton;

        button.classList.toggle('active', isSelected);
        button.setAttribute('aria-pressed', String(isSelected));
      });

      // Immediately update the border preview.
      applyBorderSettings();
    });
  });

  // Update border when settings change.
  borderEnabled.addEventListener('change', applyBorderSettings);
  borderRadius.addEventListener('input', applyBorderSettings);
  borderThickness.addEventListener('input', applyBorderSettings);
  borderTarget.addEventListener('change', applyBorderSettings);

  // Reapply settings when images are added.
  const observer = new MutationObserver(() => {
    applyBorderSettings();
  });

  observer.observe(imageContainer, {
    childList: true
  });

  updateBorderPalette();

  // Initialize border settings.
  applyBorderSettings();
}
