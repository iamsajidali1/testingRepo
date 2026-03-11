import { Component, OnInit, Input, OnChanges, Output, EventEmitter } from '@angular/core';
import { Validators, FormControl, FormGroup, FormBuilder } from '@angular/forms';
import { MessageService, ConfirmationService, SelectItem } from 'primeng/api';
import { CustomerSchema } from '../models/customerModel';
import { ControllerService } from '../services/controller.service';
import { TabButtonServiceService } from '../services/tab-button-service.service';
import { ApiConnectService } from '../template-manager/api-connect.service';
import { formTemplateSchema } from '../models/formTemplateModel';
import { forkJoin } from 'rxjs';
import * as _ from 'underscore';
import { ConstanstSettings } from '../constant';
import { debounceTime, } from 'rxjs/operators';
import { runInThisContext } from 'vm';

@Component({
  selector: 'app-form-properties',
  templateUrl: './form-properties.component.html',
  styleUrls: ['./form-properties.component.scss']
})

export class FormPropertiesComponent implements OnInit, OnChanges {
  @Input() template;
  @Input() dataForPermissionManager;
  showSpinner: boolean = false;
  @Output() eventEmitter = new EventEmitter();
  @Output() formGroupEmitter = new EventEmitter();
  @Output() workflowAttributesEvent = new EventEmitter();
  form: FormGroup;
  submitted: boolean;
  selectedCustomer: CustomerSchema = { name: '', external_customer_id: '' };
  customers: any[] = [];
  configurationTemplates: any[] = [];
  workflowOptions: any[];
  selectedCarcheTemplate: any;
  customerServices: any[] = [];
  optionsServices: any[] = [];
  carcheTemplates: any[] = [];
  services: any[] = [];
  allServices: any[] = [];
  allVendors: any[] = [];
  allCarcheTemplates: any[] = [];
  allHostnames: any[] = [];
  hostnames = [];
  workflows = [];
  vendorTypes = [];
  questions;
  allWorkflows: any = [];
  generateConfigWorkflow = false;
  loadingServices: boolean = false;
  loadingHostnames: boolean = false;
  roles: any = [];
  users: any = [];
  filteredUsers: any = [];
  selectedRoles: any = [];
  loadingConfigTemp: boolean = false;
  filteredDevicesVendor: any = [];
  filteredDevicesService: any = [];
  filteredDevices: any;
  groupedDevicesService: any;
  groupedDevicesVendor: any;
  confTempEmptyData: boolean = false;
  workflowAttributes = {
    validation: { attributId: 1, value: true, required: false },
    form: { attributId: 2, value: true, required: false },
    hostname: { attributId: 3, value: true, required: false },
    configurationTemplate: { attributId: 4, value: true, required: false },
    apiEndpoint: { attributId: 5, value: true, required: false }
  }
  workflowSpinner = false;
  vendorSpinner = false;


  constructor(private fb: FormBuilder,
    private messageService: MessageService,
    private service: ControllerService,
    public tabService: TabButtonServiceService,
    private apiConnecetionService: ApiConnectService,
    private controllerService: ControllerService) {
    this.tabService.customerChanged$.subscribe(
      contractid => {
      }
    );

    this.tabService.customerNameChanged$.subscribe(
      customer => {
        const slc = { name: customer['name'], external_customer_id: customer['external_customer_id'] };
        this.form.get('customer').setValue(slc);
        this.selectedCustomer = slc;
      }
    );

    this.tabService.deleteBtnPushed$.subscribe(
      result => {
        this.clearForm();
      }
    );
    const saveButtonClickedDebounced =
      this.tabService.saveButtonPushed$.pipe(debounceTime(ConstanstSettings.DEBOUCNE_LIMIT));

    saveButtonClickedDebounced.subscribe(
      result => {
        if (!this.form.valid) {
          this.markFormGroupTouched(this.form);
        } else {
          this.formGroupEmitter.emit(this.form);
        }
      }
    );

    /*this.tabService.loadQuestionsFormFormBuilder$.subscribe(
      questions => {
        this.questions = questions;
        console.log("ANO properties");
        if (!this.form.valid) {
          this.markFormGroupTouched(this.form);
        } else {
          this.showSpinner = true;
          this.updateActionTemplate();
        }
      }
    );*/
  }

  resetAllvariables() {
    this.allCarcheTemplates = [];
    this.allHostnames = [];
    this.allVendors = [];
    this.allWorkflows = [];
    this.allServices = [];
  }


  ngOnInit() {
    this.generateFormControls();
    if (this.template['id']) {
      this.resetAllvariables();
      this.configurationTemplates = [];
      this.carcheTemplates = [];
      this.loadAllActionTemplateData();
      this.loadValuesFromTemplateToFormGroup();
    }
  }

  ngOnChanges() {
    if (this.template['id']) {
      this.generateFormControls();
      this.resetAllvariables();
      this.configurationTemplates = [];
      this.carcheTemplates = [];
      this.loadAllActionTemplateData();
      this.loadValuesFromTemplateToFormGroup();
    }
  }

  public loadAllActionTemplateData(): void {
    this.showSpinner = true;
    let requestArray = [];
    // load all actions types
    // load action types for selected action template
    requestArray.push(this.controllerService.loadActionTypeForActionTemplate(this.template['id']));
    let type = "service";
    if (this.template['customer'] && this.template['customer']['id']) {
      type = "customer";
    }
    // load all assigned services for action template
    requestArray.push(this.controllerService.getServicesForAction(this.template['id'], type));
    requestArray.push(this.controllerService.getActionVendorTypeByActionId(this.template['id']));

    forkJoin(requestArray).subscribe(results => {
      this.workflows = [];
      this.workflows.push(results[0]['result']);
      this.form.get('service_workflow').setValue(results[0]['result']);
      this.controllerService.getAttributesForWorkflow(results[0]["result"]["ID"]).subscribe((attributes) => {
        this.filterWorkflowAttributes(attributes)
      })
      this.services = [];
      this.services = results[1]['result'];
      this.form.get('services').setValue(results[1]['result']);
      // currenlty in part of the vendors
      if (results[2]['result']['vendor']) {
        this.vendorTypes = [];
        this.vendorTypes.push(results[2]['result']['vendor']);
        this.form.get('vendorType').setValue(results[2]['result']['vendor']);
      }
      //TODO hostname is not set to box
      // hostname is not set in box
      if (this.template['customer'] && this.template['customer']['id']
        && this.template['staticHostnameCheckBox'] && this.template['staticHostname']) {
        this.filteredDevices = [];
        this.filteredDevices.push(this.template['staticHostname']);
        this.form.get("staticHostname").setValue(this.template['staticHostname']);
      }
      if (this.form.get('vendorType') && this.form.get('services')
        && this.form.get('services').value.length > 0) {
        this.setConfigTemplateToForm();
      } else {
        this.loadingConfigTemp = false;
        this.messageService.add({ severity: 'error', summary: 'Error Message', detail: 'Config templates can not be loaded!', sticky: true });
        this.showSpinner = false;
      }
      this.showSpinner = false;
    }, error => {
      this.showSpinner = false;
      this.messageService.add({
        severity: 'error',
        summary: 'Error Message',
        detail: 'Please check and validate all provided configuration for action!',
        sticky: true
      });
      return;
    });

  }

  /* TODO - for feature development
  public onCustomer(event): void{
    this.services = undefined;
    if(event['value'] && event['value']['id']){
      this.loadServicesByCustomer(event['value']['id']);
    } else {
      this.form.get('services').reset();
      this.loadServices();
    }
  }
  */

  /* TODO - for feature development
  private loadCustomers(): void{
    this.controllerService.getCustomersByStatus(true).subscribe(customers => {
      this.customers = [];
      customers['result'].forEach(customer => {
        this.customers.push({
          id : customer['id'],
          name : customer['name']
        });
      });
      if(this.template['customer']){
        this.form.get('customer').setValue(this.template['customer']);
      }
    }, error => {
      this.messageService.add({ severity: 'error', summary: 'Error Message', detail: 'Unable to load customers!', sticky: true });
    });
  }
  */

  async filterWorflowBasedOnService(): Promise<void> {
    this.workflowSpinner = true;
    const services = this.form.get('services').value;
    this.workflows = [];
    let workflowByService = [];
    try {
      if (this.allWorkflows.length <= 0) {
        const data = await this.controllerService.loadAllActionTypes().toPromise();
        if (data['result']) {
          this.allWorkflows = data['result']
        }
      }
    } catch (err) {
      this.workflowSpinner = false;
      this.messageService.add({ severity: 'error', summary: 'Error Message', detail: 'Worfklows can not be loaded!', sticky: true });
    }

    if (services && services.length > 0 && this.allWorkflows.length > 0) {
      services.forEach(service => {
        // get from the list of all worfklows these for which the service was selected
        this.allWorkflows.forEach(workflow => {
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
          if ((workF.length > 1 && workF.length == services.length)
            || (workF.length == 1 && services.length == 1)) {
            this.workflows.push(workF[0]);
          }
          workF = [];
        });
      }
      this.workflowSpinner = false;
    }
    this.workflowSpinner = false;
  }

  async loadingCarcheTemplates(): Promise<void> {
    if (this.allCarcheTemplates.length <= 0) {
      try {
        let data = await this.apiConnecetionService.getBasicListOfTemplates().toPromise();
        if (data && data.length > 0) {
          this.carcheTemplates = [];
          data.map(carcheTemp => {
            this.carcheTemplates.push({
              name: carcheTemp['name'],
              id: carcheTemp['id'],
              contractid: carcheTemp['contractid'],
              services: carcheTemp['services'],
              deviceModel: carcheTemp['deviceModel'],
              version: carcheTemp['version'],
              templateType: carcheTemp['templateType'],
              vendorType: carcheTemp['vendorType']
            });
          });
          this.allCarcheTemplates = this.carcheTemplates;
        }
      } catch (err) {
        this.messageService.add({ severity: 'error', summary: 'Error Message', detail: 'Config templates can not be loaded!', sticky: true });
      }
    } else {
      this.carcheTemplates = this.allCarcheTemplates;
    }

  }

  /**
   * Function used to filter config templated based on filled vaules in form
   */
  async carcheTemplateRefiltering(): Promise<void> {
    this.loadingConfigTemp = true;
    await this.loadingCarcheTemplates();
    if (this.carcheTemplates.length <= 0) {
      this.loadingConfigTemp = false;
      this.setMessageEmptyData();
      this.messageService.add({ severity: 'error', summary: 'Error!', detail: 'Config templates can not be loaded!', sticky: true });
      return;
    }
    // two logic if customer id provided or not
    if (this.form.get('services').value
      && this.form.get('services').value['length'] > 0) {
      if (this.form.get('customer').value
        && this.form.get('customer').value['id']) {
        // if customer is provided
        this.filterCarcheTemplatesByCustomerAndService();
        this.loadingConfigTemp = false;
      } else {
        // if only service is provided
        this.filterCarcheTempaltesByService();
        this.loadingConfigTemp = false;
      }
    } else {
      this.loadingConfigTemp = false;
      this.messageService.add({ severity: 'error', summary: 'Error!', detail: 'Service must be selected!', sticky: true });
    }
  }

  /**
  * Get all customer templates, then filter based on services
  * show templates which is others
  * add to the list also templates which does not have customer but are common filter by vendor
  */
  private filterCarcheTemplatesByCustomerAndService(): void {
    this.configurationTemplates = [];
    let filteredList = [];
    let filteredListServices = [];
    let filteredListCustomers = [];

    // add to the list also templates by service and general templates
    for (let i = 0; i < this.form.get('services').value['length']; i++) {
      filteredListCustomers = this.filterCarcheTemplateByConditions(
        this.form.get('customer').value['id'],
        this.form.get('services').value[i]['id'],
        this.form.get('vendorType').value['id']
      );

      filteredListServices = this.filterCarcheTemplateByConditions(
        "",
        this.form.get('services').value[i]['id'],
        this.form.get('vendorType').value['id']
      );
      // both exist
      if (filteredListCustomers && filteredListCustomers.length > 0
        && filteredListServices && filteredListServices.length > 0) {
        filteredList = [...this.remapCarcheTemplatesToItems(filteredListCustomers), ...this.remapCarcheTemplatesToItems(filteredListServices)]
      } else if (filteredListCustomers && filteredListCustomers.length > 0
        && filteredListServices.length <= 0) {
        // only customer
        filteredList = this.remapCarcheTemplatesToItems(filteredListCustomers);
      } else if (filteredListServices && filteredListServices.length > 0 && filteredListCustomers.length <= 0) {
        // only service
        filteredList = this.remapCarcheTemplatesToItems(filteredListServices);
      } else {
        filteredList = [];
      }

      if (filteredList && filteredList.length > 0) {
        this.configurationTemplates.push({
          label: this.form.get('services').value[i]['serviceName'],
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
      this.configurationTemplates.push({
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
  private filterCarcheTemplateByConditions(contractId, serviceId, vendorId): any[] {
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
  private filterCarcheTempaltesByService(): void {
    this.configurationTemplates = [];
    let filteredList = [];
    for (let i = 0; i < this.form.get('services').value['length']; i++) {

      filteredList = this.filterCarcheTemplateByConditions("",
        this.form.get('services').value[i]['id'],
        this.form.get('vendorType').value['id']);
      if (filteredList && filteredList.length > 0) {
        this.configurationTemplates.push({
          label: this.form.get('services').value[i]['serviceName'],
          items: this.remapCarcheTemplatesToItems(filteredList)
        })
      }
      filteredList = [];
    }
    // this.setConfigTemplateToForm();
    // check if form is exist
    this.setMessageEmptyData();

  }

  /**
   * Function set in to the form the selected carche template
   */
  private setConfigTemplateToForm(): void {
    // TODO fix the issue if no config template provided
    let configTemplate = false;
    try {
      if (this.template['carcheTemplate'] && this.template['carcheTemplate'] != ""
        && this.template['carcheTemplate'] !== null && this.template['carcheTemplate'] !== undefined
        && this.template['carcheTemplate'] !== "null") {
        let configurationTemplate = JSON.parse(this.template['carcheTemplate']);
        if (configurationTemplate["id"]) {
          configTemplate = true;
        } else {
          configTemplate = false;
        }
      }
    } catch (err) {
      configTemplate = false;
      this.messageService.add({ severity: 'error', summary: 'Error!', detail: 'Config template can not be used!', sticky: true });
      return;
    }

    if (configTemplate) {
      let configurationTemplate = JSON.parse(this.template['carcheTemplate']);
      this.configurationTemplates = [];
      let templateAsArray = [];
      templateAsArray.push(configurationTemplate);
      this.configurationTemplates = [];
      let services = this.form.get('services').value;
      let service = services.filter(serv => {
        return serv['id'] == configurationTemplate['services']
      });
      if(service[0]!==undefined){
      this.configurationTemplates.push({
        label: service[0]['serviceName'],
        items: this.remapCarcheTemplatesToItems(templateAsArray)
      });
    } else {
      this.configurationTemplates.push({
        label: "other",
        items: this.remapCarcheTemplatesToItems(templateAsArray)
      });
    }
      this.form.get('confTemplate').setValue(configurationTemplate);
      this.loadCarcheVariablesByTemplate(configurationTemplate);
    } else {
      this.tabService.announceTemplateVariablesChanged([{ label: '', value: 'empty' }]);
    }
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
  private setMessageEmptyData() {
    if (this.configurationTemplates && this.configurationTemplates['length'] > 0) {
      this.confTempEmptyData = false;
    } else {
      this.confTempEmptyData = true;
    }
  }

  /**
   * Function which triggered by configuration tempalte change event
   * If the other template is picked or the value is reseted
   * @param event - configuration template change
   */
  public confTemplateOnChange(event) {
    this.formGroupEmitter.emit(this.form);

    if (event && event.value && event.value['id']
      && event.value['templateType']) {
      this.template['carcheTemplate'] = this.form.get('confTemplate').value;
      this.loadCarcheVariableByTemplateIdTemplateType(
        event.value['id'],
        event.value['templateType']);
    } else {
      this.resetTemplateCarcheValue();
    }
  }

  /**
   * Load carche variables by configuration template
   * @param confTemplate - config template
   */
  private loadCarcheVariablesByTemplate(confTemplate) {
    if (confTemplate && confTemplate['id']
      && confTemplate['templateType']) {
      this.formGroupEmitter.emit(this.form);
      this.loadCarcheVariableByTemplateIdTemplateType(confTemplate['id'], confTemplate['templateType']);
    }
  }

  /**
   * Load configuration template variables by template id and template type
   * @param templateId - configuration template id
   * @param templateType - configuration template type
   */
  loadCarcheVariableByTemplateIdTemplateType(templateId, templateType) {
    let templateVariablesFinal = [];
    // message about loading the variables
    this.messageService.add({
      severity: 'info',
      summary: 'Loading config template variables!',
      detail: 'Please wait till the variables are loadded for using them in Form module!',
    });
    this.apiConnecetionService.getListOfTemplateVariablesByIdAndDeviceModel(
      templateId, templateType).subscribe(templateVariables => {
        if (templateVariables.length > 0) {
          templateVariables.forEach(variable => {
            templateVariablesFinal.push({ label: variable, value: variable });
          });
          this.tabService.announceTemplateVariablesChanged(templateVariablesFinal);
          this.messageService.add({
            severity: 'success',
            summary: 'Config template variables loaded!',
            detail: 'Variables for config template is loaded, you can use it in Form module!'
          });
        } else {
          this.tabService.announceTemplateVariablesChanged([{ label: '', value: 'empty' }]);
          this.messageService.add({
            severity: 'info',
            summary: 'Config template empy variables!',
            detail: 'This config templates does not have variables, you can not use it in Form module!'
          });
        }
      });
  }

  /**
   * Load values from selcted action to form group
   */
  private loadValuesFromTemplateToFormGroup(): void {
    for (const key in this.template) {
      if (key in this.form.controls) {
        this.form.get(key).setValue(this.template[key]);
      }
    }
  }

  /**
  * Dynamicly set validators when static HostnameCheckBox value change or
  * clear formControl staticHostname value
  */
  public valueChange(): void {
    if (this.form.get('staticHostnameCheckBox').value) {
      this.form.get("staticHostname").setValidators(Validators.required);
      this.form.get("staticHostname").updateValueAndValidity();
      this.loadHostnames();
    } else {
      this.resetStaticHostnameValidators();
    }
  }

  /**
   *  Function to reset the hostname controls in form controll
   */
  public resetStaticHostnameValidators() {
    this.form.controls["staticHostname"].reset();
    if (!this.workflowAttributes.hostname.required) {
      this.form.get("staticHostname").clearValidators();
      this.form.get("staticHostname").updateValueAndValidity();
    } else {
      this.form.get("staticHostname").setValidators(Validators.required);
      this.form.get("staticHostname").updateValueAndValidity();
    }
  }

  /**
  * Cleare form Group for form template properties tab
  */
  private clearForm(): void {
    this.form.reset();
  }

  //for development
  get diagnostic() { return JSON.stringify(this.form.value); }

  loadHostnames() {
    this.loadingHostnames = true;
    this.hostnames = [];
    this.apiConnecetionService.getHostnamesByCustomer(this.template['customer']['id']).subscribe((hostnames) => {
      // check response if the value is value for the reponse higger then 0
      // otherwise not allow to pick the hostname
      if (hostnames.length > 0) {
        this.hostnames = hostnames;
        this.filterDevices();
        this.loadingHostnames = false;
      } else {
        this.loadingHostnames = false;
        this.form.get('staticHostnameCheckBox').setValue(false);
        this.resetStaticHostnameValidators();
        this.messageService.add({
          severity: 'error',
          summary: 'Load hostnames error!',
          detail: 'This funcionality can not be used, the list of hostnames for this customer is empty, please check customer GSP data!',
          sticky: true
        });
      }

    }, error => {
      // if error set statichostname vlaue to false not allow to pick hostname
      this.loadingHostnames = false;
      this.form.get('staticHostnameCheckBox').setValue(false);
      this.resetStaticHostnameValidators();
      this.messageService.add({
        severity: 'error',
        summary: 'Load hostnames error!',
        detail: 'This funcionality can not be used, the list of hostnames for this customer is empty, please check customer GSP data!',
        sticky: true
      });
    });
  }

  checkWorfklow() {
    this.tabService.generateConfigWorkflow = this.form.get('service_workflow').value.NAME.includes('Generate config');
    this.showSpinner = true;
    this.controllerService.getAttributesForWorkflow(this.form.get('service_workflow').value.ID).subscribe((attributes) => {
      this.filterWorkflowAttributes(attributes);
      this.workflowAttributesEvent.emit(this.workflowAttributes);
      this.showSpinner = false;
    })
  }


  async loadAllHostnames(): Promise<void> {
    this.loadingHostnames = true;
    if (this.allHostnames.length <= 0) {
      if (this.template['customer'] && this.template['customer']['id'] &&
        this.template['staticHostnameCheckBox'] && this.template['staticHostname']) {
        try {
          const data = await this.apiConnecetionService.getHostnamesByCustomer(this.template['customer']['id']).toPromise();
          if (data) {
            this.allHostnames = data;
            this.hostnames = data;
          }
          this.loadingHostnames = false;
        } catch (err) {
          this.loadingHostnames = false;
          this.messageService.add({ severity: 'error', summary: 'Error!', detail: 'Hostnames can not be loaded!', sticky: true });
        }
      }
      this.loadingHostnames = false;
    } else {
      this.loadingHostnames = false;
      this.hostnames = this.allHostnames;
    }
    if (this.hostnames.length > 0 && this.form.get('vendorType') && this.form.get('services')
      && this.form.get('services').value['length'] > 0) {
      if (this.template['customer'] && this.template['customer']['id']) {
        this.filterHostnames();
      }
    }

  }

  filterDeviceSingle(event) {
    let availableDevices = [];
    this.form.get('services').value.forEach((service) => {
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



  async loadVendorTypes(): Promise<void> {

    if (this.allVendors['length'] <= 0) {
      this.vendorSpinner = true;
      this.vendorTypes = [];
      try {
        let data = await this.apiConnecetionService.getTemplateVendorTypes().toPromise();
        if (data['length'] > 0) {
          this.vendorTypes = data;
          this.allVendors = data;
        }
        this.vendorSpinner = false;
      } catch (err) {
        this.vendorSpinner = false;
        this.messageService.add({ severity: 'error', summary: 'Error!', detail: 'Vendors can not be loaded!', sticky: true });
      }
    } else {
      this.vendorSpinner = false;
      this.vendorTypes = this.allVendors;
    }
  }


  filterDevices() {
    // reset carche template
    this.resetTemplateCarcheValue();
    this.resetConfiTemplate();
    this.carcheTemplateRefiltering();
    if (this.template['customer'] && this.template['customer']['id']) {
      this.resetStaticHostnameValue();
      //this.filterHostnames();
      this.loadAllHostnames();
    }
  }

  filterHostnames() {
    if (this.form.get('staticHostnameCheckBox').value) {
      this.form.get("staticHostname").setValidators(Validators.required);
      this.form.get("staticHostname").updateValueAndValidity();
    }
    this.filteredDevicesService = [];
    this.filteredDevices = [];
    this.filteredDevicesVendor = [];
    this.form.get('services').value.forEach((service) => {
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

  markFormGroupTouched(formGroup: FormGroup): void {
    (Object as any).values(formGroup.controls).forEach(control => {
      control.markAsDirty();
    });
    formGroup.updateValueAndValidity();
  }

  private generateFormControls() {
    this.form = this.fb.group({
      name: new FormControl('', Validators.required),
      confTemplate: new FormControl(''),
      customer: new FormControl('', null),
      description: new FormControl('', Validators.required),
      service_workflow: new FormControl('', Validators.required),
      staticHostnameCheckBox: new FormControl(''),
      staticHostname: new FormControl(''),
      services: new FormControl('', Validators.required),
      vendorType: new FormControl(null, Validators.required),
      apiEndpoint: new FormControl(''),
      enabled: new FormControl(false),
      minRollbackTimer: new FormControl(''),
      maxRollbackTimer: new FormControl('')
    });
  }



  filterUserSingle(event) {
    const query = event.query;
    // if (this.permissionService.currentUserFromDB.hasOwnProperty('ID')) {
    if (this.users.length > 0) {
      this.filteredUsers = this.filterUser(query, this.users);
    }
    // }
  }

  filterUser(query, users): any[] {
    const filtered: any[] = [];
    users.forEach((user) => {
      const userAttuid = user['ATTUID'];
      if (userAttuid.toLowerCase().indexOf(query.toLowerCase()) === 0) {
        filtered.push({
          ID: user['ID'],
          NAME: user['NAME'],
          ATTUID: user['ATTUID'],
          BC_USER_ID: user['BS_USER_ID']
        });
      }
    });
    return filtered;
  }

  async loadServices(): Promise<void> {
    if (this.allServices.length <= 0) {
      this.loadingServices = true;
      let data: any = [];
      try {
        this.services = [];
        if (this.template['customer'] && this.template['customer']['id']) {
          // load all services for specify customer
          data = await this.controllerService.getServicesByCustomerId(this.template['customer']['id']).toPromise();
          if (data['services']) {
            this.services = data['services'];
            this.allServices = data['services'];
          }
        } else {
          // load all services
          data = await this.controllerService.getServices().toPromise();
          if (data['result']) {
            this.services = data['result'];
            this.allServices = data['result']
          }
        }
        this.loadingServices = false;
      } catch (err) {
        this.loadingServices = false;
        this.messageService.add({ severity: 'error', summary: 'Error Message', detail: 'Services can not be loaded!', sticky: true });
      }

    } else {
      this.services = this.allServices;
      this.loadingServices = false;
    }

  }


  /**
   * When user select different service- load all assigned cofniguration templates for selected service and/or customer
   * @param event
   */
  async onService(event): Promise<void> {
    this.resetConfTempAndWorkflow();
    this.resetTemplateCarcheValue();

    // action type must be reset
    if (this.form.get('services').value && this.form.get('services').value.length > 0) {
      this.filterWorflowBasedOnService();
      this.carcheTemplateRefiltering();
      if (this.template['customer'] && this.template['customer']['id']) {
        this.resetStaticHostnameValue();
        this.loadAllHostnames();
      }
    }

  }

  /**
   * Reset config template and service workflow value used on service change
   */
  private resetConfTempAndWorkflow(): void {
    this.form.patchValue(
      {
        service_workflow: '',
      });
    this.form.get('service_workflow').clearValidators();
    this.resetConfiTemplate();
  }

  /**
   * Reset this.template carchtemplate value aslo set the empty value for the variables
   */
  private resetTemplateCarcheValue() {
    this.template['carcheTemplate'] = "";
    this.tabService.announceTemplateVariablesChanged([{ label: '', value: 'empty' }]);
  }

  /**
   * Reset the form control confiTemplate value if there is service or device change
   */
  private resetConfiTemplate() {
    this.form.patchValue({
      confTemplate: ''
    });
  }

  /**
   * Reset the value of the hostname
   */
  private resetStaticHostnameValue() {
    this.form.controls["staticHostname"].reset();
  }

  /**
   * Change status of spinner
   * @param event
   */
  public spinnerChange(event) {
    this.showSpinner = event;
  }

  private filterWorkflowAttributes(attributes) {
    this.form.get("staticHostname").setValidators(null)
    this.form.get("confTemplate").setValidators(null);
    this.form.get("staticHostname").updateValueAndValidity();
    this.form.get("confTemplate").updateValueAndValidity();
    const attributesFromObject = Object.keys(this.workflowAttributes);
    const attributeIds = [];
    attributesFromObject.forEach((attributeObject) => {
      attributeIds.push(this.workflowAttributes[attributeObject].attributeId);
    })
    attributes.forEach((attribute) => {
      if (attribute["id"] == this.workflowAttributes.validation.attributId && (attribute["status"] == "required" || attribute["status"] == "optional")) {
        this.workflowAttributes.validation.value = true;
        this.workflowAttributes.validation.required = false;
        if (attribute["status"] == "required") {
          this.workflowAttributes.validation.required = true;
        }
      } else if (attribute["id"] == this.workflowAttributes.validation.attributId) {
        this.workflowAttributes.validation.value = false;
      }
      if (attribute["id"] == this.workflowAttributes.hostname.attributId && (attribute["status"] == "required" || attribute["status"] == "optional")) {
        this.workflowAttributes.hostname.value = true;
        this.workflowAttributes.validation.required = false;
        this.form.get("staticHostname").setValidators(null);
        this.form.get("staticHostname").updateValueAndValidity();

        if (attribute["status"] == "required") {
          this.form.get("staticHostname").setValidators(Validators.required);
          this.form.get("staticHostname").updateValueAndValidity();
          this.workflowAttributes.hostname.required = true;
        }
      } else if (attribute["id"] == this.workflowAttributes.hostname.attributId) {
        this.workflowAttributes.hostname.value = false;
        this.form.get("staticHostname").setValue(null);
        this.form.get("staticHostname").updateValueAndValidity();
        this.form.get("staticHostnameCheckBox").setValue(null);
        this.form.get("staticHostnameCheckBox").updateValueAndValidity();
      }
      if (attribute["id"] == this.workflowAttributes.form.attributId && (attribute["status"] == "required" || attribute["status"] == "optional")) {
        this.workflowAttributes.form.value = true;
        this.workflowAttributes.form.required = false;
        if (attribute["status"] == "required") {
          this.workflowAttributes.form.required = true;
        }
      } else if (attribute["id"] == this.workflowAttributes.form.attributId) {
        this.workflowAttributes.form.value = false;
      }
      if (attribute["id"] == this.workflowAttributes.configurationTemplate.attributId && (attribute["status"] == "required" || attribute["status"] == "optional")) {
        this.workflowAttributes.configurationTemplate.value = true;
        this.workflowAttributes.configurationTemplate.required = false;
        this.form.get("confTemplate").setValidators(null);
        this.form.get("confTemplate").updateValueAndValidity();
        if (attribute["status"] == "required") {
          this.form.get("confTemplate").setValidators(Validators.required);
          this.form.get("confTemplate").updateValueAndValidity();
          this.workflowAttributes.configurationTemplate.required = true;
        }
      } else if (attribute["id"] == this.workflowAttributes.configurationTemplate.attributId) {
        this.workflowAttributes.configurationTemplate.value = false;
        this.form.get("confTemplate").setValue(null);
        this.form.get("confTemplate").updateValueAndValidity();
      }

      if (attribute["id"] == this.workflowAttributes.apiEndpoint.attributId && (attribute["status"] == "required" || attribute["status"] == "optional")) {
        this.workflowAttributes.apiEndpoint.value = true;
        this.workflowAttributes.apiEndpoint.required = false;
        this.form.get("apiEndpoint").setValidators(null);
        this.form.get("apiEndpoint").updateValueAndValidity();
        if (attribute["status"] == "required") {
          this.form.get("apiEndpoint").setValidators(Validators.required);
          this.form.get("apiEndpoint").updateValueAndValidity();
          this.workflowAttributes.apiEndpoint.required = true;
        }
      } else if (attribute["id"] == this.workflowAttributes.apiEndpoint.attributId) {
        this.workflowAttributes.apiEndpoint.value = false;
        this.form.get("apiEndpoint").setValue(null);
        this.form.get("apiEndpoint").updateValueAndValidity();
      }

      if (!attributeIds.includes(attribute["id"])) {
        attributesFromObject.forEach((attributeObject) => {
          if (attribute["id"] == this.workflowAttributes[attributeObject].attributeId) {
            this.workflowAttributes[attributeObject].required = false;
            this.workflowAttributes[attributeObject].value = true;
          }
        })
      }

    });

    if (attributes.length === 0) {
      this.workflowAttributes.configurationTemplate.required = false;
      this.workflowAttributes.configurationTemplate.value = true;
      this.workflowAttributes.form.required = false;
      this.workflowAttributes.form.value = true;
      this.workflowAttributes.validation.required = false;
      this.workflowAttributes.validation.value = true;
      this.workflowAttributes.hostname.required = false;
      this.workflowAttributes.hostname.value = false;
      this.workflowAttributes.apiEndpoint.value = true;
      this.workflowAttributes.apiEndpoint.required = false;
    }
  }
}
