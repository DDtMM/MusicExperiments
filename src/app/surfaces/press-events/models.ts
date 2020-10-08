import { ElementRef, HostListener, Renderer2 } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, filter, tap } from 'rxjs/operators';
import { cancelEvent } from '../common';
import { PressEventsService } from './press-events.service';

export const mouseId = -1;

export type PressStateType = 'press' | 'release' | 'move';

export interface PressEventState {
  clientX: number;
  clientY: number;
  id: number;
  type: PressStateType;
}

export interface PressEventsChange {
  changes: PressEventState[];
  states: PressEventState[];
}

export type PressEventsMonitorType = 'all' | 'mouse' | 'touch';

export class PressEventsElementListener {
  private readonly destroySubject = new Subject();
  private readonly pressEventsChangeSubject = new Subject<PressEventsChange>();
  private readonly state = new Map<number, PressEventState>();
  private readonly unlisteners: (() => void)[] = [];

  readonly pressEventsChange$ = this.pressEventsChangeSubject.asObservable();

  constructor(
    el: ElementRef, renderer: Renderer2, pressEventsSvc: PressEventsService, type: PressEventsMonitorType) {

    const isMonitoringMouse = type === 'all' || type === 'mouse';
    const isMonitoringTouch = type === 'all' || type === 'touch';

    pressEventsSvc.event$.pipe(
      takeUntil(this.destroySubject),
      filter(x => (this.state.has(x.id) || x.type === 'press')
        && ((isMonitoringMouse && x.id === mouseId) || (isMonitoringTouch && x.id !== mouseId))),
      tap((x) => this.updateState([x]))
    ).subscribe();

    if (isMonitoringMouse) {
      this.unlisteners.push(
        renderer.listen(el, 'mousedown', (evt: MouseEvent) => {
          cancelEvent(evt);
          this.updateState([{ clientX: evt.clientX, clientY: evt.clientY, id: mouseId, type: 'press' }]);
        })
      );
    }
    if (isMonitoringTouch) {
      this.unlisteners.push(
        renderer.listen(el, 'touchstart', (evt: TouchEvent) => this.updateTouchState(evt, 'press')),
        renderer.listen(el, 'touchmove', (evt: TouchEvent) => this.updateTouchState(evt, 'move')),
        renderer.listen(el, 'touchend', (evt: TouchEvent) => this.updateTouchState(evt, 'release')),
      );
    }
  }

  /** stops listening to events */
  destroy() {
    this.unlisteners.forEach(x => x());
    this.destroySubject.next();
    this.pressEventsChangeSubject.complete();
  }

  private updateState(changes: PressEventState[]) {
    // remove last states;
    const states = Array.from(this.state.values()).filter(x => x.type === 'release');
    const trackedChanges = changes.filter(x => x.type !== 'release');
    changes.filter(x => x.type === 'release').forEach(x => this.state.delete(x.id));
    states.push(...trackedChanges);
    trackedChanges.forEach(evt => this.state.set(evt.id, evt));
    this.pressEventsChangeSubject.next({ changes, states });
  }

  private updateTouchState(evt: TouchEvent, type: PressStateType) {
    const validEvents = Array.from(evt.changedTouches)
      .filter(x => type === 'press' || this.state.has(x.identifier))
      .map(x => ({ clientX: x.clientX, clientY: x.clientY, id: x.identifier, type } as PressEventState));
    if (validEvents.length) {
      cancelEvent(evt);
      this.updateState(validEvents);
    }
  }
}
