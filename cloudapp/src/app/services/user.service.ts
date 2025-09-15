import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CloudAppRestService, HttpMethod } from '@exlibris/exl-cloudapp-angular-lib';
import { UserData } from '../interfaces/user.interface';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  
  constructor(private restService: CloudAppRestService) {}

  /**
   * Fetch details for a specific user
   * @param userId The ID of the user to fetch
   */
  fetchUserDetails(userId: string): Observable<UserData> {
    return this.restService.call(`/users/${userId}`);
  }

  /**
   * Update a user's information - SAFE approach
   * @param userId The ID of the user to update
   * @param userData The updated user data
   */
  updateUser(userId: string, userData: UserData): Observable<any> {
    // Create the request 
    const request = {
      url: `/users/${userId}`,
      method: HttpMethod.PUT,
      requestBody: userData  // Send the entire user object as-is
    };
    
    return this.restService.call(request);
  }

  /**
   * Check if a user has an error
   * @param user The user object to check
   */
  hasError(user: UserData): boolean {
    return !user || !!user.error;
  }

  /**
   * Get user display name
   * @param user The user object
   */
  getDisplayName(user: UserData): string {
    return user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.primary_id;
  }
}
