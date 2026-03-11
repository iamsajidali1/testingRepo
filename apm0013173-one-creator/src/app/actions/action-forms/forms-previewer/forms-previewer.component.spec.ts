import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { FormsPreviewerComponent } from './forms-previewer.component';

describe('FormsPreviewerComponent', () => {
  let component: FormsPreviewerComponent;
  let fixture: ComponentFixture<FormsPreviewerComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ FormsPreviewerComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FormsPreviewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
