import {Component, OnDestroy, OnInit} from '@angular/core';
import {MessageService, TreeNode} from 'primeng/api';
import {ActivatedRoute} from '@angular/router';
import {Subscription} from 'rxjs';
import {RbacService} from '../../services/rbac.service';

@Component({
  selector: 'app-sitemap',
  templateUrl: './sitemap.component.html',
  styleUrls: ['./sitemap.component.css']
})
export class SitemapComponent implements OnInit, OnDestroy {
  isNodesLoading: boolean;
  componentKey: string;
  nodes: any[] = [];
  subscriptions: Subscription[] = [];
  constructor(private activatedRoute: ActivatedRoute,
              private rbacService: RbacService,
              private messageService: MessageService) {
    // Subscribe to the change of queryParams
    this.activatedRoute.queryParams.subscribe(queryParams => {
      if ('componentKey' in queryParams) { this.componentKey = queryParams.componentKey; }
    });
  }

  ngOnInit() {
    this.loadNodes();
  }

  loadNodes() {
    this.isNodesLoading = true;
    this.subscriptions[0] = this.rbacService
      .getAppComponentsTree()
      .subscribe(
        nodes => {
          this.isNodesLoading = false;
          this.nodes = nodes;
          this.afterNodesLoaded();
        }, err => {
          this.isNodesLoading = false;
          this.messageService.add({
            severity: 'error',
            summary: `Error ${err.status}`,
            detail: err.error.message,
            sticky: false
          });
        });
  }

  afterNodesLoaded() {
    // Select the first Node by default for expansion
    let node = this.nodes[0];
    if (this.componentKey) {
      // Expand the specific Node
      // Get the parent node id
      const parentNodeKey = this.componentKey.split('-')[0];
      node = this.nodes.find(nd => nd.key === parentNodeKey);
    }
    this.expandRecursive(node, true);
  }

  private expandRecursive(node:TreeNode, isExpand:boolean){
    node.expanded = isExpand;
    if (node.children){
      node.children.forEach( childNode => {
        this.expandRecursive(childNode, isExpand);
      } );
    }
  }

  expandAll(){
    this.nodes.forEach( node => {
      this.expandRecursive(node, true);
    } );
  }

  collapseAll(){
    this.nodes.forEach( node => {
      this.expandRecursive(node, false);
    } );
  }

  ngOnDestroy() {
    this.subscriptions.forEach(subscription => {
      if(subscription) { subscription.unsubscribe(); }
    })
  }
}
