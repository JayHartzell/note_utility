import { Injectable } from '@angular/core';
import { UserData, UserNote } from '../interfaces/user.interface';
import { NoteSearchCriteria, NoteModificationOptions, UserProcessLog, NoteLogEntry } from '../interfaces/note.interface';

@Injectable({
  providedIn: 'root'
})
export class NoteProcessingService {

  /**
   * Find notes that match the search criteria
   * @param user The user whose notes to search
   * @param criteria The search criteria
   */
  findMatchingNotes(user: UserData, criteria: NoteSearchCriteria): UserNote[] {
    if (!user || !Array.isArray(user.user_note)) {
      return [];
    }
    
    // Return empty array if no search text is provided
    if (!criteria.searchText || criteria.searchText.trim() === '') {
      return [];
    }
    
    // Start with all notes
    let matchingNotes: UserNote[] = [...user.user_note];
    
    // Filter by text (now we know search text exists)
    matchingNotes = matchingNotes.filter((note: UserNote) => {
      if (!note.note_text) return false;
      
      const noteText = criteria.caseSensitive ? note.note_text : note.note_text.toLowerCase();
      const searchText = criteria.caseSensitive ? criteria.searchText : criteria.searchText.toLowerCase();
      return noteText.includes(searchText);
    });
    
    // Additionally filter by date if enabled
    if (criteria.searchByDate && (criteria.startDate || criteria.endDate)) {
      const startTimestamp = criteria.startDate ? new Date(criteria.startDate).getTime() : 0;
      const endTimestamp = criteria.endDate ? new Date(criteria.endDate + 'T23:59:59').getTime() : Infinity;
      
      matchingNotes = matchingNotes.filter((note: UserNote) => {
        if (!note.creation_date && !note.created_date && !note.note_date) {
          return false; // Skip notes without dates
        }
        
        const dateString = note.creation_date || note.created_date || note.note_date;
        const noteDate = dateString ? new Date(dateString).getTime() : 0;
        return noteDate >= startTimestamp && noteDate <= endTimestamp;
      });
    }
    
    return matchingNotes;
  }

  /**
   * Process note modifications for a user
   * @param user The user whose notes to process
   * @param matchingNotes The notes that match the search criteria
   * @param options The modification options
   */
  processNoteModifications(user: UserData, matchingNotes: UserNote[], options: NoteModificationOptions): UserProcessLog {
    const userLog: UserProcessLog = {
      userId: user.primary_id,
      noMatchingNotes: matchingNotes.length === 0,
      notes: []
    };

    if (matchingNotes.length === 0) {
      return userLog;
    }

    // Apply the requested action
    if (options.action === 'delete' && options.deleteMatchingNotes) {
      this.processNoteDeletion(user, matchingNotes, userLog);
    } else if (options.action === 'modify') {
      this.processNoteModification(user, matchingNotes, options, userLog);
    }

    return userLog;
  }

  /**
   * Process note deletion
   * @param user The user whose notes to delete
   * @param matchingNotes The notes to delete
   * @param userLog The log entry to update
   */
  private processNoteDeletion(user: UserData, matchingNotes: UserNote[], userLog: UserProcessLog): void {
    const notesToDelete = new Set(matchingNotes);
    
    // Log the deletion
    matchingNotes.forEach(note => {
      userLog.notes.push({
        before: {...note},
        deleted: true
      });
    });
    
    user.user_note = user.user_note.filter((note: UserNote) => !notesToDelete.has(note));
  }

  /**
   * Process note modification
   * @param user The user whose notes to modify
   * @param matchingNotes The notes to modify
   * @param options The modification options
   * @param userLog The log entry to update
   */
  private processNoteModification(user: UserData, matchingNotes: UserNote[], options: NoteModificationOptions, userLog: UserProcessLog): void {
    const notesToModify = new Set(matchingNotes);
    
    user.user_note.forEach((note: UserNote) => {
      if (notesToModify.has(note)) {
        // Create a copy of the note before modifications for logging
        const noteBefore = {...note};
        let noteChanged = false;
        
        // Only modify notes that match our criteria
        if (options.makePopup && !note.popup_note) {
          note.popup_note = true;
          noteChanged = true;
        }
        if (options.disablePopup && note.popup_note) {
          note.popup_note = false;
          noteChanged = true;
        }
        if (options.noteType && (!note.note_type || note.note_type.value !== options.noteType)) {
          note.note_type = { value: options.noteType, desc: options.noteType };
          noteChanged = true;
        }
        
        // If note was changed, add to log
        if (noteChanged) {
          userLog.notes.push({
            before: noteBefore,
            after: {...note},
            deleted: false
          });
        }
      }
    });
  }

  /**
   * Check if a user was modified based on the log
   * @param userLog The user process log
   */
  wasUserModified(userLog: UserProcessLog): boolean {
    return userLog.notes.length > 0;
  }
}
