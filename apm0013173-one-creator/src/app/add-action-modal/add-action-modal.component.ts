import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ControllerService } from '../services/controller.service';
import { MessageService } from 'primeng/api';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ApiConnectService } from '../template-manager/api-connect.service';
import { ActivatedRoute, ChildActivationEnd } from '@angular/router';
import { formTemplateSchema } from '../models/formTemplateModel';

@Component({
  selector: 'app-add-action-modal',
  templateUrl: './add-action-modal.component.html',
  styleUrls: ['./add-action-modal.component.css'],
  encapsulation: ViewEncapsulation.None
})

export class AddActionModalComponent implements OnInit {
  form: FormGroup;
  showSpinner: boolean = false;
  customers: any[];
  services: any[];
  templates: any[] = [];
  carcheTemplates: any[] = [];
  loading: boolean = false;
  disableCustomer: boolean = false;
  workflows: any[] = [];
  allWorkFlows: any[] = [];
  vendorTypes: any[] = [];
  emptyData = false;
  confTempEmptyData = false;
  workflowAttributes = {
    hostname: { attributId: 3, value:true, required: false},
    configurationTemplate: { attributId: 4, value:true, required:false},
    apiEndpoint: { attributId: 5, value: true, required: false }
}
  hostnames: any[] = [];
  filteredDevicesService: any[] = [];
  filteredDevices: any[] = [];
  filteredDevicesVendor: any[] = [];
  staticHostnameCheckBoxValue = false;
  canCreateAction = true;


  constructor(private controllerService: ControllerService,
    private fb: FormBuilder,
    private messageService: MessageService,
    public activeModal: NgbActiveModal,
    private apiConnectionService: ApiConnectService,
    private activatedRoute: ActivatedRoute) {
    this.generateFormControls();
  }

  ngOnInit(): void {
    this.loadCustomers();
    this.loadAllAvaliableWorkflows();
    this.loadTemplateVendorTypes();
    this.loadAllConfigurationTemplates();

  }

  /**
   * Load customer to dropdown options
   */
  private loadCustomers(): void {
    this.controllerService.getCustomersByStatus(true).subscribe(customers => {
      this.customers = customers['result'];
      this.getSelectedCustomerFromQuery();
    }, error => {
      this.messageService.add({ severity: 'error', summary: 'Error Message', detail: 'Unable to load customers', sticky: true });
    });
  }

  /**
   * Load all wrokflows for dropdown options
   */
  private loadAllAvaliableWorkflows(): void {
    this.controllerService.loadAllActionTypes().subscribe(result => {
      this.allWorkFlows = result['result'];
    }, error => {
      this.messageService.add({ severity: 'error', summary: 'Error Message', detail: 'Unable to load action types!', sticky: true });
    });
  }

  /**
   * Load all avaliable services
   */
  private loadServices(): void {
    this.controllerService.getServices().subscribe(services => {
      this.services = services['result'];
    }, error => {
      this.messageService.add({ severity: 'error', summary: 'Error Message', detail: 'Unable to load services!', sticky: true });
    });
  }

  private loadTemplateVendorTypes(): void {
    this.apiConnectionService.getTemplateVendorTypes().subscribe(vendorTypes => {
      this.vendorTypes = vendorTypes;
    }, error => {
      this.messageService.add({ severity: 'error', summary: 'Error Message', detail: 'Unable to load vendor types!', sticky: true });
    });
  }



  /**
   * Load configuration templates fro selcted customer and service
   * @param customerId
   * @param serviceId
   */

  private loadAllConfigurationTemplates(): void {
    this.apiConnectionService.getBasicListOfTemplates().subscribe(carcheTemplates => {
      carcheTemplates.forEach(carcheTemplate => {
        this.carcheTemplates.push({
          name: carcheTemplate['name'],
          id: carcheTemplate['id'],
          contractid: carcheTemplate['contractid'],
          services: carcheTemplate['services'],
          deviceModel: carcheTemplate['deviceModel'],
          version: carcheTemplate['version'],
          templateType: carcheTemplate['templateType'],
          vendorType: carcheTemplate['vendorType']
        })
      });
    }, error => {
      this.messageService.add({ severity: 'error', summary: 'Error Message', detail: 'Unable to load configuration templates!', sticky: true });
    });
  }

  /**
   * When user select customer - load all assigned services to selected customer
   * @param event
   */
  public onCustomer(event): void {
    this.resetFormByCustomerChange();
    this.services = undefined;
    if (event['value'] && event['value']['id']) {
      this.loadServicesByCustomer(event['value']['id']);
    } else {
      this.form.get('service').reset();
      this.loadServices();
    }
  }

  /**
   * Load all assigned services by customer id
   * @param customerId
   */
  private loadServicesByCustomer(customerId: string): void {
    this.controllerService.getServicesByCustomerId(customerId).subscribe(result => {
      this.form.get('service').reset();
      this.form.get('confTemplate').reset();
      this.services = result['services'];
    }, error => {
      this.messageService.add({ severity: 'error', summary: 'Error Message', detail: 'Unable to load services by customer!', sticky: true });
    });
  }

  /**
   * When user select service and/or customer - load all assigned cofniguration templates for selected service and/or customer
   * @param event
   */
  public onService(event): void {

    /// TODO implement on change and reset config templates
    // only if vendor is also select otherwise initial stat
    if (this.form.get('vendorType').value
      && this.form.get('vendorType').value['id']) {
      this.carcheTemplateRefiltering();
    }

    // filter avaliable worfklows not related with other changes
    this.workflows = [];
    let workflowByService = [];
    if (this.form.get('service').value && this.form.get('service').value.length > 0) {
      this.form.get('service').value.forEach(service => {
        // get from the list of all worfklows these for which the service was selected
        this.allWorkFlows.forEach(workflow => {
          if (workflow['service']['ID'] == service['id']) {
            workflowByService.push(workflow['workflow']);
          }
        });
      });
      let workflowIds = [];
      // create a array which contain only ids from workflow
      if (workflowByService.length > 0) {
        workflowByService.map(wService => {
          workflowIds.push(wService['ID']);
        });
        // filter the array of workflow ids and get the unique values
        let uniqueIds = workflowIds.filter((v, i, a) => a.indexOf(v) === i);
        let workF = [];
        // traverse the array of unique ids and get the proper worfklow element
        uniqueIds.forEach(id => {
          // find by unique id the workflow element
          workF = workflowByService.filter(wS => {
            return wS['ID'] == id
          });
          // only push to the one which has all services
          if ((workF.length > 1 && workF.length == this.form.get('service').value.length)
            || (workF.length == 1 && this.form.get('service').value.length == 1)) {
            this.workflows.push(workF[0]);
          }
          workF = [];
        });
      }
      if (this.workflows.length < 1) {
        this.emptyData = true;
      } else {
        this.emptyData = false;
      }
    }
  }

  /**
   * Load customer id and name from query
   */
  public getSelectedCustomerFromQuery(): void {
    this.activatedRoute.queryParams.subscribe(queryParams => {
      if (queryParams['customerId']) {
        const id = atob(queryParams['customerId']);
        const customer = this.customers.find(customer => customer['id'] == id);
        this.form.get('customer').setValue(customer);
        this.disableCustomer = true;
        this.loadServicesByCustomer(id);
      } else {
        this.form.get('customer').reset();
        this.disableCustomer = false;
        this.loadServices();
      }
    });
  }
/**
 * Function which get the event there is change in vendor
 * call function carchteTemplateRefiltering
 * clear selected config template if exist
 * filtering of config templated by customer, service and vendor
 *
 * @param event  - vendor change event
 */
  onVendorChange(event) {
    this.carcheTemplateRefiltering();
  }

/**
 * Function used to filter config templated based on filled vaules in form
 */
  carcheTemplateRefiltering() {
    if (this.form.get('confTemplate').value) {
      this.form.get('confTemplate').reset();
    }
    if (this.carcheTemplates.length <= 0) {
      this.messageService.add({ severity: 'error', summary: 'Error!', detail: 'Config templates are not available!', sticky: true });
      return
    }
    // two logic if customer id provided or not
    if (this.form.get('service').value
      && this.form.get('service').value['length'] > 0) {
      if (this.form.get('customer').value
        && this.form.get('customer').value['id']) {
        this.filterCarcheTemplatesByCustomerAndService();
      } else {
        this.filterCarcheTempaltesByService();
      }
    } else {
      this.messageService.add({ severity: 'error', summary: 'Error!', detail: 'Service must be select', sticky: true });
    }
  }


/**
 * Get all customer templates, then filter based on services
 * show templates which is others
 * add to the list also templates which does not have customer but are common filter by vendor
 */
  filterCarcheTemplatesByCustomerAndService() {
    this.templates = [];
    let filteredList = [];
    let filteredListServices = [];
    let filteredListCustomers = [];

    // add to the list also templates by service and general templates
    for (let i = 0; i < this.form.get('service').value['length']; i++) {
      filteredListCustomers = this.filterCarcheTemplateByConditions(
        this.form.get('customer').value['id'],
        this.form.get('service').value[i]['id'],
        this.form.get('vendorType').value['id']
      );

      filteredListServices = this.filterCarcheTemplateByConditions(
        "",
        this.form.get('service').value[i]['id'],
        this.form.get('vendorType').value['id']
      );
      // both exist
      if (filteredListCustomers && filteredListCustomers.length > 0
        && filteredListServices && filteredListServices.length > 0) {
        filteredList = [...this.remapCarcheTemplatesToItems(filteredListCustomers), ...this.remapCarcheTemplatesToItems(filteredListServices)]
      } else if (filteredListCustomers && filteredListCustomers.length > 0) {
        // only customer
        filteredList = this.remapCarcheTemplatesToItems(filteredListCustomers);
      }else if (filteredListServices && filteredListServices.length > 0) {
        // only service
        filteredList = this.remapCarcheTemplatesToItems(filteredListServices);
      }else {
        filteredList = [];
      }

      if (filteredList && filteredList.length > 0) {
        this.templates.push({
          label: this.form.get('service').value[i]['serviceName'],
          items: filteredList
        });
      }
      filteredList = [];
      filteredListServices = [];
      filteredListCustomers = [];
    }

    filteredList = [];
    filteredList = this.filterCarcheTemplateByConditions(this.form.get('customer').value['id'], "",
      this.form.get('vendorType').value['id']);

    // push otehres to list
    if (filteredList && filteredList.length > 0) {
      this.templates.push({
        label: "others",
        items: this.remapCarcheTemplatesToItems(filteredList)
      });
    }
    // set info if no templates
    this.setMessageEmptyData();
  }

  /**
   * This function is helper to filter template based on customer id
   * service id and vendor id
   * @param contractId - customer id
   * @param serviceId - service id
   * @param vendorId - vendor id
   */
  filterCarcheTemplateByConditions(contractId, serviceId, vendorId) {
    let filteredList = [];
    filteredList = this.carcheTemplates.filter(ctemplate => {
      return ctemplate['contractid'] == contractId
        && ctemplate['services'] == serviceId
        && ctemplate['vendorType'] == vendorId
    });
    return filteredList
  }
/**
 * This function is used to define the templates when customer is no provided
 * filtering only based services
 */
  filterCarcheTempaltesByService() {
    this.templates = [];
    let filteredList = [];
    for (let i = 0; i < this.form.get('service').value['length']; i++) {

      filteredList = this.filterCarcheTemplateByConditions("",
        this.form.get('service').value[i]['id'],
        this.form.get('vendorType').value['id']);
      if (filteredList && filteredList.length > 0) {
        this.templates.push({
          label: this.form.get('service').value[i]['serviceName'],
          items: this.remapCarcheTemplatesToItems(filteredList)
        })
      }

      filteredList = [];
    }
    this.setMessageEmptyData();

  }

  /**
   * Helper function to remap the config templates,
   * to the correct format required for grouped list item
   * @param carcheTemplates - list of config templates
   */
  remapCarcheTemplatesToItems(carcheTemplates) {
    let remapedTemplates = [];
    carcheTemplates.map(carcheTemplate => {
      remapedTemplates.push({
        label: carcheTemplate['name'],
        value: {
          name: carcheTemplate['name'],
          id: carcheTemplate['id'],
          contractid: carcheTemplate['contractid'],
          services: carcheTemplate['services'],
          deviceModel: carcheTemplate['deviceModel'],
          version: carcheTemplate['version'] + "",
          templateType: carcheTemplate['templateType'],
          vendorType: carcheTemplate['vendorType']
        }
      });
    });
    return remapedTemplates;
  }

  /**
   * This is helepr function set the flag, if there is not templated defined
   * by provided criteria
   */
  setMessageEmptyData() {
    if (this.templates && this.templates['length'] > 0) {
      this.confTempEmptyData = false;
    } else {
      this.confTempEmptyData = true;
    }
  }


  /**
   * Generate form constrol for form group
   */
  private generateFormControls(): void {
    this.form = this.fb.group({
      'customer': [null],
      'service': [null, Validators.required],
      'name': [null, Validators.required],
      'confTemplate': [null],
      'staticHostname': [null],
      'description': [null, Validators.required],
      'workflow': [null, Validators.required],
      'vendorType': [null, Validators.required],
      "apiEndpoint": [null],
      "enabled": [false],
      "minRollbackTimer": [10],
      "maxRollbackTimer": [120]

    });
  }


  private resetFormByCustomerChange(): void {
    this.form.patchValue(
      {
        service: '',
        confTemplate: '',
        devide: '',
        workflow: '',
        vendorType: ''
      });
    this.form.get('service').clearValidators();
    this.form.get('workflow').clearValidators();
    this.form.get('vendorType').clearValidators();
  }


  /**
   * Close modal
   */
  public closeModal() {
    this.messageService.clear();
    this.activeModal.dismiss();
    this.form.reset();
  }

  /**
   * Create new action
   */
  public addAction(): void {
    if (this.form.valid) {
      this.showSpinner = true;
      let customerId = null;
      let customerName = null;
      if (this.form.get('customer').value) {
        customerId = this.form.get('customer').value['id'];
        customerName = this.form.get('customer').value['name'];
      }

      if(this.form.get('staticHostname').value){
        this.staticHostnameCheckBoxValue = true;
      }
      else {
        this.staticHostnameCheckBoxValue = false;
      }

      if(this.workflowAttributes.hostname.required && !this.form.get('staticHostname').value){
        this.canCreateAction = false;
      } else {
        this.canCreateAction = true;
      }
      if(this.canCreateAction){
        const validationCommand='sh ip int brief';
        if(this.form.get("staticHostname").value){
        this.form.get("staticHostname").value["HOSTNAME"] = this.form.get("staticHostname").value["HOSTNAME"].trim();
      }
      this.controllerService.createActionTemplate(new formTemplateSchema(this.form.get('name').value, null, validationCommand,
        this.form.get('description').value,this.staticHostnameCheckBoxValue, JSON.stringify(this.form.get('confTemplate').value), this.form.get("staticHostname").value, this.form.get("apiEndpoint").value, this.form.get("enabled").value,this.form.get("minRollbackTimer").value, this.form.get("maxRollbackTimer").value),
        this.form.get('service').value, this.form.get('workflow').value['ID'], this.form.get('vendorType').value['id'], customerId
      ).subscribe(result => {
        this.showSpinner = false;
        this.activeModal.close({
          id: result['result']['id'], name: this.form.get('name').value, customerName: customerName,
          customerId: customerId, services: this.form.get('service').value
        });
        this.form.reset();
        this.messageService.add({ severity: 'success', summary: 'Created!', detail: 'Template ' + name + ' is successfully created!' });
      }, error => {
        this.messageService.add({ severity: 'error', summary: 'Error!', detail: 'New template is not created!' });
        this.activeModal.close();
        this.showSpinner = false;
        });
      }
    } else {
      this.messageService.add({ severity: 'error', summary: 'Error!', detail: 'New action is not created!' });
      this.activeModal.close();
    }
  }

  checkForConfigTemplate(){
    this.showSpinner = true;
      this.controllerService.getAttributesForWorkflow(this.form.get('workflow').value.ID).subscribe((attributes)=>{
        this.showSpinner =false
        const attributeIds = attributes.map(attri => attri.id);
      attributes.forEach((attribute) => {
        if(attribute["id"] == this.workflowAttributes.configurationTemplate.attributId && (attribute["status"] =="required" || attribute["status"] == "optional")){
          this.workflowAttributes.configurationTemplate.value = true;
          if(attribute["status"] == "required"){
            this.form.get("confTemplate").setValidators(Validators.required);
            this.form.get("confTemplate").updateValueAndValidity();
            this.workflowAttributes.configurationTemplate.required = true;
          }
          else {
            this.workflowAttributes.configurationTemplate.required = false;
            this.form.get("confTemplate").setValidators(null);
            this.form.get("confTemplate").updateValueAndValidity();
          }
        } else if (attribute["id"] == this.workflowAttributes.configurationTemplate.attributId) {
          this.form.get("confTemplate").setValidators(null);
          this.form.get("confTemplate").updateValueAndValidity();
          this.workflowAttributes.configurationTemplate.value = false;
          this.workflowAttributes.configurationTemplate.required = false;
        }

        if(attribute["id"] == this.workflowAttributes.hostname.attributId && (attribute["status"] =="required" || attribute["status"] == "optional")){
          this.workflowAttributes.hostname.value = true;
          if(this.form.get("customer").value != null && attribute["status"] == "required"){
            this.form.get("staticHostname").setValidators(Validators.required);
            this.form.get("staticHostname").updateValueAndValidity();
            this.workflowAttributes.hostname.required = true;
          }
          else {
            this.workflowAttributes.hostname.required = false;
            this.form.get("staticHostname").setValidators(null);
            this.form.get("staticHostname").updateValueAndValidity();
          }
        } else if (attribute["id"] == this.workflowAttributes.hostname.attributId) {
          this.form.get("staticHostname").setValidators(null);
          this.form.get("staticHostname").updateValueAndValidity();
          this.workflowAttributes.hostname.value = false;
          this.workflowAttributes.hostname.required = false;
        }
        if(attribute["id"] == this.workflowAttributes.apiEndpoint.attributId && (attribute["status"] =="required" || attribute["status"] == "optional")){
          this.workflowAttributes.apiEndpoint.value = true;
          if(attribute["status"] == "required"){
            this.form.get("apiEndpoint").setValidators(Validators.required);
            this.form.get("apiEndpoint").updateValueAndValidity();
            this.workflowAttributes.apiEndpoint.required = true;
          }
          else {
            this.workflowAttributes.apiEndpoint.required = false;
            this.form.get("apiEndpoint").setValidators(null);
            this.form.get("apiEndpoint").updateValueAndValidity();
          }
        } else if (attribute["id"] == this.workflowAttributes.apiEndpoint.attributId) {
          this.form.get("apiEndpoint").setValidators(null);
          this.form.get("apiEndpoint").updateValueAndValidity();
          this.workflowAttributes.apiEndpoint.value = false;
          this.workflowAttributes.apiEndpoint.required = false;
        }

      });

      if(this.workflowAttributes.hostname.value){
        if(this.form.get("customer").value != null){
        this.loadHostnames();
      }
      }

      if(attributes.length == 0 || !attributeIds.includes(this.workflowAttributes.configurationTemplate.attributId)){
        this.workflowAttributes.configurationTemplate.required = false;
        this.workflowAttributes.configurationTemplate.value = true;
        this.form.get("confTemplate").setValidators(null);
        this.form.get("confTemplate").updateValueAndValidity();
      }
      if(attributes.length == 0 || !attributeIds.includes(this.workflowAttributes.apiEndpoint.attributId)){
        this.workflowAttributes.apiEndpoint.required = false;
        this.workflowAttributes.apiEndpoint.value = true;
        this.form.get("apiEndpoint").setValidators(null);
        this.form.get("apiEndpoint").updateValueAndValidity();
      }
      if(this.hostnames.length > 0){
      if(attributes.length == 0 || !attributeIds.includes(this.workflowAttributes.hostname.attributId)){
        this.workflowAttributes.hostname.required = false;
        this.workflowAttributes.hostname.value = true;
        this.form.get("staticHostname").setValidators(null);
        this.form.get("staticHostname").updateValueAndValidity();
      }
    }

    });
    }

    loadHostnames() {
      this.messageService.clear();
      if(this.workflowAttributes.hostname.value){
        this.showSpinner = true;
      this.hostnames = [];
      this.apiConnectionService.getHostnamesByCustomer(this.form.get("customer").value["id"]).subscribe((hostnames) => {
        this.canCreateAction = true;
        this.showSpinner = false
        // check response if the value is value for the reponse higger then 0
        // otherwise not allow to pick the hostname
        if (hostnames.length > 0) {
          this.hostnames = hostnames;
          this.filterDevices();
        } else {
          this.canCreateAction = false
          this.showSpinner = false
          this.staticHostnameCheckBoxValue = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Load hostnames error!',
            detail: 'You can not create this action becouse the list of hostnames for this customer is empty, please check if GPS name is present for this customer!',
            sticky: true
          });
        }
      }, error => {
        this.canCreateAction = false;
        this.showSpinner = false
        // if error set statichostname vlaue to false not allow to pick hostname
        this.staticHostnameCheckBoxValue = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Load hostnames error!',
          detail: 'You can not create this action becouse the list of hostnames for this customer is empty, please check if GPS name is present for this customer!',
          sticky: true
        });

      });
    }
    }

    filterDevices() {
      if (this.form.get('customer').value && this.form.get('service').value.length > 0 && this.hostnames.length > 0) {
      this.filteredDevicesService = [];
      this.filteredDevices = [];
      this.filteredDevicesVendor = [];
      this.form.get('service').value.forEach((service) => {
        if (this.hostnames.length > 0) {
          this.hostnames.forEach(device => {
            if (device['SERVICE_NAME'] == service['serviceName']) {
              this.filteredDevicesService.push(device);
            }
          });
        }
        else {
          return;
        }
      });
      if (this.form.get('vendorType').value !== '' && this.form.get('vendorType').value['vendorType'] !== 'any') {
        this.filteredDevicesService.forEach(device => {
          if (device['VENDOR'] == this.form.get('vendorType').value['vendorType']) {
            this.filteredDevices.push(device);
          }

        });
      } else {
        this.filteredDevices = this.filteredDevicesService;
      }
    }
  }

  filterDeviceSingle(event) {
    let availableDevices = [];
    this.form.get('service').value.forEach((service) => {
      availableDevices = this.filteredDevicesService.filter((device) => {
        if (
          device["VENDOR"] === this.form.get("vendorType").value["vendorType"]
        ) {
          return device;
        }
      })
    });

    const query = event.query;
    this.form.get('staticHostname').setValue({HOSTNAME: query})
    if (this.filteredDevices.length > 0) {
      this.filteredDevices = this.filterDevice(query, availableDevices);
    }
  }

  filterDevice(query, devices): any[] {
    const filtered: any[] = [];
    devices.forEach((device) => {
      const deviceName = device["HOSTNAME"];
      if (deviceName.toLowerCase().indexOf(query.toLowerCase()) === 0) {
        filtered.push({
          HOSTNAME: deviceName,
          TYPE: device["TYPE"],
          CATEGORY: device["CATEGORY"],
          PARTNUM: device["PARTNUM"],
          VENDOR: device["VENDOR"],
          SERVICE: device["SERVICE"],
          ADDRESS: device["ADDRESS"],
          CITY: device["CITY"],
          COUNTRY: device["COUNTRY"],
          STATE: device["STATE"],
          ZIP: device["ZIP"],
          SERVICE_NAME: device["SERVICE_NAME"],
        });
      }
    });
    return filtered;
  }

}
