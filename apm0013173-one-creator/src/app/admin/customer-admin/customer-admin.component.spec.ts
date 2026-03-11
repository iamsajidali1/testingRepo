import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomerAdminComponent } from './customer-admin.component';

describe('CustomerAdminComponent', () => {
  let component: CustomerAdminComponent;
  let fixture: ComponentFixture<CustomerAdminComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CustomerAdminComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CustomerAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
