import { UserNote } from './user.interface';

// Define interfaces for note search and processing
export interface NoteSearchCriteria {
  searchText: string;
  caseSensitive: boolean;
  searchByDate: boolean;
  startDate?: string;
  endDate?: string;
}

export interface NoteModificationOptions {
  action: 'modify' | 'delete';
  makePopup?: boolean;
  disablePopup?: boolean;
  noteType?: string;
  deleteMatchingNotes?: boolean;
}

// Define interfaces for the log entries
export interface NoteLogEntry {
  before: UserNote;
  after?: UserNote;
  deleted: boolean;
}

export interface UserProcessLog {
  userId: string;
  noMatchingNotes: boolean;
  notes: NoteLogEntry[];
}

// Define interface for set information
export interface SetInfo {
  content?: {
    value: string;
    desc: string;
  };
  [key: string]: any;
}
