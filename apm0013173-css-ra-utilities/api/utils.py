"""Common utility functions."""
import sys
import logging
import re
import datetime
import urllib.parse
from os import environ
import requests as req
import concurrent.futures
import oracledb

from api.queries.edf import get_site_account_numbers_query
from api.constants import EDF_CONN

#use defaults 
#logging.basicConfig(
#    stream=sys.stdout,
#    level=logging.DEBUG,
#    format='%(asctime)s: %(levelname)-8s: %(message)s'
#)

proxies = {
    "http": environ.get("http_proxy"),
    "https": environ.get("https_proxy"),
    "no_proxy": environ.get("no_proxy")
}

def multireplace(string, replacements, ignore_case=False):
    """
    Given a string and a replacement map, it returns the replaced string.
    :param str string: string to execute replacements on
    :param dict replacements: replacement dictionary {value to find: value to replace}
    :param bool ignore_case: whether the match should be case insensitive
    :rtype: str
    """
    if not replacements:
        # Edge case that'd produce a funny regex and cause a KeyError
        return string
    # If case insensitive, we need to normalize the old string so that later a replacement
    # can be found. For instance {"HEY": "lol"} we should match and find a replacement for "hey",
    # "HEY", "hEy", etc.
    if ignore_case:
        def normalize_old(word):
            return word.lower()
        re_mode = re.IGNORECASE
    else:
        def normalize_old(word):
            return word
        re_mode = 0

    replacements = {normalize_old(key): val for key, val in replacements.items()}
    # Place longer ones first to keep shorter substrings from matching where the longer
    # ones should take place For instance given the replacements {'ab': 'AB', 'abc': 'ABC'}
    # against the string 'hey abc', it should produce 'hey ABC' and not 'hey ABc'
    rep_sorted = sorted(replacements, key=len, reverse=True)
    rep_escaped = map(re.escape, rep_sorted)
    # Create a big OR regex that matches any of the substrings to replace
    pattern = re.compile("|".join(rep_escaped), re_mode)
    # For each match, look up the new string in the replacements, being the key the
    # normalized old string
    return pattern.sub(lambda match: replacements[normalize_old(match.group(0))], string)

def findkeys(node, key_value):
    """ basic key finder for onetouch """
    if isinstance(node, list):
        for i in node:
            for iterate in findkeys(i, key_value):
                yield iterate
    elif isinstance(node, dict):
        if key_value in node:
            yield node[key_value]
        for j in node.values():
            for iterate in findkeys(j, key_value):
                yield iterate

def cli_get_credentials(request):
    """ function which returns credentials """
    logging.debug("Parsing credentials from HTTP headers")
    client_data = {}
    client_data["jumpserver"] = request.META.get("HTTP_X_JUMP")
    client_data["jumplogin"] = request.META.get("HTTP_X_JUMP_LOGIN")
    client_data["jumppass"] = request.META.get("HTTP_X_JUMP_PASS")
    client_data["devuser"] = request.META.get("HTTP_X_DEVICE_USER")
    client_data["devpass"] = request.META.get("HTTP_X_DEVICE_PASS")
    logging.debug('CLI params jump: %s, login: %s, pass: %s, device login: %s, device pass: %s',
                  client_data["jumpserver"], client_data["jumplogin"],
                  bool(client_data["jumppass"]), client_data["devuser"],
                  bool(client_data["devpass"]))
    return client_data

def get_lon_lat(addr):
    """
    Returns the longitude and latitude based on the provided address.

    Args:
        addr (dict): A dictionary containing the address details with keys:
            - "state" (str): The state of the address.
            - "postal_code" (str): The postal code of the address.
            - "city" (str): The city of the address.
            - "street_address" (str): The street address.

    Returns:
        dict: A dictionary containing:
            - "lon" (float): The longitude of the address.
            - "lat" (float): The latitude of the address.
        If an error occurs, returns the error message as a string.

    Raises:
        AssertionError: If the response status code is not 200.

    Note:
        This function uses the Bing Maps API to get the geolocation data.
        Ensure that the environment variable "GEOLOCATION_API" is set with a valid API key.
    """
    """ function that returns LON/LAT based on address"""
    geo_key = environ.get("GEOLOCATION_API")
    url = 'https://dev.virtualearth.net/REST/v1/Locations/US/'
    payload = f'{addr["state"]}/{addr["postal_code"]}/{addr["city"]}/{addr["street_address"]}'
    payload = urllib.parse.quote(payload)
    additional = f'/?maxResults=5&key={geo_key}&o=json'
    ses = req.Session()
    call_headers = {"charset":"utf-8",
                    "User-Agent": "curl/7.61.0",
                    'referer': 'https://selfservice.web.att.com/',
                    'Content-Type': 'application/json'}
    resp = ses.get(f'{url}{payload}{additional}', headers=call_headers,
                   verify=False, proxies=proxies)
    try:
        assert resp.status_code == 200, vars(resp)
        return {"lon":resp.json()['resourceSets'][0]['resources'][0]['point']['coordinates'][1],
                "lat": resp.json()['resourceSets'][0]['resources'][0]['point']['coordinates'][0]}
    except AssertionError:
        logging.debug("Getting list of services for enterprise resulted with error: %s",
                      resp.json()["error"]["message"])
        return resp.json()["error"]["message"]

def webcheck_api(dataset: str, parameter: str, identity: str, options=None):
    """
    Sub-function that returns data for different datasets from the Webcheck Data Service API.

    Args:
        dataset (str): The dataset to query.
        parameter (str): The parameter to use in the query.
        identity (str): The identity value for the parameter.
        options (dict, optional): Additional options to include in the parameters. Defaults to None.

    Returns:
        dict: The JSON response from the API, or an error message if the request fails.
    """
    """ sub-function that returns data for circuit """
    url = 'https://boemea.web.att.com/wchkdataservice/web/api/v1/data/load'
    data = {
            "model": "LoadDataRequest",
            "header": {
                "api": "WebcheckDataService",
                "version": "0.2",
                "consumer": "JMeter"
            },
            "dataset": dataset,
            "version": "1.0",
            "parameters": {
                parameter: identity,
                **(options if options else {})
            }
        }
    call_headers = {'Accept': 'application/json',
                    'Content-Type': 'application/json'}
    user = environ.get("AAF_USERNAME")
    password = environ.get("AAF_PASSWORD")
    ses = req.Session()
    resp = ses.post(url, json=data, headers=call_headers,
                   verify=False, proxies=proxies, auth=(user, password))
    try:
        assert resp.status_code == 200, vars(resp)
        return resp.json()
    except AssertionError:
        logging.debug("Getting data for circuit resulted in error: %s",
                      resp.json()["errorMessage"])
        return {"error": resp.json()["errorMessage"]}

def get_circuit_data(cktid: str):
    """
    Retrieves data for a given circuit ID by making multiple API calls.

    Args:
        cktid (str): The circuit ID for which data is to be retrieved.

    Returns:
        dict: A dictionary containing the retrieved data. The dictionary includes:
            - "cktid" (str): The provided circuit ID.
            - "capig005" (dict): The result of the CAPIG-0005 API call.
            - "capig004" (dict, optional): The result of the CAPIG-0004 API call, if successful.
            - "capig001" (dict, optional): The result of the CAPIG-0001 API call, if successful.

        If any of the API calls fail, the dictionary will include debug logs indicating the failure.
        If no data is retrieved, a dictionary with an "error" key and a descriptive message is returned.
    """
    """ function that returns data for circuit """
    order = {}
    order["cktid"] = cktid
    capig005 = webcheck_api("CAPIG-0005","general_circuit_id", cktid)
    if "error" in capig005:
        logging.debug("CAPIG-0005 for cktid: %s failed", cktid)
    capig004 = webcheck_api("CAPIG-0004","general_circuit_id", cktid)
    if "error" in capig004:
        logging.debug("CAPIG-0004 for cktid: %s failed", cktid)
    order["capig005"] = capig005
    if "result" in capig004 and "order" in capig004["result"]:
        project_number = capig004["result"]["order"]["orderNumber"]
        capig001 = webcheck_api("CAPIG-0001","project_number", project_number)
        if "error" in capig001:
            logging.debug("CAPIG-0001 for project number: %s failed", project_number)
        order["capig004"] = capig004
        order["capig001"] = capig001
    return order if order else {"error": f"Getting webcheck failed for cktid:{cktid}"}

def find_remote_site_id(data, begin_range, end_range):
    """
    Finds the remote site ID based on the given begin and end range.

    Args:
        data (dict): The data containing remote dial plan site ranges.
        begin_range (str): The beginning range of the dial plan site.
        end_range (str): The ending range of the dial plan site.

    Returns:
        str or None: The remote site ID if found, None otherwise.
    """
    for item in data.get("remoteDialPlanSiteRange", []):
        dial_plan_site_range = item.get("dialPlanSiteRange", {})
        if (dial_plan_site_range.get("pbxBeginRange") == begin_range and
                dial_plan_site_range.get("pbxEndRange") == end_range):
            return item.get("remoteSiteId")
    return None

def get_tele_ranges_for_site(site_id: str):
    """
    Retrieves webcheck data for a given site ID.

    Args:
        site_id (str): The ID of the site.

    Returns:
        List[Dict[str, Any]]: A list of dictionaries containing the webcheck data for each dialplan site range.

    Raises:
        None
    """
    logging.debug("Getting webcheck data for site_id: %s", site_id)
    site_details = webcheck_api("DBORSPP-0001", "siteId", site_id)
    site_id = site_details["result"]["custSiteDetail"]["bvoipCustSite"]["customerSite"]["siteId"]
    cust_dialplan_id = site_details["result"]["custSiteDetail"]["custSummary"]["custDialPlanId"]
    site_company_name = site_details["result"]["custSiteDetail"]["bvoipCustSite"]["customerSite"]["siteCompanyName"]
    site_address = site_details["result"]["custSiteDetail"]["bvoipCustSite"]["customerSite"]["siteAddress"]
    # Get tele range details
    # The API response has pagination, so it needs to run in loop to get all the data
    # The totalRows field in the response indicates the total number of rows
    # It supports 500 maxRows per page
    # The loop will run until the total number of rows is reached fetching 500 rows per iteration
    data_for_tele_ranges = []
    
    # Ensure total_rows is set to the maximum positive integer value
    total_rows = sys.maxsize

    # Initialize starting_row to 1
    starting_row = 1

    # Loop until starting_row exceeds total_rows
    while starting_row <= total_rows:
        # Fetch tele range details for the current page
        tele_details = webcheck_api("DBORSPP-0002", "siteId", site_id, options = {"startingRow": starting_row, "maxRows": 500})
        
        # Update total_rows from the API response
        total_rows = tele_details["result"]["totalRows"]
        logging.debug(f"Fetching Webcheck Dataset: DBORSPP-0002, SiteID: {site_id}, Starting Row {starting_row} Limited To {total_rows}")
        
        if "dialPlanSiteRanges" in tele_details["result"]["dialPlanDetail"]:
            # Extract the dial plan site range from the API response
            dialplan_site_range = tele_details["result"]["dialPlanDetail"]["dialPlanSiteRanges"]["dialPlanSiteRange"]
        
            # Process each dial plan site in the dial plan site range
            for dialplan_site in dialplan_site_range:
                dialplan_site["siteCompanyName"] = site_company_name
                dialplan_site["siteID"] = site_id
                dialplan_site["custDialPlanId"] = cust_dialplan_id
                if dialplan_site["remoteTnInd"] == "N":
                    dialplan_site['Hub/Rmt'] = "CH"
                    site_address_parts = [site_address["room"], site_address["floor"], site_address["addr1"], site_address["city"], site_address["state"], site_address["country"], site_address["zip"]]
                    dialplan_site["siteAddress"] = ", ".join(filter(None, site_address_parts))
                else:
                    dialplan_site['Hub/Rmt'] = "RB"
                try:
                    remote_dialplan_site_range_list = tele_details["result"]["dialPlanDetail"]["remoteDialPlanSiteRangeList"]
                except KeyError:
                    remote_dialplan_site_range_list = None
                if remote_dialplan_site_range_list is not None:
                    dialplan_site["remoteSiteId"] = find_remote_site_id(remote_dialplan_site_range_list, dialplan_site["pbxBeginRange"], dialplan_site["pbxEndRange"])
                data_for_tele_ranges.append(dialplan_site)

        # Increment starting_row by 500 for the next iteration
        starting_row += 500
    
    return data_for_tele_ranges

def get_tele_ranges_for_site_with_concurrency(site_id: str, max_concurrent_pages: int = 10):
    """
    Retrieves webcheck data for a given site ID.

    Args:
        site_id (str): The ID of the site.
        max_concurrent_pages (int, optional): The maximum number of pages to fetch concurrently. Defaults to 10.

    Returns:
        List[Dict[str, Any]]: A list of dictionaries containing the webcheck data for each dialplan site range.

    Raises:
        None
    """
    logging.debug("Getting webcheck data for site_id: %s", site_id)
    site_details = webcheck_api("DBORSPP-0001", "siteId", site_id)
    site_id = site_details["result"]["custSiteDetail"]["bvoipCustSite"]["customerSite"]["siteId"]
    cust_dialplan_id = site_details["result"]["custSiteDetail"]["custSummary"]["custDialPlanId"]
    site_company_name = site_details["result"]["custSiteDetail"]["bvoipCustSite"]["customerSite"]["siteCompanyName"]
    site_address = site_details["result"]["custSiteDetail"]["bvoipCustSite"]["customerSite"]["siteAddress"]
    
    # Get tele range details
    data_for_tele_ranges = []
    
    # Ensure total_rows is set to the maximum positive integer value
    total_rows = sys.maxsize

    # Initialize starting_row to 1
    starting_row = 1

    def fetch_page(site_id, starting_row):
        tele_details = webcheck_api("DBORSPP-0002", "siteId", site_id, options={"startingRow": starting_row, "maxRows": 500})
        return tele_details, starting_row

    with concurrent.futures.ThreadPoolExecutor() as executor:
        while starting_row <= total_rows:
            futures = []
            for _ in range(max_concurrent_pages):
                if starting_row > total_rows:
                    break
                futures.append(executor.submit(fetch_page, site_id, starting_row))
                starting_row += 500
            
            for future in concurrent.futures.as_completed(futures):
                tele_details, fetched_starting_row = future.result()
                total_rows = tele_details["result"]["totalRows"]
                logging.debug(f"Fetching Webcheck Dataset: DBORSPP-0002, SiteID: {site_id}, Starting Row {fetched_starting_row} Limited To {total_rows}")
                
                if "dialPlanSiteRanges" in tele_details["result"]["dialPlanDetail"]:
                    dialplan_site_range = tele_details["result"]["dialPlanDetail"]["dialPlanSiteRanges"]["dialPlanSiteRange"]
                    
                    for dialplan_site in dialplan_site_range:
                        dialplan_site["siteCompanyName"] = site_company_name
                        dialplan_site["siteID"] = site_id
                        dialplan_site["custDialPlanId"] = cust_dialplan_id
                        if dialplan_site["remoteTnInd"] == "N":
                            dialplan_site['Hub/Rmt'] = "CH"
                            site_address_parts = [site_address["room"], site_address["floor"], site_address["addr1"], site_address["city"], site_address["state"], site_address["country"], site_address["zip"]]
                            dialplan_site["siteAddress"] = ", ".join(filter(None, site_address_parts))
                        else:
                            dialplan_site['Hub/Rmt'] = "RB"
                        try:
                            remote_dialplan_site_range_list = tele_details["result"]["dialPlanDetail"]["remoteDialPlanSiteRangeList"]
                        except KeyError:
                            remote_dialplan_site_range_list = None
                        if remote_dialplan_site_range_list is not None:
                            dialplan_site["remoteSiteId"] = find_remote_site_id(remote_dialplan_site_range_list, dialplan_site["pbxBeginRange"], dialplan_site["pbxEndRange"])
                        data_for_tele_ranges.append(dialplan_site)
    
    return data_for_tele_ranges
      
def create_filename(basename: str, suffix: str):
    """
    Create a standardized name for a file.

    Args:
        basename (str): The base name of the file.
        suffix (str): The file extension or suffix.

    Returns:
        str: A string representing the standardized file name, which includes the current date and time.
    """
    """ create standardized name for file """
    now = datetime.datetime.now()
    return f'{basename}_{now.strftime("%m-%d-%Y_%H-%M-%S")}.{suffix}'

def execute_edf_query(query: str):
    """
    Executes an EDF query.

    Args:
        query (str): The EDF query to execute.

    Returns:
        dict: The response data from the EDF query execution. If the execution is successful, the data will be returned. 
        If there is an error, an error message will be returned in the form of a dictionary.

    Raises:
        AssertionError: If the response status code is not 201.

    """
    results = execute_oracle_sql_query(EDF_CONN, environ.get("EDF_M28805_USERNAME"), environ.get("EDF_M28805_PASSWORD"), query)
    if results["status"]:
        #data = [dict(zip(results["cols"], row)) for row in results["rows"]]
        data = [dict(zip(results["cols"], [str(val) for val in row])) for row in results["rows"]]
        return data
    else:
        logging.error("Executing EDF query resulted in error: ")
        print(results)
        return {"error": results}

def get_total_row_count(base_query):
    """
    Executes a SQL COUNT query to determine the total number of rows in the result set of the given base query.

    Args:
        base_query (str): The base SQL query whose result set row count is to be determined.

    Returns:
        int: The total number of rows in the result set of the base query. Returns 0 if the query result is empty or if an error occurs.
    """
    count_query = f"SELECT COUNT(*) AS ROW_COUNT FROM ({base_query})"
    result = execute_edf_query(count_query)
    return int(result[0]['ROW_COUNT']) if result else 0
       
def execute_edf_query_with_concurrency(base_query: str, row_limit=5000, max_concurrent_pages: int=10):
    """
    Executes an EDF query with concurrency, fetching results in pages.
    Args:
        base_query (str): The base SQL query to execute.
        row_limit (int, optional): The number of rows to fetch per page. Defaults to 5000.
        max_concurrent_pages (int, optional): The maximum number of concurrent pages to fetch. Defaults to 10.
    Returns:
        list: A list containing all the rows fetched by the query.
    Raises:
        Exception: If an error occurs during the execution of the query.
    """
    all_results = []
    # Get the total row count
    total_row_count = get_total_row_count(base_query)
    logging.info(f"Total row count: {total_row_count}")
    # Calculate the total number of pages
    total_pages = (total_row_count + row_limit - 1) // row_limit
    logging.info(f"Total pages to fetch: {total_pages}")
    
    def fetch_page(offset):
        try:
            paginated_query = f"{base_query} OFFSET {offset} ROWS FETCH NEXT {row_limit} ROWS ONLY"
            results = execute_edf_query(paginated_query)
            logging.info(f"Fetched Rows: ({offset}-{offset + len(results)})")
            return results
        except Exception as e:
            logging.error(f"Error fetching page at offset {offset}: {e}")
            return []

    offset = 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=max_concurrent_pages) as executor:
        while offset < total_row_count:
            futures = []
            for _ in range(max_concurrent_pages):
                if offset >= total_row_count:
                    break
                futures.append(executor.submit(fetch_page, offset))
                offset += row_limit
            
            # Collect the results from the futures
            for future in concurrent.futures.as_completed(futures):
                results = future.result()
                all_results.extend(results)
    
    logging.info(f"Total rows fetched: {len(all_results)}")
    return all_results

def get_site_account_numbers(site_ids: list):
    """
    Retrieves account numbers for a list of site identifiers concurrently.

    Args:
        site_ids (list): A list of site identifiers for which account numbers are to be retrieved.

    Returns:
        list: A list of dictionaries containing the site identifier and the account numbers.
    """
    account_numbers = []

    def fetch_account_numbers(site_id):
        query = get_site_account_numbers_query(site_id)
        result = execute_edf_query(query)
        if result:
            return result[0]
        return None

    with concurrent.futures.ThreadPoolExecutor() as executor:
        future_to_site_id = {executor.submit(fetch_account_numbers, site_id): site_id for site_id in site_ids}
        for future in concurrent.futures.as_completed(future_to_site_id):
            account_number = future.result()
            if account_number is not None:
                account_numbers.append(account_number)

    return account_numbers

def bootstrap_notification(data):
    """
    Send a bootstrap notification with the provided data.

    Args:
        data (dict): Dictionary containing a 'payload' key with the request data

    Returns:
        dict: Response containing status, status code, and message
    """
    try:
        # Validate required environment variables
        bootstrap_url = environ.get("BOOTSTRAP_URL")
        user = environ.get("BOOTSTRAP_USERNAME") 
        password = environ.get("BOOTSTRAP_PASSWORD")
        
        if not all([bootstrap_url, user, password]):
            raise ValueError("Missing required environment variables: BOOTSTRAP_URL, BOOTSTRAP_USERNAME, or BOOTSTRAP_PASSWORD")

        # Validate input data
        if not isinstance(data, dict) or 'payload' not in data:
            raise ValueError("Input data must be a dictionary containing 'payload' key")

        request_data = data["payload"]
        headers = {
            "Content-Type": "application/vnd.yang.operation+xml"
        }

        logging.debug("Bootstrap notification request - URL: %s, User: %s", bootstrap_url, user)
        logging.debug("Request payload: %s", request_data)

        response = req.post(
            bootstrap_url, 
            data=request_data, 
            headers=headers, 
            auth=(user, password),
            verify=False,  # Add verify=False if using self-signed certs
            proxies=proxies  # Use the global proxies configuration
        )

        # Convert response to string properly
        response_text = str(response.text)
        logging.debug("Response: %s", response_text)

        if response.status_code in [100, 204]:
            return {
                "status": "Success",
                "statusCode": response.status_code,
                "message": "Bootstrap notification execution successful!"
            }
        else:
            return {
                "status": "Error",
                "statusCode": response.status_code,
                "message": f"Request failed with status code {response.status_code}",
                "response": response_text
            }

    except req.RequestException as e:
        logging.error("Network error during bootstrap notification: %s", str(e))
        return {
            "status": "Error",
            "statusCode": 500,
            "message": f"Network error occurred: {str(e)}"
        }
    except Exception as e:
        logging.error("Error in bootstrap notification: %s", str(e))
        return {
            "status": "Error",
            "statusCode": 500,
            "message": f"An unexpected error occurred: {str(e)}"
        }

def execute_oracle_sql_query(tns: str, username: str, password: str, query: str):
    """
    Connects to Oracle DB and executes the given SQL query.
    Logs connection lifecycle, query execution, results, and errors.
    Returns fetched rows for SELECT, or rowcount for DML.
    """
    conn = None
    cursor = None
    try:
        logging.info("ExOraQuery - Connecting to Oracle DB: %s", tns)
        oracledb.init_oracle_client(lib_dir="/usr/local/instantclient")
        conn = oracledb.connect(user=username, password=password, dsn=tns)
        cursor = conn.cursor()

        logging.debug("ExOraQuery - Executing query: %s", query)
        cursor.execute(query)

        if cursor.description:
            columns = [col[0] for col in cursor.description]
            rows = cursor.fetchall()
            logging.info("ExOraQuery - Query returned %d rows", len(rows))
            return {
                "status": True,
                "cols": columns, 
                "rows": rows
            }

        conn.commit()
        logging.info("ExOraQuery - DML executed, %d rows affected", cursor.rowcount)
        return {
            "status": True,
            "rowCount": cursor.rowcount
        }

    except oracledb.DatabaseError as e:
        error_obj, = e.args
        logging.error("ExOraQuery - Oracle DB error %s: %s", error_obj.code, error_obj.message)
        return {
            "status": False,
            "errorCode": error_obj.code,
            "errorMessage": error_obj.message
        }

    except Exception as e:
        logging.exception("ExOraQuery - Unexpected error during Oracle query execution")
        return {
            "status": False,
            "errorCode": "UNKNOWN",
            "errorMessage": str(e)
        }

    finally:
        if cursor:
            cursor.close()
            logging.debug("ExOraQuery - Cursor closed")
        if conn:
            conn.close()
            logging.info("ExOraQuery - Connection closed")

