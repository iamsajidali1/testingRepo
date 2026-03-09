import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RendererComponent } from './renderer.component';
import { RendererRoutingModule } from './renderer-routing.module';
import { LandingComponent } from './components/landing/landing.component';
import { HeaderComponent } from './components/header/header.component';
import { SharedModule } from '../../shared.module';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { BingmapComponent } from './components/bingmap/bingmap.component';
import { BingmapService } from './services/bingmap.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { LandingService } from './services/landing.service';
import { ConfigComponent } from './components/config/config.component';
import { StepperService } from './services/stepper.service';
import { DataCollectionComponent } from './components/steps/data-collection/data-collection.component';
import { PreValidationComponent } from './components/steps/pre-validation/pre-validation.component';
import { PostValidationComponent } from './components/steps/post-validation/post-validation.component';
import { ConfigurationComponent } from './components/steps/configuration/configuration.component';
import { SummaryComponent } from './components/steps/summary/summary.component';
import { UtilService } from './services/util.service';
import { FooterComponent } from './components/footer/footer.component';
import { StyleClassModule } from 'primeng/styleclass';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { DialogService } from 'primeng/dynamicdialog';
import { SchedulerService } from './services/scheduler.service';
import { ProcessorService } from './services/processor.service';
import { ProcessDialogComponent } from './dialogs/process-dialog/process-dialog.component';
import { RequestInterceptor } from './interceptors/request.interceptor';
import { CoreService } from './services/core.service';
import { NgxTextDiffModule } from 'ngx-text-diff';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { NgChartsModule } from 'ng2-charts';
import { ConfirmationService, MessageService } from 'primeng/api';
import { CredentialComponent } from './components/steps/credential/credential.component';
import { AssetService } from './services/asset.service';
import { DataTemplateDialogComponent } from './dialogs/data-template-dialog/data-template-dialog.component';
import { CssPanelComponent } from './components/landing/css-panel/css-panel.component';
import { TdcPanelComponent } from './components/landing/tdc-panel/tdc-panel.component';
import { ReportPanelComponent } from './components/landing/report-panel/report-panel.component';
import { NetworkInsightsComponent } from './components/steps/network-insights/network-insights.component';
import { ChartService } from './services/chart.service';
import { NetworkStatsComponent } from './components/steps/network-stats/network-stats.component';
import { ChartModalComponent } from './components/steps/network-stats/chart-modal.component';
import { UnifiedPieChartComponent } from './components/steps/network-stats/unified-pie-chart.component';

@NgModule({
  declarations: [
    HeaderComponent,
    LandingComponent,
    RendererComponent,
    BingmapComponent,
    ConfigComponent,
    DataCollectionComponent,
    PreValidationComponent,
    PostValidationComponent,
    ConfigurationComponent,
    SummaryComponent,
    FooterComponent,
    ProcessDialogComponent,
    CredentialComponent,
    DataTemplateDialogComponent,
    CssPanelComponent,
    TdcPanelComponent,
    ReportPanelComponent,
  NetworkInsightsComponent,
  NetworkStatsComponent,
  ChartModalComponent,
  UnifiedPieChartComponent
  ],
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    RendererRoutingModule,
    SharedModule,
    StyleClassModule,
    ClipboardModule,
  NgxTextDiffModule,
  NgxChartsModule,
  NgChartsModule
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: RequestInterceptor,
      multi: true
    },
    AssetService,
    ChartService,
    DialogService,
    MessageService,
    ConfirmationService,
    BingmapService,
    CoreService,
    LandingService,
    StepperService,
    UtilService,
    ProcessorService,
    SchedulerService
  ],
  entryComponents: [ProcessDialogComponent, DataTemplateDialogComponent]
})
export class RendererModule {}
