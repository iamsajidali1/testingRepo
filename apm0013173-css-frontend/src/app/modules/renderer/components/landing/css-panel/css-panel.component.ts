import {
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges
} from '@angular/core';
import { IdNameModel } from '../../../models/utils.model';
import {
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators
} from '@angular/forms';
import { finalize, Subscription } from 'rxjs';
import { DeviceModel } from '../../../models/device.model';
import { ActionModel } from '../../../models/action.model';
import { AddressModel, GeoAddressModel } from '../../../models/address.model';
import { LandingService } from '../../../services/landing.service';
import { StateService } from '../../../services/state.service';
import { WorkflowDriversModel } from '../../../models/state.model';
import { ProcessDialogComponent } from '../../../dialogs/process-dialog/process-dialog.component';
import { InitService } from '../../../../../services/init.service';
import { UserModel } from '../../../../../models/user.model';
import { StepperService } from '../../../services/stepper.service';
import { DialogService } from 'primeng/dynamicdialog';
import { Router } from '@angular/router';

@Component({
  selector: 'app-css-panel',
  templateUrl: './css-panel.component.html',
  styleUrls: ['./css-panel.component.scss']
})
export class CssPanelComponent implements OnInit, OnChanges, OnDestroy {
  @Input() customer: IdNameModel | undefined;
  component: string = 'landing';
  userDetails: UserModel;
  isBcUser: boolean;
  activeState: boolean[] = [true, false, false];
  isLoading: boolean = false;
  loaders: any = {};
  errors: any = {};
  devices: DeviceModel[] = [];
  services: IdNameModel[] = [];
  actionTypes: string[] = [];
  actions: ActionModel[] = [];
  filteredDevices: DeviceModel[] = [];
  filteredActions: ActionModel[] = [];
  shouldLoadMap: boolean = false;
  deviceGeoAddress: GeoAddressModel | undefined;
  firstFormGroup: UntypedFormGroup;
  secondFormGroup: UntypedFormGroup;
  subscriptions: Subscription[] = [];
  constructor(
    private router: Router,
    private formBuilder: UntypedFormBuilder,
    private landingService: LandingService,
    private stateService: StateService,
    private initService: InitService,
    private stepperService: StepperService,
    private dialogService: DialogService
  ) {
    this.userDetails = initService.userDetails;
    this.isBcUser = this.stateService.isBcUser;
    this.stateService.resetState();
    this.firstFormGroup = this.formBuilder.group({
      service: [null, Validators.required]
    });
    this.secondFormGroup = this.formBuilder.group({
      device: [null, Validators.required],
      actionType: [null],
      action: [null, Validators.required]
    });
  }

  ngOnInit(): void {
    this.firstFormGroup.statusChanges.subscribe((status) => {
      // If First Step is Valid or Invalid
      this.activeState =
        status === 'VALID' ? [false, true, false] : [true, false, false];
    });
    this.secondFormGroup.statusChanges.subscribe((status) => {
      // If Second Step is Valid or Invalid
      this.activeState =
        status === 'VALID' ? [false, false, true] : [false, true, false];
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['customer']?.currentValue) {
      this.customer = changes['customer'].currentValue;
      this.onCustomerPicked();
    }
  }

  getServices(customerId?: number, userId?: string) {
    this.loaders.services = true;
    const subscription = this.landingService
      .getServicesForCustomer(customerId, userId)
      .pipe(finalize(() => (this.loaders.services = false)))
      .subscribe({
        next: (services: any) => (this.services = services),
        error: (error) => console.error(error)
      });
    this.subscriptions.push(subscription);
  }

  getDevices(customerId?: number) {
    this.loaders.devices = true;
    const subscription = this.landingService
      .getDevices(customerId)
      .pipe(finalize(() => (this.loaders.devices = false)))
      .subscribe({
        next: (devices: any) => {
          this.devices = devices;
          this.filterDevices();
        },
        error: (error) => console.error(error)
      });
    this.subscriptions.push(subscription);
  }

  getActions(serviceId?: number, customerId?: number, userId?: string) {
    this.loaders.actions = true;
    const subscription = this.landingService
      .getActions(serviceId, customerId, userId)
      .pipe(finalize(() => (this.loaders.actions = false)))
      .subscribe({
        next: (actions: ActionModel[]) => {
          this.filteredActions = this.actions = actions;
          // If service is preselected then filter devices accordingly
          if ('service' in this.firstFormGroup.value) {
            this.filteredActions = this.actions.filter((action) =>
              action.services.includes(this.firstFormGroup.value.service.name)
            );
          }
          // Filter the Distinct WorkFlows
          this.actionTypes = [
            ...new Set(this.actions.map((action) => action.workflow))
          ];
        },
        error: (error) => console.error(error)
      });
    this.subscriptions.push(subscription);
  }

  filterDevices() {
    this.filteredDevices = this.devices;
    // If service is preselected then filter devices accordingly
    if (
      'service' in this.firstFormGroup.value &&
      this.firstFormGroup.value.service
    ) {
      this.filteredDevices = this.filteredDevices.filter(
        (device) =>
          device.SERVICE_NAME === this.firstFormGroup.value.service.name ||
          device.SERVICE === this.firstFormGroup.value.service.name
      );
    }
    // If action is preselected then filter devices accordingly
    if (
      'action' in this.secondFormGroup.value &&
      this.secondFormGroup.value.action
    ) {
      this.filteredDevices = this.filteredDevices.filter(
        (device) =>
          device.VENDOR === this.secondFormGroup.value.action.vendorType
      );
    }
  }

  filterActions() {
    this.filteredActions = this.actions;
    if (
      'actionType' in this.secondFormGroup.value &&
      this.secondFormGroup.value.actionType
    ) {
      this.filteredActions = this.filteredActions.filter(
        (action) => action.workflow === this.secondFormGroup.value.actionType
      );
    }
    if (
      'device' in this.secondFormGroup.value &&
      this.secondFormGroup.value.device
    ) {
      this.filteredActions = this.filteredActions.filter((action) => {
        return (
          !action.isStaticHost ||
          (action.isStaticHost == true &&
            JSON.parse(action.staticHostname).HOSTNAME ===
              this.secondFormGroup.value.device.HOSTNAME)
        );
      });
    }
  }

  onResetForm() {
    this.firstFormGroup.reset();
    this.secondFormGroup.reset();
    // If Device selection is disabled make it enabled
    this.secondFormGroup.get('device')?.enable();
    // Reset the Structure of the Accordion
    this.activeState = [true, false, false];
    this.shouldLoadMap = false;
  }

  onCustomerPicked() {
    this.onResetForm();
    this.isBcUser
      ? this.getServices()
      : this.getServices(this.customer.id, this.initService.userId);
  }

  onServicePicked(service: IdNameModel) {
    if (!this.customer?.id) {
      return;
    }
    if (this.isBcUser) {
      this.getDevices();
      this.getActions(service.id);
    } else {
      this.getDevices(this.customer.id);
      this.getActions(service.id, this.customer.id, this.initService.userId);
    }
  }

  onActionTypePicked() {
    // Filter actions based on the selected type
    this.filterActions();
    // Action Type is Changed, Reset the Action and Remove Device Disable Lock if any
    this.secondFormGroup.patchValue({ action: null });
    this.secondFormGroup.get('device')?.enable();
  }

  onActionPicked(action: ActionModel) {
    // Don't forget to filter the devices again based on users action selection
    this.filterDevices();
    // Override Values of Device if the Static Host is True
    if (action.isStaticHost && action.staticHostname) {
      // Get the static hostname
      const staticHost = JSON.parse(action.staticHostname);
      const device = this.devices.find(
        (dev) => dev.HOSTNAME === staticHost.HOSTNAME
      );
      // TODO: Error handling if the device is not in DB
      this.secondFormGroup.patchValue({ device });
      // And Now Disable the dropdown so that users can't Change
      this.secondFormGroup.get('device')?.disable();
      // Device is picked by system show the map
      this.onDevicePicked(device);
    } else {
      // this means hostname has to be untouched. keep as user selects
      this.secondFormGroup.get('device')?.enable();
    }
    // For some workflows such as MDS, device is not mandatory
    // VCO edge provisioning (7), Bulk VCO edge provisioning (8)
    // MDS Config (9), Bulk VCO users provisioning (10), Generate device report (11), Generate Bvoip report( 18)
    if ([7, 8, 9, 10, 11, 17, 18].includes(action.workflowId)) {
      this.secondFormGroup.get('device')?.disable();
      this.secondFormGroup.get('device')?.clearValidators();
      this.secondFormGroup.get('device')?.updateValueAndValidity();
    } else {
      this.secondFormGroup.get('device')?.setValidators([Validators.required]);
      this.secondFormGroup.get('device')?.updateValueAndValidity();
    }
    // Override the Action Type
    this.secondFormGroup.patchValue({ actionType: action.workflow });
    // Filter out the Actions only for that Action Type
    this.filteredActions = this.filteredActions.filter(
      (act) => act.workflow === action.workflow
    );
  }

  onDevicePicked(device: DeviceModel) {
    this.filterActions();
    this.shouldLoadMap = true;
    const address: AddressModel = {
      city: device['CITY'],
      country: device['COUNTRY'],
      state: device['STATE'],
      street: device['ADDRESS'],
      zip: device['ZIP']
    };
    // Get Geo Location for that Address
    this.subscriptions[4] = this.landingService
      .getDeviceGeoLoc(address)
      .subscribe((res: any) => {
        // Got Geo Location; Format the data from the response
        // TODO: Do Error Handling Here
        const resource = res.resourceSets[0].resources[0];
        this.deviceGeoAddress = {
          title: device.HOSTNAME,
          address: resource.address.formattedAddress,
          country: resource.address.countryRegion,
          latitude: resource.point.coordinates[0],
          longitude: resource.point.coordinates[1]
        };
      });
  }

  onContinue() {
    // Get the Form Values
    if (!(this.firstFormGroup.valid && this.secondFormGroup.valid)) {
      return;
    }
    // Set the respective values to State Service
    this.stateService.inputParams = {
      customer: this.customer,
      service: this.firstFormGroup.value.service,
      device: this.secondFormGroup.getRawValue().device,
      actionType: this.secondFormGroup.value.actionType,
      action: this.secondFormGroup.value.action
    };
    this.isLoading = true;
    // Load the step configuration
    const subscription = this.stepperService
      .loadSteps(this.stateService.inputParams.action.workflowId)
      .subscribe({
        next: (result: any) => {
          this.stateService.workflowSteps = result.steps;
          this.stateService.workflowDrivers = result.drivers;
          const driver: WorkflowDriversModel =
            this.stateService.getWorkflowDriver(this.component);
          const dialogRef = this.dialogService.open(ProcessDialogComponent, {
            showHeader: false,
            width: '720px',
            data: driver.processes
          });
          dialogRef.onClose.subscribe((canGoAhead: boolean) => {
            this.isLoading = false;
            if (canGoAhead) {
              this.router.navigate(['config', driver.next]);
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
