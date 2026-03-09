import { KeyValueModel, LabelValueModel, NameValueModel } from './utils.model';

export interface ConditionModel {
  type: NameValueModel;
  attributes: KeyValueModel[] | ConditionModel[];
}

export interface TabModel {
  header: string;
  key: string;
  selected?: string;
  disabled?: string;
  icon?: string;
  content: QuestionModel[];
}

export interface QuestionModel {
  key: string;
  value?: any;
  label: string;
  required: boolean;
  readonly?: boolean;
  order: number;
  controlType:
    | 'dropdown'
    | 'textbox'
    | 'message'
    | 'list'
    | 'chips'
    | 'file'
    | 'multiselect'
    | 'tabs';
  conditions?: ConditionModel | null;
  columnsType?: QuestionModel[];
  columnHeaderRef?: string;
  tabs?: TabModel[];
  hidden?: boolean;
  placeholder?: string;
  hasTemplate?: boolean;
  templateHeaders?: string[];
  templateName?: string;
  section?: string;
  validator?: NameValueModel | null;
  validatorRegExp?: string;
  validatorRegExpFlags?: string;
  validatorRegExpErrorMessage?: string;
  blankValue?: any;
  options?: KeyValueModel[];
  optionsSource?: string | LabelValueModel;
  optionsSourceHeaders?: any;
  filteredOptions?: KeyValueModel[];
  readonlyFields?: number;
  type?: string;
  listStyle?: 'table' | 'div';
  shouldUseAsCarcheReq?: boolean;
}
