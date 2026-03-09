import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CssPanelComponent } from './css-panel.component';

describe('CssPanelComponent', () => {
  let component: CssPanelComponent;
  let fixture: ComponentFixture<CssPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CssPanelComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CssPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
