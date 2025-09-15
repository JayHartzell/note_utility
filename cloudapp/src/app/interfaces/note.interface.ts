import { UserNote } from './user.interface';

// Define interface for note types
export interface NoteType {
  value: string;
  desc: string;
}

// Define available note types
export const NOTE_TYPES: NoteType[] = [
  { value: 'LIBRARY', desc: 'Library' },
  { value: 'ADDRESS', desc: 'Address' },
  { value: 'ERP', desc: 'ERP' },
  { value: 'POPUP', desc: 'General' },
  { value: 'CIRCULATION', desc: 'Circulation' },
  { value: 'BARCODE', desc: 'Barcode' },
  { value: 'REGISTAR', desc: 'Registrar' },
  { value: 'OTHER', desc: 'Other' }
];

// Define interfaces for note search and processing
export interface NoteSearchCriteria {
  searchText: string;
  caseSensitive: boolean;
  searchByDate: boolean;
  startDate?: string;
  endDate?: string;
  // Text matching enhancements
  matchMode?: 'substring' | 'wholeWord' | 'exact';
  ignoreAccents?: boolean;
  locale?: string;
  // Segment filtering
  segmentType?: 'Internal' | 'External';
}

export interface NoteModificationOptions {
  action: 'modify' | 'delete';
  makePopup?: boolean;
  disablePopup?: boolean;
  noteType?: NoteType;
  deleteMatchingNotes?: boolean;
  makeUserViewable?: boolean;
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
export type JobParameter =
  | {
      id: 'action';
      type: 'action';
      label: string;
      value: 'modify' | 'delete';
      editable: boolean;
    }
  | {
      id: 'textSearch';
      type: 'search';
      label: 'Text Search' | string;
  value: { text: string; caseSensitive: boolean; matchMode?: 'substring' | 'wholeWord' | 'exact'; ignoreAccents?: boolean };
      editable: boolean;
    }
  | {
      id: 'dateRange';
      type: 'dateRange';
      label: 'Date Range' | string;
      value: { startDate: string; endDate: string };
      editable: boolean;
    }
  | {
      id: 'popupSettings';
      type: 'modification';
      label: 'Popup Settings' | string;
      value: { makePopup: boolean; disablePopup: boolean };
      editable: boolean;
    }
  | {
      id: 'userViewable';
      type: 'modification';
      label: 'User Viewable' | string;
      value: { makeUserViewable?: boolean | undefined };
      editable: boolean;
    }
  | {
      id: 'noteType';
      type: 'modification';
      label: 'Note Type' | string;
      value: NoteType | null;
      editable: boolean;
    };

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
