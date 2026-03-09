import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NetworkInsightsComponent } from './network-insights.component';

describe('NetworkDashboardComponent', () => {
  let component: NetworkInsightsComponent;
  let fixture: ComponentFixture<NetworkInsightsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [NetworkInsightsComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(NetworkInsightsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
