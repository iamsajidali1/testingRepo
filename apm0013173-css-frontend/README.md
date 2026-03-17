# Self-Service Network Management Portal v3
<br>
Customer facing GUI of Self Service Network Management Portal.<br>
Application is written in Angular 14.0.0 and PrimeNg 13.4.1 is used for the UI Components.

### Deployed URLs
* Development: https://selfservice.dev.att.com/v3
* Production: https://selfservice.web.att.com/v3

## Prerequisites

Install the following tools into the development machine/ workstation
* Angular CLI: >= 14.0.4
* Node: >= 16.0.0
* Package Manager: >= npm 8.18.0

To be able to run locally and authenticate to AT&T Global logon we need set up custom host with `.att.com` domain.
Please add the following line to your `/etc/hosts` file,
```shell
127.0.0.1 local.att.com
```

## Installation
Run `npm install --legacy-peer-deps` to install all required npm packages for the application.

## Development server

Run `ng serve` for a dev server. Navigate to `http://local.att.com:4200/`. The app will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Authors and Contacts

* Author: [Arif, Toslim (ta147p)](mailto:toslim.arif@att.com)
* Maintainers: [Arif, Toslim (ta147p)](mailto:toslim.arif@att.com), [Stedl, Matus (ms639x)](mailto:ms639x@intl.att.com)
* Product Owners: [Vala, Tomas (tv8985)](mailto:tv8985@intl.att.com), [Licak, Ondrej (ol024y)](mailto:ol024y@intl.att.com)
* Product Manager: [Sujan, Martin (ms110b)](mailto:ms110b@intl.att.com)

## Further help

To know more about the app stack please check the Contacts/ Authors section.<br> For general queries please write to [CIST Support](mailto:rm-sd_devops@intl.att.com).

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.


