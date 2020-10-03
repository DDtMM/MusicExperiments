import { KeyedRead } from '@angular/compiler';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { range, sortBy, startsWith } from 'ramda';
import { defer, interval, Subject, timer, zip } from 'rxjs';
import { bufferTime, bufferWhen, filter, map, pairwise, startWith, take, takeUntil, tap, toArray } from 'rxjs/operators';

interface TemplateKey {
  isSemitone: boolean;
  note: string;
}

interface PianoKey extends TemplateKey {
  frequency: number;
  noteIndex: number;
}

interface Rect {
  height: number;
  width: number;
  x: number;
  y: number;
}

interface PositionedPianoKey extends PianoKey {
  rect: Rect;
}

interface PianoKeyEvent {
  eventType: 'press' | 'release',
  key: PositionedPianoKey
}
export interface KeyStateChangeEvent {
  /** keys that were previously pressed and are still down. */
  down: PianoKey[];
  /** Keys that were pressed during this change. */
  pressed: PianoKey[];
  /** keys that got released during this change. */
  released: PianoKey[];
}
const octaveTemplate = [
  { isSemitone: false, note: 'A' },
  { isSemitone: true, note: 'A#' },
  { isSemitone: false, note: 'B' },
  { isSemitone: false, note: 'C' },
  { isSemitone: true, note: 'C#' },
  { isSemitone: false, note: 'D' },
  { isSemitone: true, note: 'D#' },
  { isSemitone: false, note: 'E' },
  { isSemitone: false, note: 'F' },
  { isSemitone: true, note: 'F#' },
  { isSemitone: false, note: 'G' },
  { isSemitone: true, note: 'G#' },
];

/** Pixels width of keyboard */
const kbdWidth = 1000;
const kbdHeight = 200;
const keyAreaWidth = 960;
const keyAreaHeight = 180;
const keyAreaOffsetX = (kbdWidth - keyAreaWidth) / 2;
const keyAreaOffsetY = kbdHeight - keyAreaHeight;

@Component({
  selector: 'app-keyboard',
  templateUrl: './keyboard.component.html',
  styleUrls: ['./keyboard.component.scss']
})
export class KeyboardComponent implements OnInit, OnChanges, OnDestroy {
  private readonly destroyedSubject = new Subject();
  /** Keys that are currently down. */
  downKeys: PositionedPianoKey[] = [];
  private isMouseDown = false;
  private readonly keyEventSubject = new Subject<PianoKeyEvent>();


  /** Key that is currently hovered by mouse.  The css :hover was acting iffy with touch. */
  mouseHoverKey?: PositionedPianoKey;

  @Output()
  keyStateChange = new EventEmitter<KeyStateChangeEvent>();

  /** All possible keys. */
  keys: PositionedPianoKey[] = [];
  /** Semitone portion of keys. */
  keySemitones: PositionedPianoKey[] = [];
  /** Tone portion of keys. */
  keyTones: PositionedPianoKey[] = [];

  @Input()
  octaves = 8;

  @Input()
  startingOctaveIndex = 0;

  constructor() { }

  ngOnInit() {
    this.initKeys();
    this.keyEventSubject.pipe(
      takeUntil(this.destroyedSubject),
      filter(x => x.eventType === 'press' ? this.addDownKey(x.key) : this.removeDownKey(x.key)),
      bufferTime(1),
      filter(x => !!x.length),
      map(keyEvents => {
        const stateEvent: KeyStateChangeEvent = { down: [], pressed: [], released: [] };
        const lastKeyEvents = keyEvents
          .reduceRight((acc, evt) => acc.every(x => x.key !== evt.key) ? acc.concat([evt]) : acc, [] as PianoKeyEvent[]);

        stateEvent.released = lastKeyEvents.filter(x => x.eventType === 'release').map(x => x.key);
        stateEvent.pressed = lastKeyEvents.filter(x => x.eventType === 'press').map(x => x.key);
        stateEvent.down = this.downKeys.slice();

        return stateEvent;
      }),
      startWith({ down: [], pressed: [], released: [] } as KeyStateChangeEvent),
      pairwise(),
      filter(([a, b]) => a.down.length !== b.down.length
          || a.pressed.length !== b.pressed.length
          || a.released.length !== b.released.length
          || a.down.some(x => !b.down.includes(x))
          || a.pressed.some(x => !b.pressed.includes(x))
          || a.released.some(x => !b.released.includes(x))
      ),
      tap(([_, b]) => this.keyStateChange.emit(b))
    ).subscribe();
  }

  ngOnChanges() {
    this.initKeys();
  }

  ngOnDestroy() {
    this.destroyedSubject.next();
  }

  isDown(key: PositionedPianoKey) {
    return this.downKeys.includes(key);
  }
  mouseDown(key: PositionedPianoKey) {
    this.isMouseDown = true;
    this.keyEventSubject.next({ eventType: 'press', key });
  }
  mouseOver(key: PositionedPianoKey) {
    this.mouseHoverKey = key;
    if (this.isMouseDown) {
      this.keyEventSubject.next({ eventType: 'press', key });
    }
  }
  mouseOut(key: PositionedPianoKey) {
    if (this.mouseHoverKey === key) {
      this.mouseHoverKey = undefined;
    }
    this.keyEventSubject.next({ eventType: 'release', key });
  }
  mouseUp(key: PositionedPianoKey) {
    this.isMouseDown = false;
    this.keyEventSubject.next({ eventType: 'release', key });
  }
  touchStart(key: PositionedPianoKey) {
    if (this.mouseHoverKey == key) {
      this.mouseHoverKey = undefined;
    }
    this.keyEventSubject.next({ eventType: 'press', key });
  }
  touchEnd(key: PositionedPianoKey) {
    this.keyEventSubject.next({ eventType: 'release', key });
  }

  /** Adds a downKey to downKeys if it isn't already there.  Returns true if added. */
  private addDownKey(key: PositionedPianoKey) {
    if (!this.downKeys.includes(key)) {
      this.downKeys.push(key);
      this.downKeys = this.downKeys.sort((a, b) => a.noteIndex - b.noteIndex);
      return true;
    }
    return false;
  }

  /** Clears down keys by issuing release event for each. */
  private clearDownKeys() {
    this.downKeys.forEach(key => this.keyEventSubject.next({ eventType: 'release', key }));
  }

  private initKeys() {
    this.clearDownKeys();

    const toneWidth = keyAreaWidth / (3 + this.octaves * 7); // 7 is the number of tone keys per octave.
    const semitoneWidth = toneWidth * (2 / 3);
    const semitoneHeight = keyAreaHeight * (2 / 3);
    const semitoneXOffset = semitoneWidth / -2;

    let posIndex = 0;
    const startingNoteIndex = this.startingOctaveIndex * 12;
    this.keys = range(startingNoteIndex, 4 + startingNoteIndex + this.octaves * 12)
      .map((noteIndex) => {
        const key = createKey(noteIndex);
        return { ...key, rect: getKeyDimensions(key, key.isSemitone ? posIndex : posIndex++) };
      });
    this.keySemitones = this.keys.filter(x => x.isSemitone);
    this.keyTones = this.keys.filter(x => !x.isSemitone);

    function createKey(noteIndex: number) {
      return {
        ... octaveTemplate[noteIndex % 12],
        frequency: 55 * Math.pow(2, noteIndex / 12),
        noteIndex,
      } as PianoKey;
    }
    function getKeyDimensions(key: PianoKey, posIndex: number): Rect {
      const xOffset =  posIndex * toneWidth + keyAreaOffsetX;
      return key.isSemitone
        ? { height: semitoneHeight, width: semitoneWidth, x: xOffset + semitoneXOffset, y: keyAreaOffsetY }
        : { height: keyAreaHeight, width: toneWidth, x: xOffset, y: keyAreaOffsetY };
    }
  }

  /** removes down key from downKeys if it exists.  Returns true if operation occurs. */
  private removeDownKey(key: PositionedPianoKey) {
    let index = 0; // initialize with starting position.
    let isRemoved = false;
    while ((index = this.downKeys.indexOf(key, index)) !== -1) {
      this.downKeys.splice(index, 1);
      isRemoved = true;
    }
    return isRemoved;
  }
}
