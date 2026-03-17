import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { map } from 'rxjs';

@Injectable()
export class StepperService {
  constructor(private http: HttpClient) {}

  loadSteps(workflowId: number) {
    const params = new HttpParams().set('workflowId', workflowId);
    return this.http
      .get<any>(environment.CSS_CONTROLLER + '/gui/steps-config', {
        params
      })
      .pipe(map((res) => res.result));
  }
}
