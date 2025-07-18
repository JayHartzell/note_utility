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
    console.log('Fetching set info for set ID:', setID);
    return this.restService.call(`/conf/sets/${setID}`);
  }

  /**
   * Fetch members of a set with pagination
   * @param setID The ID of the set
   * @param offset The offset for pagination
   * @param limit The limit for pagination (default: 100)
   */
  fetchSetMembers(setID: string, offset: number = 0, limit: number = 100): Observable<any> {
    console.log(`Fetching set members page with offset ${offset} for set ${setID}`);
    return this.restService.call(`/conf/sets/${setID}/members?limit=${limit}&offset=${offset}`);
  }

  /**
   * Validate if a set ID is valid
   * @param id The set ID to validate
   */
  isValidSetId(id: string): boolean {
    // Less restrictive validation - just check if it's a number
    // Some set IDs might be shorter than 12 digits
    return /^\d+$/.test(id.trim());
  }

  /**
   * Sanitize input by trimming whitespace
   * @param input The input string to sanitize
   */
  sanitizeInput(input: string): string {
    return input.trim();
  }

  /**
   * Check if a set contains users
   * @param setInfo The set information object
   */
  isUserSet(setInfo: SetInfo): boolean {
    return setInfo.content?.value === 'USER';
  }
}
