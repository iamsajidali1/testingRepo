import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ActionCommandsComponent } from './action-commands.component';

describe('ActionCommandsComponent', () => {
  let component: ActionCommandsComponent;
  let fixture: ComponentFixture<ActionCommandsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ActionCommandsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ActionCommandsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
