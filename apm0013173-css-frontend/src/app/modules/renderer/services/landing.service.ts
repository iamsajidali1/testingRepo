import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { map, Observable } from 'rxjs';
import { AddressModel } from '../models/address.model';
import { CommonResponseModel } from '../models/response.model';
import { ActionModel } from '../models/action.model';

@Injectable()
export class LandingService {
  constructor(private http: HttpClient) {}

  getCustomersForUser(attuid: string) {
    const params = new HttpParams().set('attuid', attuid);
    return this.http
      .get<CommonResponseModel>(
        environment.CSS_CONTROLLER + '/user-service/customer/user',
        { params }
      )
      .pipe(
        map((res: CommonResponseModel) =>
          res.result.map((customer) => ({
            id: customer['CUSTOMER_ID'],
            name: customer['NAME']
          }))
        )
      );
  }

  getCustomerForBcUser() {
    return this.http
      .get<CommonResponseModel>(
        environment.CSS_CONTROLLER + '/customer/bc-user'
      )
      .pipe(map((res: any) => res.result));
  }

  getServicesForCustomer(customerId?: number, attuid?: string) {
    let params = new HttpParams();
    let endpoint =
      environment.CSS_CONTROLLER + '/service/customer/template/user';
    if (customerId && attuid) {
      params = new HttpParams()
        .set('customerId', customerId)
        .set('attuid', attuid);
      endpoint = endpoint + '/attuid/';
    } else {
      endpoint = endpoint + '/bc-user/';
    }
    return this.http.get<CommonResponseModel>(endpoint, { params }).pipe(
      map((res: CommonResponseModel) =>
        res.result.map((service) => ({
          id: service['SERVICE_ID'],
          name: service['NAME']
        }))
      )
    );
  }

  getDevices(customerId?: number) {
    let params = new HttpParams();
    if (customerId) {
      params = new HttpParams().set('customerId', customerId);
    }
    return this.http.get<CommonResponseModel>(
      environment.CSS_CONTROLLER + '/cache/devices',
      {
        params
      }
    );
  }

  getActions(
    serviceId?: number,
    customerId?: number,
    attuid?: string
  ): Observable<ActionModel[]> {
    let params = new HttpParams();
    let endpoint =
      environment.CSS_CONTROLLER + '/action-templates/service/customer-service';
    if (serviceId && customerId && attuid) {
      params = new HttpParams()
        .set('serviceId', serviceId)
        .set('customerId', customerId)
        .set('attuid', attuid);
      endpoint = endpoint + '/user/';
    } else if (serviceId) {
      params = new HttpParams().set('serviceId', serviceId);
      endpoint = endpoint + '/bc-user/';
    }
    return this.http
      .get<CommonResponseModel>(endpoint, { params })
      .pipe(
        map((res: CommonResponseModel) =>
          res.result.map((action) => ({
            id: action['ID'],
            name: action['NAME'],
            questions: action['QUESTIONS']
              ? JSON.parse(action['QUESTIONS'])
              : [],
            validationCommands: action['VALIDATION'],
            description: action['DESCRIPTION'],
            isStaticHost: action['STATICHOSTNAMECHECKBOX'],
            staticHostname: action['STATICHOSTNAME'],
            carcheTemplate: action['CARCHETEMPLATE']
              ? JSON.parse(action['CARCHETEMPLATE'])
              : null,
            vendorType: action['VENDOR_TYPE'],
            services: action['SERVICE_NAME'],
            workflow: action['WORKFLOW'],
            workflowId: action['WORKFLOW_ID'],
            enabled: action['ENABLED'],
            minRollbackTimer: action['MIN_ROLLBACK_TIMER'],
            maxRollbackTimer: action['MAX_ROLLBACK_TIMER']
          }))
        )
      )
      .pipe(
        map((res: ActionModel[]) => res.filter((action) => action.enabled))
      );
  }

  getDeviceGeoLoc(address: AddressModel) {
    const httpParams = new HttpParams()
      .set('maxResults', '5')
      .set('key', environment.BING_API_KEY);
    const { street, city, state, zip } = address;
    let addressString = '/';
    if (state && state.trim()) addressString += `${state.trim()}/`;
    if (zip && zip.trim()) addressString += `${zip.trim()}/`;
    if (city && city.trim()) addressString += `${city.trim()}/`;
    if (street && street.trim()) addressString += `${street.trim()}/`;
    return this.http.get(environment.BING_GEOCODING + addressString, {
      params: httpParams
    });
  }
}
