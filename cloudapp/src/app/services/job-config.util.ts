import { JobParameter, NoteModificationOptions, NoteSearchCriteria } from '../interfaces/note.interface';

/**
 * utilities for validating and deriving state from job parameters.
 * 
 */
export class JobConfigUtil {
  // Selectors
  static getParam<TId extends JobParameter['id']>(params: JobParameter[], id: TId) {
    return params.find(p => p.id === id) as any;
  }

  static getActionParam(params: JobParameter[]) { return this.getParam(params, 'action'); }
  static getTextParam(params: JobParameter[]) { return this.getParam(params, 'textSearch'); }
  static getDateParam(params: JobParameter[]) { return this.getParam(params, 'dateRange'); }
  static getCreatorParam(params: JobParameter[]) { return this.getParam(params, 'creatorSearch'); }
  static getPopupParam(params: JobParameter[]) { return this.getParam(params, 'popupSettings'); }
  static getUserViewableParam(params: JobParameter[]) { return this.getParam(params, 'userViewable'); }
  static getNoteTypeParam(params: JobParameter[]) { return this.getParam(params, 'noteType'); }
  static hasActionParameter(params: JobParameter[]): boolean {
    return params.some(p => p.type === 'action');
  }

  static isModifyAction(params: JobParameter[]): boolean {
    return params.some(p => p.type === 'action' && (p as any).value === 'modify');
  }

  static hasSearchParameter(params: JobParameter[]): boolean {
    return params.some(p => p.type === 'search' || p.type === 'dateRange');
  }

  static hasCreatorSearch(params: JobParameter[]): boolean {
    const creatorParam = params.find(p => (p as any).id === 'creatorSearch') as any;
    const selectedCreators = creatorParam?.value?.selectedCreators ?? [];
    return Array.isArray(selectedCreators) && selectedCreators.length > 0;
  }

  static creatorSearchSelectedButEmpty(params: JobParameter[]): boolean {
    const creatorParam = params.find(p => (p as any).id === 'creatorSearch') as any;
    if (!creatorParam) return false;
    const selectedCreators = creatorParam.value?.selectedCreators ?? [];
    return Array.isArray(selectedCreators) && selectedCreators.length === 0;
  }

  static hasTextSearch(params: JobParameter[]): boolean {
    const textParam = params.find(p => (p as any).id === 'textSearch') as any;
    const text = textParam?.value?.text ?? '';
    return typeof text === 'string' && text.trim().length > 0;
  }

  static textSearchSelectedButEmpty(params: JobParameter[]): boolean {
    const textParam = params.find(p => (p as any).id === 'textSearch') as any;
    if (!textParam) return false;
    const text = textParam.value?.text ?? '';
    return !(typeof text === 'string' && text.trim().length > 0);
  }

  static hasDateRangeWithValue(params: JobParameter[]): boolean {
    const dateParam = params.find(p => (p as any).id === 'dateRange') as any;
    if (!dateParam) return false;
    const start = dateParam.value?.startDate;
    const end = dateParam.value?.endDate;
    // Both start and end must be provided to consider date filter valid
    return !!(start && end);
  }

  static hasValidSearchSelection(params: JobParameter[]): boolean {
    return this.hasTextSearch(params) || this.hasDateRangeWithValue(params) || this.hasCreatorSearch(params);
  }

  /**
   * True when a date range parameter is selected but only one bound is provided.
   * Used to guide the user to select both start and end dates.
   */
  static dateRangeSelectedButIncomplete(params: JobParameter[]): boolean {
    const dateParam = params.find(p => (p as any).id === 'dateRange') as any;
    if (!dateParam) return false;
    const start = dateParam.value?.startDate;
    const end = dateParam.value?.endDate;
    const hasStart = !!start;
    const hasEnd = !!end;
    return (hasStart !== hasEnd); // exactly one provided
  }

  static hasModificationParameter(params: JobParameter[]): boolean {
    return params.some(p => p.type === 'modification');
  }

  static hasConcreteModificationSelection(params: JobParameter[]): boolean {
    const popup = params.find(p => (p as any).id === 'popupSettings') as any;
    const noteType = params.find(p => (p as any).id === 'noteType') as any;
    const userViewable = params.find(p => (p as any).id === 'userViewable') as any;

    const popupSelected = !!(popup && popup.value && (popup.value.makePopup === true || popup.value.disablePopup === true));
    const noteTypeSelected = !!(noteType && noteType.value);
    const userViewableSelected = !!(userViewable && userViewable.value && typeof userViewable.value.makeUserViewable === 'boolean');

    return popupSelected || noteTypeSelected || userViewableSelected;
  }

  // Builders
  static buildSearchCriteria(params: JobParameter[]): NoteSearchCriteria {
    const textParam = this.getTextParam(params);
    const dateParam = this.getDateParam(params);
    const creatorParam = this.getCreatorParam(params);

    // Extract search text
    const searchText = textParam?.value?.text || '';
    
    // Extract date range - Convert Date objects to YYYY-MM-DD strings
    const startDateObj = dateParam?.value?.startDate;
    const endDateObj = dateParam?.value?.endDate;
    
    // Convert Date objects to YYYY-MM-DD format strings
    const startDate = startDateObj instanceof Date ? 
      startDateObj.toISOString().split('T')[0] : 
      (typeof startDateObj === 'string' ? startDateObj : '');
      
    const endDate = endDateObj instanceof Date ? 
      endDateObj.toISOString().split('T')[0] : 
      (typeof endDateObj === 'string' ? endDateObj : '');
    
    const searchByDate = !!dateParam && !!startDate && !!endDate;

    // Extract creator search - Fixed: properly extract selectedCreators array
    const selectedCreators = creatorParam?.value?.selectedCreators || [];
    const searchByCreator = !!creatorParam && Array.isArray(selectedCreators) && selectedCreators.length > 0;

    return {
      searchText,
      searchByDate,
      startDate,
      endDate,
      searchByCreator,
      selectedCreators,
      // Text search options from textParam
      caseSensitive: textParam?.value?.caseSensitive || false,
      matchMode: textParam?.value?.matchMode || 'substring',
      ignoreAccents: textParam?.value?.ignoreAccents !== false,
      segmentType: 'Internal' // Default segment filter
    };
  }

  static buildModificationOptions(
    params: JobParameter[],
    action: 'modify' | 'delete'
  ): NoteModificationOptions & { makeUserViewable?: boolean } {
    const popup = params.find(p => (p as any).id === 'popupSettings') as any;
    const uv = params.find(p => (p as any).id === 'userViewable') as any;
    const nt = params.find(p => (p as any).id === 'noteType') as any;
    const opts: NoteModificationOptions & { makeUserViewable?: boolean } = {
      action,
      makePopup: popup?.value?.makePopup || false,
      disablePopup: popup?.value?.disablePopup || false,
      noteType: nt?.value || undefined,
      deleteMatchingNotes: action === 'delete'
    };
    if (uv && typeof uv.value?.makeUserViewable === 'boolean') {
      opts.makeUserViewable = uv.value.makeUserViewable;
    }
    return opts;
  }
}
