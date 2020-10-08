import { AfterViewInit, Directive, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, tap } from 'rxjs/operators';
import { PressEventsChange, PressEventsElementListener, PressEventsMonitorType } from './models';
import { PressEventsService } from './press-events.service';


/** Wraps PressEventsListener so that mouse and touch events are tracked on an element. */
@Directive({
  selector: '[appPressEvents]'
})
export class PressEventsDirective implements AfterViewInit, OnDestroy, OnChanges {
  private destroySubject = new Subject();
  private pressEventsListener?: PressEventsElementListener;

  @Input('appPressEvents')
  type: PressEventsMonitorType = 'all';

  @Output()
  readonly pressEventsChange = new EventEmitter<PressEventsChange>();

  constructor(private el: ElementRef, private pressEventsSvc: PressEventsService) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.type) {
      this.initEventsListener();
    }
  }

  ngAfterViewInit() {
    this.initEventsListener();
  }

  ngOnDestroy() {
    this.pressEventsListener?.destroy();
    this.destroySubject.next();
  }

  private initEventsListener() {
    if (this.pressEventsListener) {
      this.pressEventsListener.destroy();
    }
    this.pressEventsListener = this.pressEventsSvc.createEventsListener(this.el, this.type);
    this.pressEventsListener.pressEventsChange$.pipe(
      takeUntil(this.destroySubject),
      tap(x => this.pressEventsChange.emit(x))
    ).subscribe();
  }
}
