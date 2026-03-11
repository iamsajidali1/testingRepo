import {Component, OnDestroy, OnInit} from '@angular/core';
import {LazyLoadEvent, MessageService} from 'primeng/api';
import {Subscription} from "rxjs";
import {TransactionLogModel} from "../../models/transactionLog.model";
import {tap} from "rxjs/operators";
import {ControllerService} from "../../services/controller.service";

export interface TableHeader {
  field: string;
  dataType: string;
  header: string;
}

@Component({
  selector: 'app-table-monitor',
  templateUrl: './table-monitor.component.html',
  styleUrls: ['./table-monitor.component.scss']
})

export class TableMonitorComponent implements OnInit, OnDestroy {
  loading: boolean = true;
  cols: TableHeader[];
  transactionLogs: TransactionLogModel[];
  selectedLogs: TransactionLogModel[];
  first: number;
  rows: number;
  totalRecords: number;

  subscriptions: Subscription[] = [];
  constructor(private controllerService: ControllerService,
              private messageService: MessageService) {
    // Assign Initial
    this.first = 0;
    this.rows = 10;
    this.totalRecords = 0;
    this.cols = [
      { field: 'transaction_id', dataType: 'String', header: 'Transaction Id' },
      { field: 'customer_name', dataType: 'String', header: 'Customer(BC Id)' },
      { field: 'service_name', dataType: 'String', header: 'Service' },
      { field: 'action_name', dataType: 'String', header: 'Action' },
      { field: 'hostname', dataType: 'String', header: 'Hostname' },
      { field: 'dms_server', dataType: 'String', header: 'Dms Server' },
      { field: 'vendor_type', dataType: 'String', header: 'Vendor Type' },
      { field: 'change_type', dataType: 'String', header: 'Change Type' },
      { field: 'config_mcap_id', dataType: 'String', header: 'MCAP Id' },
      { field: 'step', dataType: 'String', header: 'Step' },
      { field: 'status', dataType: 'String', header: 'Status' },
      { field: 'config_template_name', dataType: 'String', header: 'Config Template(Id)' },
      { field: 'requester', dataType: 'String', header: 'Requester' },
      { field: 'create_date', dataType: 'Date', header: 'Created Date' },
      { field: 'update_date', dataType: 'Date', header: 'Modified Date' }
    ];
  }

  ngOnInit() {}

  private getTransactionLogs(page, limit, sort = {}, filters = {}) {
    this.loading = true;
    this.subscriptions[0] = this.controllerService
      .getTransactionLogs(page, limit, sort, filters)
      .pipe(tap(data => this.totalRecords = data.count))
      .subscribe((logs) => {
        console.log(logs);
        this.loading = false;
        this.transactionLogs = logs.results;
      }, errs => {
        this.loading = false;
        console.log(errs);
        this.transactionLogs = [];
        if(errs.status === 404) {
          this.messageService.add({
            severity: 'error',
            summary: 'Not Found', detail: errs.error.message, sticky: false
          });
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error Message', detail: 'Transaction logs can\'t be loaded!', sticky: true
          });
        }
      })
  }

  loadTransactionLogs(event: LazyLoadEvent) {
    const page = event.first;
    const limit = event.rows;
    const sort = {};
    const filters = {};
    // Check for Sorting Parameters
    if(event.sortField) {
      sort['sortField'] = event.sortField;
      sort['sortOrder'] = event.sortOrder;
    }
    // Check for Filters
    if(!(event.filters // 👈 null and undefined check
      && Object.keys(event.filters).length === 0 && event.filters.constructor === Object)) {
      Object.keys(event.filters).forEach(key => {
        filters[key] = event.filters[key].value;
      })
    }
    this.getTransactionLogs(page, limit, sort, filters);
  }

  // Pagination Functions
  next() {
    this.first = this.first + this.rows;
  }
  prev() {
    this.first = this.first - this.rows;
  }
  reset() {
    this.first = 0;
  }
  isFirstPage(): boolean {
    return this.first === 0;
  }

  ngOnDestroy() {
    this.subscriptions.forEach(subscription => {
      if(subscription) { subscription.unsubscribe(); }
    })
  }
}
