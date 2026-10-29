const colorPicker = document.querySelector('.color-picker');
const colorButton = colorPicker?.querySelector('.color-picker__button');
const colorInput = colorPicker?.querySelector('#main-color');
const colorSwatch = colorPicker?.querySelector('.color-picker__swatch');
const colorValue = colorPicker?.querySelector('.color-picker__value');
const colorStorageKey = 'x99-main-color';

if (colorButton && colorInput && colorSwatch && colorValue) {
  function setMainColor(color) {
    const normalizedColor = color.toUpperCase();
    colorInput.value = normalizedColor;
    colorSwatch.style.backgroundColor = normalizedColor;
    colorValue.textContent = normalizedColor;
    sessionStorage.setItem(colorStorageKey, normalizedColor);
  }

  const savedColor = sessionStorage.getItem(colorStorageKey);
  setMainColor(savedColor || colorInput.value);

  colorInput.addEventListener('input', () => {
    setMainColor(colorInput.value);
  });

  colorButton.addEventListener('click', async () => {
    if ('EyeDropper' in window) {
      try {
        const result = await new EyeDropper().open();
        setMainColor(result.sRGBHex);
        return;
      } catch (error) {
        if (error.name === 'AbortError') return;
      }
    }

    colorInput.click();
  });
}
