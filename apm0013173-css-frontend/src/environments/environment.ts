// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.
export const environment = {
  production: false,
  LONG_POLLING_INTERVAL: 3000,
  LONG_POLLING_BULK_INTERVAL: 15000,
  AUTH_REDIRECT:
    'https://www.e-access.att.com/empsvcs/hrpinmgt/pagLogin/?sysName=usrp&retURL=',
  BC_HOME:
    'https://businesscenter.att.com/ebiz/dashboard/v2/index.html#/dashboard',
  BING_SDK:
    'https://www.bing.com/maps/sdkrelease/mapcontrol?callback=__onBingLoaded&branch=release',
  BING_GEOCODING: 'https://dev.virtualearth.net/REST/v1/Locations',
  BING_API_KEY:
    'Agk0yfBzkP1KmKNk3oM4EllYqe3Hz913hUxLe7QmovAJr72u0zJyvNKGcsERHh6E',
  CSS_CONTROLLER: 'http://local.att.com:8000/api',
  CSS_CLASSIC_UI: 'http://local.att.com:4200/',
  OIDC_REDIRECT:
    'https://oidc.stage.elogin.att.com/mga/sps/oauth/oauth20/authorize?client_id=485af2f466e54265876a1ec7326a42e4&scope=openid%20profile%20email%20groups&response_type=code&redirect_uri=https%3A%2F%2Fselfservice.dev.att.com&',
  NUANCE_CHAT_SCRIPT:
    'https://att.inq.com/chatskins/launch/inqChatLaunch10004119.js'
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
