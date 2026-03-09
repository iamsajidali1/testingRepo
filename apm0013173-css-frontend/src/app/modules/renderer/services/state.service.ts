import { Injectable } from '@angular/core';
import {
  InputParamsModel,
  StateModel,
  WorkflowDriversModel
} from '../models/state.model';
import { QuestionModel } from '../models/question.model';
import { MenuItem } from 'primeng/api';
import { SummaryModel } from '../models/summary.model';
import { InitService } from '../../../services/init.service';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class StateService {
  state: StateModel;
  defaultState: StateModel = {
    transactionId: null,
    sessionId: null,
    bcContext: null,
    status: null,
    statusMessage: null,
    inputParameters: null,
    questions: [],
    workflowSteps: [],
    workflowDrivers: [],
    workflowData: [],
    workflowOptions: [],
    cachedScripts: [],
    changeRequestData: null,
    rollbackTimerUtilised: 0, // Set the Initial as 0 min
    rollbackTimerRemaining: 0,
    savedQuestions: []
  };
  inputParametersChangeObservable: BehaviorSubject<any>;
  workflowStepChangeObservable: BehaviorSubject<any[]>;
  constructor(private initService: InitService) {
    this.resetState();
    this.inputParametersChangeObservable = new BehaviorSubject<any>(null);
    this.workflowStepChangeObservable = new BehaviorSubject<any[]>([]);
  }

  /**
   * To reset the application state for next execution
   */
  resetState() {
    this.state = JSON.parse(JSON.stringify(this.defaultState));
    this.state.sessionId = this.initService.session;
    this.state.bcContext = this.initService.bcContext;
  }

  /**
   * Getter for the current state of the application
   */
  get currentState() {
    return this.state;
  }

  /**
   * Getter for the Business Center
   */
  get isBcUser() {
    return this.initService.bcContext?.isBcUser || false;
  }
  get bcContext() {
    return this.initService.bcContext;
  }

  /**
   * Getter and Setter for the Transaction ID
   */
  get transactionId() {
    return this.state.transactionId;
  }
  set transactionId(id: string) {
    this.state.transactionId = id;
  }

  /**
   * Getter and Setter for the Status
   */
  get status() {
    return this.state.status;
  }
  set status(status: string) {
    this.state.status = status;
  }

  /**
   * Getter and Setter for the Status Message
   */
  get statusMessage() {
    return this.state.statusMessage;
  }
  set statusMessage(statusMsg: string) {
    this.state.statusMessage = statusMsg;
  }

  /**
   * Getter and Setter for the inputParams
   */
  get inputParams() {
    return this.state.inputParameters;
  }
  set inputParams(params: InputParamsModel) {
    this.state.inputParameters = params;
    this.inputParametersChangeObservable.next(params);
  }

  /**
   * Getter and Setter for the questions
   */
  get questions() {
    return this.state.questions;
  }
  set questions(questions: QuestionModel[]) {
    this.state.questions = questions;
  }

  /**
   * Getter and Setter for the workflowSteps
   */
  get workflowSteps() {
    return this.state.workflowSteps;
  }
  set workflowSteps(steps: MenuItem[]) {
    this.state.workflowSteps = steps;
    this.workflowStepChangeObservable.next(steps);
  }

  /**
   * Getter and Setter for the workflowDrivers
   */
  get workflowDrivers() {
    return this.state.workflowDrivers;
  }
  set workflowDrivers(drivers: WorkflowDriversModel[]) {
    this.state.workflowDrivers = drivers;
  }

  /**
   * Getter and Setter for the cachedScripts
   */
  get cachedScripts() {
    return this.state.cachedScripts;
  }
  set cachedScripts(scripts: any[]) {
    this.state.cachedScripts = scripts;
  }

  /**
   * Getter and Setter for the ChangeRequestData
   */
  get changeRequestData() {
    return this.state.changeRequestData;
  }
  set changeRequestData(data: any) {
    this.state.changeRequestData = data;
  }

  /**
   * Getter and Setter for Rollback timers Utilisation
   */
  get rollbackTimerUtilised() {
    return this.state.rollbackTimerUtilised;
  }
  set rollbackTimerUtilised(minutes: number) {
    this.state.rollbackTimerUtilised = minutes;
  }

  /**
   * Getter and Setter for Rollback timers Remaining
   */
  get rollbackTimerRemaining() {
    return this.state.rollbackTimerRemaining;
  }
  set rollbackTimerRemaining(minutes: number) {
    this.state.rollbackTimerRemaining = minutes;
  }

  /**
   * Getters for the device
   */
  get deviceName() {
    return this.state?.inputParameters?.device?.HOSTNAME || null;
  }
  get deviceDetails() {
    return this.state?.inputParameters?.device || null;
  }

  /**
   * Getter for the Quick Summary
   */
  get summary() {
    const summary: SummaryModel = {
      sessionId: this.initService.session,
      transactionId: this.transactionId,
      customerName: this.inputParams?.customer?.name,
      customerId: this.inputParams?.customer?.id,
      customerBcId: this.initService.bcContext?.ebizCompanyId,
      serviceName: this.inputParams?.service?.name,
      serviceId: this.inputParams?.service?.id,
      actionName: this.inputParams?.action?.name,
      actionDescription: this.inputParams?.action?.description,
      hostname: this.inputParams?.device?.HOSTNAME,
      vendorType: this.inputParams?.action?.vendorType,
      changeType: this.inputParams?.actionType,
      configTemplateName: this.inputParams?.action?.carcheTemplate?.name,
      requester: this.initService.userId
    };
    return summary;
  }

  /**
   * Getter & Setter for Saved Questions
   */
  get savedQuestions() {
    return this.state.savedQuestions;
  }
  set savedQuestions(questions: QuestionModel[]) {
    this.state.savedQuestions = questions;
  }

  /**
   * Get workflow driver for the passed component
   * @param component string
   */
  getWorkflowDriver(component: string) {
    return this.state.workflowDrivers.find(
      (driver) => driver.current === component
    );
  }

  /**
   * Get workflow data by step name/ id/ routerLink
   * @param step string
   */
  getWorkflowData(step: string) {
    const workflowData = this.state.workflowData.find(
      (data) => data.step === step
    );
    return workflowData?.data || null;
  }

  /**
   * Get workflow options by step name/ id/ routerLink
   * @param step string
   */
  getWorkflowOptions(step: string) {
    const workflowOptions = this.state.workflowOptions.find(
      (data) => data.step === step
    );
    return workflowOptions?.options || {};
  }

  /**
   * Set the data against the step name/ id/ routerLink
   * @param step string
   * @param data object
   */
  setWorkflowData(step: string, data: object) {
    const index = this.state.workflowData.findIndex(
      (workflowData) => workflowData.step === step
    );
    if (index !== -1) {
      this.state.workflowData[index].data = data;
    } else {
      this.state.workflowData.push({ step, data });
    }
  }

  /**
   * Set the options against the step name/ id/ routerLink
   * @param step string
   * @param options object
   */
  setWorkflowOptions(step: string, options: object) {
    const index = this.state.workflowOptions.findIndex(
      (workflowOption) => workflowOption.step === step
    );
    if (index !== -1) {
      this.state.workflowOptions[index].options = options;
    } else {
      this.state.workflowOptions.push({ step, options });
    }
  }
}
