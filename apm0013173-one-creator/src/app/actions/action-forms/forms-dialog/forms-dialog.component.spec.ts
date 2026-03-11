import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { FormsDialogComponent } from './forms-dialog.component';

describe('FormsDialogComponent', () => {
  let component: FormsDialogComponent;
  let fixture: ComponentFixture<FormsDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ FormsDialogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FormsDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
