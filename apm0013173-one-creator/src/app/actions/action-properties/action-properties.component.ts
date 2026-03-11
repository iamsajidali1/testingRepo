import {Component, OnDestroy, OnInit} from '@angular/core';
import {ActionService} from '../action.service';
import {FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';
import {Subscription} from 'rxjs';
import {ControllerService} from '../../services/controller.service';
import {finalize, map} from 'rxjs/operators';
import {ApiConnectService} from '../../template-manager/api-connect.service';
import {MessageService} from 'primeng/api';

const CONFIG_TEMPLATE_ATTRIBUTE_ID = 4;
const ROLLBACK_TIMER_ATTRIBUTE_ID = 6;
const HOSTNAME_VISIBILITY_ATTRIBUTE_ID = 3;
const REPORT_PATH_ATTRIBUTE_ID = 5

@Component({
  selector: 'app-action-properties',
  templateUrl: './action-properties.component.html',
  styleUrls: ['./action-properties.component.css']
})
export class ActionPropertiesComponent implements OnInit, OnDestroy {
  isSaving: boolean;
  isPropsLoaded: boolean;
  shouldConfigTemplateBeRequired: boolean;
  shouldRollbackTimerBeRequired: boolean;
  shouldStaticHostnameBeRequired: boolean;
  shouldReportPathBeRequired: boolean;
  originalFormState: any;
  filteredServices: any[];
  filteredActionTypes: any[];
  filteredVendors: any[];
  filteredHostnames: any[];
  filteredConfigTemplates: any[];
  actionPropFormGroup: FormGroup;
  subscriptions: Subscription[] = [];
  constructor(public actionService: ActionService,
              private controller: ControllerService,
              private apiService: ApiConnectService,
              private formBuilder: FormBuilder,
              private messageService: MessageService) {}

  ngOnInit(): void {
    const subscription = this.actionService.actionLoadCompleteSubject
      .subscribe(isPropsLoaded => {
        this.buildForm();
        this.isPropsLoaded = isPropsLoaded;
      });
    this.subscriptions.push(subscription)
  }

  get hasUnsavedChanges() {
    return JSON.stringify(this.originalFormState) !== JSON.stringify(this.actionPropFormGroup.value);
  }

  get shouldRenderStaticHostname() {
    // Check the Attributes
    const attributes = this.actionService.actionAttributes;
    const hostnameAttribute = attributes ? attributes.find(att => att.id === HOSTNAME_VISIBILITY_ATTRIBUTE_ID) : {};
    // Get the staticHostnameCheckBox Value
    const config = this.actionService.actionTemplate?.staticHostnameCheckBox;
    if(hostnameAttribute?.status === 'required') {
      this.shouldStaticHostnameBeRequired = true;
      this.actionPropFormGroup.addControl('staticHostnameCheckBox', new FormControl(config, Validators.required))
      return true;
    } else if(hostnameAttribute?.status === 'optional') {
      this.shouldStaticHostnameBeRequired = false;
      this.actionPropFormGroup.addControl('staticHostnameCheckBox', new FormControl(config));
      return true;
    }
    if(this.actionPropFormGroup.get('staticHostnameCheckBox')){
      this.actionPropFormGroup.removeControl('staticHostnameCheckBox');
    }
    this.shouldStaticHostnameBeRequired = false;
    return false;
  }

  /**
   * getter for creating the formControl and return true if Hostname to be rendered
   */
  get shouldRenderHostname() {
    const isStaticHost = this.actionPropFormGroup.get('staticHostnameCheckBox').value;
    if(isStaticHost) {
      // Find out the static host
      const hostname = this.actionService.actionTemplate?.staticHostname;
      this.actionPropFormGroup.addControl('hostname', new FormControl(hostname, Validators.required))
    } else if(this.actionPropFormGroup.get('hostname')) {
      this.actionPropFormGroup.removeControl('hostname')
    }
    return isStaticHost;
  }

  /**
   * getter to tell whether config template control to be rendered
   */
  get shouldRenderConfigTemplate() {
    const attributes = this.actionService.actionAttributes;
    const configAttribute = attributes ? attributes.find(att => att.id === CONFIG_TEMPLATE_ATTRIBUTE_ID) : {};
    const carcheTemplate = this.actionService.actionTemplate?.carcheTemplate;
    const config = carcheTemplate ? JSON.parse(carcheTemplate) : null;
    if(configAttribute?.status === 'required') {
      this.shouldConfigTemplateBeRequired = true;
      // Get the Config Template
      this.actionPropFormGroup.addControl('configTemplate', new FormControl(config, Validators.required))
      return true;
    } else if(configAttribute?.status === 'optional') {
      this.shouldConfigTemplateBeRequired = false;
      this.actionPropFormGroup.addControl('configTemplate', new FormControl(config));
      return true;
    }
    // Default case in case of hide or not found
    if(this.actionPropFormGroup.get('configTemplate')){
      this.actionPropFormGroup.removeControl('configTemplate');
    }
    this.shouldConfigTemplateBeRequired = false;
    return false;
  }

  /**
   * getter to find out whether rollback timer is needed
   */
  get shouldRenderRollbackTimer() {
    const attributes = this.actionService.actionAttributes;
    const rbAttribute = attributes ? attributes.find(att => att.id === ROLLBACK_TIMER_ATTRIBUTE_ID) : {};
    if(rbAttribute?.status === 'required') {
      // Add the controls for rollback timer REQUIRED
      this.shouldRollbackTimerBeRequired = true;
      this.actionPropFormGroup.addControl('minRollbackTimer',
        new FormControl(this.actionService.actionTemplate?.minRollbackTimer, Validators.required)
      )
      this.actionPropFormGroup.addControl('maxRollbackTimer',
        new FormControl(this.actionService.actionTemplate?.maxRollbackTimer, Validators.required)
      )
      return true;
    } else if(rbAttribute?.status === 'optional') {
      // Add the controls for rollback timer OPTIONAL
      this.shouldRollbackTimerBeRequired = false;
      this.actionPropFormGroup.addControl('minRollbackTimer', new FormControl(this.actionService.actionTemplate?.minRollbackTimer))
      this.actionPropFormGroup.addControl('maxRollbackTimer', new FormControl(this.actionService.actionTemplate?.maxRollbackTimer))
      this.shouldRollbackTimerBeRequired = false;
      return true;
    }
    // Default case in case of hide or not found
    if(this.actionPropFormGroup.get('minRollbackTimer')){
      this.actionPropFormGroup.removeControl('minRollbackTimer');
    }
    if(this.actionPropFormGroup.get('maxRollbackTimer')){
      this.actionPropFormGroup.removeControl('maxRollbackTimer');
    }
    return false;
  }

  /**
   * getter to find out whether Report Path is to be rendered
   */
  get shouldRenderReportPath() {
    const attributes = this.actionService.actionAttributes;
    const reportAttribute = attributes ? attributes.find(att => att.id === REPORT_PATH_ATTRIBUTE_ID) : {};
    if(reportAttribute?.status === 'required') {
      this.shouldReportPathBeRequired = true;
      this.actionPropFormGroup.addControl(
        'reportPath',
        new FormControl(this.actionService.actionTemplate?.apiEndpoint, Validators.required)
      )
      return true;
    } else if(reportAttribute?.status === 'optional') {
      this.shouldReportPathBeRequired = false;
      this.actionPropFormGroup.addControl(
        'reportPath',
        new FormControl(this.actionService.actionTemplate?.apiEndpoint)
      )
      return true;
    }
    this.shouldReportPathBeRequired = false;
    if(this.actionPropFormGroup.get('reportPath')){
      this.actionPropFormGroup.removeControl('reportPath');
    }
    return false;
  }


  buildForm(){
    // Check All Conditional Stuff
    const action = this.actionService.actionTemplate;
    const services = this.actionService.actionServices;
    const vendor = this.actionService.actionVendor;
    this.actionPropFormGroup = this.formBuilder.group({
      name: [action?.name, Validators.required],
      description: [action?.description, Validators.required],
      services: [services, Validators.required],
      actionType: [this.actionService.actionType, Validators.required],
      enabled: [action?.enabled, Validators.required],
      vendor: [vendor, Validators.required],
    });
  }

  filterServices(query) {
    // Check if cache is a hit, if yes use it or else call endpoint
    const cachedServices = this.actionService.getActionCache('services');
    if(cachedServices) {
      this.filteredServices = !query ? [...cachedServices] : cachedServices.filter(
        access => access.serviceName.toLowerCase().includes(query.toLowerCase())
      );
      return;
    }
    // Get the List of Services (Either by Customer or All)
    let serviceObservable = this.controller.getServices()
      .pipe(map((data:any) => data.result));
    const customerId = this.actionService.customer?.id;
    if(customerId) {
      serviceObservable = this.controller.getServicesByCustomerId(customerId)
        .pipe(map((data: any) => data.services))
    }
    const subscription = serviceObservable.subscribe(services => {
      // Set the Cache
      this.actionService.setActionCache('services', services);
      this.filteredServices = !query ? [...services] : services.filter(
        access => access.serviceName.toLowerCase().includes(query.toLowerCase())
      );
    });
    this.subscriptions.push(subscription);
  }

  getServiceBasedActionTypes(actionTypes: any[]) {
    const selectedServices = this.actionPropFormGroup.get('services').value;
    // Should work based on selected actions
    const serviceBasedActionTypes = [];
    selectedServices.forEach(service => {
      const actionTypesForThisService = actionTypes
        .filter(type => type.service.ID === service.id)
        .map(type => type.workflow);
      // TODO: Push if not Exists
      serviceBasedActionTypes.push(...actionTypesForThisService);
    });
    return serviceBasedActionTypes;
  }

  filterActionTypes(query) {
    // Check if cache is a hit, if yes use it or else call endpoint
    const cachedActionTypes = this.actionService.getActionCache('actionTypes');
    if(cachedActionTypes) {
      const serviceBasedActionTypes = this.getServiceBasedActionTypes(cachedActionTypes)
      this.filteredActionTypes = !query ? [...serviceBasedActionTypes] : serviceBasedActionTypes.filter(
        type => type.NAME.toLowerCase().includes(query.toLowerCase())
      );
      return;
    }
    const subscription = this.controller.loadAllActionTypes()
      .pipe(map((data: any) => data.result))
      .subscribe(actionTypes => {
        // Set the Cache
        this.actionService.setActionCache('actionTypes', actionTypes);
        const serviceBasedActionTypes = this.getServiceBasedActionTypes(actionTypes)
        this.filteredActionTypes = !query ? [...serviceBasedActionTypes] : serviceBasedActionTypes.filter(
          type => type.NAME.toLowerCase().includes(query.toLowerCase())
        );
      });
    this.subscriptions.push(subscription);
  }

  filterVendors(query) {
    // Check if cache is a hit, if yes use it or else call endpoint
    const cachedVendors = this.actionService.getActionCache('vendors');
    if(cachedVendors) {
      this.filteredVendors = !query ? [...cachedVendors] : cachedVendors.filter(
        vendor => vendor.vendorType.toLowerCase().includes(query.toLowerCase())
      );
      return;
    }
    const subscription = this.apiService.getTemplateVendorTypes()
      .subscribe(vendors => {
        console.log(vendors)
        // Set the Cache
        this.actionService.setActionCache('vendors', vendors);
        this.filteredVendors = !query ? [...vendors] : vendors.filter(
          vendor => vendor.vendorType.toLowerCase().includes(query.toLowerCase())
        );
      });
    this.subscriptions.push(subscription);
  }

  filterHostnames(query: string) {
    // Check if cache is a hit, if yes use it or else call endpoint
    const cachedHostnames = this.actionService.getActionCache('hostnames');
    if(cachedHostnames) {
      this.filteredHostnames = !query ? [...cachedHostnames] : cachedHostnames.filter(
        host => host.HOSTNAME.toLowerCase().includes(query.toLowerCase())
      );
      return;
    }
    const customerId = this.actionService.customer?.id;
    const subscription = this.apiService.getHostnamesByCustomer(customerId)
      .subscribe((hostnames) => {
        // Set the Cache
        this.actionService.setActionCache('hostnames', hostnames);
        this.filteredHostnames = !query ? [...hostnames] : hostnames.filter(
          host => host.HOSTNAME.toLowerCase().includes(query.toLowerCase())
        );
      });
    this.subscriptions.push(subscription);
  }

  filterConfigTemplatesByDependencies(templates) {
    const { vendor, services } = this.actionPropFormGroup.value;
    let filteredCarcheTemplates = [];
    // Filter by Service
    services.forEach(service => {
      const filtered = templates
        .filter((tmp) => Number(tmp.services) === service.id);
      filteredCarcheTemplates.push(...filtered);
    });
    // Filter by Customer
    if(this.actionService.customer) {
      filteredCarcheTemplates = filteredCarcheTemplates
        .filter((tmp) => Number(tmp.contractid) === this.actionService.customer.id)
    }
    // Filter by Vendor
    // TODO: Validate with Captains
    if(vendor?.id) {
      filteredCarcheTemplates = filteredCarcheTemplates
        .filter((tmp) => Number(tmp.vendorType) === vendor.id)
    }
    // Check if selected template is there in the dropdown, if not set to null
    if(this.actionPropFormGroup.value.configTemplate
      && !filteredCarcheTemplates.map(type => type.id).includes(this.actionPropFormGroup.value.configTemplate.id)) {
      this.actionPropFormGroup.patchValue({configTemplate: null});
      this.actionPropFormGroup.updateValueAndValidity();
    }
    return filteredCarcheTemplates;
  }

  filterConfigTemplates(query: string) {
    // Check if cache is a hit, if yes use it or else call endpoint
    const cachedConfigTemplates = this.actionService.getActionCache('configTemplates');
    if(cachedConfigTemplates) {
      const template = this.filterConfigTemplatesByDependencies(cachedConfigTemplates);
      this.filteredConfigTemplates = !query ? [...template] : template.filter(
        config => config.name.toLowerCase().includes(query.toLowerCase())
      );
      return;
    }
    const subscription = this.apiService.getBasicListOfTemplates()
      .subscribe((configTemplates: any[]) => {
        // Set the Cache
        this.actionService.setActionCache('configTemplates', configTemplates);
        const template = this.filterConfigTemplatesByDependencies(configTemplates);
        this.filteredConfigTemplates = !query ? [...template] : template.filter(
          config => config.name.toLowerCase().includes(query.toLowerCase())
        );
      });
    this.subscriptions.push(subscription);
  }

  filterAutoComplete(control, event) {
    const { query } = event;
    switch (control) {
      case 'services':
        this.filteredServices = null;
        this.filterServices(query);
        break;
      case 'actionType':
        this.filteredActionTypes = null;
        this.filterActionTypes(query);
        break;
      case 'vendor':
        this.filteredVendors = null;
        this.filterVendors(query);
        break;
      case 'hostname':
        this.filteredHostnames = null;
        this.filterHostnames(query);
        break;
      case 'configTemplate':
        this.filteredConfigTemplates = null;
        this.filterConfigTemplates(query);
        break;
    }
  }

  onReset() {
    console.log(this.originalFormState);
  }

  onSave() {
    const data = this.actionPropFormGroup.value;
    const action: any = {
      id: this.actionService.actionTemplate?.id,
      name: data.name,
      carcheTemplate: data.configTemplate ? JSON.stringify(data.configTemplate) : null,
      description: data.description,
      enabled: data.enabled,
      serviceId: data.services,
      workflowId: data.actionType.ID,
      vendorType: data.vendor.vendorType,
      vendorTypeId: data.vendor.id,
      staticHostnameCheckBox: !!data?.hostname,
      staticHostname: (data?.hostname && typeof data.hostname === 'string') ? { HOSTNAME: data.hostname} : data.hostname,
    }
    if(this.actionService.customer) {
      action['customerId'] = this.actionService.customer.id;
    }
    if('minRollbackTimer' in data && 'maxRollbackTimer' in data) {
      action['minRollbackTimer'] = data.minRollbackTimer;
      action['maxRollbackTimer'] = data.maxRollbackTimer;
    }
    if('reportPath' in data) {
      action['apiEndpoint'] = data.reportPath;
    }
    this.isSaving = true;
    const subscription = this.controller.updateActionTemplate(action)
      .pipe(finalize(() => this.isSaving = false))
      .subscribe(response => {
        // reset the validation commands in the actionTemplate
        const { apiEndpoint, carcheTemplate, description, enabled, maxRollbackTimer, minRollbackTimer, name } = action;
        this.actionService.actionTemplate = {
          ... this.actionService.actionTemplate, apiEndpoint, carcheTemplate, description, enabled, maxRollbackTimer, minRollbackTimer, name
        };
        this.actionService.actionServices = data.services;
        this.actionService.actionVendor = data.vendor;
        // Update the original State
        this.originalFormState = this.actionPropFormGroup.value;
        this.messageService.add({
          severity: 'success',
          summary: 'Action Update',
          detail: 'Action properties updated successfully!'
        });
      }, error => {
        // TODO: error Handling
        console.log(error);
        this.messageService.add({
          severity: 'error',
          summary: 'Action Update',
          detail: 'Failed to update action properties, please try again!',
          sticky: true
        });
      })
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
