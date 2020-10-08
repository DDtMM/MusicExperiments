import { AfterViewInit, OnDestroy } from '@angular/core';
import { Directive, ElementRef, EventEmitter, HostBinding, HostListener, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Subject } from 'rxjs';
import { filter, map, takeUntil, tap } from 'rxjs/operators';
import { getAngle, getNormalizedAngle, getNormalizedPosition, Point2d } from './geometry';
import { PressEventsElementListener } from './press-events/models';
import { PressEventsService } from './press-events/press-events.service';


export interface KnobDirectiveOptions {
  /** Max rads.  Max - Min < 2PI */
  maxAngle?: number;
  /** Max angle in degrees.  Because it's easier for humans to think in degrees. */
  maxAngleDeg?: number;
  maxValue?: number;
  /** Min rads.  Max - Min < 2PI */
  minAngle?: number;
  /** Max angle in degrees.  Because it's easier for humans to think in degrees. */
  minAngleDeg?: number;
  minValue?: number;
}

/**
 * KnobDirective makes any svg element its applied to a rotating knob by adjusting the transform.
 * Assumes the rotation should occur along the center.
 */
@Directive({
  selector: '[appKnob]'
})
export class KnobDirective implements AfterViewInit, OnChanges, OnDestroy {
  private currentAngle = 0;
  private destroyedSubject = new Subject();
  private maxAngle = Math.PI * .99999;
  private maxValue = 1;
  private minAngle = Math.PI * -.99999;
  private minValue = 0;
  private pressEventsListener?: PressEventsElementListener;

  @Input('appKnob')
  options?: KnobDirectiveOptions;

  @HostBinding('attr.transform')
  transform = '';

  readonly valueChange = new EventEmitter<number>();

  constructor(private el: ElementRef, private pressEventsSvc: PressEventsService) {

  }

  ngAfterViewInit() {
    this.pressEventsListener = this.pressEventsSvc.createEventsListener(this.el, 'all');
    this.pressEventsListener.pressEventsChange$.pipe(
      takeUntil(this.destroyedSubject),
      map(x => x.changes.find(y => y.type !== 'release') || x.states[0]),
      filter(x => !!x),
      tap(x => {
        const angle = this.constrainAngle(this.pointToAngle([x.clientX, x.clientY]));
        this.setCurrentAngle(angle);
      })
    ).subscribe();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.options.currentValue) {
      this.onOptionsChange();
    }
  }

  ngOnDestroy() {
    this.pressEventsListener.destroy();
    this.destroyedSubject.next();
  }

  /** Constrains an angle within the valid range of maxAngle and minAngle. */
  private constrainAngle(angle: number) {
    let angleInRange = false;
    angle = getNormalizedAngle(angle);
    if (angle > this.maxAngle) {
      const altAngle = angle - Math.PI * 2;
      if (altAngle >= this.minAngle) {
        angleInRange = true;
        angle = altAngle;
      }
    }
    else if (angle >= this.minAngle) {
      angleInRange = true;
    }
    if (!angleInRange) {
      // find nearest end point;
      const absMinDiff = Math.abs(getNormalizedAngle(this.minAngle) - angle);
      const absMaxDiff = Math.abs(this.maxAngle - angle);
      angle = (absMinDiff < absMaxDiff) ? this.minAngle : this.maxAngle;
    }

    return angle;
  }

  private onOptionsChange() {
    const options = this.options || {};
    const { maxAngleDeg, maxValue, minAngleDeg, minValue } = options;
    const maxAngle = maxAngleDeg != null ? maxAngleDeg / (180 / Math.PI) : options.maxAngle;
    const minAngle = minAngleDeg != null ? minAngleDeg / (180 / Math.PI) : options.minAngle;

    if (maxAngle != null || minAngle != null) {
      if ((maxAngle == null && minAngle != null) || (maxAngle != null && minAngle == null)) {
        throw new Error('Both maxAngle and minAngle must be provided if either is provided.');
      }
      if (maxAngle <= minAngle) {
        throw new Error('MaxAngle must be greater than minAngle.');
      }
      if (maxAngle - minAngle >= Math.PI * 2) {
        throw new Error('MaxAngle + minAngle must be less than 2PI.');
      }
      this.maxAngle = getNormalizedAngle(maxAngle);
      this.minAngle = getNormalizedAngle(minAngle);
      if (maxAngle === minAngle) {
        throw new Error('Max Angle and minAngle must be different.');
      }
      if (this.minAngle > this.maxAngle) {
        this.minAngle = this.minAngle - Math.PI * 2;
      }
    }
    else {
      this.maxAngle = Math.PI * .99999;
      this.minAngle = Math.PI * -.99999;
    }
    if (maxValue != null || minValue != null) {
      if ((maxValue == null && minValue != null) || (maxValue != null && minValue == null)) {
        throw new Error('Both maxValue and minValue must be provided if either is provided.');
      }
      if (maxValue <= minValue) {
        throw new Error('MaxValue must be greater than minValue.');
      }
      this.maxValue = maxValue;
      this.minValue = minValue;
    }

    this.setCurrentAngle((this.maxAngle - this.minAngle) * .5 + this.minAngle);
  }

  /** updates the current angle and derrived settings. */
  private setCurrentAngle(angle: number) {
    if (angle !== this.currentAngle) {
      this.currentAngle = angle;
      const normalizedValue = 1 - (this.maxAngle - angle) / (this.maxAngle - this.minAngle);
      const actValue = (this.maxValue - this.minValue) * normalizedValue + this.minValue;
      this.updateTransform();
      this.valueChange.emit(actValue);
    }
  }

  private pointToAngle(pt: Point2d) {
    const rect = (this.el.nativeElement as Element).getBoundingClientRect();
    const pos = getNormalizedPosition(pt, rect);
    return getAngle([.5, .5], pos);
  }

  private updateTransform() {
    const bbBox = (this.el.nativeElement as SVGGraphicsElement).getBBox();
    const angle = (this.currentAngle *  180 / Math.PI).toFixed(0);
    this.transform =  `rotate(${angle} ${bbBox.width / 2} ${bbBox.height / 2})`;
  }
}
