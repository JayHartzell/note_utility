import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JobParametersComponent } from './job-parameters.component';

describe('JobParametersComponent', () => {
  let component: JobParametersComponent;
  let fixture: ComponentFixture<JobParametersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JobParametersComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(JobParametersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
