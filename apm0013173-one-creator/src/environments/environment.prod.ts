if (!(["https:", "http:"].includes(window.location.protocol))) {
  alert("Protocol which you set is unsupported!");
  throw new Error("Unsupported protocol!");
}

export const environment = {
  production: true,
  local: false,
  API: 'https://selfservice.web.att.com/api',
  API_MATOMO: 'https://tmatomo.web.att.com/matomo/',
  MATOMO_SITE_ID: '66',
  OIDC_REDIRECT: "https://oidc.idp.elogin.att.com/mga/sps/oauth/oauth20/authorize?client_id=ONE_PROD&scope=openid%20profile%20email%20groups&response_type=code&redirect_uri=https%3A%2F%2Fselfservice.web.att.com%2Fone&"
};
