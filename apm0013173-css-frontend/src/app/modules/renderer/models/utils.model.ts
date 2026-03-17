import { ConditionModel } from './question.model';

export interface IdNameModel {
  id: number;
  name: string;
}

export interface KeyValueModel {
  key: string;
  value: string | number | boolean | null;
  conditions?: ConditionModel;
}

export interface NameValueModel {
  name: string;
  value: string | number | boolean | null;
}

export interface LabelValueModel {
  label: string;
  value: string | null;
}

export interface NgDragDropModel {
  dragIndex: number;
  dropIndex: number;
}
