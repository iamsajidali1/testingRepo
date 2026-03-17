import { Component, OnDestroy, OnInit } from '@angular/core';
import { ValidationModel } from '../../../models/validation.model';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { StateService } from '../../../services/state.service';
import { ProcessDialogComponent } from '../../../dialogs/process-dialog/process-dialog.component';
import { DialogService } from 'primeng/dynamicdialog';
import { ConfirmationService } from 'primeng/api';

@Component({
  selector: 'app-pre-validation',
  templateUrl: './pre-validation.component.html',
  styleUrls: ['./pre-validation.component.scss']
})
export class PreValidationComponent implements OnInit, OnDestroy {
  isLoading: boolean;
  isFinalStep: boolean;
  title: string;
  component: string = 'pre-validation';
  validations: ValidationModel[] = [];
  failedValidations: ValidationModel[] = [];
  subscriptions: Subscription[] = [];
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
  }

  ngOnInit(): void {
    this.validations = this.stateService.getWorkflowData(this.component);
    // Find out the failed validation commands
    if (this.validations) {
      this.failedValidations = this.validations.filter(
        (val) => val.status !== 'completed'
      );
    }
  }

  onBack() {
    const { previous } = this.stateService.getWorkflowDriver(this.component);
    this.router.navigate(['config', previous]);
  }

  onContinue() {
    // Check if there are no failed validation commands
    if (!this.failedValidations.length) return this.goNext();
    // If there are any failed validation commands ask confirmation
    const confirmMessage = `The following validation command(s) has failed on selected device!
    Would you still like to continue?
    <ul class='font-medium'>
      <li>${this.failedValidations.map((val) => val.command).join('</li>')}
    </ul>`;
    // If it needs to be confirmed then goNext on confirmation
    this.confirmationService.confirm({
      accept: this.goNext.bind(this),
      defaultFocus: 'none',
      message: confirmMessage
    });
  }

  goNext() {
    // Set the collected data to the state service
    this.stateService.setWorkflowData(this.component, this.validations);
    this.isLoading = true;
    const { processes, next } = this.stateService.getWorkflowDriver(
      this.component
    );
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

  onRerun() {
    const driver = this.stateService.workflowDrivers.find(
      (wfDriver) => wfDriver.next === this.component
    );
    this.isLoading = true;
    const dialogRef = this.dialogService.open(ProcessDialogComponent, {
      showHeader: false,
      width: '720px',
      data: driver.processes
    });
    dialogRef.onClose.subscribe(() => {
      this.isLoading = false;
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
