import { TestBed, inject } from '@angular/core/testing';

import { TabButtonServiceService } from './tab-button-service.service';

describe('TabButtonServiceService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TabButtonServiceService]
    });
  });

  it('should be created', inject([TabButtonServiceService], (service: TabButtonServiceService) => {
    expect(service).toBeTruthy();
  }));
});
