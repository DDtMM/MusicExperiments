import { Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { range } from 'ramda';
import { Subject } from 'rxjs';
import { bufferTime, filter, map, takeUntil, tap } from 'rxjs/operators';
import { cancelEvent } from '../common';
import { getRelativeLocation, getRelativeLocationPercent, isPointInRect, Point2d, Rect } from '../geometry';
import { getFirstAvailableTriggerId, isTriggerDownOrPressed, TriggerDownState, TriggerReleasedState, TriggerState, TriggerStateType } from '../trigger-state';

interface TemplateKey {
  isSemitone: boolean;
  note: string;
}

interface PianoKey extends TemplateKey {
  frequency: number;
  noteIndex: number;
}

interface PositionedPianoKey extends PianoKey {
  rect: Rect;
}

interface PianoKeyEvent {
  eventType: 'pressed' | 'released';
  key: PositionedPianoKey;
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
  /** Keys currently down, keyed by noteIndex */
  downKeys: Map<number, TriggerDownState> = new Map();
  private isMouseDown = false;
  private readonly keyEventSubject = new Subject<PianoKeyEvent>();

  readonly cancelEvent = cancelEvent;

  @Output()
  keyStateChange = new EventEmitter<TriggerState[]>();

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

  @ViewChild('surfaceElem')
  surfaceElem: ElementRef;

  constructor() { }

  ngOnInit() {
    this.initKeys();
    this.keyEventSubject.pipe(

      takeUntil(this.destroyedSubject),
      bufferTime(1),
      filter(x => !!x.length),
      tap(events => {
        // store updated states, starting with current down states.
        const accumulatedStates = new Map<number, TriggerState>(
          Array.from(this.downKeys.entries())
            .map(([noteId, trigger]) => [noteId, trigger.stateType === 'pressed' ? { ...trigger, stateType: 'down' } : trigger])
        );
        // add new states from events.  If an existing state is updated it will replace what is in accumulatedStates.
        events.forEach(({ eventType, key }) => {
          const priorState = this.downKeys.get(key.noteIndex);
          if (eventType === 'pressed' && !priorState) {
            const triggerId = getFirstAvailableTriggerId(Array.from(accumulatedStates.values()));
            accumulatedStates.set(key.noteIndex,
              { id: triggerId, frequency: key.frequency, velocity: 1, stateType: 'pressed' } as TriggerDownState);
          }
          else if (eventType === 'released' && priorState) {
            accumulatedStates.set(key.noteIndex,
              { id: priorState.id, frequency: key.frequency, stateType: 'released' } as TriggerReleasedState);
          }
        });
        const updatedState = Array.from(accumulatedStates.values());
        this.downKeys = new Map(
          Array.from(accumulatedStates.entries())
            .filter(([_, trigger]) => isTriggerDownOrPressed(trigger)) as [number, TriggerDownState][]
        );
        this.keyStateChange.emit(updatedState);
      })
    ).subscribe();


  }

  ngOnChanges() {
    this.initKeys();
  }

  ngOnDestroy() {
    this.destroyedSubject.next();
  }

  isDown(key: PositionedPianoKey) {
    return this.downKeys.has(key.noteIndex);
  }
  mouseDown(key: PositionedPianoKey) {
    this.isMouseDown = true;
    this.keyEventSubject.next({ eventType: 'pressed', key });
  }
  mouseOver(key: PositionedPianoKey) {
    if (this.isMouseDown) {
      this.keyEventSubject.next({ eventType: 'pressed', key });
    }
  }
  mouseOut(key: PositionedPianoKey) {
    this.keyEventSubject.next({ eventType: 'released', key });
  }

  mouseUp(key: PositionedPianoKey) {
    this.isMouseDown = false;
    this.keyEventSubject.next({ eventType: 'released', key });
  }

  touchUpdate(event: TouchEvent) {
    cancelEvent(event);
    const surfaceRect = this.getSurfaceRect();
    const touchedKeys = Array.from(event.touches)
      .map(x => this.getKeyFromClientLocation([x.clientX, x.clientY], surfaceRect))
      .filter(x => !!x);

    // removed not touched keys.
    const toRelease = Array.from(this.downKeys)
      .filter(([noteIndex]) => !touchedKeys.find(x => x.noteIndex === noteIndex))
      .map(([noteIndex]) => this.keys.find(x => x.noteIndex === noteIndex))
      .filter(x => !!x);

    // add newly pressed keys.
    const toTouch = touchedKeys
      .filter(key => !this.downKeys.has(key.noteIndex));

    toRelease.forEach(key => this.keyEventSubject.next({ eventType: 'released', key }));
    toTouch.forEach(key => this.keyEventSubject.next({ eventType: 'pressed', key }));
  }

  /** Clears down keys and emits updated state. */
  private clearDownKeys() {
    if (this.downKeys.size > 0) {
      const newState = Array.from(this.downKeys.values())
        .map(x => ({ id: x.id, frequency: x.id, stateType: 'released' }) as TriggerReleasedState);
      this.downKeys.clear();
      this.keyStateChange.next(newState);
    }
  }

  /** gets the keys at a point; */
  private getKeyFromClientLocation(clientLoc: Point2d, boundary: Rect): PositionedPianoKey | undefined {
    const ptPct = getRelativeLocationPercent(clientLoc, boundary);
    const pt = [ptPct[0] * kbdWidth, ptPct[1] * kbdHeight] as Point2d;
    return this.keys.find(x => isPointInRect(pt, x.rect));
  }

  private getSurfaceRect() {
    return (this.surfaceElem.nativeElement as HTMLElement).getBoundingClientRect();
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
        ...octaveTemplate[noteIndex % 12],
        frequency: 55 * Math.pow(2, noteIndex / 12),
        noteIndex,
      } as PianoKey;
    }
    function getKeyDimensions(key: PianoKey, keyPosIndex: number): Rect {
      const xOffset = keyPosIndex * toneWidth + keyAreaOffsetX;
      return key.isSemitone
        ? { height: semitoneHeight, width: semitoneWidth, x: xOffset + semitoneXOffset, y: keyAreaOffsetY }
        : { height: keyAreaHeight, width: toneWidth, x: xOffset, y: keyAreaOffsetY };
    }
  }
}
