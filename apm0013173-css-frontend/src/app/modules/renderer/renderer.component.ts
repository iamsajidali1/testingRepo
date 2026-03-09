import { Component, OnDestroy, OnInit } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { UtilService } from './services/util.service';
import { Subscription } from 'rxjs';
import { StateService } from './services/state.service';

@Component({
  selector: 'app-renderer',
  templateUrl: './renderer.component.html',
  styleUrls: ['./renderer.component.scss']
})
export class RendererComponent implements OnInit, OnDestroy {
  nuanceInterval: any;
  items: MenuItem[] = [];
  subscriptions: Subscription[] = [];
  constructor(
    private stateService: StateService,
    private utilService: UtilService
  ) {}

  ngOnInit(): void {
    this.utilService.breadCrumbsSubject.subscribe((breadcrumbs) =>
      setTimeout(() => (this.items = breadcrumbs))
    );
    // Set the interval for Nuance chat data Update
    this.nuanceInterval = setInterval(() => {
      const incCssData: any = {};
      const summary: any = this.stateService.summary;
      for (const key in summary) {
        incCssData[key] = summary[key] || 'N/A';
      }
      // Set the Log Url
      incCssData['logUrl'] = this.stateService.transactionId
        ? `${window.location.origin}/api/logs/?transaction_id=${this.stateService.transactionId}&offset=1&limit=100`
        : 'N/A';
      window.incCssData = incCssData;
    }, 1000);
  }

  get transactionId() {
    return this.stateService.transactionId;
  }

  get isTransactionReady() {
    return !!this.stateService.inputParams;
  }

  ngOnDestroy() {
    this.subscriptions.forEach((subscription) => {
      if (subscription) {
        subscription.unsubscribe();
      }
    });
    // Kill the interval once leaving
    if (this.nuanceInterval) {
      console.log('clearing the interval for nuance chat!');
      clearInterval(this.nuanceInterval);
    }
  }
}
