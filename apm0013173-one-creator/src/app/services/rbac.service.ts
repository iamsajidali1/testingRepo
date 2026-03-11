import { Injectable } from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {environment} from '../../environments/environment';

interface RoleToComponent {
  id?: string;
  role: number;
  component: string,
  accessType: string
}

@Injectable({
  providedIn: 'root'
})
export class RbacService {

  constructor(private http: HttpClient) { }

  /**
   * To get the Tree Nodes for Application Components
   */
  getAppComponentsTree() {
    return this.http.get<any[]>(environment.API + '/components/tree')
  }

  /**
   * To get the Access Control List By Role Id
   */
  getAccessListByRole(roleId: number) {
    const params = new HttpParams().set('role__id', String(roleId));
    return this.http.get<any>(environment.API + '/rbac/acl', { params })
  }

  /**
   * To get the Access Control List By Component Key
   */
  getAccessListByComponent(componentKey: string) {
    const params = new HttpParams().set('component__key', String(componentKey));
    return this.http.get<any>(environment.API + '/rbac/acl', { params })
  }

  /**
   * To Save the Access Control List
   */
  saveAccessListByComponent(componentKey: string, accessList: RoleToComponent[]) {
    return this.http.post<any>(environment.API + '/rbac/acl', { componentKey, accessList })
  }
}
