def get_dialplans_by_customer_names_query(customer_names: list):
    """
    Generates a SQL query to retrieve dial plans associated with a list of customer names using LIKE queries.

    Args:
        customer_names (list): A list of customer names to filter the dial plans.

    Returns:
        str: A SQL query string that selects the dial plan ID and name from the database.
    """
    # Construct the WHERE clause with multiple LIKE conditions
    like_conditions = " OR ".join(
        [f"customer.PRIMARY_COMPANY_NAME LIKE '%{name}%' OR cust_site.SITE_COMPANY_NAME LIKE '%{name}%'" for name in customer_names]
    )

    return f"""SELECT DISTINCT
        customer.CUSTOMER_DIAL_PLAN_ID AS DIAL_PLAN_ID,
        MAX(
            COALESCE(
                customer.PRIMARY_COMPANY_NAME,
                cust_site.SITE_COMPANY_NAME
            )
        ) AS COMPANY_NAME
    FROM
        CSI.CUSTOMER_SITE cust_site
        LEFT JOIN CSI.CUSTOMER customer ON customer.CUSTOMER_ID = cust_site.CUSTOMER_ID
    WHERE
        {like_conditions}
    GROUP BY
        customer.CUSTOMER_DIAL_PLAN_ID"""
        
def get_sites_by_dialplan_query(dialplan_id: str):
    """
    Generates a SQL query to retrieve site information based on a given dial plan ID.

    Args:
        dialplan_id (str): The ID of the dial plan to filter the sites.

    Returns:
        str: A SQL query string that selects site identifiers, customer site detail IDs, 
             and customer access circuit IDs from the database, joining several tables 
             to gather the necessary information.
    """
    return f"""SELECT
        cust_site.SITE_IDENTIFIER,
        site_detail.BVOIP_CUSTOMER_SITE_DETAIL_ID,
        icore_custaccess.ACC_CKT
    FROM
        CSI.CUSTOMER_SITE cust_site
        LEFT JOIN CSI.CUSTOMER customer ON customer.CUSTOMER_ID = cust_site.CUSTOMER_ID
        LEFT JOIN CSI.BVOIP_CUSTOMER_SITE_DETAIL site_detail ON site_detail.CUSTOMER_SITE_ID = cust_site.CUSTOMER_SITE_ID
        LEFT JOIN ICORE.PVC icore_pvc on icore_pvc.PVC_ID = site_detail.ICORE_PVC_ID
        LEFT JOIN ICORE.CUST_ACCESS icore_custaccess ON icore_custaccess.SITE_ID = icore_pvc.PVC_LSITE_ID
    WHERE
        customer.CUSTOMER_DIAL_PLAN_ID = '{dialplan_id}'"""

def get_site_account_numbers_query(site_details_id: str):
    """
    Generates a SQL query to retrieve account numbers associated with a specific site detail ID.

    Args:
        site_details_id (str): The ID of the site detail to filter the query.

    Returns:
        str: A SQL query string that selects the BVOIP customer site detail ID, lead account number,
             main account number, and sub account number from the INR.BVOIP_FEATURES_INV_VIEW table,
             joining with the CSI.BVOIP_CUSTOMER_SITE_DETAIL table, where the enterprise ID is not null
             and the site detail ID matches the provided value. The results are ordered by the bill date
             in descending order and limited to the first row.
    """
    return f"""SELECT
        bcsd.BVOIP_CUSTOMER_SITE_DETAIL_ID,
        bfiv.MAIN_ACCOUNT_NUMBER
    FROM
        INR.BVOIP_FEATURES_INV_VIEW bfiv
        JOIN CSI.BVOIP_CUSTOMER_SITE_DETAIL bcsd ON bfiv.SIID = bcsd.CHARGE_NUMBER
    WHERE
        bfiv.ENTERPRISE_ID IS NOT NULL
        AND bcsd.BVOIP_CUSTOMER_SITE_DETAIL_ID = {site_details_id}
    ORDER BY
        bfiv.BILL_DATE DESC
    FETCH NEXT
        1 ROWS ONLY"""

def get_hub_sites_tele_ranges_query(dialplan_id: str):
    """
    Generates a SQL query to retrieve telephone number (TN) ranges for a corporate hub site based on the provided dial plan ID.

    Args:
        dialplan_id (str): The ID of the dial plan to filter the results.

    Returns:
        str: A SQL query string to fetch the TN ranges for a corporate hub site.
    """
    return f"""SELECT
        cust_site.SITE_IDENTIFIER AS SITE_ID,
        COALESCE(
            cust_site.SITE_COMPANY_NAME,
            customer.PRIMARY_COMPANY_NAME
        ) AS COMPANY_NAME,
        cust_site.SITE_ROOM,
        cust_site.SITE_FLOOR,
        cust_site.SITE_ADDRESS,
        cust_site.SITE_CITY,
        cust_site.SITE_STATE,
        cust_site.SITE_ZIP,
        cust_site.SITE_COUNTRY,
        cust_site.SITE_STATUS,
        loc.CUST_ID as C,
        hierC.HIER_PNT_ID AS H,
        hierAB.ACCT_1_NB AS BA,
        hierI.ACCT_1_NB AS I,
        hierAG.ACCT_1_NB AS CDG,
        hier.ACCT_1_NB AS SA,
        COALESCE(ca.IOC1, ca1.IOC1, icore_custaccess.ACC_CKT) AS CIRCUIT_ID,
        site_detail.BVOIP_CUSTOMER_SITE_DETAIL_ID,
        site_detail.ENHANCED_SERVICE_INDR,
        site_detail.IPTF_SIP_OPTIONS_INDR,
        customer.CUSTOMER_DIAL_PLAN_ID,
        CASE
            WHEN dpsr.REMOTE_TN_INDR = 'Y' THEN 'RB'
            WHEN dpsr.REMOTE_TN_INDR = 'N' THEN 'CH'
            ELSE NULL
        END AS HUB_RMT_IND,
        dpsr.LENGTH_OF_PBX_EXTENSION,
        dpsr.COUNTRY_CODE,
        dpsr.GATEWAY_CITY_CODE,
        dpsr.PBX_BEGIN_RANGE,
        dpsr.PBX_END_RANGE,
        dpsr.PORTED_OR_NATIVE_IND,
        dpsr.TN_RANGE_STATUS,
        dpsr.TN_RANGE_STATUS_DATE,
        dpsr.LNS_SWITCH_CLLI,
        dpsr.VIRTUAL_TN_INDR,
        dpsr.REMOTE_TN_INDR,
        dpsr.E911_TYPE_CD,
        dpsr.OUTPULSE_DIGITS,
        CASE
            WHEN dpsr.E911_TYPE_CD = 0 THEN 'TRADITIONAL'
            WHEN dpsr.E911_TYPE_CD = 1 THEN 'INTRADO'
            ELSE NULL
        END AS E911_TYPE_DESC,
        dpsr.SWITCH_TYPE,
        dpsr.CALL_ROUTING_INDR,
        dpsr.LAST_UPDATE_DATE,
        ln.LN_STRT_DT
    FROM
        CSI.CUSTOMER_SITE cust_site
        LEFT JOIN CSI.CUSTOMER customer ON customer.CUSTOMER_ID = cust_site.CUSTOMER_ID
        LEFT JOIN CSI.BVOIP_CUSTOMER_SITE_DETAIL site_detail ON site_detail.CUSTOMER_SITE_ID = cust_site.CUSTOMER_SITE_ID
        LEFT JOIN ICORE.PVC icore_pvc ON icore_pvc.PVC_ID = site_detail.ICORE_PVC_ID
        LEFT JOIN ICORE.CUST_ACCESS icore_custaccess ON icore_custaccess.SITE_ID = icore_pvc.PVC_LSITE_ID
        LEFT JOIN CSI.DIAL_PLAN dp ON dp.BVOIP_CUSTOMER_SITE_DETAIL_ID = site_detail.BVOIP_CUSTOMER_SITE_DETAIL_ID
        LEFT JOIN CSI.DIAL_PLAN_SITE_RANGE dpsr ON dpsr.DIAL_PLAN_ID = dp.DIAL_PLAN_ID
        LEFT JOIN BIDS_DBA.IPV6_ASSIGNED_LINK_IPS ipv6ali ON ipv6ali.IPV6_ADDRESS_COMPRESS = site_detail.WAN_LINK_IP_ADDRESS
        LEFT JOIN BIDS_DBA.SERIAL_IP_ADDR sia ON sia.IP_ADDRESS = site_detail.WAN_LINK_IP_ADDRESS
        LEFT JOIN BIDS_DBA.IPV6_PORT_ASGMT_MAP pam ON pam.IPV6_LINK_IP_ID = ipv6ali.IPV6_LINK_IP_ID
        LEFT JOIN IPD_DBA.IP_PORT_ASGMT ipa ON ipa.SDID = pam.SDID
        LEFT JOIN IPD_DBA.IP_PORT_ASGMT ipa1 ON ipa1.WAN_ADDR_ID = sia.SERIAL_IP_ADDR_ID
        LEFT JOIN IPD_DBA.IP_SERV_ACC_PT isa ON isa.SERV_ACC_PT_ID = ipa.SERV_ACC_PT_ID
        LEFT JOIN IPD_DBA.IP_SERV_ACC_PT isa1 ON isa1.SERV_ACC_PT_ID = ipa1.SERV_ACC_PT_ID
        LEFT JOIN IPD_DBA.cust_access ca ON ca.SITE_ID = isa.SITE_ID
        LEFT JOIN IPD_DBA.cust_access ca1 ON ca1.SITE_ID = isa1.SITE_ID
        LEFT JOIN CADM.LN_TB ln ON ln.NPA_NB = dpsr.GATEWAY_CITY_CODE
        AND ln.NXX_NB = SUBSTR (dpsr.PBX_BEGIN_RANGE, 1, 3)
        AND ln.LN_NB = SUBSTR (dpsr.PBX_BEGIN_RANGE, -4)
        LEFT JOIN CADM.SVC_LOC_TB loc ON loc.SVC_LOC_ID = ln.SVC_LOC_ID
        LEFT JOIN CADM.HIER_PNT_TB hier ON hier.HIER_PNT_ID = loc.HIER_PNT_ID
        LEFT JOIN CADM.HIER_PNT_ASSOC_TB assocI ON assocI.HIER_PNT_ID = hier.HIER_PNT_ID
        AND assocI.PARNT_UB_ACCT_TYPE_CD = 'I'
        LEFT JOIN CADM.HIER_PNT_TB hierI ON hierI.HIER_PNT_ID = assocI.PARNT_HIER_PNT_ID
        LEFT JOIN CADM.HIER_PNT_ASSOC_TB assocAG ON assocAG.HIER_PNT_ID = hier.HIER_PNT_ID
        AND assocAG.PARNT_UB_ACCT_TYPE_CD = 'AG'
        LEFT JOIN CADM.HIER_PNT_TB hierAG ON hierAG.HIER_PNT_ID = assocAG.PARNT_HIER_PNT_ID
        LEFT JOIN CADM.HIER_PNT_ASSOC_TB assocC ON assocC.HIER_PNT_ID = hier.HIER_PNT_ID
        AND assocC.PARNT_UB_ACCT_TYPE_CD = 'C'
        LEFT JOIN CADM.HIER_PNT_TB hierC ON hierC.HIER_PNT_ID = assocC.PARNT_HIER_PNT_ID
        LEFT JOIN CADM.HIER_PNT_ASSOC_TB assocAB ON assocAB.HIER_PNT_ID = hier.HIER_PNT_ID
        AND assocAB.PARNT_UB_ACCT_TYPE_CD = 'AB'
        LEFT JOIN CADM.HIER_PNT_TB hierAB ON hierAB.HIER_PNT_ID = assocAB.PARNT_HIER_PNT_ID
    WHERE
        customer.CUSTOMER_DIAL_PLAN_ID = '{dialplan_id}'"""

def get_remote_sites_tele_ranges_query(bvoip_site_details_ids: list):
    """
    Generates a SQL query to retrieve telephone number (TN) ranges for remote sites based on provided BVOIP customer site detail IDs.

    Args:
        bvoip_site_details_ids (list): A list of BVOIP customer site detail IDs.

    Returns:
        str: A SQL query string to fetch the TN ranges for the specified remote sites.
    """
    bvoip_site_details_ids_str = "','".join(bvoip_site_details_ids)
    return f"""SELECT
        rsd.RM_SITE_ID AS REMOTE_SITE_ID,
        rsd.RM_SITE_LOCATION,
        rsd.RM_SITE_ROOM AS SITE_ROOM,
        rsd.RM_SITE_FLOOR AS SITE_FLOOR,
        rsd.RM_SITE_ADDRESS AS SITE_ADDRESS,
        rsd.RM_SITE_CITY AS SITE_CITY,
        rsd.RM_SITE_STATE AS SITE_STATE,
        rsd.RM_SITE_ZIP AS SITE_ZIP,
        rsd.RM_SITE_COUNTRY AS SITE_COUNTRY,
        rsd.RM_SITE_STATUS AS SITE_STATUS,
        loc.CUST_ID as C,
        hierC.HIER_PNT_ID AS H,
        hierAB.ACCT_1_NB AS BA,
        hierI.ACCT_1_NB AS I,
        hierAG.ACCT_1_NB AS CDG,
        hier.ACCT_1_NB AS SA,
        rsd.RM_SITE_DETAIL_ID,
        rsd.BVOIP_CUSTOMER_SITE_DETAIL_ID,
        CASE
            WHEN rstr.CORPORATE_POOL_TN_INDR = 'Y' THEN 'CH'
            WHEN rstr.CORPORATE_POOL_TN_INDR = 'N' THEN 'RB'
            ELSE NULL
        END AS HUB_RMT_IND,
        rstr.RM_SITE_LENGTH_OF_PBX_EXT AS LENGTH_OF_PBX_EXTENSION,
        rstr.RM_SITE_COUNTRY_CODE AS COUNTRY_CODE,
        rstr.RM_SITE_GW_CITY_CODE AS GATEWAY_CITY_CODE,
        rstr.RM_SITE_PBX_BEGIN_RANGE AS PBX_BEGIN_RANGE,
        rstr.RM_SITE_PBX_END_RANGE AS PBX_END_RANGE,
        rstr.RM_SITE_PORT_NATIVE_IND AS PORTED_OR_NATIVE_IND,
        rstr.RM_SITE_TN_RANGE_STATUS AS TN_RANGE_STATUS,
        rstr.RM_SITE_TN_RANGE_STATUS_DATE AS TN_RANGE_STATUS_DATE,
        rstr.RM_SITE_LNS_SWITCH_CLLI AS LNS_SWITCH_CLLI,
        rstr.RM_SITE_VIRTUAL_TN_INDR AS VIRTUAL_TN_INDR,
        rstr.CORPORATE_POOL_TN_INDR,
        rstr.E911_TYPE_CD,
        rstr.RM_SITE_OUTPULSE_DIGITS AS OUTPULSE_DIGITS,
        CASE
            WHEN rstr.E911_TYPE_CD = 0 THEN 'TRADITIONAL'
            WHEN rstr.E911_TYPE_CD = 1 THEN 'INTRADO'
            ELSE NULL
        END AS E911_TYPE_DESC,
        rstr.SWITCH_TYPE,
        rstr.CALL_ROUTING_INDR,
        rstr.LAST_UPDATE_DATE,
        ln.LN_STRT_DT
    FROM
        CSI.REMOTE_SITE_DETAIL rsd
        LEFT JOIN CSI.REMOTE_SITE_TN_RANGE rstr ON rsd.RM_SITE_DETAIL_ID = rstr.RM_SITE_DETAIL_ID
        LEFT JOIN CADM.LN_TB ln ON ln.NPA_NB = rstr.RM_SITE_GW_CITY_CODE AND ln.NXX_NB = SUBSTR(rstr.RM_SITE_PBX_BEGIN_RANGE,1,3)  AND ln.LN_NB = SUBSTR(rstr.RM_SITE_PBX_BEGIN_RANGE,-4)
        LEFT JOIN CADM.SVC_LOC_TB loc ON loc.SVC_LOC_ID = ln.SVC_LOC_ID
        LEFT JOIN CADM.HIER_PNT_TB hier ON hier.HIER_PNT_ID = loc.HIER_PNT_ID
        LEFT JOIN CADM.HIER_PNT_ASSOC_TB assocI ON assocI.HIER_PNT_ID = hier.HIER_PNT_ID AND assocI.PARNT_UB_ACCT_TYPE_CD = 'I'
        LEFT JOIN CADM.HIER_PNT_TB hierI ON hierI.HIER_PNT_ID = assocI.PARNT_HIER_PNT_ID
        LEFT JOIN CADM.HIER_PNT_ASSOC_TB assocAG ON assocAG.HIER_PNT_ID = hier.HIER_PNT_ID AND assocAG.PARNT_UB_ACCT_TYPE_CD = 'AG'
        LEFT JOIN CADM.HIER_PNT_TB hierAG ON hierAG.HIER_PNT_ID = assocAG.PARNT_HIER_PNT_ID
        LEFT JOIN CADM.HIER_PNT_ASSOC_TB assocC ON assocC.HIER_PNT_ID = hier.HIER_PNT_ID AND assocC.PARNT_UB_ACCT_TYPE_CD = 'C'
        LEFT JOIN CADM.HIER_PNT_TB hierC ON hierC.HIER_PNT_ID = assocC.PARNT_HIER_PNT_ID
        LEFT JOIN CADM.HIER_PNT_ASSOC_TB assocAB ON assocAB.HIER_PNT_ID = hier.HIER_PNT_ID AND assocAB.PARNT_UB_ACCT_TYPE_CD = 'AB'
        LEFT JOIN CADM.HIER_PNT_TB hierAB ON hierAB.HIER_PNT_ID = assocAB.PARNT_HIER_PNT_ID
     WHERE
         rsd.BVOIP_CUSTOMER_SITE_DETAIL_ID IN ('{bvoip_site_details_ids_str}')
         AND NOT (rstr.CORPORATE_POOL_TN_INDR = 'N' AND rsd.RM_SITE_ID IS NULL)
    """
def get_cnam_and_tn_query(site_ids: list):
    """
    Generates a SQL query to retrieve CNAM (Calling Name) and TN (Telephone Number) details 
    for the given list of site identifiers.

    Args:
        site_ids (list): A list of site identifiers.

    Returns:
        str: A SQL query string that selects the SITE_IDENTIFIER, CNAM, and TN from the 
             LIDB_CARE_CNAM_DETAIL table, joined with the CUSTOMER_SITE table, where the 
             SITE_IDENTIFIER is in the provided list of site identifiers.
    """
    site_ids_str = "','".join(site_ids)
    return f"""SELECT 
        CUST_SITE.SITE_IDENTIFIER, 
        RM_SITE.RM_SITE_ID,
        CNAM.CNAM, 
        CNAM.TN 
    FROM 
        CSI.LIDB_CARE_CNAM_DETAIL CNAM 
    LEFT JOIN CSI.CUSTOMER_SITE CUST_SITE ON CUST_SITE.CUSTOMER_SITE_ID = CNAM.CUSTOMER_SITE_ID 
    LEFT JOIN CSI.REMOTE_SITE_DETAIL RM_SITE ON RM_SITE.RM_SITE_DETAIL_ID = CNAM.RM_SITE_DETAIL_ID
    WHERE 
        CUST_SITE.SITE_IDENTIFIER IN ('{site_ids_str}')"""

def get_ip_tollfree_tn_query(dialplan_id: str):
    """
    Generates a SQL query to retrieve IP toll-free telephone numbers for a given dial plan ID.

    Args:
        dialplan_id (str): The ID of the dial plan to filter the results.

    Returns:
        str: A SQL query string to fetch the IP toll-free telephone numbers.
    """
    return f"""SELECT 
        iptfnumber.IPTF_NUMBER as IPTF_NUMBER,
        ric.IPTF_RIC as RIC,
        routing.SDOP as SDOP, 
        routing.RRN as RRN, 
        routing.REROUTE_RRN as IP_ADR_RRN, 
        routing.GUIDING_DIGITS as GUIDING_DIGITS
    FROM CSI.IPTF_NUMBER_DETAIL iptfnumber
        LEFT JOIN CSI.IPTF_RIC_DETAIL ric ON ric.IPTF_RIC_DETAIL_ID = iptfnumber.IPTF_RIC_DETAIL_ID    
        LEFT JOIN CSI.IPTF_ROUTING_DETAIL routing ON routing.IPTF_NUMBER_DETAIL_ID = iptfnumber.IPTF_NUMBER_DETAIL_ID
        LEFT JOIN CSI.BVOIP_CUSTOMER_SITE_DETAIL site_detail ON site_detail.BVOIP_CUSTOMER_SITE_DETAIL_ID = ric.BVOIP_CUSTOMER_SITE_DETAIL_ID
        LEFT JOIN CSI.CUSTOMER_SITE cust_site ON  cust_site.CUSTOMER_SITE_ID = site_detail.CUSTOMER_SITE_ID
        LEFT JOIN CSI.CUSTOMER customer ON customer.CUSTOMER_ID = cust_site.CUSTOMER_ID
    WHERE customer.CUSTOMER_DIAL_PLAN_ID = '{dialplan_id}'"""