"""Cisco vManage Authentication API Methods.
"""

import requests
import urllib3
import logging
from api.utilities import Utilities
from packaging import version

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


class Authentication(object):
    """vManage Authentication API

    Responsible for retrieving the JSESSIONID after a username/password
    has been authenticated.  If the vManage version is >= 19.2.0 then
    the X-XSRF-TOKEN will be retrieved and added to the header.  An
    HTTP(S) Request session object will be returned.

    """
    def __init__(self, host=None, user=None, password=None, port=443, validate_certs=False, timeout=10):
        """Initialize Authentication object with session parameters.

        Args:
            host (str): hostname or IP address of vManage
            user (str): username for authentication
            password (str): password for authentication
            port (int): default HTTPS port 443
            validate_certs (bool): turn certificate validation
                on or off.
            timeout (int): how long Reqeusts will wait for a
                response from the server, default 10 seconds

        """

        self.host = host
        self.user = user
        self.password = password
        self.port = port
        self.timeout = timeout
        self.base_url = f'https://{self.host}:{self.port}/dataservice/'
        self.session = requests.Session()
        self.session.verify = validate_certs

    def login(self):
        """Executes login tasks against vManage to retrieve token(s).

        Args:
            None.

        Returns:
            self.session: a Requests session with JSESSIONID and an
            X-XSRF-TOKEN for vManage version >= 19.2.0.

        Raises:
            LoginFailure: If the username/password are incorrect.
            RequestException: If the host is not accessible.

        """

        try:
            api = 'j_security_check'
            url = f'{self.base_url}{api}'
            response = self.session.post(url=url,
                                         data={
                                             'j_username': self.user,
                                             'j_password': self.password
                                         },
                                         timeout=self.timeout)

            if (response.status_code != 200 or response.text.startswith('<html>')):
                raise ConnectionError('Login failed, check user credentials.')

            ver = Utilities(self.session, self.host, self.port).get_vmanage_version()

            if ver >= '19.2.0':
                api = 'client/token'
                url = f'{self.base_url}{api}'
                response = self.session.get(url=url, timeout=self.timeout)
                self.session.headers['X-XSRF-TOKEN'] = response.content

        except requests.exceptions.RequestException as e:
            raise ConnectionError(f'Could not connect to {self.host}: {e}')

        logging.info(f'Logged into vManage url: {url}, version: {ver} successfully!')
        return self.session
    
    def logout(self):
        """Executes logout tasks against vManage to invalidate session.

        Args:
            None.

        Returns:
            None.

        Raises:
            ConnectionError: If the session could not be invalidated.

        """
        try:
            ver = Utilities(self.session, self.host, self.port).get_vmanage_version()
            api = 'logout?nocache'
            url = f'https://{self.host}:{self.port}/{api}'
            logging.info(f'Logging out from vManage version {version}')
            if version.parse(ver) > version.parse("20.12"):
                # if the version is 20.12 or greater, we need to use POST
                response = self.session.post(url=url, timeout=self.timeout)
            else:
                # otherwise, use GET
                response = self.session.get(url=url, timeout=self.timeout)
            
            if response.status_code != 200:
                logging.error(f'Logout failed, check credentials.')
                raise ConnectionError('Logout failed, check credentials.')
            else:
                logging.info(f'Logged out from vManage version {ver} successfully!')
        except requests.exceptions.RequestException as e:
            raise ConnectionError(f'Could not connect to {self.host}: {e}')