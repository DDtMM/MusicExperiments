import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InstrumentTesterComponent } from './instrument-tester.component';

describe('InstrumentTesterComponent', () => {
  let component: InstrumentTesterComponent;
  let fixture: ComponentFixture<InstrumentTesterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ InstrumentTesterComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(InstrumentTesterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
