import { NoteProcessingService } from './note-processing.service';
import { NoteSearchCriteria } from '../../app/interfaces/note.interface';
import { UserData, UserNote } from '../../app/interfaces/user.interface';

describe('NoteProcessingService - text matching', () => {
	let service: NoteProcessingService;

	beforeEach(() => {
		service = new NoteProcessingService();
	});

	function makeUser(notes: Array<Partial<UserNote>>): UserData {
		return {
			primary_id: 'u1',
			user_note: notes.map(n => ({ note_text: '', ...n })) as UserNote[]
		} as UserData;
	}

	function criteria(partial: Partial<NoteSearchCriteria>): NoteSearchCriteria {
		return {
			searchText: '',
			caseSensitive: false,
			searchByDate: false,
			startDate: '',
			endDate: '',
			locale: 'en',
			...partial,
		} as NoteSearchCriteria;
	}

	it('matches substring by default (accent-insensitive, case-insensitive)', () => {
		const user = makeUser([
			{ note_text: 'This note mentions résumé and summary' },
			{ note_text: 'Completely unrelated' },
		]);

		const c = criteria({ searchText: 'resume' }); // defaults: substring, ignoreAccents true, caseSensitive false
		const matches = service.findMatchingNotes(user, c);
		expect(matches.length).toBe(1);
		expect(matches[0].note_text).toContain('résumé');
	});

	it('respects ignoreAccents=false (no match when accents differ)', () => {
		const user = makeUser([
			{ note_text: 'résumé' },
			{ note_text: 'naïve' },
		]);

		const c = criteria({ searchText: 'resume', matchMode: 'substring', ignoreAccents: false });
		const matches = service.findMatchingNotes(user, c);
		expect(matches.length).toBe(0);
	});

	it('wholeWord mode matches an entire word (accent-insensitive)', () => {
			const user = makeUser([
				{ note_text: 'foo résumé bar' },
				{ note_text: 'plural resumes should not match in whole word mode' },
				{ note_text: 'edge case: Resume at start' },
			]);

		const c = criteria({ searchText: 'resume', matchMode: 'wholeWord' });
		const matches = service.findMatchingNotes(user, c);
		// Expect to match the first (résumé -> resume) and third (Resume -> resume) notes only
		expect(matches.map(n => n.note_text)).toEqual([
			'foo résumé bar',
			'edge case: Resume at start',
		]);
	});

	it('exact mode requires full-string equality (accent-insensitive, case-insensitive)', () => {
		const user = makeUser([
			{ note_text: 'Résumé' },
			{ note_text: 'resume' },
			{ note_text: 'My résumé' },
		]);

		const c = criteria({ searchText: 'résumé', matchMode: 'exact' });
		const matches = service.findMatchingNotes(user, c);
		// Should match the first two but not the third (not exact)
		expect(matches.map(n => n.note_text)).toEqual([
			'Résumé',
			'resume',
		]);
	});

	it('caseSensitive=true affects matching (no fold to lower case)', () => {
		const user = makeUser([
			{ note_text: 'Résumé' },
			{ note_text: 'résumé' },
			{ note_text: 'RESUME' },
		]);

		const c = criteria({ searchText: 'résumé', matchMode: 'exact', caseSensitive: true });
		const matches = service.findMatchingNotes(user, c);
		// Only the exact-cased form matches when caseSensitive=true (accents normalized by default)
		expect(matches.map(n => n.note_text)).toEqual([
			'résumé',
		]);
	});
});

