import { Inject, Injectable, Renderer2 } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { UserModel } from '../models/user.model';
import { concatMap, forkJoin, map, tap } from 'rxjs';
import { BcContextModel } from '../modules/renderer/models/state.model';
import { DOCUMENT } from '@angular/common';

@Injectable()
export class InitService {
  user: {
    id: string | null;
    details: UserModel;
  } = { id: null, details: null };

  sessionId: string;
  bcContextData: BcContextModel;

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private http: HttpClient
  ) {}

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
   * Getter Setter Methods for SessionId
   */
  get session() {
    return this.sessionId;
  }
  set session(sessionId: string) {
    this.sessionId = sessionId;
  }

  /**
   * Getter Setter Methods for BC Context
   */
  get bcContext() {
    return this.bcContextData;
  }
  set bcContext(context: any) {
    this.bcContextData = context;
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
    return this.http.get<any>(environment.CSS_CONTROLLER + '/login', {
      withCredentials: true,
      params: params
    });
  }

  /**
   * To get the Session data
   * @returns string cookie data
   */
  fetchSessions() {
    const endpoint = `${environment.CSS_CONTROLLER}/cookieReader`;
    const options: any = {
      withCredentials: true,
      observe: 'response',
      responseType: 'text' as 'json'
    };
    return forkJoin([
      this.http.get<any>(`${endpoint}/sessionId/`, options),
      this.http.get<any>(`${endpoint}/bcSession/`, options)
    ]).pipe(
      map((sesResponses) => sesResponses.map((response: any) => response.body))
    );
  }

  /**
   * App Init Logic
   */
  init() {
    return new Promise<void>((resolve, reject) => {
      // get the Error Element by using query selector
      const errorMsgElement = document.querySelector('#errorMsgElement');
      // The cookie is Set; Call for Auth to Validate
      errorMsgElement.className = '';
      this.authenticate()
        .pipe(
          tap((data) => {
            // Set the User Details
            if ('userId' in data) {
              this.userId = data.userId;
            }
            if ('userDetails' in data) {
              this.userDetails = data.userDetails;
            }
          }),
          concatMap(() => this.fetchSessions())
        )
        .subscribe({
          next: ([session, bcContext]) => {
            this.session = session;
            this.bcContext = bcContext ? JSON.parse(bcContext) : {};
            return resolve();
          },
          error: (err: any) => {
            let message =
              'Oops! Unhandled error occurred, please refresh or contact support!';
            if (err.status === 401 || err.status === 403) {
              const redirectPath = window.location.href.includes(
                '/ebiz/gda/css'
              )
                ? environment.BC_HOME
                : environment.OIDC_REDIRECT + `state=${err.error.state}`;
              window.location.replace(redirectPath);
              message =
                err.error.message ||
                'Unauthorised! Unable to authenticate. Please retry login!';
            }
            errorMsgElement.className = 'error-message-div';
            errorMsgElement.textContent = message;
            return reject(new Error(message));
          }
        });
    });
  }

  /**
   * Append the JS tag to the Document Body.
   * @param renderer The Angular Renderer
   * @param src The path to the script
   * @returns the script element
   */
  public loadJsScript(renderer: Renderer2, src: string): HTMLScriptElement {
    const script = renderer.createElement('script');
    script.type = 'text/javascript';
    script.charset = 'utf-8';
    script.src = src;
    renderer.appendChild(this.document.body, script);
    return script;
  }
}
