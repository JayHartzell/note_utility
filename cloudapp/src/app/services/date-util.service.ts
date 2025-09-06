import { UserNote } from '../interfaces/user.interface';

/**
 * Date/time formatting utilities. 
 */
export class DateUtilService {
  /**
   * Format a note's creation date in a locale-aware way, aligning date-only
   * values to local midnight. Falls back on invalid inputs.
   */
  static formatNoteDate(note: UserNote, locale: string): string {
    const dateField = (note as any).created_date;
    if (!dateField) return 'Unknown';

    // Use local midnight for date-only inputs (YYYY-MM-DD)
  const onlyDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateField));

    let dateObj: Date;
    if (onlyDate) {
      const y = Number(onlyDate[1]);
      const m = Number(onlyDate[2]) - 1;
      const d = Number(onlyDate[3]);
      dateObj = new Date(y, m, d, 0, 0, 0, 0);
    } else {
      dateObj = new Date(dateField);
    }

    const ms = dateObj.getTime();
    if (isNaN(ms)) return String(dateField);

    try {
      return new Intl.DateTimeFormat(locale || 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(dateObj);
    } catch {
      return dateObj.toLocaleDateString();
    }
  }
}
