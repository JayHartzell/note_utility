import { Injectable } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { finalize, catchError } from 'rxjs/operators';
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
    return new Observable(observer => {
      // First get set information
      this.setService.fetchSetInfo(setID).subscribe({
        next: (setInfo) => {
          console.log('Set info retrieved:', setInfo);
          
          // Check if the set contains users
          if (!this.setService.isUserSet(setInfo)) {
            observer.error(new Error(`This set contains ${setInfo.content?.desc || 'unknown'} records. Only USER sets are supported.`));
            return;
          }
          
          // After getting set info, fetch all members
          this.fetchAllSetMembers(setID).subscribe({
            next: (members) => {
              console.log('All members fetched:', members.length);
              
              // Fetch user details for all members
              this.fetchUserDetailsForMembers(members).subscribe({
                next: (users) => {
                  console.log('All user details fetched:', users.length);
                  observer.next({ setInfo, members, users });
                  observer.complete();
                },
                error: (error) => {
                  observer.error(error);
                }
              });
            },
            error: (error) => {
              observer.error(error);
            }
          });
        },
        error: (error) => {
          console.error('Error fetching set info:', error);
          observer.error(new Error('Failed to retrieve set information'));
        }
      });
    });
  }

  /**
   * Fetch all members of a set, handling pagination
   * @param setID The ID of the set
   */
  private fetchAllSetMembers(setID: string): Observable<SetMember[]> {
    return new Observable(observer => {
      const fetchPage = (offset: number, allMembers: SetMember[] = []) => {
        this.setService.fetchSetMembers(setID, offset).subscribe({
          next: (response) => {
            console.log('Received members page response:', response);
            
            if (Array.isArray(response.member)) {
              const currentPageMembers = response.member.map((member: any) => ({
                id: member.id,
                name: member.name,
                description: member.description,
                link: member.link
              }));
              
              const updatedMembers = [...allMembers, ...currentPageMembers];
              console.log(`Added ${currentPageMembers.length} members, total now: ${updatedMembers.length}`);
              
              // Check if we need to fetch more pages
              if (response.member.length === 100) {
                // If we got a full page, there might be more - fetch next page
                console.log('Got full page (100 members), fetching next page');
                fetchPage(offset + 100, updatedMembers);
              } else {
                // We've fetched all pages
                console.log('Fetched all member pages, total members:', updatedMembers.length);
                observer.next(updatedMembers);
                observer.complete();
              }
            } else {
              console.log('No members in current page, total members:', allMembers.length);
              observer.next(allMembers);
              observer.complete();
            }
          },
          error: (error) => {
            console.error(`Error fetching set members page (offset ${offset}):`, error);
            observer.error(new Error(`Failed to fetch set members page (offset ${offset})`));
          }
        });
      };
      
      fetchPage(0);
    });
  }

  /**
   * Fetch user details for all members
   * @param members Array of set members
   */
  private fetchUserDetailsForMembers(members: SetMember[]): Observable<UserData[]> {
    console.log('Starting to fetch user details for members, count:', members.length);
    
    if (members.length === 0) {
      console.log('No members to fetch details for');
      return of([]);
    }
    
    // Create an array of observables for each user request
    const userRequests = members.map(member => {
      console.log('Creating request for member:', member.id);
      return this.userService.fetchUserDetails(member.id.toString()).pipe(
        catchError(error => {
          console.error(`Error fetching details for user ${member.id}:`, error);
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
        console.log('Finalized user details fetch');
      })
    );
  }
}
