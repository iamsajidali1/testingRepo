import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { ActionService } from '../action.service';
import { Subscription } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { DialogService } from 'primeng/dynamicdialog';
import { ActionFormRuleEditComponent } from '../action-form-rule-edit/action-form-rule-edit.component';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-action-form-rules',
  templateUrl: './action-form-rules.component.html',
  styleUrls: ['./action-form-rules.component.css']
})
export class ActionFormRulesComponent implements OnInit, AfterViewInit, OnDestroy {
  private actionId = 0;
  private subscriptions = new Subscription();

  public loading = false;
  public rules: {
    rule: any,
    parsedWhen: string,
    parsedThen: string
  }[] = [];

  public minSequence = 0;
  public maxSequence = 0;

  constructor(private actionService: ActionService, private activatedRoute: ActivatedRoute, private dialogService: DialogService, private messageService: MessageService) {

  }

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
    this.activatedRoute.queryParams.subscribe(params => {
      this.actionId = Number(params.actionId);
      this.loadList();
    })
  }

  loadList() {
    this.loading = true;
    if (!this.actionId) {
      return;
    }

    const sub = this.actionService.fetchTemplateFormRules(this.actionId).subscribe(rules => {
      this.loading = false;
      this.rules = rules.map(rule => {
        return {
          rule,
          parsedWhen: rule.WHEN_CONDITIONS.map(wc => {
            const parts = [wc.source_key, wc.condition];
            if (wc.value) {
              parts.push(`"${wc.value}"`);
            }
            if (wc.operation) {
              parts.unshift(wc.operation);
            }

            return parts.join(' ');
          }).join(', '),
          parsedThen: rule.THEN_CONDITIONS.map(wc => {
            if (wc.target_value) {
              return `${wc.action} ${wc.target_key} "${wc.target_value}"`;
            }

            return `${wc.action} ${wc.target_key}`
          }).join(', '),
        }
      });
      this.minSequence = Math.min(... this.rules.map(r => r.rule.SEQUENCE));
      this.maxSequence = Math.max(... this.rules.map(r => r.rule.SEQUENCE));
    }, () => {
      this.loading = false;
      this.messageService.add({
        severity: 'error',
        summary: 'Loading Error',
        detail: `Failed to load form rules for the action`,
      });
    });

    this.subscriptions.add(sub);
  }

  addRule() {
    const sub = this.dialogService.open(ActionFormRuleEditComponent, {
      header: "Add New Form Rule", data: {
        actionId: this.actionId,
      }
    }).onClose.subscribe(changesMade => {
      if (changesMade) {
        this.loadList();
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: `Form rule saved successfully!`,
        });
      }
    });
    this.subscriptions.add(sub);
  }

  editRule(rule) {
    const sub = this.dialogService.open(ActionFormRuleEditComponent, {
      header: "Edit Form Rule", data: {
        actionId: this.actionId,
        rule
      }
    }).onClose.subscribe(changesMade => {
      if (changesMade) {
        this.loadList();
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: `Form rule saved successfully!`,
        });
      }
    });
    this.subscriptions.add(sub);
  }

  deleteRule(ruleId: number) {
    this.loading = true;

    const sub = this.actionService.deleteFormRule(ruleId).subscribe(() => {
      this.loadList();
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: `Form rule deleted successfully!`,
      });
    }, () => {
      this.loadList();
      this.messageService.add({
        severity: 'error',
        summary: 'Loading Error',
        detail: `Failed to delete the form rule`,
      });
    });

    this.subscriptions.add(sub);
  }

  incrementSequence(ruleId: number, increment: boolean) {
    this.loading = true;

    const sub = this.actionService.incrementFormRuleSequence(ruleId, increment).subscribe(() => {
      this.loadList();
    }, () => {
      this.loadList();
    });

    this.subscriptions.add(sub);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}