import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  AlertService,
  CloudAppEventsService,
  Entity
} from '@exlibris/exl-cloudapp-angular-lib';
import { Observable, of, from } from 'rxjs';
import { tap, catchError, concatMap, filter } from 'rxjs/operators';

// Import interfaces and services
import { UserData, UserNote, SetMember } from '../interfaces/user.interface';
import { NoteSearchCriteria, NoteModificationOptions, UserProcessLog, SetInfo } from '../interfaces/note.interface';
import { SetService } from '../services/set.service';
import { UserService } from '../services/user.service';
import { NoteProcessingService } from '../services/note-processing.service';
import { DataService } from '../services/data.service';

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
  setMembers: Array<SetMember> = [];
  noteSearch: string = '';
  deleteMatchingNotes: boolean = false;
  action: 'modify' | 'delete' = 'modify';
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
  processLogs: UserProcessLog[] = [];

  constructor(
    private eventsService: CloudAppEventsService,
    private alert: AlertService,
    private setService: SetService,
    private userService: UserService,
    private noteProcessingService: NoteProcessingService,
    private dataService: DataService
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
    this.action = 'modify';
    this.makePopup = false;
    this.disablePopup = false;
    this.noteType = '';
    this.processed = 0;
    this.recordsToProcess = 0;
    this.modifiedUsers = new Set();
    this.processLogs = [];
  }

// main note matching logic

  findMatchingNotes(user: UserData): UserNote[] {
    const criteria: NoteSearchCriteria = {
      searchText: this.noteSearch,
      caseSensitive: this.caseSensitiveSearch,
      searchByDate: this.searchByDate,
      startDate: this.startDate,
      endDate: this.endDate
    };
    
    return this.noteProcessingService.findMatchingNotes(user, criteria);
  }

  processUserNotes() {
    if (!this.users || !this.users.length || !this.noteSearch) {
      this.alert.error('Please load users and enter search text first');
      return;
    }
    
    this.processingNotes = true;
    this.processed = 0;
    this.recordsToProcess = this.users.length;
    this.modifiedUsers.clear();
    // Clear previous logs
    this.processLogs = [];
    
    // Create modification options
    const modificationOptions: NoteModificationOptions = {
      action: this.action,
      makePopup: this.makePopup,
      disablePopup: this.disablePopup,
      noteType: this.noteType,
      deleteMatchingNotes: this.deleteMatchingNotes
    };
    
    // Process each user
    from(this.users).pipe(
      concatMap((user: UserData) => {
        if (!user || user.error) {
          this.processed++;
          return of(null);
        }
        
        const userId = user.primary_id;
        // Get matching notes using the service
        const matchingNotes = this.findMatchingNotes(user);
        
        // Process note modifications using the service
        const userLog = this.noteProcessingService.processNoteModifications(user, matchingNotes, modificationOptions);
        
        // Add the log entry to the logs array
        this.processLogs.push(userLog);
        
        // Only update if changes were made
        if (this.noteProcessingService.wasUserModified(userLog)) {
          this.modifiedUsers.add(userId);
          return this.userService.updateUser(userId, user).pipe(
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
    if (!setID || !this.setService.isValidSetId(setID)) {
      this.alert.error('Please provide a valid Set ID');
      return;
    }

    console.log('Fetching set with ID:', setID);
    const sanitizedSetID = this.setService.sanitizeInput(setID);
    
    this.setID = sanitizedSetID;
    this.loading = true;
    this.userDetails = [];
    this.setMembers = [];
    
    // Use the data service to fetch all set data
    this.dataService.fetchSetData(sanitizedSetID).subscribe({
      next: (setData) => {
        console.log('Set data retrieved:', setData);
        this.setMembers = setData.members;
        this.userDetails = setData.users;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error fetching set data:', error);
        this.loading = false;
        this.alert.error(error.message || 'Failed to retrieve set data');
      }
    });
  }

  get members() {
    return this.setMembers;
  }
  
  get users() {
    return this.userDetails;
  }
}