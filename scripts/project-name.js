const projectName = document.querySelector('#project-name');
const projectNameStorageKey = 'x99-project-name';

if (projectName) {
  const savedName = sessionStorage.getItem(projectNameStorageKey);
  if (savedName) projectName.textContent = savedName;

  projectName.addEventListener('input', () => {
    const name = projectName.textContent.replace(/\s+/g, ' ').trim();
    if (name) sessionStorage.setItem(projectNameStorageKey, name);
  });

  projectName.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      projectName.blur();
    }
  });
}
