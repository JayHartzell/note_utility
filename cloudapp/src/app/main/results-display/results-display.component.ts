import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { UserProcessLog } from '../../interfaces/note.interface';
import { UserData } from '../../interfaces/user.interface';

@Component({
  selector: 'app-results-display',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule],
  templateUrl: './results-display.component.html',
  styleUrl: './results-display.component.scss'
})
export class ResultsDisplayComponent {
  @Input() showResults: boolean = false;
  @Input() jobExecuted: boolean = false;
  @Input() processLogs: UserProcessLog[] = [];
  @Input() modifiedUserCount: number = 0;
  @Input() totalUsersProcessed: number = 0;
  @Input() usersWithNotesLink: UserData[] = [];
  @Input() usersWithoutNotesLink: UserData[] = [];
  @Input() jobStartTime: Date | null = null;
  @Input() jobEndTime: Date | null = null;
  @Input() jobConfiguration: any = null;

  @Output() exportToCsv = new EventEmitter<void>();
  @Output() viewUserInAlma = new EventEmitter<string>();

  get processLogsWithChanges() {
    return this.processLogs.filter(log => this.wasUserModified(log));
  }

  getJobSummary(): { successfulUpdates: number; totalErrors: number; errorDetails: Array<{userId: string, error: string}> } {
    const successfulUpdates = this.processLogs.filter(log => log.updateSuccessful).length;
    const errorDetails = this.processLogs
      .filter(log => log.updateError)
      .map(log => ({ userId: log.userId, error: log.updateError! }));
    const totalErrors = errorDetails.length;
    return { successfulUpdates, totalErrors, errorDetails };
  }

  getUserSummary(log: UserProcessLog): { action: 'deleted' | 'modified'; noteCount: number; modifications: string[] } {
    const noteCount = log.notes.length;
    let action: 'deleted' | 'modified' = 'modified';
    if (log.notes.every(n => n.deleted)) {
      action = 'deleted';
    }

    const modifications = new Set<string>();
    log.notes.forEach(noteLog => {
      if (noteLog.after) {
        if (noteLog.before.note_text !== noteLog.after.note_text) modifications.add('Text');
        if (noteLog.before.popup_note !== noteLog.after.popup_note) modifications.add('Popup');
        if (noteLog.before.user_viewable !== noteLog.after.user_viewable) modifications.add('User Viewable');
        if (noteLog.before.note_type?.value !== noteLog.after.note_type?.value) modifications.add('Type');
      }
    });

    return { action, noteCount, modifications: Array.from(modifications) };
  }

  wasUserModified(log: UserProcessLog): boolean {
    return log.notes.some(noteLog => noteLog.after && (
      noteLog.before.note_text !== noteLog.after.note_text ||
      noteLog.before.popup_note !== noteLog.after.popup_note ||
      noteLog.before.user_viewable !== noteLog.after.user_viewable ||
      noteLog.before.note_type?.value !== noteLog.after.note_type?.value
    ));
  }

  exportResultsToCsv() {
    this.exportToCsv.emit();
  }

  viewUser(userId: string) {
    this.viewUserInAlma.emit(userId);
  }
}
