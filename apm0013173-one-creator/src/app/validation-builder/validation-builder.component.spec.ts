import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ValidationBuilderComponent } from './validation-builder.component';

describe('ValidationBuilderComponent', () => {
  let component: ValidationBuilderComponent;
  let fixture: ComponentFixture<ValidationBuilderComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ValidationBuilderComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ValidationBuilderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
