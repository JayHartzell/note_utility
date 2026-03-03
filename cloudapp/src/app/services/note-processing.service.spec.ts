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
			user_note: notes.map(n => ({ note_text: '', segment_type: 'Internal', ...n })) as UserNote[]
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
			segmentType: 'Internal', 
			...partial,
		} as NoteSearchCriteria;
	}

	describe('Basic text matching', () => {
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

	describe('Spanish language tests', () => {
		it('matches Spanish accented characters with ignoreAccents=true', () => {
			const user = makeUser([
				{ note_text: 'El estudiante está en la biblioteca' },
				{ note_text: 'La niña come manzanas' },
				{ note_text: 'Información académica disponible' },
				{ note_text: 'No hay coincidencias aquí' },
			]);

			const c = criteria({ searchText: 'informacion', locale: 'es', ignoreAccents: true });
			const matches = service.findMatchingNotes(user, c);
			expect(matches.length).toBe(1);
			expect(matches[0].note_text).toContain('Información');
		});

		it('respects Spanish accents when ignoreAccents=false', () => {
			const user = makeUser([
				{ note_text: 'Información académica' },
				{ note_text: 'Informacion sin acentos' },
				{ note_text: 'Educación superior' },
			]);

			const c = criteria({ searchText: 'informacion', locale: 'es', ignoreAccents: false });
			const matches = service.findMatchingNotes(user, c);
			expect(matches.length).toBe(1);
			expect(matches[0].note_text).toBe('Informacion sin acentos');
		});

		it('matches Spanish ñ character variations', () => {
			const user = makeUser([
				{ note_text: 'El niño estudia español' },
				{ note_text: 'Mañana hay clases' },
				{ note_text: 'Habla español fluido' }, // More realistic match
				{ note_text: 'Cumpleaños de María' },
			]);

			const c = criteria({ searchText: 'español', locale: 'es', matchMode: 'wholeWord', ignoreAccents: true });
			const matches = service.findMatchingNotes(user, c);
			expect(matches.length).toBe(2);
			expect(matches.map(n => n.note_text)).toEqual([
				'El niño estudia español',
				'Habla español fluido',
			]);
		});

		it('handles Spanish case sensitivity with accents', () => {
			const user = makeUser([
				{ note_text: 'EDUCACIÓN SUPERIOR' },
				{ note_text: 'educación básica' },
				{ note_text: 'Educación media' },
				{ note_text: 'EDUCACION TECNICA' }, // No accent
			]);

			const c = criteria({ searchText: 'EDUCACIÓN', locale: 'es', caseSensitive: true, ignoreAccents: true });
			const matches = service.findMatchingNotes(user, c);
			expect(matches.length).toBe(2);
			expect(matches.map(n => n.note_text)).toEqual([
				'EDUCACIÓN SUPERIOR',
				'EDUCACION TECNICA',
			]);
		});

		it('exact match with Spanish text and punctuation', () => {
			const user = makeUser([
				{ note_text: '¡Hola, cómo estás!' },
				{ note_text: '¡hola, como estas!' }, // More realistic match - same punctuation
				{ note_text: '¡HOLA, CÓMO ESTÁS!' },
				{ note_text: 'Hola mundo' },
			]);

			const c = criteria({ searchText: '¡hola, cómo estás!', locale: 'es', matchMode: 'exact', ignoreAccents: true });
			const matches = service.findMatchingNotes(user, c);
			expect(matches.length).toBe(3);
			expect(matches.map(n => n.note_text)).toEqual([
				'¡Hola, cómo estás!',
				'¡hola, como estas!',
				'¡HOLA, CÓMO ESTÁS!',
			]);
		});
	});

	describe('Edge cases and special characters', () => {
		it('handles empty search text', () => {
			const user = makeUser([
				{ note_text: 'Some note' },
				{ note_text: 'Another note' },
			]);

			const c = criteria({ searchText: '' });
			const matches = service.findMatchingNotes(user, c);
			expect(matches.length).toBe(0);
		});

		it('handles notes with special characters and numbers', () => {
			const user = makeUser([
				{ note_text: 'Student ID: 123-456-789' },
				{ note_text: 'Email: student@university.edu' },
				{ note_text: 'Phone: (555) 123-4567' },
				{ note_text: 'Grade: A+ (95%)' },
			]);

			const c = criteria({ searchText: '123', matchMode: 'substring' });
			const matches = service.findMatchingNotes(user, c);
			expect(matches.length).toBe(2);
			expect(matches.map(n => n.note_text)).toEqual([
				'Student ID: 123-456-789',
				'Phone: (555) 123-4567',
			]);
		});

		it('handles unicode characters and emojis', () => {
			const user = makeUser([
				{ note_text: '🎓 Graduation ceremony' },
				{ note_text: '📚 Study materials available' },
				{ note_text: '⚠️ Important deadline approaching' },
				{ note_text: 'Regular text note' },
			]);

			const c = criteria({ searchText: 'graduation', matchMode: 'substring' });
			const matches = service.findMatchingNotes(user, c);
			expect(matches.length).toBe(1);
			expect(matches[0].note_text).toBe('🎓 Graduation ceremony');
		});

		it('handles very long text content', () => {
			const longText = 'This is a very long note that contains '.repeat(50) + 'important information';
			const user = makeUser([
				{ note_text: longText },
				{ note_text: 'Short note' },
			]);

			const c = criteria({ searchText: 'important information', matchMode: 'substring' });
			const matches = service.findMatchingNotes(user, c);
			expect(matches.length).toBe(1);
			expect(matches[0].note_text).toBe(longText);
		});

		it('handles whitespace and line breaks', () => {
			const user = makeUser([
				{ note_text: 'Line one\nLine two\nLine three' },
				{ note_text: 'Multiple    spaces    between' },
				{ note_text: '  Leading and trailing spaces  ' },
				{ note_text: '\tTab\tCharacters\t' },
			]);

			const c = criteria({ searchText: 'line two', matchMode: 'substring' });
			const matches = service.findMatchingNotes(user, c);
			expect(matches.length).toBe(1);
			expect(matches[0].note_text).toContain('Line two');
		});
	});

	describe('Multiple criteria combinations', () => {
		it('combines case sensitivity with accent handling', () => {
			const user = makeUser([
				{ note_text: 'CAFÉ con leche' },
				{ note_text: 'café CON LECHE' },
				{ note_text: 'CAFE con leche' },
				{ note_text: 'cafe con leche' },
			]);

			const c = criteria({ 
				searchText: 'CAFÉ', 
				caseSensitive: true, 
				ignoreAccents: true,
				matchMode: 'wholeWord'
			});
			const matches = service.findMatchingNotes(user, c);
			expect(matches.length).toBe(2);
			expect(matches.map(n => n.note_text)).toEqual([
				'CAFÉ con leche',
				'CAFE con leche',
			]);
		});

		it('whole word matching with complex punctuation', () => {
			const user = makeUser([
				{ note_text: 'Contact: Dr. Smith, Ph.D.' },
				{ note_text: 'Meeting with Dr. Jones' },
				{ note_text: 'The doctor will see you' },
				{ note_text: 'Doctoral student research' },
			]);

			const c = criteria({ searchText: 'dr', matchMode: 'wholeWord' });
			const matches = service.findMatchingNotes(user, c);
			expect(matches.length).toBe(2);
			expect(matches.map(n => n.note_text)).toEqual([
				'Contact: Dr. Smith, Ph.D.',
				'Meeting with Dr. Jones',
			]);
		});
	});

	describe('Performance and boundary tests', () => {
		it('handles user with no notes', () => {
			const user = makeUser([]);
			const c = criteria({ searchText: 'anything' });
			const matches = service.findMatchingNotes(user, c);
			expect(matches.length).toBe(0);
		});

		it('handles user with many notes efficiently', () => {
			const manyNotes = Array.from({ length: 1000 }, (_, i) => ({
				note_text: `Note number ${i + 1} with some ${i % 10 === 0 ? 'special' : 'regular'} content`
			}));
			
			const user = makeUser(manyNotes);
			const c = criteria({ searchText: 'special', matchMode: 'substring' });
			
			const startTime = Date.now();
			const matches = service.findMatchingNotes(user, c);
			const endTime = Date.now();
			
			expect(matches.length).toBe(100); // Every 10th note
			expect(endTime - startTime).toBeLessThan(100); // Should complete quickly
		});

		it('handles notes with null or undefined text gracefully', () => {
			const user = makeUser([
				{ note_text: null as any },
				{ note_text: undefined as any },
				{ note_text: 'Valid note' },
				{ note_text: '' },
			]);

			const c = criteria({ searchText: 'valid' });
			const matches = service.findMatchingNotes(user, c);
			expect(matches.length).toBe(1);
			expect(matches[0].note_text).toBe('Valid note');
		});
	});
});

