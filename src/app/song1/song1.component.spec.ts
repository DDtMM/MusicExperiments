import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Song1Component } from './song1.component';

describe('Song1Component', () => {
  let component: Song1Component;
  let fixture: ComponentFixture<Song1Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ Song1Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(Song1Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
