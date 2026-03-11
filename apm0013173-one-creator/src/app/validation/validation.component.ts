import { Component, OnInit, Input, AfterViewInit} from '@angular/core';
import { FormBuilder, FormControl, Validators } from '@angular/forms';

@Component({
  selector: 'app-validation',
  templateUrl: './validation.component.html',
  styleUrls: ['./validation.component.scss']
})
export class ValidationComponent implements OnInit{
  @Input() questionCloned;
  @Input() validator;
  @Input() formToCheck;
  @Input() row;
  @Input() controlType;
  @Input() regex = false;
  options = [{name: 'None', value: 'None'},{name: 'IPv4', value: 'IPv4'},{name: 'IPv6', value: 'IPv6'},{name: 'Email', value: 'Email'},{name: 'RegEXp', value: 'regexp'}];

  constructor() {
  }

  ngOnInit() {
    if (this.row !== undefined){
      let index = this.row.regex;
      if (this.formToCheck.value[index]){
        this.regex = true;
      }
    }
  }

  valueCheck(value, row){
    if(value == 'regexp' && this.controlType !== 'list' && this.controlType !== 'listEdit'){
      this.regex = true;
      this.formToCheck.addControl('validatorRegExp', new FormControl('',Validators.required));
      this.formToCheck.addControl('validatorRegExpErrorMessage', new FormControl('',Validators.required));
    } else if (value == 'regexp' && (this.controlType === 'list' ||  this.controlType === 'listEdit')){
      this.regex = true;
      this.formToCheck.addControl(row.validatorRegExp, new FormControl('',Validators.required));
      this.formToCheck.addControl(row.validatorRegExpErrorMessage, new FormControl('',Validators.required));
    } else if(value !== 'regexp' && this.regex && this.controlType !== 'list' && this.controlType !== 'listEdit') {
      this.regex = false;
      this.formToCheck.get('validatorRegExp').setValue('');
      this.formToCheck.removeControl('validatorRegExp');
      this.formToCheck.get('validatorRegExpErrorMessage').setValue('');
      this.formToCheck.removeControl('validatorRegExpErrorMessage');
    } else if(value !== 'regexp' && this.regex && (this.controlType === 'list' || this.controlType === 'listEdit')) {
      this.regex = false;
      this.formToCheck.get(this.row.validatorRegExp).setValue('');
      this.formToCheck.removeControl(this.row.validatorRegExp);
      this.formToCheck.get(this.row.validatorRegExpErrorMessage).setValue('');
      this.formToCheck.removeControl(this.row.validatorRegExpErrorMessage);
    }
  }
}