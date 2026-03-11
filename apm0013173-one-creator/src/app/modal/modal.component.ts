import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ControllerService } from '../services/controller.service';
import { interval } from 'rxjs';
import { SelectItem } from 'primeng/api';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss']
})

export class ModalComponent implements OnInit {
  @Input() controlType = null;
  @Input() order;
  @Input() questions;
  @Input() carcheTemplateVariables;
  @Input() question = null;
  @Output() createEvent = new EventEmitter();
  @Output() usedKeyTracking = [];

  key: number = 2;
  edit = false;
  listKey: number = 1;
  listOptionsCount: number = 1;
  rows: any[] = [];
  keyPairs: any[] = [];
  list = [];
  optionsValues = [];
  questionCloned = {};
  questionOptions = [];
  oldkey: number = null;
  oldkeys = [];
  newkeys = [];
  newKey: number = null;
  formKeyValidation = '';
  formToCheck: any;
  keysToMonitor = [];
  temp = [];
  conditions = [];
  listStyle = 'table';
  listStyleCheckboxChecked = false;
  validator = 'none';
  regex: boolean = false;
  required: SelectItem[] = [{ label: 'Required *', value: '' }, { label: 'true', value: 'true' }, { label: 'false', value: 'false' }];
  display: boolean = true;
  existingHostnameFields = [];
  selectedApiSource = 'Manual';
  apiError = '';
  setFieldDefaultValue = '';
  setFieldDefaultValueLength = 0;
  optionsFor = false;
  clonedCarcheTemplateVariables: any[] = [];
  apiSourceKey;
  apiSourceKeyIncremented;
  apiSelected = false;
  ApiSources = undefined;
  loadApiSource: boolean = false;

  form: FormGroup;
  formDropDown: FormGroup;
  formList: FormGroup;
  formMessage: FormGroup;

  constructor(public activeModal: NgbActiveModal, private fb: FormBuilder, private controller: ControllerService) {
    this.form = fb.group({
      'label': [null, Validators.required],
      'placeholder': [null,],
      'value': [null,],
      'required': [null, Validators.required],
      'key': [null, Validators.required],
      'validator': ['None', Validators.required],
    });
    this.formDropDown = fb.group({
      'label': [null, Validators.required],
      'option1': [null, Validators.required],
      'option1key': [null, Validators.required],
      'required': [null, Validators.required],
      'placeholder': ["select option",],
      'key': [null, Validators.required],
      'optionsSource': [{ label: 'Manual', value: 'Manual' }, Validators.required],
    });
    this.formList = fb.group({
      'listLabel': [null, Validators.required],
      'key': [null, Validators.required],
      'checboxSelected': [null, null]
    });
    this.formMessage = fb.group({
      'label': [null, Validators.required],
      'placeholder': [null,],
      'value': [null, Validators.required],
      'required': [false,],
      'key': [null],
      'validator': ['None', Validators.required],
    });

    if (!this.ApiSources) {
      this.loadDropdownApiSource();
    }
  }

  public deleteFormControlsForOptionsInDropDown(): void {
    this.rows.forEach(row => {
      this.formDropDown.removeControl(row);
    });
    this.formDropDown.removeControl('option1');
    this.formDropDown.removeControl('option1key');
    this.rows = [];
  }

  public removeFormControlsForAutoApiSource(): void {
    if (this.formDropDown.get('optionsFor') && this.formDropDown.get('option_label') && this.formDropDown.get('option_value')) {
      this.formDropDown.removeControl('optionsFor');
      this.formDropDown.removeControl('option_label');
      this.formDropDown.removeControl('option_value');
    }
  }

  public optionsSourceChangeList(event, row): void {
    let selected = event.value.value;
    if (selected == 'Manual') {
      if (!this.formList.get(row['key']) && !this.formDropDown.get(row['options'])) {
        this.formList.addControl(row['key'], new FormControl(null, Validators.required));
        this.formList.addControl(row['options'], new FormControl(null, Validators.required));
      }
      if (this.keyPairs.length < 1) {
        let keyPair = [];
        let option = { key: row['key'], value: row['options'] }
        keyPair.push(option);
        this.keyPairs.push(keyPair);
      }
    } else {
      this.formList.removeControl(row['key']);
      this.formList.removeControl(row['options']);
      row['optionsss'].forEach(option => {
        this.formList.removeControl(option);
      });
      row['optionsss'] = [];
      // this.keyPairs = [];
    }
  }

  public optionsSourceChange(event, type?: string): void {
    let selected = event.value.value;
    if (selected == 'Manual') {
      if (!this.formDropDown.get('option1') && !this.formDropDown.get('option1key') && type != "edit") {
        this.formDropDown.addControl('option1', new FormControl(null, Validators.required));
        this.formDropDown.addControl('option1key', new FormControl(null, Validators.required));
      }
      if (type == "edit" && this.rows.length == 0) {
        this.addOption();
      }
    } else {
      this.deleteFormControlsForOptionsInDropDown();
    }

    if (selected == 'Auto') {
      // regexp for url
      let expression = /^(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+$/gm;
      this.formDropDown.addControl('optionsFor', new FormControl(null, Validators.required));
      this.formDropDown.addControl('option_label', new FormControl(null, Validators.required));
      this.formDropDown.addControl('option_value', new FormControl(null, Validators.required));
      this.deleteFormControlsForOptionsInDropDown();
    } else {
      this.removeFormControlsForAutoApiSource();
    }

    this.selectedApiSource = selected;
    if ((selected == 'Interfaces' && this.existingHostnameFields.length == 0) || selected == 'Hostnames') {
      this.deleteFormControlsForOptionsInDropDown();
    } else if (selected != 'Auto' && selected != 'Manual') {
      this.deleteFormControlsForOptionsInDropDown();
    }

    this.setFieldDefaultValue = '';
    this.setFieldDefaultValueLength = 0;
  }

  setDefault(event) {
    if (this.setFieldDefaultValue != '' && this.setFieldDefaultValueLength != 0) {
      if ((event.substring(0, this.setFieldDefaultValueLength)) != this.setFieldDefaultValue) {
        this.formToCheck.controls['key'].setValue(this.setFieldDefaultValue);
      }
    }
  }

  SetFormToDefault() {
    for (let key in this.formToCheck.controls) {
      if (key != 'optionsSource') {
        this.formToCheck.controls[key].setValue('');
        this.formToCheck.controls[key].enable();
      }
    }
  }

  setFormValues(value) {
    for (let key in this.formToCheck.controls) {
      if (key == 'required') {
        this.formToCheck.controls[key].setValue("true");
      } else if ((key == 'label' || key == 'key')) {
        this.formToCheck.controls[key].setValue(value);
      } else if (key != 'optionsSource' && key != 'optionsFor') {
        this.formToCheck.controls[key].disable();
      }
    }
  }

  displayOptionsFor() {
    if (this.optionsFor) {
      this.formToCheck.addControl('optionsFor', new FormControl('', Validators.required));
    } else {
      this.clearHostnameSelected();
    }
  }

  clearHostnameSelected() {
    for (let key in this.formToCheck.controls) {
      this.formToCheck.controls[key].enable();
    }
  }

  setFormValidators() {
    for (let key in this.formToCheck.controls) {
      this.formToCheck.controls[key].setValidators([Validators.required]);
    }
  }

  addInput() {
    this.keysToMonitor.push('key' + this.listKey);
    this.rows.push(
      {
        label: 'label' + this.listKey,
        value: 'value' + this.listKey,
        key: 'key' + this.listKey,
        keyExists: 'keyExists' + this.listKey,
        required: 'required' + this.listKey,
        placeholder: 'placeholder' + this.listKey,
        validator: 'validator' + this.listKey,
        validatorRegExp: 'validatorRegExp' + this.listKey,
        regex: 'regex' + this.listKey,
        validatorRegExpErrorMessage: 'validatorRegExpErrorMessage' + this.listKey,
        type: 'textbox'
      });
    this.formList.addControl('label' + this.listKey, new FormControl('', Validators.required));
    this.formList.addControl('value' + this.listKey, new FormControl('',));
    this.formList.addControl('required' + this.listKey, new FormControl('', Validators.required));
    this.formList.addControl('keyExists' + this.listKey, new FormControl('false', Validators.required));
    this.formList.addControl('key' + this.listKey, new FormControl('', Validators.required));
    this.formList.addControl('placeholder' + this.listKey, new FormControl('',));
    this.formList.addControl('validator' + this.listKey, new FormControl('None',));
    this.formList.addControl('type' + this.listKey, new FormControl('textbox',));
    this.listKey++;
    this.subscribeFormKeyChanges();
  }

  addMessage() {
    this.keysToMonitor.push('key' + this.listKey);
    this.rows.push(
      {
        label: 'label' + this.listKey,
        value: 'value' + this.listKey,
        key: 'key' + this.listKey,
        keyExists: 'keyExists' + this.listKey,
        required: 'required' + this.listKey,
        placeholder: 'placeholder' + this.listKey,
        validator: 'validator' + this.listKey,
        validatorRegExp: 'validatorRegExp' + this.listKey,
        regex: 'regex' + this.listKey,
        validatorRegExpErrorMessage: 'validatorRegExpErrorMessage' + this.listKey,
        type: 'textbox'
      });
    this.formList.addControl('label' + this.listKey, new FormControl('', Validators.required));
    this.formList.addControl('value' + this.listKey, new FormControl('',));
    this.formList.addControl('required' + this.listKey, new FormControl('false'));
    this.formList.addControl('keyExists' + this.listKey, new FormControl('false', Validators.required));
    this.formList.addControl('key' + this.listKey, new FormControl('', Validators.required));
    this.formList.addControl('placeholder' + this.listKey, new FormControl('',));
    this.formList.addControl('validator' + this.listKey, new FormControl('None',));
    this.formList.addControl('type' + this.listKey, new FormControl('textbox',));
    this.listKey++;
    this.subscribeFormKeyChanges();
  }

  addDropDown() {
    let keyPair = [];
    let option = { key: 'key' + this.listKey, value: 'options' + this.listKey }
    keyPair.push(option);
    this.keysToMonitor.push('dropdownKey' + this.listKey);
    this.rows.push(
      {
        label: 'label' + this.listKey,
        options: 'options' + this.listKey,
        required: 'required' + this.listKey,
        key: 'key' + this.listKey,
        keyExists: 'keyExists' + this.listKey,
        dropdownKey: 'dropdownKey' + this.listKey,
        placeholder: 'placeholder' + this.listKey,
        optionsSource: 'optionsSource' + this.listKey,
        type: 'dropdown',
        optionsss: [],
      });
    this.keyPairs.push(keyPair);
    this.formList.addControl('label' + this.listKey, new FormControl('', Validators.required));
    this.formList.addControl('placeholder' + this.listKey, new FormControl('select option', Validators.required));
    this.formList.addControl('options' + this.listKey, new FormControl('', Validators.required));
    this.formList.addControl('optionsSource' + this.listKey, new FormControl({ 'label': "Manual", "value": "Manual" }, Validators.required));
    this.formList.addControl('required' + this.listKey, new FormControl('', Validators.required));
    this.formList.addControl('key' + this.listKey, new FormControl('', Validators.required));
    this.formList.addControl('keyExists' + this.listKey, new FormControl('false', Validators.required));
    this.formList.addControl('dropdownKey' + this.listKey, new FormControl('', Validators.required));
    this.formList.addControl('type' + this.listKey, new FormControl('dropdown',));
    this.listKey++;
    this.subscribeFormKeyChanges();
  }

  addListDropdownOption(option) {
    this.formList.addControl(option + this.listOptionsCount, new FormControl('', Validators.required));
    this.formList.addControl(option + this.listOptionsCount + 'key', new FormControl('', Validators.required));
    this.rows.forEach(row => {
      if (row.options == option) {
        row.optionsss.push(option + this.listOptionsCount);
        row.optionsss.push(option + this.listOptionsCount + 'key');
      }
    });
    this.keyPairs.forEach(keyPair => {
      keyPair.forEach(row => {
        if (row.value == option) {
          let opt = { key: option + this.listOptionsCount + 'key', value: option + this.listOptionsCount }
          keyPair.push(opt);
        }
      })
    });
    this.listOptionsCount++;
  }

  setListStyle($event) {
    if (this.formList.get('checboxSelected').value) {
      this.listStyle = 'div';
      this.listStyleCheckboxChecked = true;
    } else {
      this.listStyle = 'table';
      this.listStyleCheckboxChecked = false;
    }
  }

  createList() {
    let count = 0;
    if (!(this.formList['editWithDeletion'])) {
      this.list.push({
        listLabel: this.formList.value.listLabel,
        key: this.formList.value.key,
        type: 'list',
        order: this.order,
        listStyle: this.listStyle,
      });
    } else if (this.formList.value['editWithDeletion']) {
      this.list.push({
        listLabel: this.formList.value.listLabel,
        editWithDeletion: this.formList.value['editWithDeletion'],
        key: this.formList.value.key,
        type: 'list',
        order: this.order,
        listStyle: this.listStyle,
      });
    }

    this.rows.forEach(row => {
      if (row.type == 'textbox' && this.formList.value[row.oldkey] == this.formList.value[row.key]) {
        this.list.push({
          placeholder: this.formList.value[row.placeholder],
          label: this.formList.value[row.label],
          value: this.formList.value[row.value],
          key: this.formList.value[row.key],
          required: this.formList.value[row.required],
          validator: this.formList.value[row.validator],
          validatorRegExp: this.formList.value[row.validatorRegExp],
          validatorRegExpErrorMessage: this.formList.value[row.validatorRegExpErrorMessage],
          type: row.type,
        })
      }
      else if (row.type == 'textbox' && row.oldkey == undefined) {
        this.list.push({
          placeholder: this.formList.value[row.placeholder],
          label: this.formList.value[row.label],
          value: this.formList.value[row.value],
          key: this.formList.value[row.key],
          required: this.formList.value[row.required],
          validator: this.formList.value[row.validator],
          validatorRegExp: this.formList.value[row.validatorRegExp],
          validatorRegExpErrorMessage: this.formList.value[row.validatorRegExpErrorMessage],
          type: row.type,
        })
      }
      else if (row.type == 'textbox' && this.formList.value[row.oldkey] !== this.formList.value[row.key]) {
        this.list.push({
          placeholder: this.formList.value[row.placeholder],
          label: this.formList.value[row.label],
          value: this.formList.value[row.value],
          key: this.formList.value[row.key],
          oldkey: this.formList.value[row.oldkey],
          required: this.formList.value[row.required],
          validator: this.formList.value[row.validator],
          validatorRegExp: this.formList.value[row.validatorRegExp],
          validatorRegExpErrorMessage: this.formList.value[row.validatorRegExpErrorMessage],
          type: row.type,
        })
      }
      else if (row.type == 'dropdown') {
        const options = [];
        if (
          this.formList.controls[row["optionsSource"]].value["value"] ==
          "Manual"
        ) {
          let count = 1;
          const key = this.formList.controls[row["key"]].value;
          const option = this.formList.controls[row["options"]].value;
          options.push({ key: key, value: option });
          let keyOptions;
          let valueOptions;
          row.optionsss.forEach((opt) => {
            if (opt.includes("key")) {
              keyOptions = this.formList.controls[opt].value;
            } else {
              valueOptions = this.formList.controls[opt].value;
            }

            if(valueOptions != undefined && keyOptions != undefined){
            options.push({ key: keyOptions, value: valueOptions });
            keyOptions = undefined;
            valueOptions = undefined;
            count++;
          }
          });
        }
        this.list.push({
          label: this.formList.value[row.label],
          required: this.formList.value[row.required],
          key: this.formList.value[row.dropdownKey],
          placeholder: this.formList.value[row.placeholder],
          optionsSource: this.formList.value[row.optionsSource],
          type: row.type,
          optionsValues: options,
          oldkey: this.formList.value[row.oldkey],
        })

        this.optionsValues = [];
      }
      count++;
    })
    this.createEvent.emit(this.list);
    this.rows = [];
    this.keyPairs = [];
    this.activeModal.dismiss();
  }

  addOption() {
    if (this.questionCloned != null && this.questionCloned['options'] != undefined) {
      let optid, keyid, pair;
      pair = {};
      optid = 'valuee' + this.key;
      keyid = 'keyy' + this.key;
      this.rows.push(optid, keyid);
      pair[optid] = '';
      pair[keyid] = '';
      this.keyPairs.push(pair);
      this.formDropDown.addControl(optid, new FormControl('', Validators.required));
      this.formDropDown.addControl(keyid, new FormControl('', Validators.required));
    } // end if
    else {
      this.rows.push('option' + this.key);
      this.rows.push('option' + this.key + 'key');
      this.formDropDown.addControl('option' + this.key, new FormControl('', Validators.required));
      this.formDropDown.addControl('option' + this.key + 'key', new FormControl('', Validators.required));
    } // end else if
    this.key++;
  } // end addOption function

  parseConditions() {
    let tempCondition, conditions;
    let count = 1;
    if (this.conditions.length == 1) {
      conditions = {
        type: this.formToCheck.value['condition1'],
        key: this.formToCheck.value['allKeys1'],
        value: this.formToCheck.value['conditionValue1']
      }
    }
    else if (this.conditions.length > 1) {
      conditions = { type: this.formToCheck.value['type1'], list: [] };
      this.conditions.forEach(condition => {
        if (condition.type == 'type1') {
          tempCondition = {
            type: this.formToCheck.value['condition1'],
            key: this.formToCheck.value['allKeys1'],
            value: this.formToCheck.value['conditionValue1']
          }
          conditions.list.push(tempCondition)
          count++;
        }
        else {
          tempCondition = {
            type: this.formToCheck.value[condition['condition']],
            key: this.formToCheck.value[condition['allKeys']],
            value: this.formToCheck.value[condition['conditionValue']]
          }
          conditions.list.push(tempCondition)
          count++;
        }
      })
    }
    return conditions;
  }

  createTextbox() {
    this.form.value.order = this.order;
    let question;
    question = this.form.value;
    if (this.conditions.length > 0) { question.conditions = this.parseConditions() };
    this.createEvent.emit(question);
    this.activeModal.dismiss();
  }

  editTextbox() {
    for (let property in this.questionCloned) {
      if (this.questionCloned[property] !== this.form.value[property] && this.form.value[property] !== null && this.form.value[property]) {
        this.questionCloned[property] = this.form.value[property];
      }
    }
    if (this.questionCloned['key'] != this.oldkey) {
      this.questionCloned['oldKey'] = this.oldkey;
    }
    if (this.conditions.length > 0) {
      this.questionCloned['conditions'] = this.parseConditions();
    }
    else {
      this.questionCloned['conditions'] = {};
    }
    this.createEvent.emit(this.questionCloned);
    this.activeModal.dismiss();
  }

  createMessage() {
    this.formMessage.value.order = this.order;
    let question;
    question = this.formMessage.value;
    if (this.conditions.length > 0) { question.conditions = this.parseConditions() };
    this.createEvent.emit(question);
    this.activeModal.dismiss();
  }

  editMessage() {
    for (let property in this.questionCloned) {
      if (this.questionCloned[property] !== this.formMessage.value[property] && this.formMessage.value[property] !== null && this.formMessage.value[property]) {
        this.questionCloned[property] = this.formMessage.value[property];
      }
    }
    if (this.questionCloned['key'] != this.oldkey) {
      this.questionCloned['oldKey'] = this.oldkey;
    }
    if (this.conditions.length > 0) {
      this.questionCloned['conditions'] = this.parseConditions();
    }
    else {
      this.questionCloned['conditions'] = {};
    }
    this.createEvent.emit(this.questionCloned);
    this.activeModal.dismiss();
  }

  editDropdown() {
    this.keyPairs.forEach(keyPair => {
      Object.keys(keyPair).forEach(key => {
        for (let property in this.formDropDown.value) {
          if (key == property && key.includes('key')) {
            keyPair['key'] = this.formDropDown.value[key];
            delete keyPair[key];
          } else if (key == property && !key.includes('key')) {
            keyPair['value'] = this.formDropDown.value[key];
            delete keyPair[key];
          }
        }
      })
    })
    this.formDropDown.value.optionsSource.value
    this.questionCloned['optionsSource'] = this.formDropDown.value.optionsSource.value;
    this.questionCloned['options'].length = 0;
    this.questionCloned['options'] = this.keyPairs;
    if (this.formDropDown.value.optionsSource.value != "Manual") {
      this.questionCloned['optionsFor'] = this.formDropDown.value.optionsFor;
    }
    this.questionCloned['label'] = this.formDropDown.value.label;
    this.questionCloned['required'] = this.formDropDown.value.required;
    this.questionCloned['placeholder'] = this.formDropDown.value.placeholder;
    this.questionCloned['key'] = this.formDropDown.value.key;
    if (this.questionCloned['key'] != this.oldkey) {
      this.questionCloned['oldKey'] = this.oldkey;
    }
    this.createEvent.emit(this.questionCloned);
    this.activeModal.dismiss();
  }

  createDropDown() {
    this.formDropDown.value.order = this.order;
    let question;
    question = this.formDropDown.value;
    if (this.conditions.length > 0) { question.conditions = this.parseConditions() };
    /* if (this.selectedApiSource != 'Manual'){
       question.key = this.apiSourceKey;
     }*/
    if (this.selectedApiSource == 'Hostname') {
      question.optionsFor = 'customer';
    }
    this.createEvent.emit(question);
    this.activeModal.dismiss();
  }

  ObjectLength(object) {
    let length = 0;
    for (let key in object) {
      if (object.hasOwnProperty(key)) {
        ++length;
      }
    }
    return length;
  };

  subscribeFormKeyChanges() {
    const changes$ = this.formToCheck.controls['key'].valueChanges;
    changes$.subscribe(valuee => {
      let stopRunning = false;
      this.usedKeyTracking.forEach(key => {
        if (key == valuee) {
          this.formToCheck.controls['key'].setErrors({ 'incorrect': true })
          stopRunning = true;
        } else if ((this.formToCheck.controls['key'] !== valuee && "") && stopRunning == false) {
          this.formToCheck.controls['key'].setErrors(null);
        }
      })
    })


    if (this.keysToMonitor !== []) {
      this.keysToMonitor.forEach(key => {
        const changess$ = this.formToCheck.controls[key].valueChanges;
        changess$.subscribe(value => {
          let thenum = key.replace(/^\D+/g, '');
          let stopRunning = false;
          this.temp.forEach(valueInTemp => {
            if (value == valueInTemp) {
              let keyExists = 'keyExists' + thenum;
              this.formList.get(keyExists).setValue(true)
              this.formToCheck.controls[key].setErrors({ 'incorrect': true })
              stopRunning = true;
            } else if (stopRunning == false) {
              let keyExists = 'keyExists' + thenum;
              this.formList.get(keyExists).setValue(false)
              if (!(this.formToCheck.controls[keyExists]) && this.formToCheck.controls[key] != "")
                this.formToCheck.controls[key].setErrors(null);
            }
          })
          let index = this.keysToMonitor.indexOf(key);
          this.temp.splice(index, 1, value);
        })
      })
    }
  }

  deleteListComponent(row) {
    if (this.formList.get('editWithDeletion') != null) {
      this.formList.get('editWithDeletion').setValue(true);
    }

    if (row.type == 'dropdown') {
      this.keyPairs.forEach(key => {
        if (key[key] == row[key]) {
          this.keyPairs.splice(this.keyPairs.indexOf(key), 1);
        }
      })
    }
    this.temp.splice(this.keysToMonitor.indexOf(row.dropdownKey), 1);
    this.keysToMonitor.splice(this.keysToMonitor.indexOf(row.dropdownKey), 1);
    for (let property in row) {
      let currentProperty = row[property];
      this.formList.removeControl(currentProperty);
    }
    let index = this.rows.indexOf(row);
    this.rows.splice(index, 1);
  }

  hasNumber(myString) {
    return /\d/.test(myString);
  }

  getCurrentForm() {
    if (this.controlType == 'textbox' || (this.question && this.question['controlType'] == 'textbox')) {
      this.formToCheck = this.form;
    }
    else if (this.controlType == 'message' || (this.question && this.question['controlType'] == 'message')) {
      this.formToCheck = this.form;
    }
    else if (this.controlType == 'dropdown' || (this.question && this.question['controlType'] == 'dropdown')) {
      this.formToCheck = this.formDropDown;
    }
    else if (this.controlType == 'list' || (this.question && this.question['controlType'] == 'list')) {
      this.formToCheck = this.formList;
    }
  }

  ngOnInit() {
    this.initializeUsedKeyTracking();
    this.assignClonedCarcheTemplateVariables();
    this.handleHostnameFields();
    this.getCurrentForm();

    if(this.shouldDisableKey()){
      this.disableKeyControl();
    }

    if(this.isFormKeyChangeRequired()){
      this.subscribeFormKeyChanges();
    }
    if(this.question){
      this.handleQuestionCloning();
    }

    // if message start
    if (this.questionCloned != null && this.questionCloned['controlType'] == 'message') {

    } // end if message

    // list edit start - textbox
    if (this.questionCloned != null && this.questionCloned['columnsType'] != undefined) {

    } // end if
  }

  initializeUsedKeyTracking(){
    this.usedKeyTracking = this.questions?.map(question => question["key"]) || [];
  }

  assignClonedCarcheTemplateVariables(){
    if (this.carcheTemplateVariables) {
      Object.assign(this.clonedCarcheTemplateVariables, this.carcheTemplateVariables);
    }
    this.clonedCarcheTemplateVariables = this.carcheTemplateVariables.map(obj => ({...obj}));
  }

  handleHostnameFields(){
    this.usedKeyTracking
      .filter(key => key && (key as string).includes('Hostname'))
      .forEach(key => this.existingHostnameFields.push({ value: key }))
  }

  shouldDisableKey(){
    return this.clonedCarcheTemplateVariables[0]?.value === 'empty';
  }

  disableKeyControl(){
    this.formToCheck.get('key').disable();
    this.formToCheck.addControl('error', new FormControl('', Validators.required));
  }

  isFormKeyChangeRequired(){
    return this.controlType !== null || this.question !== null;
  }

  handleQuestionCloning(){
    this.questionCloned = JSON.parse(JSON.stringify(this.question));

    if(this.questionCloned['options']) {
      this.handleDropdown();
    } else if(this.questionCloned['controlType'] === 'textbox') {
      this.handleTextbox();
    } else if(this.questionCloned['controlType'] === 'message') {
      this.handleMessage();
    } else if(this.questionCloned['columnsType']) {
      this.handleListEdit();
    }

  }

  removeUsedKeyTrackingForCloningKey(){
    this.usedKeyTracking.splice(this.usedKeyTracking.indexOf(this.questionCloned['key']), 1);
  }

  initializeDropdownValues(){
    this.rows.push('option1', 'option1key');
    this.key = 1;
    this.formDropDown.get('label').setValue(this.questionCloned['label']);
    this.formDropDown.get('placeholder').setValue(this.questionCloned['placeholder']);
  }

  setupOptionsSource(){
    const optionsSource = this.questionCloned['optionsSource'];
    if(optionsSource?.label && optionsSource?.value) {
     this.formDropDown.get('optionsSource').setValue({
      label: optionsSource['label'],
      value: { label: optionsSource['label'], value: optionsSource['value']}
     });
    } else {
      this.formDropDown.get('optionsSource').setValue({
        label: optionsSource,
        value: optionsSource
      })
    }
  }

  addDropdownOptions(){
    this.questionCloned['options'].forEach(opt => {
      if(opt === this.questionCloned['options'][0]){
        this.formDropDown.get('option1').setValue(opt.value);
        this.formDropDown.get('option1key').setValue(opt.key);
        this.keyPairs.push({ 'option1': opt.value, 'option1key': opt.key, 'oldkey': opt.key });
    } else{
      this.addDropdownOption(opt)
    }
    })
  }

  addDropdownOption(opt){
    const optid = 'value' + opt.value;
    const keyid = 'key' + opt.key;
    this.formDropDown.addControl(keyid, new FormControl('', Validators.required));
    this.formDropDown.get(keyid).setValue(opt.key);
    this.formDropDown.addControl(optid, new FormControl('', Validators.required));
    this.formDropDown.get(optid).setValue(opt.value);
    this.key++;
    this.rows.push(optid, keyid);
    this.keyPairs.push({ [optid]: opt.value, [keyid]: opt.key});
  }

  handleOptionsSourceForDropdown(){
    if (this.questionCloned['optionsSource'] == "Auto") {
      this.formDropDown.addControl('optionsFor', new FormControl(this.questionCloned['optionsFor'], Validators.required));
      this.formDropDown.addControl('option_label', new FormControl(this.questionCloned['optionsSourceHeaders']['label'], Validators.required));
      this.formDropDown.addControl('option_value', new FormControl(this.questionCloned['optionsSourceHeaders']['value'], Validators.required));
    }

    if (this.questionCloned['optionsSource'] != "Manual") {
      this.deleteFormControlsForOptionsInDropDown();
    }
  }

  handleDropdown() {
    this.removeUsedKeyTrackingForCloningKey();
    this.initializeDropdownValues();
    this.setupOptionsSource();
    this.addDropdownOptions();
    this.handleOptionsSourceForDropdown();
  }

  setTextboxFormValues() {
    this.form.get('label').setValue(this.questionCloned['label']);
    this.form.get('placeholder').setValue(this.questionCloned['placeholder']);
    this.form.get('key').setValue(this.questionCloned['key']);
    this.form.get('required').setValue(this.questionCloned['required']);
    this.form.get('value').setValue(this.questionCloned['value']);
    this.form.get('validator').setValue(this.questionCloned['validator']);
  }

  addTextboxRegexControls() {
    this.formToCheck.addControl('validatorRegExp', new FormControl('', Validators.required));
    this.formToCheck.addControl('validatorRegExpErrorMessage', new FormControl('', Validators.required));
    this.form.get('validatorRegExp').setValue(this.questionCloned['validatorRegExp']);
    this.form.get('validatorRegExpErrorMessage').setValue(this.questionCloned['validatorRegExpErrorMessage']);
    this.regex = true;
  }

  handleTextbox() {
    this.edit = true;
    this.setTextboxFormValues();
    
    if (this.form.value.validator == 'regexp') {
      this.addTextboxRegexControls();
    }
    this.usedKeyTracking.splice(this.usedKeyTracking.indexOf(this.questionCloned['key']), 1)
  }

  setMessageFormValues(){
    this.formMessage.get('label').setValue(this.questionCloned['label']);
    this.formMessage.get('placeholder').setValue(this.questionCloned['placeholder']);
    this.formMessage.get('key').setValue(this.questionCloned['key']);
    this.formMessage.get('required').setValue(this.questionCloned['required']);
    this.formMessage.get('value').setValue(this.questionCloned['value']);
    this.formMessage.get('validator').setValue(this.questionCloned['validator']);
  }

  addMessageRegexControls() {
    this.formToCheck.addControl('validatorRegExp', new FormControl('', Validators.required));
    this.formToCheck.addControl('validatorRegExpErrorMessage', new FormControl('', Validators.required));
    this.formMessage.get('validatorRegExp').setValue(this.questionCloned['validatorRegExp']);
    this.formMessage.get('validatorRegExpErrorMessage').setValue(this.questionCloned['validatorRegExpErrorMessage']);
    this.regex = true;
  }

  handleMessage() {
    this.edit = true;
    this.setMessageFormValues();
    
    if (this.formMessage.value.validator == 'regexp') {
      this.addMessageRegexControls();
    }
    this.usedKeyTracking.splice(this.usedKeyTracking.indexOf(this.questionCloned['key']), 1);
  }

  setupListEditFormValues(){
    this.formList.get('listLabel').setValue(this.questionCloned['label']);
    this.formList.get('key').setValue(this.questionCloned['key']);
    this.formList.addControl('editWithDeletion', new FormControl('',));
    this.formList.get('editWithDeletion').setValue(false);

    if (this.questionCloned['listStyle'] == 'div') {
      this.formList.get('checboxSelected').setValue(true);
      this.listStyleCheckboxChecked = true;
      this.listStyle = 'div';
    }
  }

  addTextboxColumnControls(column) {
    const keys = ['oldkey', 'label', 'placeholder', 'validator', 'key', 'value', 'required', 'type'];
    keys.forEach(key => {
      this.formList.addControl(key + this.listKey, new FormControl('', Validators.required));
      this.formList.get(key + this.listKey).setValue(column[key]);
    })
    this.formToCheck.addControl('regex' + this.listKey, new FormControl(false, Validators.required));

    if (column.validator == 'regexp') {
      this.formToCheck.addControl('validatorRegExp' + this.listKey, new FormControl(column['validatorRegExp'], Validators.required));
      this.formToCheck.addControl('validatorRegExpErrorMessage' + this.listKey, new FormControl(column['validatorRegExpErrorMessage'], Validators.required));
      this.formToCheck.get('regex' + this.listKey).setValue(true);
    }
    this.listKey++;
  }

  addTextboxColumn(column) {
    this.rows.push(
      {
        label: 'label' + this.listKey,
        value: 'value' + this.listKey,
        key: 'key' + this.listKey,
        oldkey: 'oldkey' + this.listKey,
        required: 'required' + this.listKey,
        placeholder: 'placeholder' + this.listKey,
        validator: 'validator' + this.listKey,
        regex: 'regex' + this.listKey,
        validatorRegExpErrorMessage: 'validatorRegExpErrorMessage' + this.listKey,
        validatorRegExp: 'validatorRegExp' + this.listKey,
        type: 'textbox',
        labelText: column.label,
      });

      //Adding form controls for the textbox column
      this.addTextboxColumnControls(column)
  }

  addDropdownColumn(column) {
    this.rows.push(
      {
        label: 'label' + this.listKey,
        options: 'options' + this.listKey,
        key: 'options' + this.listKey + 'key',
        required: 'required' + this.listKey,
        dropdownKey: 'dropdownKey' + this.listKey,
        oldkey: 'oldkey' + this.listKey,
        placeholder: 'placeholder' + this.listKey,
        optionsSource: 'optionsSource' + this.listKey,
        type: 'dropdown',
        optionsss: [],
      });

      //Adding form controls for the dropdown column
      this.addDropDownColumnControls(column)
  }

  addBasicControls(column){
    const keys = ['placeholder','oldkey', 'label', 'dropdownKey' , 'options','validator', 'key', 'value', 'required', 'type'];
    keys.forEach(key => {
      this.formList.addControl(key + this.listKey, new FormControl('', Validators.required));
      this.formList.get(key + this.listKey).setValue(column[key]);
    })
    this.formList.addControl('optionsSource' + this.listKey, new FormControl('', Validators.required));
  }

  setOptionsSource(column){
    if (column['optionsSource']['label'] && column['optionsSource']['value']) {
      this.formList.get('optionsSource' + this.listKey).setValue({ label: column['optionsSource']['label'], value: { label: column['optionsSource']['label'], value: column['optionsSource']['value'] } });
    } else {
      this.formList.get('optionsSource' + this.listKey).setValue({ label: column['optionsSource'], value: column['optionsSource'] });
    }

    if (column.optionsSource != "Manual") {
      this.formList.removeControl('options' + this.listKey + "key");
      this.formList.removeControl('options' + this.listKey);
    }
    this.formList.addControl('type' + this.listKey, new FormControl('dropdown',));
  }
  
  handleManualOptions(column){
    if (column.optionsSource === "Manual") {
      column.options.forEach((opt, index) => {
        if (index === 0) {
          this.addFirstOption(opt);
        } else {
          this.addAdditionalOption(opt, index);
        }
      });
    }
  }

  addFirstOption(opt){
    const optKey = 'options' + this.listKey + 'key';
    const optValue = 'options' + this.listKey;
    this.formList.get(optValue).setValue(opt.value);
    this.formList.get(optKey).setValue(opt.key);
    this.keyPairs.push([{ key: optKey, value: optValue }]);
  }

  addAdditionalOption(opt, index){
    const optKey = 'options' + this.listKey + this.listOptionsCount + 'key';
    const optValue = 'options' + this.listKey + this.listOptionsCount;
    this.formList.addControl(optValue, new FormControl('', Validators.required));
    this.formList.get(optValue).setValue(opt.value);
    this.formList.addControl(optKey, new FormControl('', Validators.required));
    this.formList.get(optKey).setValue(opt.key);
  
    const option = { key: optKey, value: optValue };
    if (this.keyPairs.length - 1 === index) {
      this.keyPairs[index].push(option);
    } else {
      this.keyPairs.push([option]);
    }
  
    this.rows.forEach(row => {
      if (row.options === 'options' + this.listKey) {
        row.optionsss.push(optValue, optKey);
      }
    });
    this.listOptionsCount++;
  }

  addDropDownColumnControls(column){
    this.addBasicControls(column);
    this.setOptionsSource(column);
    this.handleManualOptions(column);
    this.listKey++;
    // if (column.type == 'dropdown') {
    //   dropdownsCount++;
    // }
  }

  setupListColumns() {
    this.questionCloned['columnsType'].forEach(column => {
      if (column.controlType == 'textbox') {
        this.addTextboxColumn(column)
      } // end if textbox 
      else if (column.controlType == 'dropdown') {
         this.addDropdownColumn(column)
      } // end if list dropdown 
    })
  }

  handleListEdit() {
    this.removeUsedKeyTrackingForCloningKey();
    this.setupListEditFormValues();
    this.setupListColumns();
 // end foreach columnsType
  }

  /**
   * Mark form controls in form group as dirt and invalid
   * @param form
   */
  public markInvalidInputs(form: FormGroup): void {
    (<any>Object).values(form.controls).forEach(control => {
      control.markAsDirty(true);
      if (control.controls) {
        this.markInvalidInputs(control);
      }
    });
  }

  /**
   * Load options source for dropdown component
   */
  private loadDropdownApiSource(): void {
    this.controller.getApiOptionsSource().subscribe(apiResult => {
      let pollingData = interval(18000).pipe(
        switchMap(() => this.controller.getResultFromScheduledProcess(apiResult['pid'])),
      ).subscribe(result => {
        if (result['status'] && result['code']) {
          this.ApiSources = [{ label: 'Manual', value: 'Manual' }, { label: 'Auto', value: 'Auto' }];
          if (result['status'] == 'OK' && result['code'] == '200') {
            const resultJson = JSON.parse(result['result']);
            resultJson.forEach(option => {
              this.ApiSources.push({ label: option['label'], value: option });
            });
            this.loadApiSource = true;
            pollingData.unsubscribe();
          }
          if (result['status'] !== 'enrolled' && result['code'] > 200) {
            pollingData.unsubscribe();
            this.loadApiSource = true;
          }
        }
      }, error => {
        this.ApiSources = [{ label: 'Manual', value: 'Manual' }, { label: 'Auto', value: 'Auto' }];
        this.loadApiSource = true;
        console.log(error);
      });
    }, error => {
      this.ApiSources = [{ label: 'Manual', value: 'Manual' }, { label: 'Auto', value: 'Auto' }];
      this.loadApiSource = true;
      console.log(error);
    });
  }
}