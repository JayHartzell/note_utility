// Define an interface for the note structure
export interface UserNote {
  // Mandatory fields
  note_text: string;  // Mandatory - The note's text (string2000Length)
  note_type: { value: string; desc: string };  // Mandatory - The note's type
  
  // Optional fields with defaults
  user_viewable?: boolean;  // Default is false - Indication whether the user is able to view the note
  popup_note?: boolean;     // Default is false - Indication whether the note supposed to popup while entering patron services
  
  // System-generated fields
  created_by?: string;      // Creator of the note (string255Length)
  created_date?: string;    // Creation date of the note (dateTime)
  note_owner?: string;      // Library owner of the note (library code)
  
  // Catch-all for any other API properties
  [key: string]: any;
}

// Define an interface for the user structure
export interface UserData {
  primary_id: string;
  user_note: UserNote[];
  error?: string;
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
