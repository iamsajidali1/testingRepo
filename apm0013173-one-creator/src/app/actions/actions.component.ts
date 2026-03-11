import {Component, OnDestroy, OnInit, Output} from '@angular/core';
import {ConfirmationService, MenuItem, MessageService, TreeNode} from 'primeng/api';
import {ControllerService} from '../services/controller.service';
import {ActivatedRoute, ParamMap, Router} from '@angular/router';
import {forkJoin, Subscription} from 'rxjs';
import {concatMap, finalize, map, tap} from 'rxjs/operators';
import {ActionService} from './action.service';
import {DialogService} from 'primeng/dynamicdialog';
import {ActionDialogComponent} from './action-dialog/action-dialog.component';

@Component({
  selector: 'app-actions',
  templateUrl: './actions.component.html',
  styleUrls: ['./actions.component.css']
})
export class ActionsComponent implements OnInit, OnDestroy {
  @Output()loading: boolean;
  hasActionLoadErrors: boolean;
  hasActionTreeLoadErrors: boolean;
  actionId: any; // TODO: Refactor whole code to make sure it's a number
  actionRoot: string;
  selectedTreeNode: TreeNode;
  treeNodes: TreeNode[];
  actionMenu: MenuItem[];
  subscriptions: Subscription[] = [];
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private controllerService: ControllerService,
    private actionService: ActionService,
    private dialogService: DialogService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {
    // Load the Tree Elements
    this.loadNodeTree();
    // Subscribe for the Route Change
    this.activatedRoute.queryParamMap.subscribe((paramMap: ParamMap) => {
      this.actionId = null;
      const actionId = paramMap.get('actionId');
      const reloadTree = paramMap.get('reloadTree');
      this.actionRoot = paramMap.get('belongsTo');
      if (actionId) {
        this.actionId = parseInt(actionId, 10);
        // Reset the Action State
        this.actionService.resetActionState();
        // Set the Menu
        this.actionMenu = [
          {id: '0', label: 'Properties', icon: 'pi pi-fw pi-chart-bar', routerLink:'properties', queryParamsHandling: 'preserve', visible: true},
          {id: '2', label: 'Form Builder', icon: 'pi pi-fw pi-cog', routerLink:'forms', queryParamsHandling: 'preserve', visible: false},
          {id: '1', label: 'Validations', icon: 'pi pi-fw pi-list', routerLink:'validations', queryParamsHandling: 'preserve', visible: false},
          {id: '9999', label: 'Accesses', icon: 'pi pi-fw pi-key', routerLink:'accesses', queryParamsHandling: 'preserve', visible: true},
          {id: '10000', label: 'Form Rules', icon: 'pi pi-fw pi-cog', routerLink:'form-rules', queryParamsHandling: 'preserve', visible: true},
        ]
        // Load the Action
        this.loadAction();
      }
      if(reloadTree) { this.loadNodeTree(); }
    })
  }

  ngOnInit(): void {
    // TODO document why this method 'ngOnInit' is empty
  }

  /**
   * Load tree node structure for left hierarchy menu
   */
  loadNodeTree() {
    this.loading = true;
    this.hasActionTreeLoadErrors = false;
    // TODO Why should we pass an empty array that too in the form of string???
    this.controllerService.loadTreeNodeForActions('[]')
      .pipe(finalize(() => this.loading = false))
      .subscribe(
        (treeNodes: TreeNode[]) => {
          this.treeNodes = treeNodes;
          this.findTreeNodeBy(this.actionId, this.treeNodes);
          this.findCustomerForSelectedAction();
          // Expand till the Selected Node
          if(this.selectedTreeNode) {
            const keys = this.selectedTreeNode.key.split('-');
            const firstKey = keys.shift();
            let treeKey = this.selectedTreeNode.key;
            let treeNode = this.treeNodes[0];
            // If the first key is a string then it's service folder else customer folder
            if(isNaN(parseInt(firstKey, 10))) {
              treeKey = keys.join('-');
              treeNode = this.treeNodes[1];
            }
            // Expand the first Tree Node
            treeNode.expanded = true;
            this.expandNodesTill(treeKey, treeNode.children);
          }
        },
        (error) => {
          console.error(error);
          this.hasActionTreeLoadErrors = true;
          this.treeNodes = [];
        }
      );
  }

  /**
   * On the selection of the Template
   */
  onSelectTreeNode(selection) {
    const {id, type} = selection;
    if (type !== 'action') return;
    this.findCustomerForSelectedAction();
    const root = this.actionService.customer ? 'customer' : 'service';
    return this.router.navigate(['actions', 'properties'], {queryParams: { actionId: id, belongsTo: root }})
  }

  /**
   * Find the node by actionId and the select it
   */
  findTreeNodeBy(actionId, treeNodes) {
    if(!treeNodes) return;
    treeNodes.forEach(treeNode => {
      const {data, children} = treeNode;
      if(typeof data === 'object' && 'id' in data && 'type' in data && data.id === actionId && data.type === 'action') {
        this.selectedTreeNode = treeNode;
      } else {
        this.findTreeNodeBy(actionId, children);
      }
    })
  }

  /**
   * To be able to find the root of the Node
   * @params actionId
   */
  findCustomerForSelectedAction() {
    if(!this.selectedTreeNode) return;
    const { key} = this.selectedTreeNode;
    const rootId = key.split('-').shift();
    if (isNaN(parseInt(rootId, 10))) {
      this.actionService.customer = null;
      return;
    }
    const customerId = parseInt(rootId, 10);
    const customers = this.treeNodes[0].children;
    const selectedCustomer = customers.find(customer => customer.data.id === customerId);
    this.actionService.customer = { id: customerId, name: selectedCustomer.label };
  }

  /**
   * To Expand the tree till the selected Node Key
   * @params node
   */
  expandNodesTill(nodeKey:string, nodes: TreeNode[]) {
    if(!nodes) return;
    const keys = nodeKey.split('-');
    const keyToCheck = parseInt(keys.shift(), 10);
    for(const node of nodes) {
      const { id } = node.data;
      if(id === keyToCheck) {
        node.expanded = true;
        this.expandNodesTill(keys.join('-'), node.children);
      }
    }
  }

  /**
   * On Load Action
   * @params actionId
   */
  loadAction() {
    this.hasActionLoadErrors = false;
    const subscription = forkJoin([
      this.controllerService.getFormTemplateById(this.actionId),
      this.controllerService.loadActionTypeForActionTemplate(this.actionId),
      this.controllerService.getServicesForAction(this.actionId, this.actionRoot || 'customer'), // TODO: Remove HardCoding
      this.controllerService.getActionVendorTypeByActionId(this.actionId)
    ])
      .pipe(map(data => data.map(res => res.result)))
      .pipe(tap(([template, actionType, services, vendorRaw]) => {
        this.actionService.actionType = actionType;
        this.actionService.actionTemplate = template;
        this.actionService.actionServices = services;
        this.actionService.actionVendor = vendorRaw.vendor;
        this.actionService.actionLoadCompleteSubject.next(true);
      }))
      .pipe(concatMap(([template, actionType]) => this.controllerService.getAttributesForWorkflow(actionType.ID)))
      .subscribe((actionAttributes) => {
        this.actionService.actionAttributes = actionAttributes;
        // Do the tab menu settings based on attributes
        this.actionMenu.forEach(menu => {
          // Find the settings for the id
          const attribute = actionAttributes.find(att => att.id === parseInt(menu.id, 10));
          menu.visible = attribute && attribute.status !== 'hide';
        })
        // TODO Error Handling Here !!! CRITICAL
      }, error => {
        this.hasActionLoadErrors = true;
        console.error(error)
      })
    this.subscriptions.push(subscription);
  }

  /**
   * Add new Action and once done update the tre accordingly
   */
  onAddAction() {
    const dialogRef = this.dialogService
      .open(ActionDialogComponent, {width: '848px', header: 'Add New Action'});
    dialogRef.onClose.subscribe(data => {
      if(data) {
        const queryParams = { actionId: data.id, belongsTo: data.belongsTo, reloadTree: true };
        this.router.navigate(['actions', 'properties'], { queryParams })
      }
    })
  }

  /**
   * Delete an existing action
   */
  onDeleteAction() {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this action?',
      header: 'Delete confirmation!',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        console.log(`Delete action: ${this.actionId}`);
        this.loading = true;
        const subscription = this.controllerService.deleteActionTemplate(this.actionId)
          .pipe(finalize(() => this.loading = false))
          .subscribe(async () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Action Deleted',
              detail: 'Selected Action has been deleted successfully!'
            });
            this.router.routeReuseStrategy.shouldReuseRoute = () => false;
            await this.router.navigate(['actions']);
          }, error => {
            console.log(error);
            this.messageService.add({
              severity: 'error',
              summary: 'Action Delete Failed',
              detail: 'Failed to delete the selected action, please try again!',
              sticky: true
            });
          })
        this.subscriptions.push(subscription)
      }
    })
  }

  ngOnDestroy() {
    this.subscriptions.forEach((subscription) => {
      if(subscription) {
        subscription.unsubscribe();
      }
    });
    this.actionService.clearCache();
  }
}
