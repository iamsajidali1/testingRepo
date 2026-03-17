import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { SchedulerStatusModel } from '../models/scheduler.model';
import { concatMap, map, Observable } from 'rxjs';
import { SchedulerService } from './scheduler.service';
import { ValidationModel } from '../models/validation.model';

@Injectable()
export class CoreService {
  constructor(
    private http: HttpClient,
    private schedulerService: SchedulerService
  ) {}

  /**
   * To activate LAN of the selected device
   * @returns Observable<SchedulerResponseModel>
   */
  activateLan() {
    const headers = new HttpHeaders().set('one-type', 'transaction');
    return this.http
      .post<SchedulerStatusModel>(
        environment.CSS_CONTROLLER + '/lan-migration/',
        {},
        { headers }
      )
      .pipe(concatMap((data) => this.schedulerService.schedulerPoll(data.pid)));
  }

  /**
   * To Check Availability of the Device
   * @param hostname
   * @param customerId
   * @param serviceId
   * @returns string 'success' | 'failed'
   */
  checkAvailability(hostname: string, customerId: number, serviceId: number) {
    const params = new HttpParams()
      .set('hostname', hostname)
      .set('customerId', customerId)
      .set('serviceId', serviceId);
    return this.http.get(
      environment.CSS_CONTROLLER + '/check-device-availability',
      { params }
    );
  }

  /**
   * To get the Session data for a Cookie
   * @param cookie
   * @returns string cookie data
   */
  cookieReader(cookie: string) {
    return this.http
      .get<any>(environment.CSS_CONTROLLER + `/cookieReader/${cookie}/`, {
        observe: 'response',
        responseType: 'text' as 'json'
      })
      .pipe(map((response) => response.body));
  }

  /**
   * To confirm the push configuration changes
   * @returns Observable<SchedulerResponseModel>
   */
  confirmChanges() {
    const headers = new HttpHeaders().set('one-type', 'transaction');
    return this.http
      .get<SchedulerStatusModel>(
        environment.CSS_CONTROLLER + '/confirm-change/',
        { headers }
      )
      .pipe(concatMap((data) => this.schedulerService.schedulerPoll(data.pid)));
  }

  /**
   * To create a new Transaction for Long Polling Scheduler
   * @param type
   * @param actionId
   * @param serviceId
   * @param customerId
   * @param hostname
   * @param vcoUrl
   * @returns { message: string } either success or failed
   */
  createTransaction(
    type: string,
    actionId: number,
    serviceId: number,
    customerId?: number,
    hostname?: string,
    vcoUrl?: string
  ) {
    const headers = new HttpHeaders().set('one-type', 'transaction');
    let params = new HttpParams()
      .set('dataCollection', type)
      .set('actionId', actionId)
      .set('serviceId', serviceId);
    if (customerId) params = params.append('customerId', customerId);
    if (hostname) params = params.append('hostname', hostname);
    if (vcoUrl) params = params.append('vco_url', vcoUrl);

    return this.http.get<{ message: string }>(
      environment.CSS_CONTROLLER + '/transaction/',
      { headers, params }
    );
  }

  /**
   * Create Users in the VCO
   * @param credentials VCO credentials to be used
   * @param templateId Carche Template id to be Used
   * @param templateUUID Carche template UUID
   * @returns Observable<SchedulerResponseModel>
   */
  createVcoUsers(credentials: any, templateId: number, templateUUID: number) {
    const headers = new HttpHeaders().set('one-type', 'transaction');
    return this.http
      .post<any>(
        environment.CSS_CONTROLLER + '/vco-users/',
        {
          credentials,
          templateId,
          templateUUID
        },
        {
          headers
        }
      )
      .pipe(concatMap((data) => this.schedulerService.schedulerPoll(data.pid)));
  }

  /**
   * To Disable the Action by Action ID
   * @param actionId
   */
  disableAction(actionId: number): Observable<any> {
    return this.http.put<any>(
      environment.CSS_CONTROLLER + '/action-template/disable-action/',
      { actionId }
    );
  }

  /**
   * Generate the configuration using cArche
   * @param templateName
   * @param variables
   * @param extras usually used for repeated non-linear data such as array
   * @returns Observable<CarcheResponse>
   */
  generateConfig(templateName: string, variables: any, extras?: any) {
    const headers = new HttpHeaders().set('one-type', 'transaction');
    // create standard body object
    let body = {
      globals: { templatefile: templateName },
      main_data: { outputtofile: 'yes', ...variables }
    };
    // add the extraData if it is passed
    if (extras) {
      body = { ...body, ...extras };
    }
    return this.http.post(
      environment.CSS_CONTROLLER + '/cArche/config/',
      body,
      { headers }
    );
  }

  /**
   * To generate device report such as MDS using Camunda
   * @param data lists
   */
  generateDeviceReports(data: any) {
    const headers = new HttpHeaders().set('one-type', 'transaction');
    return this.http.post<any[]>(
      environment.CSS_CONTROLLER + '/sdwan/generate-report',
      { data },
      { headers }
    );
  }

  /**
   * To get the MDS Configuration
   * @param credentials
   * @param typeOfResponse
   * @returns Observable<SchedulerResponseModel>
   */
  generateMdsConfig(credentials: any, typeOfResponse: string) {
    const headers = new HttpHeaders().set('one-type', 'transaction');
    const params = new HttpParams().set('specialType', typeOfResponse);
    return this.http
      .post<any>(
        environment.CSS_CONTROLLER + '/mds/',
        { credentials },
        { headers, params }
      )
      .pipe(
        concatMap((data) =>
          this.schedulerService.schedulerPollForBlob(data.pid, typeOfResponse)
        )
      );
  }

  /**
   * To generate utilisation report such as CPU, Memory
   * @param data lists
   */
  generateUtilizationReport(data: any) {
    const headers = new HttpHeaders().set('one-type', 'transaction');
    return this.http.post<any[]>(
      environment.CSS_CONTROLLER + '/velo-suite/utilisation-report',
      { data },
      { headers }
    );
  }

  generateNetworkStatistics() {
    const headers = new HttpHeaders().set('one-type', 'transaction');
    const params = new HttpParams().set('index', 'network-insights');
    return this.http.get<any[]>(
      environment.CSS_CONTROLLER + '/elasticstack/index-data',
      {
        headers,
        params
      }
    );
  }

  createBulkMacd(data: any) {
    const headers = new HttpHeaders().set('one-type', 'transaction');
    return this.http.post<any[]>(
      environment.CSS_CONTROLLER + '/velo-suite/bulk-macd',
      { data },
      {
        headers
      }
    );
  }

   generateBvoipReport(data: any) {
    const headers = new HttpHeaders().set('one-type', 'transaction');
    return this.http.post<any[]>(
      environment.CSS_CONTROLLER + '/generate-bvoip-report-data/',
      { data },
      {
        headers
      }
    );
  }

  /**
   * Get the list of Orchestrators
   * @returns Observable<StandardResponse>
   */
  getOrchestratorList() {
    const headers = new HttpHeaders().set('one-type', 'transaction');
    return this.http
      .get<any>(
        environment.CSS_CONTROLLER + '/service-to-customer/orchestartor-list/',
        {
          headers
        }
      )
      .pipe(map((response) => response.result))
      .pipe(
        map((response: any) =>
          response.map((vco: any) => ({
            name: vco.url,
            value: vco.url
          }))
        )
      );
  }

  /**
   * To Load the Action Template by Action Id
   * @param actionId { number }
   * @returns Observable<any>
   */
  loadActionTemplateById(actionId: number) {
    const params = new HttpParams().set('id', actionId);
    return this.http
      .get<any>(environment.CSS_CONTROLLER + '/action-template/', { params })
      .pipe(map((response) => response.result));
  }

  /**
   * To Load the Action Assigned Services
   * @param actionId { number }
   * @param type { string } type of action either customer or service
   * @returns Observable<any>
   */
  loadActionAssignedServices(actionId: number, type: string) {
    const params = new HttpParams().set('id', actionId).set('type', type);
    return this.http
      .get<any>(environment.CSS_CONTROLLER + '/action-template/services/', {
        params
      })
      .pipe(map((response) => response.result));
  }

  /**
   * To Load the Data Collection by TDC Is
   * @param tdcId { number }
   * @returns Observable<any>
   */
  loadDataCollectionByTdcId(tdcId: number) {
    const params = new HttpParams().set('tdcId', tdcId);
    return this.http
      .get<any>(environment.CSS_CONTROLLER + '/data-collection-record/', {
        params
      })
      .pipe(map((response) => response.result));
  }

  /**
   * To Load the Data Collection by Transaction - used for Resuming
   * @param transactionId { string }
   * @returns Observable<any>
   */
  loadDataCollectionByTransaction(transactionId: string) {
    const params = new HttpParams().set('transactionId', transactionId);
    return this.http
      .get<any>(environment.CSS_CONTROLLER + '/data-collection/', {
        params
      })
      .pipe(map((response) => response.data));
  }

  /**
   * To Load the collected data as data Template
   * @param actionId { number }
   * @param serviceId { number } optional
   * @param customerId { number } optional
   * @returns Observable<any>
   */
  loadDataTemplates(actionId: number, serviceId?: number, customerId?: number) {
    let params = new HttpParams().set('actionId', actionId);
    if (serviceId) {
      params.append('serviceId', serviceId);
    }
    if (customerId) {
      params.append('customerId', customerId);
    }
    return this.http.get<any[]>(
      environment.CSS_CONTROLLER + '/data-template/',
      { params }
    );
  }

  /**
   * To Load the Technical Data Collection Sites
   * @param customerId { number }
   * @returns Observable<any>
   */
  loadTdcSites(customerId: number) {
    let params = new HttpParams().set('customerId', customerId);
    return this.http.get<any[]>(environment.CSS_CONTROLLER + '/tdc-data/', {
      params
    });
  }

  /**
   * To Load the Technical Data Collection Sites for Business Center Users
   * @returns Observable<any>
   */
  loadTdcSitesForBcUser() {
    return this.http
      .get<any[]>(environment.CSS_CONTROLLER + '/tdc-data/bc-user/')
      .pipe(
        map((sites) =>
          sites.map((site) => ({
            ...site,
            // DEVICE and ADDRESS are coming as base64 encoded, decode them
            // For ADDRESS decode and then JSON Parse
            DEVICE: site.DEVICE ? atob(site.DEVICE) : null,
            ADDRESS: site.ADDRESS ? JSON.parse(atob(site.ADDRESS)) : null
          }))
        )
      );
  }

  /**
   * Notify the Changes Executed via Email to the Respective User(s)
   * @param summary { any }
   */
  notifyChangeSummary(summary: any): Observable<any> {
    return this.http.post<any>(
      environment.CSS_CONTROLLER + '/send-email/',
      summary
    );
  }

  /**
   * Post Change Confirmation - Create CR
   * @params data
   * @returns Observable
   */
  postChangeRequest(data: any): Observable<any> {
    return this.http.post<any>(
      environment.CSS_CONTROLLER + '/change-request/',
      data
    );
  }

  /**
   * To Provision One or Many Users onto One or Many Orchestrators
   * @param orchestrators
   * @param emails
   * @param config
   */
  provisionUsersToOrchestrator(
    orchestrators: string[],
    emails: string[],
    config: any
  ) {
    const headers = new HttpHeaders().set('one-type', 'transaction');
    return this.http.post<any[]>(
      environment.CSS_CONTROLLER + '/velo-suite/provision-users',
      { orchestrators, emails, config },
      { headers }
    );
  }

  /**
   * To Provision One or Many Edges onto One or Many Orchestrators
   * @param orchestrators
   * @param emails
   * @param config
   */
  provisionEdgesToOrchestrator(
    orchestrators: string[],
    emails: string[],
    config: any
  ) {
    const headers = new HttpHeaders().set('one-type', 'transaction');
    return this.http.post<any[]>(
      environment.CSS_CONTROLLER + '/velo-suite/provision-edges',
      { orchestrators, emails, config },
      { headers }
    );
  }

  /**
   * To push the configuration onto the end device
   * @param templateUUID
   * @param templateID
   * @returns Observable<SchedulerResponseModel>
   */
  pushConfiguration(templateID: string, templateUUID: string) {
    const params = new HttpParams()
      .set('templateID', templateID)
      .set('templateUUID', templateUUID);
    const headers = new HttpHeaders().set('one-type', 'transaction');
    return this.http
      .get<SchedulerStatusModel>(environment.CSS_CONTROLLER + '/push-config/', {
        headers,
        params
      })
      .pipe(concatMap((data) => this.schedulerService.schedulerPoll(data.pid)));
  }

  /**
   * To execute the rollback on the changes
   * @returns Observable<SchedulerResponseModel>
   */
  rollbackNow(): Observable<any> {
    const headers = new HttpHeaders().set('one-type', 'transaction');
    return this.http
      .get<SchedulerStatusModel>(
        environment.CSS_CONTROLLER + '/rollback-now/',
        { headers }
      )
      .pipe(concatMap((data) => this.schedulerService.schedulerPoll(data.pid)));
  }

  /**
   * To Execute the Script On MCAP - Long Poll Using Scheduler
   * @param scriptId
   * @returns Observable<SchedulerResponseModel>
   */
  runMcapScript(scriptId: string): Observable<any> {
    const params = new HttpParams().set('scriptId', scriptId);
    const headers = new HttpHeaders().set('one-type', 'transaction');
    return this.http
      .post<SchedulerStatusModel>(
        environment.CSS_CONTROLLER + '/run-script/',
        {},
        { headers, params }
      )
      .pipe(concatMap((data) => this.schedulerService.schedulerPoll(data.pid)));
  }

  /**
   * Execute validation commands on devices
   * @param validationData
   * @returns Observable<SchedulerResponseModel>
   */
  runValidation(validationData: any): Observable<any> {
    const headers = new HttpHeaders().set('one-type', 'transaction');
    return this.http
      .post<SchedulerStatusModel>(
        environment.CSS_CONTROLLER + '/run-validation/',
        { validationData },
        { headers }
      )
      .pipe(concatMap((data) => this.schedulerService.schedulerPoll(data.pid)))
      .pipe(
        map((outputs: any) => {
          const validations: ValidationModel[] = [];
          for (let command in outputs) {
            validations.push({
              command,
              ...JSON.parse(outputs[command])
            });
          }
          return validations;
        })
      );
  }

  /**
   * To save the collected data
   * @param {any} formData
   * @param {any} collectedFor -  Optional needed only for TDC
   * @returns Observable<any>
   */
  saveDataCollection(formData: any, collectedFor?: any) {
    return this.http
      .post<{ result: any; message: string }>(
        environment.CSS_CONTROLLER + '/data-collection-record/',
        { formData, collectedFor }
      )
      .pipe(map((response) => response.result));
  }

  /**
   * To save the collected data as data Template
   * @param data { any } should contain name, actionId and data as mandatory
   * @returns Observable<any>
   */
  saveDataTemplate(data: any) {
    return this.http.post<{ result: any; message: string }>(
      environment.CSS_CONTROLLER + '/data-template/',
      data
    );
  }

  /**
   * To set a pre change checkpoint
   * @returns Observable<SchedulerResponseModel>
   */
  setPreChangeCheckpoint() {
    const headers = new HttpHeaders().set('one-type', 'transaction');
    return this.http
      .get<SchedulerStatusModel>(
        environment.CSS_CONTROLLER + '/set-rollback/',
        { headers }
      )
      .pipe(concatMap((data) => this.schedulerService.schedulerPoll(data.pid)));
  }

  /**
   * To upload the SDS configuration
   * @param tdcId
   * @param orderData
   * @returns Observable<any>
   */
  uploadSdsConfiguration(tdcId: number, orderData: string) {
    return this.http
      .post<{ status: number; data: any }>(
        environment.CSS_CONTROLLER + '/tdc-data/eoc/push-config/',
        { tdcId, orderData }
      )
      .pipe(map((response) => response.data));
  }
}
