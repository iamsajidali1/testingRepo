import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActionService } from '../action.service';
import { Subscription } from 'rxjs';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ControllerService } from 'src/app/services/controller.service';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-action-form-rule-edit',
  templateUrl: './action-form-rule-edit.component.html',
  styleUrls: ['./action-form-rule-edit.component.css']
})
export class ActionFormRuleEditComponent implements OnInit, OnDestroy {
  public conditions = [
    { type: "starts with", hasValue: true },
    { type: "ends with", hasValue: true },
    { type: "contains", hasValue: true },
    { type: "is", hasValue: true },
    { type: "is not", hasValue: true },
    { type: "is empty", hasValue: false },
    { type: "is not empty", hasValue: false },
    { type: "is one of", hasValue: true },
  ];

  public actions = [
    { type: "set", hasValue: true },
    { type: "hide", hasValue: false },
  ];

  public operations = [
    { type: "OR" },
    { type: "AND" },
  ];

  public whenConditions = [];
  public thenConditions = [];

  public loading = false;

  private subscriptions = new Subscription();

  public fields: any[];

  constructor(public ref: DynamicDialogRef, public config: DynamicDialogConfig, private actionService: ActionService, private controllerService: ControllerService, private messageService: MessageService) {

  }

  ngOnInit(): void {
    this.controllerService.getFormTemplateById(this.config.data.actionId).subscribe(response => {
      this.fields = (response as any).result?.questions ?? [];
      if (this.config.data?.rule) {
        this.whenConditions = this.config.data.rule.WHEN_CONDITIONS.map(wc => {
          return {
            value: wc.value,
            source_key: this.fields.find(f => f.key === wc.source_key),
            condition: this.conditions.find(c => c.type === wc.condition),
            operation: this.operations.find(o => o.type === wc.operation),
          }
        });
        this.thenConditions = this.config.data.rule.THEN_CONDITIONS.map(wc => {
          return {
            target_value: wc.target_value,
            target_key: this.fields.find(f => f.key === wc.target_key),
            action: this.actions.find(c => c.type === wc.action)
          }
        });
      } else {
        this.addWhenCondition();
        this.addThenCondition();
      }
    })
  }

  public addWhenCondition() {
    this.whenConditions.push({
      source_key: "",
      condition: this.conditions.find(c => c.type === 'is'),
      value: "",
      operation: this.operations.find(o => o.type === 'OR'),
    });
  }

  public addThenCondition() {
    this.thenConditions.push({
      target_key: "",
      action: this.actions.find(c => c.type === 'set'),
      target_value: ""
    });
  }

  public removeWhenCondition(condition) {
    this.whenConditions = this.whenConditions.filter(wc => wc !== condition);
  }

  public removeThenCondition(condition) {
    this.thenConditions = this.thenConditions.filter(wc => wc !== condition);
  }

  private mapWhenConditions() {
    return this.whenConditions.map((wc, i) => {
      return {
        ...wc,
        source_key: wc.source_key.key,
        condition: wc.condition.type,
        operation: i ? wc.operation?.type : undefined
      }
    });
  }

  private mapThenConditions() {
    return this.thenConditions.map(tc => {
      return {
        ...tc,
        target_key: tc.target_key.key,
        action: tc.action.type
      }
    })
  }

  public addRule() {
    let call;
    if (this.config.data?.rule) {
      call = this.actionService.editFormRule(this.config.data.rule.ID, this.mapWhenConditions(), this.mapThenConditions());
    } else {
      call = this.actionService.createFormRule(this.config.data.actionId, 0, this.mapWhenConditions(), this.mapThenConditions())
    }

    const sub = call.subscribe(() => {
      this.ref.close(true);
    }, () => {
      this.messageService.add({
        severity: 'error',
        summary: 'Saving Error',
        detail: `Failed to save the form rule`,
      });
    });

    this.subscriptions.add(sub);
  }


  public isFormValid() {
    for (const cond of this.whenConditions) {
      if (!cond.source_key) {
        return false;
      }

      if (cond.condition?.hasValue && !cond.value) {
        return false;
      }
    }

    for (const cond of this.thenConditions) {
      if (!cond.target_key) {
        return false;
      }

      if (cond.action?.hasValue && !cond.target_value) {
        return false;
      }
    }

    return true;
  }

  public close() {
    this.ref.close(false);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
