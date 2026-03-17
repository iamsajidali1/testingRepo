import { Component, OnInit } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { UtilService } from '../../services/util.service';
import { StateService } from '../../services/state.service';

@Component({
  selector: 'app-config',
  templateUrl: './config.component.html',
  styleUrls: ['./config.component.scss']
})
export class ConfigComponent implements OnInit {
  items: MenuItem[] = [];
  activeIndex: number;
  constructor(
    private stateService: StateService,
    private utilService: UtilService
  ) {}

  ngOnInit(): void {
    this.stateService.workflowStepChangeObservable.subscribe(() => {
      this.items = this.stateService.workflowSteps;
    });
    this.stateService.inputParametersChangeObservable.subscribe(() => {
      const breadcrumbs: MenuItem[] = [];
      // Checks if `inputParams` has a `customer` property.
      if (this.stateService.inputParams?.customer) {
        // If `customer` exists, push a new breadcrumb with the customer's name and URL containing the customer ID.
        breadcrumbs.push({
          label: this.stateService.inputParams.customer.name, // Customer's name for the breadcrumb label.
          url: `/hello?customerId=${this.stateService.inputParams.customer.id}`, // URL with the customer ID.
          target: '_self' // Ensures navigation occurs within the same tab.
        });
      }
      // Checks if `inputParams` has an `actionType` property.
      if (this.stateService.inputParams?.actionType) {
        // If `actionType` exists, push a new breadcrumb with the action type as the label.
        breadcrumbs.push({
          label: this.stateService.inputParams.actionType, // Action type for the breadcrumb label.
          url: null // No URL is associated with this breadcrumb.
        });
      }
      // Checks if `deviceName` is present in the state service.
      if (this.stateService.deviceName) {
        // If `deviceName` exists, push a new breadcrumb with the device name.
        breadcrumbs.push({ label: this.stateService.deviceName, url: null }); // Device name for the breadcrumb label.
      }
      // Calls `updateBreadcrumbs` to update the breadcrumb trail based on the current state.
      // Passes the `breadcrumbs` array and a flag indicating if the user is a BC user.
      this.utilService.updateBreadcrumbs(
        breadcrumbs,
        this.stateService.isBcUser
      );
    });
  }
}
