import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ActionPropertiesComponent } from './action-properties.component';

describe('ActionPropertiesComponent', () => {
  let component: ActionPropertiesComponent;
  let fixture: ComponentFixture<ActionPropertiesComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ActionPropertiesComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ActionPropertiesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
