import { Injectable } from '@angular/core';
import { Entity } from '@exlibris/exl-cloudapp-angular-lib';
import { UserProcessLog } from '../interfaces/note.interface';

@Injectable({ providedIn: 'root' })
export class CsvExportService {
  /**
   * Public entry point: build CSV from logs + metadata and trigger file download.
   */
  exportProcessingResults(
    processLogs: UserProcessLog[],
    options: {
      jobStartTime?: Date | null;
      jobEndTime?: Date | null;
      jobConfiguration?: any;
      selectedSet?: Entity | null;
    } = {}
  ): void {
    if (!processLogs || processLogs.length === 0) return;

    const { jobStartTime, jobEndTime, jobConfiguration, selectedSet } = options;
    const csvData = this.generateCSVData(processLogs, jobStartTime ?? null, jobEndTime ?? null, jobConfiguration ?? {});
    const csvContent = this.convertToCSV(csvData);
    const fileName = this.generateFileName(selectedSet || null);
    this.downloadCSV(csvContent, fileName);
  }

  /** Build structured rows for CSV, including a job info header row and detailed note entries. */
  private generateCSVData(
    processLogs: UserProcessLog[],
    jobStartTime: Date | null,
    jobEndTime: Date | null,
    jobConfiguration: any
  ): any[] {
    const csvRows: any[] = [];

    // Job info header row
    csvRows.push({
      type: 'JOB_INFO',
      userId: '',
      noteAction: '',
      noteText: '',
      beforePopup: '',
      afterPopup: '',
      beforeUserViewable: '',
      afterUserViewable: '',
      beforeType: '',
      afterType: '',
      created_date: '',
      created_by: '',
      updateSuccessful: '',
      updateError: '',
      jobStartTime: jobStartTime ? jobStartTime.toISOString() : '',
      jobEndTime: jobEndTime ? jobEndTime.toISOString() : '',
      totalUsersProcessed: String(processLogs.length),
      usersWithChanges: String(this.getUsersWithChanges(processLogs).length),
      jobConfiguration: JSON.stringify(jobConfiguration || {})
    });

    // Detailed rows
    processLogs.forEach(log => {
      if (log.noMatchingNotes) {
        csvRows.push({
          type: 'NO_MATCHES',
          userId: log.userId,
          noteAction: 'No matching notes found',
          noteText: '',
          beforePopup: '',
          afterPopup: '',
          beforeUserViewable: '',
          afterUserViewable: '',
          beforeType: '',
          afterType: '',
          created_date: '',
          created_by: '',
          updateSuccessful: log.updateSuccessful ? 'Yes' : 'No',
          updateError: log.updateError || '',
          jobStartTime: '',
          jobEndTime: '',
          totalUsersProcessed: '',
          usersWithChanges: '',
          jobConfiguration: ''
        });
      } else {
        log.notes.forEach(entry => {
          csvRows.push({
            type: entry.deleted ? 'NOTE_DELETED' : 'NOTE_MODIFIED',
            userId: log.userId,
            noteAction: entry.deleted ? 'Deleted' : 'Modified',
            noteText: entry.before.note_text || '',
            beforePopup: entry.before.popup_note ? 'Yes' : 'No',
            afterPopup: entry.deleted ? '' : (entry.after?.popup_note ? 'Yes' : 'No'),
            beforeUserViewable: (entry.before as any)['user_viewable'] ? 'Yes' : 'No',
            afterUserViewable: entry.deleted ? '' : ((entry.after && (entry.after as any)['user_viewable']) ? 'Yes' : 'No'),
            beforeType: entry.before.note_type?.desc || '',
            afterType: entry.deleted ? '' : (entry.after?.note_type?.desc || ''),
            created_date: entry.before.created_date || '',
            created_by: entry.before.created_by || '',
            updateSuccessful: log.updateSuccessful ? 'Yes' : 'No',
            updateError: log.updateError || '',
            jobStartTime: '',
            jobEndTime: '',
            totalUsersProcessed: '',
            usersWithChanges: '',
            jobConfiguration: ''
          });
        });
      }
    });

    return csvRows;
  }

  private getUsersWithChanges(processLogs: UserProcessLog[]): UserProcessLog[] {
    return processLogs.filter(log => !log.noMatchingNotes && log.notes.length > 0);
  }

  /** Convert array of objects to CSV string with first row keys as headers. */
  private convertToCSV(data: any[]): string {
    if (!data || data.length === 0) return '';
    const headers = Object.keys(data[0]);
    const csvLines = [headers.join(',')];

    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header] ?? '';
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return '"' + value.replace(/"/g, '""') + '"';
        }
        return value;
      });
      csvLines.push(values.join(','));
    });

    return csvLines.join('\n');
  }

  /** Trigger browser download of the CSV content. */
  private downloadCSV(csvContent: string, fileName: string) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }

  /** Generate a filename including set id and current date. */
  private generateFileName(selectedSet: Entity | null): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const setId = selectedSet?.id || 'unknown-set';
    return `note-processing-results-${setId}-${timestamp}.csv`;
  }
}
