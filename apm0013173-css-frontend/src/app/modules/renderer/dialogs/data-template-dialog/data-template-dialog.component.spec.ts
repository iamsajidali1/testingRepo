import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataTemplateDialogComponent } from './data-template-dialog.component';

describe('DataTemplateDialogComponent', () => {
  let component: DataTemplateDialogComponent;
  let fixture: ComponentFixture<DataTemplateDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DataTemplateDialogComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(DataTemplateDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
