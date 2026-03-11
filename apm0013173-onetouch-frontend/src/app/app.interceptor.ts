import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor, HttpErrorResponse
} from '@angular/common/http';
import { Observable } from 'rxjs';
import {environment} from '../environments/environment';
import {tap} from 'rxjs/operators';

@Injectable()
export class AppInterceptor implements HttpInterceptor {
  constructor() {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    // add auth header with Each request for this API
    request = request.clone({ withCredentials: true });
    return next.handle(request).pipe(tap(() => {},
        (err: any) => {
          // if (err instanceof HttpErrorResponse) {
          //   if (err.status === 401 || err.status === 403) {
          //     console.log('Unauthorised! Redirecting to Global Logon!');
          //     window.location.replace(environment.OIDC_REDIRECT + err.error.state);
          //   } else { return; }
          // }
        }));
  }
}
