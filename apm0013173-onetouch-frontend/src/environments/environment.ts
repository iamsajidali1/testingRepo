// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  IS_TEST_MODE_ENABLED: true,
  ENV: 'LOCAL',
  VERSION: '2.0.4',
  AUTH_REDIRECT: 'https://www.e-access.att.com/empsvcs/hrpinmgt/pagLogin/?sysName=usrp&retURL=',
  API_CSS_CONTROLLER: 'https://selfservice.dev.att.com/api',
  API_ONETOUCH_CORE: 'http://localhost:8000/api/onetouch',
  OIDC_REDIRECT: "https://oidc.idp.elogin.att.com/mga/sps/oauth/oauth20/authorize?client_id=ONE_PROD&scope=openid%20profile%20email%20groups&response_type=code&redirect_uri=https%3A%2F%2Fselfservice.web.att.com%2Fonetouch&"
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/dist/zone-error';  // Included with Angular CLI.
