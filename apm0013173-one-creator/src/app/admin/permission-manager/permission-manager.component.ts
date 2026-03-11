import { Component, Input, ViewEncapsulation, OnChanges, Output, EventEmitter } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { MessageService, ConfirmationService, SelectItem } from 'primeng/api';
import {ControllerService} from "../../services/controller.service";

@Component({
  selector: 'app-permission-manager',
  templateUrl: './permission-manager.component.html',
  styleUrls: ['./permission-manager.component.scss'],
  encapsulation: ViewEncapsulation.None
})

export class PermissionManagerComponent implements OnChanges {
  @Input() service: any = {};
  @Input() customer: any = {};
  @Input() dataFromActionTemplate: any = {};
  @Input() template: any = {};
  @Output() eventEmitter = new EventEmitter<any>();
  users: any[] = [];
  usersForDropdown: SelectItem[] = [];
  assignedUsers: any[] = [];
  groups: any[] = [];
  assignedGroups: any[] = [];
  customers: any[] = [];
  assignedCustomers: any[] = [];
  perForm: FormGroup;

  constructor(private fb: FormBuilder,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private controller: ControllerService) {
    this.generateFormGroup();
  }

  ngOnChanges(): void {
    // reset and load options for dropdowns
    this.assignedUsers = [];
    let assignedTemp = [];
    this.assignedGroups = [];
    this.assignedCustomers = [];
    this.perForm.reset();
    this.controller.getExistingUsersFromDB().subscribe(result => {
      this.users = result;
      this.usersForDropdown = [];
      for (let i = 0; i < this.users.length; i++) {
        this.usersForDropdown.push({
          label: this.users[i]["NAME"],
          value: {
            ATTUID: this.users[i]["ATTUID"],
            ID: this.users[i]["ID"],
            NAME: this.users[i]["NAME"]
          }
        });
      }
    }, error => {
      this.messageService.add({ severity: 'error', summary: 'Service Message', detail: 'Error when loading users!', sticky: true });
    });
    this.controller.getRoles().subscribe(result => {
      this.groups = result;
    }, error => {
      this.messageService.add({ severity: 'error', summary: 'Service Message', detail: 'Error when loading roles!', sticky: true });
    });
    this.controller.getBcUsers().subscribe(result => {
      this.customers = result;
    }, error => {
      this.messageService.add({ severity: 'error', summary: 'Service Message', detail: 'Error when loading bc users!', sticky: true });
    });
    if (this.customer['id'] && this.service['id']) {
      // load assigned users, roles and bc users on services
      this.controller.getUsersForServiceAndCustomer(this.customer['id'], this.service['id']).subscribe(result => {
        assignedTemp = [];
        if (result && result['result']) {
          assignedTemp = result['result'];
          if (assignedTemp.length > 0) {
            assignedTemp.map(data => {
              this.assignedUsers.push(data);
            });
          }
        }
      }, error => {
        this.messageService.add({ severity: 'error', summary: 'Service Message', detail: 'Error when loading assigned users!', sticky: true });
      });
      this.controller.getRolesForServiceAndCustomer(this.customer['id'], this.service['id']).subscribe(result => {
        assignedTemp = [];
        if (result && result['result']) {
          assignedTemp = result['result'];
          if (assignedTemp.length > 0) {
            assignedTemp.map(data => {
              this.assignedGroups.push(data);
            });
          }
        }
      }, error => {
        this.messageService.add({ severity: 'error', summary: 'Service Message', detail: 'Error when loading assigned roles!', sticky: true });
      });
      this.controller.getBcUserForServiceAndCustomer(this.customer['id'], this.service['id']).subscribe(bcUsers => {
        assignedTemp = [];
        if (bcUsers && bcUsers['result']) {
          assignedTemp = bcUsers['result'];
          if (assignedTemp.length > 0) {
            assignedTemp.map(data => {
              this.assignedCustomers.push(data);
            });
          }
        }
      }, error => {
        this.messageService.add({ severity: 'error', summary: 'Service Message', detail: 'Error when loading assigned bc users!', sticky: true });
      });
    } else if (this.template['id']) {
      // load inheritage permissions from relationship between customer and service
      if (this.dataFromActionTemplate['customerId'] && this.dataFromActionTemplate["serviceId"]) {
        this.controller.getUsersForServiceAndCustomer(this.dataFromActionTemplate['customerId'], this.dataFromActionTemplate["serviceId"]).subscribe(result => {
          assignedTemp = [];
          if (result && result['result']) {
            for (let i = 0; i < result['result'].length; i++) {
              result['result'][i]['inherited'] = true;
            }
            assignedTemp = result['result'];
            if (assignedTemp.length > 0) {
              assignedTemp.map(data => {
                this.assignedUsers.push(data);
              });
            }
          }
        }, error => {
          this.messageService.add({ severity: 'error', summary: 'Service Message', detail: 'Error when loading assigned users!', sticky: true });
        });
        this.controller.getRolesForServiceAndCustomer(this.dataFromActionTemplate['customerId'], this.dataFromActionTemplate["serviceId"]).subscribe(result => {
          assignedTemp = [];
          if (result && result['result']) {
            for (let i = 0; i < result['result'].length; i++) {
              result['result'][i]['inherited'] = true;
            }
            assignedTemp = result['result'];
            if (assignedTemp.length > 0) {
              assignedTemp.map(data => {
                this.assignedGroups.push(data);
              });
            }

          }
        }, error => {
          this.messageService.add({ severity: 'error', summary: 'Service Message', detail: 'Error when loading assigned roles!', sticky: true });
        });
        this.controller.getBcUserForServiceAndCustomer(this.dataFromActionTemplate['customerId'], this.dataFromActionTemplate["serviceId"]).subscribe(bcUsers => {
          assignedTemp = [];
          if (bcUsers && bcUsers['result']) {
            for (let i = 0; i < bcUsers['result'].length; i++) {
              bcUsers['result'][i]['inherited'] = true;
            }
            assignedTemp = bcUsers['result'];
            if (assignedTemp.length > 0) {
              assignedTemp.map(data => {
                this.assignedCustomers.push(data);
              });
            }
          }
        }, error => {
          this.messageService.add({ severity: 'error', summary: 'Service Message', detail: 'Error when loading assigned bc users!', sticky: true });
        });
      } else if (this.dataFromActionTemplate["serviceId"]) {
        // load inheritage permissions from general service permissions
        this.controller.getUserForServices(this.dataFromActionTemplate["serviceId"]).subscribe(result => {
          assignedTemp = [];
          if (result && result['result']) {
            for (let i = 0; i < result['result'].length; i++) {
              result['result'][i]['inherited'] = true;
            }
            assignedTemp = result['result']
            if (assignedTemp.length > 0) {
              assignedTemp.map(data => {
                this.assignedUsers.push(data);
              });
            }
          }
        }, error => {
          this.messageService.add({ severity: 'error', summary: 'Service Message', detail: 'Error when loading assigned users!', sticky: true });
        });
        this.controller.getRolesForServices(this.dataFromActionTemplate["serviceId"]).subscribe(result => {
          assignedTemp = [];
          if (result && result['result']) {
            for (let i = 0; i < result['result'].length; i++) {
              result['result'][i]['inherited'] = true;
            }
            assignedTemp = result['result'];
            if (assignedTemp.length > 0) {
              assignedTemp.map(data => {
                this.assignedGroups.push(data);
              });
            }
          }
        }, error => {
          this.messageService.add({ severity: 'error', summary: 'Service Message', detail: 'Error when loading assigned roles!', sticky: true });
        });
        this.controller.getBcUserForServices(this.dataFromActionTemplate["serviceId"]).subscribe(bcUsers => {
          assignedTemp = [];
          if (bcUsers && bcUsers['result']) {
            for (let i = 0; i < bcUsers['result'].length; i++) {
              bcUsers['result'][i]['inherited'] = true;
            }
            assignedTemp = bcUsers['result'];
            if (assignedTemp.length > 0) {
              assignedTemp.map(data => {
                this.assignedCustomers.push(data);
              });
            }
          }
        }, error => {
          this.messageService.add({ severity: 'error', summary: 'Service Message', detail: 'Error when loading assigned bc users!', sticky: true });
        });
      }
      // load assigned users, roles and bc users on action template
      this.controller.getTemplateToUser(this.template['id']).subscribe(users => {
        this.assignedUsers.concat(users);
        if (users.length > 0) {
          users.map(data => {
            this.assignedUsers.push(data);
          });
        }
      }, error => {
        this.messageService.add({ severity: 'error', summary: 'Service Message', detail: 'Error when loading assigned users!', sticky: true });
      });
      this.controller.getTemplateToRole(this.template['id']).subscribe(roles => {
        if (roles.length > 0) {
          roles.map(data => {
            this.assignedGroups.push(data);
          });
        }
      }, error => {
        this.messageService.add({ severity: 'error', summary: 'Service Message', detail: 'Error when loading assigned roles!', sticky: true });
      });
      this.controller.getTemplateToBcUser(this.template['id']).subscribe(roles => {
        if (roles.length > 0) {
          roles.map(data => {
            this.assignedCustomers.push(data);
          });
        }
      }, error => {
        this.messageService.add({ severity: 'error', summary: 'Service Message', detail: 'Error when loading assigned roles!', sticky: true });
      });
    } else if (!this.customer['id'] && this.service['id']) {
      this.controller.getUserForServices(this.service['id']).subscribe(result => {
        assignedTemp = [];
        if (result && result['result']) {
          assignedTemp = result['result'];
          if (assignedTemp.length > 0) {
            assignedTemp.map(data => {
              this.assignedUsers.push(data);
            });
          }
        }
      }, error => {
        this.messageService.add({ severity: 'error', summary: 'Service Message', detail: 'Error when loading assigned users!', sticky: true });
      });
      this.controller.getRolesForServices(this.service['id']).subscribe(result => {
        assignedTemp = [];
        if (result && result['result']) {
          assignedTemp = result['result'];
          if (assignedTemp.length > 0) {
            assignedTemp.map(data => {
              this.assignedGroups.push(data);
            });
          }
        }
      }, error => {
        this.messageService.add({ severity: 'error', summary: 'Service Message', detail: 'Error when loading assigned roles!', sticky: true });
      });
      this.controller.getBcUserForServices(this.service['id']).subscribe(bcUsers => {
        assignedTemp = [];
        if (bcUsers && bcUsers['result']) {
          assignedTemp = bcUsers['result'];
          if (assignedTemp.length > 0) {
            assignedTemp.map(data => {
              this.assignedCustomers.push(data);
            });
          }
        }
      }, error => {
        this.messageService.add({ severity: 'error', summary: 'Service Message', detail: 'Error when loading assigned bc users!', sticky: true });
      });
    }
  }

  /**
   * Generate form group for permission manager
   */
  public generateFormGroup(): void {
    this.perForm = this.fb.group({
      user: new FormControl('', Validators.required),
      group: new FormControl('', Validators.required),
      customer: new FormControl('', Validators.required)
    });
  }

  /**
   * Create permission for user
   */
  public addUser() {
    if (this.perForm.controls['user'].valid) {
      this.eventEmitter.emit(true);
      if (this.customer['id'] && this.service['id']) {
        // add user permission for service
        this.controller.createIndividualAccess({
          "customerId": this.customer['id'],
          "serviceId": this.service['id'],
          "userId": this.perForm.get('user').value['ID']
        }).subscribe(result => {
          this.messageService.add({
            severity: 'success',
            summary: 'Successfull created',
            detail: 'Permission for user successfully created!'
          });
          this.assignedUsers.push({ ID: this.perForm.get('user').value['ID'], NAME: this.perForm.get('user').value['NAME'], ATTUID: this.perForm.get('user').value['ATTUID'], BC_USER_ID: this.perForm.get('user').value['BC_USER_ID'], });
          this.perForm.controls['user'].reset();
          this.eventEmitter.emit(false);
        }, error => {
          this.messageService.add({ severity: 'error', summary: 'Service Message', detail: 'Error when creating permission for user!', sticky: true });
          this.eventEmitter.emit(false);
        });
      } else if (this.template['id']) {
        // add user permission for action template
        const user = { ID: this.perForm.get('user').value['ID'], NAME: this.perForm.get('user').value['NAME'], ATTUID: this.perForm.get('user').value['ATTUID'], BC_USER_ID: this.perForm.get('user').value['BC_USER_ID'] };
        if (!(this.assignedUsers.filter(usr => usr.ID === user.ID && usr.NAME === user.NAME && usr.ATTUID === user.ATTUID).length > 0)) {
          this.controller.assignTemplateToUser(
            this.perForm.get('user').value['ID'],
            this.template['id']
          ).subscribe(result => {
            this.messageService.add({
              severity: 'success',
              summary: 'Successfull created',
              detail: 'Permission for user successfully created!'
            });
            this.assignedUsers.push(user);
            this.perForm.controls['user'].reset();
            this.eventEmitter.emit(false);
          }, error => {
            this.messageService.add({ severity: 'error', summary: 'Service Message', detail: 'Error when creating permission for user!', sticky: true });
            this.eventEmitter.emit(false);
          });
        } else {
          this.eventEmitter.emit(false);
          this.messageService.add({ severity: 'error', summary: 'Service Message', detail: 'You can not add permission for ' + user.NAME + ' user because is inherited!', sticky: true });
        }
      } else if (!this.customer['id'] && this.service['id']) {
        this.controller.createIndividualAccessForService(
          this.perForm.get('user').value['ID'], this.service['id'],
        ).subscribe(result => {
          this.eventEmitter.emit(true);
          this.messageService.add({
            severity: 'success',
            summary: 'Successfull created',
            detail: 'Permission for user successfully created!'
          });
          this.assignedUsers.push({ ID: this.perForm.get('user').value['ID'], NAME: this.perForm.get('user').value['NAME'], ATTUID: this.perForm.get('user').value['ATTUID'], BC_USER_ID: this.perForm.get('user').value['BC_USER_ID'], });
          this.perForm.controls['user'].reset();
          this.eventEmitter.emit(false);
        }, error => {
          this.messageService.add({ severity: 'error', summary: 'Service Message', detail: 'Error when creating permission for user!', sticky: true });
          this.eventEmitter.emit(false);
        });
      }
    } else {
      this.perForm.controls['user'].markAsDirty();
      this.perForm.controls['user'].markAsTouched();
    }
  }

  /**
   * Delete permission for selected user
   */
  public removeUser(user) {
    this.confirmationService.confirm({
      icon: 'pi pi-exclamation-triangle',
      header: 'Confirmation',
      message: 'Are you sure that you want to delete permission for "' + user['NAME'] + '"?',
      accept: () => {
        this.eventEmitter.emit(true);
        if (this.customer['id'] && this.service['id']) {
          // remove user permission for service
          this.controller.deleteUsersForServiceAndCustomer(this.customer['id'],
            this.service['id'],
            user['ID']
          ).subscribe(result => {
            const checkUserPermission = (userCheck) => userCheck['ID'] == user['ID'];
            const userIndex = this.assignedUsers.findIndex(checkUserPermission);
            this.assignedUsers.splice(userIndex, 1);
            this.eventEmitter.emit(false);
            this.messageService.add({ severity: 'success', summary: 'Service Message', detail: 'Permission successfully deleted!' });
          }, error => {
            this.messageService.add({ severity: 'error', summary: 'Service Message', detail: 'Error when deleting permission!', sticky: true });
            this.eventEmitter.emit(false);
          });
        } else if (this.template['id']) {
          // remove user permission for action template
          this.controller.deleteUsersForActionTemplate(
            user['ID'],
            this.template['id']
          ).subscribe(result => {
            const checkUserPermission = (userCheck) => userCheck['ID'] == user['ID'];
            const userIndex = this.assignedUsers.findIndex(checkUserPermission);
            this.assignedUsers.splice(userIndex, 1);
            this.eventEmitter.emit(false);
            this.messageService.add({ severity: 'success', summary: 'Service Message', detail: 'Permission successfully deleted!' });
          }, error => {
            this.messageService.add({ severity: 'error', summary: 'Service Message', detail: 'Error when deleting permission!', sticky: true });
            this.eventEmitter.emit(false);
          });
        }
        if (!this.customer['id'] && this.service['id']) {
          this.controller
            .deleteUsersForService(
              this.service["id"],
              user["ID"]
            )
            .subscribe(
              (result) => {
                this.eventEmitter.emit(true);
                const checkUserPermission = (userCheck) =>
                  userCheck["ID"] == user["ID"];
                const userIndex = this.assignedUsers.findIndex(
                  checkUserPermission
                );
                this.assignedUsers.splice(userIndex, 1);
                this.eventEmitter.emit(false);
                this.messageService.add({ severity: 'success', summary: 'Service Message', detail: 'Permission successfully deleted!' });
              },
              (error) => {
                this.messageService.add({ severity: 'error', summary: 'Service Message', detail: 'Error when deleting permission!', sticky: true });
                this.eventEmitter.emit(false);
              }
            );
        }
      }
    });
  }

  /**
   * Create permission for group
   */
  public addGroup() {
    if (this.perForm.controls['group'].valid) {
      this.eventEmitter.emit(true);
      if (this.customer['id'] && this.service['id']) {
        // add role permission for service
        this.controller.createRoleAccess({
          customerId: this.customer['id'],
          serviceId: this.service['id'],
          roleId: this.perForm.get('group').value['ID']
        }).subscribe(result => {
          this.messageService.add({
            severity: 'success',
            summary: 'Successfull created',
            detail: 'Permission for group successfully created!'
          });
          this.assignedGroups.push({ ID: this.perForm.get('group').value['ID'], IDENTIFICATOR: this.perForm.get('group').value['IDENTIFICATOR'] });
          this.perForm.controls['group'].reset();
          this.eventEmitter.emit(false);
        }, error => {
          this.messageService.add({ severity: 'error', summary: 'Service Message', detail: 'Error when creating permission!', sticky: true });
          this.eventEmitter.emit(false);
        });
      } else if (this.template['id']) {
        // add user permission for action template
        const role = { ID: this.perForm.get('group').value['ID'], IDENTIFICATOR: this.perForm.get('group').value['IDENTIFICATOR'] };
        if (!(this.assignedGroups.filter(group => group.ID === role.ID && group.IDENTIFICATOR === role.IDENTIFICATOR).length > 0)) {
          this.controller.assignTemplateToRole(
            this.perForm.get('group').value['ID'],
            this.template['id']
          ).subscribe(result => {
            this.messageService.add({
              severity: 'success',
              summary: 'Successfull created',
              detail: 'Permission for group successfully created!'
            });
            this.assignedGroups.push(role);
            this.perForm.controls['group'].reset();
            this.eventEmitter.emit(false);
          }, error => {
            this.messageService.add({ severity: 'error', summary: 'Service Message', detail: 'Error when creating permission!', sticky: true });
            this.eventEmitter.emit(false);
          });
        } else {
          this.eventEmitter.emit(false);
          this.messageService.add({ severity: 'error', summary: 'Service Message', detail: 'You can not add permission for ' + role.IDENTIFICATOR + ' role because is inherited!', sticky: true });
        }
      } else if (!this.customer['id'] && this.service['id']) {
        this.controller.createRoleAccessForService(
          this.perForm.get('group').value['ID'],
          this.service['id']
        ).subscribe(result => {
          this.messageService.add({
            severity: 'success',
            summary: 'Successfull created',
            detail: 'Permission for group successfully created!'
          });
          this.assignedGroups.push({ ID: this.perForm.get('group').value['ID'], IDENTIFICATOR: this.perForm.get('group').value['IDENTIFICATOR'] });
          this.perForm.controls['group'].reset();
          this.eventEmitter.emit(false);
        }, error => {
          this.messageService.add({ severity: 'error', summary: 'Service Message', detail: 'Error when creating permission!', sticky: true });
          this.eventEmitter.emit(false);
        });
      }
    } else {
      this.perForm.controls['group'].markAsDirty();
      this.perForm.controls['group'].markAsTouched();
    }
  }

  /**
   * Delete permission for selected group
   */
  public removeGroup(group) {
    this.confirmationService.confirm({
      icon: 'pi pi-exclamation-triangle',
      header: 'Confirmation',
      message: 'Are you sure that you want to delete permission for "' + group['IDENTIFICATOR'] + '" role?',
      accept: () => {
        this.eventEmitter.emit(true);
        if (this.customer['id'] && this.service['id']) {
          // remove role permission for service
          this.controller.deleteRoleForServiceAndCustomer(this.customer['id'],
            this.service['id'],
            group['ID']
          ).subscribe(result => {
            const checkRolePermission = (roleCheck) => roleCheck['ID'] == group['ID'];
            const roleIndex = this.assignedGroups.findIndex(checkRolePermission);
            this.assignedGroups.splice(roleIndex, 1);
            this.eventEmitter.emit(false);
            this.messageService.add({ severity: 'success', summary: 'Service Message', detail: 'Permission successfully deleted!' });
          }, error => {
            this.messageService.add({ severity: 'error', summary: 'Service Message', detail: 'Error when deleting permission!', sticky: true });
            this.eventEmitter.emit(false);
          });
        } else if (this.template['id']) {
          // remove role permission for action template
          this.controller.deleteRoleForActionTemplate(
            group['ID'],
            this.template['id']
          ).subscribe(result => {
            const checkRolePermission = (roleCheck) => roleCheck['ID'] == group['ID'];
            const roleIndex = this.assignedGroups.findIndex(checkRolePermission);
            this.assignedGroups.splice(roleIndex, 1);
            this.eventEmitter.emit(false);
            this.messageService.add({ severity: 'success', summary: 'Service Message', detail: 'Permission successfully deleted!' });
          }, error => {
            this.messageService.add({ severity: 'error', summary: 'Service Message', detail: 'Error when deleting permission!', sticky: true });
            this.eventEmitter.emit(false);
          });
        } else if (!this.customer['id'] && this.service['id']) {
          this.controller
            .deleteRoleForService(
              this.service["id"],
              group["ID"]
            )
            .subscribe(
              (result) => {
                const checkRolePermission = (roleCheck) =>
                  roleCheck["ID"] == group["ID"];
                const roleIndex = this.assignedGroups.findIndex(
                  checkRolePermission
                );
                this.assignedGroups.splice(roleIndex, 1);
                this.eventEmitter.emit(false);
                this.messageService.add({ severity: 'success', summary: 'Service Message', detail: 'Permission successfully deleted!' });
              },
              (error) => {
                this.messageService.add({ severity: 'error', summary: 'Service Message', detail: 'Error when deleting permission!', sticky: true });
                this.eventEmitter.emit(false);
              }
            );
        }
      }
    });
  }

  /**
   * Create permission for customer
   */
  public addCustomer() {
    if (this.perForm.controls['customer'].valid) {
      this.eventEmitter.emit(true);
      if (this.customer['id'] && this.service['id']) {
        // add bc user permission for service
        this.controller.createBcUserAccess({
          customerId: this.customer['id'],
          serviceId: this.service['id'],
          userId: this.perForm.get('customer').value['ID']
        }).subscribe(result => {
          this.messageService.add({
            severity: 'success',
            summary: 'Successfull created',
            detail: 'Permission for customer successfully created!'
          });
          this.assignedCustomers.push({ ID: this.perForm.get('customer').value['ID'], NAME: this.perForm.get('customer').value['NAME'], BC_USER_ID: this.perForm.get('customer').value['BC_USER_ID'] });
          this.perForm.controls['customer'].reset();
          this.eventEmitter.emit(false);
        }, error => {
          this.messageService.add({ severity: 'error', summary: 'Service Message', detail: 'Error when creating permission!', sticky: true });
          this.eventEmitter.emit(false);
        });
      } else if (this.template['id']) {
        // add bc user permission for action template
        const customer = { ID: this.perForm.get('customer').value['ID'], NAME: this.perForm.get('customer').value['NAME'], BC_USER_ID: this.perForm.get('customer').value['BC_USER_ID'] };
        if (!(this.assignedCustomers.filter(cust => cust.ID === customer.ID && cust.NAME === customer.NAME && cust.BC_USER_ID === customer.BC_USER_ID).length > 0)) {
          this.controller.assignTemplateToBCUser(
            this.perForm.get('customer').value['ID'],
            this.template['id']
          ).subscribe(result => {
            this.messageService.add({
              severity: 'success',
              summary: 'Successfull created',
              detail: 'Permission for customer successfully created!'
            });
            this.assignedCustomers.push(customer);
            this.perForm.controls['customer'].reset();
            this.eventEmitter.emit(false);
          }, error => {
            this.messageService.add({ severity: 'error', summary: 'Service Message', detail: 'Error when creating permission!', sticky: true });
            this.eventEmitter.emit(false);
          });
        } else {
          this.eventEmitter.emit(false);
          this.messageService.add({ severity: 'error', summary: 'Service Message', detail: 'You can not add permission for ' + customer.NAME + ' customer because is inherited!', sticky: true });
        }
      } else if (!this.customer['id'] && this.service['id']) {
        this.controller.createBcUserAccessForService(
          this.perForm.get('customer').value['ID'],
          this.service['id']
        ).subscribe(result => {
          this.messageService.add({
            severity: 'success',
            summary: 'Successfull created',
            detail: 'Permission for customer successfully created!'
          });
          this.assignedCustomers.push({ ID: this.perForm.get('customer').value['ID'], NAME: this.perForm.get('customer').value['NAME'], BC_USER_ID: this.perForm.get('customer').value['BC_USER_ID'] });
          this.perForm.controls['customer'].reset();
          this.eventEmitter.emit(false);
        }, error => {
          this.messageService.add({ severity: 'error', summary: 'Service Message', detail: 'Error when creating permission!', sticky: true });
          this.eventEmitter.emit(false);
        });
      }
    } else {
      this.perForm.controls['customer'].markAsDirty();
      this.perForm.controls['customer'].markAsTouched();
    }
  }

  /**
   * Delete permission for selected customer
   */
  public removeCustomer(customer) {
    this.confirmationService.confirm({
      icon: 'pi pi-exclamation-triangle',
      header: 'Confirmation',
      message: 'Are you sure that you want to delete permission for "' + customer['NAME'] + '"?',
      accept: () => {
        this.eventEmitter.emit(true);
        if (this.customer['id'] && this.service['id']) {
          // remove bc user permission for service
          this.controller.deleteBcUserForServiceAndCustomer(this.customer['id'],
            this.service['id'],
            customer['ID'])
            .subscribe(result => {
              const checkBcUserPermission = (userCheck) => userCheck['ID'] == customer['ID'];
              const bcUserIndex = this.assignedCustomers.findIndex(checkBcUserPermission);
              this.assignedCustomers.splice(bcUserIndex, 1);
              this.eventEmitter.emit(false);
              this.messageService.add({ severity: 'success', summary: 'Service Message', detail: 'Permission successfully deleted!' });
            }, error => {
              this.messageService.add({ severity: 'error', summary: 'Service Message', detail: 'Error when deleting permission!', sticky: true });
              this.eventEmitter.emit(false);
            });
        } else if (this.template['id']) {
          // remove bc user permission for action template
          this.controller.deleteBcUserForActionTemplate(
            customer['ID'],
            this.template['id']
          ).subscribe(result => {
            const checkBcUserPermission = (userCheck) => userCheck['ID'] == customer['ID'];
            const bcUserIndex = this.assignedCustomers.findIndex(checkBcUserPermission);
            this.assignedCustomers.splice(bcUserIndex, 1);
            this.eventEmitter.emit(false);
            this.messageService.add({ severity: 'success', summary: 'Service Message', detail: 'Permission successfully deleted!' });
          }, error => {
            this.messageService.add({ severity: 'error', summary: 'Service Message', detail: 'Error when deleting permission!', sticky: true });
            this.eventEmitter.emit(false);
          });
        } else if (!this.customer['id'] && this.service['id']) {
          this.controller
            .deleteBcUserForService(this.service["id"], customer["ID"])
            .subscribe(
              (result) => {
                const checkBcUserPermission = (userCheck) =>
                  userCheck["ID"] == customer["ID"];
                const bcUserIndex = this.assignedCustomers.findIndex(
                  checkBcUserPermission
                );
                this.assignedCustomers.splice(bcUserIndex, 1);
                this.eventEmitter.emit(false);
                this.messageService.add({ severity: 'success', summary: 'Service Message', detail: 'Permission successfully deleted!' });
              },
              (error) => {
                this.messageService.add({ severity: 'error', summary: 'Service Message', detail: 'Error when deleting permission!', sticky: true });
                this.eventEmitter.emit(false);
              }
            );
        }
      }
    });
  }
}
