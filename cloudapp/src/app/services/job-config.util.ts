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
    return !!(start || end);
  }

  static hasValidSearchSelection(params: JobParameter[]): boolean {
    return this.hasTextSearch(params) || this.hasDateRangeWithValue(params);
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
    const textParam = params.find(p => (p as any).id === 'textSearch') as any;
    const dateParam = params.find(p => (p as any).id === 'dateRange') as any;
    const searchText = textParam?.value?.text || '';
    const caseSensitive = textParam?.value?.caseSensitive || false;
  const matchMode = textParam?.value?.matchMode || 'substring';
  const ignoreAccents = (textParam?.value?.ignoreAccents ?? true) as boolean;
    const startDate = dateParam?.value?.startDate || '';
    const endDate = dateParam?.value?.endDate || '';
    const searchByDate = !!dateParam && (!!startDate || !!endDate);
  // locale is assigned by caller (component) if needed
  return { searchText, caseSensitive, matchMode, ignoreAccents, searchByDate, startDate, endDate } as NoteSearchCriteria;
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
