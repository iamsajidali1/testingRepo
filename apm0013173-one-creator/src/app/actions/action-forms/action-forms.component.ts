import {Component, OnDestroy, OnInit} from '@angular/core';
import {ActionService} from '../action.service';
import {Subscription} from 'rxjs';
import {MenuItem, MessageService} from 'primeng/api';
import {DialogService} from 'primeng/dynamicdialog';
import {FormsDialogComponent} from './forms-dialog/forms-dialog.component';
import {DefaultSchema, DropdownSchema, MessageSchema, TextBoxSchema} from './action-forms.schema';
import {finalize} from 'rxjs/operators';

import * as Ajv from 'ajv';
import {ControllerService} from '../../services/controller.service';

@Component({
  selector: 'app-action-forms',
  templateUrl: './action-forms.component.html',
  styleUrls: ['./action-forms.component.css']
})
export class ActionFormsComponent implements OnInit, OnDestroy {
  isSaving: boolean;
  isFormLoaded: boolean;
  shouldPreview: boolean;
  isContentReadOnly: boolean;
  isFormSkeletonValid: boolean;
  originalFormSkeleton: string;
  updatedFormSkeleton: string;
  questions: any;
  editorOptions: any;
  selectedDesignType: string;
  attributes: any[];
  designTypes: any[] = [];
  validationErrors: any[] = [];
  draggedControl: MenuItem;
  availableControls: MenuItem[] = [];
  subscriptions: Subscription[] = [];
  constructor(private actionService: ActionService,
              private controller: ControllerService,
              private dialogService: DialogService,
              private messageService: MessageService) {
    this.designTypes = [
      { label: 'Basic', value: 'Basic' },
      { label: 'Advanced', value: 'Advanced' }
    ];
    // Set the default design window
    this.selectedDesignType = 'Basic';
    this.shouldPreview = false;
    // Set the Available Designs
    this.availableControls = [
      { icon: 'fa fa-comment-alt', label: 'Message', id: 'message', disabled: false },
      { icon: 'fa fa-edit', label: 'Input TextBox', id: 'textbox', disabled: false },
      { icon: 'fa fa-caret-square-down', label: 'Dropdown', id: 'dropdown', disabled: false },
      { icon: 'fa fa-cookie', label: 'Input Chips', id: 'chips', disabled: false },
      { icon: 'fa fa-table', label: 'Input List (Table/ Panel)', id: 'list', disabled: false },
    ]
    // Ace Editor Options
    this.editorOptions = { showLineNumbers: true, tabSize: 2 };
  }

  ngOnInit(): void {
    const subscription = this.actionService.actionLoadCompleteSubject
      .subscribe(isFormLoaded => {
        this.isFormLoaded = isFormLoaded;
        if(isFormLoaded) {
          const content = this.actionService.actionTemplate?.questions
          this.originalFormSkeleton = content ? JSON.stringify(content,null, 2) : '';
          this.onContentChanged(this.originalFormSkeleton);
        }
      });
    this.subscriptions.push(subscription)
  }

  /**
   * To get the documentation URL
   */
  get docsUrl() {
    return window.location.protocol + '//'
      + window.location.host
      + '/docs/creator_json_form_designer.html';
  }

  /**
   * To show the dialog
   * @params data to be passed to the dialog component
   * @params header for the modal
   */
  showDialog(data: any, header?: string) {
    const dialogRef = this.dialogService
      .open(FormsDialogComponent, {
        data,
        header: header || 'Add New FormControl',
        width: '848px'
      });
    dialogRef.onClose.subscribe(question => {
      if(question) {
        // As action will be always add, add the new question to end of the questions
        this.questions.push(question);
        this.onContentModified(this.questions);
      }
    })
  }

  /**
   * Fired when the Dragging Start
   * @params control
   */
  onDragStart(control) {
    this.draggedControl = control;
  }
  /**
   * Fired when the Dragging Drops Somewhere
   */
  onDrop() {
    if(this.draggedControl) {
      const { id, label} = this.draggedControl;
      this.showDialog({action: 'add', controlType: id, questions: this.questions}, `Add New ${label}`);
    }
  }
  /**
   * Fired when the Dragging Stops
   */
  onDragEnd() {
    this.draggedControl = null;
  }

  /**
   * Get the new Compiled Schema for Validation
   * @params schema
   */
  getCompiledSchema(schema) {
    const ajv = new Ajv({allErrors: true, nullable: true});
    return ajv.compile(schema);
  }

  onValidateContent() {
    // Run the validation only in advance mode, return if basic
    if(this.selectedDesignType === 'Basic') return;
    const questions: any[] = JSON.parse(this.updatedFormSkeleton);
    this.validationErrors = [];
    questions.forEach((question, index) => {
      switch (question?.controlType) {
        case 'message':
          const validateMessage = this.getCompiledSchema(MessageSchema);
          this.validationErrors[index] = !validateMessage(question) ? validateMessage.errors : null;
          break;
        case 'textbox':
        case 'chips':
          const validateTextBox = this.getCompiledSchema(TextBoxSchema);
          this.validationErrors[index] = !validateTextBox(question) ? validateTextBox.errors : null;
          break;
        case 'dropdown':
        case 'multiselect':
          const validateDropdown = this.getCompiledSchema(DropdownSchema);
          this.validationErrors[index] = !validateDropdown(question) ? validateDropdown.errors : null;
          break;
        default:
          const validateDefault = this.getCompiledSchema(DefaultSchema);
          this.validationErrors[index] = !validateDefault(question) ? validateDefault.errors : null;
          break;
      }
    });
  }

  /**
   * Fires when there is a change in the code editor
   * @params code
   */
  onContentChanged(code) {
    try {
      this.questions = JSON.parse(code);
      this.updatedFormSkeleton = code;
      this.onValidateContent();
      this.isFormSkeletonValid = true;
    } catch (e) {
      this.isFormSkeletonValid = false;
    }
  }

  /**
   * Fires when the skeleton is modified by a child component
   * @params skeleton Object
   */
  onContentModified(skeleton) {
    this.updatedFormSkeleton = JSON.stringify(skeleton,null, 2);
    this.onValidateContent();
  }

  /**
   * To save the changes for the formSkeleton
   */
  onSave() {
    const data: any = {
      id: this.actionService.actionTemplate?.id,
      name: this.actionService.actionTemplate?.name,
      description: this.actionService.actionTemplate?.description,
      serviceId: this.actionService.actionServices,
      workflowId: this.actionService.actionType?.ID,
      vendorType: this.actionService.actionVendor?.vendorType,
      vendorTypeId: this.actionService.actionVendor?.id,
      questions: JSON.parse(this.updatedFormSkeleton)
    }
    if(this.actionService.customer) {
      data['customerId'] = this.actionService.customer.id
    }
    this.isSaving = true;
    const subscription = this.controller.updateActionTemplate(data)
      .pipe(finalize(() => this.isSaving = false))
      .subscribe(response => {
        // reset the validation commands in the actionTemplate
        this.actionService.actionTemplate.questions = data.questions;
        // Update the original State
        this.originalFormSkeleton = this.updatedFormSkeleton;
        this.messageService.add({
          severity: 'success',
          summary: 'Form Update',
          detail: 'Action form updated successfully!'
        });
      }, error => {
        // TODO: error Handling
        console.log(error);
        this.messageService.add({
          severity: 'error',
          summary: 'Form Update',
          detail: 'Failed to update action form, please try again!',
          sticky: true
        });
      })
    this.subscriptions.push(subscription);
  }

  /**
   * To export the JSOn of the formSkeleton
   */
  onExport() {
    const blob = new Blob([this.updatedFormSkeleton], { type: 'application/json' });
    const url= window.URL.createObjectURL(blob);
    window.open(url);
  }

  ngOnDestroy() {
    this.subscriptions.forEach((subscription) => {
      if(subscription) {
        subscription.unsubscribe();
      }
    })
  }
}
