const CSS_CONTROLLER_HOST = window.location.hostname;
const CSS_CONTROLLER_PROTOCOL = window.location.protocol;
const CSS_CONTROLLER_PATH =
  window.location.hostname === 'fbcaz.web.att.com' ? '/ebiz/gda/css' : '';

export const environment = {
  production: true,
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
  CSS_CONTROLLER: `${CSS_CONTROLLER_PROTOCOL}//${CSS_CONTROLLER_HOST}${CSS_CONTROLLER_PATH}/api`,
  CSS_CLASSIC_UI: `${CSS_CONTROLLER_PROTOCOL}//${CSS_CONTROLLER_HOST}${CSS_CONTROLLER_PATH}/classicUi/`,
  OIDC_REDIRECT:
    'https://oidc.stage.elogin.att.com/mga/sps/oauth/oauth20/authorize?client_id=485af2f466e54265876a1ec7326a42e4&scope=openid%20profile%20email%20groups&response_type=code&redirect_uri=https%3A%2F%2Fselfservice.dev.att.com&',
  NUANCE_CHAT_SCRIPT:
    'https://assets.adobedtm.com/784fdfb70d09/27da19b0a64f/launch-6df9c85c9f34-development.min.js'
};
