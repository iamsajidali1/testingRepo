import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { CheckboxModule } from 'primeng/checkbox';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { RadioButtonModule } from 'primeng/radiobutton';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { AvatarModule } from 'primeng/avatar';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { SelectButtonModule } from 'primeng/selectbutton';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { DividerModule } from 'primeng/divider';
import { StepsModule } from 'primeng/steps';
import { TimelineModule } from 'primeng/timeline';
import { AccordionModule } from 'primeng/accordion';
import { BadgeModule } from 'primeng/badge';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { InputSwitchModule } from 'primeng/inputswitch';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { TableModule } from 'primeng/table';
import { TabViewModule } from 'primeng/tabview';
import { DynamicDialogModule } from 'primeng/dynamicdialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SkeletonModule } from 'primeng/skeleton';
import { SplitterModule } from 'primeng/splitter';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { FieldsetModule } from 'primeng/fieldset';
import { ChipsModule } from 'primeng/chips';
import { DialogModule } from 'primeng/dialog';
import { FileUploadModule } from 'primeng/fileupload';
import { MultiSelectModule } from 'primeng/multiselect';
import { PanelModule } from 'primeng/panel';
import { MenuModule } from 'primeng/menu';
import { KnobModule } from 'primeng/knob';
import { ChartModule } from 'primeng/chart';

@NgModule({
  declarations: [],
  imports: [CommonModule],
  exports: [
    AccordionModule,
    AvatarModule,
    AutoCompleteModule,
    BadgeModule,
    BreadcrumbModule,
    ButtonModule,
    CardModule,
    CheckboxModule,
    ChartModule,
    ChipsModule,
    ConfirmDialogModule,
    DividerModule,
    DropdownModule,
    DialogModule,
    DynamicDialogModule,
    FieldsetModule,
    FileUploadModule,
    InputSwitchModule,
    InputTextModule,
    InputTextareaModule,
    KnobModule,
    MenuModule,
    MultiSelectModule,
    OverlayPanelModule,
    PanelModule,
    ProgressSpinnerModule,
    RadioButtonModule,
    RippleModule,
    SkeletonModule,
    StepsModule,
    SelectButtonModule,
    SplitterModule,
    TabViewModule,
    TableModule,
    TagModule,
    ToastModule,
    TimelineModule,
    ToggleButtonModule
  ]
})
export class SharedModule {}
