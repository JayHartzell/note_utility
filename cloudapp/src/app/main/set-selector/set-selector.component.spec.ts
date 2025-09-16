import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SetSelectorComponent } from './set-selector.component';

describe('SetSelectorComponent', () => {
  let component: SetSelectorComponent;
  let fixture: ComponentFixture<SetSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SetSelectorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SetSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
