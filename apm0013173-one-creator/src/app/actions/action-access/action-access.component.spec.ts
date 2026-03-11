import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ActionAccessComponent } from './action-access.component';

describe('ActionAccessComponent', () => {
  let component: ActionAccessComponent;
  let fixture: ComponentFixture<ActionAccessComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ActionAccessComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ActionAccessComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
