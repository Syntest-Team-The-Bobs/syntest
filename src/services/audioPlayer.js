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
    this.activeOscillators = []; // Track sine wave oscillators
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
   * Convert note to frequency (Hz)
   */
  noteToFreq(note) {
    const notes = { 'C': -9, 'D': -7, 'E': -5, 'F': -4, 'G': -2, 'A': 0, 'B': 2 };
    const octave = parseInt(note.slice(-1));
    const key = note.slice(0, -1);
    const semitone = notes[key[0]] + (key[1] === '#' ? 1 : key[1] === 'b' ? -1 : 0);
    return 440 * Math.pow(2, (octave - 4) + semitone / 12);
  }

  /**
   * Play sine wave
   */
  playSine(note, duration) {
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    osc.frequency.value = this.noteToFreq(note);
    osc.connect(gain).connect(this.audioContext.destination);
    gain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    osc.start();
    osc.stop(this.audioContext.currentTime + duration);
    this.activeOscillators.push(osc);
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
      
      await this.init();
      this.stop();
      
      // Use sine wave for 'sine' instrument
      if (instrument === 'sine') {
        notes.forEach(note => this.playSine(note, duration));
        return true;
      }
      
      // Use Soundfont for other instruments
      const soundfontInstrument = this.getSoundfontInstrument(instrument);
      const player = await this.loadInstrument(soundfontInstrument);
      
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
    
    this.activeOscillators.forEach(osc => {
      try { osc.stop(); } catch (e) {}
    });
    this.activeOscillators = [];
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