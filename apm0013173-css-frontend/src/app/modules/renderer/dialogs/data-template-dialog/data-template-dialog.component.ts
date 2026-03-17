import { Component, OnDestroy, OnInit } from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { finalize, Subscription } from 'rxjs';
import { CoreService } from '../../services/core.service';

@Component({
  selector: 'app-data-template-dialog',
  templateUrl: './data-template-dialog.component.html',
  styleUrls: ['./data-template-dialog.component.scss']
})
export class DataTemplateDialogComponent implements OnInit, OnDestroy {
  action: 'save' | 'import';
  isLoading: boolean;
  mergeChecked: boolean;
  name: string;
  data: any = {};
  selectedRow: any;
  templates: any[] = [1, 2, 3];
  subscriptions: Subscription[] = [];
  constructor(
    public dialogRef: DynamicDialogRef,
    public config: DynamicDialogConfig,
    private coreService: CoreService
  ) {
    this.action = this.config.data?.action;
    this.data = this.config.data?.data;
  }

  ngOnInit(): void {
    if (this.action === 'import') this.loadTemplates();
  }

  loadTemplates() {
    this.isLoading = true;
    const subscription = this.coreService
      .loadDataTemplates(this.data.actionId)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (result) => (this.templates = result),
        error: (error) => console.error(error)
      });
    this.subscriptions.push(subscription);
  }

  saveTemplate() {
    this.isLoading = true;
    const data = { name: this.name, ...this.data };
    const subscription = this.coreService
      .saveDataTemplate(data)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (result) => this.dialogRef.close(result),
        error: (error) => console.error(error)
      });
    this.subscriptions.push(subscription);
  }

  importTemplate() {
    const data = {
      strategy: this.mergeChecked ? 'Merge' : 'Replace',
      data: JSON.parse(this.selectedRow.data)
    };
    this.dialogRef.close(data);
  }

  ngOnDestroy() {
    this.subscriptions.forEach((subscription) => {
      if (subscription) {
        subscription.unsubscribe();
      }
    });
  }
}
