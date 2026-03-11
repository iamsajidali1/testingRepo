import { QuestionBase, QuestionOptions } from './question-base';

export class DropdownQuestion extends QuestionBase<string> {
  controlType = 'dropdown';
  blankValue = '';
  options: { key: string, value: string }[] = [];
  optionsSource: string;
  sourceMapAttributes: { value: string, label: string }
  optionsSourceHeaders: { [header: string]: string | string[]; };
  optionsFor : string;
  readonlyFields : number;
  readonlyFieldsFor : Array<string>;

  constructor(options: DropdownQuestionOptions = {}) {
    super(options);
    this.options = options.options || [];
    this.optionsSource = options.optionsSource || undefined;
    this.optionsSourceHeaders = options.optionsSourceHeaders || {};
    this.optionsFor = options.optionsFor || undefined;
    this.readonlyFields = options.readonlyFields || 0;
    this.sourceMapAttributes = options.sourceMapAttributes || undefined;
  }
}

export class DropdownQuestionOptions extends QuestionOptions<string> {
  readonlyFieldsFor? : Array<string>;
  readonlyFields? : number;
  optionsFor? : string;
  options?: { key: string, value: string }[] = [];
  optionsSource?: string;
  sourceMapAttributes?: { value: string, label: string }
  optionsSourceHeaders?: { [header: string]: string | string[]; };
}
