// Dock the existing controls rather than copying them, so their editing handlers
// and saved settings keep working in one shared inspector.
document.addEventListener('DOMContentLoaded', () => {
  if (!document.querySelector('#edit-page')) return;
  const sidebar = document.createElement('aside');
  sidebar.id = 'tool-sidebar';
  sidebar.hidden = true;
  sidebar.setAttribute('aria-labelledby', 'tool-sidebar-title');
  sidebar.innerHTML = `<header class="tool-sidebar-heading">
    <h2 id="tool-sidebar-title">Settings</h2>
    <button type="button" aria-label="Close settings sidebar">×</button>
  </header><div class="tool-sidebar-content"></div>`;
  document.body.append(sidebar);
  const content = sidebar.querySelector('.tool-sidebar-content');
  const title = sidebar.querySelector('h2');
  const definitions = [
    ['#border-popout', 'Borders', '#boarders'],
    ['#color-popout', 'Image colors', '#colors'],
    ['#layout-popout', 'Arrange layout', '#eyedropper'],
    ['#shapes-popout', 'Add elements', '#shapes'],
    ['#draw-instruction', 'Style colors', '#draw'],
    ['#draw-style-popout', 'Style colors', '#draw'],
    ['.button-color-popover', 'Button settings'],
    ['.font-color-popover', 'Font color']
  ];
  const panels = definitions.map(([selector, label, trigger]) => {
    const panel = document.querySelector(selector);
    if (!panel) return null;
    panel.dataset.docked = 'true';
    panel.removeAttribute('role');
    panel.hidden = true;
    content.append(panel);
    return { panel, label, trigger };
  }).filter(Boolean);
  let active = null;

  function stopTool(item) {
    if (item.trigger === '#eyedropper') item.panel.querySelector('.tool-close')?.click();
    if (item.trigger) document.querySelector(item.trigger)?.setAttribute('aria-expanded', 'false');
    item.panel.hidden = true;
  }

  function close() {
    if (document.body.classList.contains('draw-mode')) document.querySelector('#draw').click();
    panels.forEach(stopTool);
    active = null;
    sidebar.hidden = true;
    document.body.classList.remove('settings-open');
  }

  function show(item) {
    if (item.trigger !== '#draw' && document.body.classList.contains('draw-mode')) {
      document.querySelector('#draw').click();
    }
    panels.forEach(other => {
      if (other !== item && !other.panel.hidden) stopTool(other);
      if (other.trigger && other.trigger !== item.trigger) {
        document.querySelector(other.trigger)?.setAttribute('aria-expanded', 'false');
      }
    });
    active = item;
    title.textContent = item.label;
    sidebar.hidden = false;
    document.body.classList.add('settings-open');
    content.scrollTop = 0;
  }

  // Tools already use the hidden property to open and close their controls.
  // Listen to that one signal and display only the most recently opened tool.
  const observer = new MutationObserver(records => {
    const opened = records.map(record => panels.find(item => item.panel === record.target))
      .filter(item => item && !item.panel.hidden);
    const next = opened.at(-1);
    if (next && next !== active) show(next);
    else if (active?.panel.hidden && !panels.some(item => !item.panel.hidden)) close();
  });
  panels.forEach(({ panel }) => observer.observe(panel, { attributes: true, attributeFilter: ['hidden'] }));
  sidebar.querySelector('header button').addEventListener('click', () => {
    const trigger = active?.trigger;
    close();
    if (trigger) document.querySelector(trigger)?.focus();
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });
});
