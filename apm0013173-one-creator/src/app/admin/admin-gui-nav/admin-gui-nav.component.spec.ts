import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminGuiNavComponent } from './admin-gui-nav.component';

describe('AdminGuiNavComponent', () => {
  let component: AdminGuiNavComponent;
  let fixture: ComponentFixture<AdminGuiNavComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AdminGuiNavComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminGuiNavComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
