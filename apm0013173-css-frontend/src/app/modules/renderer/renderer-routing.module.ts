import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RendererComponent } from './renderer.component';
import { LandingComponent } from './components/landing/landing.component';
import { ConfigComponent } from './components/config/config.component';
import { DataCollectionComponent } from './components/steps/data-collection/data-collection.component';
import { PostValidationComponent } from './components/steps/post-validation/post-validation.component';
import { PreValidationComponent } from './components/steps/pre-validation/pre-validation.component';
import { ConfigurationComponent } from './components/steps/configuration/configuration.component';
import { SummaryComponent } from './components/steps/summary/summary.component';
import { StepGuard } from './guards/step.guard';
import { CredentialComponent } from './components/steps/credential/credential.component';
import { NetworkInsightsComponent } from './components/steps/network-insights/network-insights.component';
import { NetworkStatsComponent } from './components/steps/network-stats/network-stats.component';

const routes: Routes = [
  {
    path: '',
    component: RendererComponent,
    children: [
      {
        path: 'hello',
        component: LandingComponent
      },
      {
        path: 'config',
        component: ConfigComponent,
        children: [
          {
            path: 'credential',
            component: CredentialComponent
          },
          {
            path: 'data-collection',
            component: DataCollectionComponent
          },
          {
            path: 'pre-validation',
            component: PreValidationComponent
          },
          {
            path: 'configuration',
            component: ConfigurationComponent
          },
          {
            path: 'post-validation',
            component: PostValidationComponent
          },
          {
            path: 'summary',
            component: SummaryComponent
          },
          {
            path: 'network-insights',
            component: NetworkInsightsComponent
          },
          {
            path: 'network-stats',
            component: NetworkStatsComponent
          }
        ],
        canActivate: [StepGuard]
      },
      {
        path: '',
        redirectTo: 'hello',
        pathMatch: 'full'
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RendererRoutingModule {}
