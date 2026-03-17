import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadChildren: () =>
      import('./modules/renderer/renderer.module').then((m) => m.RendererModule)
  },
  {
    path: 'creator',
    loadChildren: () =>
      import('./modules/creator/creator.module').then((m) => m.CreatorModule)
  },
  {
    path: '',
    redirectTo: '',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
