import { Component, ElementRef, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { range } from 'ramda';
import { Subject } from 'rxjs';
import { bufferTime, filter, takeUntil, tap } from 'rxjs/operators';
import { cancelEvent } from '../common';
import { getNormalizedPosition, isPointInRect, Point2d, Rect } from '../geometry';
import { PressEventsChange } from '../press-events/models';
import { TriggerState } from '../trigger-state';

interface InternalTouchState {
  /** Id for sound sources, either touch or mouse. */
  id: number;
  /** Current position.  If omitted then it is assumed the touch is down. */
  pos?: Point2d;
}

@Component({
  selector: 'app-radar',
  templateUrl: './radar.component.svg',
  styleUrls: ['./radar.component.scss']
})
export class RadarComponent implements OnInit, OnDestroy {

  private destroyedSubject = new Subject();
  private downTouches = new Map<number, Point2d>();

  private readonly touchEventSubject = new Subject<InternalTouchState>();
  readonly gridStops = range(0, 20).map(x => 50 + x * 50);

  @Input()
  maxFreq = 1000;

  @Input()
  minFreq = 50;

  @Output()
  stateChange = new EventEmitter<TriggerState[]>();

  @ViewChild('surfaceElem')
  surfaceElem: ElementRef;

  constructor() { }

  ngOnInit() {
    this.touchEventSubject.pipe(
      takeUntil(this.destroyedSubject),
      bufferTime(1),
      filter(x => !!x.length),
      tap(events => {
        const result: TriggerState[] = [];
        const updatedDownTouches = new Map<number, Point2d>();
        /** Existing states as well as latest events. */
        const accumulatedStates = new Map<number, Point2d | undefined>(this.downTouches.entries());
        // get last changes for each id.
        events.forEach(({ id, pos }) => accumulatedStates.set(id, pos));
        accumulatedStates.forEach((currentPos, id) => {
          if (currentPos) {
            const priorPos = this.downTouches.get(id);
            const stateType = priorPos ? 'down' : 'pressed';
            updatedDownTouches.set(id, currentPos);
            result.push({ id, frequency: this.calculateFrequency(currentPos), velocity: this.calculateVelocity(currentPos), stateType });
          }
          else if (this.downTouches.has(id)) {
            result.push({ id, frequency: this.calculateFrequency(this.downTouches.get(id)), stateType: 'released' });
          }
        });
        this.downTouches = updatedDownTouches;
        this.stateChange.emit(result);
      })
    ).subscribe();
  }

  ngOnDestroy() {
    this.destroyedSubject.next();
  }

  pressChange(evt: PressEventsChange) {
    const rect = this.getSurfaceRect();
    evt.changes.forEach(x => {
      switch (x.type) {
        case 'press':
        case 'move':
          this.updateTouchPos(x.id, [x.clientX, x.clientY], rect);
          break;
        case 'release':
          this.touchEventSubject.next({ id: x.id });
          break;
      }
    });
  }


  private calculateFrequency([x]: Point2d) {
    return Math.abs(x) * (this.maxFreq - this.minFreq) + this.minFreq;
  }

  private calculateVelocity([, y]: Point2d) {
    const pct = Math.pow(1 - y, 4);
    return pct;
  }

  private getSurfaceRect() {
    return (this.surfaceElem.nativeElement as HTMLElement).getBoundingClientRect();
  }

  private updateTouchPos(id: number, clientLoc: Point2d, boundary?: Rect) {
    if (!boundary) {
      boundary = this.getSurfaceRect();
    }
    if (isPointInRect(clientLoc, boundary)) {
      this.touchEventSubject.next({ id, pos: getNormalizedPosition(clientLoc, boundary) });
    }
    else {
      this.touchEventSubject.next({ id });
    }
  }
}
