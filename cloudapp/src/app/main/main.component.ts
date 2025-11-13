import { Component, OnDestroy, OnInit, Inject, LOCALE_ID } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AlertService,
  CloudAppEventsService,
  Entity,
  MaterialModule
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
import { SetUtilService } from '../services/set-util.service';
import { JobConfigUtil } from '../services/job-config.util';
import { SetSelectorComponent } from './set-selector/set-selector.component';
import { OperationSelectorComponent } from './operation-selector/operation-selector.component';
import { JobParametersComponent } from './job-parameters/job-parameters.component';
import { JobMenuComponent } from './job-menu/job-menu.component';
import { ResultsDisplayComponent } from './results-display/results-display.component';
import { IntakeMethodSelectorComponent } from './intake-method-selector/intake-method-selector.component';
import { FileUploadComponent } from './file-upload/file-upload.component';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MaterialModule,
    SetSelectorComponent,
    OperationSelectorComponent,
    JobParametersComponent,
    JobMenuComponent,
    ResultsDisplayComponent,
    IntakeMethodSelectorComponent,
    FileUploadComponent,
  ]
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

  // Available creators for filtering
  availableCreators: string[] = [];

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
      id: 'search-creator',
      category: 'search',
      label: 'Creator Filter',
      description: 'Filter notes by creator',
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
  
  // Intake method state: 'select' to choose method, 'set' for set-based, 'file' for file-based, 'completed' after loading
  intakeMethod: 'select' | 'set' | 'file' | 'completed' = 'select';
  // Track which method was used to load users
  usedIntakeMethod: 'set' | 'file' | null = null;
  loadingUsers: boolean = false;
  
  // File upload tracking
  totalUsersLoaded: number = 0;
  totalUsersFailed: number = 0;
  failedUserIds: string[] = [];
  
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
        // Only clear if we have already loaded users or not in set selection mode
        // This allows users to navigate to find sets without losing their intake method selection
        if (this.intakeMethod === 'completed' || this.intakeMethod === 'select') {
          this.clear();
        }
      })
    );
  }

  ngOnInit() {
    // Subscribe to entities to detect when sets are available
    this.entities$.subscribe({
      next: (entities) => {
      },
      error: (error) => {
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
    this.availableCreators = [];
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
    
    // Reset intake method
    this.intakeMethod = 'select';
    this.usedIntakeMethod = null;
    this.loadingUsers = false;
    
    // Reset file upload tracking
    this.totalUsersLoaded = 0;
    this.totalUsersFailed = 0;
    this.failedUserIds = [];
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
        
        // Filter to only Internal segment notes for delete all operation
        const internalNotes = allNotes.filter(note => {
          const noteSegment = note['segment_type'];
          return noteSegment === 'Internal';
        });

        const userLog = this.noteProcessingService.processNoteModifications(user, internalNotes, deleteAllOptions);
        this.processLogs.push(userLog);

        if (this.noteProcessingService.wasUserModified(userLog)) {
          this.modifiedUsers.add(userId);
          return this.userService.updateUser(userId, user).pipe(
            tap(() => {
              userLog.updateSuccessful = true;
              this.processed++;
            }),
            catchError(error => {
              userLog.updateError = error.message || 'Unknown error';
              userLog.updateSuccessful = false;
              this.processed++;
              return of(null);
            })
          );
        } else {
          userLog.updateSuccessful = true; // No changes needed, so "successful"
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
        
        this.alert.success('Job completed.');
        
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
          value: { text: '', caseSensitive: false, matchMode: 'substring', ignoreAccents: true },
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
      case 'search-creator':
        parameter = {
          id: 'creatorSearch',
          type: 'search',
          label: 'Creator Filter',
          value: { selectedCreators: [] },
          editable: true
        };
        break;
      case 'modification-popup':
        parameter = {
          id: 'popupSettings',
          type: 'modification',
          label: 'Popup Settings',
          // Default to a concrete selection so the job can execute
          value: { makePopup: true, disablePopup: false },
          editable: true
        };
        break;
      case 'modification-user-viewable':
        parameter = {
          id: 'userViewable',
          type: 'modification',
          label: 'User Viewable',
          // Default to a concrete selection so the job can execute
          value: { makeUserViewable: true },
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
        'creatorSearch': 'search-creator',
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
    const idx = this.jobParameters.findIndex(p => p.id === parameterId as any);
    if (idx >= 0) {
      const updated = { ...this.jobParameters[idx], value: newValue } as any;
      this.jobParameters = [
        ...this.jobParameters.slice(0, idx),
        updated,
        ...this.jobParameters.slice(idx + 1)
      ];
    }
  }

  get availableMenuOptions(): MenuOption[] {
    return this.menuOptions.filter(option => option.available);
  }

  get canExecuteJob(): boolean {
    const hasAction = this.hasActionParameter;
    const baseUsersOk = !!(this.usersWithNotes && this.usersWithNotes.length > 0);
    if (!hasAction || !baseUsersOk) return false;

    // Validate search: either text provided or date provided; but block execution on empty text search
    if (this.textSearchSelectedButEmpty) return false;
    if (!this.hasValidSearchSelection) return false;

    // If it's a modify action, require a concrete modification selection
    if (this.isModifyAction) {
      return this.hasModificationParameter && this.hasConcreteModificationSelection;
    }

    return true;
  }

  get hasActionParameter(): boolean {
  return JobConfigUtil.hasActionParameter(this.jobParameters);
  }

  get hasSearchParameter(): boolean {
  return JobConfigUtil.hasSearchParameter(this.jobParameters);
  }

  //  require text search box to have a non-empty value
  get hasTextSearch(): boolean {
  return JobConfigUtil.hasTextSearch(this.jobParameters);
  }

  //  whether text search parameter is present but empty (invalid)
  get textSearchSelectedButEmpty(): boolean {
  return JobConfigUtil.textSearchSelectedButEmpty(this.jobParameters);
  }

  //  whether date range parameter has at least one bound set
  get hasDateRangeWithValue(): boolean {
  return JobConfigUtil.hasDateRangeWithValue(this.jobParameters);
  }

  //  valid search if text provided or date provided
  get hasValidSearchSelection(): boolean {
  return JobConfigUtil.hasValidSearchSelection(this.jobParameters);
  }

  get dateRangeSelectedButIncomplete(): boolean {
  return JobConfigUtil.dateRangeSelectedButIncomplete(this.jobParameters);
  }

  //  require creator search to have at least one selected creator
  get hasCreatorSearch(): boolean {
  return JobConfigUtil.hasCreatorSearch(this.jobParameters);
  }

  //  whether creator search parameter is present but empty (invalid)
  get creatorSearchSelectedButEmpty(): boolean {
  return JobConfigUtil.creatorSearchSelectedButEmpty(this.jobParameters);
  }

  get hasModificationParameter(): boolean {
  return JobConfigUtil.hasModificationParameter(this.jobParameters);
  }

  // at least one modification has a concrete selection/value
  get hasConcreteModificationSelection(): boolean {
  return JobConfigUtil.hasConcreteModificationSelection(this.jobParameters);
  }

  get isModifyAction(): boolean {
  return JobConfigUtil.isModifyAction(this.jobParameters);
  }

  get needsModificationOptions(): boolean {
    // Preserve existing semantics using util-backed checks
    return JobConfigUtil.isModifyAction(this.jobParameters)
      && JobConfigUtil.hasSearchParameter(this.jobParameters)
      && !JobConfigUtil.hasModificationParameter(this.jobParameters);
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

  // Public selector getters for template clarity
  get actionParam() {
    return this.jobParameters.find(p => p.id === 'action') as Extract<JobParameter, { id: 'action' }> | undefined;
  }

  get textSearchParam() {
    return this.getTextParam();
  }

  get dateRangeParam() {
    return this.getDateParam();
  }

  get creatorSearchParam() {
    return this.getCreatorParam();
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
    return JobConfigUtil.getTextParam(this.jobParameters) as Extract<JobParameter, { id: 'textSearch' }> | undefined;
  }

  private getDateParam() {
    return JobConfigUtil.getDateParam(this.jobParameters) as Extract<JobParameter, { id: 'dateRange' }> | undefined;
  }

  private getCreatorParam() {
    return JobConfigUtil.getCreatorParam(this.jobParameters) as Extract<JobParameter, { id: 'creatorSearch' }> | undefined;
  }

  private getPopupParam() {
    return JobConfigUtil.getPopupParam(this.jobParameters) as Extract<JobParameter, { id: 'popupSettings' }> | undefined;
  }

  private getUserViewableParam() {
    return JobConfigUtil.getUserViewableParam(this.jobParameters) as Extract<JobParameter, { id: 'userViewable' }> | undefined;
  }

  private getNoteTypeParam() {
    return JobConfigUtil.getNoteTypeParam(this.jobParameters) as Extract<JobParameter, { id: 'noteType' }> | undefined;
  }

  private buildSearchCriteria(): NoteSearchCriteria {
    const criteria = JobConfigUtil.buildSearchCriteria(this.jobParameters);
    // Supply current UI locale if not already provided
    return { ...criteria, locale: this.locale };
  }

  private buildModificationOptions(action: 'modify' | 'delete'): NoteModificationOptions & { makeUserViewable?: boolean } {
  return JobConfigUtil.buildModificationOptions(this.jobParameters, action);
  }

  findMatchingNotes(user: UserData): UserNote[] {
    return this.noteProcessingService.findMatchingNotes(user, this.buildSearchCriteria());
  }

  executeJob() {
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
    if (this.dateRangeSelectedButIncomplete) {
      this.alert.error('Please select both a start and end date.');
      return;
    }
    if (this.isModifyAction && (!this.hasModificationParameter || !this.hasConcreteModificationSelection)) {
      this.alert.error('Please select at least one concrete modification option.');
      return;
    }
    
    const actionParam = this.jobParameters.find(p => p.type === 'action') as Extract<JobParameter, { id: 'action' }> | undefined;
    
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
    const creatorParam = this.getCreatorParam();
    const popupParam = this.getPopupParam();
    const uvParam = this.getUserViewableParam();
    const noteTypeParam = this.getNoteTypeParam();

    this.jobConfiguration = {
      action: actionParam?.value || 'modify',
      searchCriteria: {
        textSearch: textParam?.value || null,
        dateRange: dateParam?.value || null,
        creatorSearch: creatorParam?.value || null
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
            tap(() => {
              userLog.updateSuccessful = true;
              this.processed++;
            }),
            catchError(error => {
              userLog.updateError = error.message || 'Unknown error';
              userLog.updateSuccessful = false;
              this.processed++;
              return of(null);
            })
          );
        } else {
          userLog.updateSuccessful = true; // No changes needed, so "successful"
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
        
        this.alert.success('Job completed.');
      }
    });
  }

  // Helper to get percentage complete for progress bar
  get percentComplete() {
    return Math.round((this.processed / this.recordsToProcess) * 100);
  }

  // Export processing results to CSV
  exportResultsToCsv() {
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
  return SetUtilService.getEntityTypes(this.currentEntities);
  }

  // Check if current page has sets
  get hasValidSets(): boolean {
  return SetUtilService.hasValidSets(this.currentEntities);
  }

  // Get available sets from current entities
  get availableSets(): Entity[] {
  return SetUtilService.availableSets(this.currentEntities);
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

  // Intake method selection handlers
  selectSetIntakeMethod() {
    this.intakeMethod = 'set';
  }

  selectFileIntakeMethod() {
    this.intakeMethod = 'file';
  }

  cancelFileUpload() {
    this.intakeMethod = 'select';
  }

  // Reset job state when choosing a different file
  resetJobFromFile() {
    // Clear user data
    this.userDetails = [];
    this.usersWithNotes = [];
    this.usersWithoutNotes = [];
    
    // Reset job state
    this.processed = 0;
    this.recordsToProcess = 0;
    this.modifiedUsers = new Set();
    this.processLogs = [];
    this.jobParameters = [];
    this.menuOptions.forEach(option => option.available = true);
    this.jobExecuted = false;
    this.showResults = false;
    this.jobStartTime = null;
    this.jobEndTime = null;
    this.jobConfiguration = null;
    this.operationMode = 'choose';
    this.showDeleteAllConfirm = false;
    
    // Reset file upload tracking
    this.totalUsersLoaded = 0;
    this.totalUsersFailed = 0;
    this.failedUserIds = [];
    
    // Stay in file intake mode
    this.intakeMethod = 'file';
  }

  // Load users from file-provided user IDs
  loadUsersFromFile(userIds: string[]) {
    if (!userIds || userIds.length === 0) {
      this.alert.error('No user IDs provided');
      return;
    }

    this.loadingUsers = true;
    this.loading = true;
    this.userDetails = [];
    this.usersWithNotes = [];
    this.usersWithoutNotes = [];
    this.failedUserIds = [];

    let successCount = 0;
    let failCount = 0;
    const totalUsers = userIds.length;

    from(userIds).pipe(
      concatMap((userId: string) => {
        return this.userService.fetchUserDetails(userId).pipe(
          tap((user: UserData) => {
            successCount++;
            this.userDetails.push(user);
          }),
          catchError(error => {
            failCount++;
            this.failedUserIds.push(userId);
            console.error(`Error loading user ${userId}:`, error);
            return of(null);
          })
        );
      })
    ).subscribe({
      next: () => {},
      error: (error) => {
        this.loadingUsers = false;
        this.loading = false;
        this.alert.error('Error loading users: ' + (error.message || 'Unknown error'));
      },
      complete: () => {
        // Categorize users based on note availability
        const categorized = SetUsersService.categorize(this.userDetails);
        this.usersWithNotes = categorized.usersWithNotes;
        this.usersWithoutNotes = categorized.usersWithoutNotes;
        
        this.totalUsersLoaded = successCount;
        this.totalUsersFailed = failCount;
        
        this.loadingUsers = false;
        this.loading = false;
        this.intakeMethod = 'completed';
        this.usedIntakeMethod = 'file';
        
        if (this.usersWithNotes.length === 0) {
          // Don't show alert, let the UI handle displaying the message
          console.log(`Loaded ${successCount} users, but none have notes`);
        } else {
          let message = `Successfully loaded ${successCount} of ${totalUsers} users. ${this.usersWithNotes.length} have notes.`;
          if (failCount > 0) {
            this.alert.warn(message + ` ${failCount} user(s) failed to load.`);
          } else {
            this.alert.success(message);
          }
        }
      }
    });
  }

  // Load set data using the selected entity
  loadSetData() {
    if (!this.selectedSet) {
      this.alert.error('No set selected');
      return;
    }

  // Loading set data for selected set
    
    this.loading = true;
    this.loadingUsers = true;
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

  // Extract unique creators from all notes
  this.extractAvailableCreators();
        
        this.loading = false;
        this.loadingUsers = false;
        this.intakeMethod = 'completed';
        this.usedIntakeMethod = 'set';
      },
      error: (error) => {
        this.loading = false;
        this.loadingUsers = false;
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

  // Extract unique creators from all notes in the set
  extractAvailableCreators() {
    const creators = new Set<string>();
    
    for (const user of this.userDetails) {
      if (user.user_note && Array.isArray(user.user_note)) {
        for (const note of user.user_note) {
          if (note.created_by && note.created_by.trim()) {
            creators.add(note.created_by.trim());
          }
        }
      }
    }
    
    this.availableCreators = Array.from(creators).sort();
  }

  // Helper method to format note creation date (locale-aware, local timezone)
  formatNoteDate(note: UserNote): string {
  return DateUtilService.formatNoteDate(note, this.locale);
  }
}