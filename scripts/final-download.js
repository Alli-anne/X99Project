import { waitForDesignAssets, captureDesign, renderSnapshot } from './design-snapshot.js';
const downloadButton = document.querySelector('#download-pdf');
let printing = false;
function cleanup() {
  document.querySelector('#print-design')?.remove();
  document.querySelector('#print-page-size')?.remove();
  document.body.classList.remove('printing-design');
  printing = false;
  downloadButton.removeAttribute('aria-disabled');
}
window.addEventListener('afterprint', cleanup);
downloadButton?.addEventListener('click', async event => {
  event.preventDefault();
  if (printing) return;
  cleanup();
  printing = true;
  downloadButton.setAttribute('aria-disabled', 'true');
  const status = document.querySelector('#final-status');
  status.textContent = 'Preparing all colors, fonts and images for PDF…';
  try {
    const board = document.querySelector('#final-page');
    await waitForDesignAssets(board);
    const snapshot = captureDesign(board);
    const printed = renderSnapshot(snapshot);
    printed.id = 'print-design';
    const page = document.createElement('style');
    page.id = 'print-page-size';
    page.textContent = `@media print { @page { size: ${snapshot.width + 48}px ${snapshot.height + 48}px; margin: 24px; } }`;
    document.head.append(page);
    document.body.append(printed);
    await waitForDesignAssets(printed);
    document.body.classList.add('printing-design');
    status.textContent = 'Choose Save as PDF in the print dialog. Keep background graphics enabled to preserve every color.';
    window.print();
    // Some embedded browsers return without opening a print dialog.
    // Keep the control usable; the next attempt replaces the prepared snapshot.
    printing = false;
    downloadButton.removeAttribute('aria-disabled');
  } catch (error) { status.textContent = error.message; cleanup(); }
});
