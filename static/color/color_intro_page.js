// static/color/color_intro.js

/**
 * Manages intro screens for color tests
 */
export class ColorIntro {
  constructor(container) {
    this.container = container;
    this.introElement = null;
  }

  /**
   * Show intro screen
   * @param {Object} config
   * @param {string} config.title
   * @param {string} config.description
   * @param {string[]} [config.instructions]
   * @param {Function} config.onStart
   * @param {string} [config.estimatedTime]
   */
  show({ title, description, instructions = [], onStart, estimatedTime }) {
    this.hide();

    this.introElement = document.createElement('div');
    this.introElement.className = 'color-intro-container';
    
    this.introElement.innerHTML = `
      <div class="color-intro-content">
        <h2 class="color-intro-title">${title}</h2>
        <p class="color-intro-description">${description}</p>
        ${instructions.length ? this._renderInstructions(instructions) : ''}
        ${estimatedTime ? `<p class="color-intro-time">⏱️ Estimated time: ${estimatedTime}</p>` : ''}
        <button class="color-intro-start-btn">Start Test</button>
      </div>
    `;

    this.container.appendChild(this.introElement);

    const startBtn = this.introElement.querySelector('.color-intro-start-btn');
    startBtn.addEventListener('click', () => {
      this.hide();
      onStart();
    });
  }

  _renderInstructions(instructions) {
    return `
      <ul class="color-intro-instructions">
        ${instructions.map(item => `<li>${item}</li>`).join('')}
      </ul>
    `;
  }

  hide() {
    if (this.introElement) {
      this.introElement.remove();
      this.introElement = null;
    }
  }

  isShowing() {
    return this.introElement !== null;
  }
}