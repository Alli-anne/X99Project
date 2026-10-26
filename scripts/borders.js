
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
  // Open and close the border settings pop-out.
  borderButton.setAttribute('aria-expanded', 'false');

  borderButton.addEventListener('click', () => {
    const willOpen = borderPanel.hidden;

    borderPanel.hidden = !willOpen;
    borderButton.setAttribute('aria-expanded', String(willOpen));
  });

  // Apply the current settings to the chosen target.
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
        ? `${thickness} solid black`
        : 'none';

      element.style.borderRadius = radius;
    });
  }

  // Update the preview when a setting changes.
  borderEnabled.addEventListener('change', applyBorderSettings);
  borderRadius.addEventListener('input', applyBorderSettings);
  borderThickness.addEventListener('input', applyBorderSettings);
  borderTarget.addEventListener('change', applyBorderSettings);

  // Reapply settings when images are added to the preview.
  const observer = new MutationObserver(() => {
    applyBorderSettings();
  });

  observer.observe(imageContainer, {
    childList: true
  });

  // Initialize labels and styles.
  applyBorderSettings();
}
