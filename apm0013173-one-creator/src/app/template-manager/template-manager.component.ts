import { Component, OnInit } from '@angular/core';
import { Template } from './models/template';
import {ActivatedRoute} from '@angular/router';

@Component({
  selector: 'app-template-manager',
  templateUrl: './template-manager.component.html',
  styleUrls: ['./template-manager.component.scss']
})

export class TemplateManagerComponent implements OnInit {
  contractid = '';
  refresh = '';
  template: Template;
  deletedTemplate: any;
  showSpinner: boolean;
  copiedTemplate: any;

  constructor(private activatedRoute: ActivatedRoute){}

  ngOnInit(){
    this.showSpinner = true;
    this.getSelectedCustomerFromQuery();
  }
  sendTemplate(template: any){
    this.showSpinner = true;
    this.template = template;
  }

  /**
   * Change status of spinner when app perform actions
   * @params $event
   */
  public spinnerStatus($event: any): void{
    this.showSpinner = $event;
  }

  /**
   * Sending context of deleted carche template from edit component to list-templates component
   * @params deletedTemplate
   */
  public deleteTemplateEvent(deletedTemplate: any): void{
    this.template = undefined;
    this.deletedTemplate = deletedTemplate;
  }

  public copyTemplateEvent(copiedTemplate: any){
    this.copiedTemplate = copiedTemplate;
  }

  /**
   * Load customer name and external customer id from query params
   */
  private getSelectedCustomerFromQuery(): void {
    this.activatedRoute.queryParams.subscribe(queryParams => {
      if (queryParams['customerName'] && atob(queryParams['customerId'])) {
        this.showSpinner = true;
      }
    });
  }
}

