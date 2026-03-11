import { BrowserModule } from '@angular/platform-browser';
import { APP_INITIALIZER, NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { NgDragDropModule } from 'ng-drag-drop';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { NgPipesModule } from 'ng-pipes';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AppRoutingModule } from './routing/app-routing.module';

import { AppComponent } from './app.component';
import { ModalComponent } from './modal/modal.component';
import { NgxDnDModule } from '@swimlane/ngx-dnd';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ConditionsComponent } from './conditions/conditions.component';
import { FormBuilderComponent } from './form-builder/form-builder.component';
import { ListTemplatesComponent } from './template-manager/list-templates/list-templates.component';
import { AddTemplateComponent } from './template-manager/add-template/add-template.component';
import { NgxTypeaheadModule } from 'ngx-typeahead';
import { FroalaEditorModule, FroalaViewModule } from 'angular-froala-wysiwyg';
import { TemplateManagerComponent } from './template-manager/template-manager.component';
import { EditorComponent } from './template-manager/editor/editor.component';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { AccordionModule } from 'primeng/accordion';     // accordion and accordion tab
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { DialogModule } from 'primeng/dialog';
import { CheckboxModule } from 'primeng/checkbox';
import { MessagesModule } from 'primeng/messages';
import { MessageModule } from 'primeng/message';
import { ListboxModule } from 'primeng/listbox';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { TabViewComponent } from './tab-view/tab-view.component';
import { TabViewModule } from 'primeng/tabview';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { FileUploadModule } from 'primeng/fileupload';
import { FormPropertiesComponent } from './form-properties/form-properties.component';
import { PanelModule } from 'primeng/panel';
import { EditorModule } from 'primeng/editor';
import { ValidationComponent } from './validation/validation.component';
import { ValidationBuilderComponent } from './validation-builder/validation-builder.component';
import { RadioButtonModule } from 'primeng/radiobutton';
import { MultiSelectModule } from 'primeng/multiselect';
import { AdminGuiNavComponent } from './admin/admin-gui-nav/admin-gui-nav.component';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { MonitorComponent } from './logs/monitor/monitor.component';
import { DataViewModule } from 'primeng/dataview';
import { TableModule } from 'primeng/table';
import { PaginatorModule } from 'primeng/paginator';
import { TableMonitorComponent } from './logs/table-monitor/table-monitor.component';
import { RequestsInterceptor } from './interceptor/requests-interceptor';
import { TooltipModule } from 'primeng/tooltip';
import { CustomerAdminComponent } from './admin/customer-admin/customer-admin.component';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MatomoModule } from 'ngx-matomo';
import { TreeModule } from 'primeng/tree';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { InputSwitchModule } from 'primeng/inputswitch';
import { AddActionModalComponent } from './add-action-modal/add-action-modal.component';
import { ServiceAdministrationComponent } from './admin/service-administration/service-administration.component';
import { PermissionManagerComponent } from './admin/permission-manager/permission-manager.component';
import { FieldsetModule } from 'primeng/fieldset';
import { SettingsGuiComponent } from './admin/settings-gui/settings-gui.component';
import { RbacComponent } from './rbac/rbac.component';
import { SitemapComponent } from './rbac/sitemap/sitemap.component';
import { AccessManagerComponent } from './rbac/access-manager/access-manager.component';
import {AceEditorModule} from 'ng2-ace-editor';
import { DeviceMgmtComponent } from './admin/device-mgmt/device-mgmt.component';
import { ActionsComponent } from './actions/actions.component';
import { ActionPropertiesComponent } from './actions/action-properties/action-properties.component';
import { ActionFormsComponent } from './actions/action-forms/action-forms.component';
import { ActionCommandsComponent } from './actions/action-commands/action-commands.component';
import { TabMenuModule } from 'primeng/tabmenu';
import { ActionAccessComponent } from './actions/action-access/action-access.component';
import {SelectButtonModule} from 'primeng/selectbutton';
import { FormsPreviewerComponent } from './actions/action-forms/forms-previewer/forms-previewer.component';
import {ChipsModule} from 'primeng/chips';
import {DragDropModule} from 'primeng/dragdrop';
import {ContextMenuModule} from 'primeng/contextmenu';
import { FormsDialogComponent } from './actions/action-forms/forms-dialog/forms-dialog.component';
import {DialogService, DynamicDialogModule} from 'primeng/dynamicdialog';
import { ActionDialogComponent } from './actions/action-dialog/action-dialog.component';
import {InputNumberModule} from 'primeng/inputnumber'
import { InitService } from './init.service';
import { ActionFormRulesComponent } from './actions/action-form-rules/action-form-rules.component';
import { ActionFormRuleEditComponent } from './actions/action-form-rule-edit/action-form-rule-edit.component';

export function initializeApp(appInitService: InitService) {
  return (): Promise<any> => appInitService.init();
}

@NgModule({
  declarations: [
    AppComponent,
    ModalComponent,
    ConditionsComponent,
    FormBuilderComponent,
    ListTemplatesComponent,
    AddTemplateComponent,
    TemplateManagerComponent,
    ModalComponent,
    EditorComponent,
    TabViewComponent,
    FormPropertiesComponent,
    ValidationComponent,
    ValidationBuilderComponent,
    AdminGuiNavComponent,
    MonitorComponent,
    TableMonitorComponent,
    CustomerAdminComponent,
    AddActionModalComponent,
    ServiceAdministrationComponent,
    PermissionManagerComponent,
    SettingsGuiComponent,
    RbacComponent,
    SitemapComponent,
    AccessManagerComponent,
    DeviceMgmtComponent,
    ActionsComponent,
    ActionPropertiesComponent,
    ActionFormsComponent,
    ActionCommandsComponent,
    ActionAccessComponent,
    ActionFormRulesComponent,
    ActionFormRuleEditComponent,
    FormsPreviewerComponent,
    FormsDialogComponent,
    ActionDialogComponent
  ],
  imports: [
    AccordionModule,
    DropdownModule,
    MatomoModule,
    InputTextModule,
    DialogModule,
    BreadcrumbModule,
    InputTextareaModule,
    CheckboxModule,
    MessagesModule,
    MessageModule,
    CardModule,
    ButtonModule,
    BrowserModule,
    AppRoutingModule,
    NgDragDropModule.forRoot(),
    FormsModule,
    ReactiveFormsModule,
    TabMenuModule,
    NgxDnDModule,
    NgPipesModule,
    BrowserAnimationsModule,
    TooltipModule,
    NgxTypeaheadModule,
    FroalaEditorModule.forRoot(),
    FroalaViewModule.forRoot(),
    ListboxModule,
    ConfirmDialogModule,
    ToastModule,
    ScrollPanelModule,
    TabViewModule,
    FileUploadModule,
    PanelModule,
    EditorModule,
    TreeModule,
    RadioButtonModule,
    TableModule,
    PaginatorModule,
    DataViewModule,
    MultiSelectModule,
    ToggleButtonModule,
    ProgressSpinnerModule,
    AutoCompleteModule,
    InputSwitchModule,
    FieldsetModule,
    AceEditorModule,
    SelectButtonModule,
    ChipsModule,
    DragDropModule,
    ContextMenuModule,
    DynamicDialogModule,
    InputNumberModule
  ],
  exports: [
  ],
  providers: [
    ConfirmationService,
    MessageService,
    DialogService,
    InitService,
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [InitService],
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: RequestsInterceptor,
      multi: true
    }],
  bootstrap: [AppComponent],
  entryComponents: [
    ModalComponent,
    AddTemplateComponent,
    ActionDialogComponent,
    FormsDialogComponent
  ],
  schemas: [NO_ERRORS_SCHEMA]
})

export class AppModule { }
