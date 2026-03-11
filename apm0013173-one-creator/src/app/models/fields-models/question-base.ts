import { Condition } from './condition-objects';

export class QuestionBase<T> {

  controlType: string;
  blankValue: T;
  value: T;
  key: string;
  label: string;
  required: boolean;
  order: number;
  conditions: Condition;
  placeholder: string;
  hidden: boolean;
  section: string;
  validator: 'ipv4' | 'ipv6' | 'email' | 'regexp';
  validatorRegExp: string;
  validatorRegExpFlags: string;
  validatorRegExpErrorMessage: string;


  constructor(options: QuestionOptions<T> = {}) {
    this.value = options.value;
    this.key = options.key || '';
    this.label = options.label || '';
    this.required = options.required;
    this.order = options.order === undefined ? 1 : options.order;
    this.controlType = options.controlType || '';
    this.hidden = options.hidden || false;
    this.conditions = options.conditions;
    this.placeholder = options.placeholder || '';
    this.section = options.section || '';
    this.validator = options.validator;
    this.validatorRegExp = options.validatorRegExp || '.*';
    this.validatorRegExpFlags = options.validatorRegExpFlags || '';
    this.validatorRegExpErrorMessage = options.validatorRegExpErrorMessage;
  }
}

export class QuestionOptions<T> {
  value?: T;
  key?: string;
  label?: string;
  required?: boolean;
  order?: number;
  controlType?: string;
  hidden?: boolean;
  conditions?: Condition;
  placeholder?: string;
  section?: string;
  validator?: 'ipv4' | 'ipv6' | 'email' | 'regexp';
  validatorRegExp?: string;
  validatorRegExpFlags?: string;
  validatorRegExpErrorMessage?: string;
}
