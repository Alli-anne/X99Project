const toolPanels = ['border-popout', 'color-popout', 'layout-popout'];
const toolsDetails = document.querySelector('#edit-tools');

function closeToolPanel(panelId) {
  const panel = document.querySelector(`#${panelId}`);
  if (!panel) return;

  panel.hidden = true;
  if (panelId === 'layout-popout') document.querySelector('#edit-page')?.classList.remove('layout-mode');
  const button = document.querySelector(
    panelId === 'border-popout' ? '#boarders' : panelId === 'color-popout' ? '#colors' : '#eyedropper'
  );
  button?.setAttribute('aria-expanded', 'false');
}

document.querySelectorAll('[data-close-tool]').forEach((button) => {
  button.addEventListener('click', () => closeToolPanel(button.dataset.closeTool));
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;

  toolPanels.forEach(closeToolPanel);
  if (toolsDetails) toolsDetails.open = false;
});
