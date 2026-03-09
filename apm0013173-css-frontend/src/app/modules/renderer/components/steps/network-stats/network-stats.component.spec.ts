import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NetworkStatsComponent } from './network-stats.component';

describe('NetworkStatsComponent', () => {
  let component: NetworkStatsComponent;
  let fixture: ComponentFixture<NetworkStatsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NetworkStatsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NetworkStatsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
