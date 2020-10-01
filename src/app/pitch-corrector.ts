import { range } from 'ramda';

export const a0 = 55.0;

export type BaseNoteKey = 'A' | 'A#' | 'B' | 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#';

type NoteMap = { [noteKey: string]: number };

export const baseNoteKeys: BaseNoteKey[] = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];

export const noteFrequencies: number[] = range(0, 96).map(note => a0 * Math.pow(2, note / 12));

/** Notes from a0 to b7 mapped to frequencies. */
export const noteMap: NoteMap = noteFrequencies
    .reduce((acc, freq, index) => ({ ...acc, [baseNoteKeys[index % 12] + Math.floor(index / 12)]: freq }), {} as NoteMap);

/** 
 * Corrects the pictch of note. 
 * @param freq the frequency to correct.
 * @param strength the strength of the correction.
 */
export function correctPitch(freq: number, strength = 1.0) {
    const approxNote = Math.log(freq/a0) / Math.log(2) * 12;
    const note = Math.round(approxNote);
    const correctedFreq = a0 * Math.pow(2, note / 12);
    const oldFreqFactor = Math.max(0.0, 1.0 - strength);
    const correctedFreqFactor = Math.min(1.0, strength);
    return correctedFreq * correctedFreqFactor + freq * oldFreqFactor;
}

