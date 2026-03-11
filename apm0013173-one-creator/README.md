# FormCreator

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 6.0.8.

## Development server 

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build 

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `--prod` flag for a production build.

## Build and Serve for development
Run `ng serve --base-href` to serve the project local. If you want to run app on local host this actions is required:
1.  config.json structure
        ```json
            {
                "local" : {
                    "cookies" : {
                        "globalLogon": {
                            "attESHr":  "",
                            "attESSec": "",
                            "attESg2": ""
                        }
                    }
                }
            }
        ```
2. copy cookies "attESHr" and "attESSec" from browser to config.json file
4. run command `ng serve --base-href -c local`
5. Go to browser on localhost:4200
Please note this is only for development on localhost!

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via [Protractor](http://www.protractortest.org/).

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI README](https://github.com/angular/angular-cli/blob/master/README.md)..
