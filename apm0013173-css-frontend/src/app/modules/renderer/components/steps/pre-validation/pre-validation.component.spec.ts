import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PreValidationComponent } from './pre-validation.component';

describe('PreValidationComponent', () => {
  let component: PreValidationComponent;
  let fixture: ComponentFixture<PreValidationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PreValidationComponent]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PreValidationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
