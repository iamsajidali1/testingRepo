import { AfterViewInit, Component, OnDestroy } from '@angular/core';
import { Subscription, timer } from 'rxjs';
import { ValidationModel } from '../../../models/validation.model';
import { StateService } from '../../../services/state.service';
import { ProcessDialogComponent } from '../../../dialogs/process-dialog/process-dialog.component';
import { DialogService } from 'primeng/dynamicdialog';
import { Router } from '@angular/router';
import { ProcessModel } from '../../../models/process.model';
import { ConfirmationService } from 'primeng/api';

@Component({
  selector: 'app-post-validation',
  templateUrl: './post-validation.component.html',
  styleUrls: ['./post-validation.component.scss']
})
export class PostValidationComponent implements OnDestroy, AfterViewInit {
  isLoading: boolean;
  isCompareModeActive: boolean;
  hideMatchingLines: boolean;
  isInlineView: boolean;
  isAutoRollbackStarted: boolean;
  shouldShowRollbackWarning: boolean;
  title: string;
  component: string = 'post-validation';
  timeToRollbackInMinutes: number;
  timeToRollbackInSeconds: number;
  rollbackTimerIncreaseInterval: number;
  preValidations: ValidationModel[] = [];
  postValidations: ValidationModel[] = [];
  rollbackSubscription: Subscription;
  subscriptions: Subscription[] = [];
  constructor(
    private router: Router,
    private stateService: StateService,
    private confirmationService: ConfirmationService,
    private dialogService: DialogService
  ) {
    // Get the Title of the Component
    const currentStep = this.stateService.workflowSteps.find(
      (step) => step.routerLink === this.component
    );
    this.title = currentStep ? currentStep.title || currentStep.label : '';
    this.preValidations = stateService.getWorkflowData('pre-validation');
    this.postValidations = stateService.getWorkflowData(this.component);
    this.isInlineView = true;
    this.isCompareModeActive = true;
    // Set the predefined Rollback Timer Default to 10 Minutes
    this.rollbackTimerIncreaseInterval =
      this.stateService.inputParams?.action?.minRollbackTimer || 10;
    this.timeToRollbackInMinutes = this.rollbackTimerIncreaseInterval;
    // Set the utilised rollback timer to timeToRollbackInMinutes
    this.stateService.rollbackTimerUtilised = this.timeToRollbackInMinutes;
    // Calculate the remaining and set the value Timer Default to 10 Minutes
    this.stateService.rollbackTimerRemaining =
      (this.stateService.inputParams?.action?.maxRollbackTimer || 10) -
      this.timeToRollbackInMinutes;
  }

  get durationThatCanBeRequested() {
    if (
      this.stateService.rollbackTimerRemaining >=
      this.rollbackTimerIncreaseInterval
    ) {
      return this.rollbackTimerIncreaseInterval;
    }
    return this.stateService.rollbackTimerRemaining;
  }

  ngAfterViewInit() {
    setTimeout(() => (this.hideMatchingLines = true), 0);
    this.initiateRollbackTimer();
  }

  initiateRollbackTimer() {
    const target: number = 100;
    let progress: number = 1;
    const startDate = new Date();
    let targetDate: Date = new Date(
      startDate.getTime() + this.timeToRollbackInMinutes * 60000
    );
    const totalTimeInSeconds = this.timeToRollbackInMinutes * 60;
    const tick = () => {
      const oneSecond = 1000;
      const oneMinute = oneSecond * 60;
      const parts: string[] = [];
      const now: Date = new Date();
      const elapsed: number = targetDate.getTime() - now.getTime();

      this.timeToRollbackInSeconds = elapsed / oneSecond;
      this.timeToRollbackInMinutes = this.timeToRollbackInSeconds / 60;

      // Get the Minutes and Seconds of the Timer
      parts[0] = '' + Math.floor(elapsed / oneMinute);
      parts[1] = '' + Math.floor((elapsed % oneMinute) / oneSecond);
      // Append Zeros
      parts[0] = parts[0].length == 1 ? '0' + parts[0] : parts[0];
      parts[1] = parts[1].length == 1 ? '0' + parts[1] : parts[1];

      // Get all the Meters
      const meters = document.querySelectorAll('svg[data-value] .meter');
      meters.forEach((path: any) => {
        // Get the length of the path
        let length = path.getTotalLength();
        // Calculate the percentage of the total length
        let to = length * ((1 + progress) / target);
        progress = progress + target / totalTimeInSeconds;
        path.parentNode.setAttribute('data-value', target - progress);
        path.getBoundingClientRect();
        // Set the Offset
        path.style.strokeDashoffset = Math.max(0, to);
        path.nextElementSibling.textContent = parts.join(':');
      });
      return parts;
    };
    const source = timer(0, 1000);
    this.rollbackSubscription = source.subscribe(() => {
      const parts = tick();
      this.shouldShowRollbackWarning = this.timeToRollbackInSeconds < 60;
      if (parts.every((part) => part === '00')) {
        // Do the Rollback
        this.shouldShowRollbackWarning = false;
        this.isAutoRollbackStarted = true;
        this.doRollback();
        this.rollbackSubscription.unsubscribe();
      }
    });
  }

  increaseRollbackTimer(minutes: number = 10) {
    // Check if there is remaining timer in the quota
    if (this.stateService.rollbackTimerRemaining <= 0) {
      // No Time left
      this.doRollback();
    }
    this.rollbackSubscription.unsubscribe();
    this.timeToRollbackInMinutes += minutes;
    // Update the Quota
    this.stateService.rollbackTimerUtilised =
      this.stateService.rollbackTimerUtilised + minutes;
    this.stateService.rollbackTimerRemaining =
      this.stateService.rollbackTimerRemaining - minutes;
    this.shouldShowRollbackWarning = false;
    this.initiateRollbackTimer();
  }

  onRollback() {
    this.confirmationService.confirm({
      accept: this.doRollback.bind(this),
      defaultFocus: 'none',
      message:
        'This action will rollback the config changes onto the target device.\n Do you want to continue?'
    });
  }

  onContinue() {
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
    this.isLoading = true;
    const { processes, next } = this.stateService.getWorkflowDriver(
      this.component
    );
    // Kill the rollback timer if that is running
    if (this.rollbackSubscription) this.rollbackSubscription.unsubscribe();
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

  doRollback() {
    this.isLoading = true;
    const next = 'summary';
    const processes: ProcessModel[] = [
      {
        order: 0,
        title: 'Rollback Configuration Changes',
        action: 'rollbackConfigChanges',
        status: 'n/a',
        message:
          'rolling back configuration changes to the pre-config checkpoint',
        shouldExecute: true,
        allowSkipOnFail: false
      }
    ];
    // Kill the rollback timer if that is running
    if (this.rollbackSubscription) this.rollbackSubscription.unsubscribe();
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

  ngOnDestroy() {
    this.subscriptions.forEach((subscription) => {
      if (subscription) {
        subscription.unsubscribe();
      }
    });
    if (this.rollbackSubscription) this.rollbackSubscription.unsubscribe();
  }
}
