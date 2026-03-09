import {
  AfterViewInit,
  Component,
  Input,
  OnDestroy,
  OnInit
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StateService } from '../../../services/state.service';
import { QuestionModel } from '../../../models/question.model';
import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { validateIPv4, validateIPv6 } from '../../../validators/ip.validator';
import { UtilService } from '../../../services/util.service';
import { NameValueModel, NgDragDropModel } from '../../../models/utils.model';
import { Subscription } from 'rxjs';
import { DialogService } from 'primeng/dynamicdialog';
import { ProcessDialogComponent } from '../../../dialogs/process-dialog/process-dialog.component';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { AssetService } from '../../../services/asset.service';
import { DataTemplateDialogComponent } from '../../../dialogs/data-template-dialog/data-template-dialog.component';
import { InitService } from '../../../../../services/init.service';

const REGEX_STRING_REFERENCE = /\${(.*?)}/g;
const TDC_WORKFLOW_ID = 2;
const SDS_SERVICE_ID = 5;

@Component({
  selector: 'app-data-collection',
  templateUrl: './data-collection.component.html',
  styleUrls: ['./data-collection.component.scss']
})
export class DataCollectionComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @Input() form!: FormGroup;
  isLoading: boolean;
  isReadonly: boolean;
  isSaveDraftAllowed: boolean;
  isTransactionError: boolean;
  title: string;
  component: string = 'data-collection';
  workflowId: number;
  fileErrors: any = {};
  controlsDependencyMap: any = {};
  questions: QuestionModel[] = [];
  questionsToRender: QuestionModel[] = [];
  uploadedFiles: File[] = [];
  dataCollectionActions: MenuItem[] = [];
  subscriptions: Subscription[] = [];
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private initService: InitService,
    private stateService: StateService,
    private assetService: AssetService,
    private dialogService: DialogService,
    private utilService: UtilService,
    private confirmationService: ConfirmationService
  ) {
    // Check if there is a transaction id passed as query params
    // That is an indication to resume Data Collection for TDC
    this.activatedRoute.queryParams.subscribe((queryParams) => {
      if ('transactionId' in queryParams) {
        const { transactionId } = queryParams;
        this.isTransactionError =
          !utilService.isValidTransactionId(transactionId);
        console.log('Looking up CDC for Transaction', transactionId);
        this.onResumeDataCollection(transactionId);
      }
    });
    // Get the Title of the Component
    const currentStep = this.stateService.workflowSteps.find(
      (step) => step.routerLink === this.component
    );
    this.title = currentStep ? currentStep.title || currentStep.label : '';
    this.questions = this.stateService.questions;
    this.workflowId = this.stateService.inputParams?.action.workflowId;
    // Initiate Data Collection Action Menu Button
    this.dataCollectionActions = [
      {
        label: 'Data Template',
        items: [
          {
            label: 'Import saved Template',
            icon: 'pi pi-download',
            command: () => {
              this.onImport();
            }
          },
          {
            label: 'Save as a Data Template',
            icon: 'pi pi-save',
            command: () => {
              this.onSave();
            }
          }
        ]
      }
    ];
  }

  ngOnInit(): void {
    // Get Questions to be rendered;
    // Get saved Questions if dynamic questions was used
    if (this.stateService.savedQuestions.length > 0) {
      this.questionsToRender = this.stateService.savedQuestions;
    } else {
      this.questionsToRender = this.getQuestionsToRender();
    }
    // Render Questions
    this.renderForm(this.questionsToRender);
    // Save to Draft is only Allowed for Technical Data Collection
    this.isSaveDraftAllowed = this.workflowId === TDC_WORKFLOW_ID;
  }

  ngAfterViewInit() {
    setTimeout(() => {
      // Check if already form is filled - from Back Flow
      const data = this.stateService.getWorkflowData(this.component);
      const options = this.stateService.getWorkflowOptions(this.component);
      if (data) {
        this.onPatchForm(data);
      }
      if (options && 'readOnly' in options) {
        this.form.disable();
        this.isReadonly = true;
      }
    }, 0);
  }

  getQuestionsToRender() {
    const questions = [...this.questions];
    // Sort the questions by order
    questions.sort(this.utilService.sortQuestions);
    // Filter out questions that has no condition set for rendering
    return questions.filter(
      (question) => !('conditions' in question) || !question.conditions
    );
  }

  renderForm(questions: QuestionModel[]) {
    // Create the Form
    this.form = this.getFormGroup(questions);
    // Filter out List Type Questions - nonPrimitiveQuestions
    const listTypeQuestions = questions.filter(
      (question) => question.controlType === 'list'
    );
    listTypeQuestions.forEach((question) => {
      const formArray = this.getFormArray(question);
      this.form.addControl(question.key, formArray);
    });
    // Filter out Tab type of Questions - nonPrimitiveQuestions
    const tabTypeQuestions = questions.filter(
      (question) => question.controlType === 'tabs'
    );
    tabTypeQuestions.forEach((tabQuestion) => {
      // Go through each Tab, each Tab is a FormGroup
      tabQuestion.tabs.forEach((tab) => {
        const formGroup = this.getFormGroup(
          [...tab.content].sort(this.utilService.sortQuestions)
        );
        this.form.addControl(tab.key, formGroup);
      });
    });
    this.form.updateValueAndValidity();
    // Evaluate the Inline Functions
    this.evaluateInlineFunction(this.questionsToRender);
    this.replaceImplicitVariables(this.questionsToRender);
  }

  getPanelHeader(question: QuestionModel, index: number) {
    if (question.columnHeaderRef) {
      const labelTarget = question.columnsType.find(
        (col) => col.key === question.columnHeaderRef
      );
      if (labelTarget) {
        const prefix = labelTarget.label;
        const suffix =
          this.form.value[question.key][index][question.columnHeaderRef];
        return `${prefix} - ${suffix || 'N/A'}`;
      }
    }
    return `${question.label} [${index}]`;
  }

  validateConditions(type: NameValueModel, attributes: any[]) {
    const reduced: boolean[] = attributes.map((elem) => {
      if ('type' in elem) {
        return this.validateConditions(elem.type, elem.attributes);
      }
      // find out what options to filter out
      const hasFormControl = this.form.contains(elem.key);
      if (!hasFormControl) {
        return false;
      }
      const value = this.form.get(elem.key)?.value;
      if (!value) {
        return false;
      }
      if (type.value === 'regex') {
        const match = value.match(elem.value);
        return match && match.length > 0;
      }
      return value === elem.value;
    });
    if (type.value === 'regex') {
      // By default, regex is checking for OR
      return this.utilService.checkConditions('or', reduced);
    }
    return this.utilService.checkConditions(type.value, reduced);
  }

  shouldRenderInForm(question: QuestionModel) {
    // If there is no conditions, Render
    if (!('conditions' in question) || !question.conditions) {
      return true;
    }
    // Funny part is condition can be empty object also :(
    if (Object.keys(question.conditions).length === 0) {
      return true;
    }
    // Real game starts here
    const { type, attributes } = question.conditions;
    return this.validateConditions(type, attributes);
  }

  getDropdownOptionsToRender = (question: QuestionModel) => {
    return question.options.filter((option) => {
      // If no Condition Given Please Render
      if (!('conditions' in option)) {
        return true;
      }
      const { type, attributes } = option.conditions;
      return this.validateConditions(type, attributes);
    });
  };

  onDropdownChanged() {
    const questions = [...this.questions];
    questions.forEach((question) => {
      const shouldRender = this.shouldRenderInForm(question);
      if (shouldRender) {
        // Add this question to the bucket
        this.questionsToRender = this.utilService.addQuestionIfNotExists(
          this.questionsToRender,
          question
        );
        // Create form control except for message as they are just layouts
        if (!['message', 'tabs'].includes(question.controlType)) {
          // Create a control if it does not already exist
          if (!this.form.contains(question.key)) {
            const newControl = this.getFormControl(question);
            this.form.addControl(question.key, newControl);
          }
          // This is particularly useful for dependant dropdowns
          if (question.controlType === 'dropdown') {
            // Create a new Conditioned Options Field to contained filtered options
            question.filteredOptions =
              this.getDropdownOptionsToRender(question);
          }
        }
      } else if (this.form.contains(question.key)) {
        // Remove this question from the questionsToRender
        this.questionsToRender = this.utilService.deleteQuestionIfExists(
          this.questionsToRender,
          question
        );
        // Remove the control does not match the condition
        this.form.removeControl(question.key);
      }
    });
    // Sort the questions by order
    this.questionsToRender.sort(this.utilService.sortQuestions);
  }

  onChangeHandler(_event: any, question: QuestionModel) {
    for (let control in this.controlsDependencyMap) {
      this.controlsDependencyMap[control].forEach((dependency: string) => {
        if (dependency === question.key) {
          this.evaluateInlineFunction(this.questionsToRender);
        }
      });
    }
  }

  replaceVarRefWithValue(input: any, question: QuestionModel) {
    if (!(input && typeof input === 'string')) return input;
    const variables = input.match(REGEX_STRING_REFERENCE);
    if (!variables) return input;
    // Init the controlDependencyMap
    this.controlsDependencyMap[question.key] =
      this.controlsDependencyMap[question.key] || [];
    // If there is interpolated variable, find the reference value and replace
    const formValue = JSON.parse(JSON.stringify(this.form.value));
    for (let variable of variables) {
      const key = variable.slice(2, -1);
      // Update the controlDependencyMap
      this.controlsDependencyMap[question.key].push(key);
      const varValue =
        this.utilService.getObjectValueByPath(formValue, key) || null;
      input = input.replace(variable, varValue);
    }
    return input;
  }

  evaluateInlineFunction(questions: QuestionModel[]) {
    for (let question of questions) {
      // Check if the input is a string and has a keyword $function
      if (
        typeof question.value === 'string' &&
        question.value.includes('$function')
      ) {
        // get rid of $function( and ) and then split using , to get function data
        const functionData = question.value.slice(10, -1).split(/,(.*)/s);
        // Get function data specifics such as name and params
        const [name, params] = functionData;
        const paramArray = [...JSON.parse(params)];
        const updated = this.assetService.execute(
          name,
          paramArray.map((param) =>
            this.replaceVarRefWithValue(param, question)
          )
        );
        this.form.get(question.key).patchValue(updated || null);
      }
    }
  }

  replaceImplicitVariables(questions: QuestionModel[]) {
    for (const question of questions) {
      const { value, controlType, key } = question;
      // Do the variable replacement for `__self__` object for logged user context
      if (typeof value === 'string' && value.includes('__self__')) {
        const variableKey = value.split('.')[1];
        const formControl = this.form.get(key);
        if (variableKey && variableKey in this.initService.userDetails) {
          const variableValue = (this.initService.userDetails as any)[
            variableKey
            ];
          const valueToBePatched =
            controlType === 'chips' ? [variableValue] : variableValue;
          console.log(
            `Replacing implicit variable __self__.${variableKey} with ${valueToBePatched}`
          );
          formControl.patchValue(valueToBePatched);
        } else {
          console.error(
            `Implicit variable __self__.${variableKey} not found in userDetails`
          );
          formControl.patchValue(null);
        }
      }
    }
  }

  getFormGroup(questions: QuestionModel[]) {
    const group: any = {};

    questions.forEach((question) => {
      // Do not create a form control For message type or list
      if (
        question.controlType === 'message' ||
        question.controlType === 'list' ||
        question.controlType === 'tabs'
      ) {
        return;
      }
      group[question.key] = this.getFormControl(question);
    });
    return new FormGroup(group);
  }

  getFormControl(question: QuestionModel) {
    // Evaluate the value of the form
    const value = question.value || null;
    const formControl = new FormControl(value);
    // Check for readonly
    if (question.readonly) {
      formControl.disable();
    }
    // Validation checks and validators for the control
    const validators = [];
    // Check Required
    if (question.required) {
      validators.push(Validators.required);
    }
    // Check for Email
    if (question.validator?.value === 'Email') {
      validators.push(Validators.email);
    }
    // Check IPv4
    if (question.validator?.value === 'IPv4') {
      validators.push(validateIPv4);
    }
    // Check IPv6
    if (question.validator?.value === 'IPv6') {
      validators.push(validateIPv6);
    }
    // Check for Regex
    if (
      question.validator?.value === 'regex' ||
      question.validator?.value === 'regexp'
    ) {
      validators.push(Validators.pattern(question.validatorRegExp));
    }
    formControl.setValidators(validators);
    formControl.updateValueAndValidity();
    return formControl;
  }

  getFormArray(question: QuestionModel) {
    if (!('columnsType' in question) || !question.columnsType) {
      return null;
    }
    // Create a form group with the questions
    const formGroup = this.getFormGroup(question.columnsType);
    // Create a new FormArray
    return new FormArray([formGroup]);
  }

  getCastedFormArray(controlName: string): FormArray {
    return this.form.get(controlName) as FormArray;
  }

  onRemoveRowAt(index: number, question: QuestionModel) {
    // Get the form array
    const formArray = this.getCastedFormArray(question.key);
    formArray.removeAt(index);
    this.form.updateValueAndValidity();
  }

  onAddRowAt(index: number, question: QuestionModel) {
    // A row to be added below
    if (!('columnsType' in question) || !question.columnsType) {
      // TODO: Common Error Handling
      return;
    }
    const newFormRow = this.getFormGroup(question.columnsType);
    // Now push the new form group into the form array into the specific index
    const formArray = this.getCastedFormArray(question.key);
    formArray.insert(index, newFormRow);
    this.form.updateValueAndValidity();
  }

  onRowReorder(event: NgDragDropModel, question: QuestionModel) {
    const { dragIndex, dropIndex } = event;
    const formArray = this.getCastedFormArray(question.key);
    // Get the Values
    const values = formArray.value;
    // Remove the Value Row which to be moved
    const row = values.splice(dragIndex, 1)[0];
    // Add back to the index the moved row
    values.splice(dropIndex, 0, row);
    // Now, patch the values back to the form array!
    formArray.patchValue(values);
  }

  onDownloadTemplate(question: QuestionModel) {
    const dataObject: any = {};
    question.templateHeaders.forEach(
      (header: string) => (dataObject[header] = '')
    );
    this.utilService.saveAsCsvFile(
      [dataObject],
      question.templateName || 'File_Template.csv'
    );
  }

  onUpload(event: any, formControlName: string) {
    this.uploadedFiles = event.files;
    const fileError: any = {};
    let reader = new FileReader();
    reader.readAsText(this.uploadedFiles[0]);

    reader.onload = () => {
      const csvData: string = String(reader.result);
      const data = this.utilService.convertCSVToArray(csvData);
      const headers = data[0];
      const transformedData = [];
      for (let row = 1; row <= data.length; row += 1) {
        const rowData = data[row];
        if (!rowData || !rowData.length) continue;
        const dataObject: any = {};
        headers.forEach((header, index) => {
          dataObject[header] = rowData[index];
        });
        transformedData.push(dataObject);
      }
      fileError['isFileEmpty'] = !transformedData.length;
      this.fileErrors[formControlName] = fileError;
      this.form.get(formControlName).setValue(transformedData);
      this.form.get(formControlName).markAsDirty();
      this.form.updateValueAndValidity();
    };

    reader.onerror = () => {
      fileError['isFileCorrupted'] = true;
      this.fileErrors[formControlName] = fileError;
      console.error('Unknown error occurred while reading file!');
    };
  }

  onRemove(uploadedFile: File, formControlName: string) {
    this.uploadedFiles = this.uploadedFiles.filter(
      (file) => file.name !== uploadedFile.name
    );
    this.form.get(formControlName).reset();
    delete this.fileErrors[formControlName];
  }

  onPatchForm(data: any, strategy?: string) {
    if (strategy && strategy === 'Merge') {
      // If the patch value strategy id merge type (Fills up only empty fields)
      Object.keys(this.form.controls).forEach((key) => {
        if (!this.form.controls[key].value) {
          this.form.controls[key].patchValue(data[key]);
        }
      });
    } else {
      this.form.patchValue(data);
    }
    // find out list type questions, we need to set the number of rows for formArray
    const listTypeQuestions = this.questionsToRender.filter(
      (question) => question.controlType === 'list'
    );
    listTypeQuestions.forEach((question) => {
      const formArrayData = data[question.key];
      const formArray = this.form.get(question.key) as FormArray;
      formArrayData.forEach((formValue: any, index: number) => {
        if (!formArray.at(index)) this.onAddRowAt(index, question);
        if (strategy && strategy === 'Merge') {
          // Find out the keys that needs replacing
          const replaces: any = {};
          Object.keys(formArray.at(index).value).forEach((key) => {
            if (!formArray.at(index).value[key]) {
              replaces[key] = formValue[key];
            }
          });
          formArray.at(index).patchValue(replaces);
        } else {
          formArray.at(index).setValue(formValue);
        }
      });
    });
    this.form.updateValueAndValidity();
  }

  onContinue() {
    if (!this.form.valid) return;
    const { shouldConfirm, confirmMessage } =
      this.stateService.getWorkflowDriver(this.component);
    if (!shouldConfirm) return this.goNext();
    // If it needs to be confirmed then goNext on confirmation
    this.confirmationService.confirm({
      accept: this.goNext.bind(this),
      defaultFocus: 'none',
      message: confirmMessage
    });
  }

  onClearFormArrayItems() {
    // TODO: Optimize if Possible
    for (const question of this.questions) {
      if (question.controlType === 'list') {
        const formArray = this.getCastedFormArray(question.key);
        // Remove all form groups except 1 from form array
        while (formArray.length !== 1) {
          formArray.removeAt(formArray.length - 1);
        }
      }
    }
  }

  onReset() {
    this.onClearFormArrayItems();
    this.questionsToRender = this.getQuestionsToRender();
    this.uploadedFiles = [];
    // SetTimeout is used to give a break for DOM to delete the nodes
    // And then modify the formControl
    setTimeout(() => this.renderForm(this.questionsToRender), 0);
  }

  onImport() {
    // Get Action ID, Customer ID, Service ID, and Form Data to prepare data object
    const dialogData = {
      action: 'import',
      data: { actionId: this.stateService.inputParams?.action?.id }
    };
    const dialogRef = this.dialogService.open(DataTemplateDialogComponent, {
      showHeader: false,
      width: '720px',
      data: dialogData
    });
    dialogRef.onClose.subscribe((result) => {
      if (result) {
        const { strategy, data } = result;
        this.onPatchForm(data, strategy);
      }
    });
  }

  onSave() {
    // Get Action ID, Customer ID, Service ID, and Form Data to prepare data object
    const dialogData = {
      action: 'save',
      data: {
        actionId: this.stateService.inputParams?.action?.id || null,
        serviceId: this.stateService.inputParams?.service?.id || null,
        customerId: this.stateService.inputParams?.customer?.id || null,
        data: JSON.stringify(this.form.value)
      }
    };
    this.dialogService.open(DataTemplateDialogComponent, {
      showHeader: false,
      width: '480px',
      data: dialogData
    });
  }

  onSaveDraft() {
    // This Feature is applicable only for Data Collection Flow
    const data = { ...this.form.value };
    this.stateService.setWorkflowData(this.component, data);
    const options = { draft: true };
    this.stateService.setWorkflowOptions(this.component, options);
    this.isLoading = true;
    // Hard Coded Process Specific Only for Saving as Draft, independent of any flow logic
    const processes = [
      {
        order: 0,
        title: 'Save Data as Draft',
        action: 'saveDataCollection',
        status: 'n/a',
        message: 'saving the collected data as draft into the inventory',
        shouldExecute: true,
        allowSkipOnFail: false
      }
    ];
    const dialogRef = this.dialogService.open(ProcessDialogComponent, {
      showHeader: false,
      width: '720px',
      data: processes
    });
    dialogRef.onClose.subscribe(async (canGoAhead: boolean) => {
      this.isLoading = false;
      if (canGoAhead) {
        this.confirmationService.confirm({
          accept: () => this.router.navigate(['/']),
          header: 'Saved as Draft!',
          icon: 'pi pi-check-circle',
          defaultFocus: 'none',
          message:
            'Your data has been saved as a draft successfully.\nWould you like to return to the Home?'
        });
      }
    });
  }

  onResumeDataCollection(transactionId: string) {
    if (!transactionId) return;
    this.stateService.transactionId = transactionId;
    const processes = [
      {
        order: 0,
        title: 'Download Collected Data',
        action: 'resumeCdcDataAndConfig',
        status: 'n/a',
        message: 'downloading & configuring to resume data collection',
        shouldExecute: true,
        allowSkipOnFail: false
      },
      {
        order: 1,
        title: 'Prepare for Data Collection',
        action: 'fetchFormControls',
        status: 'n/a',
        message: 'fetching the required form controls from the inventory',
        shouldExecute: true,
        allowSkipOnFail: false
      }
    ];
    const dialogRef = this.dialogService.open(ProcessDialogComponent, {
      showHeader: false,
      width: '720px',
      data: processes
    });
    dialogRef.onClose.subscribe(() => {
      // Get the Title of the Component
      const activeStep = this.stateService.workflowSteps.find(
        (step) => step.routerLink === this.component
      );
      this.title = activeStep ? activeStep.title || activeStep.label : '';
      this.questions = this.stateService.questions;
      this.workflowId = this.stateService.inputParams?.action.workflowId;
      this.ngOnInit();
      this.ngAfterViewInit();
    });
  }

  preconfigureProcessesForTdc() {
    // TODO: Need to make this more service agnostic, but for now it's strictly done for SDS (Jan, 2025)
    const { processes } = this.stateService.getWorkflowDriver(this.component);
    /**
     * Check if the service is SDS.
     * If not, then save the data collection, which goes to ServiceNow for the update - no changes in the processes.
     * If yes, then it has to generate the config using the collected data and push the config, so need to enable those processes.
     */
    const isSDS = this.stateService.inputParams?.service?.id === SDS_SERVICE_ID;
    if (isSDS) {
      // Iterate over each process
      processes.forEach((process) => {
        // Enable the process if it is 'generateConfiguration' or 'loadConfiguration'
        if (
          ['generateConfiguration', 'uploadSdsConfiguration'].includes(
            process.action
          )
        ) {
          process.shouldExecute = true;
        }
        // Disable the process if it is 'saveDataCollection'
        if (process.action === 'saveDataCollection') {
          process.shouldExecute = false;
        }
      });
    }
  }

  goNext() {
    const data = { ...this.form.getRawValue() };
    // Set the collected data to the state service
    this.stateService.savedQuestions = this.questionsToRender;
    this.stateService.setWorkflowData(this.component, data);
    if (this.workflowId === TDC_WORKFLOW_ID) {
      this.preconfigureProcessesForTdc();
    }
    this.isLoading = true;
    const { processes, next } = this.stateService.getWorkflowDriver(
      this.component
    );
    const dialogRef = this.dialogService.open(ProcessDialogComponent, {
      showHeader: false,
      width: '720px',
      data: processes
    });
    dialogRef.onClose.subscribe(async (canGoAhead: boolean) => {
      this.isLoading = false;
      if (canGoAhead) {
        await this.router.navigate(['config', next]);
      }
    });
  }

  ngOnDestroy() {
    this.subscriptions.forEach((subscription) => {
      if (subscription) {
        subscription.unsubscribe();
      }
    });
  }
}
