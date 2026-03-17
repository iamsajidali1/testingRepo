import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot,
  UrlTree
} from '@angular/router';
import { Observable } from 'rxjs';
import { StateService } from '../services/state.service';

@Injectable({
  providedIn: 'root'
})
export class StepGuard implements CanActivate {
  constructor(private stateService: StateService, private router: Router) {}
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ):
    | Observable<boolean | UrlTree>
    | Promise<boolean | UrlTree>
    | boolean
    | UrlTree {
    // Check if the data-collection with transactionId
    if (
      state.url.includes('data-collection') &&
      'transactionId' in route.queryParams
    ) {
      return true;
    }
    if (!this.stateService.inputParams) {
      return this.router.navigate(['/']);
    }
    return true;
  }
}
