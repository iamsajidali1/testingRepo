import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PostValidationComponent } from './post-validation.component';

describe('PostValidationComponent', () => {
  let component: PostValidationComponent;
  let fixture: ComponentFixture<PostValidationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PostValidationComponent]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PostValidationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
