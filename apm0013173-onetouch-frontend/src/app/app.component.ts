import {Component, OnDestroy} from '@angular/core';
import { Pipe, PipeTransform } from '@angular/core';
import * as vkbeautify from 'vkbeautify';
import {UserModel} from './models/user.model';
import {InitService} from './init.service';
import {Subscription} from 'rxjs';
import {environment} from '../environments/environment';

@Pipe({
    name: 'xml'
})

export class XmlPipe implements PipeTransform {
    transform(value: string): string {
        return vkbeautify.xml(value);
    }
}

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})

export class AppComponent implements OnDestroy {
    title = 'OneTouch';
    version = '2.1.0';
    user: UserModel;
    subscriptions: Subscription[] = [];

    constructor(private init: InitService) {
        this.user = this.init.userDetails;
        this.version = `${environment.ENV}-${environment.VERSION}`;
    }

    ngOnDestroy() {
        this.subscriptions.forEach(subscription => {
            if (subscription) { subscription.unsubscribe(); }
        });
    }
}
