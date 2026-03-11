import {Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges} from '@angular/core';
import {ApiConnectService} from '../../template-manager/api-connect.service';
import {Subscription} from 'rxjs';

@Component({
  selector: 'app-device-mgmt',
  templateUrl: './device-mgmt.component.html',
  styleUrls: ['./device-mgmt.component.css']
})
export class DeviceMgmtComponent implements OnInit, OnChanges, OnDestroy {
  @Input() selectedCustomer: any = null;
  showDevicesWithIssues = true;
  loading: boolean;
  devices: any[] = [];
  devicesWithIssues: any[] = [];
  subscriptions: Subscription[] = [];
  constructor(private apiConnectionService: ApiConnectService) { }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges) {
    const { selectedCustomer } = changes;
    if ('id' in selectedCustomer.currentValue) {
      this.loadDevices(selectedCustomer.currentValue.id)
    }
  }

  sortDevicesWithIssues(devices: any[]) {
    const devicesWithIssues = [];
    devices.forEach(device => {
      const issues = [];
      // Check if Address
      if(!device.ADDRESS) {
        issues.push({
          severity: 'warning',
          message: 'The device does not have a valid Address!'
        });
      }
      // Check for Vendor
      if(!device.VENDOR) {
        issues.push({
          severity: 'danger',
          message: 'The device is missing Vendor information!'
        });
      }
      // Check for Service
      if(!device.SERVICE) {
        issues.push({
          severity: 'danger',
          message: 'Service line is missing for this device!'
        });
      }
      // Push this if any issues are found
      if(issues.length) {
        devicesWithIssues.push({ ... device, issues});
      }
    });
    return devicesWithIssues;
  }

  loadDevices(customerId: number) {
    this.loading = true;
    const subscription = this.apiConnectionService
      .getHostnamesByCustomer(customerId)
      .subscribe(devices => {
        this.devices = devices;
        this.devicesWithIssues = this.sortDevicesWithIssues(devices);
        this.loading = false;
        }, error => {
        console.error(error);
        this.devices = [];
        this.loading = false;
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
