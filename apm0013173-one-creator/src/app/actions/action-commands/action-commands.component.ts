import {Component, OnDestroy, OnInit} from '@angular/core';
import {ActionService} from '../action.service';
import {Subscription} from 'rxjs';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {MessageService} from 'primeng/api';
import {finalize} from 'rxjs/operators';
import {ControllerService} from '../../services/controller.service';

@Component({
  selector: 'app-action-commands',
  templateUrl: './action-commands.component.html',
  styleUrls: ['./action-commands.component.css']
})
export class ActionCommandsComponent implements OnInit, OnDestroy {
  isSaving: boolean;
  isCommandsLoaded: boolean;
  originalState: any;
  commandsForm: FormGroup;
  subscriptions: Subscription[] = [];
  constructor(private formBuilder: FormBuilder,
              private actionService: ActionService,
              private controllerService: ControllerService,
              private messageService: MessageService) {
    this.commandsForm = this.formBuilder.group({
      validation: ['', Validators.required]
    })
  }
  get isFormStateChanged() {
    return JSON.stringify(this.originalState) === JSON.stringify(this.commandsForm.value)
  }

  ngOnInit(): void {
    const subscription = this.actionService.actionLoadCompleteSubject
      .subscribe(isCommandsLoaded => {
        this.isCommandsLoaded = isCommandsLoaded;
        if(isCommandsLoaded) {
          const { validation } = this.actionService.actionTemplate;
          this.originalState = { validation };
          this.commandsForm.get('validation').setValue(validation);
        }
      });
    this.subscriptions.push(subscription)
  }

  onReset() {
    Object.keys(this.originalState).forEach(key => {
      this.commandsForm.get(key).setValue(this.originalState[key])
    })
  }

  onSave() {
    if(!this.commandsForm.valid) return;
    const data: any = {
      id: this.actionService.actionTemplate?.id,
      serviceId: this.actionService.actionServices,
      workflowId: this.actionService.actionType?.ID,
      vendorTypeId: this.actionService.actionVendor?.id,
      validation: this.commandsForm.value?.validation
    }
    if(this.actionService.customer) {
      data['customerId'] = this.actionService.customer.id
    }
    this.isSaving = true;
    const subscription = this.controllerService.updateActionTemplate(data)
      .pipe(finalize(() => this.isSaving = false))
      .subscribe(response => {
        // reset the validation commands in the actionTemplate
        this.actionService.actionTemplate.validation = data.validation;
        // Update the original State
        this.originalState = this.commandsForm.value;
        this.messageService.add({
          severity: 'success',
          summary: 'Validation Update',
          detail: 'Validation commands updated successfully!'
        });
      }, error => {
        // TODO: error Handling
        console.log(error);
        this.messageService.add({
          severity: 'error',
          summary: 'Validation Update',
          detail: 'Failed to update validation commands, please try again!',
          sticky: true
        });
      })
    this.subscriptions.push(subscription);
  }

  ngOnDestroy() {
    this.subscriptions.forEach((subscription) => {
      if(subscription) {
        subscription.unsubscribe();
      }
    })
  }
}
