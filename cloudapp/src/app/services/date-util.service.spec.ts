import { DateUtilService } from './date-util.service';
import { UserNote } from '../interfaces/user.interface';

describe('DateUtilService.formatNoteDate', () => {
  function noteWith(date: any): UserNote {
    return { note_text: '', created_date: date } as unknown as UserNote;
  }

  const opts: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };

  it('formats YYYY-MM-DD using local midnight across locales', () => {
    const d = new Date(2024, 0, 5, 0, 0, 0, 0); // local midnight Jan 5, 2024
    const locales = ['en-US', 'en-GB', 'fr-FR', 'de-DE', 'es-ES', 'ja-JP', 'ar-EG', 'hi-IN', 'zh-CN', 'ru-RU'];

    for (const locale of locales) {
      const expected = new Intl.DateTimeFormat(locale, opts).format(d);
      const formatted = DateUtilService.formatNoteDate(noteWith('2024-01-05'), locale);
      expect(formatted).toBe(expected);
    }
  });

  it('formats ISO datetime input according to local timezone (stable midday)', () => {
    // Midday UTC to avoid day rollover in any local TZ
    const iso = '2024-06-15T12:00:00Z';
    const date = new Date(iso);
    const locales = ['en-US', 'en-GB', 'fr-FR', 'de-DE', 'es-ES', 'ja-JP'];

    for (const locale of locales) {
      const expected = new Intl.DateTimeFormat(locale, opts).format(date);
      const formatted = DateUtilService.formatNoteDate(noteWith(iso), locale);
      expect(formatted).toBe(expected);
    }
  });

  it('handles DST edge dates without off-by-one (date-only local midnight)', () => {
    // Use known DST transition dates (US examples), but assertion is independent of timezone
    const dateOnlySamples = ['2024-03-10', '2024-11-03']; // spring forward, fall back (US)
    const locales = ['en-US', 'en-GB', 'de-DE'];

    for (const dateOnly of dateOnlySamples) {
      const [y, m, d] = dateOnly.split('-').map(n => Number(n));
      const localMidnight = new Date(y, m - 1, d, 0, 0, 0, 0);
      for (const locale of locales) {
        const expected = new Intl.DateTimeFormat(locale, opts).format(localMidnight);
        const formatted = DateUtilService.formatNoteDate(noteWith(dateOnly), locale);
        expect(formatted).toBe(expected);
      }
    }
  });

  it('returns original string for invalid date input', () => {
    const bad = 'not-a-date';
    const formatted = DateUtilService.formatNoteDate(noteWith(bad), 'en-US');
    expect(formatted).toBe(bad);
  });

  it('returns "Unknown" when date field is missing', () => {
    const note = { note_text: '' } as unknown as UserNote;
    const formatted = DateUtilService.formatNoteDate(note, 'en-US');
    expect(formatted).toBe('Unknown');
  });

  it('falls back gracefully for invalid locale', () => {
    const invalidLocale = 'xx-INVALID-LOCALE';
    const formatted = DateUtilService.formatNoteDate(noteWith('2024-01-05'), invalidLocale);
    expect(typeof formatted).toBe('string');
    expect(formatted.length).toBeGreaterThan(0);
  });
});
