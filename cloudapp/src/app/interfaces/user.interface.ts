// Define an interface for the note structure
export interface UserNote {
  note_text: string;
  popup_note?: boolean;
  note_type?: { value: string; desc: string };
  creation_date?: string;
  created_date?: string;
  note_date?: string;
  segment_text?: string;
  created_by?: string;
  [key: string]: any; // For any other properties that might exist
}

// Define an interface for the user structure
export interface UserData {
  primary_id: string;
  user_note: UserNote[];
  error?: string;
  
  // Add these explicit property definitions
  full_name?: string;
  first_name?: string;
  last_name?: string;
  status?: {value: string; desc: string};
  user_group?: {value: string; desc: string};
  account_type?: {value: string; desc: string};
  
  [key: string]: any; // For other user properties
}

// Define interface for set members
export interface SetMember {
  id: number;
  name: string;
  description: string;
  link: string;
}
