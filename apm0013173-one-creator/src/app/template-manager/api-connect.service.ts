import { Injectable } from '@angular/core';
import { Templatee } from './models/templatee';
import { ContentType } from './models/conf-template-models/content-type'
import { TemplateType } from './models/conf-template-models/template-type'
import { TemplateeEdited } from './models/TemplateeEdited';
import { Observable } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { IConfigTemplateResponse } from './models/configTemplate';
import { ICarcheTemplate } from './models/template';

@Injectable({
  providedIn: 'root',
})
export class ApiConnectService {
  constructor(private http: HttpClient) {}

  getListOfTemplateVariablesContractId(contractid: string, name: string): Observable<string[]> {
    const params = new HttpParams()
      .set('contractid', contractid)
      .set('name', name);
    return this.http.get<string[]>(
      environment.API + `/cArche/variables/name/contract-id/`,
      { params }
    );
  }

  getListOfTemplateVariablesService(service: string, name: string): Observable<string[]> {
    const params = new HttpParams().set('service', service).set('name', name);
    return this.http.get<string[]>(
      environment.API + `/cArche/variables/name/service/`,
      { params }
    );
  }

  getListOfTemplateVariablesByIdAndDeviceModel(
    templateId,
    templateType
  ): Observable<string[]> {
    const params = new HttpParams()
      .set('templateType', templateType)
      .set('id', templateId);
    return this.http.get<string[]>(
      environment.API + `/cArche/variables/template-id/`,
      { params }
    );
  }

  getListOfTemplates(contractid?, service?): Observable<[]> {
    if (contractid && service) {
      const params = new HttpParams()
        .set('contractid', contractid)
        .set('service', service);
      return this.http.get<[]>(
        environment.API + `/cArche/template-list/contract-id/service/`,
        { params }
      );
    } else if (!contractid && service) {
      const params = new HttpParams().set('service', service);
      return this.http.get<[]>(
        environment.API + `/cArche/template-list/contract-id/service/`,
        { params }
      );
    } else if (contractid && !service) {
      const params = new HttpParams().set('contractid', contractid);
      return this.http.get<[]>(
        environment.API + `/cArche/template-list/contract-id/service/`,
        { params }
      );
    } else {
      return this.http.get<[]>(
        environment.API + `/cArche/template-list/contract-id/service/`
      );
    }
  }

  getBasicListOfTemplates(): Observable<[]> {
    return this.http.get<[]>(environment.API + `/cArche/templates/`);
  }

  getSelectedTemplate(
    contractid: string,
    name: string
  ): Observable<Templatee[]> {
    const params = new HttpParams()
      .set('contractid', contractid)
      .set('name', name);
    return this.http.get<Templatee[]>(environment.API + `/cArche/template/`, {
      params,
    });
  }

  getSelectedCarcheTemplate(
    carcheTemplate: ICarcheTemplate
  ): Observable<Templatee[]> {
    if (
      carcheTemplate.contractid &&
      carcheTemplate.service &&
      carcheTemplate.name
    ) {
      const params = new HttpParams()
        .set('name', carcheTemplate.name)
        .set('contractid', carcheTemplate.contractid)
        .set('service', carcheTemplate.service);
      return this.http.get<Templatee[]>(environment.API + `/cArche/template/`, {
        params,
      });
    }
    if (
      !carcheTemplate.contractid &&
      carcheTemplate.service &&
      carcheTemplate.name
    ) {
      const params = new HttpParams()
        .set('name', carcheTemplate.name)
        .set('service', carcheTemplate.service);
      return this.http.get<Templatee[]>(environment.API + `/cArche/template/`, {
        params,
      });
    }
    if (
      carcheTemplate.contractid &&
      !carcheTemplate.service &&
      carcheTemplate.name
    ) {
      const params = new HttpParams()
        .set('name', carcheTemplate.name)
        .set('contractid', carcheTemplate.contractid);
      return this.http.get<Templatee[]>(environment.API + `/cArche/template/`, {
        params,
      });
    }
  }

  // should be carcheTemplate: ICarcheTemplate
  apiDeleteTemplate(carcheTemplate): Observable<null> {
    if (
      carcheTemplate.name &&
      carcheTemplate.contractid &&
      carcheTemplate.service
    ) {
      const params = new HttpParams()
        .set('name', carcheTemplate.name)
        .set('service', carcheTemplate.service)
        .set('contractid', carcheTemplate.contractid);
      return this.http.delete<null>(environment.API + `/cArche/template/`, {
        params,
      });
    }

    if (
      carcheTemplate.name &&
      !carcheTemplate.contractid &&
      carcheTemplate.service
    ) {
      const params = new HttpParams()
        .set('name', carcheTemplate.name)
        .set('service', carcheTemplate.service);
      return this.http.delete<null>(environment.API + `/cArche/template/`, {
        params,
      });
    }
    if (
      carcheTemplate.name &&
      carcheTemplate.contractid &&
      !carcheTemplate.service
    ) {
      const params = new HttpParams()
        .set('name', carcheTemplate.name)
        .set('contractid', carcheTemplate.contractid);
      return this.http.delete<null>(environment.API + `/cArche/template/`, {
        params,
      });
    }
  }

  // should be carcheTemplate: ICarcheTemplate
  apiDeleteTemplateByTemplateId(id): Observable<null> {
    const params = new HttpParams().set('id', id);
    return this.http.delete<null>(environment.API + `/cArche/template/`, {
      params,
    });
  }

  editCarcheTemplate(id: string, name: string, body: any): Observable<TemplateeEdited> {
    return this.http.put<TemplateeEdited>(environment.API + `/cArche/template/`, { id, name, ...body });
  }

  apiAddTemplate(templateJson): Observable<TemplateeEdited> {
    return this.http.post<TemplateeEdited>(
      environment.API + `/cArche/template/`,
      JSON.parse(templateJson)
    );
  }
  // new function only temporary
  addcArcheTempalte(template): Observable<IConfigTemplateResponse> {
    return this.http.post<IConfigTemplateResponse>(
      environment.API + `/cArche/template/`,
      JSON.parse(template)
    );
  }

  // content type, template type and vendor type

  getTemplateContentTypes(): Observable<ContentType[]> {
    return this.http.get<ContentType[]>(
      environment.API + `/cArche/template/content-types/`
    );
  }

  getTemplateTypes(): Observable<TemplateType[]> {
    return this.http.get<TemplateType[]>(
      environment.API + `/cArche/template/types/`
    );
  }

  getTemplateVendorTypes(): Observable<any[]> {
    return this.http.get<any[]>(
      environment.API + `/cArche/template/vendor-types/`
    );
  }

  /**
   * Converts an Arche template to Jinja format.
   * @returns An observable containing the result of the conversion.
   */
  convertTemplateToJinja(archeTemplateData: any): Observable<any> {
    return this.http.post<any>(environment.API + `/cArche/template/convert-to-jinja/`, archeTemplateData);
  }

  getHostnamesByCustomer(customerName): Observable<any[]> {
    const params = new HttpParams().set('customerId', customerName);
    return this.http.get<any[]>(environment.API + '/cache/devices/', {
      params,
    });
  }

  getWorkflows() {
    return this.http.get<any[]>(environment.API + '/workflows/');
  }

  getTemplatesByWorkflowId(id) {
    return this.http.get<any[]>(
      environment.API + '/formTemplates/workflows/' + id
    );
  }

  getRoles() {
    return this.http.get<any[]>(environment.API + '/roles/');
  }

  getUsers() {
    return this.http.get<any[]>(environment.API + '/users/');
  }
}
