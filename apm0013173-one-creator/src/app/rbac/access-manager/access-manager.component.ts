import {Component, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {forkJoin, Subscription} from 'rxjs';
import {RbacService} from '../../services/rbac.service';
import {MessageService} from 'primeng/api';
import {map} from 'rxjs/operators';
import {ControllerService} from '../../services/controller.service';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';

@Component({
  selector: 'app-access-manager',
  templateUrl: './access-manager.component.html',
  styleUrls: ['./access-manager.component.css']
})
export class AccessManagerComponent implements OnInit, OnDestroy {
  isLoading: boolean;
  isError: boolean;
  isAclSaving: boolean;
  accesses: any[];
  accessTypes: any[];
  cols: any[];
  roles: any[];
  accessList: any[];
  aclFormGroup: FormGroup;
  componentKey: string;
  componentName: string;
  subscriptions: Subscription[] = [];
  constructor(private activatedRoute: ActivatedRoute,
              private formBuilder: FormBuilder,
              private rbacService: RbacService,
              private controllerService: ControllerService,
              private messageService: MessageService) {
    this.cols = [
      { field: 'role', header: '' },
      { field: 'NONE', header: 'No Access' },
      { field: 'RO', header: 'Read Only' },
      { field: 'RW', header: 'Read Write' }
    ];
    // Subscribe to the change of queryParams
    this.activatedRoute.queryParams.subscribe(queryParams => {
      if ('componentKey' in queryParams) {
        this.componentKey = queryParams.componentKey;
        // Time to load component access control list
        this.initAccessManager();
      }
    });
  }

  ngOnInit(): void {}

  loadRoles() {
    return this.controllerService.getRoles();
  }

  loadAclForComponent() {
    // Check if there is a component key to load data
    if (!this.componentKey) return;
    // Load the ACL for the component
    console.log('Loading ACL for Component - ', this.componentKey);
    return this.rbacService
      .getAccessListByComponent(this.componentKey)
      .pipe(map((res) => res.results));
  }

  initForm (roles, acl) {
    // Init
    this.accesses = [];
    const formControls = {};
    // Traverse through each role
    roles.forEach(role => {
      const roleName = role.IDENTIFICATOR;
      // Get Access for this role
      const access = acl.find(ac => ac.role.id === role.ID);
      const accessType = access ? access.accessType : 'NONE';
      // Set up the access Array
      this.accesses.push({ role: roleName, accessType});
      // Create a form control
      formControls[roleName] = [accessType, Validators.required];
    })
    // Now setup the form Group
    this.aclFormGroup = this.formBuilder.group(formControls);
  }

  initAccessManager() {
    this.isLoading = true;
    this.subscriptions[0] = forkJoin([
      this.loadRoles(),
      this.loadAclForComponent()
    ])
      .subscribe(
        ([roles, acl]) => {
          this.isLoading = false;
          // Save up the roles and access list
          this.roles = roles;
          this.accessList = acl;
          // Set up the Component Name
          this.componentName = acl[0].component.name;
          // Init the Form
          this.initForm(roles, acl);
        }, err => {
          this.isLoading = true;
          this.messageService.add({
            severity: 'error',
            summary: `Error ${err.status}`,
            detail: err.error.message,
            sticky: false
          });
        }
      )
  }

  updateAcl() {
    if (!this.aclFormGroup.valid) return;
    // Save the ACL now to Database for the component
    // Get Access Lists
    this.aclFormGroup.disable();
    this.isAclSaving = true;
    // Prepare the data to save
    const data = Object.keys(this.aclFormGroup.value)
      .map(roleName => {
        const roleObj = this.roles.find(elem => elem.IDENTIFICATOR === roleName);
        const accessObj = this.accessList.find(elem => elem.role.identificator === roleName);
        return {
          id: accessObj ? accessObj.id : null,
          role: roleObj ? roleObj.ID : null,
          component: this.componentKey,
          accessType: this.aclFormGroup.value[roleName]
        }
      })
    this.subscriptions[1] = this.rbacService
      .saveAccessListByComponent(this.componentKey, data)
      .pipe(map((res) => res.results))
      .subscribe(
        acl => {
          // Update the Access List
          this.accessList = acl;
          this.isAclSaving = false;
          this.aclFormGroup.enable();
          this.messageService.add({
            severity:'success',
            summary:'Access list Saved!',
            detail: `RBAC is updated for '${this.componentName}'!`
          })
        }, err => {
          this.isAclSaving = false;
          console.error(err);
          this.messageService.add({
            severity: 'error',
            summary: `Error ${err.status}`,
            detail: err.error.message,
            sticky: false
          });
        }
      )
  }

  ngOnDestroy() {
    this.subscriptions.forEach(subscription => {
      if (subscription) {
        subscription.unsubscribe();
      }
    })
  }
}
