import {Component, OnDestroy, OnInit} from '@angular/core';
import {FormBuilder} from '@angular/forms';
import {ActionService} from '../action.service';
import {forkJoin, Subscription} from 'rxjs';
import {ControllerService} from '../../services/controller.service';
import {finalize} from 'rxjs/operators';
import {MessageService} from 'primeng/api';

@Component({
  selector: 'app-action-access',
  templateUrl: './action-access.component.html',
  styleUrls: ['./action-access.component.css']
})
export class ActionAccessComponent implements OnInit, OnDestroy {
  loaders: any = {};
  errors: any = {};
  selectedGroup: any;
  assignedGroupAccess: any[];
  filteredGroupAccess: any[];
  selectedIndividual: any;
  assignedIndividualAccess: any[];
  filteredIndividualAccess: any[];
  selectedBcUser: any;
  assignedBcUserAccess: any[];
  filteredBcUserAccess: any[];
  subscriptions: Subscription[] = [];
  constructor(private formBuilder: FormBuilder,
              private controller: ControllerService,
              private actionService: ActionService,
              private messageService: MessageService) {
  }

  ngOnInit(): void {
    const subscription = this.actionService.actionLoadCompleteSubject
      .subscribe(isActionLoaded => {
        if(isActionLoaded) {
          this.loadIndividualAccesses();
          this.loadGroupAccesses();
          this.loadBcUserAccesses();
        }
      });
    this.subscriptions.push(subscription)
  }

  loadIndividualAccesses() {
    // Check for Cache
    const cached = this.actionService.action.actionAccesses.individual;
    if(cached) {
      this.assignedIndividualAccess = [...cached];
      return;
    }
    const { id } = this.actionService.actionTemplate;
    const [service] = this.actionService.actionServices;
    this.loaders['individual-load'] = true;
    this.errors['individual-load'] = null;
    let inheritedAccessObservable = this.controller.getUserForServices(service.id);
    const customerId = this.actionService.customer?.id;
    if(customerId) {
      inheritedAccessObservable = this.controller.getUsersForServiceAndCustomer(customerId, service.id);
    }
    const subscription = forkJoin([
      inheritedAccessObservable,
      this.controller.getTemplateToUser(id)
    ]).pipe(finalize(() => this.loaders['individual-load'] = false))
      .subscribe((response: any)=> {
        const inherited = response[0].result || [];
        const template = response[1] || [];
        this.assignedIndividualAccess = [
          ...inherited.map(inh => ({...inh, inherited: true})),
          ...template.map(tmp => ({...tmp, inherited: false}))
        ];
        // Set the Cache
        this.actionService.action.actionAccesses.individual = [...this.assignedIndividualAccess];
      }, () => {
        this.errors['individual-load'] = { status: 501, message: 'Unable to load assigned individual accesses'}
      })
    this.subscriptions.push(subscription);
  }
  loadGroupAccesses() {
    // Check for Cache
    const cached = this.actionService.action.actionAccesses.group;
    if(cached) {
      this.assignedGroupAccess = [...cached];
      return;
    }
    this.loaders['group-load'] = true;
    this.errors['group-load'] = null;
    const { id } = this.actionService.actionTemplate;
    const [service] = this.actionService.actionServices;
    let inheritedAccessObservable = this.controller.getRolesForServices(service.id);
    const customerId = this.actionService.customer?.id;
    if(customerId) {
      inheritedAccessObservable = this.controller.getRolesForServiceAndCustomer(customerId, service.id);
    }
    const subscription = forkJoin([
      inheritedAccessObservable,
      this.controller.getTemplateToRole(id)
    ]).pipe(finalize(() => this.loaders['group-load'] = false))
      .subscribe((response: any)=> {
        const inherited = response[0].result || [];
        const template = response[1] || [];
        this.assignedGroupAccess = [
          ...inherited.map(inh => ({...inh, inherited: true})),
          ...template.map(tmp => ({...tmp, inherited: false}))
        ];
        // Set the Cache
        this.actionService.action.actionAccesses.group = [...this.assignedGroupAccess]
      }, () => {
        this.errors['group-load'] = { status: 501, message: 'Unable to load assigned group accesses'}
      })
    this.subscriptions.push(subscription);
  }
  loadBcUserAccesses() {
    // Check for Cache
    const cached = this.actionService.action.actionAccesses.businessCenter;
    if(cached) {
      this.assignedBcUserAccess = [...cached];
      return;
    }
    this.loaders['bc-user-load'] = true;
    this.errors['bc-user-load'] = null;
    const { id } = this.actionService.actionTemplate;
    const [service] = this.actionService.actionServices;
    let inheritedAccessObservable = this.controller.getBcUserForServices(service.id);
    const customerId = this.actionService.customer?.id;
    if(customerId) {
      inheritedAccessObservable = this.controller.getBcUserForServiceAndCustomer(customerId, service.id);
    }
    const subscription = forkJoin([
      inheritedAccessObservable,
      this.controller.getTemplateToBcUser(id)
    ]).pipe(finalize(() => this.loaders['bc-user-load'] = false))
      .subscribe((response: any)=> {
        const inherited = response[0].result || [];
        const template = response[1] || [];
        this.assignedBcUserAccess = [
          ...inherited.map(inh => ({...inh, inherited: true})),
          ...template.map(tmp => ({...tmp, inherited: false}))
        ];
        this.actionService.action.actionAccesses.businessCenter = [...this.assignedBcUserAccess]
      }, () => {
        this.errors['bc-user-load'] = { status: 501, message: 'Unable to load assigned bc user accesses'}
      })
    this.subscriptions.push(subscription);
  }

  filterIndividuals() {
    // Check if cache is a hit, if yes use it or else call endpoint
    const cachedIndividuals = this.actionService.getActionCache('individuals');
    if(cachedIndividuals) {
      this.filteredIndividualAccess = [...cachedIndividuals];
      return;
    }
    this.loaders['individual'] = true;
    this.errors['individual'] = null;
    const subscription = this.controller.getExistingUsersFromDB()
      .pipe(finalize(() => this.loaders['individual'] = false))
      .subscribe(individuals => {
        // Set the Cache
        this.actionService.setActionCache('individuals', individuals);
        this.filteredIndividualAccess = [...individuals];
      });
    this.subscriptions.push(subscription);
  }
  filterGroups() {
    // Check if cache is a hit, if yes use it or else call endpoint
    const cachedGroups = this.actionService.getActionCache('groups');
    if(cachedGroups) {
      this.filteredGroupAccess = [...cachedGroups]
      return;
    }
    this.loaders['group'] = true;
    this.errors['group'] = null;
    const subscription = this.controller.getRoles()
      .pipe(finalize(() => this.loaders['group'] = false))
      .subscribe(groups => {
        // Set the Cache
        this.actionService.setActionCache('groups', groups);
        this.filteredGroupAccess = [...groups];
      });
    this.subscriptions.push(subscription);
  }
  filterBcCustomers() {
    // Check if cache is a hit, if yes use it or else call endpoint
    const cachedBcCustomers = this.actionService.getActionCache('bcCustomers');
    if(cachedBcCustomers) {
      this.filteredBcUserAccess = [...cachedBcCustomers];
      return;
    }
    this.loaders['bc-user'] = true;
    this.errors['bc-user'] = null;
    const subscription = this.controller.getBcUsers()
      .pipe(finalize(() => this.loaders['bc-user'] = false))
      .subscribe(bcCustomers => {
        // Set the Cache
        this.actionService.setActionCache('bcCustomers', bcCustomers);
        this.filteredBcUserAccess = [...bcCustomers];
      });
    this.subscriptions.push(subscription);
  }

  onAssignGroupAccess() {
    if(!this.selectedGroup) return;
    this.loaders['group-assign'] = true;
    const subscription = this.controller
      .assignTemplateToRole(this.selectedGroup.ID, this.actionService.actionTemplate.id)
      .pipe(finalize(() => this.loaders['group-assign'] = false))
      .subscribe(() => {
        this.assignedGroupAccess.push({ ...this.selectedGroup, inherited: false });
        this.selectedGroup = null;
        // Update Cache
        this.actionService.action.actionAccesses.group = [...this.assignedGroupAccess];
        this.messageService.add({
          severity: 'success',
          summary: 'Access Assigned',
          detail: `Successfully assigned access for the selected group!`
        });
      }, () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Access Assignment Error',
          detail: `Failed to assign access for the selected group!`,
          sticky: true
        })
      })
    this.subscriptions.push(subscription);
  }
  onRemoveGroupAccess(id) {
    if(!id) return;
    this.loaders[`group-revoke-${id}`] = true;
    const subscription = this.controller
      .deleteRoleForActionTemplate(id, this.actionService.actionTemplate.id)
      .pipe(finalize(() => this.loaders[`group-revoke-${id}`] = false))
      .subscribe(() => {
        const index = this.assignedGroupAccess
          .findIndex(grAccess => grAccess.ID === id && !grAccess.inherited);
        this.assignedGroupAccess.splice(index, 1);
        // Update Cache
        this.actionService.action.actionAccesses.group = [...this.assignedGroupAccess];
        this.messageService.add({
          severity: 'success',
          summary: 'Access Revoked',
          detail: `Successfully revoked access for the selected group!`
        });
      }, () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Revoke Access Error',
          detail: `Failed to revoke access for the selected group!`,
          sticky: true
        });
      })
    this.subscriptions.push(subscription);
  }

  onAssignIndividualAccess(){
    if(!this.selectedIndividual) return;
    this.loaders['individual-assign'] = true;
    const subscription = this.controller
      .assignTemplateToUser(this.selectedIndividual.ID, this.actionService.actionTemplate.id)
      .pipe(finalize(() => this.loaders['individual-assign'] = false))
      .subscribe(() => {
        this.assignedIndividualAccess.push({ ...this.selectedIndividual, inherited: false });
        this.selectedIndividual = null;
        // Set the Cache
        this.actionService.action.actionAccesses.individual = [...this.assignedIndividualAccess];
        this.messageService.add({
          severity: 'success',
          summary: 'Access Assigned',
          detail: `Successfully assigned access for the selected individual!`
        });
      }, () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Access Assignment Error',
          detail: `Failed to assign access for the selected individual!`,
          sticky: true
        })
      })
    this.subscriptions.push(subscription);
  }
  onRemoveIndividualAccess(id) {
    if(!id) return;
    this.loaders[`individual-revoke-${id}`] = true;
    const subscription = this.controller
      .deleteUsersForActionTemplate(id, this.actionService.actionTemplate.id)
      .pipe(finalize(() => this.loaders[`individual-revoke-${id}`] = false))
      .subscribe(() => {
        const index = this.assignedIndividualAccess
          .findIndex(acc => acc.ID === id && !acc.inherited);
        this.assignedIndividualAccess.splice(index, 1);
        // Set the Cache
        this.actionService.action.actionAccesses.individual = [...this.assignedIndividualAccess];
        this.messageService.add({
          severity: 'success',
          summary: 'Access Revoked',
          detail: `Successfully revoked access for the selected individual!`
        });
      }, () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Revoke Access Error',
          detail: `Failed to revoke access for the selected individual!`,
          sticky: true
        });
      })
    this.subscriptions.push(subscription);
  }

  onAssignBcUserAccess(){
    if(!this.selectedBcUser) return;
    this.loaders['bc-user-assign'] = true;
    const subscription = this.controller
      .assignTemplateToBCUser(this.selectedBcUser.ID, this.actionService.actionTemplate.id)
      .pipe(finalize(() => this.loaders['bc-user-assign'] = false))
      .subscribe(() => {
        this.assignedBcUserAccess.push({ ...this.selectedBcUser, inherited: false });
        this.selectedBcUser = null;
        // Update cache
        this.actionService.action.actionAccesses.businessCenter = [...this.assignedBcUserAccess];
        this.messageService.add({
          severity: 'success',
          summary: 'Access Assigned',
          detail: `Successfully assigned access for the selected bc user!`
        });
      }, () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Access Assignment Error',
          detail: `Failed to assign access for the selected bc user!`,
          sticky: true
        })
      })
    this.subscriptions.push(subscription);
  }
  onRemoveBcUserAccess(id) {
    if(!id) return;
    this.loaders[`bc-user-revoke-${id}`] = true;
    const subscription = this.controller
      .deleteBcUserForActionTemplate(id, this.actionService.actionTemplate.id)
      .pipe(finalize(() => this.loaders[`bc-user-revoke-${id}`] = false))
      .subscribe(() => {
        const index = this.assignedBcUserAccess
          .findIndex(acc => acc.ID === id && !acc.inherited);
        this.assignedBcUserAccess.splice(index, 1);
        // Update cache
        this.actionService.action.actionAccesses.businessCenter = [...this.assignedBcUserAccess];
        this.messageService.add({
          severity: 'success',
          summary: 'Access Revoked',
          detail: `Successfully revoked access for the selected bc user!`
        });
      }, () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Revoke Access Error',
          detail: `Failed to revoke access for the selected bc user!`,
          sticky: true
        });
      })
    this.subscriptions.push(subscription);
  }

  ngOnDestroy() {
    this.subscriptions.forEach((subscription) => {
      if(subscription) {
        subscription.unsubscribe();
      }
    })
  }
}
