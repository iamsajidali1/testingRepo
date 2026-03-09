import { TestBed } from '@angular/core/testing';

import { BingmapService } from './bingmap.service';

describe('BingmapService', () => {
  let service: BingmapService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BingmapService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
