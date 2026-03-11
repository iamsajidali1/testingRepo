import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { LabelValueModel, NameValueModel, QuestionModel } from './action.model';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ActionService {
  action: any;
  actionCustomer: any;
  defaultAction: any = {
    actionId: null,
    actionTemplate: null,
    actionType: null,
    actionServices: null,
    actionVendor: null,
    actionAttributes: null,
    actionAccesses: {
      individual: null,
      group: null,
      businessCenter: null
    },
    actionCache: {},
  };
  cache: any = {};
  actionLoadCompleteSubject: BehaviorSubject<boolean>;
  actionLoadErrorSubject: BehaviorSubject<any>;
  constructor(private http: HttpClient) {
    this.actionLoadCompleteSubject = new BehaviorSubject<boolean>(false);
    this.actionLoadErrorSubject = new BehaviorSubject<any>(null);
    this.resetActionState();
  }

  /**
   * Reset the Action State to Default Values
   */
  resetActionState() {
    this.action = JSON.parse(JSON.stringify(this.defaultAction));
    this.actionLoadCompleteSubject.next(false);
    this.actionLoadErrorSubject.next(null);
  }

  /**
   * Getter Setter for Action Id
   */
  get actionId() {
    return this.action.actionId;
  }
  set actionId(id: number) {
    this.action.actionId = id;
  }

  /**
   * Getter Setter for Action Template
   */
  get actionTemplate() {
    return this.action.actionTemplate;
  }
  set actionTemplate(template: any) {
    this.action.actionTemplate = template;
  }

  /**
   * Getter Setter for Action Type
   */
  get actionType() {
    return this.action.actionType;
  }
  set actionType(type: any) {
    this.action.actionType = type;
  }

  /**
   * Getter Setter for Action Services
   */
  get actionServices() {
    return this.action.actionServices;
  }
  set actionServices(services: any) {
    this.action.actionServices = services;
  }

  /**
   * Getter Setter for Action Vendor
   */
  get actionVendor() {
    return this.action.actionVendor;
  }
  set actionVendor(vendor: any) {
    this.action.actionVendor = vendor;
  }

  /**
   * Getter Setter for Action Attributes
   */
  get actionAttributes() {
    return this.action.actionAttributes;
  }
  set actionAttributes(attributes: any) {
    this.action.actionAttributes = attributes;
  }

  /**
   * Getter Setter for Action Accesses
   */
  get actionAccesses() {
    return this.action.actionAccesses;
  }
  set actionAccesses(actionAccesses: any) {
    this.action.actionAccesses = actionAccesses;
  }

  /**
   * Getter Setter for Action Accesses - Individual
   */
  get actionIndividualAccesses() {
    return this.action.actionAccesses.individual;
  }
  set actionIndividualAccesses(accesses: any) {
    this.action.actionAccesses.individual = accesses;
  }

  /**
   * Getter Setter for Action Accesses - Group
   */
  get actionGroupAccesses() {
    return this.action.actionAccesses.group;
  }
  set actionGroupAccesses(accesses: any) {
    this.action.actionAccesses.group = accesses;
  }

  /**
   * Getter Setter for Action Accesses - Business Center
   */
  get actionBcAccesses() {
    return this.action.actionAccesses.businessCenter;
  }
  set actionBcAccesses(accesses: any) {
    this.action.actionAccesses.businessCenter = accesses;
  }

  /**
   * Getter Setter for Customer
   */
  get customer() {
    return this.actionCustomer;
  }
  set customer(customer: any) {
    this.actionCustomer = customer;
  }

  /**
   * Getter for Carche Template
   */
  get carcheTemplate() {
    const carcheTemplateString = this.actionTemplate?.carcheTemplate || '{}';
    return JSON.parse(carcheTemplateString);
  }

  /**
   * Getter for available Validators
   */
  get availableValidators(): NameValueModel[] {
    return [
      { name: 'None', value: 'None' },
      { name: 'IPv4', value: 'IPv4' },
      { name: 'IPv6', value: 'IPv6' },
      { name: 'Email', value: 'Email' },
      { name: 'Regex', value: 'regex' },
    ]
  }

  /**
   * Getter for available Option Source Types
   */
  get availableOptionSources(): NameValueModel[] {
    return [
      { name: 'Manual', value: 'Manual' },
      { name: 'API Endpoint', value: 'API' },
      { name: 'MCAP Script', value: 'Script' },
    ]
  }

  get availableApiOptionSources(): LabelValueModel[] {
    return [
      { label: 'ONE_Internal_VCO_List', value: '/api/internal/css/getVcoList' }
    ]
  }

  /**
   * Getter for available condition Types
   */
  get availableConditionTypes(): NameValueModel[] {
    return [
      { name: 'Equal', value: 'eq' },
      { name: 'Not Equal', value: 'neq' },
      { name: 'OR', value: 'or' },
      { name: 'AND', value: 'and' },
      { name: 'RegEx', value: 'regex' }
    ];
  }
  get availableListDisplayTypes() {
    return [
      { name: 'Table', value: 'table' },
      { name: 'Panel', value: 'list' }
    ]
  }

  /**
   * Get Set for Action Cache
   */
  getActionCache(key: string) {
    return (key in this.action.actionCache) ? this.action.actionCache[key] : null;
  }
  setActionCache(key: string, value: any) {
    // Update if exist or create if not there
    this.action.actionCache[key] = value;
  }

  /**
   * Get Set and Clear for Session Cache
   */
  getCache(key: string) {
    return (key in this.cache) ? this.cache[key] : null;
  }
  setCache(key: string, value: any) {
    // Update if exist or create if not there
    this.cache[key] = value;
  }
  clearCache() {
    this.cache = {};
  }

  /**
   * Get a skeleton with default values for a question
   */
  getQuestionSkeleton(data) {
    const question: QuestionModel = {
      key: data?.key || null,
      value: data?.value || '',
      label: data?.label || '',
      controlType: data?.controlType || 'textbox',
      required: data?.required || false,
      hidden: data?.hidden || false,
      order: data?.order || 1,
      placeholder: data?.placeholder || '',
      multiselect: data?.multiselect || false,
      options: data?.options || [],
      optionsSource: data?.optionsSource || 'Manual',
      optionsSourceHeaders: data?.optionsSourceHeaders || '',
      validator: data?.validator || null,
      validatorRegExp: data?.validatorRegExp || '',
      validatorRegExpFlags: data?.validatorRegExpFlags || '',
      conditions: data?.conditions || null
    }
    // The Key can be an object or string because source can be inout or dropdown
    // So let's flatten it in such case
    if (data?.key && typeof data.key === 'object' && 'value' in data.key) {
      // Needs flattening
      question.key = data.key?.value;
    }
    // If the control type is List
    if (question.controlType === 'list') {
      question['columnsType'] = data?.columnsType || [];
      question['listStyle'] = data?.listStyle || 'table';
    }
    // If the multiselect enabled then it's multiselect else dropdown
    if (question.controlType === 'dropdown' && question.multiselect) {
      question.controlType = 'multiselect';
    } else if (question.controlType === 'multiselect' && !question.multiselect) {
      question.controlType = 'dropdown';
    }
    return question;
  }

  public fetchTemplateFormRules(templateId: number) {
    return this.http.get<any[]>(`${environment.API}/form-rules?template_id=${templateId}`);
  }

  public createFormRule(templateId: number, sequence: number, whenConditions: any[], thenConditions: any[]) {
    return this.http.post<any[]>(`${environment.API}/form-rules`, {
      template_id: templateId,
      sequence,
      when_conditions: whenConditions,
      then_conditions: thenConditions
    });
  }

  public editFormRule(id: number, whenConditions: any[], thenConditions: any[]) {
    return this.http.patch<any[]>(`${environment.API}/form-rules/${id}`, {
      when_conditions: whenConditions,
      then_conditions: thenConditions
    });
  }

  public incrementFormRuleSequence(ruleId: number, increment: boolean) {
    return this.http.put(`${environment.API}/form-rules/increment-sequence/${ruleId}`, { increment });
  }

  public deleteFormRule(ruleId: number) {
    return this.http.delete(`${environment.API}/form-rules/${ruleId}`);
  }
}
