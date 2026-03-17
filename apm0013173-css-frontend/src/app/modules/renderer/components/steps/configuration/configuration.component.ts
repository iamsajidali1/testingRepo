import { Component } from '@angular/core';
import { UtilService } from '../../../services/util.service';
import { Router } from '@angular/router';
import { StateService } from '../../../services/state.service';
import { ConfirmationService } from 'primeng/api';
import { ProcessDialogComponent } from '../../../dialogs/process-dialog/process-dialog.component';
import { DialogService } from 'primeng/dynamicdialog';

@Component({
  selector: 'app-configuration',
  templateUrl: './configuration.component.html',
  styleUrls: ['./configuration.component.scss']
})
export class ConfigurationComponent {
  isLoading: boolean;
  isFinalStep: boolean;
  config: any;
  title: string;
  component: string = 'configuration';
  constructor(
    private router: Router,
    private confirmationService: ConfirmationService,
    private dialogService: DialogService,
    private stateService: StateService,
    private utilService: UtilService
  ) {
    // Get the Title of the Component
    const currentStep = this.stateService.workflowSteps.find(
      (step) => step.routerLink === this.component
    );
    this.title = currentStep ? currentStep.title || currentStep.label : '';
    const data = stateService.getWorkflowData(this.component);
    this.config = data && 'config' in data ? data.config : '';
    this.isFinalStep = !this.stateService.getWorkflowDriver(this.component)
      ?.next;
  }

  get isConfigJson(): boolean {
    let isJson = typeof this.config === 'object';
    if (!isJson) {
      isJson = this.utilService.isValidJson(this.config);
    }
    return isJson;
  }

  onBack() {
    const { previous } = this.stateService.getWorkflowDriver(this.component);
    this.router.navigate(['config', previous]);
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
