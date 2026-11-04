const downloadButton = document.querySelector('#download-pdf');

downloadButton?.addEventListener('click', (event) => {
  event.preventDefault();
  window.print();
});
