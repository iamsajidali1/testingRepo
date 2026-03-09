import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';

@Injectable()
export class BingmapService {
  private promise: Promise<any> | undefined;

  load() {
    // First time 'load' is called?
    if (!this.promise) {
      // Make promise to load
      this.promise = new Promise((resolve) => {
        // Set callback for when bing maps is loaded.
        // @ts-ignore
        window['__onBingLoaded'] = () => {
          resolve('Bing Maps API loaded');
        };
        const node = document.createElement('script');
        node.src = environment.BING_SDK;
        node.type = 'text/javascript';
        node.async = true;
        node.defer = true;
        document.getElementsByTagName('head')[0].appendChild(node);
      });
    }
    // Always return promise. When 'load' is called many times, the promise is already resolved.
    return this.promise;
  }
}
