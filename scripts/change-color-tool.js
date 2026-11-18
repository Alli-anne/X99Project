
document.addEventListener("DOMContentLoaded", () => {

  const drawButton = document.getElementById("draw");

  const popup = document.getElementById("draw-style-popout");
  const instruction = document.getElementById("draw-instruction");
  const closeButton = document.getElementById("draw-style-close");

  const backgroundColors = document.getElementById("draw-background-colors");
  const textColors = document.getElementById("draw-text-colors");

  const backgroundCustom = document.getElementById("draw-background-custom");
  const textCustom = document.getElementById("draw-text-custom");

  const workspace = document.getElementById("edit-page");

  let drawActive = false;
  let selectedElement = null;

  // Only one editing tool should handle a board click at a time.
  document.querySelector('.tools-list').addEventListener('click', (event) => {
    if (!event.target.closest('.tools:not(#draw)') || !drawActive) return;
    drawActive = false;
    drawButton.classList.remove('active');
    document.body.classList.remove('draw-mode');
    instruction.hidden = true;
    popup.hidden = true;
    selectedElement?.classList.remove('draw-selected');
    selectedElement = null;
  });

  // Elements that should not be selectable
  const excludedElements = [
    "#draw-style-popout",
    "#edit-tools",
    ".color-palette",
    ".palette-lock",
    ".tools-list",
    "#draw-instruction"
  ];

  // Activate or deactivate Draw mode
  drawButton.addEventListener("click", () => {

    drawActive = !drawActive;

    drawButton.classList.toggle("active", drawActive);

    document.body.classList.toggle("draw-mode", drawActive);

    if (drawActive) {
      instruction.hidden = false;
      popup.hidden = true;
      selectedElement = null;
    } else {
      instruction.hidden = true;
      popup.hidden = true;
      selectedElement = null;
    }

  });

  // Get current colors from the project palette
  function getProjectColors() {

    const swatches = document.querySelectorAll(
      ".color-palette .palette-swatch"
    );

    return Array.from(swatches).map(swatch => {

      const colorText = swatch.textContent.trim();

      const computedColor = getComputedStyle(swatch).backgroundColor;

      const hexMatch = colorText.match(/^#?([0-9a-f]{6})$/i);

      return hexMatch
        ? `#${hexMatch[1]}`
        : computedColor;

    });

  }

  // Generate color buttons
  function generateColorOptions(container, property) {

    container.innerHTML = "";

    const colors = getProjectColors();

    colors.forEach(color => {

      const button = document.createElement("button");

      button.type = "button";
      button.className = "draw-color-swatch";

      button.style.backgroundColor = color;

      button.setAttribute("aria-label", color);

      button.addEventListener("click", () => {

        applyStyle(property, color);

      });

      container.appendChild(button);

    });

  }

  // Generate both palettes
  function refreshDrawColors() {

    generateColorOptions(
      backgroundColors,
      "backgroundColor"
    );

    generateColorOptions(
      textColors,
      "color"
    );

  }

  // Watch for changes to the project palette
  const palette = document.querySelector(".color-palette");
  
  if (palette) {
  
    const paletteObserver = new MutationObserver(() => {
  
      if (!popup.hidden) {
        refreshDrawColors();
      }
  
    });
  
    paletteObserver.observe(palette, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["style", "class"]
    });
  
  }

  // Apply styling to selected element
  function applyStyle(property, value) {

    if (!selectedElement) return;

    selectedElement.style[property] = value;

  }

  // Check whether an element is excluded
  function isExcluded(element) {

    return excludedElements.some(selector => {

      return element.closest(selector);

    });

  }

  // Position the popup above the selected element
  
  function positionPopup(element) {
    if (popup.dataset.docked) return;
  
    const rect = element.getBoundingClientRect();
  
    // Temporarily make popup measurable
    popup.style.visibility = "hidden";
    popup.style.display = "block";
  
    const popupRect = popup.getBoundingClientRect();
  
    let top = rect.top - popupRect.height - 12;
  
    // Show below the element if there isn't enough room above
    if (top < 10) {
      top = rect.bottom + 12;
    }
  
    let left = rect.left + rect.width / 2 - popupRect.width / 2;
  
    // Keep popup within the screen
    left = Math.max(
      10,
      Math.min(left, window.innerWidth - popupRect.width - 10)
    );
  
    popup.style.top = `${top}px`;
    popup.style.left = `${left}px`;
  
    popup.style.visibility = "visible";
    popup.style.display = "";
  
  }


  // Select an element
  workspace.addEventListener("click", (event) => {

    if (!drawActive) return;
  
    const target = event.target;
  
    if (!(target instanceof Element)) return;
  
    // Ignore clicks inside excluded controls
    if (isExcluded(target)) return;
  
    // Specifically detect font names
    const fontElement = target.closest(
      "#header-font li, #body-font li"
    );
  
    // Select font names first, then other content
    const element = fontElement || target.closest(
      "button, h1, h2, h3, h4, p, li, a, span"
    );
  
    if (!element || !workspace.contains(element)) return;
  
    event.preventDefault();
    event.stopPropagation();
  
    // Remove previous selection
    document.querySelectorAll(".draw-selected").forEach(el => {
      el.classList.remove("draw-selected");
    });
  
    selectedElement = element;
  
    selectedElement.classList.add("draw-selected");
  
    // Refresh project colors
    refreshDrawColors();
  
    // Show popup
    instruction.hidden = true;
    popup.hidden = false;
  
    // Position popup
    positionPopup(selectedElement);
  
  }, true);

  // Custom background color
  backgroundCustom.addEventListener("input", (event) => {

    applyStyle("backgroundColor", event.target.value);

  });

  // Custom text color
  textCustom.addEventListener("input", (event) => {

    applyStyle("color", event.target.value);

  });

  // Close popup
  closeButton.addEventListener("click", () => {

    popup.hidden = true;

    if (selectedElement) {
      selectedElement.classList.remove("draw-selected");
    }

    selectedElement = null;

    if (drawActive) {
      instruction.hidden = false;
    }

  });

  // Clicking outside the popup does not immediately close Draw mode.
  // The next canvas click selects another element.

  // Exit Draw mode with Escape
  document.addEventListener("keydown", (event) => {

    if (event.key === "Escape" && drawActive) {

      drawActive = false;

      drawButton.classList.remove("active");

      document.body.classList.remove("draw-mode");

      instruction.hidden = true;
      popup.hidden = true;

      if (selectedElement) {
        selectedElement.classList.remove("draw-selected");
      }

      selectedElement = null;

    }

  });

  // Keep popup positioned when scrolling or resizing
  window.addEventListener("scroll", () => {

    if (!popup.hidden && selectedElement) {
      positionPopup(selectedElement);
    }

  });

  window.addEventListener("resize", () => {

    if (!popup.hidden && selectedElement) {
      positionPopup(selectedElement);
    }

  });

});
