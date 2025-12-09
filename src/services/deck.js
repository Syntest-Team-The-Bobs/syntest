export function buildDeck(items, repeats = 3) {
	const shuffle = (arr) => {
		const a = [...arr];
		for (let i = a.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[a[i], a[j]] = [a[j], a[i]];
		}
		return a;
	};

	const trials = [];
	for (let trial = 1; trial <= repeats; trial++) {
		shuffle([...items]).forEach((item, idx) => {
			trials.push({
				stimulus: String(item),
				trial,
				itemId: idx + 1,
			});
		});
	}
	return trials;
}

/**
 * Letter Test Configuration
 */
const LETTER_STIMULI = [
	"A",
	"B",
	"C",
	"D",
	"E",
	"F",
	"G",
	"H",
	"I",
	"J",
	"K",
	"L",
	"M",
	"N",
	"O",
	"P",
	"Q",
	"R",
	"S",
	"T",
	"U",
	"V",
	"W",
	"X",
	"Y",
	"Z",
];

export function buildLetterDecks() {
	return {
		stimuli: LETTER_STIMULI,
		practiceStimuli: LETTER_STIMULI,
	};
}

/**
 * Number Test Configuration
 */
const NUMBER_STIMULI = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

export function buildNumberDecks() {
	return {
		stimuli: NUMBER_STIMULI,
		practiceStimuli: NUMBER_STIMULI,
	};
}

/**
 * Word Test Configuration
 */
const WORD_STIMULI = [
	"RED",
	"BLUE",
	"GREEN",
	"SUN",
	"MOON",
	"STAR",
	"DAY",
	"NIGHT",
	"CAT",
	"DOG",
	"APPLE",
	"MONDAY",
	"MUSIC",
	"WATER",
	"SALT",
];

export function buildWordDecks() {
	return {
		stimuli: WORD_STIMULI,
		practiceStimuli: WORD_STIMULI,
	};
}

/**
 * Music Test Configuration
 */
const MUSIC_STIMULI = [
	"C1-piano",
	"G1-piano",
	"D2-piano",
	"A2-piano",
	"E3-piano",
	"B3-piano",
	"F#4-piano",
	"Db5-piano",
	"Ab5-piano",
	"Eb6-piano",

	"C1-sine",
	"G1-sine",
	"D2-sine",
	"A2-sine",
	"E3-sine",
	"B3-sine",
	"F#4-sine",
	"Db5-sine",
	"Ab5-sine",
	"Eb6-sine",

	"C1-string",
	"G1-string",
	"D2-string",
	"A2-string",
	"E3-string",
	"B3-string",
	"F#4-string",
	"Db5-string",
	"Ab5-string",
	"Eb6-string",

	"C4-flute",
	"C4-clarinet",
	"C4-trumpet",
	"C4-violin",
	"C4-cello",
	"C4-guitar",
	"C4-organ",
	"C4-saxophone",
	"C4-oboe",
	"C4-bassoon",

	"C1+G1-piano",
	"G1+D2-piano",
	"D2+A2-piano",
	"A2+E3-piano",
	"E3+B3-piano",
	"B3+F#4-piano",
	"F#4+Db5-piano",
	"Db5+Ab5-piano",
	"Ab5+Eb6-piano",
	"Ab5+Eb6-piano",

	"C1+G1-sine",
	"G1+D2-sine",
	"D2+A2-sine",
	"A2+E3-sine",
	"E3+B3-sine",
	"B3+F#4-sine",
	"F#4+Db5-sine",
	"Db5+Ab5-sine",
	"Ab5+Eb6-sine",
	"Ab5+Eb6-sine",

	"C1+G1-string",
	"G1+D2-string",
	"D2+A2-string",
	"A2+E3-string",
	"E3+B3-string",
	"B3+F#4-string",
	"F#4+Db5-string",
	"Db5+Ab5-string",
	"Ab5+Eb6-string",
	"Ab5+Eb6-string",
];

export function buildMusicDecks() {
	return {
		stimuli: MUSIC_STIMULI,
		practiceStimuli: ["C4-piano"],
	};
}
