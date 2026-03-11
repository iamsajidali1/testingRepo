import { Injectable } from '@angular/core';
import {
  HttpEvent, HttpInterceptor, HttpHandler, HttpRequest, HttpResponse
} from '@angular/common/http';

import { Observable } from 'rxjs';
import { ControllerService } from '../services/controller.service';


import { tap } from 'rxjs/operators';

/** Pass untouched request through to the next request handler. */
@Injectable()
export class RequestsInterceptor implements HttpInterceptor {
  constructor(private controllerService: ControllerService) {

  }

  intercept(req: HttpRequest<any>, next: HttpHandler):
    Observable<HttpEvent<any>> {
    this.controllerService.getAuthHeaders();

    const headers = req.headers.set('Cache-Control',
      'no-cache, no-store, must-revalidate, post- check=0, pre-check=0')
      .set('Pragma', 'no-cache')
      .set('Expires', '0')
      .set('xsrf-token', this.controllerService.getCSRFTokenString());

    const requestChanged = req.clone({
      headers,
      withCredentials: true
    })
    // All other internal API
    return next.handle(requestChanged).pipe(
      tap(
        event => this.handleResponse(requestChanged, event),
        error => this.handleError(requestChanged, error)
      )
    );
  }


  handleResponse(req: HttpRequest<any>, event) {

    if (event instanceof HttpResponse) {
      if (event.headers.get('xsrf-token')) {
        document.cookie = 'xsrf-token' + '=' + event.headers.get('xsrf-token') + ';SameSite=Strict'
      }
    }
  }

  handleError(req: HttpRequest<any>, event) {
    console.error('Request for ', req.url,
      ' Response Status ', event.status,
      ' With error ', event.error);
  }

}
