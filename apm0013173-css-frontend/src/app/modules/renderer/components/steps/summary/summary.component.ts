import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { StateService } from '../../../services/state.service';
import { Router } from '@angular/router';
import { ValidationModel } from '../../../models/validation.model';
import { CoreService } from '../../../services/core.service';
import { Subscription } from 'rxjs';
import { MessageService } from 'primeng/api';

interface SummaryModel {
  label: string;
  type: 'text' | 'status' | 'config' | 'validation-diff';
  value: any;
}

@Component({
  selector: 'app-summary',
  templateUrl: './summary.component.html',
  styleUrls: ['./summary.component.scss']
})
export class SummaryComponent implements OnInit, AfterViewInit, OnDestroy {
  configRows: number;
  title: string;
  statusMessage: string;
  component: string = 'summary';
  summary: SummaryModel[] = [];
  preValidation: ValidationModel[];
  postValidation: ValidationModel[];
  statusMap: any = {};
  hideMatchingLines: boolean;
  subscriptions: Subscription[] = [];
  constructor(
    private router: Router,
    private messageService: MessageService,
    private stateService: StateService,
    private coreService: CoreService
  ) {
    // Get the Title of the Component
    const currentStep = this.stateService.workflowSteps.find(
      (step) => step.routerLink === this.component
    );
    this.title = currentStep ? currentStep.title || currentStep.label : '';
    this.configRows = 2;
    this.statusMap = {
      'pending-confirmation': {
        type: 'warning',
        icon: 'pi pi-exclamation-triangle',
        message: 'The changes are executed but pending user confirmation.'
      },
      completed: {
        type: 'success',
        icon: 'pi pi-check-circle',
        message:
          'The configuration change has been successfully completed & confirmed.'
      },
      'rolled-back': {
        type: 'danger',
        icon: 'pi pi-history',
        message:
          'The configuration was rolled back to the pre-configuration state.'
      },
      failed: {
        type: 'danger',
        icon: 'pi pi-times',
        message: 'The configuration failed to be executed.'
      }
    };
    this.statusMessage = this.stateService.statusMessage;
    this.preValidation = this.stateService.getWorkflowData('pre-validation');
    this.postValidation = this.stateService.getWorkflowData('post-validation');
  }

  ngOnInit() {
    this.prepareSummary();
  }

  ngAfterViewInit() {
    setTimeout(() => (this.hideMatchingLines = true), 0);
  }

  prepareSummary() {
    this.summary = [];
    // Push basic Change Details
    this.summary.push(
      {
        label: 'Transaction ID',
        type: 'text',
        value: this.stateService.transactionId
      },
      {
        label: 'Customer Name',
        type: 'text',
        value: this.stateService.inputParams?.customer.name
      }
    );
    // Conditional Push Config Details if not Data Collection(2), Lan Migration (12)
    // VCO edge provisioning (7), Bulk VCO edge provisioning (8), MDS Config (9)
    // Bulk VCO users provisioning (10) Generate device report (11)
    if (
      ![2, 7, 8, 9, 10, 11, 12, 17, 18].includes(
        this.stateService.inputParams?.action.workflowId
      )
    ) {
      this.summary.push(
        {
          label: 'Device Hostname',
          type: 'text',
          value: this.stateService.deviceName
        },
        {
          label: 'Device Location',
          type: 'text',
          value: this.stateService.deviceDetails?.ADDRESS
        },
        {
          label: 'Configuration Script',
          type: 'config',
          value: this.stateService.getWorkflowData('configuration')?.config
        }
      );
    }
    // Push the Change Details and Statuses
    this.summary.push(
      {
        label: 'Completion Status',
        type: 'status',
        value:
          this.stateService.status in this.statusMap
            ? this.statusMap[this.stateService.status]
            : {
                type: 'danger',
                icon: 'pi pi-times-circle',
                message:
                  'Completion status is unknown to the system, please contact support!'
              }
      },
      {
        label: 'Change Type',
        type: 'text',
        value: this.stateService.inputParams?.action.name
      },
      {
        label: 'Change Description',
        type: 'text',
        value: this.stateService.inputParams?.action.description
      }
    );

    // Conditional Change Request for Logical Change(1)
    if (
      this.stateService.inputParams?.action.workflowId === 1 &&
      this.stateService.changeRequestData
    ) {
      this.summary.push({
        label: 'Change Request',
        type: 'text',
        value: `Change Request created successfully with Id: ${this.stateService.changeRequestData.id}`
      });
    }

    // Conditional Push for data on Data Collection(2)
    if (this.stateService.inputParams?.action.workflowId === 2) {
      this.configRows = 4;
      this.summary.push({
        label: 'Collected Data',
        type: 'config',
        value: JSON.stringify(
          this.stateService.getWorkflowData('data-collection'),
          null,
          2
        )
      });
    }

    // Set up the Differences, if both pre-validation & post-validation is present
    if (this.preValidation && this.postValidation) {
      const diffValidation = this.preValidation.map((preVal) => ({
        command: preVal.command,
        preValOutput: preVal.output,
        postValOutput: this.postValidation.find(
          (postVal) => postVal.command === preVal.command
        )?.output
      }));
      this.summary.push({
        label: 'Validation Difference',
        type: 'validation-diff',
        value: diffValidation
      });
    }

    // All Summary is Prepared, Send the Email
    this.notifyChangeSummary();
  }

  notifyChangeSummary() {
    const status =
      this.stateService.status in this.statusMap
        ? this.statusMap[this.stateService.status].message
        : 'Completion status is unknown to the system, please contact support!';
    const data = {
      transactionId: this.stateService.transactionId,
      customerName: this.stateService.inputParams?.customer.name,
      hostname: this.stateService.deviceName,
      hostAddress: this.stateService.deviceDetails?.ADDRESS,
      changeType: this.stateService.inputParams?.action.name,
      description: this.stateService.inputParams?.action.description,
      status: this.statusMessage || status,
      preValidation: this.preValidation,
      postValidation: this.postValidation,
      workflowId: this.stateService.inputParams.action.workflowId,
      workflow: this.stateService.inputParams.action.workflow
    };

    const subscription = this.coreService.notifyChangeSummary(data).subscribe({
      next: (isSent) => {
        if (isSent) {
          this.messageService.add({
            severity: 'success',
            summary: 'Email Sent!',
            detail: 'Change Execution summary is sent via Email'
          });
        }
      },
      error: (error) => console.error(error)
    });
    this.subscriptions.push(subscription);
  }

  ngOnDestroy() {
    this.subscriptions.forEach((subscription) => {
      if (subscription) {
        subscription.unsubscribe();
      }
    });
  }
}
