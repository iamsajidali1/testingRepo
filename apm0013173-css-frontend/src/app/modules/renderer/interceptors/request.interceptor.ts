import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpResponse,
  HttpErrorResponse
} from '@angular/common/http';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { CookieService } from 'ngx-cookie-service';

@Injectable()
export class RequestInterceptor implements HttpInterceptor {
  constructor(private cookieService: CookieService) {}

  handleResponse(_req: HttpRequest<any>, event: HttpEvent<any>) {
    if (event instanceof HttpResponse) {
      if (event.headers.get('xsrf-token')) {
        this.cookieService.set(
          'xsrf-token',
          event.headers.get('xsrf-token'),
          null,
          null,
          null,
          null,
          'Strict'
        );
      }
    }
  }

  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    // If the request is not to the AT&T Server
    const url = new URL(request.url);
    if (!url.hostname.includes('att.com')) {
      return next.handle(request);
    }
    const headers = request.headers
      .set(
        'Cache-Control',
        'no-cache, no-store, must-revalidate, post- check=0, pre-check=0'
      )
      .set('Pragma', 'no-cache')
      .set('Expires', '0')
      .set('xsrf-token', this.cookieService.get('xsrf-token'));
    const interceptedRequest = request.clone({
      headers,
      withCredentials: true
    });
    return next.handle(interceptedRequest).pipe(
      catchError((error: HttpErrorResponse) => {
        let errorMessage: string = '';
        if (error.error instanceof ErrorEvent) {
          // client-side error
          errorMessage = `Error: ${error.error.message}`;
        } else {
          // server-side error
          if ('error' in error && 'message' in error.error) {
            errorMessage = `Error: ${error.error.message}`;
          } else {
            errorMessage = `Error: ${error.message}`;
          }
        }
        return throwError(() => errorMessage);
      }),
      tap((event) => this.handleResponse(interceptedRequest, event))
    );
  }
}
