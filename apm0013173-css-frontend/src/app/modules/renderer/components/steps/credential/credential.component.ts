import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { DialogService } from 'primeng/dynamicdialog';
import { StateService } from '../../../services/state.service';
import { ProcessDialogComponent } from '../../../dialogs/process-dialog/process-dialog.component';
import { QuestionModel } from '../../../models/question.model';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import configData from './credential.config.json';

@Component({
  selector: 'app-credential',
  templateUrl: './credential.component.html',
  styleUrls: ['./credential.component.scss']
})
export class CredentialComponent implements OnInit {
  @Input() form!: FormGroup;
  isLoading: boolean;
  isFinalStep: boolean;
  title: string;
  workflowId: number;
  config: any[] = configData;
  component: string = 'credential';
  uploadedFiles: File[] = [];
  fileErrors: any = {};
  questions: QuestionModel[] = [];
  constructor(
    private router: Router,
    private confirmationService: ConfirmationService,
    private dialogService: DialogService,
    private stateService: StateService
  ) {
    // Get the Title of the Component
    const currentStep = this.stateService.workflowSteps.find(
      (step) => step.routerLink === this.component
    );
    this.title = currentStep ? currentStep.title || currentStep.label : '';
    this.isFinalStep = !this.stateService.getWorkflowDriver(this.component)
      ?.next;
    this.workflowId = this.stateService.inputParams?.action.workflowId || 10;
  }

  ngOnInit(): void {
    this.questions =
      this.config.find((conf) => conf.workflowId === this.workflowId)
        ?.questions || [];
    // Map questions with script values if any
    this.questions.forEach((question) => {
      const scriptValue = this.stateService.cachedScripts.find(
        (script) => script.script === question.optionsSource
      );
      if (scriptValue) {
        question.options = scriptValue.result;
      }
    });
    this.form = this.getFormGroup(this.questions);
  }

  getFormControl(question: QuestionModel) {
    const formControl = new FormControl(question.value || '');
    // Validation checks and validators for the control
    const validators = [];
    // Check Required
    if (question.required) {
      validators.push(Validators.required);
    }
    formControl.setValidators(validators);
    formControl.updateValueAndValidity();
    return formControl;
  }

  getFormGroup(questions: QuestionModel[]) {
    const group: any = {};
    questions.forEach((question) => {
      group[question.key] = this.getFormControl(question);
    });
    return new FormGroup(group);
  }

  onBack() {
    const { previous } = this.stateService.getWorkflowDriver(this.component);
    this.router.navigate(['config', previous]);
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

  goNext() {
    const data = { ...this.form.value };
    // Set the collected data to the state service
    this.stateService.setWorkflowData(this.component, data);
    const { processes, next } = this.stateService.getWorkflowDriver(
      this.component
    );
    this.isLoading = true;
    const dialogRef = this.dialogService.open(ProcessDialogComponent, {
      showHeader: false,
      width: '720px',
      data: processes
    });
    dialogRef.onClose.subscribe((canGoAhead: boolean) => {
      this.isLoading = false;
      if (canGoAhead) {
        this.router.navigate(['config', next]);
      }
    });
  }
}
