import { TestBed } from '@angular/core/testing';

import { PressEventsService } from './press-events.service';

describe('PressEventsService', () => {
  let service: PressEventsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PressEventsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
