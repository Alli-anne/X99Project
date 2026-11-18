const buttonStyleKey = 'projectButtonStyle';
const buttons = [...document.querySelectorAll('.button-div .btn')];
const paddingInput = document.querySelector('#button-padding');
const sizeInput = document.querySelector('#button-font-size');
const fontInput = document.querySelector('#button-font-family');
const textColorInput = document.querySelector('#button-text-color');
const stylePanel = document.querySelector('#button-style-popout');
const colorChooser = document.querySelector('.button-color-popover');

if (stylePanel && colorChooser) colorChooser.append(stylePanel);
const paddingValue = document.querySelector('#button-padding-value');
const sizeValue = document.querySelector('#button-font-size-value');

if (buttons.length && paddingInput && sizeInput && fontInput && textColorInput) {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(buttonStyleKey) || '{}'); } catch {}
  paddingInput.value = saved.padding ?? 18;
  sizeInput.value = saved.size ?? 32;
  fontInput.value = saved.font ?? 'inherit';
  textColorInput.value = saved.color ?? '#FFFFFF';

  function apply() {
    const style = {
      padding: `${paddingInput.value}px 12px`,
      size: `${sizeInput.value}px`,
      font: fontInput.value,
      color: textColorInput.value
    };
    buttons.forEach((button) => {
      button.style.padding = style.padding;
      button.style.fontSize = style.size;
      button.style.fontFamily = style.font;
      button.style.color = style.color;
    });
    paddingValue.textContent = `${paddingInput.value}px`;
    sizeValue.textContent = `${sizeInput.value}px`;
    localStorage.setItem(buttonStyleKey, JSON.stringify({
      padding: Number(paddingInput.value),
      size: Number(sizeInput.value),
      font: fontInput.value,
      color: textColorInput.value
    }));
  }

  [paddingInput, sizeInput, fontInput, textColorInput].forEach((control) => {
    control.addEventListener('input', apply);
    control.addEventListener('change', apply);
  });
  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      if (document.querySelector('#edit-page')?.classList.contains('layout-mode')) return;
      if (!stylePanel) return;
      const activeChooser = document.querySelector('.button-color-popover');
      if (activeChooser && stylePanel.parentElement !== activeChooser) activeChooser.append(stylePanel);
      stylePanel.hidden = false;
    });
  });
  apply();
}

const fontLists = [...document.querySelectorAll('.fonts ul')];
if (fontLists.length) {
  const chooser = document.createElement('div');
  chooser.className = 'font-color-popover';
  chooser.hidden = true;
  document.body.append(chooser);
  let activeList = null;
  fontLists.forEach((list) => {
    list.title = 'Click to choose the font color from the palette';
    list.addEventListener('click', () => {
      if (document.querySelector('#edit-page')?.classList.contains('layout-mode')) return;
      activeList = list;
      chooser.replaceChildren();
      const colors = [...document.querySelectorAll('.palette-swatch')]
        .map(swatch => swatch.textContent.trim().match(/^[0-9a-f]{6}$/i)?.[0])
        .filter(Boolean).map(hex => `#${hex}`);
      Object.values(colors).forEach((color) => {
        const option = document.createElement('button');
        option.type = 'button';
        option.textContent = color.replace('#', '');
        option.style.backgroundColor = color;
        const rgb = color.slice(1).match(/../g).map(channel => parseInt(channel, 16));
        option.style.color = rgb[0] * .299 + rgb[1] * .587 + rgb[2] * .114 > 150 ? '#000' : '#fff';
        option.addEventListener('click', () => {
          list.style.color = color;
          sessionStorage.setItem(`x99-font-color-${list.id}`, color);
          if (!chooser.dataset.docked) chooser.hidden = true;
        });
        chooser.append(option);
      });
      const rect = list.getBoundingClientRect();
      chooser.style.left = `${Math.max(8, rect.left)}px`;
      chooser.style.top = `${Math.min(window.innerHeight - 70, rect.bottom + 8)}px`;
      chooser.hidden = false;
    });
    const savedColor = sessionStorage.getItem(`x99-font-color-${list.id}`);
    if (savedColor) list.style.color = savedColor;
  });
  document.addEventListener('click', (event) => {
    if (chooser.dataset.docked) return;
    if (activeList && !chooser.contains(event.target) && !event.target.closest('.fonts ul')) chooser.hidden = true;
  });
}
