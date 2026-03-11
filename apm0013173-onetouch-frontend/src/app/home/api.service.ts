import { Injectable } from '@angular/core';
import { HttpClient} from '@angular/common/http';
import {environment} from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})

export class ApiService {

  constructor(private httpClient: HttpClient) { }

  public getFTDataByHostname(hostname: string) {
    return this.httpClient
        .get(environment.API_ONETOUCH_CORE + '/config/' + hostname);
  }

  public bootstrapDevice(serial: string, jdmip: string) {
    return this.httpClient
        .post(environment.API_ONETOUCH_CORE + '/bootstrap/', { serial, jdmip });
  }

  public verifyReachability(address: string) {
    return this.httpClient
        .post(environment.API_ONETOUCH_CORE + '/ping/', {address});
  }

}
