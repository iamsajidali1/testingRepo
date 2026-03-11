import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { map } from 'rxjs/operators';
import { Config } from 'protractor';
import {  TreeNode } from 'primeng/api';

@Injectable({
  providedIn: 'root'
})
export class NodeListService {
  localConfig;

  constructor(private http: HttpClient) { 
    if(!environment.production && environment.local){
       this.localConfig = require('../../../config.json');
    }
  }

  /** 
  * Create users to customer relation
  * @returns Observable - objects
  */
 public getBasicNodes(): Observable<any[]> {
  return this.http.get<any[]>(environment.API + "/node-list/");
}



}
