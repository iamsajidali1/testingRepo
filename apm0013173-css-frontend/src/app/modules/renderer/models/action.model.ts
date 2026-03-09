import { QuestionModel } from './question.model';

export interface ActionModel {
  id: number;
  name: string;
  questions: QuestionModel[];
  validationCommands: string[];
  description: string;
  isStaticHost: boolean;
  staticHostname?: string;
  carcheTemplate: any | null;
  vendorType: string;
  services: string[];
  workflow: string;
  workflowId: number;
  enabled: boolean;
  minRollbackTimer: number;
  maxRollbackTimer: number;
}
