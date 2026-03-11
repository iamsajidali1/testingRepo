import { TestBed, inject } from '@angular/core/testing';

import { NodeListService } from './node-list.service';

describe('NodeListService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NodeListService]
    });
  });

  it('should be created', inject([NodeListService], (service: NodeListService) => {
    expect(service).toBeTruthy();
  }));
});
