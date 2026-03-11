import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SettingsGuiComponent } from './settings-gui.component';

describe('SettingsGuiComponent', () => {
  let component: SettingsGuiComponent;
  let fixture: ComponentFixture<SettingsGuiComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SettingsGuiComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SettingsGuiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
