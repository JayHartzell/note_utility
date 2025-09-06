import { UserData } from '../interfaces/user.interface';

/**
 * Pure utility for categorizing users by presence of notes.
 * Static methods; no DI required.
 */
export class SetUsersService {
  static categorize(users: UserData[] | undefined | null): {
    usersWithNotes: UserData[];
    usersWithoutNotes: UserData[];
  } {
    const usersWithNotes: UserData[] = [];
    const usersWithoutNotes: UserData[] = [];

    if (!Array.isArray(users)) {
      return { usersWithNotes, usersWithoutNotes };
    }

    users.forEach(user => {
      if (!user || user.error) return; // skip errored users
      const hasNotes = user.user_note && Array.isArray(user.user_note) && user.user_note.length > 0;
      if (hasNotes) usersWithNotes.push(user);
      else usersWithoutNotes.push(user);
    });

    return { usersWithNotes, usersWithoutNotes };
  }
}
