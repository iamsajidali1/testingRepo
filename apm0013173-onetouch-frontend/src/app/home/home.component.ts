import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { ApiService } from './api.service';
import { HttpClient} from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material';
import { Router, ActivatedRoute } from '@angular/router';
import {ModalComponent} from '../modal/modal.component';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  styles: ['.short {min-width: 80px;}'],
  encapsulation: ViewEncapsulation.None
})

export class HomeComponent implements OnInit {
  constructor(private apiService: ApiService,
              private matSnackBar: MatSnackBar,
              private activatedRoute: ActivatedRoute,
              public dialog: MatDialog,
              private httpClient: HttpClient,
              private router: Router) {}

  pingOK = false;
  sessionLogs: string[] = [];
  displayedColumns: string[] = ['name', 'value'];
  siteData: any = [];
  pingResult: any;
  ftData: any = {
    status: 'Error',
    data: {
      jcp: {
        found : 'false',
        config: 'test config of test config'
      },
      nmte: {
        found : 'false',
        config: ''
      },
      jdm: {
        found : 'false',
        config: 'test config of test config',
        address: 'none'
      },
      t1: {
        config: ''
      }},
    server: 'none'
  };

  sub: any;
  assetFound = false;
  commands: any = ['cli',
    'request load /var/third-party/jdm-stage1.xml xml merge jdm',
    'request load /var/third-party/jcp-stage1.xml xml merge vjunos0'
  ];
  nmteCommands: string[] = [
    'request setup jdm-auto-login ipsec-nm',
    'request load /var/third-party/nmte-stage1.xml xml merge ipsec-nm'
  ];
  removePhsCommands: string[] = [
    'configure',
    'delete system phone-home',
    'commit and-quit'
  ];
  vyattaCommands: string[] = [
    'sudo chmod 755 /config/1touchload.sh',
    '/config/1touchload.sh vnos-stage1.xml'
  ];
  working = false;
  hostname: string;
  isVyatta = false;

  ngOnInit() {
    this.sub = this.activatedRoute.paramMap.subscribe(params => {
      this.hostname = params.get('hostname').trim();
      if (this.hostname) {
        this.getFtData(this.hostname);
      }
    });
  }

  public getFtData(h: string) {
    this.resetCommands();
    this.sessionLogs = [];
    this.working = true;
    this.apiService.getFTDataByHostname(h)
        .subscribe((resp: any) => {
          this.ftData = resp.data;
          this.hostname = this.ftData.hostname;
          this.working = false;
          if (this.ftData.status === 'OK') {
            this.assetFound = true;
            this.addToLog('Found ' + h + ' on HGPHS. Looking for details...');
            if (this.ftData.isVyatta) {
              this.commands = this.vyattaCommands;
            } else if (this.ftData.data.nmte.found) {
              this.commands = this.commands.concat(this.nmteCommands);
              this.commands = this.commands.concat(this.removePhsCommands);
            }
          } else {
            this.matSnackBar.open(this.ftData.reason, 'OK');
            this.working = false;
          }
        }, error =>
        {
          let status = 500;
          let message = 'An unknown Error occurred while fetching device details from PHS';
          if (error.error?.statusCode === 404) {
            status = 404;
            message = `Device: ${h} is not found in any PHS!`;
          } else {
            status = error.error?.statusCode || status;
            message = error.error?.message || message;
          }
          this.matSnackBar.open(`${status}: ${message}`, 'OK');
          this.working = false;
        });
  }

  public navigateTo(s: string) {
    console.log(this.router.url);
    if (s === '') {
      console.log('mkay, default page');
    } else if (this.router.url.includes(s)) {
      this.router.navigateByUrl('/device/' + s).then(e => {
        console.log('going to /device/' + s);
      });
    }
    else {
      // this.getFtData(s);
      this.router.navigateByUrl('/device/' + s);
      console.log('Reloading page...');
    }

  }
  public bootstrapDevice(s: string, i: string) {
    this.apiService.bootstrapDevice(s, i)
        .subscribe((res: any) => {
          this.addToLog(`Bootstrap sent, response was ${res.status}`);
        }, error => {
          let status = 500;
          let message = 'An unknown Error occurred while pinging the device!';
          status = error.error?.statusCode || status;
          message = error.error?.message || message;
          this.matSnackBar.open(`${status}: ${message}`, 'OK');
          this.working = false;
        });
  }

  public pingDDaddress(s: string) {
    this.working = true;
    this.apiService.verifyReachability(s).subscribe((result: any) => {
      this.pingResult = result.data;
      if (Number(this.pingResult.result) !== 0) {
        console.log('Ping not working!');
        this.addToLog('Ping failed with result code: ' + this.pingResult.result);
        const sbRef = this.matSnackBar.open('Unreachable, review logs!', 'VIEW');
        sbRef.onAction().subscribe(() => {
          console.log('Action on data');
          this.dialog.open(ModalComponent, {
            width: '800px',
            data: { logs: this.pingResult.var_pingresult }
          });
        });
        this.working = false;
      } else {
        // routine if ping worked
        this.matSnackBar.open('Ping worked, enabling bootstrap', 'OK', {duration: 5000}); // open snackbar with notification
        this.addToLog('Ping OK, enabling Bootstrap.');
        this.pingOK = true;
      }
      this.working = false;
    }, error => {
      let status = 500;
      let message = 'An unknown Error occurred while pinging the device!';
      status = error.error?.statusCode || status;
      message = error.error?.message || message;
      this.matSnackBar.open(`${status}: ${message}`, 'OK');
      this.working = false;
    });
  }

  public addToLog(s: string) {
    const date: string = new Date().toLocaleString();
    this.sessionLogs = this.sessionLogs.concat(date + ': ' + s);
  }

  // a bit stupid WA for not using classes ...
  public resetCommands() {
    this.commands = ['cli',
      'request load /var/third-party/jdm-stage1.xml xml merge jdm',
      'request load /var/third-party/jcp-stage1.xml xml merge vjunos0'
    ];
    this.ftData = {
      status: 'Error',
      data: {
        jcp: {
          found : 'false',
          config: 'Loading, standby...'
        },
        nmte: {
          found : 'false',
          config: 'Loading, standby...'
        },
        jdm: {
          found : 'false',
          config: 'test config of test config',
          address: 'none'
        },
        t1: {
          config: ''
        }},
      server: 'none'
    };
  }

}

