/* screening-dom.js — DOM manipulation helpers for screening flow
   Provides utilities for querying and manipulating DOM elements.
*/
(() => {
  "use strict";

  // DOM query helpers
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // Treat an anchor like a disabled button by removing href temporarily
  function disableAnchor(a, disabled = true) {
    if (!a) return;
    if (disabled) {
      if (!a.dataset.href) a.dataset.href = a.getAttribute("href") || "";
      a.removeAttribute("href");
      a.style.opacity = "0.6";
      a.style.pointerEvents = "none";
      a.setAttribute("aria-disabled", "true");
    } else {
      a.setAttribute("href", a.dataset.href || a.getAttribute("href") || "#");
      a.style.opacity = "1";
      a.style.pointerEvents = "auto";
      a.removeAttribute("aria-disabled");
    }
  }

  // Update progress bar
  function updateProgressBar(step) {
    // Only update progress bars for steps 1-5 (step 0 has no progress bar)
    // Clamp step to valid range to prevent incorrect calculations
    if (step < 1 || step > 5) {
      console.log("updateProgressBar: step out of range:", step);
      return;
    }
    
    const totalSteps = 5;
    // Ensure step is an integer between 1 and 5
    const validStep = parseInt(step, 10);
    if (isNaN(validStep) || validStep < 1 || validStep > 5) {
      console.log("updateProgressBar: invalid step value:", step);
      return;
    }
    
    // Calculate percentage: (step / totalSteps) * 100, capped at 100%
    const percentage = Math.round((validStep / totalSteps) * 100);
    // Ensure percentage never exceeds 100% and is a valid number
    const validPercentage = Math.min(100, Math.max(0, percentage));
    
    console.log(`updateProgressBar: step=${validStep}, percentage=${validPercentage}%`);
    
    // Update progress bar content
    const progressTop = document.querySelector('.progress-top');
    if (!progressTop) {
      console.log("updateProgressBar: .progress-top not found");
      return;
    }
    
    // Clear any existing content first
    const spans = progressTop.querySelectorAll('span');
    console.log(`updateProgressBar: found ${spans.length} spans`);
    
    if (spans.length >= 2) {
      // Update first span: "Step X of 5" - clear and set explicitly
      const stepText = `Step ${validStep} of ${totalSteps}`;
      spans[0].textContent = '';
      spans[0].textContent = stepText;
      console.log(`updateProgressBar: updated first span to "${stepText}"`);
      
      // Update second span: percentage - clear and set explicitly
      const percentText = String(validPercentage) + '%';
      spans[1].textContent = '';
      spans[1].textContent = percentText;
      console.log(`updateProgressBar: updated second span to "${percentText}"`);
      
      // Verify the update worked
      setTimeout(() => {
        const verifySpan1 = spans[0].textContent.trim();
        const verifySpan2 = spans[1].textContent.trim();
        console.log(`updateProgressBar: verification - span1="${verifySpan1}", span2="${verifySpan2}"`);
        if (verifySpan2.includes('540') || verifySpan2.includes('520') || parseInt(verifySpan2) > 100) {
          console.error('updateProgressBar: ERROR - Percentage still incorrect! Forcing fix...');
          spans[1].textContent = String(validPercentage) + '%';
        }
      }, 50);
    } else {
      console.error("updateProgressBar: ERROR - Expected 2 spans but found", spans.length);
    }
    
    // Update progress bar width - override any inline styles
    const progressBar = document.querySelector('.progress-bar');
    if (progressBar) {
      // Set the width directly - this will override inline styles
      const widthValue = String(validPercentage) + '%';
      
      // Ensure display properties are set - override styles.css
      progressBar.style.display = 'block';
      progressBar.style.height = '100%';
      progressBar.style.minHeight = '8px';
      progressBar.style.background = '#0f172a'; // Dark background, not light gray
      progressBar.style.backgroundColor = '#0f172a'; // Ensure background color is set
      progressBar.style.border = 'none'; // Remove border from styles.css
      progressBar.style.margin = '0'; // Remove margin from styles.css
      progressBar.style.visibility = 'visible'; // Ensure it's visible
      progressBar.style.opacity = '1'; // Ensure it's not transparent
      
      // Set width using both methods to ensure it works
      progressBar.style.width = widthValue;
      progressBar.style.setProperty('width', widthValue, 'important');
      
      // Verify the width was set correctly - get all computed styles
      const computed = window.getComputedStyle(progressBar);
      const computedWidth = computed.width;
      const computedHeight = computed.height;
      const computedDisplay = computed.display;
      const computedBackground = computed.backgroundColor || computed.background;
      const computedVisibility = computed.visibility;
      const computedOpacity = computed.opacity;
      
      const parent = progressBar.parentElement;
      const parentWidth = parent ? window.getComputedStyle(parent).width : 'unknown';
      const parentHeight = parent ? window.getComputedStyle(parent).height : 'unknown';
      
      console.log(`updateProgressBar: set width to ${validPercentage}%`);
      console.log(`updateProgressBar: computed width = ${computedWidth}, computed height = ${computedHeight}`);
      console.log(`updateProgressBar: computed display = ${computedDisplay}, visibility = ${computedVisibility}, opacity = ${computedOpacity}`);
      console.log(`updateProgressBar: computed background = ${computedBackground}`);
      console.log(`updateProgressBar: parent width = ${parentWidth}, parent height = ${parentHeight}`);
      console.log(`updateProgressBar: inline style.width = "${progressBar.style.width}", inline style.height = "${progressBar.style.height}"`);
      console.log(`updateProgressBar: element classes = "${progressBar.className}"`);
      
      // If the computed width doesn't match, try again
      if (computedWidth === '0px' || computedWidth === 'auto') {
        console.warn('updateProgressBar: Width not applied correctly, retrying...');
        setTimeout(() => {
          progressBar.style.width = widthValue;
          progressBar.style.setProperty('width', widthValue, 'important');
        }, 10);
      }
      
      // If height is 0 or auto, fix it
      if (computedHeight === '0px' || computedHeight === 'auto') {
        console.warn('updateProgressBar: Height not applied correctly, fixing...');
        progressBar.style.height = '100%';
        progressBar.style.minHeight = '8px';
      }
    } else {
      console.log("updateProgressBar: .progress-bar not found");
    }
  }

  // Export to window for use by other modules
  window.ScreeningDOM = {
    $,
    $$,
    disableAnchor,
    updateProgressBar
  };
})();

