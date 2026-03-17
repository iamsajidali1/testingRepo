import { Component, OnDestroy, OnInit } from '@angular/core';
import { finalize, Subscription } from 'rxjs';
import { LandingService } from '../../services/landing.service';
import { UtilService } from '../../services/util.service';
import { ActivatedRoute, Router } from '@angular/router';
import { IdNameModel } from '../../models/utils.model';
import { StateService } from '../../services/state.service';
import { InitService } from '../../../../services/init.service';
import { UserModel } from '../../../../models/user.model';
import {
  animate,
  state,
  style,
  transition,
  trigger
} from '@angular/animations';

@Component({
  selector: 'app-landing',
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss'],
  animations: [
    trigger('greetingAnimation', [
      state(
        'hide',
        style({
          visibility: 'hidden',
          height: '0'
        })
      ),
      state(
        'show',
        style({
          height: '6rem'
        })
      ),
      transition('* => *', animate(150))
    ])
  ]
})
export class LandingComponent implements OnInit, OnDestroy {
  activeIndex: number;
  text: IdNameModel | undefined;
  component: string = 'landing';
  greetings: 'show' | 'hide' = 'show';
  results: string[] = [];
  customer: IdNameModel | undefined;
  customers: IdNameModel[] = [];
  loaders: any = {};
  errors: any = {};
  isLoading: boolean = false;
  isBcUser: boolean = false;
  userDetails: UserModel;
  subscriptions: Subscription[] = [];
  constructor(
    private landingService: LandingService,
    private stateService: StateService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private initService: InitService,
    private utilService: UtilService
  ) {
    this.activeIndex = 0;
    this.userDetails = initService.userDetails;
    this.isBcUser = this.stateService.isBcUser;
    this.utilService.updateBreadcrumbs([], this.isBcUser);
    this.router.routeReuseStrategy.shouldReuseRoute = () => false;
    this.stateService.resetState();
  }

  ngOnInit(): void {
    // Get the Customers once Component Loads
    this.isBcUser
      ? this.getCustomerForBcUser()
      : this.getCustomers(this.initService.userId);
  }

  getCustomers(userId: string) {
    this.loaders.customers = true;
    const subscription = this.landingService
      .getCustomersForUser(userId)
      .pipe(finalize(() => (this.loaders.customers = false)))
      .subscribe({
        next: (customers: any) => {
          // Assign the fetched customers array to the component's `customers` property.
          this.customers = customers;
          // Extract the `customerId` from the current route's query parameters.
          const { customerId } = this.activatedRoute.snapshot.queryParams;
          // Check if a `customerId` is present in the query parameters.
          if (customerId) {
            // Find the customer in the `customers` array whose `id` matches the `customerId` from the query parameters.
            // Parse `customerId` to an integer as `customer.id` is expected to be a number.
            const customer = this.customers.find(
              (customer) => customer.id === parseInt(customerId)
            );
            // Check if a matching customer was found.
            if (customer) {
              // Set the found customer as the selected customer in the `text` property.
              this.text = customer;
              // Trigger the `onCustomerPicked` method with the found customer, updating the UI and internal state accordingly.
              this.onCustomerPicked({
                id: customer.id,
                name: customer.name
              });
            }
          }
        },
        error: (error) => console.error(error)
      });
    this.subscriptions.push(subscription);
  }

  getCustomerForBcUser() {
    this.loaders.customerForBc = true;
    const subscription = this.landingService
      .getCustomerForBcUser()
      .pipe(finalize(() => (this.loaders.customerForBc = false)))
      .subscribe({
        next: (customer: any) => {
          this.customers = [customer];
          this.onCustomerPicked({
            id: customer.id,
            name: customer.name
          });
        },
        error: (error) => console.error(error)
      });
    this.subscriptions.push(subscription);
  }

  search(event: any) {
    const filtered: any[] = [];
    const query = event.query;
    this.customers.forEach((customer) => {
      if (customer.name?.toLowerCase().indexOf(query.toLowerCase()) >= 0) {
        filtered.push(customer);
      }
    });
    this.results = filtered;
  }

  onResetCustomer() {
    this.text = undefined;
    this.results = [];
    this.customer = undefined;
    this.greetings = 'show';
    window.history.pushState({}, '', `hello`);
  }

  onCustomerPicked(customer: IdNameModel) {
    this.customer = customer;
    this.greetings = 'hide';
    window.history.pushState({}, '', `hello?customerId=${customer.id}`);
  }

  ngOnDestroy() {
    this.subscriptions.forEach((subscription) => {
      if (subscription) {
        subscription.unsubscribe();
      }
    });
  }
}
