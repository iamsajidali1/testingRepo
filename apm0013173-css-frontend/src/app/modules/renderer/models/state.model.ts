import { QuestionModel } from './question.model';
import { IdNameModel } from './utils.model';
import { ActionModel } from './action.model';
import { MenuItem } from 'primeng/api';
import { ProcessModel } from './process.model';
import { DeviceModel } from './device.model';

export interface StateModel {
  transactionId: string | null;
  sessionId: string | null;
  bcContext: BcContextModel;
  status: string;
  statusMessage: string;
  inputParameters: InputParamsModel | null;
  questions: QuestionModel[];
  workflowSteps: MenuItem[];
  workflowDrivers: WorkflowDriversModel[];
  workflowData: WorkflowDataModel[];
  workflowOptions?: WorkflowOptionsModel[];
  cachedScripts: any[];
  changeRequestData: any;
  rollbackTimerUtilised: number;
  rollbackTimerRemaining: number;
  savedQuestions: QuestionModel[];
}

export interface InputParamsModel {
  customer: IdNameModel | undefined;
  service: IdNameModel;
  device: DeviceModel | null;
  actionType: string;
  action: ActionModel;
}

export interface BcContextModel {
  bcEnv: string;
  ebizCompanyId: string;
  ebizUserId: string;
  isBcUser: boolean;
}

export interface WorkflowDriversModel {
  previous: string | null;
  current: string;
  next: string | null;
  shouldConfirm: boolean;
  confirmMessage: string | null;
  processes: ProcessModel[];
}

export interface WorkflowDataModel {
  step: string;
  data: any;
}

export interface WorkflowOptionsModel {
  step: string;
  options: any;
}
