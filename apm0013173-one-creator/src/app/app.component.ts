import { Component, OnInit } from '@angular/core';
import { User } from './models/user';
import { Router, ActivatedRoute, Params } from '@angular/router';
import { ControllerService } from './services/controller.service';
import { MatomoInjector } from 'ngx-matomo';
import { environment } from '../environments/environment'
import { MatomoTracker } from 'ngx-matomo';
import { TabButtonServiceService } from './services/tab-button-service.service';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})

export class AppComponent implements OnInit {
  user: User;
  customers: any = [];
  year: string;
  customerServices: any[] = [];
  // change from CustomerSchema object to any because result form API ic change from string to integer
  selectedCustomer: any = { name: '', external_customer_id: 0, bc_company_id: '', bc_name: '', active: '' };
  queryParams: Params = Object.assign({});
  authorized = false;
  message: { h1: string, h3: string };

  constructor(private controllerService: ControllerService, private activatedRoute: ActivatedRoute, private router: Router,
              private matomoInjector: MatomoInjector, private matomoTracker: MatomoTracker, private tabService: TabButtonServiceService, ) {
    this.year = new Date().getFullYear().toString();
  }

  ngOnInit() {
    this.loadCustomerFromDb();
    this.user = this.controllerService.getUserInfo();
    // For debug
    // console.log(osEnvVar.virtualPath);

    this.getSelectedCustomerFromQuery();
    this.authorized = true;
    this.matomoInjector.init(environment.API_MATOMO, parseInt(environment.MATOMO_SITE_ID, 10));
    if (this.user && this.user.attid) {
      this.matomoTracker.setUserId(this.user.attid);
      this.matomoTracker.setDocumentTitle('ONE');
    }
  }

  /**
   * Load customer name and external customer id from qeury params
   */
  private getSelectedCustomerFromQuery(): void {
    this.activatedRoute.queryParams.subscribe(queryParams => {
      if (queryParams['customerName'] && atob(queryParams['customerId'])) {
        this.selectedCustomer.name = atob(queryParams['customerName']);
        this.selectedCustomer.external_customer_id = Number(atob(queryParams['customerId']));
        this.selectedCustomer.bc_company_id = atob(queryParams['bcCompanyId']);
        this.selectedCustomer.bc_name = atob(queryParams['bcName']);
        this.selectedCustomer.active = atob(queryParams['active']);
        this.queryParams = Object.assign({});
        this.queryParams = queryParams;
      }
    });
  }

  /**
   * Add selected customer from dropdown navbar menu to query
   * @params event
   */
  public selectCustomer(event): void {
    this.queryParams = Object.assign({});
    this.queryParams['customerName'] = btoa(event.value.name);
    this.queryParams['customerId'] = btoa(event.value.external_customer_id);
    this.queryParams['bcCompanyId'] = btoa(event.value.bc_company_id);
    this.queryParams['bcName'] = btoa(event.value.bc_name);
    this.queryParams['active'] = btoa(event.value.active);
    this.router.navigate([window.location.href], { queryParams: this.queryParams });
    this.getCustomerServices(this.selectedCustomer.external_customer_id);
    this.tabService.announceCustomerChanged(event.value.external_customer_id);
  }

  /**
   * Load customer services by external customer id
   */
  private getCustomerServices(customerId: string): void {
    this.controllerService.getServiceToCustomerById(customerId).subscribe(services => {
      this.customerServices = services;
    });
  }

  /**
   * Deselect option and selected customer in header dropdown
   */
  public deselectOption(): void {
    this.queryParams = Object.assign({});
    this.router.navigate([], { queryParams: this.queryParams });
    this.selectedCustomer = {
      name: '', external_customer_id: '',
      bc_company_id: '', bc_name: '', active: ''
    };
  }


  /**
   * This function is load all customer from database
   */
  private async asynfunloadCustomerFromDb() {
    const custReMaped = [];
    const customerFromDB = await this.controllerService.getCustomersFromDB().toPromise().catch(
      err => {
        if(err.status === 401 && err.statusText === 'Unauthorized'){
          this.authorized = false;
          this.message = {
            h1: 'Not Authorized',
            h3: 'Please contact system administrator'
          };
        }
        console.log(err);
        throw new Error('Internal error');
      }
    );

    customerFromDB.map(customer => {
      custReMaped.push({
        name: customer.name, external_customer_id: customer.id,
        bc_company_id: customer.bcCompanyId, bc_name: customer.bcName, active: customer.active
      });
    });
    return custReMaped;
  }

  /**
   * This function is used to display the data from asynchrones function
   */
  private loadCustomerFromDb() {
    this.customers = [];
    this.asynfunloadCustomerFromDb().then(response => {
        this.customers = response;
        this.getSelectedCustomerFromQuery();
      }
    ).catch(err => {
      console.log(err);
    });
  }

}
