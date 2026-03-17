import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BingmapComponent } from './bingmap.component';

describe('BingmapComponent', () => {
  let component: BingmapComponent;
  let fixture: ComponentFixture<BingmapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BingmapComponent]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BingmapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
