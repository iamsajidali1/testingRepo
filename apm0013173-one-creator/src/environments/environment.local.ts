// !!! This file is only for local host development !!!
// This file can be replaced during ng serve by using the `fileReplacements` array.
// `ng serve --base-href -c local` replaces `environment.ts` with `environment.local.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  local: true,
  // dev endpoint for backend or localhost endpoint
  //API: 'https://self-service.dev.att.com/api',
  API: 'http://localhost:8000',
  API_MATOMO: 'https://tmatomo.test.att.com/matomo/',
  MATOMO_SITE_ID: '128'
};
