import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TableMonitorComponent } from './table-monitor.component';

describe('TableMonitorComponent', () => {
  let component: TableMonitorComponent;
  let fixture: ComponentFixture<TableMonitorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TableMonitorComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TableMonitorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
