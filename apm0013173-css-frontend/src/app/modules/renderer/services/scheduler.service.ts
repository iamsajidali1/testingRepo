import { Injectable } from '@angular/core';
import { concatMap, from, Observable, scan, takeWhile, tap, timer } from 'rxjs';
import { SchedulerResponseModel } from '../models/scheduler.model';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Injectable()
export class SchedulerService {
  constructor(private http: HttpClient) {}

  /**
   * Get results from a scheduled Process by pid
   * @param pid
   * @returns Observable of type SchedulerResponseModel
   */
  getScheduledProcess(pid: string): Observable<SchedulerResponseModel> {
    const params = new HttpParams().set('id', pid);
    return this.http.get<SchedulerResponseModel>(
      environment.CSS_CONTROLLER + '/scheduler/',
      { params }
    );
  }

  /**
   * Get results from a scheduled Process by id for BLOBS
   * @param id
   * @param typeOfResponse
   * @returns Observable of type ArrayBuffer
   */
  getScheduledProcessAsBlob(id: string, typeOfResponse: string) {
    return this.http.post<ArrayBuffer>(
      environment.CSS_CONTROLLER + '/scheduler/',
      { id, typeOfResponse },
      { observe: 'response', responseType: 'arraybuffer' as 'json' }
    );
  }

  schedulerAttemptsGuardFactory(maxAttempts: number) {
    return (attemptsCount: number) => {
      if (attemptsCount > maxAttempts) {
        throw new Error('Exceeded maxAttempts for LongPolling to Scheduler!');
      }
    };
  }

  schedulerTakeWhile = (res: SchedulerResponseModel | any) =>
    res.status === 'enrolled';

  schedulerPoll(
    pid: string,
    interval: number = environment.LONG_POLLING_INTERVAL,
    startDue: number = environment.LONG_POLLING_INTERVAL,
    maxAttempts = Infinity
  ) {
    return from(
      new Promise((resolve, reject) => {
        timer(startDue, interval)
          .pipe(
            scan((attempts) => ++attempts, 0),
            tap(this.schedulerAttemptsGuardFactory(maxAttempts)),
            concatMap(() => this.getScheduledProcess(pid)),
            takeWhile(this.schedulerTakeWhile, true)
          )
          .subscribe({
            next: (response) => {
              const { code, status, result } = response;
              // If the status is 'enrolled', it's still in progress
              if (status === 'enrolled') return;
              if (code === '200' && status === 'OK') {
                const parsedResult = JSON.parse(result);
                if (parsedResult) {
                  return resolve(parsedResult);
                }
                return reject(
                  new Error(`Something is not right, No Data Received!`)
                );
              } else {
                return reject(
                  new Error(`Something is not right, Internal Server Error!`)
                );
              }
            },
            error: (err) => reject(new Error(err.error))
          });
      })
    );
  }

  schedulerPollForBlob(
    pid: string,
    responseType: string,
    interval: number = environment.LONG_POLLING_BULK_INTERVAL,
    startDue: number = environment.LONG_POLLING_BULK_INTERVAL,
    maxAttempts = Infinity
  ) {
    return from(
      new Promise((resolve, reject) => {
        timer(startDue, interval)
          .pipe(
            scan((attempts) => ++attempts, 0),
            tap(this.schedulerAttemptsGuardFactory(maxAttempts)),
            concatMap(() => this.getScheduledProcessAsBlob(pid, responseType)),
            takeWhile(this.schedulerTakeWhile, true)
          )
          .subscribe({
            next: (response) => {
              const { status, statusText, body } = response;
              // If the status is 'enrolled', it's still in progress
              if (statusText === 'enrolled') return;
              if (status === 200 && statusText === 'OK') {
                if (body) {
                  return resolve(body);
                }
                return reject(
                  new Error(`Something is not right, No Data Received!`)
                );
              } else {
                return reject(
                  new Error(`Something is not right, Internal Server Error!`)
                );
              }
            },
            error: (err) => reject(new Error(err.error))
          });
      })
    );
  }
}
