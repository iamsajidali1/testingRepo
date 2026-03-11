import { Component, OnInit, Input, OnChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, FormControl } from '@angular/forms';
import { QuestionBase } from '../models/fields-models/question-base';
import { DropdownQuestion } from '../models/fields-models/question-dropdown';
import { ListQuestion } from '../models/fields-models/question-list';
import { TextboxQuestion } from '../models/fields-models/question-textbox';
import { NgbModal, ModalDismissReasons } from '@ng-bootstrap/ng-bootstrap';
import { ModalComponent } from '../modal/modal.component';
import { DrakeStoreService } from '@swimlane/ngx-dnd';
import { ControllerService } from '../services/controller.service';
import { MessageService } from 'primeng/api';
import { ActivatedRoute } from '@angular/router';
import { CustomerSchema } from '../models/customerModel';
import { TabButtonServiceService } from '../services/tab-button-service.service';
import { MessageQuestion } from '../models/fields-models/question-message';

@Component({
  selector: 'app-form-builder',
  templateUrl: './form-builder.component.html',
  styleUrls: ['./form-builder.component.scss']
})

export class FormBuilderComponent implements OnInit, OnChanges {
  @Input() selectedFormTemplate: any = {};
  @Input() template;
  questions: QuestionBase<any>[] = [];
  originalQuestions: QuestionBase<any>[] = [];
  questionsUpdated: QuestionBase<any>[] = [];
  updatedValues = [];
  form: FormGroup;
  payLoad = '';
  payLoad2: any;
  order: number = 1;
  keyNumber: number = 1;
  keyNumberListColumn: number = 1;
  dropDownKeys: number = 1;
  dropDownOptions: any = {};
  dropDownOptionss: any = [];
  columnTypes: any = [];
  listLabel: string;
  usedKeyTracking = [];
  test = 0;
  objectKeys = Object.keys;
  customerName: string;
  hostnames = [];
  interfaces = [];
  apiCollectedValues = [];

  display: boolean = false;
  displayConfigDialog: boolean = false;
  templateName: string;
  selectedCustomer: CustomerSchema = { name: '', external_customer_id: '' };
  customers: any;
  carcheTemplateVariables: any = [{ label: '', value: 'empty' }];
  group = {};


  isEditorCodeValid: boolean = true;
  isCodeReadOnly: boolean = false;
  inAnyChangeInCode: boolean = false;
  text: string = '';
  options: any = {
    showLineNumbers: true,
    tabSize: 2
  };


  constructor(private modalService: NgbModal,
              private drakeStore: DrakeStoreService,
              private fb: FormBuilder,
              private controllerService: ControllerService,
              private messageService: MessageService,
              private activatedRoute: ActivatedRoute,
              private tabService: TabButtonServiceService
  ) {
    this.tabService.templateVariablesChanged$.subscribe(carcheTemplateVariables => {
      this.carcheTemplateVariables = carcheTemplateVariables;
    });

    this.tabService.clearButtonPushed$.subscribe(
      index => {
        if(index === 1) {
          this.clearAll();
        }
      }
    );

    this.tabService.previewButtonPushed$.subscribe(
      index => {
        this.tabService.announceSaveForm('save');
      }
    );
  }

  ngOnChanges() {
    if (this.selectedFormTemplate.name) {
      this.templateName = this.selectedFormTemplate.name;
      this.questions = this.selectedFormTemplate['questions'];
      this.questions.forEach(question => {
        this.addControls(question);
      });
    }
  }

  public clearAll(): void {
    while (this.questions.length !== 0) {
      this.delete(this.questions[0]);
    }
  }

  create_list($e) {
    let q, listOrder, listKey, listStyle;
    $e.forEach(row => {
      if (row.type === 'textbox') {
        const columns = new TextboxQuestion({
          order: this.order,
          key: row.key,
          placeholder: row.placeholder,
          label: row.label,
          validator: row.validator,
          validatorRegExp: row.validatorRegExp,
          validatorRegExpErrorMessage: row.validatorRegExpErrorMessage,
          value: row.value,
          required: row.required
        });
        this.columnTypes.push(columns);
        this.keyNumberListColumn++;
      } else if (row.type === 'list') {
        this.usedKeyTracking.push(row.key);
        listKey = row.key;
        listStyle = row.listStyle;
        this.listLabel = row.listLabel;
        listOrder = row.order;
      }
      else if (row.type == 'dropdown') {
        if(row.optionsSource && row.optionsSource['value'] != "Manual"){
          row.optionsValues = undefined;
        }
        const columns = new DropdownQuestion({
          key: row.key,
          label: row.label,
          optionsSource: row.optionsSource['value'],
          placeholder: row.placeholder,
          options: row.optionsValues,
          required: row.required
        });
        this.columnTypes.push(columns);
      }  // close Dropdown if
    }); // close $e.forEach
    q = new ListQuestion({
      order: listOrder,
      key: listKey,
      label: this.listLabel,
      columnsType: this.columnTypes,
      listStyle
    });
    this.addControls(q);
    this.questions.forEach(question => {
      if (question.order >= q.order) {
        question.order++;
      }
    });
    this.questions.push(q);
    this.questions.sort((a, b) => a.order - b.order);
    this.order++;
    this.keyNumber = this.keyNumberListColumn;
    this.columnTypes = [];
  }


  create_textBox($e) {
    this.addControls($e);
    this.questions.forEach(question => {
      if (question.order >= $e.order) {
        question.order++;
      }
    });
    this.questions.push(
      new TextboxQuestion({
        placeholder: $e.placeholder,
        order: $e.order,
        key: $e.key,
        conditions: $e.conditions,
        label: $e.label,
        value: $e.value,
        required: $e.required,
        validatorRegExp: $e.validatorRegExp,
        validatorRegExpErrorMessage: $e.validatorRegExpErrorMessage,
        validator: $e.validator

      }),
    );
    this.order++;
    this.questions.sort((a, b) => a.order - b.order);
    this.usedKeyTracking.push($e.key);
  }

  create_message($e) {
    this.addControls($e);
    this.questions.forEach(question => {
      if (question.order >= $e.order) {
        question.order++;
      }
    });
    this.questions.push(
      new MessageQuestion({
        placeholder: $e.placeholder,
        order: $e.order,
        key: $e.key,
        conditions: $e.conditions,
        label: $e.label,
        value: $e.value,
        required: $e.required,
        validatorRegExp: $e.validatorRegExp,
        validatorRegExpErrorMessage: $e.validatorRegExpErrorMessage,
        validator: $e.validator
      }),
    );
    this.order++;
    this.questions.sort((a, b) => a.order - b.order);
    this.usedKeyTracking.push($e.key);
  }

  create_dropDown($e) {
    this.questions.forEach(question => {
      if (question.order >= $e.order) {
        question.order++;
      }
    });
    this.addControls($e);
    if ($e.optionsSource.value != 'Manual') {
      this.questions.push(
        new DropdownQuestion({
          key: $e.key,
          optionsSource: $e.optionsSource.value,
          optionsSourceHeaders: {label : $e.option_label, value: $e.option_value},
          order: $e.order,
          conditions: $e.conditions,
          placeholder: $e.placeholder,
          required: $e.required,
          optionsFor : $e.optionsFor,
          label: $e.label,
          options: [],
        }),
      );
    } else {
      let numberOfOptions = 0;
      for (const key in $e) {
        if (key.includes('option')) {
          numberOfOptions++;
        }
      }
      for (let i = 1; i < (numberOfOptions / 2) + 1; i++) {
        const keyy = '$e.option' + i;
        const key = '$e.option' + i + 'key';
        if ((eval(keyy)) !== undefined) {
          this.dropDownOptions = { key: (eval(key)), value: (eval(keyy)) };
          this.dropDownOptionss.push(this.dropDownOptions);
        }
      }
      this.questions.push(
        new DropdownQuestion({
          key: $e.key,
          order: $e.order,
          optionsSource: $e.optionsSource.value,
          optionsSourceHeaders: $e.optionsSourceHeaders,
          conditions: $e.conditions,
          placeholder: $e.placeholder,
          required: $e.required,
          label: $e.label,
          options: this.dropDownOptionss,
        }),
      );
    }
    this.order++;
    this.dropDownOptionss = [];
    this.questions.sort((a, b) => a.order - b.order);
    this.usedKeyTracking.push($e.key);
  }

  
  findExistingControlIndex(array: FormArray, q): number {
    return array.controls.findIndex(fg => q.key in fg['controls'] || q.oldkey in fg['controls']);
  }

  createFormArray(question){
    this.form.addControl(question.key, new FormArray([]));
    const array = this.form.controls[question.key] as FormArray;
    question.columnsType.forEach(q => {
      if (q.required === 'false') {
        const key = q.key;
        const control =  this.fb.group({
          [key]: [q.value, q.required === 'true' ? Validators.required : null],
        })
        array.push(control);
      }
    });
  }

  addNewControlToFormArray(array: FormArray, q) {
    const key = q.key;
    const control = this.fb.group({
      [key]: [q.value, q.required === 'true' ? Validators.required : null],
    });
    array.push(control);
  }

  updateExistingControl(array: FormArray, index: number, q) {
    const fg = array.controls[index];
    const control = fg.get(q.key);
    if (q.required === 'true') {
      control.setValidators(Validators.required);
    } else {
      control.clearValidators();
    }
    control.setValue(q.value);
  }

  updateFormArray(question){
    const array = this.form.controls[question.key] as FormArray;
    question.columnsType.forEach(q => {

      const existingIndex = this.findExistingControlIndex(array, q);

      if(existingIndex === -1 && q.oldkey === undefined){
        this.addNewControlToFormArray(array, q);
      } else if(existingIndex !== -1 && q.oldkey === undefined){
        this.updateExistingControl(array, existingIndex, q);
      } else if(existingIndex !== -1 && q.oldkey !== q.key){
        this.updateExistingControl(array, existingIndex, q);
      }
    });
  }

  handleListControl(question){
    if (!(question.key in this.form.controls)) {
      this.createFormArray(question)
    } else{
      this.updateFormArray(question)
    }
  }

  handleNonListControl(question){
    if (question.required === 'true') {
      if (question.oldKey === undefined && (question.key in this.form.controls)) {
        this.form.get(question.key).setValidators(Validators.required);
      } else if (question.oldKey === undefined && !(question.key in this.form.controls)) {
        this.form.addControl(question.key, new FormControl(question.value || '', Validators.required));
      } else if (question.oldKey !== undefined) {
        this.form.addControl(question.key, new FormControl(question.value || '', Validators.required));
        this.form.removeControl(question.oldKey);
      }

    } else if (question.required === 'false') {
      if (question.oldKey === undefined && (question.key in this.form.controls)) {
        this.form.get(question.key).clearValidators();
      } else if (question.oldKey === undefined && !(question.key in this.form.controls)) {
        this.form.addControl(question.key, new FormControl(question.value || '', Validators.nullValidator));
      } else if (question.oldKey !== undefined) {
        this.form.addControl(question.key, new FormControl(question.value || '', Validators.nullValidator));
        this.form.removeControl(question.oldKey);
      }
    }
  }

  addControls(question) {
     // if for list
    if(question.controlType === 'list'){
      // create formArray if it does not exist
      this.handleListControl(question)
    } else {
      this.handleNonListControl(question)
    } 
  }

  ngOnInit() {
    this.template.questions = this.questions;
    this.form = this.fb.group({
    });

    this.getSelectedCustomerFromQuery();
  }

  getSelectedCustomerFromQuery() {
    this.activatedRoute.queryParams.subscribe(queryParams => {
      if (queryParams['customerName']) {
        this.selectedCustomer.name = atob(queryParams['customerName']);
        this.selectedCustomer.external_customer_id = atob(queryParams['customerId']);
      }
    });
  }

  onSubmit() {
    this.payLoad2 = this.form;
    this.payLoad = JSON.stringify(this.form.value);
    let counter = 1;
    let count = 1;
    for (let i = 0; i < this.questions.length; i++) {
      const keyValue = 'this.payLoad2.value.key' + counter;
      this.updatedValues.push(eval(keyValue));
      counter++;
    }
    this.questions.forEach(question => {
      const key = 'key' + count;
      if (question.key === key) {
        question.value = this.updatedValues[count - 1];
      }
      count++;
    });
    this.updatedValues = [];

  }

  edit(q) {
    if (q.controlType === 'textbox') {
      const modal = this.modalService.open(ModalComponent, { size: 'lg' });
      modal.componentInstance.controlType = 'textboxEdit';
      modal.componentInstance.carcheTemplateVariables = this.carcheTemplateVariables;
      modal.componentInstance.questions = this.questions;
      modal.componentInstance.usedKeyTracking = this.usedKeyTracking;
      modal.componentInstance.question = q;
      this.addKeyBackOnBackdrop(modal, q);
      modal.componentInstance.createEvent.subscribe(($e) => {
        this.editTextbox($e);
      });
    } else if (q.controlType === 'message') {
      const modal = this.modalService.open(ModalComponent, { size: 'lg' });
      modal.componentInstance.controlType = 'messageEdit';
      modal.componentInstance.carcheTemplateVariables = this.carcheTemplateVariables;
      modal.componentInstance.questions = this.questions;
      modal.componentInstance.usedKeyTracking = this.usedKeyTracking;
      modal.componentInstance.question = q;
      this.addKeyBackOnBackdrop(modal, q);
      modal.componentInstance.createEvent.subscribe(($e) => {
        this.editMessage($e);
      });
    } else if (q.controlType === 'dropdown') {
      const modal = this.modalService.open(ModalComponent, { size: 'lg' });
      modal.componentInstance.carcheTemplateVariables = this.carcheTemplateVariables;
      modal.componentInstance.controlType = 'dropdownEdit';
      modal.componentInstance.questions = this.questions;
      modal.componentInstance.usedKeyTracking = this.usedKeyTracking;
      modal.componentInstance.question = q;
      this.addKeyBackOnBackdrop(modal, q);
      modal.componentInstance.createEvent.subscribe(($e) => {
        this.editDropdown($e);
      });
    } else if (q.controlType === 'list') {
      const modal = this.modalService.open(ModalComponent, { size: 'lg' });
      modal.componentInstance.carcheTemplateVariables = this.carcheTemplateVariables;
      modal.componentInstance.controlType = 'listEdit';
      modal.componentInstance.questions = this.questions;
      modal.componentInstance.usedKeyTracking = this.usedKeyTracking;
      modal.componentInstance.question = q;
      this.addKeyBackOnBackdrop(modal, q);
      modal.componentInstance.order = q.order;
      modal.componentInstance.createEvent.subscribe(($e) => {
        this.editList($e);
      });
    } // end if list
  }

  addKeyBackOnBackdrop(modal, q) {
    modal.result.then((result) => { },
      (reason) => {
        if (reason === ModalDismissReasons.ESC ||
          reason === ModalDismissReasons.BACKDROP_CLICK) {
          this.usedKeyTracking.push(q.key);
        }
      });

  }

  delete(q) {
    let count = 0;
    let order = 0;
    this.form.removeControl(q.key);
    this.usedKeyTracking.forEach(key => {
      if (key === q.key) {
        this.usedKeyTracking.splice(this.usedKeyTracking.indexOf(key), 1);
      }
    });
    this.questions.forEach(question => {
      if (question.order === q.order) {
        order = q.order;
        this.questions.splice(count, 1);
      }
      count++;
    });
    this.questions.forEach(question => {
      if (question.order > order) {
        question.order--;
      }
      count++;
    });
  }

  editTextbox($e) {
    this.addControls($e);
    let count = 0;
    this.usedKeyTracking.push($e.key);
    this.questions.forEach(question => {
      if ($e.oldKey !== undefined && $e.oldKey === question.key) {
        this.questions.splice(count, 1);
        delete $e['oldKey'];
        this.questions.push($e);
      } else if (question.key === $e.key && $e.oldKey === undefined) {
        this.questions.splice(count, 1);
        this.questions.push($e);
      }
      count++;
    });
    count = 0;
    this.questions.sort((a, b) => a.order - b.order);
  }

  editMessage($e) {
    this.addControls($e);
    let count = 0;
    this.usedKeyTracking.push($e.key);
    this.questions.forEach(question => {
      if ($e.oldKey !== undefined && $e.oldKey === question.key) {
        this.questions.splice(count, 1);
        delete $e['oldKey'];
        this.questions.push($e);
      } else if (question.key === $e.key && $e.oldKey === undefined) {
        this.questions.splice(count, 1);
        this.questions.push($e);
      }
      count++;
    });
    count = 0;
    this.questions.sort((a, b) => a.order - b.order);
  }

  editDropdown($e) {
    this.addControls($e);
    let count = 0;
    this.questions.forEach(question => {
      if ($e.oldKey !== undefined && $e.oldKey === question.key) {
        this.questions.splice(count, 1);
        const index = this.usedKeyTracking.indexOf($e.oldKey);
        this.usedKeyTracking.splice(index, 1);
        delete $e['oldKey'];
        this.questions.push($e);
        this.usedKeyTracking.push($e.key);
      } else if (question.key === $e.key && $e.oldKey === undefined) {
        this.questions.splice(count, 1);
        this.questions.push($e);
      }
      count++;
    });
    count = 0;
    this.questions.sort((a, b) => a.order - b.order);
  }

  editList($e) {
    let edittedQuestion, listOrder, count, listKey, listStyle, columns;
    if ($e[0].editWithDeletion) {
      if ($e[0].key in this.form.controls) {
        this.form.removeControl($e[0].key);
      }
    }
    count = 0;
    edittedQuestion = [];
    $e.forEach(row => {
      if (row.type === 'textbox') {
        columns = new TextboxQuestion({
          order: this.order,
          key: row.key,
          placeholder: row.placeholder,
          label: row.label,
          validator: row.validator,
          validatorRegExp: row.validatorRegExp,
          validatorRegExpErrorMessage: row.validatorRegExpErrorMessage,
          value: row.value,
          required: row.required
        });
        if (row.oldkey !== undefined) {
          columns.oldkey = row.oldkey;
        }
        this.columnTypes.push(columns);
        this.keyNumberListColumn++;
      } else if (row.type === 'list') {
        listKey = row.key;
        listStyle = row.listStyle;
        this.listLabel = row.listLabel;
        listOrder = row.order;
      } // close list if
      else if (row.type == 'dropdown') {
        if(row.optionsSource && row.optionsSource['value'] != "Manual"){
          row.optionsValues = [];
        }
        columns = new DropdownQuestion({
          key: row.key,
          label: row.label,
          options: row.optionsValues,
          optionsSource: row.optionsSource['value'],
          required: row.required
        });
        if (row.oldkey !== row.key) {
          columns.oldkey = row.oldkey;
        }
        this.columnTypes.push(columns);
      }  // close Dropdown if
    }); // close $e.forEach
    edittedQuestion = ({
      order: listOrder,
      key: listKey,
      listStyle,
      label: this.listLabel,
      value: 'list',
      columnsType: this.columnTypes,
      controlType: 'list'
    });
    this.addControls(edittedQuestion);
    this.questions.forEach(question => {
      if (question.key === listKey) {
        const deleted = this.questions.splice(count, 1);
      }
      count++;
    });
    this.questions.push(edittedQuestion);
    edittedQuestion = [];
    this.columnTypes = [];
    this.questions.sort((a, b) => a.order - b.order);
    listKey = 0;
  }

  moveUp(question) {
    this.questions.forEach(q => {
      if (q.order === question.order - 1) {
        q.order++;
      }
    });
    question.order--;
    this.questions.sort((a, b) => a.order - b.order);
  }
  moveDown(question) {
    this.questions.forEach(q => {
      if (q.order === question.order + 1) {
        q.order--;
      }
    });
    question.order++;
    this.questions.sort((a, b) => a.order - b.order);
  }

  ObjectLength(object) {
    let length = 0;
    for (const key in object) {
      if (object.hasOwnProperty(key)) {
        ++length;
      }
    }
    return length;
  }

  roundDown = Math.floor;

  sourceItems = ['list', 'input', 'dropdown', 'message'];

  itemDropped($event) {
    if ($event.value === 'input') {
      (this.drakeStore as any).drake.cancel(true);
      const modal = this.modalService.open(ModalComponent, { size: 'lg' });
      modal.componentInstance.controlType = 'textbox';
      modal.componentInstance.questions = this.questions;
      modal.componentInstance.carcheTemplateVariables = this.carcheTemplateVariables;
      modal.componentInstance.usedKeyTracking = this.usedKeyTracking;
      modal.componentInstance.order = $event.dropIndex + 1;
      modal.componentInstance.createEvent.subscribe(($e) => { this.create_textBox($e); },
      );
    } else if ($event.value === 'dropdown') {
      (this.drakeStore as any).drake.cancel(true);
      const modal = this.modalService.open(ModalComponent, { size: 'lg' });
      modal.componentInstance.controlType = 'dropdown';
      modal.componentInstance.questions = this.questions;
      modal.componentInstance.carcheTemplateVariables = this.carcheTemplateVariables;
      modal.componentInstance.usedKeyTracking = this.usedKeyTracking;
      modal.componentInstance.order = $event.dropIndex + 1;
      modal.componentInstance.createEvent.subscribe(($e) => { this.create_dropDown($e); },
      );
    } else if ($event.value === 'list') {
      (this.drakeStore as any).drake.cancel(true);
      const modal = this.modalService.open(ModalComponent, { size: 'lg' });
      modal.componentInstance.controlType = 'list';
      modal.componentInstance.carcheTemplateVariables = this.carcheTemplateVariables;
      modal.componentInstance.questions = this.questions;
      modal.componentInstance.usedKeyTracking = this.usedKeyTracking;
      modal.componentInstance.order = $event.dropIndex + 1;
      modal.componentInstance.createEvent.subscribe(($e) => { this.create_list($e); },
      );
    } else if ($event.value === 'message') {
      (this.drakeStore as any).drake.cancel(true);
      const modal = this.modalService.open(ModalComponent, { size: 'lg' });
      modal.componentInstance.controlType = 'message';
      modal.componentInstance.questions = this.questions;
      modal.componentInstance.carcheTemplateVariables = this.carcheTemplateVariables;
      modal.componentInstance.usedKeyTracking = this.usedKeyTracking;
      modal.componentInstance.order = $event.dropIndex + 1;
      modal.componentInstance.createEvent.subscribe(($e) => { this.create_message($e); },
      );
    } else if ($event.value === undefined) {
      (this.drakeStore as any).drake.cancel(true);
      this.questions.forEach(question => {
        if (question.order === $event.el.firstChild.id) {
          question.order = $event.dropIndex + 1;
        } else if (question.order < $event.el.firstChild.id && question.order >= $event.dropIndex + 1) {
          question.order++;
        } else if (question.order > $event.el.firstChild.id && question.order <= $event.dropIndex + 1) {
          question.order--;
        }
      });
      this.questions.sort((a, b) => a.order - b.order);
    } // end if undefined
  } // end item dropped function

  public rejectModal() {
    this.display = false;
    this.templateName = '';
  }

  onConfigModel() {
    this.displayConfigDialog = true;
    this.originalQuestions = [...this.questions];
    this.text = JSON.stringify(this.questions, undefined, 2);
  }

  onCodeChanged(value) {
    try {
      this.questions = JSON.parse(value);
      this.template.questions = this.questions;
      this.inAnyChangeInCode = JSON.stringify(this.questions) !== JSON.stringify(this.originalQuestions);
      this.isEditorCodeValid = true;
    } catch (e) {
      this.isEditorCodeValid = false;
    }
  }

  onCodeReset() {
    this.questions = [...this.originalQuestions];
    this.template.questions = this.questions;
    this.text = JSON.stringify(this.questions, undefined, 2);
  }

  onExportConfig() {
    const data = JSON.stringify(this.questions, undefined, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url= window.URL.createObjectURL(blob);
    window.open(url);
  }

  showDialog() {
    this.controllerService.getCusotmerByAttid('jf377c').subscribe(customers => { this.customers = customers; });
    this.display = true;
  }
}
