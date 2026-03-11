import { Component, OnInit, OnChanges, ViewChild, ComponentFactoryResolver, ComponentRef, ViewContainerRef } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ApiConnectService } from '../api-connect.service';
import { ContentType } from '../models/conf-template-models/content-type'
import { TemplateType } from '../models/conf-template-models/template-type'
import { VendorType } from '../models/conf-template-models/vendor-type'
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TemplateeEdited } from '../models/TemplateeEdited';
import { ActivatedRoute } from '@angular/router';
import { MessageService, SelectItem } from 'primeng/api';
import { ControllerService } from '../../services/controller.service'
import { Customer } from '../models/customerModel'
import { Service } from '../models/serviceModel'
import { TemplateTypes } from '../models/enums/templateTypes'
import { ContentTypes } from '../models/enums/contentType'
import { IConfigTemplateRequest, IConfigTemplateResponse } from '../models/configTemplate'


@Component({
  selector: 'app-add-template',
  templateUrl: './add-template.component.html',
  styleUrls: ['./add-template.component.scss']
})
export class AddTemplateComponent implements OnInit {
  body = '';
  contractids: string[] = [];
  contractid = '';
  name = '';
  form: FormGroup;
  //templateeEdited: TemplateeEdited;
  templateeEdited: IConfigTemplateResponse;
  formatTypes: SelectItem[];
  contentTypes: ContentType[];
  templateTypes: TemplateType[];
  vendorTypes: VendorType[];
  customers: Customer[];
  services: Service[];
  displayErrorMsg: boolean = false;
  showSpinner: boolean = false;
  disableCustomer: boolean = false;


  constructor(public activeModal: NgbActiveModal,
    private apiConnectService: ApiConnectService,
    private fb: FormBuilder,
    private activatedRoute: ActivatedRoute,
    private messageService: MessageService,
    private controllerService: ControllerService) {
    this.form = fb.group({
      contractid: [null],
      service: [null],
      name: [null, Validators.compose([Validators.required, Validators.minLength(5)])],
      body: [this.body, Validators.required],
      deviceModel: [null, Validators.required],
      templateType: [null, Validators.required],
      vendorType: [null, Validators.required]
    });
  }

  ngOnInit() {
    this.loadTemplateDeviceModel();
    this.loadTemplateTypes();
    this.loadTemplateVendorTypes();
    this.loadCustomers();
    this.loadServices();
  }

  /**
   * Load all avaliable Device models
   */
  private loadTemplateDeviceModel(): void {
    this.apiConnectService.getTemplateContentTypes().subscribe(contentTypes => {
      this.contentTypes = contentTypes;
    }, error => {
      this.messageService.add({ severity: 'error', summary: 'Error Message', detail: 'Unable to load template content types', sticky: true });
    });
  }

  /**
   * Load all avaliable customers
   */
  private loadCustomers(): void {
    const status = true;
    this.controllerService.getCustomersByStatus(status).subscribe(customers => {
      this.customers = customers['result'];
      this.getSelectedCustomerIDFromQuery();
    }, error => {
      this.messageService.add({ severity: 'error', summary: 'Error Message', detail: 'Unable to load customers', sticky: true });
    });
  }

  /**
   * Load all avaliable services
   */
  private loadServices(): void {
    this.controllerService.getServices().subscribe(services => {
      this.services = services['result'];
    }, error => {
      this.messageService.add({ severity: 'error', summary: 'Error Message', detail: 'Unable to load services', sticky: true });
    });
  }

  /**
   * Load al template types
   */
  private loadTemplateTypes(): void {
    this.apiConnectService.getTemplateTypes().subscribe(templateTypes => {
      this.templateTypes = templateTypes;
    }, error => {
      this.messageService.add({ severity: 'error', summary: 'Error Message', detail: 'Unable to load template template types', sticky: true });
    });
  }

  /**
   * Load all avaliable template vendors
   */
  private loadTemplateVendorTypes(): void {
    this.apiConnectService.getTemplateVendorTypes().subscribe(vendorTypes => {
      this.vendorTypes = vendorTypes;
    }, error => {
      this.messageService.add({ severity: 'error', summary: 'Error Message', detail: 'Unable to load template vendor types', sticky: true });
    });
  }

  /**
   * Upload template from file
   * @param event
   */
  public fileUpload(event): void {
    const reader: FileReader = new FileReader();
    reader.readAsText(event.target.files[0]);
    const newForm = this.form;
    const msgService = this.messageService;
    reader.onload = ev => {
      newForm.get('body').setValue(ev['explicitOriginalTarget']['result']);
      msgService.add({ severity: 'info', summary: 'File Uploaded!', detail: 'File ' + event.target.files[0]['name'] + ' is successfully uploaded!' });
    };
  }

  /**
   * Load selected customer from query
   */
  public getSelectedCustomerIDFromQuery(): void {
    this.activatedRoute.queryParams.subscribe(queryParams => {
      if (queryParams['customerId'] && queryParams['customerName']) {
        this.disableCustomer = true;
        this.form.get('contractid').setValue({
          id: Number(atob(queryParams['customerId'])),
          name: atob(queryParams['customerName']),
          bcCompanyId: atob(queryParams['bcCompanyId']),
          bcName: atob(queryParams['bcName']),
          active: Boolean(atob(queryParams['active']))
        });
        //console.log(this.form.get('contractid').value);
        //console.log(this.customers);
        this.getServicesToCustomerById(Number(atob(queryParams['customerId'])));
      } else {
        this.disableCustomer = false;
      }
    });
  }

  public onCustomer(event): void {
    if (this.form.get('contractid').value) {
      this.displayErrorMsg = false;
    }
    if (event.value && event.value.id) {
      this.getServicesToCustomerById(event.value.id);
    }

  }

  getServicesToCustomerById(customerId) {
    this.controllerService.getServiceToCustomerById(customerId).subscribe(customerToService => {
      this.services = [];
      if (customerToService['services'] || customerToService['services'].length > 0) {
        customerToService['services'].map(cToS => {
          this.services.push({
            "id": cToS.id,
            "serviceName": cToS.serviceName
          });
        });
      }
    }, error => {
      this.messageService.add({ severity: 'error', summary: 'Error Message', detail: 'Unable to load service type by customer', sticky: true });
    });
  }


  public onService(event): void {
    if (this.form.get('service').value) {
      this.displayErrorMsg = false;
    }
  }

  /**
   * Create carche template (important regex do no touch!!!!  \[/gi))
   */
  public add(): void {
    this.showSpinner = true;
    if (!this.validateForm()) {
      this.showSpinner = false;
      return;
    }
  
    const formObj = this.form.getRawValue();
  
    if (formObj.deviceModel.contentType === ContentTypes.json && formObj.templateType.id === TemplateTypes.carche) {
      formObj.body = this.processBody(formObj.body);
    }
  
    formObj.body = btoa(formObj.body);
  
    const template: IConfigTemplateRequest = this.createTemplateRequest(formObj);
  
    this.apiConnectService.addcArcheTempalte(JSON.stringify(template)).subscribe(
      (result) => {
        this.handleSuccess(result, formObj);
      },
      (error) => {
        this.handleError(error);
      }
    );
  }

  private validateForm(): boolean {
    if (!this.form.valid) {
      this.displayErrorMsg = true;
      return false;
    }
  
    if (!this.form.get('contractid').value && !this.form.get('service').value) {
      this.displayErrorMsg = true;
      return false;
    }
  
    this.displayErrorMsg = false;
    return true;
  }

  private processBody(body: string): string {
    body = this.escapeSpecialCharacters(body, /\[[A-Za-z<>\{\}\[\]].*?\]/gm, '\\]');
    body = this.escapeSpecialCharacters(body, /\{[\{\}\[\]A-Za-z<>].*?\}/gm, '\\}');
    body = body.replace(/\{(?![A-Za-z]|[<>\{\}\[\]])/gm, '\\{');
    body = body.replace(/\[(?![A-Za-z]|[<>\[\]\{\}])/gm, '\\[');
    return body;
  }

  private escapeSpecialCharacters(body: string, regex: RegExp, replacement: string): string {
    const occurrences = body.match(regex);
    if (occurrences) {
      const hashMap = {};
      occurrences.forEach((occurrence, index) => {
        hashMap[`function${index}`] = occurrence;
        body = body.replace(occurrence, `function${index}`);
      });
      body = body.replace(new RegExp(replacement, 'g'), replacement);
      occurrences.forEach((_, index) => {
        body = body.replace(`function${index}`, hashMap[`function${index}`]);
      });
    } else {
      body = body.replace(new RegExp(replacement, 'g'), replacement);
    }
    return body;
  }

  private createTemplateRequest(formObj: any): IConfigTemplateRequest {
    const template: IConfigTemplateRequest = {
      name: formObj.name,
      body: formObj.body,
      deviceModel: formObj.deviceModel.id,
      version: 1,
      templateType: formObj.templateType.id,
      vendorType: formObj.vendorType.id,
    };
  
    if (formObj.contractid) {
      template.contractid = formObj.contractid.id;
    }
    if (formObj.service) {
      template.service = formObj.service.id;
    }
  
    return template;
  }
  
  private handleSuccess(result: any, formObj: any): void {
  this.showSpinner = false;
  this.templateeEdited = result;
  this.activeModal.close({
    name: formObj.name,
    contractid: formObj.contractid,
    service: formObj.service,
    id: result['id'],
  });
  this.activeModal.dismiss({
    name: formObj.name,
    contractid: formObj.contractid,
    service: formObj.service,
    id: result['id'],
  });
  }

  private handleError(error: any): void {
    this.showSpinner = false;
    console.error(error);
    this.messageService.add({
      severity: 'error',
      summary: 'Error Message',
      detail: 'Unable to create template',
      sticky: true,
    });
  }
}