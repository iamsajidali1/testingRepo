import {
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges
} from '@angular/core';
import { IdNameModel } from '../../../models/utils.model';
import { LandingService } from '../../../services/landing.service';
import { finalize, map, Subscription } from 'rxjs';
import { ActionModel } from '../../../models/action.model';
import { InitService } from '../../../../../services/init.service';
import { StateService } from '../../../services/state.service';
import { StepperService } from '../../../services/stepper.service';
import { WorkflowDriversModel } from '../../../models/state.model';
import { ProcessDialogComponent } from '../../../dialogs/process-dialog/process-dialog.component';
import { DialogService } from 'primeng/dynamicdialog';
import { Router } from '@angular/router';

const REPORT_WORKFLOW_ID = 11;
const REPORT_SERVICE_ID = 3; // Service is SDWAN OTT for now
const REPORT_SERVICE_TYPE = 'SDWAN-OTT';
const DASHBOARD_WORKFLOW_ID = 14;
const NETWORK_STATISTICS_ID = 16;
const BVOIP_REPORTS_ID = 18;

@Component({
  selector: 'app-report-panel',
  templateUrl: './report-panel.component.html',
  styleUrls: ['./report-panel.component.scss']
})
export class ReportPanelComponent implements OnInit, OnDestroy, OnChanges {
  @Input() customer: IdNameModel | undefined;
  isLoading: boolean;
  hasLoadError: boolean;
  reportsLoading: boolean;
  reports: any[];
  selectedReportId: number;
  actions: ActionModel[] = [];
  subscriptions: Subscription[] = [];

  constructor(
    private initService: InitService,
    private landingService: LandingService,
    private stateService: StateService,
    private stepperService: StepperService,
    private router: Router,
    private dialogService: DialogService
  ) {}

  ngOnInit(): void {
    this.isLoading = false;
    this.reportsLoading = false;
    this.hasLoadError = false;
    this.loadReports();
  }

  /**
   * Responds to Angular component input property changes.
   * Specifically, it checks for changes to the `customer` input property.
   * If there is a change in the `customer` property, and it's not the first change,
   * it triggers the loading of reports by calling `loadReports()`.
   * This ensures that the component's data is refreshed when the customer changes.
   *
   * @param {SimpleChanges} changes - The object that holds the current and previous value of each changed property.
   */
  ngOnChanges(changes: SimpleChanges) {
    if (changes && 'customer' in changes) {
      const customerChanges = changes['customer'];
      // If the change is not the first change, load the reports again
      if (!customerChanges.firstChange) {
        this.loadReports();
      }
    }
  }

  /**
   * This method is used to load reports from the landing service.
   * It sets the loading state, makes a request to the landing service to get actions,
   * filters out the actions for the reports, and maps the actions to the reports.
   */
  loadReports() {
    // Set the loading state to true
    this.reportsLoading = true;
    // Create the params object for the getActions method
    const params: any[] = [REPORT_SERVICE_ID];
    // If not BC user add customer and AttUid
    if (!this.stateService.isBcUser) {
      params.push(this.customer.id, this.initService.userId);
    }
    // Create a subscription to the getActions method of the landingService
    const subscription = this.landingService
      .getActions(...params)
      // Stop the loading spinner when the request is complete
      .pipe(finalize(() => (this.reportsLoading = false)))
      // Filter out the actions for the reports (Generate Device Report & Data Metrics)
      .pipe(
        map((actions: ActionModel[]) =>
          actions.filter(
            (action) =>
              [REPORT_WORKFLOW_ID, DASHBOARD_WORKFLOW_ID, NETWORK_STATISTICS_ID, BVOIP_REPORTS_ID].indexOf(
                action.workflowId
              ) !== -1
          )
        )
      )
      .subscribe({
        next: (actions: ActionModel[]) => {
          // Set the reportActions array to the received actions
          this.actions = actions;
          // Map the actions to the reports array
          const reportCards: any[] = actions.map((action) => ({
            id: action.id,
            name: action.name,
            description: action.description,
            workflowId: action.workflowId,
            workflow: action.workflow,
            services: action.services,
            vendor: action.vendorType,
            colors: {
              service: '#e9e787',
              vendor: '#f4caca'
            }
          }));
          this.reports = [
            ...reportCards.filter(
              (report) => report.workflowId === BVOIP_REPORTS_ID
            ),
            ...reportCards.filter(
              (report) => report.workflowId === NETWORK_STATISTICS_ID
            ),
            ...reportCards.filter(
              (report) => report.workflowId === DASHBOARD_WORKFLOW_ID
            ),
            ...reportCards.filter(
              (report) => report.workflowId === REPORT_WORKFLOW_ID
            )
          ];
        },
        // Log any errors that occur during the request
        error: (error) => console.error(error)
      });

    // Add the subscription to the subscriptions array for later cleanup
    this.subscriptions.push(subscription);
  }
  /**
   * This method is used to generate a report based on the provided action ID.
   * It sets the loading state, finds the corresponding action, and initiates the report generation process.
   *
   * @param {number} actionId - The ID of the action for which the report is to be generated.
   */
  generateReport(actionId: number) {
    // Set the loading state to true
    this.isLoading = true;

    // Set the selected report ID
    this.selectedReportId = actionId;

    // Find the action that was clicked by filtering the reportActions array
    const action = this.actions.find((action) => action.id === actionId);

    // Subscribe to the loadSteps method of the stepperService
    const subscription = this.stepperService
      .loadSteps(action.workflowId)
      .subscribe({
        next: (stepResult) => {
          // Set the input parameters for the stateService
          this.stateService.inputParams = {
            customer: this.customer,
            service: { id: REPORT_SERVICE_ID, name: REPORT_SERVICE_TYPE },
            device: null,
            actionType: action.workflow,
            action: action
          };

          // Set the workflow steps for the stateService
          this.stateService.workflowSteps = stepResult.steps;

          // Set the workflow drivers for the stateService
          this.stateService.workflowDrivers = stepResult.drivers;

          // Get the workflow driver for 'landing'
          const driver: WorkflowDriversModel =
            this.stateService.getWorkflowDriver('landing');

          // Open the ProcessDialogComponent with the driver's processes as data
          const dialogRef = this.dialogService.open(ProcessDialogComponent, {
            showHeader: false,
            width: '720px',
            data: driver.processes
          });

          // Subscribe to the onClose event of the dialog
          dialogRef.onClose.subscribe((canGoAhead: boolean) => {
            // Set the loading state to false
            this.isLoading = false;

            // If the dialog was closed with a positive result, navigate to the next route
            if (canGoAhead) {
              this.router.navigate(['config', driver.next]).then();
            }
          });
        }
      });

    // Add the subscription to the subscriptions array for later cleanup
    this.subscriptions.push(subscription);
  }

  ngOnDestroy() {
    this.subscriptions.forEach((subscription) => {
      if (subscription) {
        subscription.unsubscribe();
      }
    });
  }

  protected readonly REPORT_WORKFLOW_ID = REPORT_WORKFLOW_ID;
  protected readonly METRICS_WORKFLOW_ID = DASHBOARD_WORKFLOW_ID;
  protected readonly NETWORK_STATISTICS_ID = NETWORK_STATISTICS_ID;
  protected readonly BVOIP_REPORTS_ID = BVOIP_REPORTS_ID;
}
