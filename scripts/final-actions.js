import { captureDesign, encodeSnapshot, waitForDesignAssets } from './design-snapshot.js';

const dialog = document.querySelector('#final-dialog');
const output = document.querySelector('#final-output');
const status = document.querySelector('#final-dialog-status');
const saveButton = document.querySelector('#save-final-output');
const preview = document.createElement('a');
preview.textContent = 'Preview shared design';
preview.target = '_blank';
preview.rel = 'noopener';
dialog.querySelector('.final-dialog-actions').append(preview);
let projectName = 'My project';

function openDialog(title, help, text, sharing = false) {
  document.querySelector('#final-dialog-title').textContent = title;
  document.querySelector('#final-dialog-help').textContent = help;
  document.querySelector('#final-output-label').textContent = sharing ? 'Shareable project link' : 'Fill in the brackets, then copy this prompt into your coding assistant';
  output.value = text;
  output.readOnly = sharing;
  output.rows = sharing ? 5 : 18;
  saveButton.hidden = sharing;
  preview.hidden = !sharing;
  status.textContent = '';
  dialog.showModal();
}

document.querySelector('#close-final-dialog').addEventListener('click', () => dialog.close());
document.querySelector('#copy-final-output').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(output.value);
    status.textContent = 'Copied!';
  } catch {
    output.focus(); output.select();
    status.textContent = 'Select Copy from your browser, or press Ctrl+C / Command+C.';
  }
});
saveButton.addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([output.value], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${projectName.replace(/[^a-z0-9_-]/gi, '-').slice(0, 70) || 'project'}-coding-prompt.txt`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

document.querySelector('#share-project').addEventListener('click', async event => {
  event.preventDefault();
  const pageStatus = document.querySelector('#final-status');
  pageStatus.textContent = 'Preparing your project link…';
  try {
    const board = document.querySelector('#final-page');
    await waitForDesignAssets(board);
    const encoded = await encodeSnapshot(captureDesign(board));
    if (encoded.length > 100000) throw new Error('This design is too large for a link. Download the PDF instead.');
    const localURL = new URL('final.html', location.href);
    localURL.hash = `design=${encoded}`;
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
    const url = local ? new URL('https://alli-anne.github.io/X99Project/final.html') : new URL(localURL);
    url.hash = localURL.hash;
    preview.href = localURL.href;
    openDialog('Share this design',
      'Anyone with this link can view this version of your design. Later edits do not change the link.' +
      (local ? ' You are testing locally: publish these updates to GitHub Pages before sending the public link. Preview works here now.' : ''), url.href, true);
    pageStatus.textContent = '';
  } catch (error) { pageStatus.textContent = `Could not create a share link. ${error.message}`; }
});

const textOf = node => typeof node === 'string' ? node : (node.children || []).map(textOf).join('').trim();
function nodesOf(snapshot) {
  const nodes = [];
  const walk = node => {
    if (typeof node === 'string') return;
    nodes.push(node); (node.children || []).forEach(walk);
  };
  walk(snapshot.tree);
  return nodes;
}

export function codingPrompt(snapshot) {
  const nodes = nodesOf(snapshot);
  const palette = nodes.filter(node => node.classes?.includes('palette-swatch'));
  const fonts = ['header-font', 'body-font'].map(id => {
    const node = nodes.find(item => item.id === id);
    return node ? `${id === 'header-font' ? 'Headings' : 'Body'}: ${node.style['font-family']}; weights ${[...new Set(nodesOf({ tree: node }).filter(item => item.tag === 'li').map(item => item.style['font-weight']))].join(', ')}; sample text color ${node.style.color}; sample background ${node.style['background-color']}.` : '';
  }).filter(Boolean);
  const buttons = nodes.filter(node => node.classes?.includes('btn') || node.classes?.includes('design-element--button'));
  const images = nodes.filter(node => node.tag === 'img');
  const extraText = nodes.filter(node => node.classes?.includes('design-element--text')).map(textOf);
  const sections = snapshot.tree.children.filter(node => typeof node !== 'string').map(node => ({
    label: node.id || node.classes?.join(' ') || node.tag, x: Math.round(node.x), y: Math.round(node.y)
  }));
  return `Build a responsive website inspired by my Easy Design project, "${snapshot.name}".

FILL IN MY PROJECT DETAILS
Website or app type: [e.g. portfolio, shop, landing page]
Purpose and main user action: [what visitors should accomplish]
Audience: [who it is for]
Desired feeling in three words: [word], [word], [word]
Pages or sections: [list the content and sections]
Framework and styling approach: [e.g. HTML/CSS/JS, React, Tailwind]
Brand name and copy: [name and text, or ask me for them]
Features and constraints: [forms, navigation, integrations, etc.]

USE THESE DESIGN DETAILS
Palette, in its current order:
${palette.map((node, index) => `${index + 1}. #${textOf(node).replace('#', '')} (${node.style['background-color']})`).join('\n')}
Use these as reusable CSS color variables. Preserve their character and proportions; do not introduce unrelated accent colors.

Typography:
${fonts.join('\n')}
${snapshot.fonts ? `Font stylesheet: ${snapshot.fonts}` : ''}

Button examples:
${buttons.map((node, index) => `${index + 1}. "${textOf(node)}": background ${node.style['background-color'] === 'rgba(0, 0, 0, 0)' ? node.style['--element-color'] : node.style['background-color']}, text ${node.style.color}, font ${node.style['font-family']}, size ${node.style['font-size']}, weight ${node.style['font-weight']}, radius ${node.style['border-radius']}, padding ${node.style['padding-top']} ${node.style['padding-right']} ${node.style['padding-bottom']} ${node.style['padding-left']}.`).join('\n') || 'Use the palette and typography to create consistent buttons.'}

Layout reference:
Board size ${Math.round(snapshot.width)} × ${Math.round(snapshot.height)}px; background ${snapshot.tree.style['background-color']}; padding ${snapshot.tree.style['padding-top']} ${snapshot.tree.style['padding-right']} ${snapshot.tree.style['padding-bottom']} ${snapshot.tree.style['padding-left']}.
Section positions in the reference: ${sections.map(s => `${s.label} at (${s.x}, ${s.y})`).join('; ')}.
Use the spacing, grouping, hierarchy and corner treatment as visual direction. Implement with responsive grid/flex layouts rather than copying fixed coordinates or accidental overlaps.
${extraText.length ? `Added text: ${extraText.join('; ')}` : ''}

Image direction:
${images.map(node => `- ${node.alt || 'Reference image'}: ${node.src}; crop ${node.style['object-fit']}, corner radius ${node.style['border-radius']}.`).join('\n') || '[Add image references or describe the photography/illustration style]'}

IMPLEMENTATION REQUIREMENTS
- Match the feeling of this reference while adapting it to my actual content.
- Include mobile, tablet and desktop layouts, keyboard navigation and visible focus states.
- Check text/background contrast; flag unsuitable pairs and propose the closest accessible alternative instead of claiming the palette is automatically accessible.
- Keep colors, typography, spacing and radii in reusable design tokens.
- Include hover, focus and disabled states for interactive controls.
- Ask about any unfilled brackets before inventing project requirements.
- Deliver [complete source files / components / a step-by-step implementation] and explain how to run it.
`;
}

document.querySelector('#project-prompt').addEventListener('click', event => {
  event.preventDefault();
  const snapshot = captureDesign(document.querySelector('#final-page'));
  projectName = snapshot.name;
  openDialog('Your coding prompt', 'This template uses your current design. Fill in the brackets, then copy it into your preferred AI coding tool or save it as a text file.', codingPrompt(snapshot));
});
