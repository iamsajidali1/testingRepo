const CSS_CONTROLLER_HOST = window.location.hostname;
const CSS_CONTROLLER_PROTOCOL = window.location.protocol;
const CSS_CONTROLLER_PATH =
  window.location.hostname === 'expressportal.att.com' ? '/ebiz/gda/css' : '';

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
    'https://oidc.idp.elogin.att.com/mga/sps/oauth/oauth20/authorize?client_id=ONE_PROD&scope=openid%20profile%20email%20groups&response_type=code&redirect_uri=https%3A%2F%2Fselfservice.web.att.com&',
  NUANCE_CHAT_SCRIPT:
    'https://att.inq.com/chatskins/launch/inqChatLaunch10004119.js'
};
