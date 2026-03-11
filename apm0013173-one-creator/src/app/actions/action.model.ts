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

export interface ConditionModel {
  type: NameValueModel;
  attributes: KeyValueModel[] | ConditionModel[];
}

export interface QuestionModel {
  key: string;
  value?: string | null;
  label: string;
  required: boolean;
  order: number;
  controlType:
    | 'dropdown'
    | 'textbox'
    | 'message'
    | 'list'
    | 'chips'
    | 'file'
    | 'multiselect';
  conditions?: ConditionModel | null;
  columnsType?: QuestionModel[];
  hidden?: boolean;
  placeholder?: string;
  hasTemplate?: boolean;
  templateHeaders?: string[];
  templateName?: string;
  section?: string;
  validator?: NameValueModel | null;
  validatorRegExp?: string;
  validatorRegExpFlags?: string;
  blankValue?: any;
  multiselect?: boolean;
  options?: KeyValueModel[];
  optionsSource?: string | LabelValueModel;
  optionsSourceHeaders?: any;
  filteredOptions?: KeyValueModel[];
  readonlyFields?: number;
  type?: string;
  listStyle?: 'table' | 'div';
  shouldUseAsCarcheReq?: boolean;
}
