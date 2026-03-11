import {Component, OnDestroy, OnInit} from '@angular/core';
import {DynamicDialogConfig, DynamicDialogRef} from 'primeng/dynamicdialog';
import {FormArray, FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';
import {ActionService} from '../../action.service';
import {KeyValueModel, LabelValueModel, NameValueModel, QuestionModel} from '../../action.model';
import {Subscription} from 'rxjs';
import {ControllerService} from '../../../services/controller.service';
import {concatMap, finalize, map} from 'rxjs/operators';
import {ApiConnectService} from '../../../template-manager/api-connect.service';

const CONFIG_TEMPLATE_ATTRIBUTE_ID = 4;

@Component({
  selector: 'app-forms-dialog',
  templateUrl: './forms-dialog.component.html',
  styleUrls: ['./forms-dialog.component.css']
})
export class FormsDialogComponent implements OnDestroy {
  isScriptsLoading: boolean;
  isCarcheVarsLoading: boolean;
  controlType: string;
  action: 'add' | 'edit';
  selectedQuestion: QuestionModel;
  questions: QuestionModel[];
  apiErrors: any = {};
  formValues: any;
  formGroup: FormGroup;
  carcheVariables: NameValueModel[] = [];
  validators: NameValueModel[] = [];
  optionsSource: LabelValueModel[] = [];
  optionSourceTypes: NameValueModel[] = [];
  conditionTypes: NameValueModel[] = [];
  listDisplayTypes: NameValueModel[] = [];
  subscriptions: Subscription[] = [];
  constructor(private actionSvc: ActionService,
              private controllerSvc: ControllerService,
              private apiService: ApiConnectService,
              private formBuilder: FormBuilder,
              public dialogRef: DynamicDialogRef,
              public config: DynamicDialogConfig) {
    this.action = config.data?.action;
    this.controlType = config.data.controlType;
    this.selectedQuestion = config.data?.selectedQuestion || {};
    this.questions = config.data?.questions || [];
    this.validators = this.actionSvc.availableValidators;
    this.optionSourceTypes = this.actionSvc.availableOptionSources;
    this.conditionTypes = this.actionSvc.availableConditionTypes;
    this.listDisplayTypes = this.actionSvc.availableListDisplayTypes;
    this.buildForm();
  }

  /**
   * Getter which tells whether Carche Vars should be required for keys dropdown
   */
  get shouldUseCarcheVars() {
    const attributes = this.actionSvc.actionAttributes;
    const configAttribute = attributes ? attributes.find(att => att.id === CONFIG_TEMPLATE_ATTRIBUTE_ID) : {};
    return configAttribute?.status === 'required';
  }

  /**
   * Getter for formArray controls for options
   */
  get optionsFormArrayControls() {
    const formArray = this.formGroup.get('options') as FormArray;
    return formArray.controls;
  }

  optionsFormArrayControlsFor(index: number) {
    const formArray = this.columnsTypeFromArrayControls[index].get('options') as FormArray;
    return formArray.controls;
  }

  /**
   * Getter for the Option Source Type
   */
  get optionSourceType() {
    // Set the default to Manual
    let optionSourceType: NameValueModel = { name: 'Manual', value: 'Manual' };
    const optionsSource = this.selectedQuestion?.optionsSource;
    if(optionsSource && typeof optionsSource === 'object') {
      const { value } = optionsSource;
      // Check if the value Exist in The API List
      const foundInApi = this.actionSvc.availableApiOptionSources
        .findIndex(api => api.value === value);
      optionSourceType = foundInApi !== -1
        ? { name: 'API Endpoint', value: 'API' }
        : { name: 'MCAP Script', value: 'Script' };
    }
    return optionSourceType;
  }

  /**
   * Getter for formArray controls for Conditional Attributes
   */
  get conditionAttributesFormArrayControls() {
    const formArray = this.formGroup.get('conditions')?.get('attributes') as FormArray;
    return formArray.controls;
  }

  /**
   * Getter for the Columns Type Form Array Control
   */
  get columnsTypeFromArrayControls() {
    const formArray = this.formGroup.get('columnsType') as FormArray;
    return formArray.controls;
  }

  /**
   * Fetch the MCAP Scripts for Scripts OptionSource Dropdown
   */
  onLoadScripts() {
    const scriptsCache = this.actionSvc.getCache('scripts');
    if(scriptsCache) {
      this.optionsSource = [...scriptsCache];
      this.formGroup.patchValue({optionsSource: this.selectedQuestion.optionsSource});
      return;
    }
    this.isScriptsLoading = true;
    this.apiErrors['scripts'] = null;
    const subscription = this.controllerSvc.getApiOptionsSource()
      .pipe(concatMap((data) => this.controllerSvc.schedulerPoll(data.pid)))
      .pipe(finalize(() =>  this.isScriptsLoading = false))
      .subscribe((scripts: any[]) => {
        if(!scripts || scripts.length === 0) {
          this.apiErrors['scripts'] = { status: 404, message: 'No Scripts found.'};
          return;
        }
        this.actionSvc.setCache('scripts', scripts);
        this.optionsSource = [...scripts];
        this.formGroup.patchValue({optionsSource: this.selectedQuestion.optionsSource});
      }, error => {
        const message= 'Unable to load scripts!';
        this.apiErrors['scripts'] = { status: error?.status || 500, message: 'Unable to load Scripts.'};
      });
    this.subscriptions.push(subscription);
  }

  /**
   * Fetch the Carche Variables for Key Dropdown
   */
  onLoadCarcheVars() {
    // Load form cache if already existing
    const carcheVarsCache = this.actionSvc.getActionCache('carcheVars');
    if(carcheVarsCache) {
      this.carcheVariables = [...carcheVarsCache];
      // Set the value if it's existing
      const key = this.carcheVariables.find(
        variable => variable.value === this.selectedQuestion?.key
      );
      this.formGroup.patchValue({key})
      return;
    }
    // Initiate the errors to be null
    this.apiErrors['carcheVars'] = null;
    const carcheTemplate = this.actionSvc.carcheTemplate;
    const templateId = carcheTemplate?.id;
    const templateType = carcheTemplate?.templateType;
    if(!templateId || !templateType) {
      this.apiErrors['carcheVars'] = {
        status: 422,
        message: 'Missing template id or type.'
      }
      return;
    }
    this.isCarcheVarsLoading = true;
    const subscription = this.apiService
      .getListOfTemplateVariablesByIdAndDeviceModel(templateId, templateType)
      .pipe(map(variables => variables.map(variable => ({name: variable, value: variable}))))
      .pipe(finalize(() =>  this.isCarcheVarsLoading = false))
      .subscribe(carcheVars => {
        if(!carcheVars || carcheVars.length === 0) {
          this.apiErrors['carcheVars'] = { status: 404, message: 'No keys found.'};
          return;
        }
        this.actionSvc.setActionCache('carcheVars', carcheVars);
        this.carcheVariables = [...carcheVars];
        // Set the value if it's existing
        const key = this.carcheVariables.find(
          variable => variable.value === this.selectedQuestion?.key
        );
        this.formGroup.patchValue({key})
      }, error => {
        const message= 'Unable to load keys!';
        this.apiErrors['carcheVars'] = { status: error?.status || 500, message: 'Unable to load keys.'};
      })
    this.subscriptions.push(subscription)
  }

  /**
   * On Reset of the Global FormGroup
   */
  onReset() {
    if(this.action === 'add')
      return this.formGroup.reset();
    // reset function sorcery for conditions
    const hasConditions = !!this.formValues?.conditions && Object.keys(this.formValues?.conditions).length !== 0;
    if(hasConditions) {
      this.formGroup.setControl(
        'conditions',
        this.initCondition(this.formValues.conditions.attributes, this.formValues.conditions.type)
      )
    }
    this.formGroup.setValue(this.formValues);
    this.formGroup.updateValueAndValidity();
  }

  /**
   * To Init an Option FormGroup
   * @params key
   * @params value
   */
  initOption(key?: string, value?: string) {
    return this.formBuilder.group({
      key: [key, Validators.required],
      value: [value, Validators.required]
    })
  }

  /**
   * Add a new option in the Options FormArray
   */
  addOption(controlIndex?: number) {
    let control = this.formGroup.get('options') as FormArray;
    if(controlIndex !== undefined) {
      control = this.columnsTypeFromArrayControls[controlIndex].get('options') as FormArray;
    }
    control.push(this.initOption());
  }

  /**
   * Remove the option from the Options FormArray
   * @params index
   */
  removeOption(index: number, controlIndex?: number) {
    let control = this.formGroup.get('options') as FormArray;
    if(controlIndex !== undefined) {
      control = this.columnsTypeFromArrayControls[controlIndex].get('options') as FormArray;
    }
    control.removeAt(index);
  }

  /**
   * Get OptionFormArray by setting values
   * @params options
   */
  getOptionFormArray(options: any[]) {
    return options.map(option => this.initOption(option.key, option.value));
  }

  /**
   * To Init a Condition FormGroup
   * @params type
   * @params key
   * @params value
   */
  initCondition(attributes: KeyValueModel[] = [], type?: NameValueModel) {
    return this.formBuilder.group({
      type: [type, Validators.required],
      attributes: this.formBuilder.array(
        attributes.map(attribute => this.formBuilder.group({
          key: [attribute?.key, Validators.required],
          value: [attribute?.value, Validators.required]
        }))
      )
    })
  }

  /**
   * Add an empty conditional attribute to the FormArray
   */
  addConditionAttribute() {
    const control = this.formGroup.get('conditions')?.get('attributes') as FormArray;
    control.push(this.formBuilder.group({
      key: [null, Validators.required],
      value: [null, Validators.required]
    }));
  }

  /**
   * Remove the attribute from the Conditions Attributes FormArray
   * @params index
   */
  removeConditionAttribute(index: number) {
    const control = this.formGroup.get('options').get('attributes') as FormArray;
    control.removeAt(index);
  }

  /**
   * Get Columns Type FormArray by setting values
   * @params options
   */
  getColumnsTypeFormArray(columnsType: QuestionModel[]) {
    return columnsType.map(column => {
      switch (column.controlType) {
        case 'message':
          return this.getMessageFormGroup(column);
        case 'textbox':
        case 'chips':
          return this.getInputFormGroup(column.controlType, column);
        case 'dropdown':
        case 'multiselect':
          return this.getDropdownFormGroup(column.controlType, column);
      }
    });
  }

  /**
   * Add an empty control into the columnsType
   */
  addColumnsType(controlType: string) {
    let formGroup: FormGroup;
    switch (controlType) {
      case 'textbox':
      case 'chips':
        formGroup = this.getInputFormGroup(controlType)
        break;
      case 'dropdown':
      case 'multiselect':
        formGroup = this.getDropdownFormGroup(controlType)
        break;
    }
    const control = this.formGroup.get('columnsType') as FormArray;
    control.push(formGroup);
  }

  /**
   * Remove the control from the columnsTypes FormArray
   * @params index
   */
  removeColumnsType(index: number) {
    const control = this.formGroup.get('columnsType') as FormArray;
    control.removeAt(index);
  }



  /**
   * Get FormGroup for a Message
   * @params attributes optional param default to empty object
   */
  getMessageFormGroup(attributes: any = {}): FormGroup {
    return this.formBuilder.group({
      controlType: ['message', Validators.required],
      label: [attributes?.label, Validators.required],
      key: [attributes?.key],
      value: [attributes?.value, Validators.required],
      hidden: [!!attributes?.hidden],
      order: [attributes?.order],
      hasConditions: [!!attributes?.hasCondition, Validators.required]
    })
  }

  /**
   * Get FormGroup for an Input - TextBox | Chips
   * @params type optional default value 'textbox'
   * @params attributes optional param default to empty object
   */
  getInputFormGroup(type: string = 'textbox', attributes: any = {}): FormGroup {
    return this.formBuilder.group({
      controlType: [type, Validators.required],
      label: [attributes?.label, Validators.required],
      key: [attributes?.key, Validators.required],
      value: [attributes?.value],
      required: [!!attributes?.required, Validators.required],
      hidden: [!!attributes?.hidden],
      order: [attributes?.order],
      placeholder: [attributes?.placeholder],
      validator: [attributes?.validator],
      validatorRegExp: [attributes?.validatorRegExp],
      hasConditions: [!!attributes?.hasCondition, Validators.required]
    })
  }

  /**
   * Get FormGroup for a DropDown - Dropdown | Multiselect
   * @params type optional default value 'dropdown'
   * @params attributes optional param default to empty object
   */
  getDropdownFormGroup(type: string = 'dropdown', attributes: any = {}): FormGroup {
    return this.formBuilder.group({
      controlType: [type, Validators.required],
      label: [attributes?.label, Validators.required],
      key: [attributes?.key, Validators.required],
      value: [attributes?.value],
      required: [!!attributes?.required, Validators.required],
      hidden: [!!attributes?.hidden],
      multiselect: [!!attributes?.multiselect, Validators.required],
      order: [attributes?.order],
      placeholder: [attributes?.placeholder],
      options: this.formBuilder.array(attributes?.options ? this.getOptionFormArray(attributes.options) : []),
      optionSourceType: [attributes?.optionSourceType, Validators.required],
      optionsSource: [attributes?.optionsSource, Validators.required],
      hasConditions: [!!attributes?.hasCondition, Validators.required]
    })
  }

  /**
   * Get FormGroup for a List/ Complex List
   * @params attributes optional param default to empty object
   */
  getListFormGroup(attributes: any = {}) {
    return this.formBuilder.group({
      controlType: ['list', Validators.required],
      label: [attributes?.label, Validators.required],
      key: [attributes?.key, Validators.required],
      value: [attributes?.value],
      hidden: [!!attributes?.hidden],
      order: [attributes?.order],
      listType: [attributes?.listType, Validators.required],
      columnsType: this.formBuilder.array(attributes?.columnsType ? this.getColumnsTypeFormArray(attributes.columnsType) : []),
      hasConditions: [attributes?.hasCondition, Validators.required]
    });
  }

  /**
   * Build the Form
   */
  buildForm() {
    const attributes = this.action === 'edit' ? JSON.parse(JSON.stringify(this.selectedQuestion)) : {};
    attributes['hasCondition'] = !!attributes?.conditions && Object.keys(attributes.conditions).length !== 0;
    attributes['order'] = attributes?.order || this.questions.length + 1;
    switch (this.controlType) {
      case 'message':
        // Get formGroup
        this.formGroup = this.getMessageFormGroup(attributes);
        break;
      case 'textbox':
      case 'chips':
        // Get formGroup
        this.formGroup = this.getInputFormGroup(this.controlType, attributes);
        // Should use carche Vars as keys only?
        if(this.shouldUseCarcheVars) { this.onLoadCarcheVars(); }
        break;
      case 'dropdown':
      case 'multiselect':
        // Set up the attributes accordingly for this control
        attributes['multiselect'] = this.controlType === 'multiselect';
        attributes['optionSourceType'] = this.action === 'edit' ? this.optionSourceType : null;
        // Get formGroup
        this.formGroup = this.getDropdownFormGroup(this.controlType, attributes)
        // Should use carche Vars as keys only?
        if(this.shouldUseCarcheVars) { this.onLoadCarcheVars(); }
        // Update the Option Source by Type
        this.onOptionSrcTypeChange(this.formGroup.value.optionSourceType);
        break;
      case 'list':
        // Find out list Type
        const matchedList = this.listDisplayTypes
          .find(mode => mode.value === attributes?.listType);
        attributes['listType'] = matchedList || this.listDisplayTypes[0]
        this.formGroup = this.getListFormGroup(attributes);
        break;
    }
    // Set up the condition in the formGroup
    if(attributes?.hasCondition) {
      const { type, attributes: attr } = attributes.conditions;
      const matchedType = this.conditionTypes
        .find(cType => cType.value === type.value);
      this.formGroup.setControl('conditions', this.initCondition(attr, matchedType));
    } else {
      this.formGroup.setControl('conditions', new FormControl(null))
    }
    // Save the original Form State for later Use
    this.formValues = this.formGroup.value;
  }

  /**
   * When the Option Source is Changed
   * @params type
   */
  onOptionSrcTypeChange(type: any, index?: number) {
    const value = type?.value;
    // If option Source is Manual
    if(value === 'Manual') {
      if(index !== undefined) {
        this.columnsTypeFromArrayControls[index].patchValue({optionsSource: 'Manual'})
        if(this.columnsTypeFromArrayControls[index].get('options').value?.length === 0) {
          this.addOption(index)
        }
      } else {
        this.formGroup.patchValue({optionsSource: 'Manual'});
        // Add an empty key value pair if none exists
        if(this.formGroup.value?.options?.length === 0) {
          this.addOption();
        }
      }
    }
    // If option Source is from External API
    if(value === 'API') {
      this.optionsSource = [...this.actionSvc.availableApiOptionSources];
      this.formGroup.patchValue({optionsSource: this.selectedQuestion.optionsSource});
    }
    // If option Source is from MCAP Scripts
    if(value === 'Script') {
      this.onLoadScripts();
    }
  }

  /**
   * When the condition switch is toggled
   * @params checked
   */
  onConditionToggle(checked: boolean) {
    if(checked) {
      this.formGroup.setControl('conditions', this.initCondition());
      this.addConditionAttribute();
    } else {
      setTimeout(() => this.formGroup.setControl('conditions', new FormControl(null)), 0)
    }
    this.formGroup.updateValueAndValidity();
  }

  /**
   * Everything Done, create the final question
   */
  onContinue() {
    if(!this.formGroup.valid) return;
    const question = this.actionSvc.getQuestionSkeleton(this.formGroup.value);
    this.dialogRef.close(question);
  }

  /**
   * Never forget to clean up
   */
  ngOnDestroy() {
    this.subscriptions.forEach((subscription) => {
      if(subscription) {
        subscription.unsubscribe();
      }
    })
  }
}
