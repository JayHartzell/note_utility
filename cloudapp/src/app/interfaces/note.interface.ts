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

// Define interfaces for the new menu-based job parameters
export interface JobParameter {
  id: string;
  type: 'action' | 'search' | 'modification' | 'dateRange';
  label: string;
  value: any;
  editable: boolean;
}

export interface MenuOption {
  id: string;
  category: 'action' | 'search' | 'modification';
  label: string;
  description: string;
  available: boolean;
}

export interface SearchCriteria {
  textSearch?: {
    text: string;
    caseSensitive: boolean;
  };
  dateRange?: {
    startDate: string;
    endDate: string;
  };
}
