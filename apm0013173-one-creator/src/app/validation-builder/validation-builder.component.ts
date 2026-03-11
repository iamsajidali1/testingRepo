import { Component, OnInit, Input, OnChanges } from '@angular/core';
import { Validators, FormControl, FormGroup, FormBuilder } from '@angular/forms';

@Component({
  selector: 'app-validation-builder',
  templateUrl: './validation-builder.component.html',
  styleUrls: ['./validation-builder.component.scss']
})

export class ValidationBuilderComponent implements OnInit, OnChanges {
  @Input() template;
  @Input() selectedFormTemplate;
  form: FormGroup;

  constructor(private fb: FormBuilder) { 
    this.form = this.fb.group({
      'validation': new FormControl('')
    });
  }

  ngOnInit(){
    if(this.template.validation != null){
      this.form.get('validation').setValue(this.template.validation);
    }
  }

  ngOnChanges(){
    if (this.selectedFormTemplate.name && this.template.validation != null) {
      this.form.controls['validation'].setValue(this.template.validation);
    }

    this.form.controls['validation'].valueChanges.subscribe(value => {
        this.template.validation = value.trim().replace(/^\s*[\r\n]/gm, '');
    });
  }
}
