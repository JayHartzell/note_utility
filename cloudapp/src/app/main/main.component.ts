import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  AlertService,
  CloudAppEventsService,
  CloudAppRestService,
  Entity,
  HttpMethod
} from '@exlibris/exl-cloudapp-angular-lib';
import { Observable, of, forkJoin, from } from 'rxjs';
import { finalize, tap, catchError, concatMap, filter } from 'rxjs/operators';

// Add these interfaces at the top of your file, outside the component class

// Define an interface for the note structure
interface UserNote {
  note_text: string;
  popup_note?: boolean;
  note_type?: { value: string; desc: string };
  creation_date?: string;
  created_date?: string;
  note_date?: string;
  segment_text?: string;
  created_by?: string;
  [key: string]: any; // For any other properties that might exist
}

// Define an interface for the user structure
interface UserData {
  primary_id: string;
  user_note: UserNote[];
  error?: string;
  
  // Add these explicit property definitions
  full_name?: string;
  first_name?: string;
  last_name?: string;
  status?: {value: string; desc: string};
  user_group?: {value: string; desc: string};
  account_type?: {value: string; desc: string};
  
  [key: string]: any; // For other user properties
}

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss']
})
export class MainComponent implements OnInit, OnDestroy {
  loading = false;
  processingNotes = false;
  entities$: Observable<Entity[]>;
  setID: string = '';
  userDetails: Array<UserData> = [];
  private setMembers: Array<{ id: number, name: string, description: string, link: string }> = [];
  noteSearch: string = '';
  deleteMatchingNotes: boolean = false;
  action: 'view' | 'modify' | 'delete' = 'view';
  makePopup: boolean = false;
  disablePopup: boolean = false;
  noteType: string = '';
  processed: number = 0;
  recordsToProcess: number = 0;
  modifiedUsers: Set<string> = new Set();
  caseSensitiveSearch: boolean = false;
  // useRegex: boolean = false;
  // regexError: string = '';
  searchByDate: boolean = false;
  startDate: string = '';  // YYYY-MM-DD format 
  endDate: string = '';    // YYYY-MM-DD format

  constructor(
    private restService: CloudAppRestService,
    private eventsService: CloudAppEventsService,
    private alert: AlertService
  ) {
    this.entities$ = this.eventsService.entities$.pipe(tap(() => this.clear()));
  }

  ngOnInit() {}

  ngOnDestroy(): void {}

  clear() {
    this.setID = '';
    this.setMembers = [];
    this.userDetails = [];
    this.noteSearch = '';
    this.deleteMatchingNotes = false;
    this.action = 'view';
    this.makePopup = false;
    this.disablePopup = false;
    this.noteType = '';
    this.processed = 0;
    this.recordsToProcess = 0;
    this.modifiedUsers = new Set();
  }

// main note matching logic

  findMatchingNotes(user: UserData): UserNote[] {
    if (!user || !Array.isArray(user.user_note)) {
      return [];
    }
    
    // Return empty array if no search text is provided
    if (!this.noteSearch || this.noteSearch.trim() === '') {
      return [];
    }
    
    // Start with all notes
    let matchingNotes: UserNote[] = [...user.user_note];
    
    // Filter by text (now we know search text exists)
    matchingNotes = matchingNotes.filter((note: UserNote) => {
      if (!note.note_text) return false;
      
      const noteText = this.caseSensitiveSearch ? note.note_text : note.note_text.toLowerCase();
      const searchText = this.caseSensitiveSearch ? this.noteSearch : this.noteSearch.toLowerCase();
      return noteText.includes(searchText);
    });
    
    // Additionally filter by date if enabled
    if (this.searchByDate && (this.startDate || this.endDate)) {
      const startTimestamp = this.startDate ? new Date(this.startDate).getTime() : 0;
      const endTimestamp = this.endDate ? new Date(this.endDate + 'T23:59:59').getTime() : Infinity;
      
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

  processUserNotes() {
    if (!this.userDetails.length || !this.noteSearch) {
      this.alert.error('Please load users and enter search text first');
      return;
    }
    
    this.processingNotes = true;
    this.processed = 0;
    this.recordsToProcess = this.userDetails.length;
    this.modifiedUsers.clear();
    
    // Process each user
    from(this.userDetails).pipe(
      concatMap((user: UserData) => {
        if (!user || user.error) {
          this.processed++;
          return of(null);
        }
        
        const userId = user.primary_id;
        // Get matching notes using the same logic as in findMatchingNotes
        const matchingNotes = this.findMatchingNotes(user);
        
        // Only continue if we found matching notes
        if (matchingNotes.length === 0) {
          this.processed++;
          return of(null);
        }
        
        // Apply the requested action
        
        // Apply the requested action
      if (this.action === 'delete' && this.deleteMatchingNotes) {
        const notesToDelete = new Set<UserNote>(matchingNotes);
        
        user.user_note = user.user_note.filter((note: UserNote) => !notesToDelete.has(note));
        
        this.modifiedUsers.add(userId);
      } else if (this.action === 'modify') {
        let modified = false;
        
        const notesToModify = new Set<UserNote>(matchingNotes);
        
        user.user_note.forEach((note: UserNote) => {
          if (notesToModify.has(note)) {
            // Only modify notes that match our criteria
            if (notesToModify.has(note)) {
              if (this.makePopup) {
                note.popup_note = true;
                modified = true;
              }
              if (this.disablePopup) {
                note.popup_note = false;
                modified = true;
              }
              if (this.noteType) {
                note.note_type = { value: this.noteType, desc: this.noteType };
                modified = true;
              }
            }
            }
          });
          
          if (modified) {
            this.modifiedUsers.add(userId);
          }
        }
        
        // Only update if changes were made
        if (this.modifiedUsers.has(userId)) {
          let request = {
            url: `/users/${userId}`,
            method: HttpMethod.PUT,
            requestBody: user
          };
          return this.restService.call(request).pipe(
            tap(() => this.processed++),
            catchError(error => {
              this.alert.error(`Failed to update user ${userId}: ${error.message || 'Unknown error'}`);
              this.processed++;
              return of(null);
            })
          );
        } else {
          this.processed++;
          return of(null);
        }
      }),
      filter(result => result !== null)
    ).subscribe({
      next: () => {},
      error: (error) => {
        this.processingNotes = false;
        this.alert.error('Error processing notes: ' + (error.message || 'Unknown error'));
        console.error('Error:', error);
      },
      complete: () => {
        this.processingNotes = false;
        if (this.modifiedUsers.size > 0) {
          this.alert.success(`Successfully updated notes for ${this.modifiedUsers.size} user${this.modifiedUsers.size !== 1 ? 's' : ''}`);
        } else {
          this.alert.info('No users were modified');
        }
      }
    });
  }

  // Helper to get percentage complete for progress bar
  get percentComplete() {
    return Math.round((this.processed / this.recordsToProcess) * 100);
  }

  // Existing properties and methods
  fetchSet(setID: string) {
    // Input validation
    if (!setID || !this.isValidSetId(setID)) {
      this.alert.error('Please provide a valid Set ID');
      return;
    }

    console.log('Fetching set with ID:', setID);
    const sanitizedSetID = this.sanitizeInput(setID);
    
    this.setID = sanitizedSetID;
    this.loading = true;
    this.userDetails = [];
    this.setMembers = [];
    
    // First get set information
    this.fetchSetInfo(sanitizedSetID).subscribe({
      next: (setInfo) => {
        console.log('Set info retrieved:', setInfo);
        
        // Check if the set contains users
        if (!setInfo.content || setInfo.content.value !== 'USER') {
          this.loading = false;
          this.alert.error(`This set contains ${setInfo.content?.desc || 'unknown'} records. Only USER sets are supported.`);
          return;
        }
        
        // After getting set info, fetch the members
        console.log('Set contains users, fetching members');
        this.fetchSetMembersPage(sanitizedSetID, 0);
      },
      error: (error) => {
        console.error('Error fetching set info:', error);
        this.loading = false;
        this.alert.error('Failed to retrieve set information');
      }
    });
  }

  fetchSetInfo(setID: string): Observable<any> {
    console.log('Fetching set info for set ID:', setID);
    return this.restService.call(`/conf/sets/${setID}`);
  }

  fetchSetMembersPage(setID: string, offset: number, allMembers: any[] = []) {
    console.log(`Fetching set members page with offset ${offset} for set ${setID}`);
    
    // Use limit=100 to get more members per page, offset for pagination
    this.restService.call(`/conf/sets/${setID}/members?limit=100&offset=${offset}`).pipe(
      finalize(() => {
        console.log('Finalized members fetch, total members:', this.setMembers.length);
        // Only complete loading when we've fetched all pages
        if (!this.loading) {
          console.log('Loading complete, fetching user details');
          this.fetchUserDetailsForMembers();
        }
      })
    ).subscribe({
      next: (response) => {
        console.log('Received members page response:', response);
        
        if (Array.isArray(response.member)) {
          const currentPageMembers = response.member.map((member: any) => ({
            id: member.id,
            name: member.name,
            description: member.description,
            link: member.link
          }));
          
          // Add current page members to our collection
          const updatedMembers = [...allMembers, ...currentPageMembers];
          console.log(`Added ${currentPageMembers.length} members, total now: ${updatedMembers.length}`);
          this.setMembers = updatedMembers;
          
          // Check if we need to fetch more pages
          if (response.member.length === 100) {
            // If we got a full page, there might be more - fetch next page
            console.log('Got full page (100 members), fetching next page');
            this.fetchSetMembersPage(setID, offset + 100, updatedMembers);
          } else {
            // We've fetched all pages
            console.log('Fetched all member pages, total members:', updatedMembers.length);
            this.loading = false;
          }
        } else {
          this.setMembers = allMembers; // Use what we have so far
          console.log('No members in current page, total members:', allMembers.length);
          this.loading = false;
        }
      },
      error: (error) => {
        console.error(`Error fetching set members page (offset ${offset}):`, error);
        this.setMembers = allMembers; // Use what we have so far
        this.loading = false;
        this.alert.error(`Failed to fetch set members page (offset ${offset})`);
      }
    });
  }

  fetchUserDetailsForMembers() {
    console.log('Starting to fetch user details for members, count:', this.setMembers.length);
    
    if (this.setMembers.length === 0) {
      console.log('No members to fetch details for');
      this.loading = false;
      return;
    }
    
    // Create an array of observables for each user request
    const userRequests = this.setMembers.map(member => {
      console.log('Creating request for member:', member.id);
      return this.fetchUserDetails(member.id.toString()).pipe(
        catchError(error => {
          console.error(`Error fetching details for user ${member.id}:`, error);
          // Return a placeholder on error so forkJoin doesn't fail completely
          return of({ primary_id: member.id, error: `Failed to load user details: ${error.message || 'Unknown error'}` });
        })
      );
    });
    
    // Execute all requests in parallel
    forkJoin(userRequests).pipe(
      finalize(() => {
        console.log('Finalized user details fetch, users count:', this.userDetails.length);
        this.loading = false;
      })
    ).subscribe({
      next: (usersArray) => {
        console.log('Received user details for all members:', usersArray.length);
        this.userDetails = usersArray;
      },
      error: (error) => {
        console.error('Error fetching user details:', error);
        this.alert.error('Failed to fetch some user details');
      }
    });
  }

  fetchUserDetails(userId: string): Observable<any> {
    return this.restService.call(`/users/${userId}`);
  }

  // Input validation helper 
  private isValidSetId(id: string): boolean {
    // Less restrictive validation - just check if it's a number
    // Some set IDs might be shorter than 12 digits
    return /^\d+$/.test(id.trim());
  }
  
  // Basic sanitization
private sanitizeInput(input: string): string {
  // Just trim the input - don't remove characters
  return input.trim();
}

  get members() {
    return this.setMembers;
  }
  
  get users() {
    return this.userDetails;
  }
}