#pylint:disable = too-many-lines
""" report module with smaller functions """
from datetime import datetime
from base64 import b64encode
import logging
import sys
import json
from io import BytesIO
import numpy as np
import pandas as pd
import xlsxwriter
from api.doc_utils_helpers import dotted_key_list
from api.utils import (get_license_name, calculate_max_trough, calculate_average, calculate_95th_percentile, calculate_29_subnet)


logging.basicConfig(
    stream=sys.stdout,
    level=logging.DEBUG,
    format='%(asctime)s: %(levelname)-8s: %(message)s'
)

def divide(item):
    """Divide the parameter by 1000"""
    if item is None:
        return item
    return item / 1000

def site_list(edge_list: list):
    """ report that provides simplified site list """
    out_name = BytesIO()
    wbk = xlsxwriter.Workbook(out_name)
    siteinfo = wbk.add_worksheet('siteinfo')
    linenum = 1
    data_source = [
        (['site', 'city'], 'city'),
        (['site', 'state'], 'state'),
        (['site', 'streetAddress'], 'street'),
        (['name'], 'name'),
        (['serviceState'], 'Service State'),
        (['activationTime'], 'Activation Time'),
        (['serialNumber'], 'serial'),
        (['edgeState'], 'edgestate'),
        (['modelNumber'], 'model'),
        (['site', 'postalCode'], 'zipcode'),
        (['haSerialNumber'], 'HA')
    ]
    # Create header
    for index, header_data in enumerate(data_source):
        siteinfo.write(0, index, header_data[1])
    # Data insert
    for edge in edge_list:
        for index, item in enumerate(data_source):
            if item[0] == ["haSerialNumber"]:
                if edge['haState'] == "UNCONFIGURED":
                    siteinfo.write(linenum, index, "")
                else:
                    siteinfo.write(linenum, index, dotted_key_list(
                        edge, item[0]))
            else:
                siteinfo.write(linenum, index, dotted_key_list(edge, item[0]))
        linenum += 1
    wbk.close()
    out_name.seek(0)
    return b64encode(out_name.read()).decode()

def convert_bytes(bytes_value):
    KB = 1024
    MB = 1024 * KB
    GB = 1024 * MB
    TB = 1024 * GB
    
    if bytes_value == 0:
        return "0 KB"
    elif bytes_value >= TB:
        value = bytes_value / TB
        return f"{value:.2f} TB"
    elif bytes_value >= GB:
        value = bytes_value / GB
        return f"{value:.2f} GB"
    elif bytes_value >= MB:
        value = bytes_value / MB
        return f"{value:.2f} MB"
    else:
        value = bytes_value / KB
        return f"{value:.2f} KB"
    
def aggregate_metrics(data):
# Initialize a dictionary to hold the aggregated metrics per edgeName
    aggregated_metrics_per_edge = {}
    # Initialize a flag to check if "other" category exists
    other_exists = False
    # Iterate over the list of items
    for item in data:
        edge_name = item.get('edgename')
        if 'name' in item and item['name'] == 'other':
            other_exists = True
            if 'metrics' in item:
                if edge_name not in aggregated_metrics_per_edge:
                    aggregated_metrics_per_edge[edge_name] = {
                        'bytesRx': 0,
                        'bytesTx': 0,
                        'totalBytes': 0,
                        'packetsRx': 0,
                        'packetsTx': 0,
                        'totalPackets': 0,
                    }
                for key in aggregated_metrics_per_edge[edge_name].keys():
                    aggregated_metrics_per_edge[edge_name][key] += item['metrics'].get(key, 0)
    # If "other" category exists, return the aggregated metrics per edgeName
    if other_exists:
        return aggregated_metrics_per_edge
    else:
        return "No 'other' category found"

def staticRoutesExportDoc(all_edges_config, all_segments):
    data=[]
    for edge in all_edges_config:
        for module in edge ["configuration"]["enterprise"]["modules"]:
            if module["name"] == "deviceSettings":
                if "edgeSpecificData" in module and "segments" in module["edgeSpecificData"]:
                    for static in module["edgeSpecificData"]["segments"]:
                        if static["segment"]["name"] in [segment["name"] for segment in all_segments]:
                            for routes in static["routes"]["static"]:
                                Rdestination = routes.get("destination")
                                Rgateway = routes.get("gateway")
                                RcidrPrefix = routes.get("cidrPrefix")
                                Radvertise = routes.get("advertise")
                                Rpreferred = routes.get("preferred")
                                RwanInterface = routes.get("wanInterface")
                                RsubinterfaceId = routes.get("subinterfaceId")
                                if RsubinterfaceId == -1:
                                    RsubinterfaceId = ""
                                RsourceIp = routes.get("sourceIp")
                                RvlanId = routes.get("vlanId")
                                data.append([edge["customInfo"], edge["name"], Rdestination, RcidrPrefix, RsourceIp, RvlanId ,Rgateway, Radvertise, Rpreferred, RwanInterface, RsubinterfaceId, static["segment"]["name"]])
    df = pd.DataFrame(data)
    df.columns =['Site name','Hostname', 'destination', 'cidrPrefix','sourceIp','vlanId','gateway', 'advertise','preferred','Interface','subinterfaceId', 'Segment' ]
    output = BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        df.to_excel(writer, index=False, sheet_name='Routes')
        worksheet = writer.sheets['Routes']
        worksheet.add_table(0, 0, len(df), len(df.columns)-1, {
            'columns': [{'header': column_name} for column_name in df.columns],
            'style': 'Table Style Medium 9'
        })
        worksheet.set_column('A:C', 30)
        worksheet.set_column('D:L', 15)
    encoded_excel = b64encode(output.getvalue()).decode('utf-8')
    output.close()
    return encoded_excel


def application_report(all_applications,all_toptalkers):
    """ report that provides simplified site list """
    flattened_data = []
    for entry in all_applications:
        if 'metrics' in entry:
            metrics = entry.pop('metrics')
            entry.update(metrics)
        flattened_data.append(entry)
    # Create a DataFrame
    aggregate_metrics_data = aggregate_metrics(all_toptalkers)
    df = pd.DataFrame(flattened_data)   
    df2 =pd.DataFrame(all_toptalkers)
    # Reorder columns and drop 'application' and 'category'
    aggregate_metrics_data = df.groupby(['name', 'categoryName']).sum().reset_index()
    aggregate_metrics_data_sorted = aggregate_metrics_data.sort_values(by='totalBytes', ascending=False).reset_index(drop=True)
    df['bytesRx'] = df['bytesRx'].apply(convert_bytes)
    df['bytesTx'] = df['bytesTx'].apply(convert_bytes)
    df['totalBytes'] = df['totalBytes'].apply(convert_bytes)
    #aggregate_metrics_data = aggregate_metrics(all_toptalkers)
    df2 = df2[df2['name'] != 'other']
    Sorted_toptalkers = df2.sort_values(by='totalBytes', ascending=False).reset_index(drop=True)
    aggregate_metrics_data_sorted['bytesRx'] = aggregate_metrics_data_sorted['bytesRx'].apply(convert_bytes)
    aggregate_metrics_data_sorted['bytesTx'] = aggregate_metrics_data_sorted['bytesTx'].apply(convert_bytes)
    aggregate_metrics_data_sorted['totalBytes'] = aggregate_metrics_data_sorted['totalBytes'].apply(convert_bytes)
    columns_order_aggregate_metrics_data_sorted = ['name', 'categoryName', 'totalBytes','bytesRx', 'bytesTx', 'packetsRx', 'packetsTx', 'totalPackets', 'flowCount']
    aggregate_metrics_data_sorted = aggregate_metrics_data_sorted[columns_order_aggregate_metrics_data_sorted]
    aggregate_metrics_data_sorted = aggregate_metrics_data_sorted[aggregate_metrics_data_sorted['name'] != 'Unknown virtual protocol']
    columns_order_Sorted_toptalkers = ['edgename', 'name', 'totalBytes','bytesRx', 'bytesTx', 'packetsRx', 'packetsTx', 'totalPackets']
    Sorted_toptalkers = Sorted_toptalkers[columns_order_Sorted_toptalkers]
    Sorted_toptalkers['bytesRx'] = Sorted_toptalkers['bytesRx'].apply(convert_bytes)
    Sorted_toptalkers['bytesTx'] = Sorted_toptalkers['bytesTx'].apply(convert_bytes)
    Sorted_toptalkers['totalBytes'] = Sorted_toptalkers['totalBytes'].apply(convert_bytes)
    df2['bytesRx'] = df2['bytesRx'].apply(convert_bytes)
    df2['bytesTx'] = df2['bytesTx'].apply(convert_bytes)
    df2['totalBytes'] = df2['totalBytes'].apply(convert_bytes)
    columns_order = ['edgename', 'name', 'categoryName', 'totalBytes','bytesRx', 'bytesTx', 'packetsRx', 'packetsTx', 'totalPackets', 'flowCount']
    columns_order_df2 = ['edgename', 'name', 'totalBytes','bytesRx', 'bytesTx', 'packetsRx', 'packetsTx', 'totalPackets']
    df = df[columns_order]
    df2 = df2[columns_order_df2]
    output = BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        df.to_excel(writer, index=False, sheet_name='Top 20 Applications')
        workbook = writer.book
        worksheet = writer.sheets['Top 20 Applications']
        worksheet.add_table(0, 0, len(df), len(df.columns)-1, {
            'columns': [{'header': column_name} for column_name in df.columns],
            'style': 'Table Style Medium 9'
        })
        worksheet.set_column('A:C', 30)
        worksheet.set_column('D:K', 15)  
        df2.to_excel(writer, index=False, sheet_name='Top Talkers')
        worksheet2 = writer.sheets['Top Talkers']
        worksheet2.add_table(0, 0, len(df2), len(df2.columns) - 1, {
        'columns': [{'header': column_name} for column_name in df2.columns],
        'style': 'Table Style Medium 9'
        })
        worksheet2.set_column('A:B', 30)
        worksheet2.set_column('C:K', 15)  
        aggregate_metrics_data_sorted.to_excel(writer, index=False, sheet_name='Top Applications summary')
        worksheet3 = writer.sheets['Top Applications summary']
        worksheet3.add_table(0, 0, len(aggregate_metrics_data_sorted), len(aggregate_metrics_data_sorted.columns) - 1, {
        'columns': [{'header': column_name} for column_name in aggregate_metrics_data_sorted.columns],
        'style': 'Table Style Medium 9'
        })
        worksheet3.set_column('A:B', 30)
        worksheet3.set_column('C:K', 15)
        Sorted_toptalkers.to_excel(writer, index=False, sheet_name='Top Talkers summary')
        worksheet4 = writer.sheets['Top Talkers summary']
        worksheet4.add_table(0, 0, len(Sorted_toptalkers), len(Sorted_toptalkers.columns) - 1, {
        'columns': [{'header': column_name} for column_name in Sorted_toptalkers.columns],
        'style': 'Table Style Medium 9'
        })
        worksheet4.set_column('A:B', 30)
        worksheet4.set_column('C:K', 15)
        
    encoded_excel = b64encode(output.getvalue()).decode('utf-8')
    output.close()
    return encoded_excel

def gaming_application_report(all_applications, all_flows):
    """ report that provides simplified site list """
    flattened_data = []
    for entry in all_applications:
        if 'metrics' in entry:
            metrics = entry.pop('metrics')
            entry.update(metrics)
        flattened_data.append(entry)
    # Create a DataFrame
    df = pd.DataFrame(flattened_data)
    df2 = pd.DataFrame(all_flows)
    df2 = df2[df2['sourceIp'].notna()]  # Remove rows where "sourceIp" is empty
    df2 = df2.drop(columns=['name','transport','linkId','count','metrics','startTime','destFQDN','hostName','isp','packetsRx','packetsTx', 'totalPackets','application', 'packetsReceived','packetsSent','endTime','nextHop','businessRuleName', 'firewallRuleName'])  # Drop only the specified columns
    
    aggregate_metrics_data = df.groupby(['name', 'categoryName']).sum().reset_index()
    aggregate_metrics_data_sorted = aggregate_metrics_data.sort_values(by='totalBytes', ascending=False).reset_index(drop=True)
    columns_order_df2 = ['edgename', 'sourceIp', 'destIp', 'destPort', 'category', 'destDomain', 'segmentId', 'bytesRx', 'bytesTx', 'totalBytes', 'flowCount', 'linkName','route']
    df2 = df2[columns_order_df2]
    aggregate_metrics_data_sorted['bytesRx'] = aggregate_metrics_data_sorted['bytesRx'].apply(convert_bytes)
    aggregate_metrics_data_sorted['bytesTx'] = aggregate_metrics_data_sorted['bytesTx'].apply(convert_bytes)
    # Keep both raw and converted totalBytes for final dataframe
    aggregate_metrics_data_sorted['totalBytes_raw'] = aggregate_metrics_data_sorted['totalBytes']
    aggregate_metrics_data_sorted['totalBytes'] = aggregate_metrics_data_sorted['totalBytes'].apply(convert_bytes)
    columns_order_aggregate_metrics_data_sorted = ['name', 'categoryName', 'totalBytes','bytesRx', 'bytesTx', 'packetsRx', 'packetsTx', 'totalBytes_raw', 'flowCount']
    aggregate_metrics_data_sorted = aggregate_metrics_data_sorted[columns_order_aggregate_metrics_data_sorted]
    aggregate_metrics_data_sorted = aggregate_metrics_data_sorted[aggregate_metrics_data_sorted['name'] != 'Unknown virtual protocol']
    aggregate_metrics_data_sorted = aggregate_metrics_data_sorted.drop(columns=['packetsRx','packetsTx'])
    df['bytesRx'] = df['bytesRx'].apply(convert_bytes)
    df['bytesTx'] = df['bytesTx'].apply(convert_bytes)
    df['totalBytes_raw'] = df['totalBytes']
    df['totalBytes'] = df['totalBytes'].apply(convert_bytes)
    df = df.drop(columns=['packetsRx','packetsTx','totalPackets'])
    columns_order = ['edgename', 'name', 'categoryName', 'totalBytes','bytesRx', 'bytesTx', 'flowCount', 'totalBytes_raw']
    df = df[columns_order]
    pd.set_option('display.max_rows', None)
    pd.set_option('display.max_columns', None)
    top_talkers_gaming = df2.groupby(['sourceIp'])[['bytesRx', 'bytesTx', 'totalBytes']].sum().reset_index().sort_values(by='totalBytes', ascending=False)
    top_talkers_gaming['bytesRx'] = top_talkers_gaming['bytesRx'].apply(convert_bytes)
    top_talkers_gaming['bytesTx'] = top_talkers_gaming['bytesTx'].apply(convert_bytes)
    top_talkers_gaming['totalBytes_raw'] = top_talkers_gaming['totalBytes']
    top_talkers_gaming['totalBytes'] = top_talkers_gaming['totalBytes'].apply(convert_bytes)

    top_destination_gaming = df2.groupby(['destDomain'])[['bytesRx', 'bytesTx', 'totalBytes']].sum().reset_index().sort_values(by='totalBytes', ascending=False)
    top_destination_gaming['bytesRx'] = top_destination_gaming['bytesRx'].apply(convert_bytes)
    top_destination_gaming['bytesTx'] = top_destination_gaming['bytesTx'].apply(convert_bytes)
    # Keep both raw and converted totalBytes for top_destination_gaming
    top_destination_gaming['totalBytes_raw'] = top_destination_gaming['totalBytes']
    top_destination_gaming['totalBytes'] = top_destination_gaming['totalBytes'].apply(convert_bytes)

    # Sort All Gaming Flows by totalBytes descending and apply convert_bytes
    df2 = df2.sort_values(by='totalBytes', ascending=False).reset_index(drop=True)
    df2['bytesRx'] = df2['bytesRx'].apply(convert_bytes)
    df2['bytesTx'] = df2['bytesTx'].apply(convert_bytes)
    df2['totalBytes'] = df2['totalBytes'].apply(convert_bytes)

    output = BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        # Overview tab with 3 pivot charts (make this the first sheet)
        workbook = writer.book
        overview = workbook.add_worksheet('Overview')
        overview.set_tab_color('#B7DEE8')  # Light blue tab

        # Light blue background for the sheet
        blue_bg = workbook.add_format({'bg_color': '#B7DEE8'})
        overview.set_default_row(20)
        overview.set_column(0, 10, 30, blue_bg)

        # Helper to convert bytes to megabytes
        def bytes_to_mb(val):
            try:
                return round(val / (1024 * 1024), 2)
            except Exception:
                return 0

        # Top Applications Pivot Chart
        chart1 = workbook.add_chart({'type': 'bar'})
        chart1.set_title({'name': 'Top 15 Applications'})
        chart1.set_style(2)
        chart1.set_plotarea({'fill': {'color': '#B7DEE8'}})
        top_apps = aggregate_metrics_data_sorted.sort_values('totalBytes_raw', ascending=False).head(15).copy()
        top_apps['totalMegaBytes'] = top_apps['totalBytes_raw'].apply(bytes_to_mb)
        hidden_apps = workbook.add_worksheet('PivotApps')
        hidden_apps.hide()
        hidden_apps.write_row(0, 0, ['name', 'totalMegaBytes'])
        for i, row in enumerate(top_apps[['name', 'totalMegaBytes']].values):
            hidden_apps.write_row(i+1, 0, row)
        # Set correct ranges for categories and values
        chart1.add_series({
            'name': 'Total MegaBytes',
            'categories': f'=PivotApps!$A$2:$A$16',
            'values': f'=PivotApps!$B$2:$B$16',
            'fill': {'color': '#4F81BD'}
        })
        chart1.set_size({'width': 960, 'height': 720})
        chart1.set_x_axis({'name': 'Total MegaBytes'})
        chart1.set_y_axis({'name': 'Application Name'})
        overview.insert_chart('A2', chart1, {'x_offset': 10, 'y_offset': 10})

        # Top Talkers Gaming Pivot Chart
        chart2 = workbook.add_chart({'type': 'bar'})
        chart2.set_title({'name': 'Top Talkers Gaming'})
        chart2.set_style(2)
        chart2.set_plotarea({'fill': {'color': '#B7DEE8'}})
        top_talkers = top_talkers_gaming.sort_values('totalBytes_raw', ascending=False).head(15).copy()
        top_talkers['totalMegaBytes'] = top_talkers['totalBytes_raw'].apply(bytes_to_mb)
        hidden_talkers = workbook.add_worksheet('PivotTalkers')
        hidden_talkers.hide()
        hidden_talkers.write_row(0, 0, ['sourceIp', 'totalMegaBytes'])
        for i, row in enumerate(top_talkers[['sourceIp', 'totalMegaBytes']].values):
            hidden_talkers.write_row(i+1, 0, row)
        chart2.add_series({
            'name': 'Total MegaBytes',
            'categories': f'=PivotTalkers!$A$2:$A$16',
            'values': f'=PivotTalkers!$B$2:$B$16',
            'fill': {'color': '#4F81BD'}
        })
        chart2.set_x_axis({'name': 'Total MegaBytes'})
        chart2.set_y_axis({'name': 'Source IP'})
        chart2.set_size({'width': 960, 'height': 720})
        overview.insert_chart('A32', chart2, {'x_offset': 10, 'y_offset': 10})

        # Top Destination Gaming Pivot Chart
        chart3 = workbook.add_chart({'type': 'bar'})
        chart3.set_title({'name': 'Top Destination Gaming'})
        chart3.set_style(2)
        chart3.set_plotarea({'fill': {'color': '#B7DEE8'}})
        top_dest = top_destination_gaming.sort_values('totalBytes_raw', ascending=False).head(15).copy()
        top_dest['totalMegaBytes'] = top_dest['totalBytes_raw'].apply(bytes_to_mb)
        hidden_dest = workbook.add_worksheet('PivotDest')
        hidden_dest.hide()
        hidden_dest.write_row(0, 0, ['destDomain', 'totalMegaBytes'])
        for i, row in enumerate(top_dest[['destDomain', 'totalMegaBytes']].values):
            hidden_dest.write_row(i+1, 0, row)
        chart3.add_series({
            'name': 'Total MegaBytes',
            'categories': f'=PivotDest!$A$2:$A$16',
            'values': f'=PivotDest!$B$2:$B$16',
            'fill': {'color': '#4F81BD'}
        })
        chart3.set_x_axis({'name': 'Total MegaBytes'})
        chart3.set_size({'width': 960, 'height': 720})
        chart3.set_y_axis({'name': 'Destination Domain'})
        overview.insert_chart('A62', chart3, {'x_offset': 10, 'y_offset': 10})

        # All Applications
        df.to_excel(writer, index=False, sheet_name='All Applications')
        worksheet = writer.sheets['All Applications']
        worksheet.add_table(0, 0, len(df), len(df.columns)-1, {
            'columns': [{'header': column_name} for column_name in df.columns],
            'style': 'Table Style Medium 9'
        })
        worksheet.set_column('A:C', 30)
        worksheet.set_column('D:K', 15)
        # Top Applications summary
        aggregate_metrics_data_sorted.to_excel(writer, index=False, sheet_name='Top Applications summary')
        worksheet3 = writer.sheets['Top Applications summary']
        worksheet3.add_table(0, 0, len(aggregate_metrics_data_sorted), len(aggregate_metrics_data_sorted.columns) - 1, {
            'columns': [{'header': column_name} for column_name in aggregate_metrics_data_sorted.columns],
            'style': 'Table Style Medium 9'
        })
        worksheet3.set_column('A:B', 30)
        worksheet3.set_column('C:K', 15)
        # All Gaming Flows
        df2.to_excel(writer, index=False, sheet_name='All Gaming Flows')
        worksheet4 = writer.sheets['All Gaming Flows']
        worksheet4.add_table(0, 0, len(df2), len(df2.columns) - 1, {
            'columns': [{'header': column_name} for column_name in df2.columns],
            'style': 'Table Style Medium 9'
        })
        worksheet4.set_column('A:B', 30)
        worksheet4.set_column('C:K', 15)
        worksheet4.set_column('M:N', 35)
        # Top Talkers Gaming
        top_talkers_gaming.to_excel(writer, index=False, sheet_name='Top Talkers Gaming')
        worksheet5 = writer.sheets['Top Talkers Gaming']
        worksheet5.add_table(0, 0, len(top_talkers_gaming), len(top_talkers_gaming.columns) - 1, {
            'columns': [{'header': column_name} for column_name in top_talkers_gaming.columns],
            'style': 'Table Style Medium 9'
        })
        worksheet5.set_column('A:B', 30)
        worksheet5.set_column('C:K', 15)
        # Top Destination Gaming
        top_destination_gaming.to_excel(writer, index=False, sheet_name='Top Destination Gaming')
        worksheet6 = writer.sheets['Top Destination Gaming']
        worksheet6.add_table(0, 0, len(top_destination_gaming), len(top_destination_gaming.columns) - 1, {
            'columns': [{'header': column_name} for column_name in top_destination_gaming.columns],
            'style': 'Table Style Medium 9'
        })
        worksheet6.set_column('A:B', 30)
        worksheet6.set_column('C:K', 15)

    encoded_excel = b64encode(output.getvalue()).decode('utf-8')
    output.close()
    return encoded_excel
    
def ge5_flows_report(all_flows):
    """ report that provides simplified site list """

    # Create a DataFrame
    # Define only the required columns to keep
    required_columns = [
        'edgename', 'sourceIp', 'destIp', 'destPort', 'destDomain', 'route',
        'bytesRx', 'bytesTx', 'totalBytes', 'startTime'
    ]
    df = pd.DataFrame(all_flows)

    # Keep only the required columns (ignore missing columns gracefully)
    df = df[[col for col in required_columns if col in df.columns]]

    # Convert bytes columns to readable format
    for col in ['bytesRx', 'bytesTx', 'totalBytes']:
        if col in df.columns:
            df[col] = df[col].apply(convert_bytes)

    output = BytesIO()
    MAX_ROWS_PER_SHEET = 1048576
    num_rows = len(df)
    num_columns = len(df.columns)
    sheet_count = (num_rows // (MAX_ROWS_PER_SHEET - 1)) + 1

    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        for i in range(sheet_count):
            start_row = i * (MAX_ROWS_PER_SHEET - 1)
            end_row = min(start_row + (MAX_ROWS_PER_SHEET - 1), num_rows)
            df_chunk = df.iloc[start_row:end_row]
            sheet_name = f'GE5 Flows {i+1}' if sheet_count > 1 else 'GE5 Flows'
            df_chunk.to_excel(writer, index=False, sheet_name=sheet_name)
            worksheet = writer.sheets[sheet_name]
            worksheet.add_table(0, 0, len(df_chunk), num_columns - 1, {
                'columns': [{'header': column_name} for column_name in df.columns],
                'style': 'Table Style Medium 9'
            })
            worksheet.set_column(0, num_columns - 1, 20)
    encoded_excel = b64encode(output.getvalue()).decode('utf-8')
    output.close()
    return encoded_excel
  
def qoe_report(edge_list: list):
    """ report that provides qoe data per site """
    out_name = BytesIO()
    wbk = xlsxwriter.Workbook(out_name)
    siteinfo = wbk.add_worksheet('sites')
    data_source = [
        (['name'], 'hostname'),
        (['site', 'city'], 'city'),
        (['site', 'country'], 'country'),
        (['site', 'streetAddress'], 'address'),
        (['site', 'streetAddress2'], 'address2'),
        #overallquality
        (['n/a'], 'Overall offline'),
        (['n/a'], 'Overall Unknown'),
        (['n/a'], 'Overall red'),
        (['n/a'], 'Overall yellow'),
        (['n/a'], 'Overall green'),
        #link1quality
        (['n/a'], 'Link1 name'),
        (['n/a'], 'Link1 interface'),
        (['n/a'], 'Link1 IP'),
        (['n/a'], 'Link1 offline'),
        (['n/a'], 'Link1 Unknown'),
        (['n/a'], 'Link1 red'),
        (['n/a'], 'Link1 yellow'),
        (['n/a'], 'Link1 green'),
        #link2quality
        (['n/a'], 'Link2 name'),
        (['n/a'], 'Link2 interface'),
        (['n/a'], 'Link2 IP'),
        (['n/a'], 'Link2 offline'),
        (['n/a'], 'Link2 Unknown'),
        (['n/a'], 'Link2 red'),
        (['n/a'], 'Link2 yellow'),
        (['n/a'], 'Link2 green'),
        #link3quality
        (['n/a'], 'Link3 name'),
        (['n/a'], 'Link3 interface'),
        (['n/a'], 'Link3 IP'),
        (['n/a'], 'Link3 offline'),
        (['n/a'], 'Link3 Unknown'),
        (['n/a'], 'Link3 red'),
        (['n/a'], 'Link3 yellow'),
        (['n/a'], 'Link3 green'),
    ]
    # Create header
    for index, header_data in enumerate(data_source):
        siteinfo.write(0, index, header_data[1])
    # write data
    linenum = 1
    for edge in edge_list:
        #loop through links will write data...
        linkcount=0
        if "links" in edge and edge["link_qoe"]:
            for link in edge["links"]:
                if "overallLinkQuality" in edge["link_qoe"]:
                    for index, item in enumerate(data_source):
                        if item[1] == "Overall offline":
                            siteinfo.write(
                                linenum,
                                index,
                                edge["link_qoe"]["overallLinkQuality"][
                                    "distribution"]["0"]["0"]*100)
                        elif item[1] == "Overall Unknown":
                            siteinfo.write(
                                linenum,
                                index,
                                edge["link_qoe"]["overallLinkQuality"][
                                    "distribution"]["0"]["1"]*100)
                        elif item[1] == "Overall red":
                            siteinfo.write(
                                linenum,
                                index,
                                edge["link_qoe"]["overallLinkQuality"][
                                    "distribution"]["0"]["2"]*100)
                        elif item[1] == "Overall yellow":
                            siteinfo.write(
                                linenum,
                                index,
                                edge["link_qoe"]["overallLinkQuality"][
                                    "distribution"]["0"]["3"]*100)
                        elif item[1] == "Overall green":
                            siteinfo.write(
                                linenum,
                                index,
                                edge["link_qoe"]["overallLinkQuality"][
                                    "distribution"]["0"]["4"]*100)
                        elif item[0][0] == "n/a":
                            continue
                        else:
                            siteinfo.write(linenum, index, dotted_key_list(edge, item[0]))
                if link["internalId"] in edge["link_qoe"]:
                    #link 1 data
                    if linkcount == 0:
                        for index, item in enumerate(data_source):
                            if item[1] == "Link1 offline":
                                siteinfo.write(
                                    linenum,
                                    index,
                                    edge["link_qoe"][link["internalId"]][
                                        "distribution"]["0"]["0"]*100)
                            elif item[1] == "Link1 name":
                                siteinfo.write(
                                    linenum,
                                    index,
                                    link["displayName"])
                            elif item[1] == "Link1 interface":
                                siteinfo.write(
                                    linenum,
                                    index,
                                    link["interface"])
                            elif item[1] == "Link1 IP":
                                siteinfo.write(
                                    linenum,
                                    index,
                                    link["ipAddress"])
                            elif item[1] == "Link1 Unknown":
                                siteinfo.write(
                                    linenum,
                                    index,
                                    edge["link_qoe"][link["internalId"]][
                                        "distribution"]["0"]["1"]*100)
                            elif item[1] == "Link1 red":
                                siteinfo.write(
                                    linenum,
                                    index,
                                    edge["link_qoe"][link["internalId"]][
                                        "distribution"]["0"]["2"]*100)
                            elif item[1] == "Link1 yellow":
                                siteinfo.write(
                                    linenum,
                                    index,
                                    edge["link_qoe"][link["internalId"]][
                                        "distribution"]["0"]["3"]*100)
                            elif item[1] == "Link1 green":
                                siteinfo.write(
                                    linenum,
                                    index,
                                    edge["link_qoe"][link["internalId"]][
                                        "distribution"]["0"]["4"]*100)
                            else:
                                continue
                    elif linkcount == 1:
                        #link2 data
                        for index, item in enumerate(data_source):
                            if item[1] == "Link2 name":
                                siteinfo.write(
                                    linenum,
                                    index,
                                    link["displayName"])
                            elif item[1] == "Link2 interface":
                                siteinfo.write(
                                    linenum,
                                    index,
                                    link["interface"])
                            elif item[1] == "Link2 IP":
                                siteinfo.write(
                                    linenum,
                                    index,
                                    link["ipAddress"])
                            elif item[1] == "Link2 offline":
                                siteinfo.write(
                                    linenum,
                                    index,
                                    edge["link_qoe"][link["internalId"]][
                                        "distribution"]["0"]["0"]*100)
                            elif item[1] == "Link2 Unknown":
                                siteinfo.write(
                                    linenum,
                                    index,
                                    edge["link_qoe"][link["internalId"]][
                                        "distribution"]["0"]["1"]*100)
                            elif item[1] == "Link2 red":
                                siteinfo.write(
                                    linenum,
                                    index,
                                    edge["link_qoe"][link["internalId"]][
                                        "distribution"]["0"]["2"]*100)
                            elif item[1] == "Link2 yellow":
                                siteinfo.write(
                                    linenum,
                                    index,
                                    edge["link_qoe"][link["internalId"]][
                                        "distribution"]["0"]["3"]*100)
                            elif item[1] == "Link2 green":
                                siteinfo.write(
                                    linenum,
                                    index,
                                    edge["link_qoe"][link["internalId"]][
                                        "distribution"]["0"]["4"]*100)
                            else:
                                continue
                    elif linkcount == 2:
                        #link3 data
                        for index, item in enumerate(data_source):
                            if item[1] == "Link3 name":
                                siteinfo.write(
                                    linenum,
                                    index,
                                    link["displayName"])
                            elif item[1] == "Link3 interface":
                                siteinfo.write(
                                    linenum,
                                    index,
                                    link["interface"])
                            elif item[1] == "Link3 IP":
                                siteinfo.write(
                                    linenum,
                                    index,
                                    link["ipAddress"])
                            elif item[1] == "Link3 offline":
                                siteinfo.write(
                                    linenum,
                                    index,
                                    edge["link_qoe"][link["internalId"]][
                                        "distribution"]["0"]["0"]*100)
                            elif item[1] == "Link3 Unknown":
                                siteinfo.write(
                                    linenum,
                                    index,
                                    edge["link_qoe"][link["internalId"]][
                                        "distribution"]["0"]["1"]*100)
                            elif item[1] == "Link3 red":
                                siteinfo.write(
                                    linenum,
                                    index,
                                    edge["link_qoe"][link["internalId"]][
                                        "distribution"]["0"]["2"]*100)
                            elif item[1] == "Link3 yellow":
                                siteinfo.write(
                                    linenum,
                                    index,
                                    edge["link_qoe"][link["internalId"]][
                                        "distribution"]["0"]["3"]*100)
                            elif item[1] == "Link3 green":
                                siteinfo.write(
                                    linenum,
                                    index,
                                    edge["link_qoe"][link["internalId"]][
                                        "distribution"]["0"]["4"]*100)
                            else:
                                continue
                    else:
                        continue
                    linkcount += 1
            linenum+=1
    header = [{'header': di[1]} for di in data_source]
    siteinfo.add_table(0,0,linenum - 1, len(data_source) -1 ,{'columns':header})
    siteinfo.freeze_panes(1, 1)
    wbk.close()
    out_name.seek(0)
    return b64encode(out_name.read()).decode()

def link_report(edge_list: list):
    """ report that provides site list with utilizations """
    out_name = BytesIO()
    wbk = xlsxwriter.Workbook(out_name)
    siteinfo = wbk.add_worksheet('sites')
    linenum = 1
    data_source = [
        (['site', 'city'], 'city'),
        (['site', 'state'], 'state'),
        (['site', 'streetAddress'], 'street'),
        (['name'], 'name'),
        (['serviceState'], 'Service State'),
        (['activationTime'], 'Activation Time'),
        (['serialNumber'], 'serial'),
        (['edgeState'], 'edgestate'),
        (['modelNumber'], 'model'),
        (['site', 'postalCode'], 'zipcode'),
        (['haSerialNumber'], 'HA'),
        (['n/a'], 'link#1 name'),
        (['n/a'], 'QOE link#1'),
        (['n/a'], 'link#2 name'),
        (['n/a'], 'QOE link#2'),
        (['n/a'], 'link#3 name'),
        (['n/a'], 'QOE link#3'),
        (['n/a'], 'link#4 name'),
        (['n/a'], 'QOE link#4'),
        (['n/a'], 'QOE overall'),
        (['n/a'], 'avg CPU'),
        (['n/a'], 'peak CPU'),
        (['n/a'], 'avg tunnels'),
        (['n/a'], 'peak tunnels'),
        (['n/a'], 'avg memory'),
        (['n/a'], 'peak memory'),
        (['n/a'], 'avg flows'),
        (['n/a'], 'peak flows'),
        (['n/a'], 'queue drops'),
        (['n/a'], 'avg wan util up'),
        (['n/a'], 'avg wan util down'),
        (['n/a'], 'peak wan util up'),
        (['n/a'], 'peak wan util down'),
        (['n/a'], 'conf wan util up'),
        (['n/a'], 'conf wan util down')
    ]
    # Create header
    for index, header_data in enumerate(data_source):
        siteinfo.write(0, index, header_data[1])
    # Data insert
    format1 = wbk.add_format({'bg_color': '#FFC7CE','font_color': '#9C0006'})
    for edge in edge_list:
        links = {}
        linkcount = 0
        if "qoe" in edge and "links" in edge:
            for link in edge["links"]:
                if link["internalId"] in edge["qoe"]:
                    links[linkcount] = {
                        "quality": edge["qoe"][link["internalId"]]["totalScore"],
                        "name": link["displayName"]}
                    linkcount += 1
        else:
            continue
        for index, item in enumerate(data_source):
            if item[0] == ["haSerialNumber"]:
                if edge['haState'] == "UNCONFIGURED":
                    siteinfo.write(linenum, index, "")
                else:
                    siteinfo.write(linenum, index, dotted_key_list(
                        edge, item[0]))
            elif item[0] == ["name"]:
                original_string = edge["name"]
                characters_to_remove = "[]:*?/\\"
                new_hostname = original_string
                for character in characters_to_remove:
                    new_hostname = new_hostname.replace(character, "")
                wbk.add_worksheet(new_hostname)
                siteinfo.write_url(linenum, index,
                                   "internal:'" + new_hostname + "'!A1")
            elif item[1] == "QOE overall":
                if "qoe" in edge:
                    if "overallLinkQuality" in edge["qoe"]:
                        siteinfo.write(linenum, index,
                                        edge["qoe"][
                                            "overallLinkQuality"][
                                                "totalScore"])
                    else:
                        siteinfo.write(linenum, index,"0")
            elif item[1] == "link#1 name":
                if linkcount > 0:
                    siteinfo.write(linenum, index,links[0]["name"])
            elif item[1] == "QOE link#1":
                if linkcount > 0:
                    siteinfo.write(linenum, index,links[0]["quality"])
            elif item[1] == "link#2 name":
                if linkcount > 1:
                    siteinfo.write(linenum, index,links[1]["name"])
            elif item[1] == "QOE link#2":
                if linkcount > 1:
                    siteinfo.write(linenum, index,links[1]["quality"])
            elif item[1] == "link#3 name":
                if linkcount > 2:
                    siteinfo.write(linenum, index,links[2]["name"])
            elif item[1] == "QOE link#3":
                if linkcount > 2:
                    siteinfo.write(linenum, index,links[2]["quality"])
            elif item[1] == "link#4 name":
                if linkcount > 3:
                    siteinfo.write(linenum, index,links[3]["name"])
            elif item[1] == "QOE link#4":
                if linkcount > 3:
                    siteinfo.write(linenum, index,links[3]["quality"])
            elif item[1] == "avg CPU":
                edge["l_cpu"] = {"row": linenum,"col": index}
            elif item[1] == "avg tunnels":
                edge["l_tunnels"] = {"row": linenum,"col": index}
            elif item[1] == "avg flows":
                edge["l_flows"] = {"row": linenum,"col": index}
            elif item[1] == "avg memory":
                edge["l_memory"] = {"row": linenum,"col": index}
            elif item[1] == "peak memory":
                edge["l_memory_peak"] = {"row": linenum,"col": index}
            elif item[1] == "peak CPU":
                edge["l_cpu_peak"] = {"row": linenum,"col": index}
            elif item[1] == "peak tunnels":
                edge["l_tunnels_peak"] = {"row": linenum,"col": index}
            elif item[1] == "peak flows":
                edge["l_flows_peak"] = {"row": linenum,"col": index}
            elif item[1] == "avg wan util up":
                edge["l_wutil_up"] = {"row": linenum,"col": index}
            elif item[1] == "avg wan util down":
                edge["l_wutil_down"] = {"row": linenum,"col": index}
            elif item[1] == "queue drops":
                edge["l_queue"] = {"row": linenum,"col": index}
            elif item[1] == "peak wan util up":
                edge["l_wanpeak_up"] = {"row": linenum,"col": index}
            elif item[1] == "peak wan util down":
                edge["l_wanpeak_dn"] = {"row": linenum,"col": index}
            elif item[1] == "conf wan util up":
                edge["l_wanconf_up"] = {"row": linenum,"col": index}
            elif item[1] == "conf wan util down":
                edge["l_wanconf_down"] = {"row": linenum,"col": index}
            elif item[0] == ["n/a"]:
                continue
            else:
                siteinfo.write(linenum, index, dotted_key_list(edge, item[0]))
        linenum += 1
    # each tab
    data_ws = wbk.add_worksheet("data")
    data_ws.hide()
    dt_ws_col = 0
    date_format = wbk.add_format({'num_format': 'yyyy-mm-dd hh:mm:ss'})
    charts = []
    chart_count = 0
    for edge in edge_list:
        original_string = edge["name"]
        new_hostname = original_string
        for character in characters_to_remove:
            new_hostname = new_hostname.replace(character, "")
        ws1 = wbk.get_worksheet_by_name(new_hostname)
        # fill all relevant data into hiddensheet
        numlinks = 0
        if "link_s" in edge:
            #for each wan link
            for wlink in edge["link_s"]:
                # create X axis for time
                charts.append(wbk.add_chart({'type': 'line'}))
                charts.append(wbk.add_chart({'type': 'line'}))
                charts.append(wbk.add_chart({'type': 'line'}))
                charts.append(wbk.add_chart({'type': 'line'}))
                data_ws.write(0, dt_ws_col, new_hostname + " " + wlink[
                    "link"]["displayName"])
                data_ws.write(1, dt_ws_col, "timeline")
                # chart#1 wan links chart
                charts[chart_count].set_title({'name': 'Link ' + wlink[
                    "link"]["displayName"]})
                charts[chart_count].set_x_axis({'name': 'Timeline',
                                        'text_axis': True,
                                        'minor_unit': 1,
                                        'major_unit': 2})
                charts[chart_count].set_y_axis({'name': 'Mbps'})
                charts[chart_count].set_size({'width': 850, 'height': 545})
                # chart#2 wan links chart
                charts[chart_count + 1].set_title({'name': 'Link ' + wlink[
                    "link"]["displayName"]})
                charts[chart_count + 1].set_x_axis({'name': 'Timeline',
                                        'text_axis': True,
                                        'minor_unit': 1,
                                        'major_unit': 2})
                charts[chart_count + 1].set_y_axis({'name': 'packets'})
                charts[chart_count + 1].set_size({'width': 850, 'height': 545})
                # chart#3 wan links chart
                charts[chart_count + 2].set_title({'name': 'Link ' + wlink[
                    "link"]["displayName"]})
                charts[chart_count + 2].set_x_axis({'name': 'Timeline',
                                        'text_axis': True,
                                        'minor_unit': 1,
                                        'major_unit': 2})
                charts[chart_count + 2].set_y_axis({'name': 'ms'})
                charts[chart_count + 2].set_size({'width': 850, 'height': 545})
                # chart#4 wan links chart
                charts[chart_count + 3].set_title({'name': 'Link ' + wlink[
                    "link"]["displayName"]})
                charts[chart_count + 3].set_x_axis({'name': 'Timeline',
                                        'text_axis': True,
                                        'minor_unit': 1,
                                        'major_unit': 2})
                charts[chart_count + 3].set_y_axis({'name': 'ms'})
                charts[chart_count + 3].set_size({'width': 850, 'height': 545})
                col_len = len(wlink["series"][0]["data"])
                tickinterval = (datetime.fromtimestamp(wlink["series"][0][
                    "tickInterval"]) -
                                datetime.fromtimestamp(0)).total_seconds()
                tickinterval = tickinterval / 1000
                for i in range(col_len):
                    time = wlink[
                        "series"][0]["startTime"] + i * wlink[
                            "series"][0]["tickInterval"]
                    data_ws.write_datetime(2 + i,
                                        dt_ws_col,
                                        datetime.fromtimestamp(
                                            time / 1000),
                                        date_format)
                timecategory = xlsxwriter.utility.xl_range_abs(
                    2, dt_ws_col,
                    col_len + 2,
                    dt_ws_col)
                dt_ws_col += 1
                for series in wlink["series"]:
                    data_ws.write(0, dt_ws_col, new_hostname + " " + wlink[
                        "link"]["displayName"])
                    data_ws.write(1, dt_ws_col, series["metric"])
                    if series[
                        "metric"] == "bytesRx" or series[
                            "metric"] == "bytesTx":
                        for index, item in enumerate(series["data"]):
                            if series["data"][index] is None:
                                series["data"][index] = 0
                            else:
                                series["data"][index] = (series[
                                    "data"][index] / 1000000) * 8 /(tickinterval)
                        data_ws.write_column(2, dt_ws_col, series["data"])
                        seriesname = xlsxwriter.utility.xl_rowcol_to_cell(
                            1, dt_ws_col, row_abs=True, col_abs=True)
                        values = xlsxwriter.utility.xl_range_abs(
                            2, dt_ws_col,
                            col_len + 2,
                            dt_ws_col)
                        charts[chart_count].add_series({
                            'name':       '=data!' + seriesname,
                            'categories': '=data!' + timecategory,
                            'values':     '=data!' + values})
                        if series["metric"] == "bytesRx":
                            if "xlrng" in edge["l_wutil_down"]:
                                edge["l_wutil_down"][
                                    "xlrng"
                                    ] = f'{edge["l_wutil_down"]["xlrng"]}+ \'data\'!{values}'
                                edge["l_wanpeak_dn"]["xlrng"] = f'{edge["l_wanpeak_dn"]["xlrng"]}'\
                                    f'+\'data\'!{values}'
                            else:
                                edge["l_wutil_down"]["xlrng"] = values
                                edge["l_wanpeak_dn"]["xlrng"] = values
                            siteinfo.write_formula(
                                edge["l_wutil_down"]["row"],
                                edge["l_wutil_down"]["col"],
                                f'{{=AVERAGE(\'data\'!{edge["l_wutil_down"]["xlrng"]})}}')
                            siteinfo.write_formula(
                                edge["l_wanpeak_dn"]["row"],
                                edge["l_wanpeak_dn"]["col"],
                                f'{{=MAX(\'data\'!{edge["l_wanpeak_dn"]["xlrng"]})}}')
                        else:
                            if "xlrng" in edge["l_wutil_up"]:
                                edge["l_wutil_up"]["xlrng"] = f'{edge["l_wutil_up"]["xlrng"]}+'\
                                    f' \'data\'!{values}'
                                edge["l_wanpeak_up"]["xlrng"] = f'{edge["l_wanpeak_up"]["xlrng"]}+'\
                                    f'\'data\'!{values}'
                            else:
                                edge["l_wutil_up"]["xlrng"] = values
                                edge["l_wanpeak_up"]["xlrng"] = values
                            siteinfo.write_formula(
                                edge["l_wutil_up"]["row"],
                                edge["l_wutil_up"]["col"],
                                f'{{=AVERAGE(\'data\'!{edge["l_wutil_up"]["xlrng"]})}}')
                            siteinfo.write_formula(
                                edge["l_wanpeak_up"]["row"],
                                edge["l_wanpeak_up"]["col"],
                                f'{{=MAX(\'data\'!{edge["l_wanpeak_up"]["xlrng"]})}}')
                    elif series[
                        "metric"] == "bestLossPctRx" or series[
                            "metric"] == "bestLossPctTx":
                        for index, item in enumerate(series["data"]):
                            if series["data"][index] is None:
                                series["data"][index] = 0
                            else:
                                item = item / 1000
                        data_ws.write_column(2, dt_ws_col, series["data"])
                        seriesname = xlsxwriter.utility.xl_rowcol_to_cell(
                            1, dt_ws_col, row_abs=True, col_abs=True)
                        values = xlsxwriter.utility.xl_range_abs(
                            2, dt_ws_col,
                            col_len + 2,
                            dt_ws_col)
                        charts[chart_count + 1].add_series({
                            'name':       '=data!' + seriesname,
                            'categories': '=data!' + timecategory,
                            'values':     '=data!' + values})
                    elif series[
                        "metric"] == "bestLatencyMsRx" or series[
                            "metric"] == "bestLatencyMsTx":
                        data_ws.write_column(2, dt_ws_col, series["data"])
                        seriesname = xlsxwriter.utility.xl_rowcol_to_cell(
                            1, dt_ws_col, row_abs=True, col_abs=True)
                        values = xlsxwriter.utility.xl_range_abs(
                            2, dt_ws_col,
                            col_len + 2,
                            dt_ws_col)
                        charts[chart_count + 2].add_series({
                            'name':       '=data!' + seriesname,
                            'categories': '=data!' + timecategory,
                            'values':     '=data!' + values})
                    elif series[
                        "metric"] == "bestJitterMsRx" or series[
                            "metric"] == "bestJitterMsTx":
                        data_ws.write_column(2, dt_ws_col, series["data"])
                        seriesname = xlsxwriter.utility.xl_rowcol_to_cell(
                            1, dt_ws_col, row_abs=True, col_abs=True)
                        values = xlsxwriter.utility.xl_range_abs(
                            2, dt_ws_col,
                            col_len + 2,
                            dt_ws_col)
                        charts[chart_count + 3].add_series({
                            'name':       '=data!' + seriesname,
                            'categories': '=data!' + timecategory,
                            'values':     '=data!' + values})
                    elif series["metric"] == "bpsOfBestPathTx":
                        if "wanconfig" in edge and "links" in edge["wanconfig"]["data"]:
                            for link in edge["wanconfig"]["data"]["links"]:
                                if link["internalId"] == wlink["link"]["internalId"]:
                                    speed = 0
                                    if link["upstreamMbps"] is not None:
                                        if "speed" in edge["l_wanconf_up"]:
                                            edge["l_wanconf_up"][
                                                "speed"] += int(link["upstreamMbps"])
                                        else:
                                            edge["l_wanconf_up"][
                                                "speed"] = int(link["upstreamMbps"])
                                    else:
                                        speed = (int(series["max"]) + int(series["min"])) / 2000000
                                        if "speed" in edge["l_wanconf_up"]:
                                            edge["l_wanconf_up"]["speed"] += speed
                                        else:
                                            edge["l_wanconf_up"]["speed"] = speed
                                    siteinfo.write(
                                        edge["l_wanconf_up"]["row"],
                                        edge["l_wanconf_up"]["col"],
                                        f'{edge["l_wanconf_up"]["speed"]}')
                    elif series["metric"] == "bpsOfBestPathRx":
                        if "wanconfig" in edge and "links" in edge["wanconfig"]["data"]:
                            for link in edge["wanconfig"]["data"]["links"]:
                                if link["internalId"] == wlink["link"]["internalId"]:
                                    speed = 0
                                    if link["downstreamMbps"] is not None:
                                        if "speed" in edge["l_wanconf_down"]:
                                            edge["l_wanconf_down"][
                                                "speed"] += int(link["downstreamMbps"])
                                        else:
                                            edge["l_wanconf_down"][
                                                "speed"] = int(link["downstreamMbps"])
                                    else:
                                        speed = int((int(series[
                                            "max"]) + int(series["min"])) / 2000000)
                                        if "speed" in edge["l_wanconf_down"]:
                                            edge["l_wanconf_down"]["speed"] += speed
                                        else:
                                            edge["l_wanconf_down"]["speed"] = speed
                                    siteinfo.write(
                                        edge["l_wanconf_down"]["row"],
                                        edge["l_wanconf_down"]["col"],
                                        f'{edge["l_wanconf_down"]["speed"]}')
                    dt_ws_col += 1
                #charts from edge wan utilization
                ws1.insert_chart(1 + 30 * numlinks ,0, charts[chart_count])
                ws1.insert_chart(1 + 30 * numlinks ,15, charts[chart_count + 1])
                ws1.insert_chart(1 + 30 * numlinks ,30, charts[chart_count + 2])
                ws1.insert_chart(1 + 30 * numlinks ,45, charts[chart_count + 3])
                ws1.write_url(0, 0,"internal:'sites'!A1")
                chart_count += 4
                numlinks +=1
        #edge status pain
        if "stat" in edge:
            #headers
            data_ws.write(0, dt_ws_col, new_hostname)
            data_ws.write(1, dt_ws_col, "timeline for stats")
            data_ws.write(0, dt_ws_col + 1, new_hostname)
            data_ws.write(1, dt_ws_col + 1, "tunnel count ipv4")
            data_ws.write(0, dt_ws_col + 2, new_hostname)
            data_ws.write(1, dt_ws_col + 2, "tunnel count ipv6")
            data_ws.write(0, dt_ws_col + 3, new_hostname)
            data_ws.write(1, dt_ws_col + 3, "memmory percent")
            data_ws.write(0, dt_ws_col + 4, new_hostname)
            data_ws.write(1, dt_ws_col + 4, "flow count")
            data_ws.write(0, dt_ws_col + 5, new_hostname)
            data_ws.write(1, dt_ws_col + 5, "cpu percent")
            data_ws.write(0, dt_ws_col + 6, new_hostname)
            data_ws.write(1, dt_ws_col + 6, "handoff queue drop")
            i = 0
            col_len = len(edge["stat"]["series"])
            for series in edge["stat"]["series"]:
                date_temp = series["startTime"].strip("Z")
                data_ws.write_datetime(
                    2 + i,
                    dt_ws_col,
                    datetime.fromisoformat(date_temp),
                    date_format)
                data_ws.write(
                    2 + i,
                    dt_ws_col + 1,
                    series["tunnelCount"]
                    )
                data_ws.write(
                    2 + i,
                    dt_ws_col + 2,
                    series["tunnelCountV6"]
                    )
                data_ws.write(
                    2 + i,
                    dt_ws_col + 3,
                    series["memoryPct"]
                    )
                data_ws.write(
                    2 + i,
                    dt_ws_col + 4,
                    series["flowCount"]
                    )
                data_ws.write(
                    2 + i,
                    dt_ws_col + 5,
                    series["cpuPct"]
                    )
                data_ws.write(
                    2 + i,
                    dt_ws_col + 6,
                    series["handoffQueueDrops"]
                    )
                i += 1
            #doing charts here...5x
            timestatus = xlsxwriter.utility.xl_range_abs(
                2, dt_ws_col,
                col_len + 2,
                dt_ws_col)
            dt_ws_col += 1
            #tunnel count chart
            charts.append(wbk.add_chart({'type': 'line', 'subtype': 'stacked'}))
            charts[chart_count].set_title({'name': 'Tunnels'})
            charts[chart_count].set_x_axis({'name': 'Timeline',
                                    'text_axis': True,
                                    'minor_unit': 1,
                                    'major_unit': 2})
            charts[chart_count].set_y_axis({'name': 'tunnels'})
            charts[chart_count].set_size({'width': 850, 'height': 545})
            values = xlsxwriter.utility.xl_range_abs(
                2, dt_ws_col,
                col_len + 2,
                dt_ws_col)
            charts[chart_count].add_series({
                'name':       'Tunnels ipv4',
                'categories': '=data!' + timestatus,
                'values':     '=data!' + values})
            edge["l_tunnels"]["xlrng"] = values
            edge["l_tunnels_peak"]["xlrng"] = values
            dt_ws_col += 1
            values = xlsxwriter.utility.xl_range_abs(
                2, dt_ws_col,
                col_len + 2,
                dt_ws_col)
            charts[chart_count].add_series({
                'name':       'Tunnels ipv6',
                'categories': '=data!' + timestatus,
                'values':     '=data!' + values})
            edge["l_tunnels"][
                "xlrng"] = f'{edge["l_tunnels"]["xlrng"]}+ \'data\'!{values}'
            edge["l_tunnels_peak"][
                "xlrng"
                ] = f'{edge["l_tunnels_peak"]["xlrng"]}+\'data\'!{values}'
            siteinfo.write_formula(
                edge["l_tunnels"]["row"],
                edge["l_tunnels"]["col"],
                f'{{=AVERAGE(\'data\'!{edge["l_tunnels"]["xlrng"]})}}')
            siteinfo.write_formula(
                edge["l_tunnels_peak"]["row"],
                edge["l_tunnels_peak"]["col"],
                f'{{=MAX(\'data\'!{edge["l_tunnels_peak"]["xlrng"]})}}')
            #memory % graph
            dt_ws_col += 1
            charts.append(wbk.add_chart({'type': 'line'}))
            charts[chart_count + 1].set_title({'name': 'Memory utilization'})
            charts[chart_count + 1].set_x_axis({'name': 'Timeline',
                                    'text_axis': True,
                                    'minor_unit': 1,
                                    'major_unit': 2})
            charts[chart_count + 1].set_y_axis({'name': 'percent'})
            charts[chart_count + 1].set_size({'width': 850, 'height': 545})
            values = xlsxwriter.utility.xl_range_abs(
                2, dt_ws_col,
                col_len + 2,
                dt_ws_col)
            charts[chart_count + 1].add_series({
                'name':       'utilization',
                'categories': '=data!' + timestatus,
                'values':     '=data!' + values})
            siteinfo.write_formula(
                edge["l_memory"]["row"],
                edge["l_memory"]["col"],
                f'{{=AVERAGE(\'data\'!{values})}}')
            siteinfo.write_formula(
                edge["l_memory_peak"]["row"],
                edge["l_memory_peak"]["col"],
                f'{{=MAX(\'data\'!{values})}}')
            # flow count
            dt_ws_col += 1
            charts.append(wbk.add_chart({'type': 'line'}))
            charts[chart_count + 2].set_title({'name': 'Flow count'})
            charts[chart_count + 2].set_x_axis({'name': 'Timeline',
                                    'text_axis': True,
                                    'minor_unit': 1,
                                    'major_unit': 2})
            charts[chart_count + 2].set_y_axis({'name': 'flows'})
            charts[chart_count + 2].set_size({'width': 850, 'height': 545})
            values = xlsxwriter.utility.xl_range_abs(
                2, dt_ws_col,
                col_len + 2,
                dt_ws_col)
            charts[chart_count + 2].add_series({
                'name':       'flows',
                'categories': '=data!' + timestatus,
                'values':     '=data!' + values})
            siteinfo.write_formula(
                edge["l_flows"]["row"],
                edge["l_flows"]["col"],
                f'{{=AVERAGE(\'data\'!{values})}}')
            siteinfo.write_formula(
                edge["l_flows_peak"]["row"],
                edge["l_flows_peak"]["col"],
                f'{{=MAX(\'data\'!{values})}}')
            # cpu percent
            dt_ws_col += 1
            charts.append(wbk.add_chart({'type': 'line'}))
            charts[chart_count + 3].set_title({'name': 'CPU utilization'})
            charts[chart_count + 3].set_x_axis({'name': 'Timeline',
                                    'text_axis': True,
                                    'minor_unit': 1,
                                    'major_unit': 2})
            charts[chart_count + 3].set_y_axis({'name': 'percent'})
            charts[chart_count + 3].set_size({'width': 850, 'height': 545})
            values = xlsxwriter.utility.xl_range_abs(
                2, dt_ws_col,
                col_len + 2,
                dt_ws_col)
            charts[chart_count + 3].add_series({
                'name':       'utilization',
                'categories': '=data!' + timestatus,
                'values':     '=data!' + values})
            siteinfo.write_formula(
                edge["l_cpu"]["row"],
                edge["l_cpu"]["col"],
                f'{{=AVERAGE(\'data\'!{values})}}')
            siteinfo.write_formula(
                edge["l_cpu_peak"]["row"],
                edge["l_cpu_peak"]["col"],
                f'{{=MAX(\'data\'!{values})}}')
            #handoff queue drops
            dt_ws_col += 1
            charts.append(wbk.add_chart({'type': 'line'}))
            charts[chart_count + 4].set_title({'name': 'handoff queue drops'})
            charts[chart_count + 4].set_x_axis({'name': 'Timeline',
                                    'text_axis': True,
                                    'minor_unit': 1,
                                    'major_unit': 2})
            charts[chart_count + 4].set_y_axis({'name': 'drops'})
            charts[chart_count + 4].set_size({'width': 850, 'height': 545})
            values = xlsxwriter.utility.xl_range_abs(
                2, dt_ws_col,
                col_len + 2,
                dt_ws_col)
            charts[chart_count + 4].add_series({
                'name':       'queue drops',
                'categories': '=data!' + timestatus,
                'values':     '=data!' + values})
            siteinfo.write_formula(
                edge["l_queue"]["row"],
                edge["l_queue"]["col"],
                f'=(MAX(\'data\'!{values}) - MIN(\'data\'!{values}))/(COUNT(\'data\'!{values})-1)')
            ws1.insert_chart(1 + 30 * numlinks, 0, charts[chart_count])
            ws1.insert_chart(1 + 30 * numlinks, 15, charts[chart_count + 1])
            ws1.insert_chart(1 + 30 * numlinks, 30, charts[chart_count + 2])
            ws1.insert_chart(1 + 30 * numlinks, 45, charts[chart_count + 3])
            ws1.insert_chart(1 + 30 * numlinks, 60, charts[chart_count + 4])
            dt_ws_col += 1
            chart_count += 5
    for index, item in enumerate(data_source):
        if item[1] == ["avg flows"]:
            siteinfo.conditional_format(
                1, index, linenum - 1, index, {'type': 'cell',
                                               'criteria': '>=',
                                               'value': 4,
                                               'format': format1})
        else:
            continue
    header = [{'header': di[1]} for di in data_source]
    siteinfo.add_table(0,0,linenum - 1, len(data_source) -1 ,{'columns':header})
    siteinfo.freeze_panes(1, 4)
    wbk.close()
    out_name.seek(0)
    return b64encode(out_name.read()).decode()

def inventory_report(edge_list: list):
    """ report that provides device count """
    out_name = BytesIO()
    wbk = xlsxwriter.Workbook(out_name)
    siteinfo = wbk.add_worksheet('sites')
    data_source = [
        (['name'], 'hostname'),
        (['site', 'city'], 'city'),
        (['site', 'country'], 'country'),
        (['site', 'streetAddress'], 'address'),
        (['site', 'streetAddress2'], 'address2'),
        #overallquality
        (['n/a'], 'Overall offline'),
        (['n/a'], 'Overall Unknown'),
        (['n/a'], 'Overall red'),
        (['n/a'], 'Overall yellow'),
        (['n/a'], 'Overall green'),
        #link1quality
        (['n/a'], 'Link1 name'),
        (['n/a'], 'Link1 interface'),
        (['n/a'], 'Link1 IP'),
        (['n/a'], 'Link1 offline'),
        (['n/a'], 'Link1 Unknown'),
        (['n/a'], 'Link1 red'),
        (['n/a'], 'Link1 yellow'),
        (['n/a'], 'Link1 green'),
        #link2quality
        (['n/a'], 'Link2 name'),
        (['n/a'], 'Link2 interface'),
        (['n/a'], 'Link2 IP'),
        (['n/a'], 'Link2 offline'),
        (['n/a'], 'Link2 Unknown'),
        (['n/a'], 'Link2 red'),
        (['n/a'], 'Link2 yellow'),
        (['n/a'], 'Link2 green'),
    ]
    # Create header
    for index, header_data in enumerate(data_source):
        siteinfo.write(0, index, header_data[1])
    # write data
    linenum = 1
    for edge in edge_list:
        #loop through links will write data...
        linkcount=0
        if "links" in edge and edge["link_qoe"]:
            for link in edge["links"]:
                if "overallLinkQuality" in edge["link_qoe"]:
                    for index, item in enumerate(data_source):
                        if item[1] == "Overall offline":
                            siteinfo.write(
                                linenum,
                                index,
                                edge["link_qoe"]["overallLinkQuality"][
                                    "distribution"]["0"]["0"] * 100)
                        elif item[1] == "Overall Unknown":
                            siteinfo.write(
                                linenum,
                                index,
                                edge["link_qoe"]["overallLinkQuality"][
                                    "distribution"]["0"]["1"] * 100)
                        elif item[1] == "Overall red":
                            siteinfo.write(
                                linenum,
                                index,
                                edge["link_qoe"]["overallLinkQuality"][
                                    "distribution"]["0"]["2"] * 100)
                        elif item[1] == "Overall yellow":
                            siteinfo.write(
                                linenum,
                                index,
                                edge["link_qoe"]["overallLinkQuality"][
                                    "distribution"]["0"]["3"] * 100)
                        elif item[1] == "Overall green":
                            siteinfo.write(
                                linenum,
                                index,
                                edge["link_qoe"]["overallLinkQuality"][
                                    "distribution"]["0"]["4"] * 100)
                        elif item[0][0] == "n/a":
                            continue
                        else:
                            siteinfo.write(linenum, index, dotted_key_list(edge, item[0]))
                if link["internalId"] in edge["link_qoe"]:
                    #link 1 data
                    if linkcount == 0:
                        for index, item in enumerate(data_source):
                            if item[1] == "Link1 offline":
                                siteinfo.write(
                                    linenum,
                                    index,
                                    edge["link_qoe"][link["internalId"]][
                                        "distribution"]["0"]["0"] * 100)
                            elif item[1] == "Link1 name":
                                siteinfo.write(
                                    linenum,
                                    index,
                                    link["displayName"])
                            elif item[1] == "Link1 interface":
                                siteinfo.write(
                                    linenum,
                                    index,
                                    link["interface"])
                            elif item[1] == "Link1 IP":
                                siteinfo.write(
                                    linenum,
                                    index,
                                    link["ipAddress"])
                            elif item[1] == "Link1 Unknown":
                                siteinfo.write(
                                    linenum,
                                    index,
                                    edge["link_qoe"][link["internalId"]][
                                        "distribution"]["0"]["1"] * 100)
                            elif item[1] == "Link1 red":
                                siteinfo.write(
                                    linenum,
                                    index,
                                    edge["link_qoe"][link["internalId"]][
                                        "distribution"]["0"]["2"] * 100)
                            elif item[1] == "Link1 yellow":
                                siteinfo.write(
                                    linenum,
                                    index,
                                    edge["link_qoe"][link["internalId"]][
                                        "distribution"]["0"]["3"] * 100)
                            elif item[1] == "Link1 green":
                                siteinfo.write(
                                    linenum,
                                    index,
                                    edge["link_qoe"][link["internalId"]][
                                        "distribution"]["0"]["4"] * 100)
                            else:
                                continue
                    else:
                        #link2 data
                        for index, item in enumerate(data_source):
                            if item[1] == "Link2 name":
                                siteinfo.write(
                                    linenum,
                                    index,
                                    link["displayName"])
                            elif item[1] == "Link2 interface":
                                siteinfo.write(
                                    linenum,
                                    index,
                                    link["interface"])
                            elif item[1] == "Link2 IP":
                                siteinfo.write(
                                    linenum,
                                    index,
                                    link["ipAddress"])
                            elif item[1] == "Link2 offline":
                                siteinfo.write(
                                    linenum,
                                    index,
                                    edge["link_qoe"][link["internalId"]][
                                        "distribution"]["0"]["0"] * 100)
                            elif item[1] == "Link2 Unknown":
                                siteinfo.write(
                                    linenum,
                                    index,
                                    edge["link_qoe"][link["internalId"]][
                                        "distribution"]["0"]["1"] * 100)
                            elif item[1] == "Link2 red":
                                siteinfo.write(
                                    linenum,
                                    index,
                                    edge["link_qoe"][link["internalId"]][
                                        "distribution"]["0"]["2"] * 100)
                            elif item[1] == "Link2 yellow":
                                siteinfo.write(
                                    linenum,
                                    index,
                                    edge["link_qoe"][link["internalId"]][
                                        "distribution"]["0"]["3"] * 100)
                            elif item[1] == "Link2 green":
                                siteinfo.write(
                                    linenum,
                                    index,
                                    edge["link_qoe"][link["internalId"]][
                                        "distribution"]["0"]["4"] * 100)
                            else:
                                continue
                    linkcount+=1
            linenum+=1
    header = [{'header': di[1]} for di in data_source]
    siteinfo.add_table(0,0,linenum - 1, len(data_source) -1 ,{'columns':header})
    siteinfo.freeze_panes(1, 1)
    wbk.close()
    out_name.seek(0)
    return b64encode(out_name.read()).decode()

def route_report(routes_list: list, segment_list: list):
    """ report that provides device count """
    out_name = BytesIO()
    wbk = xlsxwriter.Workbook(out_name)
    subnets = wbk.add_worksheet('subnets')
    pref_exits = wbk.add_worksheet('prefered exits')
    ds_subnets = [
        (['subnet'], 'subnet'),
        (['learnedRoute', 'segmentId'], 'segment'),
        (['learnedRoute', 'pinned'], 'pinned'),
        (['learnedRoute', 'description'], 'description'),
        (['learnedRoute', 'created'], 'created'),
        (['learnedRoute', 'modified'], 'modified')
    ]
    # Create header
    for index, header_data in enumerate(ds_subnets):
        subnets.write(0, index, header_data[1])
    subnet_line_num = 1
    ds_pref_exit = [
        (['subnet'], 'subnet'),
        (['type'], 'type'),
        (['exitType'], 'exit type'),
        (['N/A'], 'profile'),
        (['segmentId'], 'segment'),
        (['edgeName'], 'edge'),
        (['filtered'], 'filtered'),
        (['isOwner'], 'owner'),
        (['advertise'], 'advertise'),
        (['protocol'], 'protocol'),
        (['area'], 'area'),
        (['routeType'], 'routeType'),
        (['cost'], 'cost'),
        (['metric'], 'metric'),
        (['tag'], 'tag'),
        (['neighborTag'], 'neighborTag'),
        (['state'], 'state'),
        (['interface'], 'interface'),
        (['neighborIp'], 'neighborIp'),
        (['attributes', 'bgpAttributes', 'asPathLength'], 'bgp as path'),
        (['attributes', 'bgpAttributes', 'localPreference'], 'bgp local pref'),
        (['attributes', 'bgpAttributes', 'multiExitDiscriminator'], 'bgp med'),
        (['learnedBy'], 'edge id'),
        (['created'], 'created'),
        (['modified'], 'modified')
    ]
    # Create header
    for index, header_data in enumerate(ds_pref_exit):
        pref_exits.write(0, index, header_data[1])
    pref_exits_line_num = 1
    # work on data
    #segments
    segment_dict = {}
    for segment in segment_list:
        segment_dict[segment["data"]["segmentId"]] = segment["name"]
    profiles_dict = {}
    for profile in routes_list["profiles"]:
        profiles_dict[profile["id"]] = profile["name"]
    for route in routes_list["subnets"]:
        #loop through subnets will write data...
        for index, item in enumerate(ds_subnets):
            if item[1] == "segment":
                if "segmentId" in route:
                    subnets.write(subnet_line_num, index,
                                segment_dict[int(dotted_key_list(route, item[0]))])
            else:
                subnets.write(subnet_line_num, index, dotted_key_list(route, item[0]))
        subnet_line_num += 1
        for pref_exit in route["preferredExits"]:
            for index, item in enumerate(ds_pref_exit):
                if item[1] == "subnet":
                        pref_exits.write(pref_exits_line_num, index, dotted_key_list(route, item[0]))
                elif item[1] == "profile":
                    if "profileId" in pref_exit:
                        pref_exits.write(pref_exits_line_num, index,
                                         profiles_dict[pref_exit["profileId"]])
                elif item[1] == "segment":
                    if "segmentId" in pref_exit:
                        pref_exits.write(pref_exits_line_num, index,
                                        segment_dict[int(dotted_key_list(pref_exit, item[0]))])
                else:
                    pref_exits.write(pref_exits_line_num, index,
                                     dotted_key_list(pref_exit, item[0]))
            pref_exits_line_num += 1
    # nice headers
    # freeze pane
    header_subnets = [{'header': di[1]} for di in ds_subnets]
    header_exits= [{'header': di[1]} for di in ds_pref_exit]
    subnets.add_table(0,0,subnet_line_num - 1, len(ds_subnets) -1,
                      {'columns': header_subnets,'header_row': True,
                       'autofilter': True, 'banded_rows': True,
                       'style': 'Table Style Light 11'})
    pref_exits.add_table(0,0,pref_exits_line_num - 1, len(ds_pref_exit) -1,
                         {'columns': header_exits, 'header_row': True,
                          'autofilter': True, 'banded_rows': True,
                          'style': 'Table Style Light 11'})
    subnets.autofit()
    pref_exits.autofit()
    subnets.freeze_panes(1, 1)
    pref_exits.freeze_panes(1, 1)
    wbk.close()
    out_name.seek(0)
    return b64encode(out_name.read()).decode()

def css_location_report(css_list: list, segment_list: list):
    """ report that provides location data for API provisioned CSS tunnels """
    out_name = BytesIO()
    wbk = xlsxwriter.Workbook(out_name)
    css = wbk.add_worksheet('css_locations')
    ds_css = [
        (['name'], 'edgename'),
        (['configuration', 'enterprise', 'name'], 'profile name'),
        (['site', 'city'], 'city'),
        (['site', 'state'], 'state'),
        (['site', 'postalCode'], 'postal'),
        (['site', 'country'], 'country'),
        (['state'], 'Status'),
        (['l7_check'], 'l7 check status'),
        (['provider','data','l7HealthCheck','enabled'], 'l7 enabled'),
        (['provider','data','l7HealthCheck','cloud'], 'zscaler cloud'),
        (['segmentName'], 'segmentName'),
        (['interface'], 'interface'),
        (['provider','name'], 'CSS config'),
        (['site','data','primaryServer'], 'primary DC'),
        (['site','data','dataCenters','primaryMeta','region'], 'Primary region'),
        (['site','data','dataCenters','primaryMeta','country'], 'Primary country'),
        (['site','data','dataCenters','primaryMeta','city'], 'Primary City'),
        (['site','data','dataCenters','primaryMeta','dcName'], 'Primary dcName'),
        (['site','data','secondaryServer'], 'secondary DC'),
        (['site','data','dataCenters','secondaryMeta','region'], 'Secondary region'),
        (['site','data','dataCenters','secondaryMeta','country'], 'Secondary country'),
        (['site','data','dataCenters','secondaryMeta','city'], 'Secondary City'),
        (['site','data','dataCenters','secondaryMeta','dcName'], 'Secondary dcName')
    ]
    # Create header
    for index, header_data in enumerate(ds_css):
        css.write(0, index, header_data[1])
    css_line_num = 1
    # work on data
    #segments
    segment_dict = {}
    for segment in segment_list:
        segment_dict[segment["data"]["segmentId"]] = segment["name"]
    for edge in css_list:
        if "cloudServices" not in edge or not edge["cloudServices"]:
            for index, item in enumerate(ds_css):
                if item[1] == "edgename":
                    css.write(css_line_num, index, dotted_key_list(edge, item[0]))
                elif item[1] == "city":
                    css.write(css_line_num, index, dotted_key_list(edge, item[0]))
                elif item[1] == "state":
                    css.write(css_line_num, index, dotted_key_list(edge, item[0]))
                elif item[1] == "postal":
                    css.write(css_line_num, index, dotted_key_list(edge, item[0]))
                elif item[1] == "country":
                    css.write(css_line_num, index, dotted_key_list(edge, item[0]))
                elif item[1] == "profile name":
                    css.write(css_line_num, index, dotted_key_list(edge, item[0]))
                else:
                    continue
            css_line_num += 1
        else:
            for css_loc in  edge["cloudServices"]:
                for index, item in enumerate(ds_css):
                    if item[1] == "edgename":
                        css.write(css_line_num, index, dotted_key_list(edge, item[0]))
                    elif item[1] == "city":
                        css.write(css_line_num, index, dotted_key_list(edge, item[0]))
                    elif item[1] == "state":
                        css.write(css_line_num, index, dotted_key_list(edge, item[0]))
                    elif item[1] == "postal":
                        css.write(css_line_num, index, dotted_key_list(edge, item[0]))
                    elif item[1] == "country":
                        css.write(css_line_num, index, dotted_key_list(edge, item[0]))
                    elif item[1] == "profile name":
                        css.write(css_line_num, index, dotted_key_list(edge, item[0]))
                    else:
                        if css_loc["provider"]["data"]["tunnelingProtocol"] == "GRE":
                            if item[1] == "primary DC":
                                css.write(css_line_num, index, dotted_key_list(css_loc, ['site','data','greTunnels','primaryDestVip','datacenter']))
                            elif item[1] == "Primary region":
                                css.write(css_line_num, index, dotted_key_list(css_loc, ['site','data','greTunnels','primaryDestVip','region']))
                            elif item[1] == "Primary country":
                                css.write(css_line_num, index, dotted_key_list(css_loc, ['site','data','greTunnels','primaryDestVip','countryCode']))
                            elif item[1] == "Primary City":
                                css.write(css_line_num, index, dotted_key_list(css_loc, ['site','data','greTunnels','primaryDestVip','city']))
                            elif item[1] == "Primary dcName":
                                css.write(css_line_num, index, dotted_key_list(css_loc, ['site','data','greTunnels','primaryDestVip','datacenter']))
                            elif item[1] == "secondary DC":
                                css.write(css_line_num, index, dotted_key_list(css_loc, ['site','data','greTunnels','secondaryDestVip','datacenter']))
                            elif item[1] == "Secondary region":
                                css.write(css_line_num, index, dotted_key_list(css_loc, ['site','data','greTunnels','secondaryDestVip','region']))
                            elif item[1] == "Secondary country":
                                css.write(css_line_num, index, dotted_key_list(css_loc, ['site','data','greTunnels','secondaryDestVip','countryCode']))
                            elif item[1] == "Secondary City":
                                css.write(css_line_num, index, dotted_key_list(css_loc, ['site','data','greTunnels','secondaryDestVip','city']))
                            elif item[1] == "Secondary dcName":
                                css.write(css_line_num, index, dotted_key_list(css_loc, ['site','data','greTunnels','secondaryDestVip','datacenter']))
                        else:
                            css.write(css_line_num, index, dotted_key_list(css_loc, item[0]))
                css_line_num += 1
    # nice headers
    # freeze pane
    header_css = [{'header': di[1]} for di in ds_css]
    css.add_table(0,0,css_line_num - 1, len(ds_css) -1,
                      {'columns': header_css,'header_row': True,
                       'autofilter': True, 'banded_rows': True,
                       'style': 'Table Style Light 11'})
    css.autofit()
    css.freeze_panes(1, 1)
    wbk.close()
    out_name.seek(0)
    return b64encode(out_name.read()).decode()

def vcg_migration(tunnel_list: list, vcg_list: list, super_list: list):
    """ report that provides tunnel information on quiasced gateways """
    out_name = BytesIO()
    wbk = xlsxwriter.Workbook(out_name)
    tunnels_ws = wbk.add_worksheet('NSD tunnels')
    vcg_ws = wbk.add_worksheet('VCG tunnel association')
    super_ws = wbk.add_worksheet('VCG SUPER tunnel association')
    ds_tunnels = [
        (['enterprise'], 'Enterprise name'),
        (['nsd_name'], 'NSD name'),
        (['enabled'], 'enabled'),
        (['primary_vcg_name'], 'Primary VCG name'),
        (['secondary_vcg_name'], 'Secondary VCG name'),
        (['new_vcg_name'], 'new VCG name'),
        (['profiles'], 'profiles used'),
        (['status'], 'status'),
        (['decomm'], 'planned decommision'),
        (['vco'], 'VCO url'),
        (['service'], 'remote service'),
        (['service_IP'], 'remote service IP'),
        (['nsd'], 'NSD networks')
    ]
    # Create header
    for index, header_data in enumerate(ds_tunnels):
        tunnels_ws.write(0, index, header_data[1])
    tunnel_line_num = 1
    ds_vcg = [
        (['vcg'], 'VCG name'),
        (['customer'], 'Customer name')
    ]
    # Create header
    for index, header_data in enumerate(ds_vcg):
        vcg_ws.write(0, index, header_data[1])
    vcg_line_num = 1
    ds_super = [
        (['vcg'], 'VCG name'),
        (['customer'], 'Customer name')
    ]
    # Create header
    for index, header_data in enumerate(ds_super):
        super_ws.write(0, index, header_data[1])
    super_line_num = 1
    # Work with data
    for tunnel in tunnel_list:
        for index, item in enumerate(ds_tunnels):
            tunnels_ws.write(tunnel_line_num, index, dotted_key_list(tunnel, item[0]))
        tunnel_line_num += 1
    for vcg in vcg_list:
        for index, item in enumerate(ds_vcg):
            vcg_ws.write(vcg_line_num, index, dotted_key_list(vcg, item[0]))
        vcg_line_num += 1
    for sup in super_list:
        for index, item in enumerate(ds_super):
            super_ws.write(super_line_num, index, dotted_key_list(sup, item[0]))
        super_line_num += 1
    # nice headers
    # freeze pane
    header_tunnels = [{'header': di[1]} for di in ds_tunnels]
    header_vcg= [{'header': di[1]} for di in ds_vcg]
    header_super= [{'header': di[1]} for di in ds_super]
    tunnels_ws.add_table(0,0,tunnel_line_num - 1, len(ds_tunnels) -1,
                      {'columns': header_tunnels,'header_row': True,
                       'autofilter': True, 'banded_rows': True,
                       'style': 'Table Style Light 11'})
    vcg_ws.add_table(0,0,vcg_line_num - 1, len(ds_vcg) -1,
                         {'columns': header_vcg, 'header_row': True,
                          'autofilter': True, 'banded_rows': True,
                          'style': 'Table Style Light 11'})
    super_ws.add_table(0,0,super_line_num - 1, len(ds_super) -1,
                         {'columns': header_super, 'header_row': True,
                          'autofilter': True, 'banded_rows': True,
                          'style': 'Table Style Light 11'})
    tunnels_ws.autofit()
    vcg_ws.autofit()
    super_ws.autofit()
    tunnels_ws.freeze_panes(1, 1)
    vcg_ws.freeze_panes(1, 1)
    super_ws.freeze_panes(1,1)
    wbk.close()
    out_name.seek(0)
    return b64encode(out_name.read()).decode()

def event_logs_parse(events, dictlinknames):
    events = pd.DataFrame(events)
    pd.set_option('display.max_columns', None)
    pd.set_option('display.max_rows', None)
    events.drop(['id', 'segmentName', 'edgeId', 'enterpriseUsername', 'category', 'severity'], axis=1, inplace=True, errors='ignore')
    def parse_datetime(date_str):
        try:
            return pd.to_datetime(date_str, errors='coerce', utc=True).tz_convert(None)
        except Exception:
            return pd.to_datetime(date_str.replace('.000Z', 'Z'), errors='coerce', utc=True).tz_convert(None)
    events['eventTime'] = events['eventTime'].apply(parse_datetime)
    events['created'] = events['created'].apply(parse_datetime)
    events['interface'] = events['message'].str.extract(r'(GE[1-6]|SFP[1-4])')
    events.sort_values(['edgeName', 'interface', 'eventTime', 'detail'], inplace=True)

    # Explicitly use .copy() to ensure we're working with a new DataFrame
    events_copy = events.copy()
    events_copy['is_dead'] = events_copy['event'] == 'LINK_DEAD'
    events_copy['next_alive'] = events_copy['event'].shift(-1) == 'LINK_ALIVE'
    events_copy['next_edge_interface'] = (events_copy['edgeName'] == events_copy['edgeName'].shift(-1)) & (events_copy['interface'] == events_copy['interface'].shift(-1))
    events_copy.loc[events_copy['is_dead'], 'startTime'] = events_copy['eventTime']
    events_copy.loc[events_copy['next_alive'] & events_copy['next_edge_interface'], 'endTime'] = events_copy['eventTime'].shift(-1)

    # Filter to complete events and explicitly use .copy()
    complete_events = events_copy.dropna(subset=['startTime', 'endTime']).copy()
    # Calculating 'downtime' safely
    complete_events.loc[:, 'downtime'] = (complete_events['endTime'] - complete_events['startTime']).dt.total_seconds()
    # Prepare link_dict for fast lookup
    link_dict = {link["link"]["internalId"]: link["link"]["displayName"] for link in dictlinknames}
    # Apply link_dict to get 'Overlay name'
    complete_events.loc[:, 'Overlay name'] = complete_events['detail'].apply(lambda x: json.loads(x)['internalId']).map(link_dict)

    # Drop specified columns before writing to Excel
    columns_to_drop = ['eventTime', 'event', 'message', 'detail', 'is_dead', 'next_alive', 'next_edge_interface']
    complete_events.drop(columns=columns_to_drop, inplace=True)

    # Group by and aggregate
    summary = complete_events.groupby(['edgeName', 'interface', 'Overlay name'], as_index=False).agg({'downtime': 'sum', 'interface': 'count'})
    summary.rename(columns={'downtime': 'downtime[sec]', 'interface': 'occurrences'}, inplace=True)

    # Write to Excel
    out_name = BytesIO()
    with pd.ExcelWriter(out_name, engine='xlsxwriter') as writer:
        complete_events.to_excel(writer, index=False, sheet_name='Time Differences')
        summary.to_excel(writer, index=False, sheet_name='Downtime Summary')
    out_name.seek(0)
    return b64encode(out_name.read()).decode()

def convert_bandwidth(value):
    if pd.isnull(value):  
        return None
    elif 'Gbps WFH' in value:
        return float(value.replace('Gbps WFH', '').strip()) * 1000
    elif 'Mbps WFH' in value:
        return float(value.replace('Mbps WFH', '').strip())
    elif 'Gbps' in value:
        return float(value.replace('Gbps', '').strip()) * 1000
    elif 'Mbps' in value:
        return float(value.replace('Mbps', '').strip())
    else:
        return None

def compare_bandwidth(license_value, percentile_value):
    converted_bandwidth = convert_bandwidth(license_value.split('|')[1].strip() if license_value and '|' in license_value else None)
    if converted_bandwidth is None:
        return 'notConfigured'
    elif converted_bandwidth < percentile_value:
        return 'undersized'
    else:
        return 'OK'

def write_df_to_sheet(workbook, dataframe, sheet_name, date_columns=None):
    worksheet = workbook.add_worksheet(sheet_name)
    # Define the date format
    date_format = workbook.add_format({'num_format': 'yyyy-mm-dd hh:mm:ss'})
    for row_num, row in enumerate(dataframe.itertuples(index=False), 1):
        for col_num, value in enumerate(row):
            if isinstance(value, list):
                value = ', '.join(map(str, value))
            # Apply date formatting if the column is specified as a date column
            if date_columns and dataframe.columns[col_num] in date_columns:
                worksheet.write_datetime(row_num, col_num, value, date_format)
            else:
                worksheet.write(row_num, col_num, value)
    start_row = 0
    start_col = 0
    end_row = len(dataframe)
    end_col = len(dataframe.columns) - 1
    columns = [{'header': column_name} for column_name in dataframe.columns]
    worksheet.add_table(start_row, start_col, end_row, end_col, {
        'columns': columns, 
        'autofilter': True, 
        'style': 'Table Style Medium 9'
    })
    worksheet.set_column(start_col, end_col, 25)


def max_troughput_report(df_list, df_bi_aggr_list, df_total_aggr_list, Licenses, edgeModels, bandwidth):
    if not df_list:
        raise ValueError("No data available to generate the report for df_list")
    if not df_bi_aggr_list:
        raise ValueError("No data available to generate the report for df_bi_aggr_list")
    if not df_total_aggr_list:
        raise ValueError("No data available to generate the report for df_total_aggr_list")
    if not bandwidth:
        raise ValueError("No data available to generate the report for bandwidth")

    final_df = pd.concat(df_list, ignore_index=True)
    final_bi_aggr_DF = pd.concat(df_bi_aggr_list, ignore_index=True)
    final_total_aggr_df = pd.concat(df_total_aggr_list, ignore_index=True)
    new_df = final_df[['edgeId', 'displayName', 'interface', 'metric', 'startTime']].copy()
    new_Bi_Aggr_df = final_bi_aggr_DF[['edgeId', 'metric', 'startTime']].copy()
    new_Total_Aggr_df = final_total_aggr_df[['edgeId', 'startTime']].copy()
    new_df['startTime'] = pd.to_datetime(new_df['startTime'])
    # Convert bandwidth list to DataFrame
    bandwidth_df = pd.DataFrame(bandwidth)
    bandwidth_df['starttime'] = pd.to_datetime(bandwidth_df['starttime']).dt.tz_localize(None)
    new_df['Max_trough'] = final_df.apply(calculate_max_trough, axis=1)
    new_df['95th_percentile'] = final_df.apply(calculate_95th_percentile, axis=1)
    merged_df = new_df.merge(bandwidth_df, how='left', left_on=['edgeId', 'startTime', 'displayName'], right_on=['edgename', 'starttime', 'displayName'])
# Create the bandwidth column based on the metric
    merged_df['bandwidth'] = merged_df.apply(lambda x: x['bpsOfBestPathRx'] if x['metric'] == 'bytesRx' else x['bpsOfBestPathTx'], axis=1)
    merged_df['bandwidth[Mbps]'] = merged_df['bandwidth'] / 1000000
    merged_df['bandwidth[Mbps]'] = merged_df['bandwidth[Mbps]'].round(1)
    merged_df.drop(columns=['bpsOfBestPathRx', 'bandwidth','name','bpsOfBestPathTx', 'starttime', 'edgename'], inplace=True)
    
    merged_df['Percentage_of_Max[%]'] = (merged_df['Max_trough'] / merged_df['bandwidth[Mbps]']) * 100
    merged_df['Percentage_of_95_percentile[%]'] = (merged_df['95th_percentile'] / merged_df['bandwidth[Mbps]']) * 100
    merged_df['Percentage_of_Max[%]'] = merged_df['Percentage_of_Max[%]'].round(2)
    merged_df['Percentage_of_95_percentile[%]'] = merged_df['Percentage_of_95_percentile[%]'].round(2)
    
    new_df = merged_df
    new_Bi_Aggr_df['Agr_Max_trough'] = final_bi_aggr_DF.apply(calculate_max_trough, axis=1)
    new_Total_Aggr_df['Total_Agr_Max_trough'] = final_total_aggr_df.apply(calculate_max_trough, axis=1)
    
    new_df['average'] = final_df.apply(calculate_average, axis=1)
    new_Bi_Aggr_df['average'] = final_bi_aggr_DF.apply(calculate_average, axis=1)
    new_Total_Aggr_df['average'] = final_total_aggr_df.apply(calculate_average, axis=1)


    
    new_Bi_Aggr_df['95th_percentile'] = final_bi_aggr_DF.apply(calculate_95th_percentile, axis=1)
    new_Total_Aggr_df['95th_percentile'] = final_total_aggr_df.apply(calculate_95th_percentile, axis=1)
    new_Total_Aggr_df['license'] = new_Total_Aggr_df['edgeId'].apply(lambda x: get_license_name(x, Licenses))
    new_Total_Aggr_df['model'] = new_Total_Aggr_df['edgeId'].map(edgeModels)

    # Group by edgeId, displayName, interface, and metric and calculate max, mean, and max of daily 95th percentiles
    grouped_df = new_df.groupby(['edgeId', 'displayName', 'interface', 'metric']).agg({
        'Max_trough': 'max',
        'average': 'mean',
        '95th_percentile': 'max'
    }).reset_index()
    grouped_df = grouped_df.rename(columns={'95th_percentile': 'Max of daily 95th percentiles'})

    # Group by edgeId and metric and calculate max, mean, and max of daily 95th percentiles
    grouped_Bi_Agr_df = new_Bi_Aggr_df.groupby(['edgeId', 'metric']).agg({
        'Agr_Max_trough': 'max',
        'average': 'mean',
        '95th_percentile': 'max'
    }).reset_index()
    grouped_Bi_Agr_df = grouped_Bi_Agr_df.rename(columns={'95th_percentile': 'Max of daily 95th percentiles'})

    # Group by edgeId and calculate max, mean, and max of daily 95th percentiles
    grouped_Total_Agr_df = new_Total_Aggr_df.groupby(['edgeId']).agg({
        'Total_Agr_Max_trough': 'max',
        'average': 'mean',
        '95th_percentile': 'max'
    }).reset_index()
    grouped_Total_Agr_df = grouped_Total_Agr_df.rename(columns={'95th_percentile': 'Max of daily 95th percentiles'})

    # Add license information to grouped_Total_Agr_df
    grouped_Total_Agr_df['license'] = grouped_Total_Agr_df['edgeId'].apply(lambda x: get_license_name(x, Licenses))
    grouped_Total_Agr_df['model'] = grouped_Total_Agr_df['edgeId'].map(edgeModels)
    grouped_Total_Agr_df['licenseSizing'] = grouped_Total_Agr_df.apply(lambda row: compare_bandwidth(row['license'], row['Max of daily 95th percentiles']), axis=1)
    out_name = BytesIO()
    wb = xlsxwriter.Workbook(out_name, {'in_memory': True, 'nan_inf_to_errors': True})
    ws_readme = wb.add_worksheet('Read me')
    readme_textA1 = """Samples were collected at 5-minute intervals from Monday through Friday, with weekends omitted. All start times are recorded in the UTC timezone.
    All values are in Mbps only"""
    readme_textA2 ="""Daily Circ Metrics - This sheet provides a comprehensive daily overview of all circuits, detailing both upload and download data. For each direction (upload/download), it captures the highest throughput achieved (Max throughput), the daily average throughput, and the 95th percentile of throughput values. 
    """
    readme_textA3 ="""Daily Thrpt Aggr - This sheet aggregates the daily throughput data across all circuits, presenting a consolidated view of both upload and download activities. It highlights the maximum throughput observed across all circuits, alongside the average daily throughput and the 95th percentile of throughput values
    """
    readme_textA4 ="""Daily In-Out Thrpt Sum - This sheet compiles aggregated throughput statistics for all circuits, considering both upload and download directions together, for each day. It features the maximum observed throughput (aggregated across both directions), the average throughput for the day, and the 95th percentile of throughput values
    """
    readme_textA5 ="""Mon Circ Metrics - This sheet presents the peak throughput for all circuits and directions over the month, showcasing the highest throughput achieved, the average of daily averages for a holistic view of performance, and the highest 95th percentile value, indicating the upper performance boundary.
    """
    readme_textA6 ="""Mon Thrpt Aggr - Summarizing network performance, this sheet reflects the highest throughput across all aggregated circuits and directions for the month, averages these daily averages for a comprehensive monthly performance view, and highlights the maximum 95th percentile value
    """
    readme_textA7 ="""Mon In -Out Thrpt Sum This sheet compiles throughput data for all aggregated circuits and directions into key metrics: the highest monthly throughput, the monthly average of daily averages, and the maximum 95th percentile value.
    All currently configured licenses are in addition pulled out from VCO per edge in Daily In-Out Thrpt Sum and Mon In-Out Thrpt Sum"""
    ws_readme.write('A1', readme_textA1)
    ws_readme.write('A2', readme_textA2)
    ws_readme.write('A3', readme_textA3)
    ws_readme.write('A4', readme_textA4)
    ws_readme.write('A5', readme_textA5)
    ws_readme.write('A6', readme_textA6)
    ws_readme.write('A7', readme_textA7)

    write_df_to_sheet(wb, grouped_Total_Agr_df, 'Mon In-Out Thrpt Sum')
    write_df_to_sheet(wb, grouped_Bi_Agr_df, 'Mon Thrpt Aggr')
    write_df_to_sheet(wb, grouped_df, 'Mon Circ Metrics')
    write_df_to_sheet(wb, new_df, 'Daily Circ Metrics', date_columns=['startTime'])
    write_df_to_sheet(wb, new_Bi_Aggr_df, 'Daily Thrpt Aggr', date_columns=['startTime'])
    write_df_to_sheet(wb, new_Total_Aggr_df, 'Daily In-Out Thrpt Sum', date_columns=['startTime'])
    
    wb.close()
    out_name.seek(0)
    return b64encode(out_name.read()).decode()

def get_link_statisctics_aggregate(data):
    extracted_data = [{
        'edgeName': entry.get('link', {}).get('edgeName'),
        'interface': entry.get('link', {}).get('interface'),
        'displayName': entry.get('link', {}).get('displayName'),
        'linkIpAddress': entry.get('link', {}).get('linkIpAddress'),
        'BandwidthRX': round(entry.get('bpsOfBestPathRx', 0) / 1000000, 2),  
        'BandwidthTX': round(entry.get('bpsOfBestPathTx', 0) / 1000000, 2),
        'JitterRx': entry.get('bestJitterMsRx'),
        'JitterTx': entry.get('bestJitterMsTx'),
        'LatencyTx': entry.get('bestLatencyMsRx'),
        'LatencyRX': entry.get('bestLatencyMsTx')
    } for entry in data]
    df = pd.DataFrame(extracted_data)
    df.sort_values(by=['edgeName', 'interface', 'displayName', 'linkIpAddress',
                       'BandwidthRX', 'BandwidthTX', 'JitterRx', 'JitterTx',
                       'LatencyTx', 'LatencyRX'], inplace=True)
    output = BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        df.to_excel(writer, index=False, sheet_name='Sheet1')
        workbook = writer.book
        worksheet = writer.sheets['Sheet1']
        worksheet.add_table(0, 0, len(df), len(df.columns)-1, {
            'columns': [{'header': column_name} for column_name in df.columns],
            'style': 'Table Style Medium 9'
        })
        worksheet.set_column('A:D', 30)
        worksheet.set_column('E:K', 10)  
    encoded_excel = b64encode(output.getvalue()).decode('utf-8')
    output.close()
    return encoded_excel


def get_link_packet_loss_aggregate(data):
    extracted_data = [{
        'edgeName': entry.get('link', {}).get('edgeName'),
        'interface': entry.get('link', {}).get('interface'),
        'displayName': entry.get('link', {}).get('displayName'),
        'linkIpAddress': entry.get('link', {}).get('linkIpAddress'),
        'LossRX[%]': entry.get('bestLossPctRx'),
        'LossTX[%]': entry.get('bestLossPctTx'),
        'Received [GB]': round((entry.get('bytesTx')/1000000000),3),
        'Sent [GB]':round((entry.get('bytesRx')/1000000000),3)
    } for entry in data]
    df = pd.DataFrame(extracted_data)
    df.sort_values(by=['edgeName', 'interface', 'displayName', 'linkIpAddress',
                       'LossRX[%]', 'LossTX[%]', 'Received [GB]', 'Sent [GB]'], inplace=True)
    output = BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        df.to_excel(writer, index=False, sheet_name='Sheet1')
        workbook = writer.book
        worksheet = writer.sheets['Sheet1']
        worksheet.add_table(0, 0, len(df), len(df.columns)-1, {
            'columns': [{'header': column_name} for column_name in df.columns],
            'style': 'Table Style Medium 9'
        })
        worksheet.set_column('A:D', 30)
        worksheet.set_column('E:K', 10)  
    encoded_excel = b64encode(output.getvalue()).decode('utf-8')
    output.close()
    return encoded_excel


def def_object_group(object_groups):
    # List to hold the final data
    final_data = []
    # Iterate through each object in the JSON list
    for single_object in object_groups:
        name = single_object.get('name')
        type_ = single_object.get('type')
        description = single_object.get('description')
        # If 'data' key exists and is a list, iterate through it
        if 'data' in single_object and isinstance(single_object['data'], list):
            for data_entry in single_object['data']:
                # Extract the required fields
                ip = data_entry.get('ip')
                rule_type = data_entry.get('rule_type')
                mask = data_entry.get('mask')
                domain = data_entry.get('domain')
                proto = data_entry.get('proto')
                port_low = data_entry.get('port_low')
                port_high = data_entry.get('port_high')
                
                # Append the data to final_data list
                final_data.append({
                    'name': name,
                    'type': type_,
                    'ip': ip,
                    'rule_type': rule_type,
                    'mask': mask,
                    'domain': domain,
                    'proto': proto,
                    'port_low': port_low,
                    'port_high': port_high,
                    'description': description
                })
        else:
            # If 'data' key doesn't exist or isn't a list, just add the basic info
            final_data.append({
                'name': name,
                'type': type_,
                'ip': None,
                'rule_type': None,
                'mask': None,
                'domain': None,
                'proto': None,
                'port_low': None,
                'port_high': None,
                'description': description
            })
    
    # Create DataFrame from the final_data list
    df_object_groups = pd.DataFrame(final_data)
    output = BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        df_object_groups.to_excel(writer, index=False, sheet_name='Sheet1')
        workbook = writer.book
        worksheet = writer.sheets['Sheet1']
        worksheet.add_table(0, 0, len(df_object_groups), len(df_object_groups.columns)-1, {
            'columns': [{'header': column_name} for column_name in df_object_groups.columns],
            'style': 'Table Style Medium 9'
        })
        worksheet.set_column('A:D', 30)
        worksheet.set_column('E:K', 10)  
    encoded_excel = b64encode(output.getvalue()).decode('utf-8')
    output.close()
    return encoded_excel


def max_agregate_incorrect_input():
    out_name = BytesIO()  
    wb = xlsxwriter.Workbook(out_name)  
    ws_readme = wb.add_worksheet('Read me')  
    readme_textA1 = """Either your customer's VCO setup includes over 400 edges, or you've chosen more than 400 edges. Due to the report's high demand on resources, it cannot be produced. For customers with over 400 edges in VCO, please reach out to mi449w@intl.att.com"""
    ws_readme.write('A1', readme_textA1)  
    wb.close()  
    out_name.seek(0)  
    return b64encode(out_name.read()).decode()  

def all_tunnels_info(edge_json, edgename, all_segments, enterprise_service):
    bgp_filters = []
    all_data = []
    css_data = []
    json_data = {}
    json_data[0] = edge_json[0]
    json_data[1] = edge_json[1]
    # Refactored: Find the WAN module without ext.parse
    wan_module = None
    for mod in edge_json[0].get("modules", []):
        if mod.get("name") == "WAN":
            wan_module = mod
            break
    linkstable = {}
    if wan_module and "data" in wan_module and "links" in wan_module["data"]:
        for link in wan_module["data"]["links"]:
            linkstable[link["name"]] = link["internalId"]
    else:
        logging.warning("Module 'WAN' does not contain 'data' or 'links' for edge %s", edgename)
    json_data = {}
    json_data[0] = edge_json[0]
    json_data[1] = edge_json[1]
    # Refactor: Find the deviceSettings module directly without ext.parse
    modules = json_data[0].get("modules", [])
    device_settings_module = None
    for mod in modules:
        if mod.get("name") == "deviceSettings":
            device_settings_module = mod
            break
    module = device_settings_module

    device_settings = None
    for mod in json_data[1].get("modules", []):
        if mod.get("name") == "deviceSettings":
            profile_settings = mod
            break
    # Build a lookup for filter id -> extra info
    filter_profile = {}
    if profile_settings and "data" in profile_settings:
        segments = profile_settings["data"].get("segments", [])
        for seg in segments:
            bgp = seg.get("bgp", {})
            for filt in bgp.get("filters", []):
                filter_id = filt.get("id", "")
                filter_profile[filter_id] = {
                    "filter_name": filt.get("name", ""),
                    "rules": filt.get("rules", [])
                }
    for segment in module["data"]["segments"]:
        segment_name_list = [seg["name"] for seg in all_segments]
        if segment["segment"]["name"] in segment_name_list:
            bgp_section = segment.get("bgp", {})
            segment_bgp_filters = []
            for filt in bgp_section.get("filters", []):
                filter_id = filt.get("id", "")
                filter_edge = {
                    "filter_id": filter_id,
                    "filter_name": filt.get("name", ""),
                    "rules": filt.get("rules", [])
                }
                filter_edge.update(filter_profile.get(filter_id, {}))
                segment_bgp_filters.append(filter_edge)
                bgp_filters.append(filter_edge)
            if not bgp_section.get("filters"):
                for filter_id, filter_info in filter_profile.items():
                    bgp_filters.append({
                        "filter_id": filter_id,
                        "filter_name": filter_info.get("filter_name", ""),
                        "rules": filter_info.get("rules", [])
                    })
            segment["bgp_filters"] = segment_bgp_filters

            edge_direct = segment.get("edgeDirect", {})
            providers = edge_direct.get("providers", [])
            for element in providers:
                for site in element.get('sites', []):
                    if 'data' in site:
                        link_name = next((name for name, id in linkstable.items() if id == site['data'].get('linkInternalLogicalId')), None)
                        bgp_neighbor = site['data']['primaryTunnel'].get('bgpNeighbor', {})
                        site_data = {
                            'edge_name': edgename,
                            'segment_name': segment["segment"]["name"],
                            'logicalId': site['logicalId'],
                            'provider_logicalId': element['logicalId'],
                            'enabled': site['data']['enabled'],
                            'linkInternalLogicalId': link_name,
                            'primaryTunnel_nvsPublicIp': site['data']['primaryTunnel']['nvsPublicIp'],
                            'primaryTunnel_ikeId': site['data']['primaryTunnel']['ikeAuth']['ikeId'],
                            'primaryTunnel_neighborIp': bgp_neighbor.get('neighborIp', ''),
                            'primaryTunnel_localIP': bgp_neighbor.get('localIP', ''),
                            'primaryTunnel_neighborAS': bgp_neighbor.get('neighborAS', ''),
                            'primaryTunnel_uplink': bgp_neighbor.get('uplink', ''),
                            'primaryTunnel_neighborTag': bgp_neighbor.get('neighborTag', ''),
                            'primaryTunnel_enableMd5': bgp_neighbor.get('enableMd5', ''),
                            'primaryTunnel_md5Password': bgp_neighbor.get('md5Password', ''),
                            'primaryTunnel_maxHop': bgp_neighbor.get('maxHop', ''),
                            'primaryTunnel_inboundFilter': bgp_neighbor.get('inboundFilter', ''),
                            'primaryTunnel_outboundFilter': bgp_neighbor.get('outboundFilter', '')
                        }
                        all_data.append(site_data)
        css = segment.get("css", {})
        if css and css.get("enabled", False):
            for css_site in css.get("sites", []):
                if 'data' in css_site:
                    link_name = None
                    link_internal_id = css_site['data'].get('linkInternalLogicalId')
                    if link_internal_id is not None:
                        link_name = next((name for name, id in linkstable.items() if id == link_internal_id), None)
                    css_config = css.get('config', {})
                    tunneling_protocol = css_config.get('tunnelingProtocol', '').upper()
                    provider_logicalId = css.get('provider', {}).get('logicalId', '')
                    css_site_data = {
                        'edge_name': edgename,
                        'segment_name': segment["segment"]["name"],
                        'css_provider_name': provider_logicalId,
                        'css_enabled': css.get('enabled', False),
                        'css_override': css.get('override', False),
                        'css_tunnelingProtocol': tunneling_protocol,
                        'css_redirect': css_config.get('redirect', ''),
                        'css_site_logicalId': css_site.get('logicalId', ''),
                        'css_linkInternalLogicalId': link_name,
                    }
                    if tunneling_protocol == 'GRE':
                        css_site_data.update({
                            'css_customSourceIp': css_site['data'].get('customSourceIp', ''),
                            'css_useCustomSourceIp': css_site['data'].get('useCustomSourceIp', ''),
                            'css_primary_internalRouterIp': css_site['data'].get('primaryAddressing', {}).get('internalRouterIp', ''),
                            'css_primary_internalRouterMask': css_site['data'].get('primaryAddressing', {}).get('internalRouterMask', ''),
                            'css_primary_internalZenIp': css_site['data'].get('primaryAddressing', {}).get('internalZenIp', ''),
                            'css_primary_internalZenMask': css_site['data'].get('primaryAddressing', {}).get('internalZenMask', ''),
                            'css_secondary_internalRouterIp': css_site['data'].get('secondaryAddressing', {}).get('internalRouterIp', ''),
                            'css_secondary_internalRouterMask': css_site['data'].get('secondaryAddressing', {}).get('internalRouterMask', ''),
                            'css_secondary_internalZenIp': css_site['data'].get('secondaryAddressing', {}).get('internalZenIp', ''),
                            'css_secondary_internalZenMask': css_site['data'].get('secondaryAddressing', {}).get('internalZenMask', ''),
                        })
                    elif tunneling_protocol == 'IPSEC':
                        css_site_data.update({
                            'css_ikeId': css_site['data'].get('ikeId', ''),
                            'css_ikeIdType': css_site['data'].get('ikeIdType', ''),
                            'css_pskType': css_site['data'].get('pskType', ''),
                        })
                    css_data.append(css_site_data)

    # --- DataFrame creation and enrichment ---

    df_nsd = pd.DataFrame(all_data)
    df_css = pd.DataFrame(css_data)

    # Build a lookup dictionary for services by logicalId
    service_lookup = {}
    for svc in enterprise_service:
        if svc.get("type") in ["cloudSecurityService", "nvsViaEdgeService"]:
            logical_id = svc.get("logicalId")
            name = svc.get("name", "")
            config = {}
            if svc.get("data") and isinstance(svc.get("data"), dict):
                config = svc["data"].get("config", {})
            elif svc.get("previousData") and isinstance(svc.get("previousData"), dict):
                config = svc["previousData"].get("config", {})
            primary_server = config.get("primaryServer", "")
            secondary_server = config.get("secondaryServer", "")
            automate_deployment = config.get("automateDeployment", "")
            l7_health_check = config.get("l7HealthCheck", {})
            l7_health_check_enabled = False
            if isinstance(l7_health_check, dict):
                l7_health_check_enabled = l7_health_check.get("enabled", False)
            service_lookup[logical_id] = {
                "service_name": name,
                "primary_server": primary_server,
                "secondary_server": secondary_server,
                "automate_deployment": automate_deployment,
                "l7_health_check": l7_health_check if l7_health_check_enabled else {}
            }

    # Enrich df_css with service info
    def enrich_css_row(row):
        logical_id = row.get("css_provider_name", "")
        svc = service_lookup.get(logical_id, {})
        row["service_name"] = svc.get("service_name", "")
        row["primary_server"] = svc.get("primary_server", "")
        row["secondary_server"] = svc.get("secondary_server", "")
        row["automate_deployment"] = svc.get("automate_deployment", "")
        l7_health_check = svc.get("l7_health_check", {})
        if isinstance(l7_health_check, dict) and l7_health_check.get("enabled", False):
            # Extract each key as a separate column
            row["l7_health_check_enabled"] = l7_health_check.get("enabled", "")
            row["l7_health_check_cloud"] = l7_health_check.get("cloud", "")
            row["l7_health_check_probeIntervalSec"] = l7_health_check.get("probeIntervalSec", "")
            row["l7_health_check_numOfRetries"] = l7_health_check.get("numOfRetries", "")
            row["l7_health_check_rttThresholdMs"] = l7_health_check.get("rttThresholdMs", "")
        return row

    if not df_css.empty:
        df_css = df_css.apply(enrich_css_row, axis=1)

    # Update primaryTunnel_outboundFilter and primaryTunnel_inboundFilter with filter names from bgp_filters
    def update_filter_names(row):
        outbound_filter = row.get('primaryTunnel_outboundFilter', {})
        outbound_ids = outbound_filter.get('ids', []) if isinstance(outbound_filter, dict) else []
        outbound_names = []
        for fid in outbound_ids:
            for filt in bgp_filters:
                if filt['filter_id'] == fid and filt['filter_name'] not in outbound_names:
                    outbound_names.append(filt['filter_name'])
        row['primaryTunnel_outboundFilter'] = ', '.join(outbound_names) if outbound_names else ''

        inbound_filter = row.get('primaryTunnel_inboundFilter', {})
        inbound_ids = inbound_filter.get('ids', []) if isinstance(inbound_filter, dict) else []
        inbound_names = []
        for fid in inbound_ids:
            for filt in bgp_filters:
                if filt['filter_id'] == fid and filt['filter_name'] not in inbound_names:
                    inbound_names.append(filt['filter_name'])
        row['primaryTunnel_inboundFilter'] = ', '.join(inbound_names) if inbound_names else ''

        provider_logicalId = row.get('provider_logicalId', '') or row.get('css_provider_name', '')
        svc = service_lookup.get(provider_logicalId, {})
        row['service_name'] = svc.get("service_name", "")
        return row
    if not df_nsd.empty:
        df_nsd = df_nsd.apply(update_filter_names, axis=1)
    # Reorder columns in df_nsd and swap 'service_name' and 'provider_logicalId' positions
    def reorder_nsd_columns(df):
        drop_cols = ['css_provider_name', 'logicalId', 'css_site_logicalId', 'provider_logicalId', 'css_linkInternalLogicalId']
        cols = [c for c in df.columns if c not in drop_cols]
        if 'service_name' in cols:
            cols.remove('service_name')
            cols.insert(2, 'service_name')
        return df[cols]
    def reorder_css_columns(df):
        drop_cols = ['logicalId', 'provider_logicalId','css_provider_name', 'logicalId', 'css_site_logicalId', 'provider_logicalId', 'css_linkInternalLogicalId']
        cols = [c for c in df.columns if c not in drop_cols]
        if 'service_name' in cols:
            cols.remove('service_name')
            cols.insert(2, 'service_name')
        return df[cols]
    if not df_nsd.empty:
        df_nsd = reorder_nsd_columns(df_nsd)
    if not df_css.empty:
            df_css = reorder_css_columns(df_css)
    return df_nsd, df_css

def create_tunnels_file(df_nsd_all, df_css_all):
    df_nsd_all = pd.DataFrame(df_nsd_all)
    df_css_all = pd.DataFrame(df_css_all)
    output = BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        # NSD_tunnels sheet
        df_nsd_all.to_excel(writer, index=False, sheet_name='NSD_tunnels')
        worksheet_nsd = writer.sheets['NSD_tunnels']
        worksheet_nsd.add_table(0, 0, len(df_nsd_all), len(df_nsd_all.columns)-1, {
            'columns': [{'header': column_name} for column_name in df_nsd_all.columns],
            'style': 'Table Style Medium 9'
        })
        worksheet_nsd.set_column('A:c', 30)
        worksheet_nsd.set_column('D:K', 20)
        # CSS_tunnels sheet
        df_css_all.to_excel(writer, index=False, sheet_name='CSS_tunnels')
        worksheet_css = writer.sheets['CSS_tunnels']
        worksheet_css.add_table(0, 0, len(df_css_all), len(df_css_all.columns)-1, {
            'columns': [{'header': column_name} for column_name in df_css_all.columns],
            'style': 'Table Style Medium 9'
        })
        worksheet_css.set_column('A:C', 30)
        worksheet_css.set_column('D:K', 20)
    encoded_excel = b64encode(output.getvalue()).decode('utf-8')
    output.close()
    return encoded_excel

def create_edge_performance_file(all_edge_metrics):
    # Process all_edge_metrics and generate Excel as base64
    df = pd.DataFrame(all_edge_metrics)
    # Remove EdgeId, StartTime, EndTime columns if present
    drop_cols = [col for col in ["EdgeId", "StartTime", "EndTime"] if col in df.columns]
    df = df.drop(columns=drop_cols)
    # Group by EdgeName and Model, then aggregate
    agg_funcs = {
        "TunnelCount": ["max", "min", "mean"],
        "MemoryPct": ["max", "min", "mean", lambda x: x.quantile(0.95)],
        "CpuPct": ["max", "min", "mean", lambda x: x.quantile(0.95)],
        "FlowCount": ["max", "min", "mean"],
        "HandoffQueueDrops": ["max", "min", "mean"],
        "CpuCoreTemp": ["max", "min", "mean"]
    }
    # Only aggregate columns that exist in the DataFrame
    agg_funcs_filtered = {k: v for k, v in agg_funcs.items() if k in df.columns}
    group_cols = ["EdgeName", "Model"]
    # Add SoftwareVersion and CustomInfo if present
    for col in ["SoftwareVersion", "CustomInfo"]:
        if col in df.columns:
            group_cols.append(col)
    output = BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        if agg_funcs_filtered:
            summary = df.groupby(group_cols).agg(agg_funcs_filtered)
            # Flatten MultiIndex columns
            summary.columns = [
                f"{col[0]}_{col[1] if isinstance(col[1], str) else col[1]}"
                for col in summary.columns.values
            ]
            summary = summary.reset_index()
            # Remove columns with <lambda_0> in their name (these are the default quantile columns)
            summary = summary[[col for col in summary.columns if '<lambda_0>' not in col]]
            # Add explicit columns for CPU and Memory 95th percentile (with correct names and order)
            if "CpuPct" in df.columns:
                cpu_95th = df.groupby(group_cols)["CpuPct"].apply(lambda x: x.quantile(0.95)).values.round(2)
                # Insert after CpuPct_mean if present, else at end
                cpu_mean_idx = [i for i, col in enumerate(summary.columns) if col == "CpuPct_mean"]
                insert_idx = cpu_mean_idx[0] + 1 if cpu_mean_idx else len(summary.columns)
                summary.insert(insert_idx, "CpuPct_95th_percentile", cpu_95th)
            if "MemoryPct" in df.columns:
                mem_95th = df.groupby(group_cols)["MemoryPct"].apply(lambda x: x.quantile(0.95)).values.round(2)
                mem_mean_idx = [i for i, col in enumerate(summary.columns) if col == "MemoryPct_mean"]
                insert_idx = mem_mean_idx[0] + 1 if mem_mean_idx else len(summary.columns)
                summary.insert(insert_idx, "MemoryPct_95th_percentile", mem_95th)
            # Round mean and percentile columns to 2 decimal places
            for col in summary.columns:
                if col.endswith('_mean') or col.endswith('_95th_percentile'):
                    summary[col] = summary[col].round(2)
            summary.to_excel(writer, index=False, sheet_name='Summary Metrics')
            worksheet = writer.sheets['Summary Metrics']
            worksheet.add_table(0, 0, len(summary), len(summary.columns)-1, {
                'columns': [{'header': column_name} for column_name in summary.columns],
                'style': 'Table Style Medium 9'
            })
            worksheet.set_column(0, len(summary.columns)-1, 20)

            # Conditional formatting for CpuPct_max and MemoryPct_max
            color_red = writer.book.add_format({'bg_color': '#FFC7CE'})
            color_orange = writer.book.add_format({'bg_color': '#FFEB9C'})
            color_green = writer.book.add_format({'bg_color': '#C6EFCE'})

            for col_name in ["CpuPct_max", "MemoryPct_max"]:
                if col_name in summary.columns:
                    col_idx = summary.columns.get_loc(col_name)
                    # Light red for 80-100
                    worksheet.conditional_format(1, col_idx, len(summary), col_idx, {
                        'type': 'cell',
                        'criteria': 'between',
                        'minimum': 80,
                        'maximum': 100,
                        'format': color_red
                    })
                    # Light orange for 60-80
                    worksheet.conditional_format(1, col_idx, len(summary), col_idx, {
                        'type': 'cell',
                        'criteria': 'between',
                        'minimum': 60,
                        'maximum': 80,
                        'format': color_orange
                    })
                    # Light green for 0-60
                    worksheet.conditional_format(1, col_idx, len(summary), col_idx, {
                        'type': 'cell',
                        'criteria': 'between',
                        'minimum': 0,
                        'maximum': 60,
                        'format': color_green
                    })
        else:
            # If no valid metric columns, just write the input data
            df.to_excel(writer, index=False, sheet_name='Raw Metrics')
            worksheet = writer.sheets['Raw Metrics']
            worksheet.add_table(0, 0, len(df), len(df.columns)-1, {
                'columns': [{'header': column_name} for column_name in df.columns],
                'style': 'Table Style Medium 9'
            })
            worksheet.set_column(0, len(df.columns)-1, 20)

        # New sheet: All events where CPU or Memory > 80%
        event_rows = []
        # If StartTime column exists, use it as date/time
        time_col = None
        for col in ["StartTime", "startTime", "DateTime", "dateTime"]:
            if col in all_edge_metrics[0]:
                time_col = col
                break
        for row in all_edge_metrics:
            edge_name = row.get("EdgeName", "")
            model = row.get("Model", "")
            # Try to get date/time
            dt = row.get(time_col, "") if time_col else ""
            if "CpuPct" in row and row["CpuPct"] is not None and row["CpuPct"] > 80:
                event_rows.append({
                    "DateTime": dt,
                    "EdgeName": edge_name,
                    "Model": model,
                    "Value[%]": row["CpuPct"],
                    "Indicator": "CPU"
                })
            if "MemoryPct" in row and row["MemoryPct"] is not None and row["MemoryPct"] > 80:
                event_rows.append({
                    "DateTime": dt,
                    "EdgeName": edge_name,
                    "Model": model,
                    "Value[%]": row["MemoryPct"],
                    "Indicator": "Memory"
                })
        if event_rows:
            df_events = pd.DataFrame(event_rows)
            # If DateTime column is present, try to convert to datetime for formatting
            if "DateTime" in df_events.columns:
                try:
                    df_events["DateTime"] = pd.to_datetime(df_events["DateTime"])
                    # Remove timezone info if present
                    if pd.api.types.is_datetime64_any_dtype(df_events["DateTime"]):
                        df_events["DateTime"] = df_events["DateTime"].dt.tz_localize(None)
                except Exception:
                    pass
            # Excel sheet names cannot contain []:*?/\\
            safe_sheet_name = 'High CPU or Memory Events'
            df_events.to_excel(writer, index=False, sheet_name=safe_sheet_name)
            worksheet_events = writer.sheets[safe_sheet_name]
            worksheet_events.add_table(0, 0, len(df_events), len(df_events.columns)-1, {
                'columns': [{'header': column_name} for column_name in df_events.columns],
                'style': 'Table Style Medium 9'
            })
            worksheet_events.set_column(0, len(df_events.columns)-1, 25)
    encoded_excel = b64encode(output.getvalue()).decode('utf-8')
    output.close()
    return encoded_excel

def sephora_list_paths(df):
    df = pd.DataFrame(df)
    output = BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        df.to_excel(writer, index=False, sheet_name='Sheet1')
        workbook = writer.book
        worksheet = writer.sheets['Sheet1']
        worksheet.add_table(0, 0, len(df), len(df.columns)-1, {
            'columns': [{'header': column_name} for column_name in df.columns],
            'style': 'Table Style Medium 9'
        })
        worksheet.set_column('A:D', 30)
        worksheet.set_column('E:K', 10)  
    encoded_excel = b64encode(output.getvalue()).decode('utf-8')
    output.close()
    return encoded_excel

def bgp_from_gw_neighbor_routes(allneighbors, received_routes, advertised_routes):
    # Extract only the 'data' field from each neighbor JSON, but also keep gatewayName
    def extract_data_fields(neighbors):
        extracted = []
        if isinstance(neighbors, list) and neighbors and isinstance(neighbors[0], dict):
            for n in neighbors:
                data = n.get('data', {}).copy()
                # Add gatewayName if present
                if 'gatewayName' in n:
                    data['gatewayName'] = n['gatewayName']
                extracted.append(data)
            return extracted
        return neighbors

    allneighbors_data = extract_data_fields(allneighbors)
    df_neighbors = pd.DataFrame(allneighbors_data)
    df_neighbors = df_neighbors.drop(columns=[col for col in ['enterpriseLogicalId', 'segmentId'] if col in df_neighbors.columns])

    # Helper to group routes by neighbor_ip
    def group_routes_by_neighbor(routes):
        grouped = {}
        for route in routes:
            neighbor_ip = route.get('neighbor_ip', 'Unknown')
            if neighbor_ip not in grouped:
                grouped[neighbor_ip] = []
            grouped[neighbor_ip].append(route)
        return grouped

    received_by_neighbor = group_routes_by_neighbor(received_routes)
    advertised_by_neighbor = group_routes_by_neighbor(advertised_routes)

    # Get all unique neighbor IPs in sorted order for consistent sheet order
    all_neighbor_ips = sorted(set(received_by_neighbor.keys()) | set(advertised_by_neighbor.keys()))

    output = BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        # Neighbors sheet first
        df_neighbors.to_excel(writer, index=False, sheet_name='Neighbors')
        worksheet_neighbors = writer.sheets['Neighbors']
        worksheet_neighbors.add_table(0, 0, len(df_neighbors), len(df_neighbors.columns)-1, {
            'columns': [{'header': col} for col in df_neighbors.columns],
            'style': 'Table Style Medium 9'
        })
        worksheet_neighbors.set_column(0, len(df_neighbors.columns)-1, 30)

        # For each neighbor, write Received then Advertised sheets
        for neighbor_ip in all_neighbor_ips:
            # Received
            if neighbor_ip in received_by_neighbor:
                df_received = pd.DataFrame(received_by_neighbor[neighbor_ip])
                sheet_name = f"{neighbor_ip} Received"[:31]
                df_received.to_excel(writer, index=False, sheet_name=sheet_name)
                worksheet = writer.sheets[sheet_name]
                worksheet.add_table(0, 0, len(df_received), len(df_received.columns)-1, {
                    'columns': [{'header': col} for col in df_received.columns],
                    'style': 'Table Style Medium 9'
                })
                worksheet.set_column(0, len(df_received.columns)-1, 30)
            # Advertised
            if neighbor_ip in advertised_by_neighbor:
                df_advertised = pd.DataFrame(advertised_by_neighbor[neighbor_ip])
                sheet_name = f"{neighbor_ip} Advertised"[:31]
                df_advertised.to_excel(writer, index=False, sheet_name=sheet_name)
                worksheet = writer.sheets[sheet_name]
                worksheet.add_table(0, 0, len(df_advertised), len(df_advertised.columns)-1, {
                    'columns': [{'header': col} for col in df_advertised.columns],
                    'style': 'Table Style Medium 9'
                })
                worksheet.set_column(0, len(df_advertised.columns)-1, 30)

    encoded_excel = b64encode(output.getvalue()).decode('utf-8')
    output.close()
    return encoded_excel


def all_msim_license(data):
    df = pd.DataFrame(data)
    # Set the correct column names
    df.columns = [
        'VCO name', 'Customer', 'Customer ID', 'Edge name', 'License', 'License duration', 'License BW', 'License region', 'License type', 'software Version',
        'Default SW version', 'Serial Number', 'HA Serial Number', 'Model Number', 'Edge State', 'Activation date', 'HA state', 'Address line 1', 'Address line 2', 'State',
        'Postal', 'Country', 'lat', 'lon'
    ]
    output = BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        df.to_excel(writer, index=False, sheet_name='VCO output')
        worksheet = writer.sheets['VCO output']
        worksheet.add_table(0, 0, len(df), len(df.columns)-1, {
            'columns': [{'header': str(column_name)} for column_name in df.columns],
            'style': 'Table Style Medium 9'
        })
        worksheet.set_column(0, len(df.columns)-1, 25)
    encoded_excel = b64encode(output.getvalue()).decode('utf-8')
    output.close()
    return encoded_excel

def publicIpExportDoc(all_edges):
    # Extract required fields from all_edges and their wanLinks/links
    df_rows = []
    for edge in all_edges:
        name = edge.get("name", "")
        modelNumber = edge.get("modelNumber", "")
        description = edge.get("description", "")
        customInfo = edge.get("customInfo", "")
        links = edge.get("wanLinks", {}).get("links", [])
        for link in links:
            mode = link.get("mode", "")
            type_ = link.get("type", "")
            nextHopIpAddress = link.get("nextHopIpAddress", "")
            sourceIpAddress = link.get("sourceIpAddress", "")
            ip_addr = link.get("publicIpAddress", "")
            row = {
                "name": name,
                "displayName": link.get("name", ""),
                "modelNumber": modelNumber,
                "customInfo": customInfo,
                "ipAddress": ip_addr,
                "interface": ",".join(link.get("interfaces", [])),
                "mode": mode,
                "type": type_,
                "nextHopIpAddress": nextHopIpAddress,
                "sourceIpAddress": sourceIpAddress,
                "calculated_/29_subnet": calculate_29_subnet(ip_addr)
            }
            df_rows.append(row)

    df = pd.DataFrame(df_rows)

    output = BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        df.to_excel(writer, index=False, sheet_name='All_public_IPs')
        worksheet = writer.sheets['All_public_IPs']
        worksheet.add_table(0, 0, len(df), len(df.columns)-1, {
            'columns': [{'header': str(column_name)} for column_name in df.columns],
            'style': 'Table Style Medium 9'
        })
        worksheet.set_column(0, len(df.columns)-1, 25)
    encoded_excel = b64encode(output.getvalue()).decode('utf-8')
    output.close()
    return encoded_excel
