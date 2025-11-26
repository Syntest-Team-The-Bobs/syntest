import Soundfont from 'soundfont-player';

/**
 * MusicPlayer - Handles audio playback for music-color synesthesia test
 * 
 * Uses Soundfont.js to load and play instrument samples
 * Supports both single notes and dyads (two-note chords)
 * Based on Ward et al., 2006 specifications
 */
class MusicPlayer {
  constructor() {
    this.audioContext = null;
    this.instruments = {}; // Cache loaded instruments
    this.currentNotes = []; // Track playing notes for cleanup
  }

  /**
   * Initialize AudioContext (must be called after user interaction)
   */
  async init() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return this.audioContext;
  }

  /**
   * Load instrument from Soundfont
   */
  async loadInstrument(instrumentName) {
    if (this.instruments[instrumentName]) {
      return this.instruments[instrumentName];
    }

    await this.init();
    
    try {
      const instrument = await Soundfont.instrument(
        this.audioContext,
        instrumentName,
        { soundfont: 'MusyngKite' }
      );
      this.instruments[instrumentName] = instrument;
      return instrument;
    } catch (error) {
      console.error(`Failed to load instrument ${instrumentName}:`, error);
      throw error;
    }
  }

  /**
   * Map test instrument names to Soundfont instrument names
   */
  getSoundfontInstrument(testInstrument) {
    const mapping = {
      'piano': 'acoustic_grand_piano',
      'sine': 'acoustic_grand_piano', // Fallback to piano for sine
      'string': 'string_ensemble_1',
      'flute': 'flute',
      'clarinet': 'clarinet',
      'trumpet': 'trumpet',
      'violin': 'violin',
      'cello': 'cello',
      'guitar': 'acoustic_guitar_nylon',
      'organ': 'church_organ',
      'saxophone': 'alto_sax',
      'oboe': 'oboe',
      'bassoon': 'bassoon'
    };
    return mapping[testInstrument] || 'acoustic_grand_piano';
  }

  /**
   * Parse stimulus string into notes and instrument
   * @param {string} stimulus - Format: 'C4-piano' or 'C4+G4-piano'
   * @returns {Object} - { notes: ['C4', 'G4'], instrument: 'piano' }
   */
  parseStimulus(stimulus) {
    const [notesPart, instrument] = stimulus.split('-');
    const notes = notesPart.includes('+') 
      ? notesPart.split('+') 
      : [notesPart];
    return { notes, instrument };
  }

  /**
   * Play a musical stimulus
   * @param {string} stimulus - Format: 'C4-piano' or 'C4+G4-piano'
   * @param {number} duration - Note duration in seconds (default: 2)
   */
  async play(stimulus, duration = 2) {
    try {
      const { notes, instrument } = this.parseStimulus(stimulus);
      const soundfontInstrument = this.getSoundfontInstrument(instrument);
      
      // Load instrument if not cached
      const player = await this.loadInstrument(soundfontInstrument);
      
      // Stop any currently playing notes
      this.stop();
      
      // Play all notes simultaneously (for dyads)
      this.currentNotes = notes.map(note => 
        player.play(note, this.audioContext.currentTime, { duration })
      );
      
      return true;
    } catch (error) {
      console.error('Error playing stimulus:', error);
      return false;
    }
  }

  /**
   * Stop all currently playing notes
   */
  stop() {
    this.currentNotes.forEach(note => {
      if (note && note.stop) {
        note.stop();
      }
    });
    this.currentNotes = [];
  }

  /**
   * Cleanup resources
   */
  dispose() {
    this.stop();
    Object.values(this.instruments).forEach(instrument => {
      if (instrument.stop) instrument.stop();
    });
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}

// Export singleton instance
export const musicPlayer = new MusicPlayer();