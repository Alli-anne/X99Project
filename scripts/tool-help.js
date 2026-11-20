// Keep help separate from the tool's click handler so reading it never changes the design.
const toolbar = document.querySelector('#edit-tools');
let activeHelp;
let hideTimer;

function hideHelp() {
  clearTimeout(hideTimer);
  if (activeHelp) activeHelp.hidden = true;
  activeHelp = null;
}

toolbar.querySelectorAll('.tools[data-help]').forEach(tool => {
  const row = document.createElement('div');
  row.className = 'tool-item';
  tool.before(row);
  row.append(tool);

  const info = document.createElement('button');
  info.type = 'button';
  info.className = 'tool-info';
  info.textContent = 'i';
  info.setAttribute('aria-label', `About ${tool.getAttribute('aria-label').toLowerCase()}`);

  const help = document.createElement('span');
  help.id = `${tool.id}-help`;
  help.className = 'tool-help';
  help.setAttribute('role', 'tooltip');
  help.hidden = true;
  const heading = document.createElement('strong');
  heading.textContent = tool.getAttribute('aria-label');
  help.append(heading, document.createTextNode(tool.dataset.help));
  [tool, info].forEach(button => button.setAttribute('aria-describedby', help.id));
  row.append(info, help);

  function showHelp() {
    hideHelp();
    activeHelp = help;
    help.hidden = false;
    const rect = row.getBoundingClientRect();
    help.style.left = `${Math.max(8, Math.min(rect.right + 8, window.innerWidth - help.offsetWidth - 8))}px`;
    help.style.top = `${Math.max(8, Math.min(rect.top, window.innerHeight - help.offsetHeight - 8))}px`;
  }
  row.addEventListener('pointerenter', showHelp);
  row.addEventListener('pointerleave', () => {
    if (!row.contains(document.activeElement)) hideTimer = setTimeout(hideHelp, 120);
  });
  row.addEventListener('focusin', showHelp);
  row.addEventListener('focusout', event => {
    if (!row.contains(event.relatedTarget)) hideHelp();
  });
  info.addEventListener('click', showHelp); // Also works on touch screens.
  tool.addEventListener('click', hideHelp);
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && activeHelp) {
    hideHelp();
    event.stopImmediatePropagation();
    event.preventDefault();
  }
}, true);
document.addEventListener('pointerdown', event => {
  if (!event.target.closest('.tool-item')) hideHelp();
});
toolbar.addEventListener('toggle', hideHelp);
window.addEventListener('resize', hideHelp);
window.addEventListener('scroll', hideHelp, true);
