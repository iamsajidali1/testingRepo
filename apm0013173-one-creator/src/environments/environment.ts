// This file can be replaced during build by using the `fileReplacements` array.
// `ng build ---prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.


if (!(['https:', 'http:'].includes(window.location.protocol))) {
  alert('Protocol which you set is unsupported!');
  throw new Error('Unsupported protocol!');
}

export const environment = {
  production: false,
  local: false,
  API: 'http://local.att.com:8000',
  API_MATOMO: 'https://tmatomo.test.att.com/matomo/',
  MATOMO_SITE_ID: '128',
  OIDC_REDIRECT: "https://oidc.stage.elogin.att.com/mga/sps/oauth/oauth20/authorize?client_id=485af2f466e54265876a1ec7326a42e4&scope=openid%20profile%20email%20groups&response_type=code&redirect_uri=https%3A%2F%2Fselfservice.dev.att.com%2Fone&"
};

/*
 * In development mode, to ignore zone related error stack frames such as
 * `zone.run`, `zoneDelegate.invokeTask` for easier debugging, you can
 * import the following file, but please comment it out in production mode
 * because it will have performance impact when throw error
 */
// import 'zone.js/dist/zone-error';  // Included with Angular CLI.
