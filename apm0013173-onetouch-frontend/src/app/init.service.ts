import { Injectable } from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {environment} from '../environments/environment';
import {UserModel} from './models/user.model';

@Injectable({
  providedIn: 'root'
})
export class InitService {
  user: {
    id: string | null;
    details: UserModel;
  } = { id: null, details: null };
  constructor(private http: HttpClient) {}

  /**
   * Getter Setter Methods for UserId
   */
  get userId() {
    return this.user.id;
  }
  set userId(id: string) {
    this.user.id = id;
  }

  /**
   * Getter & Setter Methods for User Details
   */
  get userDetails() {
    return this.user.details;
  }
  set userDetails(details: any) {
    this.user.details = details;
  }

  /**
   * To send cookies and authenticate with backend
   */
  authenticate() {
    const urlParams = new URLSearchParams(window.location.search);
    const state: string = urlParams.get('state');
    const code: string = urlParams.get('code');
    let params = new HttpParams();
    params = params.append('state', state);
    params = params.append('code', code);
    return this.http.get<any>(environment.API_CSS_CONTROLLER + '/login', {
      withCredentials: true,
      params: params
    });
  }

  init() {
    return new Promise<void>((resolve, reject) => {
      this.authenticate().subscribe({
        next: (data) => {
          // Set the User Details
          if ('userId' in data) {
            this.userId = data.userId;
          }
          if ('userDetails' in data) {
            this.userDetails = data.userDetails;
          }
          return resolve(data);
        },
        error: (err: any) => {
          let message =
              'Oops! Unhandled error occurred, please refresh or contact support!';
          if (err.status === 401 || err.status === 403) {
            message =
                err.error.message ||
                'Unauthorised! Unable to authenticate. Please retry login!';
          }
          
          window.location.replace(environment.OIDC_REDIRECT + `state=${err.error.state}`);
          return reject(new Error(message));
        }
      });
    });
  }
}
