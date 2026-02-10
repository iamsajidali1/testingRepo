""" module used to generate files """
import sys
import logging
import re
from base64 import b64encode
from io import BytesIO
import xlsxwriter
from zipfile import ZipFile
import traceback


logging.basicConfig(
    stream=sys.stdout,
    level=logging.DEBUG,
    format='%(asctime)s: %(levelname)-8s: %(message)s'
)

def dotted_key_list(data, keys):
    """ Search function to generate full json path """
    if keys:
        if keys[0] in data:
            return dotted_key_list(data[keys[0]], keys[1:])
        else:
            return "N/A"
    return str(data)

def circuit_list(order_list: list):
    """ report that provides list of circuit parameters """
    out_name = BytesIO()
    wbk = xlsxwriter.Workbook(out_name)
    wsavpn = wbk.add_worksheet("AVPN")
    avpn_ds = [
        (['N/A'], 'CKT ID'),
        (['customer_cust_name'], 'Customer Name'),
        (['premise_address'], 'Site Address'),
        (['premise_city'], 'City'),
        (['premise_state_abbr'], 'State'),
        (['N/A'], 'Service Name'),
        (['custaccess_vendor_cktname'], 'LEC CKT ID'),
        (['site_contr_port_speed'], 'Contracted Speed'),
        (['pvcext_c_vlanid_bot'], 'Custom VLAN Bottom'),
        (['vpn_name'], 'VPN Name'),
        (['bgprt_asn'], 'V4 ASN'),
        (['egress_profile_id'], 'PVC Level Egress Prof ID'),
        (['cosprofileeg_profile_name'], 'PVC Level Egress Prof Name'),
        (['site_egress_profile_id'], 'PORT Level Egress Prof ID'),
        (['cosprofileegsite_profile_name'], 'PORT Level Egress Prof Name'),
        (['icore_pvc_id'], 'ICORE PVC ID'),
        (['portasgmt_port_state'], 'Instar Port State'),
        (['ip_port_asgmt_id'], 'Instar Port Assignment ID'),
        (['portinttype_int_type'], 'Port interface Type'),
        (['servacpt_ip_version'], 'IP Version'),
        (['cpe_ip_address'], 'CER (CR) IP Address'),
        (['per_ip_address'],'PER (AR) IP Address'),
        (['address_mask'],'Subnet Mask'),
        (['v6_per_ip'],'IPv6 CER (CR) IP Address'),
        (['v6_cer_ip'],'IPv6 PER (AR) IP Address'),
        (['v6_wan_ip'],'IPv6 WAN Address'),
        (['v6_blocksize'],'IPv6 Length')
    ]
    avpn_num = 1
    #header for AVPN
    for index, header_data in enumerate(avpn_ds):
        wsavpn.write(0, index, header_data[1])
    wsadi = wbk.add_worksheet('ADI')
    adi_ds = [
        (['N/A'], 'CKT ID'),
        (['customer_cust_name'], 'Customer Name'),
        (['premise_address'], 'Site Address'),
        (['premise_city'], 'City'),
        (['premise_state_abbr'], 'State'),
        (['N/A'], 'Service Name'),
        (['custaccess_vendor_ckt'], 'LEC CKT ID'),
        (['servacpt_required_bw'], 'Bandwidth'),
        (['naport_protocol'], 'Routing Protocol'),
        (['Layer3ConnectionDetail','COSDetails','IngressCOS','profileId'],
         'PVC Level Ingress Prof ID'),
        (['Layer3ConnectionDetail','COSDetails','EgressCOS','profileId'],
         'PVC Level Egress Prof ID'),
        (['icore_pvc_id'], 'ICORE PVC ID'),
        (['portasgmt_port_state'], 'Instar Port State'),
        (['ip_port_asgmt_id'], 'Instar Port Assignment ID'),
        (['portinttype_int_type'], 'Port interface Type'),
        (['servacpt_ip_version'], 'IP Version'),
        (['cpe_ip_address'], 'CER (CR) IP Address'),
        (['per_ip_address'],'PER (AR) IP Address'),
        (['address_mask'],'Subnet Mask'),
        (['v6_per_ip'],'IPv6 CER (CR) IP Address'),
        (['v6_cer_ip'],'IPv6 PER (AR) IP Address'),
        (['v6_wan_ip'],'IPv6 WAN Address'),
        (['v6_blocksize'],'IPv6 Length')
    ]
    adi_num = 1
    #header for ADI
    for index, header_data in enumerate(adi_ds):
        wsadi.write(0, index, header_data[1])
    wslanv4 = wbk.add_worksheet("ADI-LANv4")
    lanv4_ds = [
        (['N/A'], 'CKT ID'),
        (['N/A'], 'LAN IP Address'),
        (['assignip_slash'], 'LAN Subnet Mask')
    ]
    ipv4_num = 1
    #header for LAN IPv4
    for index, header_data in enumerate(lanv4_ds):
        wslanv4.write(0, index, header_data[1])
    wslanv6 = wbk.add_worksheet("ADI-LANv6")
    lanv6_ds = [
        (['N/A'], 'CKT ID'),
        (['ipv6assignip_ipv6_ip'], 'LAN IPv6'),
        (['ipv6assignip_ipv6_ip_compress'], 'IP Compressed'),
        (['ipv6assignip_length'], 'IPv6 Length')
    ]
    ipv6_num = 1
    #header for LAN IPv6
    for index, header_data in enumerate(lanv6_ds):
        wslanv6.write(0, index, header_data[1])
    for order in order_list:
        if "result" in order["capig005"] and "circuitDetails" in order["capig005"]["result"]:
            for segment in order["capig005"]["result"]["circuitDetails"]:
                if segment["servacpt_segment"] == 'PER':
                    if segment["service_serv_name"] == "MIS":
                        for index, item in enumerate(adi_ds):
                            if item[1] == "CKT ID":
                                wsadi.write(adi_num, index, order["cktid"])
                            elif item[1] == "Service Name":
                                wsadi.write(adi_num, index, "ADI")
                            elif item[1] == "PVC Level Ingress Prof ID":
                                if "capig001" in order and "OrderList" in order["capig001"]["result"]:
                                    for itemlist in order["capig001"]["result"]["OrderList"]:
                                        if itemlist[
                                            "orderCategory"] == 'PVC' and "COSDetails" in itemlist[
                                            "Layer3ConnectionDetail"]:
                                            wsadi.write(adi_num, index, dotted_key_list(
                                                itemlist, item[0]))
                                        else:
                                            wsadi.write(adi_num, index, "")
                                else:
                                    wsadi.write(adi_num, index, "")
                            elif item[1] == "PVC Level Egress Prof ID":
                                if "capig001" in order and "OrderList" in order["capig001"]["result"]:
                                    for itemlist in order["capig001"]["result"]["OrderList"]:
                                        if itemlist[
                                            "orderCategory"] == 'PVC' and "COSDetails" in itemlist[
                                            "Layer3ConnectionDetail"]:
                                            wsadi.write(adi_num, index, dotted_key_list(
                                                itemlist, item[0]))
                                        else:
                                            wsadi.write(adi_num, index, "")
                                else:
                                    wsadi.write(adi_num, index, "")
                            else:
                                wsadi.write(adi_num, index, dotted_key_list(segment, item[0]))
                        adi_num += 1
                        if "lanV4Segments" in segment:
                            for lan in segment["lanV4Segments"]:
                                for index, item in enumerate(lanv4_ds):
                                    if item[1] == "CKT ID":
                                        wslanv4.write(ipv4_num, index, order["cktid"])
                                    elif item[1] == "LAN IP Address":
                                        wslanv4.write(ipv4_num, index, re.sub(r'\.\d+$',
                                                                            '', lan["assignip_ip"]))
                                    else:
                                        wslanv4.write(ipv4_num, index, dotted_key_list(lan, item[0]))
                                ipv4_num += 1
                        if "lanV6Segments" in segment:
                            for lan in segment["lanV6Segments"]:
                                for index, item in enumerate(lanv6_ds):
                                    if item[1] == "CKT ID":
                                        wslanv6.write(ipv6_num, index, order["cktid"])
                                    else:
                                        wslanv6.write(ipv6_num, index, dotted_key_list(lan, item[0]))
                                ipv6_num += 1
                    elif segment["service_serv_name"] == "NB-IPVPN":
                        for index, item in enumerate(avpn_ds):
                            if item[1] == "CKT ID":
                                wsavpn.write(avpn_num, index, order["cktid"])
                            elif item[1] == "Service Name":
                                wsavpn.write(avpn_num, index, "AVPN")
                            else:
                                wsavpn.write(avpn_num, index, dotted_key_list(segment, item[0]))
                        avpn_num += 1
    # nice headers
    # freeze pane
    header_avpn = [{'header': di[1]} for di in avpn_ds]
    header_adi = [{'header': di[1]} for di in adi_ds]
    header_adiv4 = [{'header': di[1]} for di in lanv4_ds]
    header_adiv6 = [{'header': di[1]} for di in lanv6_ds]
    wsavpn.add_table(0,0,avpn_num - 1, len(avpn_ds) -1 ,{'columns': header_avpn,'header_row': True,
                                                         'autofilter': True, 'banded_rows': True,
                                                         'style': 'Table Style Light 11'})
    wsadi.add_table(0,0,adi_num - 1, len(adi_ds) -1 ,{'columns': header_adi, 'header_row': True,
                                                      'autofilter': True, 'banded_rows': True,
                                                      'style': 'Table Style Light 11'})
    wslanv4.add_table(0,0,ipv4_num - 1, len(lanv4_ds) -1 ,{'columns': header_adiv4,
                                                           'header_row': True, 'autofilter': True,
                                                           'banded_rows': True,
                                                           'style': 'Table Style Light 11'})
    wslanv6.add_table(0,0,ipv6_num - 1, len(lanv6_ds) -1 ,{'columns': header_adiv6,
                                                           'header_row': True,'autofilter': True,
                                                           'banded_rows': True,
                                                           'style': 'Table Style Light 11'})
    wsavpn.autofit()
    wsadi.autofit()
    wslanv4.autofit()
    wslanv6.autofit()
    wsavpn.freeze_panes(1, 1)
    wsadi.freeze_panes(1, 1)
    wslanv4.freeze_panes(1, 1)
    wslanv6.freeze_panes(1, 1)
    wbk.close()
    out_name.seek(0)
    return b64encode(out_name.read()).decode()

def geodata_list(address_list: list):
    """ report that provides list of geolocation data """
    out_name = BytesIO()
    wbk = xlsxwriter.Workbook(out_name)
    sheet = wbk.add_worksheet("Geodata")
    sheet_ds = [
        (['street_address'], 'Street_Address'),
        (['city'], 'City'),
        (['state'], 'state'),
        (['postal_code'], 'Postal_code'),
        (['lat'], 'Latitude'),
        (['lon'], 'Longitude')
    ]
    sheet_num = 1
    #header for table
    for index, header_data in enumerate(sheet_ds):
        sheet.write(0, index, header_data[1])   
    for address in address_list:
        for index, item in enumerate(sheet_ds):
            sheet.write(sheet_num, index, dotted_key_list(address, item[0]))
        sheet_num += 1
    # nice headers
    # freeze pane
    header_sheet = [{'header': di[1]} for di in sheet_ds]
    sheet.add_table(0,0,sheet_num - 1, len(sheet_ds) -1 ,{'columns': header_sheet,
                                                          'header_row': True,
                                                         'autofilter': True, 'banded_rows': True,
                                                         'style': 'Table Style Light 11'})
    sheet.autofit()
    sheet.freeze_panes(1, 1)
    wbk.close()
    out_name.seek(0)
    return b64encode(out_name.read()).decode()

def telenumber_ranges_list(tn_ranges: list, cn_tn: list, iptf_tn: list) -> str:
    """
    Generates an Excel file containing two worksheets: TN_RANGES and CNAM_TN.
    Args:
        tn_ranges (list): List of dictionaries representing TN ranges.
        cn_tn (list): List of dictionaries representing CNAM TN.
        iptf_tn (list): List of dictionaries representing IP TOLL-FREE TN.
    Returns:
        str: Base64 encoded string of the generated Excel file.
    """
    def write_sheet_data(sheet, data_source, data):
        """
        Helper function to write data to a worksheet.
        Args:
            sheet: The worksheet object.
            data_source: List of tuples containing data keys and headers.
            data: List of dictionaries containing the data to write.
        """
        # Write headers
        for index, header_data in enumerate(data_source):
            sheet.write(0, index, header_data[1])
        
        # Write data rows
        for row_num, row_data in enumerate(data, start=1):
            for col_num, item in enumerate(data_source):
                sheet.write(row_num, col_num, dotted_key_list(row_data, item[0]))
        
        # Add table formatting
        header_sheet = [{'header': di[1]} for di in data_source]
        sheet.add_table(
            0, 0, len(data), len(data_source) - 1,
            {
                'columns': header_sheet,
                'header_row': True,
                'autofilter': True,
                'banded_rows': True,
                'style': 'Table Style Light 11'
            }
        )
        sheet.autofit()
        sheet.freeze_panes(1, 1)
    
    out_name = BytesIO()
    wbk = xlsxwriter.Workbook(out_name)
    
    # TN_RANGES worksheet
    tn_sheet_ds = [
        (['SITE_ID'], 'SITE_ID'),
        (['REMOTE_SITE_ID'], 'REMOTE_SITE_ID'),
        (['RM_SITE_LOCATION'], 'RM_SITE_LOCATION'),
        (['COMPANY_NAME'], 'COMPANY_NAME'),
        (['SITE_ROOM'], 'SITE_ROOM'),
        (['SITE_FLOOR'], 'SITE_FLOOR'),
        (['SITE_ADDRESS'], 'SITE_ADDRESS'),
        (['SITE_CITY'], 'SITE_CITY'),
        (['SITE_STATE'], 'SITE_STATE'),
        (['SITE_COUNTRY'], 'SITE_COUNTRY'),
        (['SITE_ZIP'], 'SITE_ZIP'),
        (['MAIN_ACCOUNT_NUMBER'], 'MAIN_ACCOUNT_NUMBER'),
        (['C'], 'C'),
        (['H'], 'H'),
        (['BA'], 'BA'),
        (['I'], 'I'),
        (['CDG'], 'CDG'),
        (['SA'], 'SA'),
        (['CIRCUIT_ID'], 'CIRCUIT_ID'),
        (['CUSTOMER_DIAL_PLAN_ID'], 'DIAL_PLAN_ID'),
        (['HUB_RMT_IND'], 'HUB/RMT'),
        (['LENGTH_OF_PBX_EXTENSION'], 'LENGTH_OF_PBX_EXTENSION'),
        (['COUNTRY_CODE'], 'COUNTRY_CODE'),
        (['GATEWAY_CITY_CODE'], 'GATEWAY_CITY_CODE'),
        (['PBX_BEGIN_RANGE'], 'PBX_BEGIN_RANGE'),
        (['PBX_END_RANGE'], 'PBX_END_RANGE'),
        (['PORTED_OR_NATIVE_IND'], 'PORTED_OR_NATIVE_IND'),
        (['ENHANCED_SERVICE_INDR'], 'ENHANCED_SERVICE_IND'),
        (['IPTF_SIP_OPTIONS_INDR'], 'IPTF_SIP_OPTIONS_IND'),
        (['TN_RANGE_STATUS'], 'TN_RANGE_STATUS'),
        (['TN_RANGE_STATUS_DATE'], 'TN_RANGE_STATUS_DATE'),
        (['LNS_SWITCH_CLLI'], 'LNS_SWITCH_CLLI'),
        (['SWITCH_TYPE'], 'SWITCH_TYPE'),
        (['VIRTUAL_TN_INDR'], 'VIRTUAL_TN_IND'),
        (['REMOTE_TN_INDR'], 'REMOTE_TN_IND'),
        (['E911_TYPE_CD'], 'E911_TYPE'),
        (['E911_TYPE_DESC'], 'E911_TYPE_DESC'),
        (['OUTPULSE_DIGITS'], 'OUTPULSE_DIGITS'),
        (['CALL_ROUTING_INDR'], 'CALL_ROUTING_IND'),
        (['LAST_UPDATE_DATE'], 'LAST_UPDATE_DATE'),
        (["LN_STRT_DT"], 'LN_STRT_DT')
    ]
    tn_sheet = wbk.add_worksheet("TN_RANGES")
    write_sheet_data(tn_sheet, tn_sheet_ds, tn_ranges)
    
    # CNAM_TN worksheet
    cnam_sheet_ds = [
        (['SITE_IDENTIFIER'], 'SITE_ID'),
        (['RM_SITE_ID'], 'REMOTE_SITE_ID'),
        (['CNAM'], 'CNAM'),
        (['TN'], 'TN')
    ]
    cnam_sheet = wbk.add_worksheet("CNAM_TN")
    write_sheet_data(cnam_sheet, cnam_sheet_ds, cn_tn)
    
    # IPTF_TN worksheet
    iptf_sheet_ds = [
        (['IPTF_NUMBER'], 'IPTF_NUMBER'),
        (['RIC'], 'RIC'),
        (['SDOP'], 'SDOP'),
        (['RRN'], 'RRN'),
        (['IP_ADR_RRN'], 'IP_ADR_RRN'),
        (['GUIDING_DIGITS'], 'GUIDING_DIGITS')
    ]
    iptf_sheet = wbk.add_worksheet("IPTF_TN")
    write_sheet_data(iptf_sheet, iptf_sheet_ds, iptf_tn)
    
    wbk.close()
    out_name.seek(0)

    return b64encode(out_name.read()).decode()
    # Create a ZIP file containing the Excel file
    #try:
    #    zip_buffer = BytesIO()
    #    with ZipFile(zip_buffer, 'w') as zip_file:
    #        zip_file.writestr('report.xlsx', out_name.read())
    #    zip_buffer.seek(0)
    #    encoded = b64encode(zip_buffer.read()).decode()
    #    logging.info("ZIP file created and base64 encoded successfully.")
    #    return encoded
    #except Exception as e:
    #    logging.error("Error during ZIP creation or base64 encoding: %s", str(e))
    #    logging.error(traceback.format_exc())
    #    return None