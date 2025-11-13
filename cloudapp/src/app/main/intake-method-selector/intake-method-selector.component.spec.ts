import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IntakeMethodSelectorComponent } from './intake-method-selector.component';

describe('IntakeMethodSelectorComponent', () => {
  let component: IntakeMethodSelectorComponent;
  let fixture: ComponentFixture<IntakeMethodSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IntakeMethodSelectorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IntakeMethodSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
