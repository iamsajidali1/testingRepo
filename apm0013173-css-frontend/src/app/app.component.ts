import { Component, OnInit, Renderer2 } from '@angular/core';
import { InitService } from './services/init.service';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  constructor(private renderer: Renderer2, private initService: InitService) {}

  ngOnInit() {
    const scriptElement = this.initService.loadJsScript(
      this.renderer,
      environment.NUANCE_CHAT_SCRIPT
    );
    scriptElement.onload = () => {
      console.log('Nuance Chat Script loaded');
    };
    scriptElement.onerror = () => {
      console.log('Could not load the Nuance Chat Script!');
    };
  }
}
