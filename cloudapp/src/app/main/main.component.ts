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
import { NoteSearchCriteria, NoteModificationOptions, UserProcessLog, SetInfo, JobParameter, MenuOption, SearchCriteria } from '../interfaces/note.interface';
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
  currentEntities: Entity[] = [];
  selectedSet: Entity | null = null;
  setID: string = '';
  userDetails: Array<UserData> = [];
  setMembers: Array<SetMember> = [];
  
  // New menu-based job parameters
  jobParameters: JobParameter[] = [];
  menuOptions: MenuOption[] = [
    {
      id: 'action-modify',
      category: 'action',
      label: 'Modify Notes',
      description: 'Modify matching notes with new properties',
      available: true
    },
    {
      id: 'action-delete',
      category: 'action',
      label: 'Delete Notes',
      description: 'Delete notes that match criteria',
      available: true
    },
    {
      id: 'search-text',
      category: 'search',
      label: 'Text Search',
      description: 'Search for specific text in notes',
      available: true
    },
    {
      id: 'search-date',
      category: 'search',
      label: 'Date Range',
      description: 'Filter notes by creation date',
      available: true
    },
    {
      id: 'modification-popup',
      category: 'modification',
      label: 'Popup Settings',
      description: 'Configure popup note behavior',
      available: true
    },
    {
      id: 'modification-type',
      category: 'modification',
      label: 'Note Type',
      description: 'Change the type of matching notes',
      available: true
    }
  ];
  
  // Legacy properties for backward compatibility
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
  searchByDate: boolean = false;
  startDate: string = '';
  endDate: string = '';
  processLogs: UserProcessLog[] = [];
  
  // Job execution state
  jobExecuted: boolean = false;

  constructor(
    private eventsService: CloudAppEventsService,
    private alert: AlertService,
    private setService: SetService,
    private userService: UserService,
    private noteProcessingService: NoteProcessingService,
    private dataService: DataService
  ) {
    this.entities$ = this.eventsService.entities$.pipe(
      tap((entities) => {
        this.currentEntities = entities;
        this.clear();
      })
    );
  }

  ngOnInit() {
    // Subscribe to entities to detect when sets are available
    this.entities$.subscribe({
      next: (entities) => {
        console.log('Entities detected:', entities);
        console.log('Number of entities:', entities.length);
        console.log('Entity types:', entities.map(e => e.type));
        console.log('Sets found:', entities.filter(e => e.type === 'SET'));
      },
      error: (error) => {
        console.error('Error in entities observable:', error);
      }
    });
  }

  ngOnDestroy(): void {}

  clear() {
    this.setID = '';
    this.selectedSet = null;
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
    
    // Clear job parameters and reset menu options
    this.jobParameters = [];
    this.menuOptions.forEach(option => option.available = true);
    this.caseSensitiveSearch = false;
    this.searchByDate = false;
    this.startDate = '';
    this.endDate = '';
    this.jobExecuted = false;
  }

  // Reset job configuration but keep the set and users loaded
  resetJob() {
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
    
    // Clear job parameters and reset menu options
    this.jobParameters = [];
    this.menuOptions.forEach(option => option.available = true);
    this.caseSensitiveSearch = false;
    this.searchByDate = false;
    this.startDate = '';
    this.endDate = '';
    this.jobExecuted = false;
  }

  // Menu-based job parameter methods
  addJobParameter(optionId: string) {
    const option = this.menuOptions.find(o => o.id === optionId);
    if (!option || !option.available) return;

    let parameter: JobParameter;

    switch (optionId) {
      case 'action-modify':
        parameter = {
          id: 'action',
          type: 'action',
          label: 'Action: Modify Notes',
          value: 'modify',
          editable: false
        };
        this.action = 'modify';
        // Make the other action option available
        const deleteOption = this.menuOptions.find(o => o.id === 'action-delete');
        if (deleteOption) deleteOption.available = true;
        break;
      case 'action-delete':
        parameter = {
          id: 'action',
          type: 'action',
          label: 'Action: Delete Notes',
          value: 'delete',
          editable: false
        };
        this.action = 'delete';
        this.deleteMatchingNotes = true; // Auto-enable delete confirmation
        // Make the other action option available
        const modifyOption = this.menuOptions.find(o => o.id === 'action-modify');
        if (modifyOption) modifyOption.available = true;
        break;
      case 'search-text':
        parameter = {
          id: 'textSearch',
          type: 'search',
          label: 'Text Search',
          value: { text: '', caseSensitive: false },
          editable: true
        };
        break;
      case 'search-date':
        parameter = {
          id: 'dateRange',
          type: 'dateRange',
          label: 'Date Range',
          value: { startDate: '', endDate: '' },
          editable: true
        };
        break;
      case 'modification-popup':
        parameter = {
          id: 'popupSettings',
          type: 'modification',
          label: 'Popup Settings',
          value: { makePopup: false, disablePopup: false },
          editable: true
        };
        break;
      case 'modification-type':
        parameter = {
          id: 'noteType',
          type: 'modification',
          label: 'Note Type',
          value: '',
          editable: true
        };
        break;
      default:
        return;
    }

    // Remove existing parameter of same type (except search which can have multiple)
    if (parameter.type !== 'search') {
      this.jobParameters = this.jobParameters.filter(p => p.type !== parameter.type);
    }

    this.jobParameters.push(parameter);
    option.available = false;
  }

  removeJobParameter(parameterId: string) {
    const parameter = this.jobParameters.find(p => p.id === parameterId);
    if (!parameter) return;

    this.jobParameters = this.jobParameters.filter(p => p.id !== parameterId);

    // Make corresponding menu option available again
    if (parameterId === 'action') {
      // Make both action options available
      const modifyOption = this.menuOptions.find(o => o.id === 'action-modify');
      const deleteOption = this.menuOptions.find(o => o.id === 'action-delete');
      if (modifyOption) modifyOption.available = true;
      if (deleteOption) deleteOption.available = true;
      // Reset delete confirmation
      this.deleteMatchingNotes = false;
    } else {
      const optionMap: { [key: string]: string } = {
        'textSearch': 'search-text',
        'dateRange': 'search-date',
        'popupSettings': 'modification-popup',
        'noteType': 'modification-type'
      };

      const optionId = optionMap[parameterId];
      if (optionId) {
        const option = this.menuOptions.find(o => o.id === optionId);
        if (option) option.available = true;
      }
    }
  }

  updateJobParameter(parameterId: string, newValue: any) {
    const parameter = this.jobParameters.find(p => p.id === parameterId);
    if (parameter) {
      parameter.value = newValue;
      
      // Update legacy properties for backward compatibility
      switch (parameterId) {
        case 'textSearch':
          this.noteSearch = newValue.text;
          this.caseSensitiveSearch = newValue.caseSensitive;
          break;
        case 'dateRange':
          this.startDate = newValue.startDate;
          this.endDate = newValue.endDate;
          this.searchByDate = !!(newValue.startDate || newValue.endDate);
          break;
        case 'popupSettings':
          this.makePopup = newValue.makePopup;
          this.disablePopup = newValue.disablePopup;
          break;
        case 'noteType':
          this.noteType = newValue;
          break;
      }
    }
  }

  get availableMenuOptions(): MenuOption[] {
    return this.menuOptions.filter(option => option.available);
  }

  get canExecuteJob(): boolean {
    const hasAction = this.jobParameters.some(p => p.type === 'action');
    const hasSearch = this.jobParameters.some(p => p.type === 'search' || p.type === 'dateRange');
    return hasAction && hasSearch && this.users && this.users.length > 0;
  }

  get hasActionParameter(): boolean {
    return this.jobParameters.some(p => p.type === 'action');
  }

  get hasSearchParameter(): boolean {
    return this.jobParameters.some(p => p.type === 'search' || p.type === 'dateRange');
  }

  getMenuOptionsByCategory(category: string): MenuOption[] {
    return this.availableMenuOptions.filter(option => option.category === category);
  }

  get processLogsWithChanges(): UserProcessLog[] {
    return this.processLogs.filter(log => !log.noMatchingNotes && log.notes.length > 0);
  }

// main note matching logic

  findMatchingNotes(user: UserData): UserNote[] {
    // Build criteria from job parameters
    const textSearchParam = this.jobParameters.find(p => p.id === 'textSearch');
    const dateRangeParam = this.jobParameters.find(p => p.id === 'dateRange');
    
    const criteria: NoteSearchCriteria = {
      searchText: textSearchParam?.value.text || this.noteSearch,
      caseSensitive: textSearchParam?.value.caseSensitive || this.caseSensitiveSearch,
      searchByDate: !!dateRangeParam || this.searchByDate,
      startDate: dateRangeParam?.value.startDate || this.startDate,
      endDate: dateRangeParam?.value.endDate || this.endDate
    };
    
    return this.noteProcessingService.findMatchingNotes(user, criteria);
  }

  processUserNotes() {
    if (!this.users || !this.users.length) {
      this.alert.error('Please load users first');
      return;
    }
    
    // Validate job parameters
    if (!this.canExecuteJob) {
      this.alert.error('Please configure action and search criteria first');
      return;
    }
    
    // Build search criteria from job parameters
    const textSearchParam = this.jobParameters.find(p => p.id === 'textSearch');
    const dateRangeParam = this.jobParameters.find(p => p.id === 'dateRange');
    
    if (!textSearchParam && !dateRangeParam) {
      this.alert.error('Please add search criteria');
      return;
    }
    
    // Set job as executed to hide menu options and user details
    this.jobExecuted = true;
    this.processingNotes = true;
    this.processed = 0;
    this.recordsToProcess = this.users.length;
    this.modifiedUsers.clear();
    this.processLogs = [];
    
    // Create modification options from job parameters
    const actionParam = this.jobParameters.find(p => p.type === 'action');
    const popupParam = this.jobParameters.find(p => p.id === 'popupSettings');
    const noteTypeParam = this.jobParameters.find(p => p.id === 'noteType');
    
    const modificationOptions: NoteModificationOptions = {
      action: actionParam?.value || 'modify',
      makePopup: popupParam?.value.makePopup || false,
      disablePopup: popupParam?.value.disablePopup || false,
      noteType: noteTypeParam?.value || '',
      deleteMatchingNotes: actionParam?.value === 'delete'
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

  // Helper method for debugging entity types
  getEntityTypes(): string {
    return this.currentEntities.map(e => e.type).join(', ') || 'None';
  }

  // Check if current page has sets
  get hasValidSets(): boolean {
    return this.currentEntities.some(entity => entity.type === 'SET');
  }

  // Get available sets from current entities
  get availableSets(): Entity[] {
    return this.currentEntities.filter(entity => entity.type === 'SET');
  }

  // Select a set from the available entities
  selectSet(entity: Entity) {
    if (entity.type !== 'SET') {
      this.alert.error('Selected entity is not a set');
      return;
    }

    this.selectedSet = entity;
    this.setID = entity.id;
    this.loadSetData();
  }

  // Load set data using the selected entity
  loadSetData() {
    if (!this.selectedSet) {
      this.alert.error('No set selected');
      return;
    }

    console.log('Loading set data for selected set:', this.selectedSet);
    
    this.loading = true;
    this.userDetails = [];
    this.setMembers = [];
    
    // Use the data service to fetch all set data
    this.dataService.fetchSetData(this.selectedSet.id).subscribe({
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

  // Helper method to format note creation date
  formatNoteDate(note: UserNote): string {
    const dateField = note.created_date;
    if (!dateField) return 'Unknown';
    
    try {
      const date = new Date(dateField);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateField.toString();
    }
  }
}