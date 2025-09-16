import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatRadioModule } from '@angular/material/radio';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { JobParameter, NoteType } from '../../interfaces/note.interface';

@Component({
  selector: 'app-job-parameters',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatSelectModule,
    MatDatepickerModule,
    MatRadioModule,
    MatProgressBarModule
  ],
  templateUrl: './job-parameters.component.html',
  styleUrl: './job-parameters.component.scss'
})
export class JobParametersComponent {
  @Input() jobParameters: JobParameter[] = [];
  @Input() availableNoteTypes: NoteType[] = [];
  @Input() jobExecuted: boolean = false;
  @Input() processingNotes: boolean = false;
  @Input() loading: boolean = false;
  @Input() percentComplete: number = 0;
  @Input() processed: number = 0;
  @Input() recordsToProcess: number = 0;
  @Input() canExecuteJob: boolean = false;
  @Input() hasActionParameter: boolean = false;
  @Input() hasSearchParameter: boolean = false;
  @Input() needsModificationOptions: boolean = false;

  @Output() executeJob = new EventEmitter<void>();
  @Output() removeJobParameter = new EventEmitter<string>();
  @Output() updateJobParameter = new EventEmitter<{id: string, value: any}>();
  @Output() resetJob = new EventEmitter<void>();

  get action() {
    return this.jobParameters.find(p => p.type === 'action');
  }

  get hasAction() {
    return this.jobParameters.some(p => p.type === 'action');
  }

  get hasSearch() {
    return this.jobParameters.some(p => p.type === 'search');
  }

  get missingModification() {
    if (this.action?.value === 'modify') {
      return !this.jobParameters.some(p => p.type === 'modification');
    }
    return false;
  }

  getNoteType(value: string): NoteType | undefined {
    return this.availableNoteTypes.find(nt => nt.value === value);
  }

  get actionParam() {
    return this.jobParameters.find(p => p.type === 'action');
  }

  get textSearchParam() {
    return this.jobParameters.find(p => p.id === 'textSearch');
  }

  get dateRangeParam() {
    return this.jobParameters.find(p => p.id === 'dateRange');
  }

  get popupParam() {
    return this.jobParameters.find(p => p.id === 'popupSettings');
  }

  get userViewableParam() {
    return this.jobParameters.find(p => p.id === 'userViewable');
  }

  get noteTypeParam() {
    return this.jobParameters.find(p => p.id === 'noteType');
  }

  getNoteTypeByValue(value: string): NoteType | undefined {
    return this.availableNoteTypes.find(nt => nt.value === value);
  }
}

