import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import * as XLSX from 'xlsx';
import { UserData } from '../../interfaces/user.interface';

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatProgressSpinnerModule, MatIconModule],
  templateUrl: './file-upload.component.html',
  styleUrl: './file-upload.component.scss'
})
export class FileUploadComponent {
  @Input() loading: boolean = false;
  @Input() processingNotes: boolean = false;
  @Input() usersWithNotes: UserData[] = [];
  @Input() totalUsersLoaded: number = 0;
  @Input() totalUsersFailed: number = 0;
  @Input() failedUserIds: string[] = [];
  
  @Output() usersLoaded = new EventEmitter<string[]>();
  @Output() cancel = new EventEmitter<void>();
  @Output() loadingChange = new EventEmitter<boolean>();
  @Output() resetJob = new EventEmitter<void>();

  fileName: string = '';
  parseError: string = '';
  userIds: string[] = [];
  showPreview: boolean = false;
  usersHaveBeenLoaded: boolean = false;

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];
    this.fileName = file.name;
    this.parseError = '';
    this.userIds = [];
    this.showPreview = false;

    // Validate file type
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!validExtensions.includes(fileExtension)) {
      this.parseError = 'Please upload an Excel file (.xlsx, .xls, or .csv)';
      return;
    }

    // Read the file
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get the first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        if (jsonData.length === 0) {
          this.parseError = 'The file is empty';
          return;
        }

        // Find the PRIMARYIDENTIFIER column
        const headers = jsonData[0] as string[];
        const primaryIdIndex = headers.findIndex(h => 
          h && h.toString().toUpperCase().trim() === 'PRIMARYIDENTIFIER'
        );

        if (primaryIdIndex === -1) {
          this.parseError = 'No "PRIMARYIDENTIFIER" column found in the file. Please ensure your file has a column with this exact header name.';
          return;
        }

        // Extract user IDs (skip header row)
        this.userIds = [];
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          const userId = row[primaryIdIndex];
          if (userId && userId.toString().trim() !== '') {
            this.userIds.push(userId.toString().trim());
          }
        }

        if (this.userIds.length === 0) {
          this.parseError = 'No user IDs found in the PRIMARYIDENTIFIER column';
          return;
        }

        // Show preview
        this.showPreview = true;
        
      } catch (error: any) {
        this.parseError = 'Error parsing file: ' + (error.message || 'Unknown error');
        console.error('File parsing error:', error);
      }
    };

    reader.onerror = () => {
      this.parseError = 'Error reading file';
    };

    reader.readAsArrayBuffer(file);
  }

  onConfirmLoad() {
    if (this.userIds.length > 0) {
      this.usersHaveBeenLoaded = true;
      this.usersLoaded.emit(this.userIds);
    }
  }

  onCancel() {
    this.cancel.emit();
  }

  triggerFileInput() {
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  clearFile() {
    this.fileName = '';
    this.parseError = '';
    this.userIds = [];
    this.showPreview = false;
    this.usersHaveBeenLoaded = false;
    // Reset file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
    // Notify parent to reset job state
    this.resetJob.emit();
  }

  get previewUserIds(): string[] {
    return this.userIds.slice(0, 10);
  }

  get hasMoreUsers(): boolean {
    return this.userIds.length > 10;
  }
}
