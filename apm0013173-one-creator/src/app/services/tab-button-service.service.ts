import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TabButtonServiceService {
  private saveButtonPushedSource = new Subject();
  private deletButtonPushedSource = new Subject();
  private editButtonPushedSource = new Subject();
  private clearButtonPushedSource = new Subject();
  private customerChanged = new Subject();
  private customerNameChanged = new Subject();
  private templateVariablesChanged = new Subject();
  private previewButtonPushedSource = new Subject();
  private templateValidationChanged = new Subject();
  private saveForm = new Subject();
  private _generateConfigWorkflow = false;
  private deleteBtnPushedSpource = new Subject();
  private loadQuestionsFormFormBuilder = new Subject();

  saveButtonPushed$ = this.saveButtonPushedSource.asObservable();
  deletButtonPushed$ = this.deletButtonPushedSource.asObservable();
  editButtonPushed$ = this.editButtonPushedSource.asObservable();
  clearButtonPushed$ = this.clearButtonPushedSource.asObservable();
  customerChanged$ = this.customerChanged.asObservable();
  customerNameChanged$ = this.customerNameChanged.asObservable();
  templateVariablesChanged$ = this.templateVariablesChanged.asObservable();
  previewButtonPushed$  = this.previewButtonPushedSource.asObservable();
  templateValidationChanged$  = this.templateValidationChanged.asObservable();
  saveForm$ = this.saveForm.asObservable();
  deleteBtnPushed$ = this.deleteBtnPushedSpource.asObservable();
  loadQuestionsFormFormBuilder$ = this.loadQuestionsFormFormBuilder.asObservable();

  announceLoadQuestions(questions){
    this.loadQuestionsFormFormBuilder.next(questions);
  }

  announceSaveForm(save){
    this.saveForm.next(save);
  }

  announceDeleteTemplate(){
    this.deleteBtnPushedSpource.next();
  }

  announceTemplateValidationChanged(validation){
    this.templateValidationChanged.next(validation);
  }

  annoucnePreviewContent(tabView){
    this.previewButtonPushedSource.next(tabView);
  }

  announceTemplateVariablesChanged(variables){
    this.templateVariablesChanged.next(variables);
  }

  announceCustomerNameChanged(customerName){
    this.customerNameChanged.next(customerName);
  }

  announceCustomerChanged(customer){
    this.customerChanged.next(customer);
  }

  annoucneSaveContent(tabView){
    this.saveButtonPushedSource.next(tabView);
  }

  annoucneDeleteContent(tabView){
    this.deletButtonPushedSource.next(tabView);
  }

  annoucneEditContent(tabView){
    this.editButtonPushedSource.next(tabView);
  }

  annoucneClearContent(tabView){
    this.clearButtonPushedSource.next(tabView);
  }


  set generateConfigWorkflow(value) {
    this._generateConfigWorkflow = value;
  }
  get generateConfigWorkflow() {
    return this._generateConfigWorkflow;
  }

  constructor() { }
}
