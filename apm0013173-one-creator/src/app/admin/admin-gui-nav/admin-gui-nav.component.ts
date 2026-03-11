import {Component, OnInit, Output, ViewEncapsulation, OnChanges, OnDestroy} from '@angular/core';
import { SelectItem, MessageService } from 'primeng/api';
import { FormGroup, FormBuilder, FormControl, Validators } from '@angular/forms';
import {Subscription} from 'rxjs';
import {ControllerService} from '../../services/controller.service';
import {ApiConnectService} from '../../template-manager/api-connect.service';

@Component({
  selector: 'app-admin-gui-nav',
  templateUrl: './admin-gui-nav.component.html',
  styleUrls: ['./admin-gui-nav.component.scss'],
  encapsulation: ViewEncapsulation.None
})

export class AdminGuiNavComponent implements OnInit, OnChanges, OnDestroy {
  @Output() index = 0;
  customers: SelectItem[] = [];
  selectedCustomer: any = {};
  selectedService: any = {};
  showSpinner = true;
  filteredCustomers: SelectItem[] = [];
  customerForm: FormGroup;
  serviceForm: FormGroup;
  modalVisible = false;
  services: any = [];
  modalServiceVisible: boolean;
  filteredServices: any[];

  subscriptions: Subscription[] = [];
  constructor(private controllerService: ControllerService, private fb: FormBuilder, private apiService: ApiConnectService, private messageService: MessageService){
    this.customerForm = this.fb.group({
      name: new FormControl('', Validators.required)
    });

    this.serviceForm = this.fb.group({
      serviceName: new FormControl('', Validators.required)
    });
  }

  ngOnInit() {
    this.loadCustomers();
    this.loadServices();
  }

  ngOnChanges(){
    this.loadCustomers();
    this.loadServices();
  }

  get customer() {
    return (this.selectedCustomer &&
      Object.keys(this.selectedCustomer).length === 0 &&
      Object.getPrototypeOf(this.selectedCustomer) === Object.prototype) ? null : this.selectedCustomer;
  }

  /**
   * Load customers for left side menu
   */
  public loadCustomers():void{
    this.controllerService.getCustomersFromDB().subscribe(customers => {
      this.customers = [];
      // tslint:disable-next-line:prefer-for-of
      for (let i = 0; i < customers.length; i++) {
        this.customers.push({label: customers[i].name, value: {
            id: customers[i].id,
            name: customers[i].name
          }
        });
      }
      this.showSpinner = false;
    }, err=>{
      this.messageService.add({severity:'error', summary:'Service Message', detail:'Error when customer loading!'});
      this.showSpinner = false;
    });
  }


  public loadServices(): void {
    this.controllerService.getServices().subscribe((services)=>{
      this.services = services['result']
    });
  }


  /**
   * Handling visualization of customers left side menu
   * @params event
   */
  public handleChange(event): void {
    this.index = event.index;
  }

  /**
   * search in customer
   * @params event
   */
  public search(event): void{
    const query = event.query;
    this.filteredCustomers = this.filterCustomer(query, this.customers);
    // this.customers = this.formatCustomer(this.filteredCustomers);
  }

  /**
   * search in customer
   * @params query
   * @params customers
   */
  public filterCustomer(query, customers): any[] {
    const filtered: any[] = [];
    // tslint:disable-next-line:prefer-for-of
    for (let i = 0; i < customers.length; i++) {
      const customer = customers[i];
      if (customer.hasOwnProperty('label') && customer.hasOwnProperty('value')) {
        if (customer['label'].toLowerCase().indexOf(query.toLowerCase()) === 0) {
          filtered.push({ name: customer['label'], id: customer['value'] });
        }
      }
    }
    return filtered;
  }

  /**
   * convert selected customer form autocomplete to right format for all components which is using this varible
   * @params event
   */
  public change(event): void{
    this.selectedCustomer = { name: event['name'], id: event['id']['id'] };
  }

  public selectService(event): void {
    this.selectedService = { serviceName: event['value']['serviceName'], id: event['value']['id'] };
  }

  public searchService(event): void{
    const query = event.query;
    this.filteredServices = this.filterService(query, this.services);
  }

  /**
   * search in customer
   * @params query
   * @params services
   */
  public filterService(query, services): any[] {
    const filtered: any[] = [];
    // tslint:disable-next-line:prefer-for-of
    for (let i = 0; i < services.length; i++) {
      const service = services[i];
      if (service.hasOwnProperty('label') && service.hasOwnProperty('value')) {
        if (service['label'].toLowerCase().indexOf(query.toLowerCase()) === 0) {
          filtered.push({ name: service['label'], id: service['value'] });
        }
      }
    }
    return filtered;
  }

  /**
   * open modal for create customer
   */
  public createCustomer(): void{
    this.modalVisible = true;
  }

  public createService(): void{
    this.modalServiceVisible = true;
  }

  /**
   * save and create customer
   */
  public save(): void{
    if(!this.customerForm.valid) { return; }
    const customer = {
      name : this.customerForm.get('name').value,
      bcCompanyId: '',
      bcName: '',
      active: true
    }
    this.subscriptions[0] = this.controllerService
      .createCustomers(customer)
      .subscribe(() => {
        this.customerForm.reset();
        this.messageService.add({severity:'success', summary:'Service Message', detail:'Customer successfully created!'});
        this.loadCustomers();
      }, error =>{
        this.messageService.add({severity:'error', summary:'Service Message', detail:'Error while creating the customer!'});
      });
    this.modalVisible = false;
  }

  saveService(){
    this.subscriptions[1] = this.controllerService
      .saveService(this.serviceForm.value)
      .subscribe((service)=>{
        this.serviceForm.reset();
        this.loadServices();
        this.closeDialogService();
        this.messageService.add({severity:'success', summary:'Service Message', detail:'Service successfully created!'});
      }, err => {
        console.error(err);
        this.messageService.add({severity: 'error', summary:'Service Message', detail:'Error while creating the service!'});
      });
    this.modalServiceVisible = false;
  }

  /**
   * close dialog and clear customer form
   */
  public closeDialog(): void{
    this.modalVisible = false;
    this.customerForm.reset();
  }

  public closeDialogService(): void{
    this.modalServiceVisible = false;
    this.serviceForm.reset();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(subscription => {
      if(subscription) {
        subscription.unsubscribe();
      }
    })
  }
}
