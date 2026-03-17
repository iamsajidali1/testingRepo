import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TdcPanelComponent } from './tdc-panel.component';

describe('TdcPanelComponent', () => {
  let component: TdcPanelComponent;
  let fixture: ComponentFixture<TdcPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TdcPanelComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TdcPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
