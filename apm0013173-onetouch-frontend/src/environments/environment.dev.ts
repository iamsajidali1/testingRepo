export const environment = {
  production: true,
  IS_TEST_MODE_ENABLED: false,
  ENV: 'DEV',
  VERSION: '2.0.4',
  AUTH_REDIRECT: 'https://www.e-access.att.com/empsvcs/hrpinmgt/pagLogin/?sysName=usrp&retURL=',
  API_CSS_CONTROLLER: 'https://selfservice.dev.att.com/api',
  API_ONETOUCH_CORE: 'https://selfservice.dev.att.com/svc/utilities/api/onetouch',
  OIDC_REDIRECT: "https://oidc.stage.elogin.att.com/mga/sps/oauth/oauth20/authorize?client_id=485af2f466e54265876a1ec7326a42e4&scope=openid%20profile%20email%20groups&response_type=code&redirect_uri=https%3A%2F%2Fselfservice.dev.att.com%2Fonetouch&"
};
