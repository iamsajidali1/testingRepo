import { TestBed } from '@angular/core/testing';

import { StepGuard } from './step.guard';

describe('StepGuard', () => {
  let guard: StepGuard;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    guard = TestBed.inject(StepGuard);
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });
});
