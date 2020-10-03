import { Component, ElementRef, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { range } from 'ramda';
import { combineLatest, Subject } from 'rxjs';
import { bufferTime, filter, map, pairwise, startWith, takeUntil, tap } from 'rxjs/operators';
import { KeyStateChangeEvent } from '../keyboard/keyboard.component';

type Pos = [x: number, y: number];

interface InternalTouchState {
  /** Touch ids, -1 for mouse. */
  id: number;
  /** Current position.  If omitted then it is assumed the touch is down. */
  pos?: Pos;
}
interface TouchState {
  /** The current position of the touch. */
  currentPos: Pos;
  /** Touch ids, -1 for mouse. */
  id: number;
  /** */
  frequency: number;
  /** If no prior pos then this is a new touch. */
  priorPos?: Pos;
  volume: number;
}
export interface RadarState {
  down: TouchState[];
  pressed: TouchState[];
  released: number[];
}
@Component({
  selector: 'app-radar',
  templateUrl: './radar.component.html',
  styleUrls: ['./radar.component.scss']
})
export class RadarComponent implements OnInit, OnDestroy {
  private static readonly mouseId = -1;

  private destroyedSubject = new Subject();
  private downTouches = new Map<number, Pos>();
  private isMouseDown = false;


  private readonly touchEventSubject = new Subject<InternalTouchState>();
  readonly gridStops = range(0, 20).map(x => 50 + x * 50);

  @Input()
  maxFreq = 1200;

  @Input()
  minFreq = 10;

  @Output()
  stateChange = new EventEmitter<RadarState>();

  @ViewChild('surfaceElem')
  surfaceElem: ElementRef

  constructor() { }

  ngOnInit() {
    this.touchEventSubject.pipe(
      takeUntil(this.destroyedSubject),
      bufferTime(1),
      filter(x => !!x.length),
      map(events => {
        /** Existing states as well as latest events. */
        const accumulatedStates = new Map<number, Pos | undefined>(this.downTouches.entries());
        // get last changes for each id.
        events.forEach(({ id, pos }) => accumulatedStates.set(id, pos));
        const result: RadarState = { down: [], pressed: [], released: [] };
        accumulatedStates.forEach((currentPos, id) => {
          if (currentPos) {
            const priorPos = this.downTouches.get(id);
            const target = priorPos ? result.down : result.pressed;
            target.push({ id, priorPos, currentPos, frequency: this.calculateFrequency(currentPos), volume: this.calculateVolume(currentPos) });
          }
          else if (this.downTouches.has(id)) {
            result.released.push(id);
          }
        })
        return result;
      }),
      startWith({ down: [], pressed: [], released: [] } as RadarState),
      tap(x => {
        this.downTouches = new Map(x.down.concat(x.pressed).map(y => [y.id, y.currentPos]));
        this.stateChange.emit(x);
      })
    ).subscribe();

  }

  ngOnDestroy() {
    this.destroyedSubject.next();
  }

  mouseDown(evt: MouseEvent) {
    this.isMouseDown = true;
    this.updateMousePos(evt);

  }
  @HostListener('window:mouseup')
  mouseUp() {
    if (this.isMouseDown) {
      this.isMouseDown = false;
      this.touchEventSubject.next({ id: RadarComponent.mouseId });
    }
  }

  mouseMove(evt: MouseEvent) {
    if (this.isMouseDown) {
      this.updateMousePos(evt);
    }
  }

  touchStart(evt: TouchEvent) {
    const rect = this.getSurfaceRect();
    Array.from(evt.changedTouches).forEach(x =>
      this.touchEventSubject.next({
        id: x.identifier,
        pos: this.createNormalizedPosition([x.clientX, x.clientY], rect)
      })
    );
  }
  touchEnd(evt: TouchEvent) {;
    Array.from(evt.changedTouches).forEach(x => this.touchEventSubject.next({id: x.identifier}));
  }
  touchMove(evt: TouchEvent) {
    const rect = this.getSurfaceRect();
    Array.from(evt.changedTouches).forEach(x =>
      this.touchEventSubject.next({
        id: x.identifier,
        pos: this.createNormalizedPosition([x.clientX, x.clientY], rect)
      })
    );
  }

  private createNormalizedPosition([x, y]: Pos, rect: {x: number, y: number, width: number, height: number}): Pos {
    return [ (x - rect.x) / rect.width, (y - rect.y) / rect.height ];
  }
  private calculateFrequency([x]: Pos) {
    return Math.abs(x) * (this.maxFreq - this.minFreq) + this.minFreq;
  }
  private calculateVolume([, y]: Pos) {
    const pct = Math.pow(1 - y, 3);
    return Math.log10(pct) * 10;
  }
  private getSurfaceRect() {
    return (this.surfaceElem.nativeElement as HTMLElement).getBoundingClientRect();
  }
  private updateMousePos(evt: MouseEvent) {
    this.touchEventSubject.next({
      id: RadarComponent.mouseId,
      pos: this.createNormalizedPosition([evt.clientX, evt.clientY], this.getSurfaceRect())
    });
  }
}
