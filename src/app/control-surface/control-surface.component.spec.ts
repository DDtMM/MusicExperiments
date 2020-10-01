import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ControlSurfaceComponent } from './control-surface.component';

describe('ControlSurfaceComponent', () => {
  let component: ControlSurfaceComponent;
  let fixture: ComponentFixture<ControlSurfaceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ControlSurfaceComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ControlSurfaceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
