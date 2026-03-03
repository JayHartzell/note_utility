import { Injectable } from '@angular/core';
import { Observable, forkJoin, of, EMPTY } from 'rxjs';
import { finalize, catchError, switchMap, map, expand, reduce } from 'rxjs/operators';
import { UserService } from './user.service';
import { SetService } from './set.service';
import { UserData, SetMember } from '../interfaces/user.interface';
import { SetInfo } from '../interfaces/note.interface';

@Injectable({
  providedIn: 'root'
})
export class DataService {

  constructor(
    private userService: UserService,
    private setService: SetService
  ) {}

  /**
   * Fetch all set data including info, members, and user details
   * @param setID The ID of the set to fetch
   */
  fetchSetData(setID: string): Observable<{setInfo: SetInfo, members: SetMember[], users: UserData[]}> {
    return this.setService.fetchSetInfo(setID).pipe(
      switchMap(setInfo => {
        if (!this.setService.isUserSet(setInfo)) {
          throw new Error(`This set contains ${setInfo.content?.desc || 'unknown'} records. Only USER sets are supported.`);
        }
        return this.fetchAllSetMembers(setID).pipe(
          switchMap(members => this.fetchUserDetailsForMembers(members).pipe(
            map(users => ({ setInfo, members, users }))
          ))
        );
      }),
      catchError(error => {
        throw error.message ? error : new Error('Failed to retrieve set information');
      })
    );
  }

  /**
   * Fetch all members of a set, handling pagination
   * @param setID The ID of the set
   */
  private fetchAllSetMembers(setID: string): Observable<SetMember[]> {
    // Use expand for recursive pagination — automatically cancelled on unsubscribe
    return this.setService.fetchSetMembers(setID, 0).pipe(
      expand((response, index) => {
        if (Array.isArray(response.member) && response.member.length === 100) {
          const nextOffset = (index + 1) * 100;
          return this.setService.fetchSetMembers(setID, nextOffset);
        }
        return EMPTY; // No more pages
      }),
      map(response => {
        if (!Array.isArray(response.member)) return [];
        return response.member.map((member: any) => ({
          id: member.id,
          name: member.name,
          description: member.description,
          link: member.link
        }));
      }),
      reduce((allMembers: SetMember[], pageMembers: SetMember[]) => [...allMembers, ...pageMembers], []),
      catchError(error => {
        throw new Error(`Failed to fetch set members: ${error.message || 'Unknown error'}`);
      })
    );
  }

  /**
   * Fetch user details for all members
   * @param members Array of set members
   */
  private fetchUserDetailsForMembers(members: SetMember[]): Observable<UserData[]> {
  // Start fetching user details for members
    
    if (members.length === 0) {
  // No members to fetch details for
      return of([]);
    }
    
    // Create an array of observables for each user request
    const userRequests = members.map(member => {
  // Creating request for member request
      return this.userService.fetchUserDetails(member.id.toString()).pipe(
        catchError(error => {
          // Error fetching details for user
          // Return a placeholder on error so forkJoin doesn't fail completely
          return of({ 
            primary_id: member.id.toString(), 
            user_note: [],
            error: `Failed to load user details: ${error.message || 'Unknown error'}` 
          } as UserData);
        })
      );
    });
    
    // Execute all requests in parallel
    return forkJoin(userRequests).pipe(
      finalize(() => {
        // Finalized user details fetch
      })
    );
  }
}
