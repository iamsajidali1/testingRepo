import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { IdNameModel } from '../../../models/utils.model';
import { SiteModel } from '../../../models/site.model';
import { CoreService } from '../../../services/core.service';
import { finalize, forkJoin, Observable, of, Subscription } from 'rxjs';
import { StateService } from '../../../services/state.service';
import { StepperService } from '../../../services/stepper.service';
import { DialogService } from 'primeng/dynamicdialog';
import { WorkflowDriversModel } from '../../../models/state.model';
import { ProcessDialogComponent } from '../../../dialogs/process-dialog/process-dialog.component';
import { Router } from '@angular/router';
import { GeoAddressModel } from '../../../models/address.model';
import { UtilService } from '../../../services/util.service';

const TDC_WORKFLOW_ID = 2;
const TDC_WORKFLOW_TYPE = 'Data collection';

@Component({
  selector: 'app-tdc-panel',
  templateUrl: './tdc-panel.component.html',
  styleUrls: ['./tdc-panel.component.scss']
})
export class TdcPanelComponent implements OnInit, OnDestroy {
  @Input() customer: IdNameModel | undefined;
  siteLoading: boolean;
  isLoading: boolean;
  isLoadError: boolean;
  rangeColor: string;
  searchString: string;
  appliedGlobalStatusFilter: string;
  currentGlobalStatusFilter: string;
  geoLoc: GeoAddressModel;
  pushpins: GeoAddressModel[];
  dashboardValues: any;
  bodyStyles: CSSStyleDeclaration;
  sites: SiteModel[] = [];
  filteredSites: SiteModel[] = [];
  selectedSite: SiteModel;
  subscriptions: Subscription[] = [];
  constructor(
    private router: Router,
    private coreService: CoreService,
    private stateService: StateService,
    private stepperService: StepperService,
    private utilService: UtilService,
    private dialogService: DialogService
  ) {
    this.bodyStyles = window.getComputedStyle(document.body);
    this.rangeColor = this.bodyStyles.getPropertyValue('--border-color');
    this.resetDashboard();
  }

  get dashboardStatuses() {
    return Object.keys(this.dashboardValues);
  }

  ngOnInit(): void {
    this.getTdcSites();
  }

  resetDashboard() {
    this.dashboardValues = {
      completed: {
        name: 'Completed',
        count: 0,
        percentage: 0,
        color: this.bodyStyles.getPropertyValue('--green-500')
      },
      inProgress: {
        name: 'In Progress',
        count: 0,
        percentage: 0,
        color: this.bodyStyles.getPropertyValue('--blue-500')
      },
      notStarted: {
        name: 'Not Started',
        count: 0,
        percentage: 0,
        color: this.bodyStyles.getPropertyValue('--yellow-500')
      }
    };
  }

  getTdcSites(): void {
    // Preset some Init Vars
    this.siteLoading = true;
    this.isLoadError = false;
    this.geoLoc = null;
    this.selectedSite = null;
    this.resetDashboard();
    const tdcSitesObservable: Observable<SiteModel[]> = this.stateService
      .isBcUser
      ? this.coreService.loadTdcSitesForBcUser()
      : this.coreService.loadTdcSites(this.customer.id);
    const subscription = tdcSitesObservable
      .pipe(finalize(() => (this.siteLoading = false)))
      .subscribe({
        next: (sites) => {
          this.sites = sites;
          this.filteredSites = [...sites];
          // Loop through Sites and Set Knobs
          const total = this.sites.length;
          sites.forEach((site) => {
            if (site.STATUS === 'Completed')
              this.dashboardValues.completed.count += 1;
            else if (site.STATUS === 'In Progress')
              this.dashboardValues.inProgress.count += 1;
            else this.dashboardValues.notStarted.count += 1;
          });
          // Calculate percentage
          this.dashboardValues.completed.percentage = (
            (this.dashboardValues.completed.count / total) *
            100
          ).toFixed(0);
          this.dashboardValues.inProgress.percentage = (
            (this.dashboardValues.inProgress.count / total) *
            100
          ).toFixed(0);
          this.dashboardValues.notStarted.percentage = (
            (this.dashboardValues.notStarted.count / total) *
            100
          ).toFixed(0);
          this.updatePushpins();
        },
        error: (err) => {
          console.error(err);
          this.isLoadError = true;
          this.filteredSites = this.sites = [];
          this.pushpins = [];
        }
      });
    this.subscriptions.push(subscription);
  }

  getSeverity(status: string) {
    switch (status) {
      case 'Not Started':
        return 'warning';
      case 'Completed':
        return 'success';
      case 'In Progress':
        return 'info';
      default:
        return 'warning';
    }
  }

  filterSites() {
    if (this.appliedGlobalStatusFilter === this.currentGlobalStatusFilter) {
      this.filteredSites = [...this.sites];
      this.appliedGlobalStatusFilter = this.currentGlobalStatusFilter = null;
    } else {
      this.filteredSites = this.sites.filter(
        (site) =>
          site.STATUS ===
          this.dashboardValues[this.currentGlobalStatusFilter].name
      );
      this.appliedGlobalStatusFilter = this.currentGlobalStatusFilter;
      // Reset The selected Device if not exists
      if (this.selectedSite) {
        this.selectedSite = this.filteredSites.find(
          (site) => site.ID === this.selectedSite.ID
        );
        this.geoLoc = this.selectedSite ? this.geoLoc : null;
      }
    }
    this.updatePushpins();
  }

  getGeoAddressObjBySite = (site: SiteModel) => {
    const { ADDRESS } = site;
    return {
      latitude: ADDRESS.LATITUDE,
      longitude: ADDRESS.LONGITUDE,
      title: site.DEVICE,
      address: [ADDRESS.STREET, ADDRESS.CITY, ADDRESS.STATE, ADDRESS.ZIP].join(
        ', '
      ),
      country: ADDRESS.COUNTRY
    };
  };

  updatePushpins() {
    this.pushpins = this.filteredSites
      .map(this.getGeoAddressObjBySite)
      .filter((geoAddress) =>
        this.utilService.isValidGeolocation(
          geoAddress.latitude,
          geoAddress.longitude
        )
      );
  }

  onRowSelection() {
    // Set the geoLocation for the map, if it's valid
    const {
      ADDRESS: { LATITUDE, LONGITUDE }
    } = this.selectedSite;
    if (this.utilService.isValidGeolocation(LATITUDE, LONGITUDE)) {
      this.geoLoc = this.getGeoAddressObjBySite(this.selectedSite);
    } else {
      console.log(
        `Invalid Geolocation (${LATITUDE}, ${LONGITUDE}), cannot be triangulated in Map`
      );
      this.geoLoc = null;
    }
  }

  onContinue() {
    if (!this.selectedSite) return;
    this.isLoading = true;
    const subscription = forkJoin([
      this.coreService.loadActionTemplateById(this.selectedSite.TEMPLATE_ID),
      this.coreService.loadActionAssignedServices(
        this.selectedSite.TEMPLATE_ID,
        'customer'
      ),
      this.coreService.loadActionAssignedServices(
        this.selectedSite.TEMPLATE_ID,
        'service'
      ),
      this.stepperService.loadSteps(TDC_WORKFLOW_ID),
      this.selectedSite.STATUS !== 'Not Started'
        ? this.coreService.loadDataCollectionByTdcId(this.selectedSite.ID)
        : of({}) // Load the collected Data if the Status is other that "Not Started"
    ]).subscribe({
      next: ([
        action,
        servicesCustomer,
        servicesService,
        stepResult,
        previousData
      ]) => {
        // Set the respective values to State Service Very Specific to TDC
        this.stateService.inputParams = {
          customer: this.customer,
          //TO-DO: we need to find a way to determine if it is service specific template or customer-service template... this is just workaround not efficient solution
          service:
            servicesCustomer.length !== 0
              ? servicesCustomer.shift()
              : servicesService.shift(),
          device: null,
          actionType: TDC_WORKFLOW_TYPE,
          action: {
            ...action,
            carcheTemplate: action?.carcheTemplate
              ? JSON.parse(action.carcheTemplate)
              : null,
            workflow: TDC_WORKFLOW_TYPE,
            workflowId: TDC_WORKFLOW_ID
          }
        };
        this.stateService.workflowSteps = stepResult.steps;
        this.stateService.workflowDrivers = stepResult.drivers;
        const driver: WorkflowDriversModel =
          this.stateService.getWorkflowDriver('landing');
        // Set the previous data collection if the status is anything other than In Progress
        if (
          this.selectedSite.STATUS !== 'Not Started' &&
          'COLLECTED_DATA' in previousData
        ) {
          this.stateService.setWorkflowData(
            'data-collection',
            previousData['COLLECTED_DATA']
          );
        }
        // Set Options for Data Collection Such as:
        // Set READ ONLY true is this.selectedSite.SNOW_STATUS != 'enable'
        if (this.selectedSite.SNOW_STATUS != 'enable') {
          this.stateService.setWorkflowOptions('data-collection', {
            readOnly: true
          });
          // And Also we don't need to create any transaction here...
          driver.processes = driver.processes.filter(
            (process) => process.action != 'createTransaction'
          );
        }
        const dialogRef = this.dialogService.open(ProcessDialogComponent, {
          showHeader: false,
          width: '720px',
          data: driver.processes
        });
        dialogRef.onClose.subscribe((canGoAhead: boolean) => {
          this.isLoading = false;
          if (canGoAhead) {
            // Set the Host Now to Avoid check in MCAP
            this.stateService.inputParams.device = {
              ID: this.selectedSite.ID,
              HOSTNAME: this.selectedSite.DEVICE,
              VENDOR: 'N/A',
              SERVICE: 'N/A',
              SERVICE_NAME: 'N/A',
              ADDRESS: this.selectedSite.ADDRESS.STREET,
              CITY: this.selectedSite.ADDRESS.CITY,
              STATE: this.selectedSite.ADDRESS.STATE,
              ZIP: this.selectedSite.ADDRESS.ZIP,
              COUNTRY: this.selectedSite.ADDRESS.COUNTRY
            };
            this.router.navigate(['config', driver.next]).then();
          }
        });
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
      }
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
