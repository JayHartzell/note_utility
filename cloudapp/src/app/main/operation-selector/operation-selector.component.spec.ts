import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OperationSelectorComponent } from './operation-selector.component';

describe('OperationSelectorComponent', () => {
  let component: OperationSelectorComponent;
  let fixture: ComponentFixture<OperationSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OperationSelectorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OperationSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
