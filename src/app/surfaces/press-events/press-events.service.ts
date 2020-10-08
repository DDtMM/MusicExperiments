import { ElementRef, Injectable, OnDestroy, OnInit, Renderer2, RendererFactory2 } from '@angular/core';
import { defer, Subject } from 'rxjs';
import { finalize, shareReplay } from 'rxjs/operators';
import { mouseId, PressEventsElementListener, PressEventsMonitorType, PressEventState } from './models';

/** listens to mouse events so that repeated listeners aren't added. */
@Injectable({
  providedIn: 'root'
})
export class PressEventsService  {
  private readonly eventSubject = new Subject<PressEventState>();
  private renderer?: Renderer2;
  private readonly unlisteners: (() => void)[] = [];

  // returns mouse up and mouse move events.
  readonly event$ = defer(() => {
    this.init();
    return this.eventSubject;
  }).pipe(
    finalize(() => this.stop()),
    shareReplay(1)
  );

  constructor(private rendererFactory: RendererFactory2) {

  }

  createEventsListener(el: ElementRef, type: PressEventsMonitorType) {
    this.ensureRenderer();
    return new PressEventsElementListener(el.nativeElement, this.renderer, this, type);
  }

  private ensureRenderer() {
    if (!this.renderer) {
      this.renderer = this.rendererFactory.createRenderer(null, null);
    }
  }
  /** Starts listeners. */
  private init() {
    this.stop();
    this.unlisteners.length = 0;
    this.ensureRenderer();
    this.unlisteners.push(
      this.renderer.listen('window', 'mousemove', (evt: MouseEvent) =>
        this.eventSubject.next({ clientX: evt.clientX, clientY: evt.clientY, id: mouseId, type: 'move' })
      ),
      this.renderer.listen('window', 'mouseup', (evt: MouseEvent) =>
        this.eventSubject.next({ clientX: evt.clientX, clientY: evt.clientY, id: mouseId, type: 'release' })
      )
    );
  }

  /** Stops listeners. */
  private stop() {
    this.renderer?.destroy();
    this.unlisteners.forEach(x => x());
  }
}
