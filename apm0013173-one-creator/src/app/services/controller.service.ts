import { Injectable } from '@angular/core';
import {from, Observable, of, timer} from 'rxjs';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { User } from '../models/user';
import { Config } from 'protractor';
import { formTemplateSchema } from '../models/formTemplateModel';
import {concatMap, map, scan, takeWhile, tap} from 'rxjs/operators';
import { ActivatedRoute } from '@angular/router';

@Injectable({
  providedIn: 'root'
})

export class ControllerService {
  localConfig;
  private roles: any[] = null;

  constructor(private http: HttpClient, private route: ActivatedRoute) {
    if (!environment.production && environment.local) {
      this.localConfig = require('../../../config.json');
    }
  }

  /**
   * Get list of form templates but only ids and names
   * @params id customer id
   */
  public getTemplatesNameByCustomerId(id: string) {
    const params = new HttpParams().set('id', id);
    return this.http.get<any[]>(environment.API + '/action-templates/names/customer-id/', { params });
  }

  /**
   * Get list of form templates by customer id
   * @params id customer id
   * @returns Observable - formTemplateSchema array
   */
  public getFormTemplatesByCustomerId(id: string): Observable<formTemplateSchema[]> {
    const params = new HttpParams().set('id', id);
    return this.http.get<formTemplateSchema[]>(environment.API + '/action-templates/customer/', { params });
  }

  /**
   * Get action vendor type
   * @params id customer id
   * @returns Observable - formTemplateSchema array
   */
  public getActionVendorTypeByActionId(id: string): Observable<formTemplateSchema[]> {
    const params = new HttpParams().set('id', id);
    return this.http.get<formTemplateSchema[]>(environment.API + '/action-template/vendor-type/', { params });
  }

  /**
   * Load all assigned services for selcted action by action id
   * @params id action id
   * @params type type serivce or customer
   */
  public getServicesForAction(id: string, type: string): Observable<any[]> {
    const params = new HttpParams().set('id', id).set('type', type);
    return this.http.get<formTemplateSchema[]>(environment.API + '/action-template/services/', { params });
  }

  /**
   * Get form template by form template id
   * @params id form template id
   * @returns Observable - formTemplateSchema object
   */
  public getFormTemplateById(id: string): Observable<formTemplateSchema> {
    const params = new HttpParams().set('id', id);
    return this.http.get<formTemplateSchema>(environment.API + '/action-template/', { params });
  }

  /**
   * Delete form template by form template id
   * @params id form template id
   * @returns Observable - error object or succesfull message
   */
  public deleteActionTemplate(id: string): Observable<any> {
    const params = new HttpParams().set('id', id);
    return this.http.delete<any>(environment.API + '/action-template/', { params });
  }

  /**
   * Create action (form template)
   * @params action
   * @params customerId
   * @params serviceId
   */
  public createActionTemplate(action: formTemplateSchema, serviceId?: number[], workflowId?: number,
                              vendorTypeId?: number, customerId?: number): Observable<any> {
    if(customerId) action['customerId'] = customerId;
    if(serviceId) action['serviceId'] = serviceId;
    if(workflowId) action['workflowId'] = workflowId;
    if(vendorTypeId) action['vendorTypeId'] = vendorTypeId
    return this.http.post<any>(environment.API + '/action-template/', action);
  }

  /**
   * Update action template
   * @params formTemplate form template Object
   * @returns Observable - error object or updated formTemplateSchema object
   */
  public updateActionTemplate(action: formTemplateSchema, serviceId?: number[], workflowId?: number,
                              vendorTypeId?: number, customerId?: number): Observable<any> {
    if(customerId) action['customerId'] = customerId;
    if(serviceId) action['serviceId'] = serviceId;
    if(workflowId) action['workflowId'] = workflowId;
    if(vendorTypeId) action['vendorTypeId'] = vendorTypeId
    return this.http.put<any>(environment.API + '/action-template/', action);
  }


  /**
   * Check usability of cArche template in action data
   * @params id cArche template id
   * @params name cArche template name
   * @returns Observable - error object or list of actions
   */
  public checkUsabilityOfCarcheTempInAction(id: string, name: string): Observable<any> {
    const params = new HttpParams().set('id', id).set('name', name);
    return this.http.get<any>(environment.API + '/action-template/cArche/', { params });
  }

  /**
   * Update action template triggered by cArche template update
   * @params id cArche template old id
   * @params name
   * @params updatedId cArche template new id
   * @params service
   * @params deviceModel
   * @params version
   * @params templateType
   * @params vendorType
   */
  public updateCarchTemplateDetailsInAction(id, name, updatedId, contractid, service,
                                            deviceModel, version, templateType, vendorType): Observable<any> {
    const cArcheDetails = {
      id,
      name,
      updatedId,
      // must be remapped to services
      contractid: '' + contractid,
      services: '' + service,
      deviceModel,
      version,
      templateType,
      vendorType
    }
    return this.http.post<any>(environment.API + '/action-template/cArche/', cArcheDetails);
  }

  /**
   * Load action type for selected action template by action id
   * @params actionId
   */
  public loadActionTypeForActionTemplate(actionId): Observable<any> {
    const params = new HttpParams().set('id', actionId);
    return this.http.get<any[]>(environment.API + '/workflow/action/', { params });
  }

  /**
   * Get roles of user
   * @returns Observable - array of objects => { ID : "roleId", NAME: "roleName" }
   */
  public getRoles(): Observable<any[]> {
    if (this.roles) {
      // cached Roles
      return of(this.roles);
    }
    // If not Cached Load from Server
    return this.http.get<any[]>(environment.API + '/roles/')
      .pipe(map((roles) => {
          this.roles = roles;
          return roles;
        })
      );
  }

  /**
   * Sync roles with UPM
   * @returns json
   */
  public syncRoles(): Observable<any[]> {
    // Sync the Roles and Delete the Cached Role
    return this.http.put<any[]>(environment.API + '/roles/', {})
      .pipe(tap(() => this.roles = null));
  }

  /**
   * Sync users with UPM
   * @returns json
   */
  public syncUsers(): Observable<any[]> {
    return this.http.get<any[]>(environment.API + '/users/sync/');
  }

  /**
   * Get services by customer ID
   * @returns Observable - array of objects
   */
  public getServices(): Observable<any[]> {
    return this.http.get<any[]>(environment.API + '/service/');
  }

  /**
   * Get all onboarded customers from ONE
   * @returns Observable - array of objects
   */
  public getCustomersFromDB(): Observable<any[]> {
    return this.http.get<any[]>(environment.API + '/customers/');
  }

  /**
   * Get customer data by customer id
   * @returns Observable - array of objects
   */
  public getCustomerById(customerId: string): Observable<any[]> {
    const params = new HttpParams().set('id', customerId);
    return this.http.get<any[]>(environment.API + '/customer/', { params });
  }

  /**
   * Get all onboarded customers from ONE according status
   * @returns Observable - array of objects
   */
  public getCustomersByStatus(status): Observable<any[]> {
    const params = new HttpParams().set('active', status);
    return this.http.get<any[]>(environment.API + '/customers/status/', { params });
  }

  /**
   * Get service to customer by Id
   * @returns Observable - array of objects
   */
  public getServiceToCustomerById(id: string): Observable<any[]> {
    const params = new HttpParams().set('customerId', id);
    return this.http.get<any[]>(environment.API + '/customer/service', { params });
  }

  /**
   * Create users to customer relation
   * @returns Observable - objects
   */
  public getExistingUsersFromDB(): Observable<any[]> {
    return this.http.get<any[]>(environment.API + '/users/');
  }

  /**
   * Update
   * @params templateObject
   * @returns Observable - array of objects
   */
  public insertTemplatesToDB(templateObject): Observable<any[]> {
    const userTemplates = ({ userTemplates: templateObject });
    return this.http.put<any[]>(environment.API + '/user-templates/', userTemplates);
  }


  /**
   * Get association user to template
   * @params name customer name
   * @params contractID customer contract id
   * @returns Observable - array of objects
   */
  public getUsedCarcheTemplatesByNameAndContractID(name: string, contractID: string): Observable<any[]> {
    const carcheTParams = new HttpParams().set('name', name).set('contractid', contractID);
    return this.http.get<any[]>(environment.API + '/action-templates/template-name/contract-id/', { params: carcheTParams });
  }

  /**
   * Get association user to template
   * @params id user id
   * @returns Observable - array of objects
   */
  public getTemplateToUserAssociationbyMongoID(id: string): Observable<any[]> {
    const params = new HttpParams().set('id', id);
    return this.http.get<any[]>(environment.API + '/user-templates/template-id/', { params });
  }

  /**
   * Get service for customer by id
   * @params id customer id
   * @returns Observable - array of objects
   */
  public getServiceByCustomerLeamId(id: string): Observable<any[]> {
    const params = new HttpParams().set('id', id);
    return this.http.get<any[]>(environment.API + '/service-type/leam-id/', { params });
  }

  /**
   * Delete all templates related with user
   * @params id user id
   * @returns Observable - array of objects
   */
  public deleteUserToFormRelation(id: string): Observable<any[]> {
    const paramID = new HttpParams().set('TEMPLATE_ID', id);
    return this.http.delete<any[]>(environment.API + '/user-templates/', { params: paramID });
  }

  /**
   * Get customers from leam
   * @returns Observable - array of objects => { name : "customerName" , external_customer_id: "customerId"}
   */
  public getCustomers(): Observable<any[]> {
    return this.http.get<any[]>(environment.API + '/leam/customers/');
  }

  /**
   * Polling the result fo the scheduled process
   * @params pidId - pidId of the process
   */
  public getResultFromScheduledProcess(pidId: string): Observable<any[]> {
    const params = new HttpParams().set('id', pidId);
    return this.http.get<any[]>(environment.API + '/scheduler/', { params });
  }

  /**
   * Get related customers with user by attuid
   * @params id attuid of user
   * @returns Observable - array of objects => { name : "customerName" , external_customer_id: "customerId"}
   */
  public getCusotmerByAttid(id: string): Observable<any[]> {
    const params = new HttpParams().set('id', id);
    return this.http.get<any[]>(environment.API + '/leam/customers/user/attuid/', { params });
  }

  /**
   * This function is used for load avaliable options source for dropdown
   */
  public getApiOptionsSource() {
    return this.http.get<any>(environment.API + '/scripts/');
  }

  /**
   * Create customer
   * @returns Observable - object
   */
  public createCustomers(body: any): Observable<any[]> {
    return this.http.post<any[]>(environment.API + '/customer/', body);
  }

  /**
   * Update customer data by customer id
   * @returns Observable - array of objects
   */
  public updateCustomerById(customer: any): Observable<any[]> {
    return this.http.put<any[]>(environment.API + '/customer/', customer);
  }

  /**
   * Get services by customer ID
   * @returns Observable - array of objects
   */
  public getServicesByCustomerId(customerId: string): Observable<any[]> {
    const params = new HttpParams().set('customerId', customerId);
    return this.http.get<any[]>(environment.API + '/customer/service/', { params });
  }

  /**
   * Get action data by customer ID fo service
   * @returns Observable - array of objects
   */
  public getActionDataByCustomerId(customerId: string, serviceId: string): Observable<any[]> {
    const params = new HttpParams().set('customerId', customerId).set('serviceId', serviceId);
    return this.http.get<any[]>(environment.API + '/service/customer/action-data/', { params });
  }

  /**
   * Save action data by customer ID and service ID
   * @returns Observable - objects
   */
  public saveActionData(customerId: number, serviceId: number, actionId: string, actionName: string): Observable<any> {
    return this.http.post<any>(environment.API + '/service/customer/action-data/', {
      customerId,
      serviceId,
      actionId,
      actionName
    });
  }

  /**
   * Delete action data by action ID
   * @returns Observable - objects
   */
  public removeActionData(id: string): Observable<any> {
    const params = new HttpParams().set('id', id);
    return this.http.delete<any>(environment.API + '/service/customer/action-data/', { params });
  }

  /**
   * Get avaliable services
   * @returns Observable - array of objects
   */
  public getAvailableServices(): Observable<any[]> {
    return this.http.get<any[]>(environment.API + '/service/');
  }

  /**
   * Create new service for customer
   * @returns Observable - object
   */
  public saveServiceToCustomer(customerId: number, serviceId: number): Observable<any> {
    return this.http.post<any>(environment.API + '/customer/service/', {
      customerId,
      serviceId
    });
  }

  /**
   * Delete existing service for customer
   * @returns Observable - object
   */
  public deleteServiceToCustomer(customerId: string, serviceId: string): Observable<any> {
    const params = new HttpParams().set('customerId', customerId).set('serviceId', serviceId);
    return this.http.delete<any>(environment.API + '/customer/service/', { params });
  }

  /**
   * Save mcap credetnails for service and customer
   * @returns Observable - objects
   */
  public saveMcapCredentials(body): Observable<any[]> {
    return this.http.post<any[]>(environment.API + '/service/customer/mcap-credentials/', body);
  }

  /**
   * Get mcap credetnails for service and customer
   * @returns Observable - object
   */
  public getMcapCredentials(customerId: string, serviceId: string): Observable<any[]> {
    const params = new HttpParams().set('customerId', customerId).set('serviceId', serviceId);
    return this.http.get<any[]>(environment.API + '/service/customer/mcap-credentials/', { params });
  }

  /**
   * Delete relationship between mcap-credentials and service to customer
   * @params id
   * @params customerId
   * @params serviceId
   */
  public deleteAssignedMcapCredentials(id: string, customerId: string, serviceId: string): Observable<any[]> {
    const params = new HttpParams()
      .set('id', id)
      .set('customerId', customerId)
      .set('serviceId', serviceId);
    return this.http.delete<any[]>(environment.API + '/service/customer/mcap-credentials/', { params });
  }

  /**
   * Create mcap credential
   * @params credential
   */
  public createMcapCredentials(credential: string): Observable<any[]> {
    const body = {
      credential
    };
    return this.http.post<any[]>(environment.API + '/service/mcap-credentials/', body);
  }

  /**
   * Load all avaliable mcap credentials
   */
  public loadAllMcapCredentials(): Observable<any[]> {
    return this.http.get<any[]>(environment.API + '/service/mcap-credentials/');
  }

  /**
   * Delete mcap credential
   * @params id
   */
  public deleteMcapCredentials(id: string): Observable<any[]> {
    const params = new HttpParams()
      .set('id', id);
    return this.http.delete<any[]>(environment.API + '/service/mcap-credentials/', { params });
  }

  /**
   * Save orchestrator list for service
   * @returns Observable - objects
   */
  public saveOrchestratorList(body): Observable<any[]> {
    return this.http.post<any[]>(environment.API + '/service/customer/orchestrator-list/', body);
  }

  /**
   * Load orchestrator list for service
   * @returns Observable - objects
   */
  public loadOrchestratorList(customerId: string, serviceId: string): Observable<any[]> {
    const params = new HttpParams().set('customerId', customerId).set('serviceId', serviceId);
    return this.http.get<any[]>(environment.API + '/service/customer/orchestrator-list/', { params });
  }

  /**
   * Delete orchestrator list for service
   * @returns Observable - objects
   */
  public deleteOrchestratorList(id: string): Observable<any[]> {
    const params = new HttpParams().set('id', id);
    return this.http.delete<any[]>(environment.API + '/service/customer/orchestrator-list/', { params });
  }

  public loadOrchestratorTags(orchestratorListId): Observable<any[]>{
    const params = new HttpParams().set('orchestratorId', orchestratorListId);
    return this.http.get<any[]>(environment.API + '/service-to-customer/orchestrator-list-tags/', { params });
  }

  public saveOrchestratorTags(tags, orchestratorListId): Observable<any[]>{
    const params = new HttpParams().set('orchestratorId', orchestratorListId);
    return this.http.put<any[]>(environment.API + '/service-to-customer/orchestrator-list-tags/', tags, { params });
  }

  public saveOrchestratorConfig(orchestratorListId, config): Observable<any[]>{
    const params = new HttpParams().set('orchestratorId', orchestratorListId);
    return this.http.put<any[]>(environment.API + '/service-to-customer/orchestrator-list-config/', config, { params });
  }

  /**
   * Get Auto CR Create config data by customer ID for service
   * @returns Observable - array of objects
   */
  public getAutoCrCreateConfig(customerId: string, serviceId: string): Observable<any[]> {
    const params = new HttpParams().set('customerId', customerId).set('serviceId', serviceId);
    return this.http.get<any>(environment.API + '/change-request/config', { params });
  }

  /**
   * Update Auto CR Create config data by customer ID for service
   * @returns Observable - array of objects
   */
  public updateAutoCrCreateConfig(customerId: string, serviceId: string, body: any): Observable<any[]> {
    const params = new HttpParams().set('customerId', customerId).set('serviceId', serviceId);
    return this.http.put<any>(environment.API + '/change-request/config', body, { params });
  }

  /**
   * Save gps data for customer
   * @returns Observable - objects
   */
  public saveGpsData(body): Observable<any[]> {
    return this.http.post<any[]>(environment.API + '/customer/gps-data/', body);
  }

  /**
   * Load gps data for customer
   * @returns Observable - objects
   */
  public loadGpsData(customerId: string): Observable<any[]> {
    const params = new HttpParams().set('customerId', customerId);
    return this.http.get<any[]>(environment.API + '/customer/gps-data/', { params });
  }

  /**
   * Delete gps data for customer
   * @returns Observable - objects
   */
  public deleteGpsData(id: string): Observable<any[]> {
    const params = new HttpParams().set('id', id);
    return this.http.delete<any[]>(environment.API + '/customer/gps-data/', { params });
  }

  /**
   * Save grua data for customer
   * @returns Observable - objects
   */
  public saveGruaData(body): Observable<any[]> {
    return this.http.post<any[]>(environment.API + '/customer/grua-data/', body);
  }

  /**
   * Load grua data for customer
   * @returns Observable - objects
   */
  public loadGruaData(customerId: string): Observable<any[]> {
    const params = new HttpParams().set('customerId', customerId);
    return this.http.get<any[]>(environment.API + '/customer/grua-data/', { params });
  }

  /**
   * Delete grua data for customer
   * @returns Observable - objects
   */
  public deleteGruaData(id: string): Observable<any[]> {
    const params = new HttpParams().set('id', id);
    return this.http.delete<any[]>(environment.API + '/customer/grua-data/', { params });
  }

  /**
   * Load tree node structure for actions
   * @returns Observable - objects
   */
  public loadTreeNodeForActions(cachedFiles): Observable<any[]> {
    return this.http.post<any[]>(environment.API + '/node-list/actions/', {cachedFiles});
  }

  /**
   * Load all avaliable workflows
   */
  public loadAllActionTypes(): Observable<any[]> {
    return this.http.get<any[]>(environment.API + '/workflows/');
  }

  /**
   * Create user access for specifi service and customer
   * @params body
   */
  public createIndividualAccess(body): Observable<any[]> {
    return this.http.post<any[]>(environment.API + '/permission/service/user/', body);
  }

  /**
   * Load assigned users for specifi service and customer
   * @params customerId
   * @params serivceId
   */
  public getUsersForServiceAndCustomer(customerId: string, serivceId: string): Observable<any[]> {
    const params = new HttpParams().set('serviceId', serivceId).set('customerId', customerId);
    return this.http.get<any[]>(environment.API + '/permission/service/user/', { params });
  }

  /**
   * Delete user access for specifi service and customer
   * @params customerId
   * @params serivceId
   * @params userId
   */
  public deleteUsersForServiceAndCustomer(customerId: string, serivceId: string, userId: string): Observable<any[]> {
    const params = new HttpParams()
      .set('serviceId', serivceId)
      .set('customerId', customerId)
      .set('userId', userId);
    return this.http.delete<any[]>(environment.API + '/permission/service/user/', { params });
  }

  /**
   * Get all avaliable users
   */
  public getUsers(): Observable<any[]> {
    return this.http.get<any[]>(environment.API + '/users/attuid/');
  }

  /**
   * Get all bussines center users
   */
  public getBcUsers(): Observable<any[]> {
    return this.http.get<any[]>(environment.API + '/bc/users/');
  }

  /**
   * Create role access for specifi service and customer
   * @params body
   */
  public createRoleAccess(body): Observable<any[]> {
    return this.http.post<any[]>(environment.API + '/permission/service/role/', body);
  }

  /**
   * Load roles access for specifi service and customer
   * @params customerId
   * @params serivceId
   */
  public getRolesForServiceAndCustomer(customerId: string, serviceId: string): Observable<any[]> {
    const params = new HttpParams()
      .set('serviceId', serviceId)
      .set('customerId', customerId);
    return this.http.get<any[]>(environment.API + '/permission/service/role/', { params });
  }

  /**
   * Delete role access for specifi service and customer
   * @params customerId
   * @params serivceId
   * @params roleId
   */
  public deleteRoleForServiceAndCustomer(customerId: string, serivceId: string, roleId: string): Observable<any[]> {
    const params = new HttpParams()
      .set('serviceId', serivceId)
      .set('customerId', customerId)
      .set('roleId', roleId);
    return this.http.delete<any[]>(environment.API + '/permission/service/role/', { params });
  }

  /**
   * Create bc user access for specifi service and customer
   * @params body
   */
  public createBcUserAccess(body): Observable<any[]> {
    return this.http.post<any[]>(environment.API + '/permission/service/customer/', body);
  }

  /**
   * Load bc user access for specifi service and customer
   * @params customerId
   * @params serivceId
   */
  public getBcUserForServiceAndCustomer(customerId: string, serviceId: string): Observable<any[]> {
    const params = new HttpParams()
      .set('serviceId', serviceId)
      .set('customerId', customerId);
    return this.http.get<any[]>(environment.API + '/permission/service/customer/', { params });
  }

  /**
   * Delete bc user access for specifi service and customer
   * @params customerId
   * @params serivceId
   * @params userId
   */
  public deleteBcUserForServiceAndCustomer(customerId: string, serivceId: string, userId: string): Observable<any[]> {
    const params = new HttpParams()
      .set('serviceId', serivceId)
      .set('customerId', customerId)
      .set('userId', userId);
    return this.http.delete<any[]>(environment.API + '/permission/service/customer/', { params });
  }

  /**
   * Create permission for user on action template
   * @params userId
   * @params templateId
   */
  public assignTemplateToUser(userId, templateId): Observable<any[]> {
    const ids = { userId, templateId };
    return this.http.post<any[]>(environment.API + '/permission/template/user/', ids);
  }

  /**
   * Create permission for role on action template
   * @params roleId
   * @params templateId
   */
  public assignTemplateToRole(roleId, templateId): Observable<any[]> {
    const ids = { roleId, templateId };
    return this.http.post<any[]>(environment.API + '/permission/template/role/', ids);
  }

  /**
   * Create permission for bc user on action template
   * @params userId
   * @params templateId
   */
  public assignTemplateToBCUser(userId, templateId): Observable<any[]> {
    const ids = { userId, templateId };
    return this.http.post<any[]>(environment.API + '/permission/template/customer/', ids);
  }

  /**
   * Load users permissions for action template
   * @params templateId
   */
  public getTemplateToRole(templateId): Observable<any[]> {
    const params = new HttpParams().set('templateId', templateId);
    return this.http.get<any[]>(environment.API + '/permission/template/role/', { params });
  }

  /**
   * Load roles permissions for action template
   * @params templateId
   */
  public getTemplateToUser(templateId): Observable<any[]> {
    const params = new HttpParams().set('templateId', templateId);
    return this.http.get<any[]>(environment.API + '/permission/template/user/', { params });
  }

  /**
   * Load bc users permissions for action template
   * @params templateId
   */
  public getTemplateToBcUser(templateId): Observable<any[]> {
    const params = new HttpParams().set('templateId', templateId);
    return this.http.get<any[]>(environment.API + '/permission/template/customer/', { params });
  }

  /**
   * Delete permission for user on selected action template
   * @params userId
   * @params templateId
   */
  public deleteUsersForActionTemplate(userId, templateId): Observable<any[]> {
    const params = new HttpParams().set('templateId', templateId).set('userId', userId);
    return this.http.delete<any[]>(environment.API + '/permission/template/user/', { params });
  }

  /**
   * Delete permission for role on selected action template
   * @params roleId
   * @params templateId
   */
  public deleteRoleForActionTemplate(roleId, templateId): Observable<any[]> {
    const params = new HttpParams().set('templateId', templateId).set('roleId', roleId);
    return this.http.delete<any[]>(environment.API + '/permission/template/role/', { params });
  }

  /**
   * Delete permission for bc user on selected action template
   * @params userId
   * @params templateId
   */
  public deleteBcUserForActionTemplate(userId, templateId): Observable<any[]> {
    const params = new HttpParams().set('templateId', templateId).set('userId', userId);
    return this.http.delete<any[]>(environment.API + '/permission/template/customer/', { params });
  }

  /**
   * Load users permissions for service
   * @params serviceId
   */
  public getUserForServices(serviceId): Observable<any[]> {
    const params = new HttpParams().set('serviceId', serviceId);
    return this.http.get<any[]>(environment.API + '/permission/services/user/', { params });
  }

  /**
   * Load group permissions for service
   * @params serviceId
   */
  public getRolesForServices(serviceId): Observable<any[]> {
    const params = new HttpParams().set('serviceId', serviceId);
    return this.http.get<any[]>(environment.API + '/permission/services/role/', { params });
  }
  /**
   * Load bc users permissions for service
   * @params serviceId
   */
  public getBcUserForServices(serviceId): Observable<any[]> {
    const params = new HttpParams().set('serviceId', serviceId);
    return this.http.get<any[]>(environment.API + '/permission/services/customer/', { params });
  }

  /**
   * Create permission for user on service
   * @params userId
   * @params serviceId
   */
  public createIndividualAccessForService(userId, serviceId): Observable<any[]> {
    const body = { userId, serviceId }
    return this.http.post<any[]>(environment.API + '/permission/services/user/', body);
  }

  /**
   * Create permission for group on service
   * @params roleId
   * @params serviceId
   */
  public createRoleAccessForService(roleId, serviceId): Observable<any[]> {
    const body = { roleId, serviceId }
    return this.http.post<any[]>(environment.API + '/permission/services/role/', body);
  }
  /**
   * Create permission for bc user on service
   * @params userId
   * @params serviceId
   */
  public createBcUserAccessForService(userId, serviceId): Observable<any[]> {
    const body = { userId, serviceId }
    return this.http.post<any[]>(environment.API + '/permission/services/customer/', body);
  }

  /**
   * Remove permission for user on service
   * @params userId
   * @params serviceId
   */
  public deleteUsersForService(serivceId: string, userId: string): Observable<any[]> {
    const params = new HttpParams()
      .set('serviceId', serivceId)
      .set('userId', userId);
    return this.http.delete<any[]>(environment.API + '/permission/services/user/', { params });
  }

  /**
   * Remove permission for role on service
   * @params userId
   * @params serviceId
   */
  public deleteRoleForService(serivceId: string, roleId: string): Observable<any[]> {
    const params = new HttpParams().set('serviceId', serivceId).set('roleId', roleId);
    return this.http.delete<any[]>(environment.API + '/permission/services/role/', { params });
  }

  /**
   * Remove permission for bc user on service
   * @params userId
   * @params serviceId
   */
  public deleteBcUserForService(serivceId: string, userId: string): Observable<any[]> {
    const params = new HttpParams().set('serviceId', serivceId).set('userId', userId);
    return this.http.delete<any[]>(environment.API + '/permission/services/customer/', { params });
  }

  /**
   * Create new service
   * @params serviceName
   */
  public saveService(serviceName): Observable<any[]> {
    return this.http.post<any[]>(environment.API + '/service/', serviceName);
  }
  /**
   * Update service name
   * @params serviceName
   * @params serviceId
   */
  public updateService(serviceId, serviceName): Observable<any[]> {
    const body = { serviceId, serviceName }
    return this.http.put<any[]>(environment.API + '/service/', body);
  }

  /**
   *  Load all avaliable service attributes
   */
  public loadAllAttributesForService(): Observable<any[]> {
    return this.http.get<any[]>(environment.API + '/services/attributes/');
  }

  /**
   * Load assigned attributes for selected service
   * @params serviceId
   */
  public loadAssignedAttributesForService(serviceId: string): Observable<any[]> {
    const params = new HttpParams().set('id', serviceId);
    return this.http.get<any[]>(environment.API + '/service/attributes/', { params });
  }

  /**
   * Assigne attribute to service
   * @params serviceId
   * @params attributeId
   */
  public assigneAttributeForService(serviceId: string, attributeId: string): Observable<any> {
    const body = {
      serviceId,
      attributeId
    };
    return this.http.post<any[]>(environment.API + '/service/attributes/', body);
  }


  public getAttributesForWorkflow(workflowId): Observable<any[]> {
    const params = new HttpParams().set('id', workflowId);
    return this.http.get<any[]>(environment.API + '/workflow/attribute/', { params });
  }

  public getWorkflowAttributes(): Observable<any[]> {
    return this.http.get<any[]>(environment.API + '/workflow/attributes/');
  }

  /**
   * Delete attribute to service
   * @params serviceId
   * @params attributeId
   */
  public deleteAttributeForService(serviceId: string, attributeId: string): Observable<any> {
    const params = new HttpParams()
      .set('serviceId', serviceId)
      .set('attributeId', attributeId);
    return this.http.delete<any[]>(environment.API + '/service/attributes/', { params });
  }

  /**
   * Load all avaliable workflow attributes
   */
  public loadAllWorkflowAttributes(): Observable<any[]> {
    return this.http.get<any[]>(environment.API + '/workflow/attributes/');
  }

  /**
   * Load assigned attributes for selected service
   * @params workflowId
   */
  public loadAssignedAttributesForWorkflow(workflowId: string): Observable<any[]> {
    const params = new HttpParams().set('id', workflowId);
    return this.http.get<any[]>(environment.API + '/workflow/attribute/', { params });
  }

  /**
   * Assigne attribute to service
   * @params workflowId
   * @params attributeId
   */
  public assigneAttributeForWorkflow(workflowId: string, attributeId: string, status: string): Observable<any> {
    const body = {
      workflowId,
      attributeId,
      status
    };
    return this.http.post<any[]>(environment.API + '/workflow/attribute/', body);
  }

  /**
   * Delete attribute to service
   * @params serviceId
   * @params attributeId
   */
  public deleteAttributeForWorkflow(workflowId: string, attributeId: string): Observable<any> {
    const params = new HttpParams()
      .set('workflowId', workflowId)
      .set('attributeId', attributeId);
    return this.http.delete<any[]>(environment.API + '/workflow/attribute/', { params });
  }

  public createBcUser(user) {
    return this.http.post<any[]>(environment.API + '/bc/user/', user);
  }

  /**
   * Return the transaction log data
   * @params page the page number for pagination
   * @params limit limit of returned rows
   * @params sort sorting parameters
   * @params filters filtering parameters
   * @returns - transaction logs objects
   */
  public getTransactionLogs(page, limit, sort, filters): Observable<{count: number; results: any[]}> {
    let params = new HttpParams().set('offset', page).set('limit', limit);
    // Check for Sorting Parameters in Optional Parameters
    if ('sortField' in sort) {
      const ordering = sort.sortOrder === 1 ? sort.sortField : `-${sort.sortField}`;
      params = new HttpParams()
        .set('offset', page)
        .set('limit', limit)
        .set('ordering', ordering);
    }
    if (!(filters // 👈 null and undefined check
      && Object.keys(filters).length === 0 && filters.constructor === Object)) {
      Object.keys(filters).forEach(key => {
        params = params.append(key, filters[key]);
      })
    }
    return this.http.get<{count: number; results: any[]}>(environment.API + `/logs/`, { params });
  }

  getCookie(name: string) {
    const ca: Array<string> = document.cookie.split(';');
    const caLen: number = ca.length;
    const cookieName = `${name}=`;
    let c: string;

    for (let i = 0; i < caLen; i += 1) {
      c = ca[i].replace(/^\s+/g, '');
      if (c.indexOf(cookieName) === 0) {
        return c.substring(cookieName.length, c.length);
      }
    }
    return '';
  }

  getUserInfo(): User {
    const userInfo = decodeURIComponent(this.getAuthHeaders()['auth-atteshr']).split('|');
    if (userInfo[0] !== '') {
      return {
        name: this.editName((userInfo[0] + ' ' + userInfo[1]).toLocaleLowerCase()),
        email: userInfo[2],
        phone: '+' + userInfo[3].split('+').join(' '),
        directManager: userInfo[5],
        attid: userInfo[7].substring(0, 6)
      };
    } else {
      return undefined;
    }
  }

  editName(name): string {
    let stringBuffer = '';
    stringBuffer += name[0].toUpperCase();
    for (let i = 0; i < name.length; i++) {
      if (name[i] === ' ') {
        stringBuffer += name[i];
        stringBuffer += name[i + 1].toUpperCase();
        i++;
      } else if (i !== 0) {
        stringBuffer += name[i];
      }
    }
    return stringBuffer;
  }

  getAuthHeaders() {
    // check for only local development please read README file how to start app with local environments
    if (!environment.production && environment.local) {
      document.cookie = 'attESSec' + '=' + this.localConfig['local']['cookies']['globalLogon']['attESSec'];
      document.cookie = 'attESg2' + '=' + this.localConfig['local']['cookies']['globalLogon']['attESg2'];
      document.cookie = 'attESHr' + '=' + this.localConfig['local']['cookies']['globalLogon']['attESHr'];
    }

    return {
      'auth-atteshr': this.getCookie('attESHr')
    };
  }


  getCSRFTokenString() {
    return this.getCookie('xsrf-token');
  }


  formatErrorMessage(error): string {
    return `An error occurred: ${error.message}`;
  }

  isAuthenticated(): Observable<HttpResponse<Config>> {
    if(!document.cookie.match("access_token")){
    const urlParams = new URLSearchParams(window.location.search);
    const state: string = urlParams.get('state');
    const code: string = urlParams.get('code');
    let params = new HttpParams();
    params = params.append('state', state);
    params = params.append('code', code);
    return this.http.get<Config>(environment.API + '/', { observe: 'response', params: params });
  }
    return this.http.get<Config>(environment.API + '/', { observe: 'response'});
  }

  /**
   * Get results from a scheduled Process by pid
   * @params pid
   * @returns Observable of type SchedulerResponseModel
   */
  getScheduledProcess(pid: string): Observable<any> {
    const params = new HttpParams().set('id', pid);
    return this.http.get<any>(
      environment.API + '/scheduler/',
      { params }
    );
  }

  schedulerAttemptsGuardFactory(maxAttempts: number) {
    return (attemptsCount: number) => {
      if (attemptsCount > maxAttempts) {
        throw new Error('Exceeded maxAttempts for LongPolling to Scheduler!');
      }
    };
  }

  schedulerTakeWhile = (res: any) =>
    res.status === 'enrolled';

  schedulerPoll(
    pid: string,
    interval: number = 3000,
    startDue: number = 3000,
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
}
