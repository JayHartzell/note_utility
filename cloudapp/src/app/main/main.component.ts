import { Component, OnDestroy, OnInit, Inject, LOCALE_ID } from '@angular/core';
import {
  AlertService,
  CloudAppEventsService,
  Entity
} from '@exlibris/exl-cloudapp-angular-lib';
import { Observable, of, from } from 'rxjs';
import { tap, catchError, concatMap, filter } from 'rxjs/operators';

// Import interfaces and services
import { UserData, UserNote, SetMember } from '../interfaces/user.interface';
import { NoteSearchCriteria, NoteModificationOptions, UserProcessLog, JobParameter, MenuOption, NoteType } from '../interfaces/note.interface';
import { UserService } from '../services/user.service';
import { NoteProcessingService } from '../services/note-processing.service';
import { DataService } from '../services/data.service';
import { CsvExportService } from '../services/csv-export.service';
import { DateUtilService } from '../services/date-util.service';
import { SetUsersService } from '../services/set-users.service';

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
  
  // Separate users based on note availability
  usersWithNotes: Array<UserData> = [];
  usersWithoutNotes: Array<UserData> = [];

  // Job parameters
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
    },
    {
      id: 'modification-user-viewable',
      category: 'modification',
      label: 'User Viewable',
      description: 'Make matching notes user-viewable',
      available: true
    }
  ];
  
  // state derived from job parameters
  processed: number = 0;
  recordsToProcess: number = 0;
  modifiedUsers: Set<string> = new Set();
  processLogs: UserProcessLog[] = [];
  
  // Job execution state
  jobExecuted: boolean = false;
  showResults: boolean = false;
  toggleSetDetails: boolean = false;
  // Operation mode: 'choose' to show pre-step, 'menu' for menu-based config, 'deleteAll' for delete all notes
  operationMode: 'choose' | 'menu' | 'deleteAll' = 'choose';
  // Inline confirmation for delete-all flow
  showDeleteAllConfirm: boolean = false;
  
  // Job execution metadata for logging
  jobStartTime: Date | null = null;
  jobEndTime: Date | null = null;
  jobConfiguration: any = null;

  constructor(
    private eventsService: CloudAppEventsService,
    private alert: AlertService,
    private userService: UserService,
    private noteProcessingService: NoteProcessingService,
  private dataService: DataService,
  private csvExportService: CsvExportService,
  @Inject(LOCALE_ID) private locale: string
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
  // Entities detected
      },
      error: (error) => {
  // Error in entities observable
      }
    });
  }

  ngOnDestroy(): void {}

  clear() {
    this.setID = '';
    this.selectedSet = null;
    this.setMembers = [];
    this.userDetails = [];
    this.usersWithNotes = [];
    this.usersWithoutNotes = [];
    this.processed = 0;
    this.recordsToProcess = 0;
    this.modifiedUsers = new Set();
    this.processLogs = [];
    
    // Clear job parameters and reset menu options
    this.jobParameters = [];
    this.menuOptions.forEach(option => option.available = true);
    this.jobExecuted = false;
    this.showResults = false;
    this.jobStartTime = null;
    this.jobEndTime = null;
    this.jobConfiguration = null;
  this.operationMode = 'choose';
  this.showDeleteAllConfirm = false;
  }

  // Reset job configuration but keep the set and users loaded
  resetJob() {
    this.processed = 0;
    this.recordsToProcess = 0;
    this.modifiedUsers = new Set();
    this.processLogs = [];
    
    // Clear job parameters and reset menu options
    this.jobParameters = [];
    this.menuOptions.forEach(option => option.available = true);
    this.jobExecuted = false;
    this.showResults = false;
    this.jobStartTime = null;
    this.jobEndTime = null;
    this.jobConfiguration = null;
    this.operationMode = 'menu';
  this.showDeleteAllConfirm = false;
  }

  // Choose the menu-based operation flow
  chooseMenuFlow() {
    this.processLogs = [];
    this.jobExecuted = false;
    this.showResults = false;
    this.operationMode = 'menu';
    this.showDeleteAllConfirm = false;
  }

  // Show inline confirm for Delete All Notes
  onClickDeleteAll() {
    if (this.loading || this.processingNotes) return;
    this.showDeleteAllConfirm = true;
  }

  cancelDeleteAll() {
    this.showDeleteAllConfirm = false;
  }

  // Execute Delete All Notes across all users with notes in the selected set
  executeDeleteAllNotes() {
    if (!this.usersWithNotes || this.usersWithNotes.length === 0) {
      this.alert.error('No users with notes found in this set');
      return;
    }
    // proceed after inline confirmation
    this.showDeleteAllConfirm = false;
    this.operationMode = 'deleteAll';
    this.jobExecuted = true;
    this.processingNotes = true;
    this.processed = 0;
    this.recordsToProcess = this.usersWithNotes.length;
    this.modifiedUsers.clear();
    this.processLogs = [];
    this.showResults = false;

    // Capture job metadata for logging
    this.jobStartTime = new Date();
    this.jobConfiguration = {
      action: 'deleteAll',
      searchCriteria: null,
      modificationOptions: { deleteAll: true },
      setId: this.selectedSet?.id,
      setDescription: this.selectedSet?.description
    };

    const deleteAllOptions: NoteModificationOptions = {
      action: 'delete',
      deleteMatchingNotes: true
    };

    from(this.usersWithNotes).pipe(
      concatMap((user: UserData) => {
        if (!user || user.error) {
          this.processed++;
          return of(null);
        }
        const userId = user.primary_id;
        const allNotes = Array.isArray(user.user_note) ? [...user.user_note] : [];

        const userLog = this.noteProcessingService.processNoteModifications(user, allNotes, deleteAllOptions);
        this.processLogs.push(userLog);

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
        this.alert.error('Error deleting notes: ' + (error.message || 'Unknown error'));
        console.error('Error:', error);
      },
      complete: () => {
        this.processingNotes = false;
        this.jobEndTime = new Date();
        if (this.modifiedUsers.size > 0) {
          this.alert.success(`Successfully deleted notes for ${this.modifiedUsers.size} user${this.modifiedUsers.size !== 1 ? 's' : ''}`);
        } else {
          this.alert.info('No notes were deleted');
        }
        // Auto-show results on completion for delete-all flow
        this.showResults = true;
      }
    });
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
        // Make the other action option available
        const deleteOption = this.menuOptions.find(o => o.id === 'action-delete');
        if (deleteOption) deleteOption.available = true;
        // Make modification options available when modify is selected
        const modifyPopupOption = this.menuOptions.find(o => o.id === 'modification-popup');
  const modifyTypeOption = this.menuOptions.find(o => o.id === 'modification-type');
  const modifyUserViewableOption = this.menuOptions.find(o => o.id === 'modification-user-viewable');
        if (modifyPopupOption) modifyPopupOption.available = true;
        if (modifyTypeOption) modifyTypeOption.available = true;
  if (modifyUserViewableOption) modifyUserViewableOption.available = true;
        break;
      case 'action-delete':
        parameter = {
          id: 'action',
          type: 'action',
          label: 'Action: Delete Notes',
          value: 'delete',
          editable: false
        };
        // Make the other action option available
        const modifyOption = this.menuOptions.find(o => o.id === 'action-modify');
        if (modifyOption) modifyOption.available = true;
        // Hide modification options when delete is selected
        const deletePopupOption = this.menuOptions.find(o => o.id === 'modification-popup');
  const deleteTypeOption = this.menuOptions.find(o => o.id === 'modification-type');
  const deleteUserViewableOption = this.menuOptions.find(o => o.id === 'modification-user-viewable');
        if (deletePopupOption) deletePopupOption.available = false;
        if (deleteTypeOption) deleteTypeOption.available = false;
  if (deleteUserViewableOption) deleteUserViewableOption.available = false;
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
      case 'modification-user-viewable':
        parameter = {
          id: 'userViewable',
          type: 'modification',
          label: 'User Viewable',
          value: { makeUserViewable: undefined },
          editable: true
        };
        break;
      case 'modification-type':
        parameter = {
          id: 'noteType',
          type: 'modification',
          label: 'Note Type',
          value: null,
          editable: true
        };
        break;
      default:
        return;
    }

    // Remove existing parameter of same type (except search and modification which can have multiple)
    if (parameter.type !== 'search' && parameter.type !== 'modification') {
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
      // Make modification options available again when action is removed
  const popupOption = this.menuOptions.find(o => o.id === 'modification-popup');
  const typeOption = this.menuOptions.find(o => o.id === 'modification-type');
  const userViewableOption = this.menuOptions.find(o => o.id === 'modification-user-viewable');
      if (popupOption) popupOption.available = true;
      if (typeOption) typeOption.available = true;
  if (userViewableOption) userViewableOption.available = true;
  // Reset of legacy delete confirmation removed
    } else {
      const optionMap: { [key: string]: string } = {
        'textSearch': 'search-text',
        'dateRange': 'search-date',
        'popupSettings': 'modification-popup',
        'noteType': 'modification-type',
        'userViewable': 'modification-user-viewable'
      };

      const optionId = optionMap[parameterId];
      if (optionId) {
        const option = this.menuOptions.find(o => o.id === optionId);
        if (option) {
          // For modification options, only make available if action is 'modify'
          if (parameterId === 'popupSettings' || parameterId === 'noteType' || parameterId === 'userViewable') {
            const actionParam = this.jobParameters.find(p => p.type === 'action');
            if (actionParam?.value === 'modify') {
              option.available = true;
            }
          } else {
            // For search options, always make available
            option.available = true;
          }
        }
      }
    }
  }

  updateJobParameter(parameterId: string, newValue: any) {
    const parameter = this.jobParameters.find(p => p.id === parameterId as any);
    if (parameter) parameter.value = newValue;
  }

  get availableMenuOptions(): MenuOption[] {
    return this.menuOptions.filter(option => option.available);
  }

  get canExecuteJob(): boolean {
    const hasAction = this.hasActionParameter;
    const baseUsersOk = !!(this.usersWithNotes && this.usersWithNotes.length > 0);
    if (!hasAction || !baseUsersOk) return false;

    // Validate search: either text provided or date provided; but block if text param is selected empty
    if (this.textSearchSelectedButEmpty) return false;
    if (!this.hasValidSearchSelection) return false;

    // If it's a modify action, require a concrete modification selection
    if (this.isModifyAction) {
      return this.hasModificationParameter && this.hasConcreteModificationSelection;
    }

    return true;
  }

  get hasActionParameter(): boolean {
    return this.jobParameters.some(p => p.type === 'action');
  }

  get hasSearchParameter(): boolean {
    return this.jobParameters.some(p => p.type === 'search' || p.type === 'dateRange');
  }

  //  require text search box to have a non-empty value
  get hasTextSearch(): boolean {
    const textParam = this.jobParameters.find(p => p.id === 'textSearch');
    const text = textParam?.value?.text ?? '';
    return typeof text === 'string' && text.trim().length > 0;
  }

  //  whether text search parameter is present but empty (invalid)
  get textSearchSelectedButEmpty(): boolean {
    const textParam = this.jobParameters.find(p => p.id === 'textSearch');
    if (!textParam) return false;
    const text = textParam.value?.text ?? '';
    return !(typeof text === 'string' && text.trim().length > 0);
  }

  //  whether date range parameter has at least one bound set
  get hasDateRangeWithValue(): boolean {
    const dateParam = this.jobParameters.find(p => p.id === 'dateRange');
    if (!dateParam) return false;
    const start = dateParam.value?.startDate;
    const end = dateParam.value?.endDate;
    return !!(start || end);
  }

  //  valid search if text provided or date provided
  get hasValidSearchSelection(): boolean {
    return this.hasTextSearch || this.hasDateRangeWithValue;
  }

  get hasModificationParameter(): boolean {
    return this.jobParameters.some(p => p.type === 'modification');
  }

  // at least one modification has a concrete selection/value
  get hasConcreteModificationSelection(): boolean {
    const popup = this.jobParameters.find(p => p.id === 'popupSettings');
    const noteType = this.jobParameters.find(p => p.id === 'noteType');
    const userViewable = this.jobParameters.find(p => p.id === 'userViewable');

    const popupSelected = !!(popup && popup.value && (popup.value.makePopup === true || popup.value.disablePopup === true));
    const noteTypeSelected = !!(noteType && noteType.value);
    const userViewableSelected = !!(userViewable && userViewable.value && typeof userViewable.value.makeUserViewable === 'boolean');

    return popupSelected || noteTypeSelected || userViewableSelected;
  }

  get isModifyAction(): boolean {
    return this.jobParameters.some(p => p.type === 'action' && p.value === 'modify');
  }

  get needsModificationOptions(): boolean {
    return this.isModifyAction && this.hasSearchParameter && !this.hasModificationParameter;
  }

  getMenuOptionsByCategory(category: string): MenuOption[] {
    return this.availableMenuOptions.filter(option => option.category === category);
  }

  get processLogsWithChanges(): UserProcessLog[] {
    return this.processLogs.filter(log => !log.noMatchingNotes && log.notes.length > 0);
  }

  get availableNoteTypes(): NoteType[] {
    return this.noteProcessingService.getAvailableNoteTypes();
  }

  getNoteTypeByValue(value: string): NoteType | null {
    if (!value) return null;
    return this.noteProcessingService.getNoteTypeByValue(value) || null;
  }

  // Summary statistics getters
  get totalUsersInSet(): number {
    return this.userDetails.length;
  }

  get totalUsersWithNotes(): number {
    return this.usersWithNotes.length;
  }

  get totalUsersWithoutNotes(): number {
    return this.usersWithoutNotes.length;
  }

// main note matching logic

  // Public selector getters for template clarity
  get actionParam() {
    return this.jobParameters.find(p => p.id === 'action') as Extract<typeof this.jobParameters[number], { id: 'action' }> | undefined;
  }

  get textSearchParam() {
    return this.getTextParam();
  }

  get dateRangeParam() {
    return this.getDateParam();
  }

  get popupParam() {
    return this.getPopupParam();
  }

  get userViewableParam() {
    return this.getUserViewableParam();
  }

  get noteTypeParam() {
    return this.getNoteTypeParam();
  }

  private getTextParam() {
    return this.jobParameters.find(p => p.id === 'textSearch') as Extract<typeof this.jobParameters[number], { id: 'textSearch' }> | undefined;
  }

  private getDateParam() {
    return this.jobParameters.find(p => p.id === 'dateRange') as Extract<typeof this.jobParameters[number], { id: 'dateRange' }> | undefined;
  }

  private getPopupParam() {
    return this.jobParameters.find(p => p.id === 'popupSettings') as Extract<typeof this.jobParameters[number], { id: 'popupSettings' }> | undefined;
  }

  private getUserViewableParam() {
    return this.jobParameters.find(p => p.id === 'userViewable') as Extract<typeof this.jobParameters[number], { id: 'userViewable' }> | undefined;
  }

  private getNoteTypeParam() {
    return this.jobParameters.find(p => p.id === 'noteType') as Extract<typeof this.jobParameters[number], { id: 'noteType' }> | undefined;
  }

  private buildSearchCriteria(): NoteSearchCriteria {
    const text = this.getTextParam();
    const date = this.getDateParam();
    return {
      searchText: text?.value.text || '',
      caseSensitive: text?.value.caseSensitive || false,
      searchByDate: !!date && (!!date.value.startDate || !!date.value.endDate),
      startDate: date?.value.startDate || '',
      endDate: date?.value.endDate || ''
    };
  }

  private buildModificationOptions(action: 'modify' | 'delete'): NoteModificationOptions & { makeUserViewable?: boolean } {
    const popup = this.getPopupParam();
    const uv = this.getUserViewableParam();
    const nt = this.getNoteTypeParam();
    const opts: NoteModificationOptions & { makeUserViewable?: boolean } = {
      action,
      makePopup: popup?.value.makePopup || false,
      disablePopup: popup?.value.disablePopup || false,
      noteType: nt?.value || undefined,
      deleteMatchingNotes: action === 'delete'
    };
    if (uv && typeof uv.value.makeUserViewable === 'boolean') {
      opts.makeUserViewable = uv.value.makeUserViewable;
    }
    return opts;
  }

  findMatchingNotes(user: UserData): UserNote[] {
    return this.noteProcessingService.findMatchingNotes(user, this.buildSearchCriteria());
  }

  processUserNotes() {
    if (!this.usersWithNotes || !this.usersWithNotes.length) {
      this.alert.error('No users with notes found in this set');
      return;
    }
    
    // Validate job parameters
    if (!this.hasActionParameter) {
      this.alert.error('Please select an action');
      return;
    }
    if (this.textSearchSelectedButEmpty) {
      this.alert.error('Text search is selected but empty. Enter text or remove the text search parameter.');
      return;
    }
    if (!this.hasValidSearchSelection) {
      this.alert.error('Please add search criteria (enter text or set a date range).');
      return;
    }
    if (this.isModifyAction && (!this.hasModificationParameter || !this.hasConcreteModificationSelection)) {
      this.alert.error('Please select at least one concrete modification option.');
      return;
    }
    
  const actionParam = this.jobParameters.find(p => p.type === 'action') as Extract<typeof this.jobParameters[number], { id: 'action' }> | undefined;
    
    // Set job as executed to hide menu options and user details
    this.jobExecuted = true;
    this.processingNotes = true;
    this.processed = 0;
    this.recordsToProcess = this.usersWithNotes.length; // Only count users with notes
    this.modifiedUsers.clear();
    this.processLogs = [];
    this.showResults = false; // Reset results view
    
    // Capture job metadata for logging
    this.jobStartTime = new Date();
    const textParam = this.getTextParam();
    const dateParam = this.getDateParam();
    const popupParam = this.getPopupParam();
    const uvParam = this.getUserViewableParam();
    const noteTypeParam = this.getNoteTypeParam();

    this.jobConfiguration = {
      action: actionParam?.value || 'modify',
      searchCriteria: {
        textSearch: textParam?.value || null,
        dateRange: dateParam?.value || null
      },
      modificationOptions: {
        popup: popupParam?.value || null,
        noteType: noteTypeParam?.value || null,
        userViewable: uvParam?.value || null
      },
      setId: this.selectedSet?.id,
      setDescription: this.selectedSet?.description
    };
    
  const modificationOptions = this.buildModificationOptions(actionParam?.value || 'modify');
    
    // Process each user (only those with notes)
    from(this.usersWithNotes).pipe(
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
        this.jobEndTime = new Date(); // Capture job completion time
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

  // Export processing results to CSV
  exportResultsToCSV() {
    if (!this.processLogs || this.processLogs.length === 0) {
      this.alert.error('No processing results to export');
      return;
    }

    this.csvExportService.exportProcessingResults(this.processLogs, {
      jobStartTime: this.jobStartTime,
      jobEndTime: this.jobEndTime,
      jobConfiguration: this.jobConfiguration,
      selectedSet: this.selectedSet
    });
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

  // Loading set data for selected set
    
    this.loading = true;
    this.userDetails = [];
    this.setMembers = [];
    this.usersWithNotes = [];
    this.usersWithoutNotes = [];
    
    // Use the data service to fetch all set data
    this.dataService.fetchSetData(this.selectedSet.id).subscribe({
      next: (setData) => {
        this.setMembers = setData.members;
        this.userDetails = setData.users;
        
  // Categorize users based on note availability
  const categorized = SetUsersService.categorize(this.userDetails);
  this.usersWithNotes = categorized.usersWithNotes;
  this.usersWithoutNotes = categorized.usersWithoutNotes;
        
        this.loading = false;
      },
      error: (error) => {
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

  // Helper method to format note creation date (locale-aware, local timezone)
  formatNoteDate(note: UserNote): string {
  return DateUtilService.formatNoteDate(note, this.locale);
  }
}