import { Component, OnInit, Input, OnChanges } from '@angular/core';
import { FormControl,  Validators  } from '@angular/forms';

@Component({
  selector: 'app-conditions',
  templateUrl: './conditions.component.html',
  styleUrls: ['./conditions.component.scss']
})
export class ConditionsComponent implements OnInit, OnChanges {
  @Input() usedKeyTracking;
  @Input() formToCheck;
  @Input() conditions;
  @Input() edit;
  @Input() questionCloned;
  @Input() controlType;
  @Input() questions;

  conditionChecked = false;
  conditionIndexes = [];
  conditionCount = 0;
  displayOptions = false;
  currentConditionAlreadyCalled = false;
  createConditionCheckboxChecked = false;
  conditionValues = [];
  buttonDisable = false;
  addButtonEnable = false;
  keysArray: any[] = [];
  typeOptions: any[] = [{"name" : "Equals", "value" : "eq"},{"name" : "Not Equals", "value" : "neq"}]

  constructor() { }

  ngOnChanges(){
    if(this.usedKeyTracking){
      for(let key of this.usedKeyTracking){
        this.keysArray.push({"keyName" : key});
      }
    }
  }

  ngOnInit() {
    if (this.edit && this.questionCloned.conditions != undefined){
      this.getConditions();
    }
  }

  createCondition(e){
    this.conditionCount = 1;
    if (e['checked']){
      this.createConditionCheckboxChecked = true;
      this.conditionChecked = true;
      this.addCondition();
    }
    else if(!(e['checked'])){
      this.createConditionCheckboxChecked = false;
      this.conditions.forEach(condition => {
        for (let property in condition){
          this.formToCheck.removeControl(condition[property]);
        }
      })
      this.conditions.splice(0);
    }
  }

  getNextIndex() : number{
    for(let i = 0; i < this.conditionIndexes.length -1; i++){
      if (this.conditionIndexes[i] + 1 !== this.conditionIndexes[i + 1]){
        return this.conditionIndexes[i] + 1;
      }
    }
    return -1;
  }

  createConditionObject(index: number): any{
    const suffix = index != undefined ? index : this.conditionCount;
    return{
      allKeys: 'allKeys' + suffix,
      condition: 'condition' + suffix,
      conditionValue: 'conditionValue' + suffix,
      alreadyCalled: 'alreadyCalled' + suffix,
    };
  }

  addControlsToForm(condition: any, index: number): void{
    const suffix = index != undefined ? index : this.conditionCount;
    this.formToCheck.addControl('allKeys' + suffix, new FormControl('',Validators.required));
    this.formToCheck.addControl('condition' + suffix, new FormControl('',Validators.required));
    this.formToCheck.addControl('conditionValue' + suffix, new FormControl('',Validators.required));
    this.formToCheck.addControl('alreadyCalled' + suffix, new FormControl(false));
    if (this.conditionCount === 1) {
      this.formToCheck.addControl('type' + suffix, new FormControl(''));
    }
  }

  addCondition(){
    const index = this.getNextIndex();
    this.conditionIndexes.push(index != undefined ? index : this.conditionCount)
    const condition = this.createConditionObject(index);
    this.addControlsToForm(condition, index);
    this.conditions.push(condition);
    this.conditionIndexes.sort((a, b) => a - b);
    this.conditions.sort((a, b) => a.condition - b.condition);
  }

  displayConditionOptions(){
    this.displayOptions = true;
    this.conditions[this.conditions.length-1].type = 'type1'
    this.conditionCount++;
    this.buttonDisable = true;
  }

  AddConditionIntoList(){
    this.conditionCount++;
    this.addCondition()
  }

  complexCondition(alreadyCalled){
    if (!(this.formToCheck.value[alreadyCalled])){
      this.formToCheck.get(alreadyCalled).setValue(true);
      this.addCondition();
      this.addButtonEnable = true;
    }
  }

  RemoveCondition(condition){ 
    let thenum = condition['condition'].replace( /^\D+/g, '');
    this.conditionIndexes.splice(this.conditionIndexes.indexOf(parseInt(thenum)),1)
    for (let property in condition){
      this.formToCheck.removeControl(condition[property]);
    }
    this.conditions.splice(this.conditions.indexOf(condition),1);
    this.conditionCount--;
  }

  getConditions(){
    if (Object.keys(this.questionCloned['conditions']).length !== 0){
      let conditions;
      this.createConditionCheckboxChecked = true;
      this.conditionChecked = true;
      conditions = JSON.parse(JSON.stringify(this.questionCloned['conditions']));
      if (conditions['list'] != undefined){
        this.buttonDisable = true;
        this.addButtonEnable = true;
        this.displayOptions = true;
        for (let i=0; i<conditions.list.length; i++){
          this.conditionCount++;
          let condition = {allKeys : 'allKeys' + this.conditionCount, 
                         condition : 'condition' + this.conditionCount, 
                         conditionValue : 'conditionValue' + this.conditionCount,
                         alreadyCalled : 'alreadyCalled' + this.conditionCount,
                          };
          if(i==0){
            condition['type'] = 'type' + this.conditionCount;
            this.formToCheck.addControl('type' + this.conditionCount, new FormControl(conditions.type,));
          }
          this.formToCheck.addControl('allKeys' + this.conditionCount, new FormControl( conditions.list[i].key ,Validators.required));
          this.formToCheck.addControl('condition' + this.conditionCount, new FormControl(conditions.list[i].type,Validators.required));
          this.formToCheck.addControl('conditionValue' + this.conditionCount, new FormControl(conditions.list[i].value,Validators.required));
          this.formToCheck.addControl('alreadyCalled' + this.conditionCount, new FormControl(true,));
          this.conditions.push(condition);  
          this.conditionIndexes.push(this.conditionCount)
        }
      }
      else {
        this.conditionCount++;
        let condition = {allKeys : 'allKeys' + this.conditionCount, 
                         condition : 'condition' + this.conditionCount, 
                         conditionValue : 'conditionValue' + this.conditionCount,
                         alreadyCalled : 'alreadyCalled' + this.conditionCount,
        };
        this.formToCheck.addControl('allKeys' + this.conditionCount, new FormControl( conditions.key ,Validators.required));
        this.formToCheck.addControl('condition' + this.conditionCount, new FormControl(conditions.type,Validators.required));
        this.formToCheck.addControl('conditionValue' + this.conditionCount, new FormControl(conditions.value,Validators.required));
        this.formToCheck.addControl('type' + this.conditionCount, new FormControl('',));
        this.formToCheck.addControl('alreadyCalled' + this.conditionCount, new FormControl(false,));
        this.conditions.push(condition);  
      }
    }
  }

  dropdownCheck(key, allKeys){
    let index = (parseInt(allKeys.replace( /^\D+/g, '')))-1;
    this.questions.forEach(question => {
      if (question.key == key){
        if (question.controlType == 'dropdown'){
          this.conditions[index].isDropdown = true;
          this.conditions[index].questionIndex = question.order-1;
        } else {
          this.conditions[index].isDropdown = false;
        }
      }
    })
  }
}