import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { MessageService, ConfirmationService } from 'primeng/api';
import {ControllerService} from '../../services/controller.service';

@Component({
  selector: 'app-service-administration',
  templateUrl: './service-administration.component.html',
  styleUrls: ['./service-administration.component.css']
})
export class ServiceAdministrationComponent implements OnInit {
  @Input() selectedService: any = {};
  @Output() eventEmitter = new EventEmitter<any>();
  form: FormGroup;
  services: any = [];
  service: any = {};
  isDisabled = true;
  showSpinner: boolean = false;
  attributeList: any = null;
  assignedAttributes: any = null;

  constructor(private controllerService: ControllerService,
    private fb: FormBuilder,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    ) {
    this.form = this.fb.group({
      serviceName: new FormControl('', Validators.required),
      serviceAttribute: new FormControl('', Validators.required)
    });
  }

  ngOnInit(): void {
    this.isDisabled = Object.keys(this.selectedService).length === 0;
  }

  ngOnChanges() {
    this.attributeList = null;
    this.assignedAttributes = null;
    this.isDisabled = Object.keys(this.selectedService).length === 0;
    this.loadService();
    if(this.selectedService && this.selectedService['serviceName']){
      this.loadAllAttributesForService();
      this.loadAssignedAttributes(this.selectedService['id']);
    }
  }

  public loadService(): void{
    this.form.get('serviceName').setValue(this.selectedService['serviceName']);
    this.service = this.selectedService;
  }

  // update service properties (now only name)
  public updateService(): void{
    if(this.form.controls['serviceName'].valid){
      this.showSpinner = true;
      this.controllerService.updateService(this.selectedService['id'],this.form.get('serviceName').value).subscribe((service)=>{
        this.showSpinner = false;
        this.messageService.add({ severity: 'success', summary: 'Service properties is successfully updated!', detail:'' });
      }, error =>{
        this.showSpinner = false;
        this.messageService.add({ severity: 'error', summary: 'Error when updating service propeties!' });
      });
    } else {
      this.form.controls['serviceName'].markAsDirty();
      this.form.controls['serviceName'].markAsTouched();
    }
  }

  public spinnerChange(event): void{
    this.showSpinner = event;
  }

  // load all avaliable attributes which can be assigned to service
  private loadAllAttributesForService(): void{
    this.showSpinner = true;
    this.controllerService.loadAllAttributesForService().subscribe(attributes => {
      this.attributeList = attributes["result"];
      this.showSpinner = false;
    }, error =>{
      this.showSpinner = false;
      this.messageService.add({ severity: 'error', summary: 'Error when loading attributes!' });
    });
  }

  // load all relationships between attribute and service
  private loadAssignedAttributes(serviceId: string): void {
    this.showSpinner = true;
    this.controllerService.loadAssignedAttributesForService(serviceId).subscribe(attributes => {
      this.assignedAttributes = attributes["result"];
      this.showSpinner = false;
    }, error =>{
      this.showSpinner = false;
      this.messageService.add({ severity: 'error', summary: 'Error when loading attributes for service!' });
    });
  }

  // create relationship between attribute and service
  public addAttribute(): void{
    if(this.form.controls['serviceAttribute'].valid){
      this.showSpinner = true;
      const serviceId = this.selectedService['id'];
      const attributeId = this.form.get("serviceAttribute").value["id"];
      this.controllerService.assigneAttributeForService(serviceId, attributeId).subscribe(result => {
        this.messageService.add({
          severity: 'success',
          summary: 'Successfull assigned',
          detail: 'Attribute is successfully assigned!'
        });
        this.assignedAttributes.push({ id: attributeId, name : this.form.get("serviceAttribute").value["name"] });
        this.form.controls['serviceAttribute'].reset();
        this.showSpinner = false;
      }, error =>{
        this.form.controls['serviceAttribute'].reset();
        this.showSpinner = false;
        this.messageService.add({ severity: 'error', summary: 'Error when assigning attribute for service!' });
      });
    } else {
      this.form.controls['serviceAttribute'].markAsDirty();
      this.form.controls['serviceAttribute'].markAsTouched();
    }
  }

  // delete relationship between attribute and service
  public removeAttribute(attribute): void {
    if(attribute){
      this.confirmationService.confirm({
        icon: 'pi pi-exclamation-triangle',
        header: 'Confirmation',
        message: 'Are you sure that you want to delete ' + attribute['name'] + ' attribute ?',
        accept: () => {
          this.showSpinner = true;
          const serviceId = this.selectedService['id'];
          const attributeId = attribute["id"];
          this.controllerService.deleteAttributeForService(serviceId, attributeId).subscribe(result => {
            this.messageService.add({
              severity: 'success',
              summary: 'Successfull deleted',
              detail: 'Attribute is successfully deleted!'
            });
            const check = (attribute) => attribute['id'] == attributeId;
            const index = this.assignedAttributes.findIndex(check);
            this.assignedAttributes.splice(index, 1);
            this.showSpinner = false;
          }, error =>{
            this.showSpinner = false;
            this.messageService.add({ severity: 'error', summary: 'Error when deleting attribute for service!' });
          });
        }
      });
    }
  }
}
