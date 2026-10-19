
function showSelectedImages() {
  const container = document.querySelector('#editing-selected-images');

  if (!container) return;

  const selectedImages = JSON.parse(
    sessionStorage.getItem('selectedImages') || '[]'
  );

  container.replaceChildren();

  selectedImages.forEach((photo) => {
    const image = document.createElement('img');
    image.className = 'catagory-img';
    image.src = photo.url;
    image.alt = photo.alt;

    container.append(image);
  });
}

showSelectedImages();
