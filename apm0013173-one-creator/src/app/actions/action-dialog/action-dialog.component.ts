import {Component, OnDestroy, OnInit} from '@angular/core';
import {FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';
import {Subscription} from 'rxjs';
import {DynamicDialogRef} from 'primeng/dynamicdialog';
import {finalize, map} from 'rxjs/operators';
import {ActionService} from '../action.service';
import {ControllerService} from '../../services/controller.service';
import {ApiConnectService} from '../../template-manager/api-connect.service';

const CONFIG_TEMPLATE_ATTRIBUTE_ID = 4;
const ROLLBACK_TIMER_ATTRIBUTE_ID = 6;
const HOSTNAME_VISIBILITY_ATTRIBUTE_ID = 3;
const REPORT_PATH_ATTRIBUTE_ID = 5

@Component({
  selector: 'app-action-dialog',
  templateUrl: './action-dialog.component.html',
  styleUrls: ['./action-dialog.component.css']
})
export class ActionDialogComponent implements OnInit, OnDestroy {
  isSaving: boolean;
  shouldHostnameBeRequired: boolean;
  shouldConfigTemplateBeRequired: boolean;
  shouldRollbackTimerBeRequired: boolean;
  shouldReportPathBeRequired: boolean;
  loaders: any = {};
  errors: any = {};
  customers: any[] = [];
  services: any[] = [];
  actionTypes: any[] = [];
  filteredActionTypes: any[] = [];
  actionAttributes: any[] = [];
  vendors: any[] = [];
  hostnames: any[] = [];
  filteredHostnames: any[];
  carcheTemplates: any[] = [];
  filteredCarcheTemplates: any[] = []
  formGroup: FormGroup;
  subscriptions: Subscription[] = [];
  constructor(private controllerSvc: ControllerService,
              private actionSvc: ActionService,
              private carcheSvc: ApiConnectService,
              private formBuilder: FormBuilder,
              public dialogRef: DynamicDialogRef) {
    this.formGroup = this.formBuilder.group({
      name: [null, Validators.required],
      description: [null, Validators.required],
      enabled: [false, Validators.required],
      services: [[], Validators.required],
      customer: [null],
      actionType: [null, Validators.required],
      vendor: [null, Validators.required]
    });
  }

  ngOnInit(): void {
    // Init Load Dropdown Attributes
    this.loadServices();
    this.loadCustomers();
    this.loadActionTypes();
    this.loadVendors();
  }

  /**
   * Getters for Conditional and Dependant FormControls
   */
  get carcheTemplateControl(): FormControl {
    return this.formGroup.controls['carcheTemplate'] as FormControl
  }
  get reportPathControl(): FormControl {
    return this.formGroup.controls['reportPath'] as FormControl
  }

  /**
   * getter to tell whether hostname should be rendered
   */
  get shouldRenderHostname() {
    // If there is a selected Customer and Attribute has a hostname option
    const hostAttribute = this.actionAttributes.find(att => att.id === HOSTNAME_VISIBILITY_ATTRIBUTE_ID);
    if(hostAttribute?.status === 'required') {
      this.shouldHostnameBeRequired = true;
      this.formGroup.addControl('hostname', new FormControl(null, Validators.required))
      return true;
    } else if(hostAttribute?.status === 'optional') {
      this.shouldHostnameBeRequired = false;
      this.formGroup.addControl('hostname', new FormControl(null));
      return true;
    }
    // Default case in case of hide or not found
    if(this.formGroup.get('hostname')){
      this.formGroup.removeControl('hostname');
    }
    this.shouldHostnameBeRequired = false;
    return false;
  }

  /**
   * getter to tell whether config template control to be rendered
   */
  get shouldRenderConfigTemplate() {
    const configAttribute = this.actionAttributes.find(att => att.id === CONFIG_TEMPLATE_ATTRIBUTE_ID);
    if(configAttribute?.status === 'required') {
      this.shouldConfigTemplateBeRequired = true;
      this.formGroup.addControl('carcheTemplate', new FormControl(null, Validators.required))
      return true;
    } else if(configAttribute?.status === 'optional') {
      this.shouldConfigTemplateBeRequired = false;
      this.formGroup.addControl('carcheTemplate', new FormControl(null));
      return true;
    }
    // Default case in case of hide or not found
    if(this.formGroup.get('carcheTemplate')){
      this.formGroup.removeControl('carcheTemplate');
    }
    this.shouldConfigTemplateBeRequired = false;
    return false;
  }

  /**
   * getter to find out whether rollback timer is needed
   */
  get shouldRenderRollbackTimer() {
    const rbAttribute = this.actionAttributes.find(att => att.id === ROLLBACK_TIMER_ATTRIBUTE_ID);
    if(rbAttribute?.status === 'required') {
      // Add the controls for rollback timer REQUIRED
      this.shouldRollbackTimerBeRequired = true;
      this.formGroup.addControl('minRollbackTimer', new FormControl(10, Validators.required));
      this.formGroup.addControl('maxRollbackTimer', new FormControl(120, Validators.required));
      return true;
    } else if(rbAttribute?.status === 'optional') {
      // Add the controls for rollback timer OPTIONAL
      this.shouldRollbackTimerBeRequired = false;
      this.formGroup.addControl('minRollbackTimer', new FormControl(10));
      this.formGroup.addControl('maxRollbackTimer', new FormControl(120));
      this.shouldRollbackTimerBeRequired = false;
      return true;
    }
    // Default case in case of hide or not found
    if(this.formGroup.get('minRollbackTimer')){
      this.formGroup.removeControl('minRollbackTimer');
    }
    if(this.formGroup.get('maxRollbackTimer')){
      this.formGroup.removeControl('maxRollbackTimer');
    }
    return false;
  }

  /**
   * getter to find out whether Report Path is to be rendered
   */
  get shouldRenderReportPath() {
    const reportAttribute = this.actionAttributes.find(att => att.id === REPORT_PATH_ATTRIBUTE_ID);
    if(reportAttribute?.status === 'required') {
      this.shouldReportPathBeRequired = true;
      this.formGroup.addControl(
        'reportPath',
        new FormControl(null, Validators.required)
      )
      return true;
    } else if(reportAttribute?.status === 'optional') {
      this.shouldReportPathBeRequired = false;
      this.formGroup.addControl(
        'reportPath',
        new FormControl(null)
      )
      return true;
    }
    this.shouldReportPathBeRequired = false;
    if(this.formGroup.get('reportPath')){
      this.formGroup.removeControl('reportPath');
    }
    return false;
  }

  loadServices() {
    let serviceObservable = this.controllerSvc
      .getAvailableServices()
      .pipe(map((response: any) => response.result));
    const customer = this.formGroup.get('customer').value;
    if(customer) {
      serviceObservable = this.controllerSvc
        .getServicesByCustomerId(customer.id)
        .pipe(map((response: any) => response.services))
    }
    this.loaders['services'] = true;
    this.errors['services'] = null;
    const subscription = serviceObservable
      .pipe(finalize( () => this.loaders['services'] = false))
      .subscribe(services => {
        this.services = services;
      }, error => {
        this.errors['services'] = { status: error?.status || 500, message: 'Unable to load Services.'};
      });
    this.subscriptions.push(subscription);
  }

  loadCustomers() {
    // Check if cached
    const cachedCustomers = this.actionSvc.getCache('customers');
    if(cachedCustomers) {
      this.customers = cachedCustomers;
      return;
    }
    this.loaders['customers'] = true;
    this.errors['customers'] = null;
    const subscription = this.controllerSvc
      .getCustomersByStatus(true)
      .pipe(finalize( () => this.loaders['customers'] = false))
      .pipe(map((response: any) => response.result))
      .subscribe(customers => {
        this.actionSvc.setCache('customers', customers);
        this.customers = customers;
      }, error => {
        this.errors['customers'] = { status: error?.status || 500, message: 'Unable to load Customers.'};
      });
    this.subscriptions.push(subscription);
  }

  loadActionTypes() {
    const cachedActionTypes = this.actionSvc.getCache('actionTypes');
    if(cachedActionTypes) {
      this.actionTypes = cachedActionTypes;
      this.filterActionTypes();
      return;
    }
    this.loaders['actionTypes'] = true;
    this.errors['actionTypes'] = null;
    const subscription = this.controllerSvc
      .loadAllActionTypes()
      .pipe(map((data: any) => data.result))
      .pipe(finalize( () => this.loaders['actionTypes'] = false))
      .subscribe(actionTypes => {
        this.actionSvc.setCache('actionTypes', actionTypes);
        this.actionTypes = actionTypes;
        this.filterActionTypes();
      }, error => {
        this.errors['actionTypes'] = { status: error?.status || 500, message: 'Unable to load ActionTypes.'};
      });
    this.subscriptions.push(subscription);
  }

  loadVendors() {
    const cachedVendors = this.actionSvc.getCache(`vendors`);
    if(cachedVendors) {
      this.vendors = cachedVendors;
      return;
    }
    this.loaders['vendors'] = true;
    this.errors['vendors'] = null;
    const subscription = this.carcheSvc
      .getTemplateVendorTypes()
      .pipe(finalize( () => this.loaders['vendors'] = false))
      .subscribe(vendors => {
        this.actionSvc.setCache(`vendors`, vendors);
        this.vendors = vendors;
      }, error => {
        this.errors['vendors'] = { status: error?.status || 500, message: 'Unable to load Attributes.'};
      });
    this.subscriptions.push(subscription);
  }

  loadAttributes(workflow) {
    const workflowId = workflow?.ID;
    if(!workflowId) { return; }
    const cachedAttributes = this.actionSvc.getCache(`attributes[${workflowId}]`);
    if(cachedAttributes) {
      this.actionAttributes = cachedAttributes;
      this.applyAttributes();
      return;
    }
    this.loaders['attributes'] = true;
    this.errors['attributes'] = null;
    const subscription = this.controllerSvc
      .getAttributesForWorkflow(workflowId)
      .pipe(finalize( () => this.loaders['attributes'] = false))
      .subscribe(attributes => {
        this.actionSvc.setCache(`attributes[${workflowId}]`, attributes);
        this.actionAttributes = attributes;
        this.applyAttributes();
      }, error => {
        this.errors['attributes'] = { status: error?.status || 500, message: 'Unable to load Attributes.'};
      });
    this.subscriptions.push(subscription);
  }

  loadCarcheTemplates() {
    const cachedTemplates = this.actionSvc.getCache(`carcheTemplates`);
    if(cachedTemplates) {
      this.carcheTemplates = cachedTemplates;
      this.filterCarcheTemplates();
      return;
    }
    this.loaders['carcheTemplates'] = true;
    this.errors['carcheTemplates'] = null;
    const subscription = this.carcheSvc
      .getBasicListOfTemplates()
      .pipe(finalize( () => this.loaders['carcheTemplates'] = false))
      .subscribe(carcheTemplates => {
        this.actionSvc.setCache(`carcheTemplates`, carcheTemplates);
        this.carcheTemplates = carcheTemplates;
        this.filterCarcheTemplates();
      }, error => {
        this.errors['carcheTemplates'] = { status: error?.status || 500, message: 'Unable to load Attributes.'};
      });
    this.subscriptions.push(subscription);
  }

  applyAttributes() {
    // Load Carche templates if needed
    if(this.shouldRenderConfigTemplate) {
      this.loadCarcheTemplates()
    }
  }

  filterActionTypes() {
    const selectedServices = this.formGroup.value.services;
    if(!selectedServices || selectedServices.length === 0) {
      this.filteredActionTypes = [];
      return;
    }
    const actionTypes = [];
    selectedServices.forEach(svc => {
      const workflows = this.actionTypes
        .filter(act => act.service.ID === svc.id)
        .map(data => data.workflow);
      // Push to action types if not exists
      workflows.forEach(workflow => {
        const index = actionTypes.findIndex(flow => flow.ID === workflow.ID);
        if(index === -1) { actionTypes.push(workflow) }
      });
    })
    this.filteredActionTypes = actionTypes;
    // Check if selected action is there in the dropdown, if not set the action type to null
    if(this.formGroup.value.actionType && !actionTypes.map(type => type.ID).includes(this.formGroup.value.actionType.ID)) {
      this.formGroup.patchValue({actionType: null});
      this.formGroup.updateValueAndValidity();
    }
  }

  filterCarcheTemplates() {
    const { customer, vendor, services } = this.formGroup.value;
    this.filteredCarcheTemplates = [];
    // Filter by Service
    services.forEach(service => {
      const templates = this.carcheTemplates
        .filter((tmp) => Number(tmp.services) === service.id);
      this.filteredCarcheTemplates.push(...templates);
    });
    // Filter by Customer
    if(customer?.id) {
      this.filteredCarcheTemplates = this.filteredCarcheTemplates
        .filter((tmp) => Number(tmp.contractid) === customer.id)
    }
    // Filter by Vendor
    // TODO: Validate with Captains
    if(vendor?.id) {
      this.filteredCarcheTemplates = this.filteredCarcheTemplates
        .filter((tmp) => Number(tmp.vendorType) === vendor.id)
    }
    // Check if selected template is there in the dropdown, if not set to null
    if(this.formGroup.value.carcheTemplate
      && !this.filteredCarcheTemplates.map(type => type.id).includes(this.formGroup.value.carcheTemplate.id)) {
      this.formGroup.patchValue({carcheTemplate: null});
      this.formGroup.updateValueAndValidity();
    }
  }

  filterHostnames(event){
    const { query } = event;
    const { id } = this.formGroup.get('customer').value;
    this.filteredHostnames = null;
    // Check if cache is a hit, if yes use it or else call endpoint
    const cachedHostnames = this.actionSvc.getCache(`hostnames[${id}]`);
    if(cachedHostnames) {
      this.filteredHostnames = !query ? [...cachedHostnames] : cachedHostnames.filter(
        host => host.HOSTNAME.toLowerCase().includes(query.toLowerCase())
      );
      return;
    }
    this.errors['hostname'] = null;
    const subscription = this.carcheSvc.getHostnamesByCustomer(id)
      .subscribe((hostnames) => {
        // Set the Cache
        this.actionSvc.setCache(`hostnames[${id}]`, hostnames);
        this.filteredHostnames = !query ? [...hostnames] : hostnames.filter(
          host => host.HOSTNAME.toLowerCase().includes(query.toLowerCase())
        );
      }, error => {
        this.filteredHostnames = [];
        this.errors['hostname'] = { status: error?.status || 500, message: 'Unable to load Hostnames.'};
      });
    this.subscriptions.push(subscription);
  }

  onClose = () => this.dialogRef.close(null);

  onSave() {
    if(!this.formGroup.valid) return;
    const data = this.formGroup.value;
    const action: any = {
      name: data.name,
      questions: null,
      carcheTemplate: data.carcheTemplate ? JSON.stringify(data.carcheTemplate) : null,
      validation: 'sh ip int brief',
      description: data.description,
      enabled: data.enabled,
      serviceId: data.services,
      customerId: data.customer?.id || null,
      workflowId: data.actionType.ID,
      vendorType: data.vendor.vendorType,
      vendorTypeId: data.vendor.id,
      staticHostnameCheckBox: !!data?.hostname,
      staticHostname: (data?.hostname && typeof data.hostname === 'string') ? { HOSTNAME: data.hostname} : data.hostname
    }
    if('reportPath' in data) {
      action['apiEndpoint'] = data.reportPath
    }
    if('minRollbackTimer' in data && 'maxRollbackTimer' in data) {
      action['minRollbackTimer'] = data.minRollbackTimer;
      action['maxRollbackTimer'] = data.maxRollbackTimer;
    }
    this.isSaving = true;
    this.errors['action'] = null;
    const subscription = this.controllerSvc.createActionTemplate(action)
      .pipe(finalize(() => this.isSaving = false))
      .pipe(map(response => response.result))
      .subscribe(results => {
        this.dialogRef.close({...results, belongsTo: action.customerId ? 'customer' : 'service'});
      }, error => {
        this.errors['action'] = { status: error?.status || 500, message: 'Unable to save the action.'};
      });
    this.subscriptions.push(subscription);
  }

  ngOnDestroy() {
    this.subscriptions.forEach(subscription => {
      if(subscription) {
        subscription.unsubscribe();
      }
    })
  }
}
