import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { TemplateManagerComponent } from '../template-manager/template-manager.component';
import { AdminGuiNavComponent } from '../admin/admin-gui-nav/admin-gui-nav.component';
import { MonitorComponent } from '../logs/monitor/monitor.component';
import {RbacComponent} from '../rbac/rbac.component';
import {ActionsComponent} from '../actions/actions.component';
import {ActionPropertiesComponent} from '../actions/action-properties/action-properties.component';
import {ActionFormsComponent} from '../actions/action-forms/action-forms.component';
import {ActionCommandsComponent} from '../actions/action-commands/action-commands.component';
import {ActionAccessComponent} from '../actions/action-access/action-access.component';
import { ActionFormRulesComponent } from '../actions/action-form-rules/action-form-rules.component';

const routes: Routes = [
  {
    path: 'actions',
    component: ActionsComponent,
    children: [
      {
        path: 'properties',
        component: ActionPropertiesComponent
      }, {
        path: 'forms',
        component: ActionFormsComponent
      }, {
        path: 'validations',
        component: ActionCommandsComponent
      }, {
        path: 'accesses',
        component: ActionAccessComponent
      }, {
        path: 'form-rules',
        component: ActionFormRulesComponent
      }
    ]
  },
  {
    path: 'config-templates',
    component: TemplateManagerComponent
  },
  {
    path: 'adminUI',
    component: AdminGuiNavComponent
  },
  {
    path: 'monitor',
    component: MonitorComponent
  },
  {
    path: 'rbac',
    component: RbacComponent
  },
  {
    path: '**',
    redirectTo: 'actions',
  }
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forRoot(routes)
  ],
  declarations: [],
  exports: [RouterModule]
})

export class AppRoutingModule { }
