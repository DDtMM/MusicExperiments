import { Directive, ElementRef, EventEmitter, HostBinding, HostListener, Input, OnChanges, SimpleChanges } from '@angular/core';
import { getAngle, getNormalizedAngle, getNormalizedPosition, Point2d } from './geometry';


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
export class KnobDirective implements OnChanges {
  private currentAngle = 0;
  private isMouseDown = false;
  private isTouchActive = false;
  private maxAngle = Math.PI * .99999;
  private maxValue = 1;
  private minAngle = Math.PI * -.99999;
  private minValue = 0;

  @Input('appKnob')
  options?: KnobDirectiveOptions;

  @HostBinding('attr.transform')
  transform = '';

  readonly valueChange = new EventEmitter<number>();

  @HostListener('mousedown', ['$event'])
  mouseDown(event: MouseEvent) {
    this.isMouseDown = true;
    this.updateClientTouch([event.clientX, event.clientY]);
  }

  @HostListener('window:mousemove', ['$event'])
  mouseMove(evt: MouseEvent) {
    if (this.isMouseDown) {
      this.updateClientTouch([evt.clientX, evt.clientY]);
    }
  }
  @HostListener('window:mouseup')
  mouseUp() {
    this.isMouseDown = false;
  }

  @HostListener('touchstart', ['$event'])
  touchStart(evt: TouchEvent) {
    this.isTouchActive = true;
    this.updateClientTouch([evt.changedTouches[0].clientX, evt.changedTouches[0].clientY]);
  }

  @HostListener('touchmove', ['$event'])
  touchMove(evt: TouchEvent) {
    if (this.isTouchActive) {
      this.updateClientTouch([evt.changedTouches[0].clientX, evt.changedTouches[0].clientY]);
    }
  }
  @HostListener('touchend')
  @HostListener('touchcancel')
  touchEnd() {
    this.isTouchActive = false;
  }

  constructor(private el: ElementRef) {

  }


  ngOnChanges(changes: SimpleChanges): void {
    if (changes.options.currentValue) {
      this.onOptionsChange();
    }
  }

  private onAngleChange(angle: number) {
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

    this.setCurrentAngle(angle);
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
  private setCurrentAngle(angle: number) {
    if (angle !== this.currentAngle) {
      this.currentAngle = angle;
      const normalizedValue = 1 - (this.maxAngle - angle) / (this.maxAngle - this.minAngle);
      const actValue = (this.maxValue - this.minValue) * normalizedValue + this.minValue;
      this.updateTransform();
      this.valueChange.emit(actValue);
    }
  }

  private updateClientTouch(pt: Point2d) {
    const rect = (this.el.nativeElement as Element).getBoundingClientRect();
    const pos = getNormalizedPosition(pt, rect);
    const angle = getAngle([.5, .5], pos);
    this.onAngleChange(angle);
  }

  private updateTransform() {
    const bbBox = (this.el.nativeElement as SVGGraphicsElement).getBBox();
    const angle = (this.currentAngle *  180 / Math.PI).toFixed(0);
    this.transform =  `rotate(${angle} ${bbBox.width / 2} ${bbBox.height / 2})`;
  }
}
