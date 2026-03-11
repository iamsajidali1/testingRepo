import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ServiceAdministrationComponent } from './service-administration.component';

describe('ServiceAdministrationComponent', () => {
  let component: ServiceAdministrationComponent;
  let fixture: ComponentFixture<ServiceAdministrationComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ServiceAdministrationComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ServiceAdministrationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
