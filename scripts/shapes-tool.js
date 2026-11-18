// Keep added elements with this tab's project, including on the final page.
const board = document.querySelector('#edit-page, #final-page');
const trigger = document.querySelector('#shapes');
const storageKey = 'x99-shape-elements';
const types = { rectangle: 'Rectangle', circle: 'Circle', triangle: 'Triangle', line: 'Line', text: 'Text', button: 'Button' };
const hasText = item => item && ['text', 'button'].includes(item.type);
let elements = [];
try {
  const saved = JSON.parse(sessionStorage.getItem(storageKey) || '[]');
  if (Array.isArray(saved)) elements = saved.filter(item => item && types[item.type]);
} catch { /* A new project starts with no added elements. */ }

if (board) {
  const area = document.createElement('div');
  area.className = 'shape-elements';
  area.setAttribute('aria-label', 'Added design elements');
  board.append(area);
  let selectedId = null;
  let panel;
  const save = () => sessionStorage.setItem(storageKey, JSON.stringify(elements));
  const selected = () => elements.find(item => item.id === selectedId);

  function updateElement(node, item) {
    node.style.setProperty('--element-color', item.color);
    node.style.width = `${item.size}px`;
    node.style.height = `${item.type === 'line' ? 12 : item.size}px`;
    node.style.transform = `translate(${item.x}px, ${item.y}px)`;
    if (hasText(item)) {
      node.style.height = 'auto';
      node.style.fontSize = `${item.fontSize ?? 24}px`;
      node.style.color = item.type === 'text' ? item.color : (item.textColor || '#ffffff');
      node.style.padding = item.type === 'button' ? `${item.padding ?? 16}px` : '0';
      node.style.borderRadius = item.type === 'button' ? `${item.radius ?? 12}px` : '0';
      node.querySelector('span').textContent = item.text ?? (item.type === 'text' ? 'Your text' : 'Button');
    }
  }

  function select(id) {
    selectedId = id;
    area.querySelectorAll('.design-element').forEach(node => {
      node.classList.toggle('is-selected', node.dataset.elementId === id);
    });
    const item = selected();
    panel.querySelector('fieldset').disabled = !item;
    panel.querySelector('.element-text-settings').hidden = !hasText(item);
    panel.querySelector('.element-button-settings').hidden = item?.type !== 'button';
    if (item) {
      panel.querySelector('#shape-color').value = item.color;
      panel.querySelector('#shape-size').value = item.size;
      panel.querySelector('output').textContent = `${item.size}px`;
      panel.querySelector('#element-text').value = item.text ?? '';
      panel.querySelector('#element-font-size').value = item.fontSize ?? 24;
      panel.querySelector('#element-text-color').value = item.textColor || '#ffffff';
      panel.querySelector('#element-padding').value = item.padding ?? 16;
      panel.querySelector('#element-radius').value = item.radius ?? 12;
      panel.querySelector('label[for="shape-size"]').firstChild.textContent = hasText(item) ? 'Width ' : 'Size ';
      panel.querySelector('label[for="shape-color"]').textContent = item.type === 'button' ? 'Background color' : item.type === 'text' ? 'Text color' : 'Color';
    }
  }

  function open() {
    document.querySelectorAll('#border-popout, #color-popout').forEach(other => { other.hidden = true; });
    document.querySelectorAll('#boarders, #colors').forEach(other => other.setAttribute('aria-expanded', 'false'));
    // Stop the color-styling tool before editing an added element.
    if (document.body.classList.contains('draw-mode')) document.querySelector('#draw')?.click();
    panel.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    document.querySelector('#edit-tools').open = true;
  }

  function render() {
    area.replaceChildren();
    area.hidden = elements.length === 0;
    elements.forEach(item => {
      const node = document.createElement(trigger ? 'button' : item.type === 'text' ? 'p' : 'div');
      node.className = `design-element design-element--${item.type}`;
      node.dataset.elementId = item.id;
      if (trigger || !hasText(item)) node.setAttribute('aria-label', `${types[item.type]} element`);
      if (trigger) node.type = 'button';
      else if (!hasText(item)) node.setAttribute('role', 'img');
      if (hasText(item)) node.append(document.createElement('span'));
      updateElement(node, item);
      area.append(node);
      if (!trigger) return;
      node.addEventListener('click', () => {
        if (board.classList.contains('layout-mode')) return;
        select(item.id); open();
      });
      // Added elements follow the same Arrange-only movement rule as the board.
      node.addEventListener('pointerdown', event => {
        if (event.button !== 0 || !board.classList.contains('layout-mode')) return;
        event.stopPropagation();
        select(item.id);
        node.focus();
        const start = { x: item.x, y: item.y, clientX: event.clientX, clientY: event.clientY };
        node.setPointerCapture(event.pointerId);
        const move = next => {
          if (!board.classList.contains('layout-mode')) { end(); return; }
          item.x = start.x + next.clientX - start.clientX;
          item.y = start.y + next.clientY - start.clientY;
          updateElement(node, item);
        };
        const end = () => {
          node.removeEventListener('pointermove', move);
          node.removeEventListener('pointerup', end);
          node.removeEventListener('pointercancel', end);
          if (node.hasPointerCapture(event.pointerId)) node.releasePointerCapture(event.pointerId);
          save();
        };
        node.addEventListener('pointermove', move);
        node.addEventListener('pointerup', end);
        node.addEventListener('pointercancel', end);
      });
      node.addEventListener('keydown', event => {
        if (!board.classList.contains('layout-mode')) return;
        const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
        if (!direction) return;
        event.preventDefault();
        event.stopPropagation();
        item.x += direction[0] * (event.shiftKey ? 10 : 1);
        item.y += direction[1] * (event.shiftKey ? 10 : 1);
        updateElement(node, item);
        save();
      });
    });
    if (panel) select(selectedId);
  }

  if (trigger) {
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', 'shapes-popout');
    panel = document.createElement('div');
    panel.id = 'shapes-popout';
    panel.className = 'border-popout';
    panel.hidden = true;
    panel.innerHTML = `<div class="tool-panel-heading"><h3>Add elements</h3><button type="button" class="tool-close" aria-label="Close add elements">×</button></div>
      <p>Choose an element to add. Click it to edit. Turn on Arrange layout to drag it or move it with arrow keys.</p>
      <div class="shape-choices"></div>
      <fieldset disabled><legend>Selected element</legend>
        <label for="shape-color">Color</label><input id="shape-color" type="color" value="#839096">
        <label for="shape-size">Size <output>100px</output></label><input id="shape-size" type="range" min="24" max="240" value="100">
        <div class="element-text-settings" hidden>
          <label for="element-text">Text</label><textarea id="element-text" rows="3" maxlength="1000"></textarea>
          <label for="element-font-size">Text size</label><input id="element-font-size" type="range" min="12" max="72" value="24">
        </div>
        <div class="element-button-settings" hidden>
          <label for="element-text-color">Text color</label><input id="element-text-color" type="color" value="#ffffff">
          <label for="element-padding">Padding</label><input id="element-padding" type="range" min="0" max="48" value="16">
          <label for="element-radius">Corner rounding</label><input id="element-radius" type="range" min="0" max="100" value="12">
        </div>
        <button type="button" class="shape-remove">Remove element</button>
      </fieldset>`;
    document.querySelector('#edit-tools').append(panel);
    const close = () => {
      panel.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
    };
    trigger.addEventListener('click', () => panel.hidden ? open() : close());
    panel.querySelector('.tool-close').addEventListener('click', close);
    document.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });
    document.querySelector('#edit-tools').addEventListener('click', event => {
      if (event.target.closest('.tools:not(#shapes)')) close();
    });
    document.querySelector('#edit-tools').addEventListener('toggle', event => {
      if (!event.currentTarget.open) close();
    });
    Object.entries(types).forEach(([type, label]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = `${{ rectangle: '▰', circle: '●', triangle: '▲', line: '━', text: 'T', button: '▣' }[type]} ${label}`;
      button.addEventListener('click', () => {
        const paletteColor = document.querySelector('.palette-swatch')?.textContent.trim().replace('#', '');
        const item = { id: crypto.randomUUID(), type, size: 100, color: /^[0-9a-f]{6}$/i.test(paletteColor) ? `#${paletteColor}` : '#839096', x: 0, y: 0 };
        if (hasText(item)) {
          Object.assign(item, { size: 220, text: type === 'text' ? 'Your text' : 'Button', fontSize: 24, textColor: '#ffffff', padding: 16, radius: 12 });
          if (type === 'text') item.color = '#222222';
          else {
            const rgb = item.color.slice(1).match(/../g).map(channel => parseInt(channel, 16));
            item.textColor = (rgb[0] * .299 + rgb[1] * .587 + rgb[2] * .114) > 150 ? '#000000' : '#ffffff';
          }
        }
        elements.push(item);
        selectedId = item.id;
        save();
        render();
        area.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'center' });
        area.lastElementChild.focus({ preventScroll: true });
      });
      panel.querySelector('.shape-choices').append(button);
    });
    panel.querySelectorAll('input, textarea').forEach(input => input.addEventListener('input', () => {
      const item = selected();
      if (!item) return;
      item.color = panel.querySelector('#shape-color').value;
      item.size = Number(panel.querySelector('#shape-size').value);
      if (hasText(item)) {
        item.text = panel.querySelector('#element-text').value;
        item.fontSize = Number(panel.querySelector('#element-font-size').value);
        item.textColor = panel.querySelector('#element-text-color').value;
        item.padding = Number(panel.querySelector('#element-padding').value);
        item.radius = Number(panel.querySelector('#element-radius').value);
      }
      panel.querySelector('output').textContent = `${item.size}px`;
      updateElement([...area.children].find(node => node.dataset.elementId === item.id), item);
      save();
    }));
    panel.querySelector('.shape-remove').addEventListener('click', () => {
      elements = elements.filter(item => item.id !== selectedId);
      selectedId = null;
      save();
      render();
    });
  }
  render();
}
