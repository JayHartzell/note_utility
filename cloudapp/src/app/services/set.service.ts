import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CloudAppRestService } from '@exlibris/exl-cloudapp-angular-lib';
import { SetInfo } from '../interfaces/note.interface';

@Injectable({
  providedIn: 'root'
})
export class SetService {
  
  constructor(private restService: CloudAppRestService) {}

  /**
   * Fetch information about a set
   * @param setID The ID of the set to fetch
   */
  fetchSetInfo(setID: string): Observable<SetInfo> {
    return this.restService.call(`/conf/sets/${setID}`);
  }

  /**
   * Fetch members of a set with pagination
   * @param setID The ID of the set
   * @param offset The offset for pagination
   * @param limit The limit for pagination (default: 100)
   */
  fetchSetMembers(setID: string, offset: number = 0, limit: number = 100): Observable<any> {
    return this.restService.call(`/conf/sets/${setID}/members?limit=${limit}&offset=${offset}`);
  }

  // Removed debug helpers (isValidSetId, sanitizeInput) as unused

  /**
   * Check if a set contains users
   * @param setInfo The set information object
   */
  isUserSet(setInfo: SetInfo): boolean {
    return setInfo.content?.value === 'USER';
  }
}
