import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { RbacComponent } from './rbac.component';

describe('RbacComponent', () => {
  let component: RbacComponent;
  let fixture: ComponentFixture<RbacComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ RbacComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RbacComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
