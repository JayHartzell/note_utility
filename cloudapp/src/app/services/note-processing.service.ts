import { Injectable } from '@angular/core';
import { UserData, UserNote } from '../interfaces/user.interface';
import { NoteSearchCriteria, NoteModificationOptions, UserProcessLog, NoteLogEntry, NoteType, NOTE_TYPES } from '../interfaces/note.interface';

@Injectable({
  providedIn: 'root'
})
export class NoteProcessingService {
  /**
   * Parse a date-only string (YYYY-MM-DD) into a local timestamp at midnight.
   */
  private parseDateOnlyToLocalMs(dateStr: string): number | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
    if (!m) return null;
    const year = Number(m[1]);
    const month = Number(m[2]) - 1; // JS months 0-11
    const day = Number(m[3]);
    return new Date(year, month, day, 0, 0, 0, 0).getTime(); // local midnight
  }

  /**
   * Get inclusive LOCAL bounds (start and end) in ms for a criteria date which is YYYY-MM-DD.
   * Uses local start-of-day and end-of-day to align with user-visible dates.
   */
  private getLocalBoundsForDateOnly(dateStr: string): { startMs: number; endMs: number } | null {
    const startMs = this.parseDateOnlyToLocalMs(dateStr);
    if (startMs === null) return null;
    const start = new Date(startMs);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 23, 59, 59, 999);
    return { startMs, endMs: end.getTime() };
  }

  /**
   * Parse a note's date field into a timestamp in ms.
   */
  private parseNoteDateToMs(dateField: string): number | null {
    if (!dateField) return null;
    // If it's a date-only (YYYY-MM-DD), treat as LOCAL midnight
    const onlyLocal = this.parseDateOnlyToLocalMs(dateField);
    if (onlyLocal !== null) return onlyLocal;
    const dt = new Date(dateField);
    const ms = dt.getTime();
    return isNaN(ms) ? null : ms;
  }

  /**
   * Find notes that match the search criteria
   * @param user The user whose notes to search
   * @param criteria The search criteria
   */
  findMatchingNotes(user: UserData, criteria: NoteSearchCriteria): UserNote[] {
    if (!user || !Array.isArray(user.user_note)) {
      return [];
    }
    
    // Check if we have any search criteria at all
    const hasTextSearch = criteria.searchText && criteria.searchText.trim() !== '';
    const hasDateSearch = criteria.searchByDate && (criteria.startDate || criteria.endDate);
    
    if (!hasTextSearch && !hasDateSearch) {
      return []; // No search criteria provided
    }
    
    // Start with all notes
    let matchingNotes: UserNote[] = [...user.user_note];
    
    // Filter by text if text search is provided
    if (hasTextSearch) {
      matchingNotes = matchingNotes.filter((note: UserNote) => {
        if (!note.note_text) return false;
        
        const noteText = criteria.caseSensitive ? note.note_text : note.note_text.toLowerCase();
        const searchText = criteria.caseSensitive ? criteria.searchText : criteria.searchText.toLowerCase();
        return noteText.includes(searchText);
      });
    }
    
    // Additionally filter by date if enabled
    if (criteria.searchByDate && (criteria.startDate || criteria.endDate)) {
      // Pre-compute LOCAL bounds for criteria to avoid recomputing per note
      const startBounds = criteria.startDate ? this.getLocalBoundsForDateOnly(criteria.startDate) : null;
      const endBounds = criteria.endDate ? this.getLocalBoundsForDateOnly(criteria.endDate) : null;

      matchingNotes = matchingNotes.filter((note: UserNote) => {
        const dateField = note.created_date;
        if (!dateField) return false; 

        const noteMs = this.parseNoteDateToMs(dateField);
        if (noteMs === null) return false; // Skip invalid dates

        let matchesRange = true;
        if (startBounds) {
          matchesRange = matchesRange && (noteMs >= startBounds.startMs);
        }
        if (endBounds) {
          matchesRange = matchesRange && (noteMs <= endBounds.endMs);
        }
        return matchesRange;
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
        if (options.noteType && this.shouldUpdateNoteType(note, options.noteType)) {
          note.note_type = { value: options.noteType.value, desc: options.noteType.desc };
          noteChanged = true;
        }
        // Set user_viewable flag when requested
        if (typeof (options as any).makeUserViewable === 'boolean') {
          const desired = (options as any).makeUserViewable as boolean;
          if ((note as any).user_viewable !== desired) {
            (note as any).user_viewable = desired;
            noteChanged = true;
          }
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

  /**
   * Check if note type should be updated
   * @param note The note to check
   * @param newNoteType The new note type to apply
   */
  private shouldUpdateNoteType(note: UserNote, newNoteType: NoteType): boolean {
    // Update if note has no type, or if the current type value is different
    return !note.note_type || note.note_type.value !== newNoteType.value;
  }

  /**
   * Get all available note types
   * @returns Array of available note types
   */
  getAvailableNoteTypes(): NoteType[] {
    return [...NOTE_TYPES];
  }

  /**
   * Find a note type by its value
   * @param value The note type value to find
   * @returns The note type object or undefined if not found
   */
  getNoteTypeByValue(value: string): NoteType | undefined {
    return NOTE_TYPES.find(type => type.value === value);
  }
}
