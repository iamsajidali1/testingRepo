""" Class for generating MDS """
# pylint: disable=too-many-lines
from io import BytesIO
from base64 import b64encode
import logging
import sys
import ipaddress
import json
import xlsxwriter
from api.doc_utils_helpers import dotted_key_list, parse_business_rule, parse_fw_rule, merge_two_dicts


logging.basicConfig(
    stream=sys.stdout,
    level=logging.DEBUG,
    format='%(asctime)s: %(levelname)-8s: %(message)s'
)

def mds_generate(edge_list: list, dpi_apps: dict,
                 routable_apps: dict, object_groups: dict, profiles: list, segs: list):
    """ main function to generate MDS """
    out_name = BytesIO()
    for app in routable_apps["applications"]:
        dpi_apps["applications"].append(app)
    with open('api/app_additional.json', encoding="utf-8") as json_file:
        data = json.load(json_file)
    for app in data:
        dpi_apps["applications"].append(app)
    wb1 = xlsxwriter.Workbook(out_name)
    sitedetailwb = wb1.add_worksheet('Sitedetails')
    data_source_sitedetailwb = [
        (['name'], 'hostname'),
        (['id'], 'edge_id'),
        (['data', 'lan', 'management', 'cidrIp'], 'Management IP'),
        (['site', 'streetAddress'], 'address'),
        (['name'], 'site type'),
        (['isHub'], 'hub'),
        (['data', 'ha', 'enabled'], 'HA'),
        (['deviceFamily'], 'Edge Family'),
        (['modelNumber'], 'Edge Model'),
        (['n/a'], 'Profile name'),
        (['customInfo'], 'Custominfo'),
        (['description'], 'Description'),
        (['platformFirmwareVersion'], 'Firmware version'),
        (['licenses'], 'License'),
        (['activationKey'], 'Activation Key'),
        (['activationState'], 'Activation State'),
        (['activationTime'], 'Activation Time'),
        (['buildNumber'], 'Software version'),
        (['serialNumber'], 'Serial Number'),
        (['haSerialNumber'], 'HA Serial number'),
        (['site', 'contactName'], 'LCON Name'),
        (['site', 'contactEmail'], 'LCON email'),
        (['site', 'contactPhone'], 'LCON phone')
    ]
    circuitwb = wb1.add_worksheet('Circuit details')
    ds_circuitwb = [
        (['N/A'], 'hostname'),
        (['override'], 'override flag'),
        (['disabled'], 'Disabled'),
        (['natDirect'], 'natDirect'), 
        (['name'], 'interface'),
        (['name'], 'circuitID'),
        (['N/A'], 'accesstype'),
        (['N/A'], 'download'),
        (['N/A'], 'upload'),
        (['N/A'], 'IP'),
        (['N/A'], 'gateway'),
        (['N/A'], 'IPv6'),
        (['N/A'], 'IPv6 gateway'),
        (['N/A'], 'vlan'),
        (['ospf', 'area'], 'OSPF area'),
        (['discovery'], 'overlay auto/manual'),
        (['mode'], 'public/private'),
        (['type'], 'wired/wireless'),
        (['dynamicBwAdjustmentEnabled'], 'dynamicBwAdjustmentEnabled'),
        (['trusted'], 'trusted source IPv4'),
        (['rpf'], 'RPF status IPv4'),
        (['v6Detail', 'trusted'], 'trusted source IPv6'),
        (['v6Detail', 'rpf'], 'RPF status IPv6')
    ]
    lanwb = wb1.add_worksheet('LAN details')
    data_source_lanwb = [
        (['name'], 'hostname'),
        (['override'], 'override flag'),
        (['disabled'], 'Disabled'),
        (['advertise'], 'Advertise'),
        (['natDirect'], 'natDirect'),       
        (['site', 'state'], 'LAN IP'),
        (['N/A'], 'LAN Gateway'),
        (['N/A'], 'LAN IPv6'),
        (['vlanId'], 'LAN VLAN'),
        (['name'], 'Interface'),
        (['N/A'], 'accesstype'),
        (['serviceState'], 'Segment'),
        (['N/A'], 'DHCP mode'),
        (['N/A'], 'DHCP relay servers'),
        (['N/A'], 'DHCP server start IP'),
        (['N/A'], 'DHCP server num addresses'),
        (['N/A'], 'DHCP server lease time seconds'),
        (['N/A'], 'DHCP server options'),
        (['trusted'], 'trusted source IPv4'),
        (['rpf'], 'RPF status IPv4'),
        (['v6Detail', 'trusted'], 'trusted source IPv6'),
        (['v6Detail', 'rpf'], 'RPF status IPv6')
    ]
    routingwb = wb1.add_worksheet('Routing details')
    ds_routingwb = [
        (['name'], 'hostname'),
        (['N/A'], 'Segment'),
        (['N/A'], 'interface'),
        (['N/A'], 'OSPF area'),
        (['N/A'], 'BGP local AS'),
        (['N/A'], 'BGP remote AS'),
        (['N/A'], 'BGP neighbor'),
        (['N/A'], 'Inbound Filter'),
        (['N/A'], 'Outbound Filter'),
        (['N/A'], 'Additional Options'),
        (['N/A'], 'Neighbor Flag:'),
        (["N/A"], 'Allow AS'),
        (["N/A"], 'Default route:'),
        (["N/A"], 'Keep Alive:'),
        (['N/A'], 'Hold Timer:'),
        (['N/A'], 'Connect:'),
        (['N/A'], 'MD5 Auth:'),
        (['N/A'], 'MD5 Password:'),
        (['N/A'], 'Filter Name:'),
        (['N/A'], 'Match Type'),
        (['N/A'], 'Match Value'),
        (['N/A'], 'Exact Match'),
        (['N/A'], 'Action Type'),
        (["N/A"], 'Action Set'),
        (["N/A"], 'Set Value'),
        (["N/A"], 'Static route subnet'),
        (['N/A'], 'Source IP'),
        (['N/A'], 'Next Hop'),
        (['N/A'], 'Interface'),
        (['N/A'], 'VLAN'),
        (['N/A'], 'Cost'),
        (['N/A'], 'Prefered'),
        (['N/A'], 'Advertise')
    ]
    profileswb = wb1.add_worksheet('Profiles')
    ds_profileswb = [
        (['name'], 'Profile Name'),
        (['N/A'], 'ntp servers'),
        (['N/A'], 'Segment'),
        (['N/A'], 'Branch to Non-VeloCloud Site'),
        (['N/A'], 'Branch to Non-VeloCloud Sites'),
        (['N/A'], 'Hubs'),
        (['N/A'], 'Branch to Branch VPN'),
        (['N/A'], 'Overlay VPN established'),
        (['N/A'], 'Dynamic Branch To Branch VPN'),
        (['N/A'], 'Redistribute BGP'),
        (['N/A'], 'metric'),
        (['N/A'], 'Metric type'),
        (["N/A"], 'Overlay prefixes'),
        (["N/A"], 'Default route'),
        (["N/A"], 'Advertise'),
        (['N/A'], 'AreaID'),
        (['N/A'], 'Area Name'),
        (['N/A'], 'Area type'),
        (['N/A'], 'Local ASN'),
        (['N/A'], 'Neighbor IP'),
        (['N/A'], 'Remote ASN'),
        (['N/A'], 'Inbound Filter'),
        (['N/A'], 'Outbound Filter'),
        (['N/A'], 'Additional Options'),
        (["N/A"], 'Neighbor Flag:'),
        (["N/A"], 'Allow AS'),
        (["N/A"], 'Default route:'),
        (['N/A'], 'Keep Alive:'),
        (['N/A'], 'Hold Timer:'),
        (['N/A'], 'Connect:'),
        (['N/A'], 'MD5 Auth:'),
        (['N/A'], 'MD5 Password:'),
        (['N/A'], 'Filter Name:'),
        (['N/A'], 'Match Type'),
        (['N/A'], 'Match Value'),
        (['N/A'], 'Exact Match'),
        (['N/A'], 'Action Type'),
        (['N/A'], 'Action Set'),
        (['N/A'], 'Set Value'),
        (['N/A'], 'Service name'),
        (['N/A'], 'Service Type'),
        (['N/A'], 'Primary PoP'),
        (['N/A'], 'Secondary PoP'),
        (['N/A'], 'Hash'),
        (['N/A'], 'Encryption'),
        (['N/A'], 'Key Exch proto'),
        (['N/A'], 'Rule # & name'),
        (['N/A'], 'Match Source'),
        (['N/A'], 'Match Dest'),
        (['N/A'], 'Destination Address Group'),
        (['N/A'], 'Destination Port Group'),
        (['N/A'], 'Source Address Group'),
        (['N/A'], 'Source Port Group'),
        (['N/A'], 'Match Appl'),
        (['N/A'], 'Action Net Service'),
        (['N/A'], 'Action Link'),
        (['N/A'], 'Action Prio'),
        (['N/A'], 'Action SRV Class'),
        (['N/A'], 'DSCP inner'),
        (['N/A'], 'DSCP outer'),
        (['N/A'], 'Outbound rule'),
        (['N/A'], 'Match source'),
        (['N/A'], 'Match dest'),                
        (['N/A'], 'Match Appli'),
        (['N/A'], 'Action'),
        (['N/A'], 'Firewall enabled'),
        (['N/A'], 'Support access'),
        (['N/A'], 'SNMP Access'),
        (['N/A'], 'Web UI'),
        (['N/A'], 'NAT type'),
        (['N/A'], 'nat description'),
        (['N/A'], 'nat source route IP'),
        (['N/A'], 'nat source route prefix'),
        (['N/A'], 'nat destination route IP'),
        (['N/A'], 'nat destination route prefix'),
        (['N/A'], 'nat inside IP'),
        (['N/A'], 'nat inside prefix'),
        (['N/A'], 'nat inside port'),
        (['N/A'], 'nat outside IP'),
        (['N/A'], 'nat outside prefix'),
        (['N/A'], 'nat outside port'),
        (['N/A'], 'nats&d description'),
        (['N/A'], 'nats&d source inside IP'),
        (['N/A'], 'nats&d source inside prefix'),
        (['N/A'], 'nats&d source outside IP'),
        (['N/A'], 'nats&d source outside prefix'),
        (['N/A'], 'nats&d destination inside IP'),
        (['N/A'], 'nats&d destination inside prefix'),
        (['N/A'], 'nats&d destination outside IP'),
        (['N/A'], 'nats&d destination outside prefix')
    ]
    edgeoverrideswb = wb1.add_worksheet('Edge override rules')
    data_source_overrideswb = [
        (['N/A'], 'hostname'),
        (['N/A'], 'segment'),
        (['N/A'], 'Firewall enabled'),
        (['N/A'], 'Outbound rule'),
        (['N/A'], 'Match source'),
        (['N/A'], 'Match dest'),
        (['N/A'], 'Match Appl'),
        (['N/A'], 'Action'),
        (['N/A'], 'ntp servers'),
        (['N/A'], 'Support access'),
        (['N/A'], 'SNMP Access'),
        (['N/A'], 'Web UI'),
        (['N/A'], 'Name'),
        (['N/A'], 'Type'),
        (['N/A'], 'Protocol'),
        (['N/A'], 'Interface'),
        (['N/A'], 'Outside IP'),
        (['N/A'], 'WAN ports'),
        (['N/A'], 'LAN IP'),
        (['N/A'], 'LAN port'),
        (['N/A'], 'Outbound traffic'),
        (['N/A'], 'traffic source port'),
        (['N/A'], 'Remote IP subnet'),
        (['N/A'], 'Rule # & name'),
        (['N/A'], 'Match Source'),
        (['N/A'], 'Match Dest'),
        (['N/A'], 'Destination Address Group'),        
        (['N/A'], 'Destination Port Group'),
        (['N/A'], 'Source Address Group'),
        (['N/A'], 'Source Port Group'),
        (['N/A'], 'Match Appli'),
        (['N/A'], 'Action Net Service'),
        (['N/A'], 'Action Link'),
        (['N/A'], 'Action Prio'),
        (['N/A'], 'Action SRV Class'),
        (['N/A'], 'Action link Preffered'),
        (['N/A'], 'DSCP inner'),
        (['N/A'], 'DSCP outer'),
        (['N/A'], 'NAT type'),
        (['N/A'], 'nat description'),
        (['N/A'], 'nat source route IP'),
        (['N/A'], 'nat source route prefix'),
        (['N/A'], 'nat destination route IP'),
        (['N/A'], 'nat destination route prefix'),
        (['N/A'], 'nat inside IP'),
        (['N/A'], 'nat inside prefix'),
        (['N/A'], 'nat inside port'),
        (['N/A'], 'nat outside IP'),
        (['N/A'], 'nat outside prefix'),
        (['N/A'], 'nat outside port'),
        (['N/A'], 'nats&d description'),
        (['N/A'], 'nats&d source inside IP'),
        (['N/A'], 'nats&d source inside prefix'),
        (['N/A'], 'nats&d source outside IP'),
        (['N/A'], 'nats&d source outside prefix'),
        (['N/A'], 'nats&d destination inside IP'),
        (['N/A'], 'nats&d destination inside prefix'),
        (['N/A'], 'nats&d destination outside IP'),
        (['N/A'], 'nats&d destination outside prefix')
    ]
    sitedefswb = wb1.add_worksheet('Site type definitions')
    data_source_sitedefswb = [
        (['name'], 'Site Definitions'),
        (['site', 'state'], 'A - (MPLS + Internet)'),
        (['site', 'streetAddress'], 'B - (Internet + Internet)'),
        (['name'], 'C - (MPLS + LTE)'),
        (['serviceState'], 'D - (Internet + LTE)')
    ]
    loopwb = wb1.add_worksheet('Loopbacks')
    ds_loopwb = [
        (['N/A'], 'hostname'),
        (['N/A'], 'segment'),
        (['N/A'], 'name'),
        (['pingResponse'], 'ping response enabled'),
        (['cidrIp'], 'ipv4 address'),
        (['cidrPrefix'], 'ipv4 prefix'),
        (['advertise'], 'ipv4 advertised'),
        (['disableV4'], 'ipv4 disabled'),
        (['v6Detail', 'cidrIp'], 'ipv6 address'),
        (['v6Detail', 'cidrPrefix'], 'ipv6 prefix'),
        (['v6Detail', 'advertise'], 'ipv6 advertised'),
        (['disableV6'], 'ipv6 disabled'),
        (['ospf', 'enabled'], 'ospf enabled'),
        (['ospf', 'area'], 'ospf areas')
    ]
    # Create headers
    for index, header_data in enumerate(data_source_sitedetailwb):
        sitedetailwb.write(0, index, header_data[1])
    for index, header_data in enumerate(ds_circuitwb):
        circuitwb.write(0, index, header_data[1])
    for index, header_data in enumerate(data_source_lanwb):
        lanwb.write(0, index, header_data[1])
    for index, header_data in enumerate(ds_routingwb):
        routingwb.write(0, index, header_data[1])
    for index, header_data in enumerate(ds_profileswb):
        profileswb.write(1, index, header_data[1])
    profileswb.write(0, 3, 'Cloud VPN')
    profileswb.write(0, 7, 'OSPF')
    profileswb.write(0, 16, 'BGP')
    profileswb.write(0, 37, 'Cloud Security')
    profileswb.write(0, 46, 'Business Policy')
    profileswb.write(0, 58, 'Firewall')
    profileswb.write(0, 63, 'Edge Access')
    profileswb.write(0, 71, 'LAN NAT source OR destination')
    profileswb.write(0, 80, 'LAN NAT source AND destination')
    for index, header_data in enumerate(data_source_overrideswb):
        edgeoverrideswb.write(1, index, header_data[1])
    edgeoverrideswb.write(0, 2, 'Firewall')
    edgeoverrideswb.write(0, 11, 'Inbound rules')
    edgeoverrideswb.write(0, 22, 'BP edge override rules')
    edgeoverrideswb.write(0, 30, 'LAN NAT source OR destination')
    edgeoverrideswb.write(0, 42, 'LAN NAT source AND destination')
    edgeoverrideswb.write(0, 9, 'Edge Access')
    for index, header_data in enumerate(data_source_sitedefswb):
        sitedefswb.write(0, index, header_data[1])
    sitedefswb.write(1, 0, 'Site volume per type')
    for index, header_data in enumerate(ds_loopwb):
        loopwb.write(0, index, header_data[1])
    # counters setup
    publiclinks = 0
    privatelinks = 0
    ltelinks = 0
    device_counter = 1
    circuit_counter = 1
    lan_counter = 1
    loop_counter = 1
    routing_counter = 1
    edgeoverride_counter = 2
    profile_counter = 2
    # prepare segments #as json from vmware is baaad
    device_segments = {}
    # WA because velocloud is bad
    device_segments[-1] = "WAN only segment"
    for segment in segs:
        device_segments[segment["data"]["segmentId"]] = segment["name"]
    # Data insert
    for edge in edge_list:
        devmod = ""
        firmod = ""
        qosmod = ""
        wanmod = ""
        ProfileFilter =[]
        FWsegment_dict={}
        # #preparations - split into modules
        if "configstack" not in edge:
            logging.debug("MDS report device skipping: %s", edge["name"])
            continue
        logging.debug("MDS report device started: %s", edge["name"])
        for module in edge["configstack"]["modules"]:
            if module["name"] == "deviceSettings":
                devmod = module
            elif module["name"] == "firewall":
                firmod = module
            elif module["name"] == "QOS":
                qosmod = module
            elif module["name"] == "WAN":
                wanmod = module
        for module in edge["profilestack"]["modules"]:
            if module["name"] == "deviceSettings":
                devmodpro = module
                for segment in devmodpro["data"]["segments"]:
                    if "bgp" in segment:
                        for bgpitem in segment["bgp"]:
                            if "filters" in bgpitem:
                                ProfileFilter += segment["bgp"]["filters"]
            #elif module["name"] == "analyticsSettings":
            #    anamodpro = module
            elif module["name"] == "firewall":
                firmodpro = module
                for segment in firmodpro["data"]["segments"]:
                    FWsegment_id = segment["segment"]["segmentId"]
                    FWsegment_name = segment["segment"]["name"]
                    FWsegment_dict[FWsegment_id] = FWsegment_name
                    FWsegment_dict[segment["segment"]["segmentId"]] = segment["segment"]["name"]
            #elif module["name"] == "QOS":
            #    qosmodpro = module
            #elif module["name"] == "WAN":
            #    wanmodpro = module
        # work on data for site specific details
        for index, item in enumerate(data_source_sitedetailwb):
            if item[1] == "Management IP":
                if devmod["metadata"]:
                    if (devmod["metadata"]["override"]
                        ) and (
                            "data" in devmod):
                        if "management" in devmod["data"]["lan"]:
                            sitedetailwb.write(
                                device_counter,
                                index,
                                dotted_key_list(devmod, item[0]))
                        else:
                            sitedetailwb.write(
                                device_counter, index, "192.168.1.1")
                    else:
                        sitedetailwb.write(device_counter, index, "192.168.1.1")
            elif item[1] == "address":
                site_city = ["", edge["site"]["city"]][
                    edge["site"]["city"] is not None]
                site_country = ["", edge["site"]["country"]][
                    edge["site"]["country"] is not None]
                site_postal = ["", edge["site"]["postalCode"]][
                    edge["site"]["postalCode"] is not None]
                site_address = ["", edge["site"][
                    "streetAddress"]][edge["site"][
                        "streetAddress"] is not None]
                site_address2 = ["", edge["site"][
                    "streetAddress2"]][edge[
                        "site"]["streetAddress2"] is not None]
                sitedetailwb.write(device_counter,
                                   index, str(site_city + ", " + site_address
                                              + ", " + site_address2 + ", "
                                              + site_country + ", "
                                              + site_postal))
            elif item[1] == "HA":
                if devmod["metadata"]:
                    if (devmod["metadata"]["override"]
                        ) and (
                            "data" in devmod):
                        sitedetailwb.write(device_counter, index, dotted_key_list(
                            devmod, item[0]))
            elif item[1] == "site type":
                continue
            elif item[1] == "Profile name":
                sitedetailwb.write(device_counter, index, edge["profilestack"]["name"])
            elif item[1] == "License":
                lic_str = ""
                for lic in edge["licenses"]:
                    if lic["active"] == 1:
                        lic_str += lic["alias"] + "; "
                sitedetailwb.write(device_counter, index, lic_str)
            else:
                sitedetailwb.write(device_counter, index, dotted_key_list(
                    edge, item[0]))
        device_counter += 1
        # work on data for interface specific details LAN + WAN
        csssites = []
        nsdgw = []
        bhhubs = {}
        if "refs" in devmod:
            if "deviceSettings:css:provider" in devmod["refs"]:
                if isinstance(
                    devmod[
                        "refs"]["deviceSettings:css:provider"], list):
                    csssites = devmod[
                            "refs"]["deviceSettings:css:provider"]
                else:
                    csssites.append(
                        devmod[
                            "refs"]["deviceSettings:css:provider"])
        if "refs" in devmodpro:
            if "deviceSettings:segment" in devmodpro["refs"]:
                if isinstance(devmodpro["refs"]["deviceSettings:segment"], list):
                    for segment in devmodpro["refs"]["deviceSettings:segment"]:
                        device_segments[segment["data"]["segmentId"]] = segment["name"]
            if "deviceSettings:vpn:dataCenter" in devmodpro["refs"]:
                if isinstance(devmodpro[
                    "refs"][
                        "deviceSettings:vpn:dataCenter"], list):
                    nsdgw = devmodpro[
                        "refs"]["deviceSettings:vpn:dataCenter"]
                else:
                    nsdgw.append(devmodpro["refs"][
                            "deviceSettings:vpn:dataCenter"])
        if "data" in devmod:
            for segment in devmod["data"]["segments"]:
                device_segments[segment[
                    "segment"]["segmentId"]] = segment["segment"]["name"]
                # BGP
                print("bgp")
                if "bgp" in segment:
                    for bgpsession in segment["bgp"]["neighbors"]:
                        localas = [
                            "",
                            segment["bgp"]["ASN"]][
                                segment["bgp"]["ASN"] is not None]
                        remoteas = [
                            "",
                            bgpsession["neighborAS"]][
                                bgpsession["neighborAS"] is not None]
                        neighborip = [
                            "",
                            bgpsession["neighborIp"]][
                                bgpsession["neighborIp"] is not None]
                        intname = ""
                        for interface in devmod["data"
                                                      ]["routedInterfaces"]:
                            if interface["addressing"][
                                "type"] == "DHCP" or interface[
                                    "addressing"]["type"] == "PPPOE":
                                continue
                            if interface["disabled"]:
                                continue
                            cidr_ip = [
                                "",
                                interface["addressing"][
                                    "cidrIp"]][interface[
                                        "addressing"]["cidrIp"] is not None]
                            if "cidrPrefix" in interface["addressing"]:
                                cidrprefix = [
                                    "",
                                    interface["addressing"][
                                        "cidrPrefix"]][
                                            interface["addressing"][
                                                "cidrPrefix"] is not None]
                            else:
                                cidrprefix = ""
                            if cidr_ip == "":
                                continue
                            if "disabled" in interface:
                                continue
                            bgp_ip = ipaddress.ip_network(f"{neighborip}/32")
                            int_ip = ipaddress.ip_network(
                                f"{cidr_ip}/{cidrprefix}", strict=False)
                            if bgp_ip.subnet_of(int_ip):
                                intname = interface["name"]
                            if "subinterfaces" in interface:
                                for subinterface in interface["subinterfaces"]:
                                    subcidrip = [
                                        "",
                                        subinterface["addressing"][
                                            "cidrIp"]][
                                                subinterface[
                                                    "addressing"][
                                                        "cidrIp"] is not None]
                                    if "cidrPrefix" in subinterface["addressing"]:
                                        subcidrprefix = [
                                            "",
                                            subinterface["addressing"][
                                                "cidrPrefix"]][subinterface[
                                                    "addressing"][
                                                        "cidrPrefix"] is not None]
                                    else:
                                        subcidrprefix = ""
                                    subinterfaceip = ipaddress.ip_network(
                                        f"{subcidrip}/{subcidrprefix}",
                                        strict=False
                                    )
                                    if bgp_ip.subnet_of(subinterfaceip):
                                        intname = str(
                                            interface["name"]) + "." + str(
                                                subinterface[
                                                    "subinterfaceId"])
                                        continue
                        if "neighborTag" in bgpsession:
                            bgpneiflag = bgpsession["neighborTag"]
                        else:
                            bgpneiflag = ""
                        if "keepalive" in bgpsession:
                            bgpneikeepalive = bgpsession["keepalive"]
                        else:
                            bgpneikeepalive = ""
                        if "holdtime" in bgpsession:
                            bgpneiholdtime = bgpsession["holdtime"]
                        else:
                            bgpneiholdtime = ""
                        if "enableMd5" in bgpsession:
                            bgpneimd5 = True
                        else:
                            bgpneimd5 = False
                        if "allowAS" in bgpsession:
                            bgpneiallowas = "Enabled"
                        else:
                            bgpneiallowas = ""
                        if "connect" in bgpsession:
                            bgpneiconnect = bgpsession["connect"]
                        else:
                            bgpneiconnect = ""
                        if "defaultRoute" in bgpsession:
                            bgpneidefaultroute = "Enabled"
                        else:
                            bgpneidefaultroute = ""
                        if bgpneimd5:
                            bgpneimd5value = "yes"
                            if "md5Password" in bgpsession:
                                bgpneimd5pass = str(bgpsession["md5Password"])
                            else:
                                bgpneimd5pass = ""
                        else:
                            bgpneimd5value = "no"
                            bgpneimd5pass = ""
                        if (bgpneiflag != "") or (bgpneikeepalive != "") or (
                            bgpneikeepalive != "") or (
                                bgpneiholdtime != "") or (
                                    bgpneimd5) or (
                                        bgpneiallowas != "") or (
                                            bgpneiconnect != "") or (
                                                bgpneidefaultroute != ""):
                            bgpadditionaloptions = "yes"
                        else:
                            bgpadditionaloptions = ""
                        inboundbgpfilter = ""
                        Edgefilters =[]
                        for bgpneiprofile in bgpsession[
                            "inboundFilter"][
                                "ids"]:
                              if segment["bgp"]["filters"]: 
                                Edgefilters = segment["bgp"]["filters"]
                                Edgefilters += ProfileFilter
                                for filters in Edgefilters:
                                    if "id" in filters:
                                        if bgpneiprofile == filters["id"]:
                                            if filters["name"] not in inboundbgpfilter: 
                                                inboundbgpfilter += filters["name"] + "; "
                              if ProfileFilter and not segment["bgp"]["filters"]:
                                for filters in ProfileFilter:
                                    if bgpneiprofile == filters["id"]:
                                             if filters["name"] not in inboundbgpfilter: 
                                                inboundbgpfilter += filters["name"] + "; "
                        outboundbgpfilter = ""
                        for bgpneiprofile in bgpsession[
                            "outboundFilter"][
                                "ids"]:
                              if segment["bgp"]["filters"]: 
                                Edgefilters = segment["bgp"]["filters"] 
                                Edgefilters += ProfileFilter
                                for filters in Edgefilters:
                                    if "id" in filters:
                                        if bgpneiprofile == filters["id"]:
                                            if filters["name"] not in outboundbgpfilter: 
                                                outboundbgpfilter += filters["name"] + "; "
                              if ProfileFilter and not segment["bgp"]["filters"]:
                                for filters in ProfileFilter:
                                    if bgpneiprofile == filters["id"]:
                                            if filters["name"] not in outboundbgpfilter: 
                                                outboundbgpfilter += filters["name"] + "; "                                      
                        for index, item in enumerate(ds_routingwb):
                            if item[1] == "hostname":
                                routingwb.write(routing_counter,
                                                index, str(edge["name"]))
                            elif item[1] == "Segment":
                                routingwb.write(routing_counter,
                                                index, str(segment[
                                                    "segment"]["name"]))
                            elif item[1] == "interface":
                                routingwb.write(routing_counter,
                                                index, str(intname))
                            elif item[1] == "BGP local AS":
                                routingwb.write(routing_counter,
                                                index, str(localas))
                            elif item[1] == "BGP remote AS":
                                routingwb.write(routing_counter,
                                                index, str(remoteas))
                            elif item[1] == "BGP neighbor":
                                routingwb.write(routing_counter,
                                                index, str(neighborip))
                            elif item[1] == "Inbound Filter":
                                routingwb.write(routing_counter,
                                                index, str(inboundbgpfilter))
                            elif item[1] == "Outbound Filter":
                                routingwb.write(routing_counter,
                                                index, str(outboundbgpfilter))
                            elif item[1] == "Additional Options":
                                routingwb.write(routing_counter,
                                                index,
                                                str(bgpadditionaloptions))
                            elif item[1] == "Neighbor Flag:":
                                routingwb.write(routing_counter,
                                                index, str(bgpneiflag))
                            elif item[1] == "Neighbor Flag:":
                                routingwb.write(routing_counter,
                                                index, str(bgpneiflag))
                            elif item[1] == "Allow AS":
                                routingwb.write(routing_counter,
                                                index, str(bgpneiallowas))
                            elif item[1] == "Default route:":
                                routingwb.write(routing_counter,
                                                index, str(bgpneidefaultroute))
                            elif item[1] == "Keep Alive:":
                                routingwb.write(routing_counter,
                                                index, str(bgpneikeepalive))
                            elif item[1] == "Hold Timer:":
                                routingwb.write(routing_counter,
                                                index, str(bgpneiholdtime))
                            elif item[1] == "Connect:":
                                routingwb.write(routing_counter,
                                                index, str(bgpneiconnect))
                            elif item[1] == "MD5 Auth:":
                                routingwb.write(routing_counter,
                                                index, str(bgpneimd5value))
                            elif item[1] == "MD5 Password:":
                                routingwb.write(routing_counter,
                                                index, str(bgpneimd5pass))
                            else:
                                continue
                        routing_counter += 1
                    # Filter rules
                    for bgpfilters in segment["bgp"]["filters"]:
                        for rules in bgpfilters["rules"]:
                            if len(rules["action"]["values"]) > 0:
                                for action in rules["action"]["values"]:
                                    for index, item in enumerate(ds_routingwb):
                                        if item[1] == "hostname":
                                            routingwb.write(routing_counter,
                                                            index,
                                                            str(edge["name"]))
                                        elif item[1] == "Segment":
                                            routingwb.write(routing_counter,
                                                            index,
                                                            str(segment[
                                                                "segment"][
                                                                    "name"]))
                                        elif item[1] == "Filter Name:":
                                            routingwb.write(routing_counter,
                                                            index,
                                                            str(bgpfilters
                                                                ["name"]))
                                        elif item[1] == "Match Type":
                                            routingwb.write(routing_counter,
                                                            index,
                                                            str(rules["match"][
                                                                "type"]))
                                        elif item[1] == "Match Value":
                                            routingwb.write(routing_counter,
                                                            index,
                                                            str(rules["match"][
                                                                "value"]))
                                        elif item[1] == "Exact Match":
                                            routingwb.write(routing_counter,
                                                            index,
                                                            str(rules["match"][
                                                                "exactMatch"]))
                                        elif item[1] == "Action Type":
                                            routingwb.write(routing_counter,
                                                            index,
                                                            str(rules[
                                                                "action"][
                                                                "type"]))
                                        elif item[1] == "Action Set":
                                            routingwb.write(routing_counter,
                                                            index,
                                                            str(action[
                                                                "type"]))
                                        elif item[1] == "Set Value":
                                            routingwb.write(routing_counter,
                                                            index,
                                                            str(action[
                                                                "value"]))
                                        else:
                                            continue
                                    routing_counter += 1
                            else:
                                for index, item in enumerate(ds_routingwb):
                                    if item[1] == "hostname":
                                        routingwb.write(routing_counter,
                                                        index,
                                                        str(edge["name"]))
                                    elif item[1] == "Segment":
                                        routingwb.write(routing_counter,
                                                        index,
                                                        str(segment[
                                                            "segment"][
                                                                "name"]))
                                    elif item[1] == "Filter Name:":
                                        routingwb.write(routing_counter,
                                                        index,
                                                        str(bgpfilters[
                                                            "name"]))
                                    elif item[1] == "Match Type":
                                        routingwb.write(routing_counter,
                                                        index,
                                                        str(rules["match"][
                                                            "type"]))
                                    elif item[1] == "Match Value":
                                        routingwb.write(routing_counter,
                                                        index,
                                                        str(rules["match"][
                                                            "value"]))
                                    elif item[1] == "Exact Match":
                                        routingwb.write(routing_counter,
                                                        index,
                                                        str(rules["match"][
                                                            "exactMatch"]))
                                    elif item[1] == "Action Type":
                                        routingwb.write(routing_counter,
                                                        index,
                                                        str(rules["action"][
                                                            "type"]))
                                    elif item[1] == "Action Set":
                                        routingwb.write(routing_counter,
                                                        index,
                                                        str("DENY"))
                                    elif item[1] == "Set Value":
                                        routingwb.write(routing_counter,
                                                        index,
                                                        str(""))
                                    else:
                                        continue
                                routing_counter += 1
                print("static route")
                static_vlan=[]
                for staticroute in segment["routes"]["static"]:
                    if "vlanId" in staticroute:
                        static_vlan = ["",
                                    staticroute["vlanId"]][
                                        staticroute["vlanId"] is not None]
                    if "sourceIp" in staticroute:
                        static_sourceip = ["",
                                        staticroute["sourceIp"]][
                                            staticroute["sourceIp"] is not None]
                    for index, item in enumerate(ds_routingwb):
                        if item[1] == "hostname":
                            routingwb.write(routing_counter,
                                            index,
                                            str(edge["name"]))
                        elif item[1] == "Segment":
                            routingwb.write(routing_counter,
                                            index,
                                            str(segment[
                                                "segment"][
                                                    "name"]))
                        elif item[1] == "Static route subnet":
                            routingwb.write(routing_counter,
                                            index,
                                            str(str(staticroute["destination"])
                                                + "/" + str(staticroute[
                                                    "cidrPrefix"])))
                        elif item[1] == "Source IP":
                            if "sourceIp" in staticroute:
                                routingwb.write(routing_counter,
                                            index,
                                            str(static_sourceip))
                        elif item[1] == "Next Hop":
                            routingwb.write(routing_counter,
                                            index,
                                            str(staticroute["gateway"]))
                        elif item[1] == "Interface":
                            routingwb.write(routing_counter,
                                            index,
                                            str(staticroute["wanInterface"]))
                        elif item[1] == "VLAN":
                            routingwb.write(routing_counter,
                                            index,
                                            str(static_vlan))
                        elif item[1] == "Cost":
                            routingwb.write(routing_counter,
                                            index,
                                            str(staticroute["cost"]))
                        elif item[1] == "Prefered":
                            if "preferred" in staticroute:
                                routingwb.write(routing_counter,
                                                index,
                                                str(staticroute["preferred"]))
                        elif item[1] == "Advertise":
                            routingwb.write(routing_counter,
                                            index,
                                            str(staticroute["advertise"]))
                        else:
                            continue
                    routing_counter += 1
                print("nat")                
                if "nat" in segment:
                    # LAN NAT source or destination
                    if "rules" in segment["nat"] and segment["nat"]["override"]:
                        for rule in segment["nat"]["rules"]:
                            for index, item in enumerate(data_source_overrideswb):
                                if item[1] == "hostname":
                                    edgeoverrideswb.write(
                                        edgeoverride_counter,
                                        index, str(edge["name"]))
                                elif item[1] == "segment":
                                    edgeoverrideswb.write(
                                        edgeoverride_counter,
                                        index, str(segment[
                                                        "segment"]["name"]))
                                elif item[1] == "NAT type":
                                    edgeoverrideswb.write(
                                        edgeoverride_counter,
                                        index, str(rule["type"]))
                                elif item[1] == "nat description":
                                    edgeoverrideswb.write(
                                        edgeoverride_counter,
                                        index, str(rule["description"]))
                                elif item[1] == "nat source route IP":
                                    edgeoverrideswb.write(
                                        edgeoverride_counter,
                                        index, str(rule["srcCidrIp"]))
                                elif item[1] == "nat source route prefix":
                                    edgeoverrideswb.write(
                                        edgeoverride_counter,
                                        index, str(rule["srcCidrPrefix"]))
                                elif item[1] == "nat destination route IP":
                                    edgeoverrideswb.write(
                                        edgeoverride_counter,
                                        index, str(rule["destCidrIp"]))
                                elif item[1] == "nat destination route prefix":
                                    edgeoverrideswb.write(
                                        edgeoverride_counter,
                                        index, str(rule["destCidrPrefix"]))
                                elif item[1] == "nat inside IP":
                                    edgeoverrideswb.write(
                                        edgeoverride_counter,
                                        index, str(rule["insideCidrIp"]))
                                elif item[1] == "nat inside prefix":
                                    edgeoverrideswb.write(
                                        edgeoverride_counter,
                                        index, str(rule["insideCidrPrefix"]))
                                elif item[1] == "nat inside port":
                                    if rule["insidePort"] == -1:
                                        edgeoverrideswb.write(
                                            edgeoverride_counter,
                                            index, "")
                                    else:
                                        edgeoverrideswb.write(
                                            edgeoverride_counter,
                                            index, str(rule["insidePort"]))
                                elif item[1] == "nat outside IP":
                                    edgeoverrideswb.write(
                                        edgeoverride_counter,
                                        index, str(rule["outsideCidrIp"]))
                                elif item[1] == "nat outside prefix":
                                    edgeoverrideswb.write(
                                        edgeoverride_counter,
                                        index, str(rule["outsideCidrPrefix"]))
                                elif item[1] == "nat outside port":
                                    if rule["outsidePort"] == -1:
                                        edgeoverrideswb.write(
                                            edgeoverride_counter,
                                            index, "")
                                    else:
                                        edgeoverrideswb.write(
                                            edgeoverride_counter,
                                            index, str(rule["outsidePort"]))
                                else:
                                    continue
                            edgeoverride_counter += 1
                    #LAN NAT source AND destination
                    if "rules" in segment["nat"] and segment["nat"]["override"]:
                        for rule in segment["nat"]["dualRules"]:
                            for index, item in enumerate(data_source_overrideswb):
                                if item[1] == "hostname":
                                    edgeoverrideswb.write(
                                        edgeoverride_counter,
                                        index, str(edge["name"]))
                                elif item[1] == "segment":
                                    edgeoverrideswb.write(
                                        edgeoverride_counter,
                                        index, str(segment[
                                                        "segment"]["name"]))
                                elif item[1] == "nats&d description":
                                    edgeoverrideswb.write(
                                        edgeoverride_counter,
                                        index, str(rule["description"]))
                                elif item[1] == "nats&d source inside IP":
                                    edgeoverrideswb.write(
                                        edgeoverride_counter,
                                        index, str(rule["srcInsideCidrIp"]))
                                elif item[1] == "nats&d source inside prefix":
                                    edgeoverrideswb.write(
                                        edgeoverride_counter,
                                        index, str(rule["srcInsideCidrPrefix"]))
                                elif item[1] == "nats&d source outside IP":
                                    edgeoverrideswb.write(
                                        edgeoverride_counter,
                                        index, str(rule["srcOutsideCidrIp"]))
                                elif item[1] == "nats&d source outside prefix":
                                    edgeoverrideswb.write(
                                        edgeoverride_counter,
                                        index, str(rule["srcOutsideCidrPrefix"]))
                                elif item[1] == "nats&d destination inside IP":
                                    edgeoverrideswb.write(
                                        edgeoverride_counter,
                                        index, str(rule["destInsideCidrIp"]))
                                elif item[1] == "nats&d destination inside prefix":
                                    edgeoverrideswb.write(
                                        edgeoverride_counter,
                                        index, str(rule["destInsideCidrPrefix"]))
                                elif item[1] == "nats&d destination outside IP":
                                    edgeoverrideswb.write(
                                        edgeoverride_counter,
                                        index, str(rule["destOutsideCidrIp"]))
                                elif item[1] == "nats&d destination outside prefix":
                                    edgeoverrideswb.write(
                                        edgeoverride_counter,
                                        index, str(rule["destOutsideCidrPrefix"]))
                                else:
                                    continue
                            edgeoverride_counter += 1
                # Cloud VPN
                # nsdgw = []
                # bhhubs = {}
                for segpro in devmodpro["data"]["segments"]:
                    if segpro[
                        "segment"]["segmentId"] == segment[
                            "segment"]["segmentId"]:
                        if "backHaulEdges" in segpro["vpn"]:
                            bhhubs[
                                segment["segment"][
                                    "segmentId"]] = segpro[
                                        "vpn"]["backHaulEdges"]
                        else:
                            bhhubs[
                                segment["segment"][
                                    "segmentId"]] = []
            print("vlans")
            for vlan in devmod["data"
                                     ]["lan"]["networks"]:
                #keeping for debug...
                #print(vlan)
                if "cidrIp" in vlan:
                    cidr_ip = ["", vlan["cidrIp"]][vlan["cidrIp"] is not None]
                else:
                    cidr_ip = ""
                if "cidrPrefix" in vlan:
                    cidrprefix = ["", vlan["cidrPrefix"]][
                        vlan["cidrPrefix"] is not None]
                else:
                    cidrprefix = ""
                if "vlanId" in vlan:
                    vlan_id = ["",
                            vlan["vlanId"]][vlan["vlanId"] is not None]
                else:
                    vlan_id = ""
                if cidr_ip == "":
                    continue
                vlaninterfaces = ""
                if "interfaces" in vlan:
                    for intr in vlan["interfaces"]:
                        vlaninterfaces = vlaninterfaces + " " + intr
                options = ""
                if "dhcp" in vlan and vlan["dhcp"]["options"] is not None:
                    for option in vlan["dhcp"]["options"]:
                        if "metadata" in option:
                            options = options + str(option["metaData"]["name"]) +str(
                                option["value"]) + str(option["option"]) + "; "
                        else:
                            options = options + str(
                                option["value"]) + str(option["option"]) + "; "
                for index, item in enumerate(data_source_lanwb):
                    if item[1] == "hostname":
                        lanwb.write(
                            lan_counter,
                            index,
                            str(edge["name"]))
                    elif item[1] == "LAN IP":
                        lanwb.write(
                            lan_counter,
                            index,
                            str(str(cidr_ip) + "/" + str(cidrprefix)))
                    elif item[1] == "Segment":
                        lanwb.write(
                            lan_counter,
                            index,
                            str(device_segments[vlan["segmentId"]]))
                    elif item[1] == "Interface":
                        lanwb.write(
                            lan_counter,
                            index,
                            str(vlaninterfaces))
                    elif item[1] == "Advertise":
                        lanwb.write(
                            lan_counter,
                            index,
                            str(vlan["advertise"]))
                    elif item[1] == "LAN VLAN":
                        lanwb.write(
                            lan_counter,
                            index,
                            str(vlan_id))
                    elif item[1] == "DHCP mode":
                        if "dhcp" in vlan and vlan["dhcp"]["enabled"]:
                            if "dhcpRelay" in vlan["dhcp"]:
                                lanwb.write(
                                    lan_counter,
                                    index,
                                    "DHCP Relay")
                            else:
                                lanwb.write(
                                    lan_counter,
                                    index,
                                    "DHCP Server")
                    elif item[1] == "DHCP relay servers":
                        if "dhcp" in vlan and vlan["dhcp"]["enabled"]:
                            if "dhcpRelay" in vlan["dhcp"]:
                                lanwb.write(
                                    lan_counter,
                                    index,
                                    str(vlan["dhcp"]["dhcpRelay"]["servers"]))
                    elif item[1] == "DHCP server start IP":
                        if "dhcp" in vlan and vlan["dhcp"]["enabled"]:
                            lanwb.write(
                                lan_counter,
                                index,
                                str(vlan["baseDhcpAddr"]))
                    elif item[1] == "DHCP server num addresses":
                        if "dhcp" in vlan and vlan["dhcp"]["enabled"]:
                            lanwb.write(
                                lan_counter,
                                index,
                                str(vlan["numDhcpAddr"]))
                    elif item[1] == "DHCP server lease time seconds":
                        if "dhcp" in vlan and vlan["dhcp"]["enabled"]:
                            lanwb.write(
                                lan_counter,
                                index,
                                str(vlan["dhcp"]["leaseTimeSeconds"]))
                    elif item[1] == "DHCP server options":
                        lanwb.write(
                            lan_counter,
                            index,
                            str(options))
                    elif item[1] == "override flag":
                        if "override" in vlan:
                            lanwb.write(
                                lan_counter,
                                index,
                                str(vlan["override"]))
                    elif item[1] == "Disabled":
                        if "disabled" in vlan:
                            lanwb.write(
                                lan_counter,
                                index,
                                str(vlan["disabled"]))
                    elif item[1] == "accesstype":
                        continue
                    elif item[1] == "LAN IPv6":
                        continue
                    elif item[1] == "trusted source IPv6":
                        continue
                    elif item[1] == "RPF status IPv6":
                        continue
                    elif item[1] == "trusted source IPv4":
                        continue
                    elif item[1] == "RPF status IPv4":
                        continue
                    else:
                        lanwb.write(
                            lan_counter,
                            index,
                            dotted_key_list(edge, item[0]))
                lan_counter += 1
            print("l3 interface")
            for interface in devmod["data"]["routedInterfaces"]:
                #print(interface)
                if interface["wanOverlay"] == "DISABLED":
                    # do LAN L3 interfaces first
                    print("L3 LAN interface")
                    if "cidrIp" in interface["addressing"]:
                        cidr_ip = [
                            "",
                            interface["addressing"]["cidrIp"]
                        ][interface["addressing"]["cidrIp"] is not None]
                    else:
                        cidr_ip = ""
                    if "gateway" in interface["addressing"]:
                        gateway_ip = [
                            "",
                            interface["addressing"]["gateway"]
                        ][interface["addressing"]["gateway"] is not None]
                    else:
                        gateway_ip = ""
                    if "cidrPrefix" in interface["addressing"]:
                        cidrprefix = ["",
                                    interface["addressing"][
                                        "cidrPrefix"]][interface[
                                            "addressing"][
                                                "cidrPrefix"] is not None]
                    else:
                        cidrprefix = "undefined"
                    if "v6Detail" in interface:
                        if "cidrIp" in interface["v6Detail"]["addressing"]:
                            cidr_ipv6 = ["",
                                    interface["v6Detail"]["addressing"][
                                        "cidrIp"]][interface["v6Detail"][
                                            "addressing"]["cidrIp"] is not None]
                        else:
                            cidr_ipv6 = ""
                        if "cidrPrefix" in interface["v6Detail"]["addressing"]:
                            cidrprefixv6 = ["",
                                        interface["v6Detail"]["addressing"][
                                            "cidrPrefix"]][interface["v6Detail"][
                                                "addressing"][
                                                    "cidrPrefix"] is not None]
                        else:
                            cidrprefixv6 = ""
                    else:
                        cidr_ipv6 = ""
                        cidrprefixv6 = ""
                    if "vlanId" in interface:
                        vlan_id = ["",
                                interface[
                                    "vlanId"]][interface[
                                        "vlanId"] is not None]
                    else:
                        vlan_id = ""
                    if cidr_ip == "" and interface[
                        "addressing"][
                            "type"] == "STATIC" and interface["disableV6"]:
                        continue
                    elif interface["addressing"]["type"] == "DHCP":
                        cidr_ip = "DHCP"
                        cidrprefix = "DHCP"
                    elif "v6Detail" in interface and interface[
                        "v6Detail"]["addressing"][
                            "type"] == "DHCP_STATELESS":
                        cidr_ipv6 = "DHCP"
                        cidrprefixv6 = "DHCP"
                    options = ""
                    if "dhcpServer" in interface and interface["dhcpServer"] is not None and "options" in interface["dhcpServer"] and interface["dhcpServer"]["options"] is not None:
                        for option in interface["dhcpServer"]["options"]:
                            if "metaData" in option:
                                options = options + str(option["metaData"]["name"]) + str(
                                    option["value"]) + str(option["option"]) + "; "
                            else:
                                options = options + str(option["type"]) + str(
                                    option["value"]) + str(option["option"]) + "; "
                    for index, item in enumerate(data_source_lanwb):
                        if item[1] == "hostname":
                            lanwb.write(
                                lan_counter,
                                index,
                                str(edge["name"]))
                        elif item[1] == "LAN IP":
                            lanwb.write(
                                lan_counter,
                                index,
                                str(str(cidr_ip) + "/" + str(cidrprefix)))
                        elif item[1] == "LAN Gateway":
                            lanwb.write(
                                lan_counter,
                                index,
                                str(gateway_ip))
                        elif item[1] == "LAN IPv6":
                            lanwb.write(
                                lan_counter,
                                index,
                                str(str(cidr_ipv6) + "/" + str(cidrprefixv6)))
                        elif item[1] == "Segment":
                            lanwb.write(
                                lan_counter,
                                index,
                                str(device_segments[
                                    interface["segmentId"]]))
                        elif item[1] == "LAN VLAN":
                            lanwb.write(
                                lan_counter,
                                index,
                                str(vlan_id))
                        elif item[1] == "DHCP mode":
                            if "dhcpServer" in interface and interface["dhcpServer"] is not None and interface["dhcpServer"]["enabled"]:
                                if "dhcpRelay" in interface["dhcpServer"]:
                                    lanwb.write(
                                        lan_counter,
                                        index,
                                        "DHCP Relay")
                                else:
                                    lanwb.write(
                                        lan_counter,
                                        index,
                                        "DHCP Server")
                        elif item[1] == "DHCP relay servers":
                            if "dhcpServer" in interface and interface["dhcpServer"] is not None and interface["dhcpServer"]["enabled"]:
                                if "dhcpRelay" in interface["dhcpServer"]:
                                    lanwb.write(
                                        lan_counter,
                                        index,
                                        str(interface["dhcpServer"]["dhcpRelay"]["servers"]))
                        elif item[1] == "DHCP server start IP":
                            if "dhcpServer" in interface and interface["dhcpServer"] is not None and interface["dhcpServer"]["enabled"]:
                                lanwb.write(
                                    lan_counter,
                                    index,
                                    str(interface["dhcpServer"]["baseDhcpAddr"]))
                        elif item[1] == "DHCP server num addresses":
                            if "dhcpServer" in interface and interface["dhcpServer"] is not None and interface["dhcpServer"]["enabled"]:
                                lanwb.write(
                                    lan_counter,
                                    index,
                                    str(interface["dhcpServer"]["numDhcpAddr"]))
                        elif item[1] == "DHCP server lease time seconds":
                            if "dhcpServer" in interface and interface["dhcpServer"] is not None and interface["dhcpServer"]["enabled"]:
                                lanwb.write(
                                    lan_counter,
                                    index,
                                    str(interface["dhcpServer"]["leaseTimeSeconds"]))
                        elif item[1] == "DHCP server options":
                            lanwb.write(
                                lan_counter,
                                index,
                                str(options))
                        elif item[1] == "accesstype":
                            if interface["l2"]["autonegotiation"]:
                                lanwb.write(lan_counter,
                                                index, str("auto/auto"))
                            else:
                                lanwb.write(
                                    lan_counter,
                                    index,
                                    str(str(interface["l2"]["speed"]) + " "
                                        + str(interface["l2"]["duplex"])))
                        elif item[1] == "trusted source IPv4":
                            if "trusted" in interface:
                                lanwb.write(
                                    lan_counter,
                                    index,
                                    dotted_key_list(interface, item[0]))
                        elif item[1] == "trusted source IPv6":
                            if "v6Detail" in interface and "trusted" in interface["v6Detail"]:
                                lanwb.write(
                                    lan_counter,
                                    index,
                                    dotted_key_list(interface, item[0]))
                        elif item[1] == "override flag":
                            if "override" in interface:
                                lanwb.write(
                                    lan_counter,
                                    index,
                                    dotted_key_list(interface, item[0]))
                        elif item[1] == "RPF status IPv4":
                            if "rpf" in interface:
                                lanwb.write(
                                    lan_counter,
                                    index,
                                    dotted_key_list(interface, item[0]))
                        elif item[1] == "RPF status IPv6":
                            if "v6Detail" in interface and "rpf" in interface["v6Detail"]:
                                lanwb.write(
                                    lan_counter,
                                    index,
                                    dotted_key_list(interface, item[0]))
                        else:
                            lanwb.write(
                                lan_counter,
                                index,
                                dotted_key_list(interface, item[0]))
                    lan_counter += 1
                    if interface["ospf"]["enabled"]:
                        for index, item in enumerate(ds_routingwb):
                            if item[1] == "hostname":
                                routingwb.write(
                                    routing_counter,
                                    index,
                                    str(edge["name"]))
                            elif item[1] == "Segment":
                                routingwb.write(
                                    routing_counter,
                                    index,
                                    str(device_segments[
                                        interface["segmentId"]]))
                            elif item[1] == "interface":
                                routingwb.write(
                                    routing_counter,
                                    index,
                                    str(interface["name"]))
                            elif item[1] == "OSPF area":
                                routingwb.write(
                                    routing_counter,
                                    index,
                                    str(interface["ospf"]["area"][0]))
                            else:
                                continue
                        routing_counter += 1
                else:
                    print("L3 WAN interface")                    
                    # WAN interface
                    if interface["addressing"]["type"] == "DHCP":
                        cidr_ip = "DHCP"
                        cidrprefix = "DHCP"
                        gatewayip = "DHCP"
                    elif interface["addressing"]["type"] == "PPPOE":
                        cidr_ip = "4h15xbfr@bellnet.ca"
                        cidrprefix = "PPPOE"
                        gatewayip = "PPPOE"
                    else:
                        if "cidrIp" in interface["addressing"]:
                            cidr_ip = ["", interface[
                                "addressing"]["cidrIp"]][
                                    interface["addressing"]["cidrIp"] is not None]
                        else:
                            cidr_ip = ""
                        if "cidrPrefix" in interface["addressing"]:
                            cidrprefix = ["", interface[
                                "addressing"]["cidrPrefix"]][
                                    interface[
                                        "addressing"]["cidrPrefix"] is not None]
                        else:
                            cidrprefix = ""
                        if "gateway" in interface["addressing"]:
                            gatewayip = ["", interface[
                                "addressing"]["gateway"]][
                                    interface["addressing"]["gateway"] is not None]
                        else:
                            gatewayip = ""
                    if "vlanId" in interface:
                        vlan_id = ["",
                                interface[
                                    "vlanId"]][interface["vlanId"] is not None]
                    else:
                        vlan_id = ""
                    if interface["v6Detail"]["addressing"]["type"] == "DHCP_STATELESS":
                        cidr_ipv6 = "DHCP"
                        cidrprefixv6 = "DHCP"
                        gatewayipv6 = "DHCP"
                    elif "v6Detail" in interface:
                        if "cidrIp" in interface["v6Detail"]["addressing"]:
                            cidr_ipv6 = ["", interface["v6Detail"][
                                "addressing"]["cidrIp"]][
                                    interface["v6Detail"]["addressing"]["cidrIp"] is not None]
                        else:
                            cidr_ipv6 = ""
                        if "cidrPrefix" in interface["v6Detail"]["addressing"]:
                            cidrprefixv6 = ["", interface["v6Detail"][
                                "addressing"]["cidrPrefix"]][
                                    interface["v6Detail"][
                                        "addressing"]["cidrPrefix"] is not None]
                        else:
                            cidrprefixv6 = ""
                        gatewayipv6 = ["", interface["v6Detail"][
                            "addressing"]["gateway"]][
                                interface["v6Detail"]["addressing"]["gateway"] is not None]
                    else:
                        cidr_ipv6 = ""
                        cidrprefixv6 = ""
                        gatewayipv6 = ""
                    if cidr_ip == "" and interface[
                        "addressing"][
                            "type"] == "STATIC" and "disableV6" in interface and interface[
                                "disableV6"]:
                        continue
                    for index, item in enumerate(ds_circuitwb):
                        if item[1] == "hostname":
                            circuitwb.write(
                                circuit_counter, index, str(edge["name"]))
                        elif item[1] == "interface":
                            circuitwb.write(
                                circuit_counter, index, str(interface["name"]))
                        elif item[1] == "override flag":
                            if "override" in interface:
                                circuitwb.write(
                                    circuit_counter, index, str(interface["override"]))
                        elif item[1] == "gateway":
                            circuitwb.write(
                                circuit_counter, index, str(gatewayip))
                        elif item[1] == "ipv6 gateway":
                            circuitwb.write(
                                circuit_counter, index, str(gatewayipv6))
                        elif item[1] == "IPv6":
                            circuitwb.write(
                                circuit_counter, index, str(str(f"{cidr_ipv6}/{cidrprefixv6}")))
                        elif item[1] == "vlan":
                            circuitwb.write(
                                circuit_counter, index, str(vlan_id))
                        elif item[1] == "trusted source IPv4":
                            if "trusted" in interface:
                                circuitwb.write(
                                    circuit_counter, index, str(interface["trusted"]))
                        elif item[1] == "trusted source IPv6":
                            if "v6Detail" in interface and "trusted" in interface["v6Detail"]:
                                circuitwb.write(
                                    circuit_counter, index, str(interface["v6Detail"]["trusted"]))
                        elif item[1] == "RPF status IPv4":
                            if "rpf" in interface:
                                circuitwb.write(
                                    circuit_counter, index, str(interface["rpf"]))
                        elif item[1] == "RPF status IPv6":
                            if "v6Detail" in interface and "rpf" in interface["v6Detail"]:
                                circuitwb.write(
                                    circuit_counter, index, str(interface["v6Detail"]["rpf"]))
                        elif item[1] == "IP":
                            circuitwb.write(
                                circuit_counter, index,
                                str(f"{cidr_ip}/{cidrprefix}"))
                        elif item[1] == "Disabled":
                            if "disabled" in interface:
                                circuitwb.write(
                                    circuit_counter,
                                    index, str(interface["disabled"]))
                        elif item[1] == "natDirect":
                            if "natDirect" in interface:
                                circuitwb.write(
                                    circuit_counter,
                                    index, str(interface["natDirect"]))
                        elif item[1] == "accesstype":
                            if interface["l2"]["autonegotiation"]:
                                circuitwb.write(circuit_counter,
                                                index, str("auto/auto"))
                            else:
                                circuitwb.write(
                                    circuit_counter,
                                    index,
                                    str(str(interface["l2"]["speed"]) + " "
                                        + str(interface["l2"]["duplex"])))
                        elif item[1] == "OSPF area":
                            if interface["ospf"]["enabled"]:
                                circuitwb.write(
                                    circuit_counter,
                                    index, str(interface[
                                        "ospf"]["area"][0]))
                        else:
                            continue
                    print("L3 WAN intereface link")
                    circuit_counter += 1
                    if "links" in wanmod["data"]:
                        for link in wanmod["data"]["links"]:
                            if "interface" in link:
                                if interface["name"] == link["interface"]:
                                    if "downstreamMbps" in link:
                                        download = [
                                            "measure",
                                            link[
                                                "downstreamMbps"
                                                ]
                                            ][link[
                                                    "downstreamMbps"] is not None]
                                    else:
                                        download = "measure"
                                    if "upstreamMbps" in link:
                                        upload = [
                                            "measure",
                                            link[
                                                "upstreamMbps"
                                                ]
                                            ][link[
                                                    "upstreamMbps"] is not None]
                                    else:
                                        upload = "measure"
                                    if link["mode"] == "PRIVATE":
                                        sourceip = [
                                            cidr_ip,
                                            link["publicIpAddress"]][link[
                                                "publicIpAddress"] is not None]
                                    else:
                                        if "sourceIpAddress" in link:
                                            sourceip = [
                                                cidr_ip,
                                                link["sourceIpAddress"]][link[
                                                    "sourceIpAddress"] is not None]
                                        else:
                                            sourceip = [cidr_ip]
                                    if "nextHopIpAddress" in link:
                                        nexthop = [
                                            gatewayip,
                                            link[
                                                "nextHopIpAddress"]
                                            ][link[
                                                "nextHopIpAddress"] is not None]
                                    else:
                                        nexthop = [gatewayip]
                                    if "vlanId" in link:
                                        link_vlan = ["",
                                                    link["vlanId"]][link[
                                                        "vlanId"] is not None]
                                    else:
                                        link_vlan = ""
                                    if link_vlan == "0":
                                        link_vlan = ""
                                    for index, item in enumerate(ds_circuitwb):
                                        if item[1] == "hostname":
                                            circuitwb.write(
                                                circuit_counter,
                                                index, str(edge["name"]))
                                        elif item[1] == "interface":
                                            circuitwb.write(
                                                circuit_counter,
                                                index, str(interface["name"]))
                                        elif item[1] == "download":
                                            circuitwb.write(
                                                circuit_counter,
                                                index, str(download))
                                        elif item[1] == "upload":
                                            circuitwb.write(
                                                circuit_counter,
                                                index, str(upload))
                                        elif item[1] == "IP":
                                            if link["addressingVersion"] == "IPv4":
                                                circuitwb.write(
                                                    circuit_counter,
                                                    index, str(sourceip))
                                        elif item[1] == "gateway":
                                            if link["addressingVersion"] == "IPv4":
                                                circuitwb.write(
                                                    circuit_counter,
                                                    index, str(nexthop))
                                        elif item[1] == "IPv6":
                                            if link["addressingVersion"] == "IPv6":
                                                circuitwb.write(
                                                    circuit_counter,
                                                    index, str(sourceip))
                                        elif item[1] == "IPv6 gateway":
                                            if link["addressingVersion"] == "IPv6":
                                                circuitwb.write(
                                                    circuit_counter,
                                                    index, str(nexthop))
                                        elif item[1] == "vlan":
                                            circuitwb.write(
                                                circuit_counter,
                                                index, str(link_vlan))
                                        elif item[1] == "OSPF area":
                                            continue
                                        elif item[1] == "override flag":
                                            continue
                                        elif item[1] == "Disabled":
                                            if "disabled" in interface:
                                                circuitwb.write(
                                                    circuit_counter,
                                                    index, str(interface["disabled"]))
                                        elif item[1] == "trusted source IPv4":
                                            continue
                                        elif item[1] == "trusted source IPv6":
                                            continue
                                        elif item[1] == "RPF status IPv4":
                                            continue
                                        elif item[1] == "RPF status IPv6":
                                            continue
                                        elif item[1] == "accesstype":
                                            if interface[
                                                "l2"][
                                                    "autonegotiation"]:
                                                circuitwb.write(
                                                    circuit_counter,
                                                    index, str("auto/auto"))
                                            else:
                                                circuitwb.write(
                                                    circuit_counter,
                                                    index,
                                                    str(str(interface[
                                                        "l2"]["speed"]) + " "
                                                        + str(interface[
                                                            "l2"]["duplex"])))
                                        else:
                                            circuitwb.write(
                                                circuit_counter,
                                                index,
                                                dotted_key_list(link, item[0]))
                            elif len(link["interfaces"]) == 0:
                                continue
                            elif interface["name"] in link["interfaces"]:
                                if "downstreamMbps" in link:
                                    download = ["measure",
                                                link["downstreamMbps"]][link[
                                                    "downstreamMbps"] is not None]
                                else:
                                    download = "measure"
                                if "upstreamMbps" in link:
                                    upload = ["measure",
                                            link["upstreamMbps"]][link[
                                                "upstreamMbps"] is not None]
                                else:
                                    upload = "measure"
                                if link["mode"] == "PRIVATE":
                                    sourceip = [
                                        cidr_ip, link["publicIpAddress"]][link[
                                            "publicIpAddress"] is not None]
                                else:
                                    if "sourceIpAddress" in link:
                                        sourceip = [
                                            cidr_ip, link["sourceIpAddress"]][link[
                                                "sourceIpAddress"] is not None]
                                    else:
                                        sourceip = [cidr_ip]
                                if "nextHopIpAddress" in link:
                                    nexthop = [gatewayip,
                                            link["nextHopIpAddress"]][link[
                                                "nextHopIpAddress"] is not None]
                                else:
                                    nexthop = [gatewayip]
                                if "vlanId" in link:
                                    link_vlan = ["",
                                                link["vlanId"]][link[
                                                    "vlanId"] is not None]
                                else:
                                    link_vlan = ""
                                if link_vlan == "0":
                                    link_vlan = ""
                                if "dynamicBwAdjustmentEnabled" in link:
                                    dynamicBwAdjustmentEnabled = link["dynamicBwAdjustmentEnabled"]
                                for index, item in enumerate(ds_circuitwb):
                                    if item[1] == "hostname":
                                        circuitwb.write(
                                            circuit_counter,
                                            index,
                                            str(edge["name"]))
                                    elif item[1] == "interface":
                                        circuitwb.write(
                                            circuit_counter,
                                            index, str(interface["name"]))
                                    elif item[1] == "download":
                                        circuitwb.write(
                                            circuit_counter,
                                            index, str(download))
                                    elif item[1] == "upload":
                                        circuitwb.write(
                                            circuit_counter,
                                            index, str(upload))
                                    elif item[1] == "IP":
                                        if link["addressingVersion"] == "IPv4":
                                            circuitwb.write(
                                                circuit_counter,
                                                index, str(sourceip))
                                    elif item[1] == "gateway":
                                        if link["addressingVersion"] == "IPv4":
                                            circuitwb.write(
                                                circuit_counter,
                                                index, str(nexthop))
                                    elif item[1] == "IPv6":
                                        if link["addressingVersion"] == "IPv6":
                                            circuitwb.write(
                                                circuit_counter,
                                                index, str(sourceip))
                                    elif item[1] == "IPv6 gateway":
                                        if link["addressingVersion"] == "IPv6":
                                            circuitwb.write(
                                                circuit_counter,
                                                index, str(nexthop))
                                    elif item[1] == "vlan":
                                        circuitwb.write(
                                            circuit_counter,
                                            index, str(link_vlan))
                                    elif item[1] == "Disabled":
                                        if "disabled" in interface:
                                            circuitwb.write(
                                                circuit_counter,
                                                index, str(interface["disabled"]))
                                    elif item[1] == "OSPF area":
                                        continue
                                    elif item[1] == "override flag":
                                        continue
                                    elif item[1] == "trusted source IPv4":
                                        continue
                                    elif item[1] == "trusted source IPv6":
                                        continue
                                    elif item[1] == "RPF status IPv4":
                                        continue
                                    elif item[1] == "RPF status IPv6":
                                        continue
                                    elif item[1] == "accesstype":
                                        if interface["l2"]["autonegotiation"]:
                                            circuitwb.write(
                                                circuit_counter,
                                                index, str("auto/auto"))
                                        else:
                                            circuitwb.write(
                                                circuit_counter,
                                                index,
                                                str(str(interface["l2"][
                                                    "speed"])
                                                    + " " + str(interface[
                                                        "l2"]["duplex"])))
                                    else:
                                        circuitwb.write(
                                            circuit_counter,
                                            index,
                                            dotted_key_list(link,
                                                            item[0]))
                                circuit_counter += 1
                                # counters
                                if link["mode"] == "PUBLIC":
                                    publiclinks += 1
                                    if link["type"] != "WIRED":
                                        ltelinks += 1
                                elif link["mode"] == "PRIVATE":
                                    privatelinks += 1
                if "subinterfaces" in interface:
                    for subinterface in interface["subinterfaces"]:
                        if "cidrIp" in subinterface["addressing"]:
                            cidr_ip = [
                                "",
                                subinterface["addressing"]["cidrIp"]
                            ][subinterface["addressing"]["cidrIp"] is not None]
                        else:
                            cidr_ip = ""
                        if "gateway" in subinterface["addressing"]:
                            gateway_ip = [
                                "",
                                subinterface["addressing"]["gateway"]
                            ][subinterface["addressing"]["gateway"] is not None]
                        else:
                            gateway_ip = ""
                        if "cidrPrefix" in subinterface["addressing"]:
                            cidrprefix = ["",
                                        subinterface["addressing"][
                                            "cidrPrefix"]][subinterface[
                                                "addressing"][
                                                    "cidrPrefix"] is not None]
                        else:
                            cidrprefix = ""
                        if "v6Detail" in subinterface:
                            if "cidrIp" in subinterface["v6Detail"]["addressing"]:
                                cidr_ipv6 = ["",
                                        subinterface["v6Detail"]["addressing"][
                                            "cidrIp"]][subinterface["v6Detail"][
                                                "addressing"]["cidrIp"] is not None]
                            else:
                                cidr_ipv6 = ""
                            if "cidrPrefix" in subinterface["v6Detail"]["addressing"]: 
                                cidrprefixv6 = ["",
                                            subinterface["v6Detail"]["addressing"][
                                                "cidrPrefix"]][subinterface["v6Detail"][
                                                    "addressing"][
                                                        "cidrPrefix"] is not None]
                            else:
                                cidrprefixv6 = ""
                        else:
                            cidr_ipv6 = ""
                            cidrprefixv6 = ""
                        if "vlanId" in subinterface:
                            vlan_id = ["",
                                    subinterface[
                                        "vlanId"]][subinterface[
                                            "vlanId"] is not None]
                        else:
                            vlan_id = ""
                        if "SUB_INTERFACE" in subinterface["subinterfaceType"]:
                            if cidr_ip == "" and subinterface[
                                "addressing"][
                                    "type"] == "STATIC" and subinterface["disableV6"]:
                                continue
                            elif subinterface["addressing"]["type"] == "DHCP":
                                cidr_ip = "DHCP"
                                cidrprefix = "DHCP"
                            options = ""
                        if "dhcpServer" in subinterface and subinterface["dhcpServer"] is not None and subinterface["dhcpServer"]["enabled"] and subinterface["dhcpServer"]["options"] is not None:
                            for option in subinterface["dhcpServer"]["options"]:
                                if "metaData" in option:
                                    options = options + str(option["metaData"]["name"]) + str(
                                        option["value"]) + str(option["option"]) + "; "
                                else:
                                    options = options + str(option["type"]) + str(
                                        option["value"]) + str(option["option"]) + "; "
                        for index, item in enumerate(data_source_lanwb):
                            if item[1] == "hostname":
                                lanwb.write(
                                    lan_counter,
                                    index,
                                    str(edge["name"]))
                            elif item[1] == "LAN IP":
                                lanwb.write(
                                    lan_counter,
                                    index,
                                    str(f"{cidr_ip}/{cidrprefix}"))
                            elif item[1] == "LAN Gateway":
                                lanwb.write(
                                    lan_counter,
                                    index,
                                    str(gateway_ip))
                            elif item[1] == "advertise":
                                    lanwb.write(
                                    lan_counter,
                                    index,
                                    str(subinterface["advertise"]))
                            elif item[1] == "natDirect":
                                    lanwb.write(
                                    lan_counter,
                                    index,
                                    str(subinterface["natDirect"]))
                            elif item[1] == "LAN IPv6":
                                lanwb.write(
                                    lan_counter,
                                    index,
                                    str(f"{cidr_ipv6}/{cidrprefixv6}"))
                            elif item[1] == "Interface":
                                lanwb.write(
                                    lan_counter,
                                    index,
                                    str(interface["name"] + "."
                                        + str(subinterface[
                                            "subinterfaceId"])))
                            elif item[1] == "Segment":
                                lanwb.write(
                                    lan_counter,
                                    index,
                                    str(device_segments[
                                        subinterface["segmentId"]]))
                            elif item[1] == "LAN VLAN":
                                lanwb.write(
                                    lan_counter,
                                    index,
                                    str(vlan_id))
                            elif item[1] == "DHCP mode":
                                if "dhcpServer" in subinterface and subinterface[
                                    "dhcpServer"] and subinterface[
                                        "dhcpServer"]["enabled"]:
                                    if "dhcpRelay" in subinterface["dhcpServer"]:
                                        lanwb.write(
                                            lan_counter,
                                            index,
                                            "DHCP Relay")
                                    else:
                                        lanwb.write(
                                            lan_counter,
                                            index,
                                            "DHCP Server")
                            elif item[1] == "DHCP relay servers":
                                if "dhcpServer" in subinterface and subinterface[
                                    "dhcpServer"] and subinterface[
                                        "dhcpServer"]["enabled"]:
                                    if "dhcpRelay" in subinterface["dhcpServer"]:
                                        lanwb.write(
                                            lan_counter,
                                            index,
                                            str(subinterface["dhcpServer"]["dhcpRelay"]["servers"]))
                            elif item[1] == "DHCP server start IP":
                                if "dhcpServer" in subinterface and subinterface[
                                    "dhcpServer"] and subinterface[
                                        "dhcpServer"]["enabled"]:
                                    lanwb.write(
                                        lan_counter,
                                        index,
                                        str(subinterface["dhcpServer"]["baseDhcpAddr"]))
                            elif item[1] == "DHCP server num addresses":
                                if "dhcpServer" in subinterface and subinterface[
                                    "dhcpServer"] and subinterface[
                                        "dhcpServer"]["enabled"]:
                                    lanwb.write(
                                        lan_counter,
                                        index,
                                        str(subinterface["dhcpServer"]["numDhcpAddr"]))
                            elif item[1] == "DHCP server lease time seconds":
                                if "dhcpServer" in subinterface and subinterface[
                                    "dhcpServer"] and subinterface[
                                        "dhcpServer"]["enabled"]:
                                    lanwb.write(
                                        lan_counter,
                                        index,
                                        str(subinterface["dhcpServer"]["leaseTimeSeconds"]))
                            elif item[1] == "DHCP server options":
                                lanwb.write(
                                    lan_counter,
                                    index,
                                    str(options))
                            elif item[1] == "accesstype":
                                continue
                            elif item[1] == "override flag":
                                if "override" in subinterface:
                                    lanwb.write(
                                        lan_counter,
                                        index,
                                        str(dotted_key_list(subinterface, item[0])))
                            elif item[1] == "trusted source IPv4":
                                if "trusted" in interface:
                                    lanwb.write(
                                        lan_counter,
                                        index,
                                        dotted_key_list(subinterface, item[0]))
                            elif item[1] == "RPF status IPv4":
                                if "rpf" in interface:
                                    lanwb.write(
                                        lan_counter,
                                        index,
                                        dotted_key_list(subinterface, item[0]))
                            elif item[1] == "trusted source IPv6":
                                if "v6Detail" in subinterface and "trusted" in subinterface[
                                    "v6Detail"]:
                                    lanwb.write(
                                        lan_counter,
                                        index,
                                        dotted_key_list(subinterface, item[0]))
                            elif item[1] == "RPF status IPv6":
                                if "v6Detail" in subinterface and "rpf" in subinterface["v6Detail"]:
                                    lanwb.write(
                                        lan_counter,
                                        index,
                                        dotted_key_list(subinterface, item[0]))
                            else:
                                lanwb.write(
                                    lan_counter,
                                    index,
                                    dotted_key_list(subinterface, item[0]))
                        lan_counter += 1
                        if subinterface["subinterfaceType"] == "SUB_INTERFACE":
                            if "ospf" in subinterface and subinterface["ospf"]["enabled"]:
                                for index, item in enumerate(ds_routingwb):
                                    if item[1] == "hostname":
                                        routingwb.write(
                                            routing_counter,
                                            index,
                                            str(edge["name"]))
                                    elif item[1] == "Segment":
                                        routingwb.write(
                                            routing_counter,
                                            index,
                                            str(device_segments[
                                                subinterface["segmentId"]]))
                                    elif item[1] == "interface":
                                        routingwb.write(
                                            routing_counter,
                                            index,
                                            str(interface["name"] + "."
                                                + str(subinterface[
                                                    "subinterfaceId"])))
                                    elif item[1] == "OSPF area":
                                        routingwb.write(
                                            routing_counter,
                                            index,
                                            str(subinterface[
                                                "ospf"]["area"]))
                                    else:
                                        continue
                                routing_counter += 1
            print("links")
            if "links" in wanmod["data"]:
                for link in wanmod["data"]["links"]:
                    if len(link["interfaces"]) > 0:
                        for intrfc in link["interfaces"]:
                            if str(intrfc).startswith("USB"):
                                public_address = [
                                    "", link["publicIpAddress"]][link[
                                        "publicIpAddress"] is not None]
                                for index, item in enumerate(ds_circuitwb):
                                    if item[1] == "hostname":
                                        circuitwb.write(
                                            circuit_counter,
                                            index,
                                            str(edge["name"]))
                                    elif item[1] == "segment":
                                        circuitwb.write(
                                            circuit_counter,
                                            index, str(link["interfaces"]))
                                    elif item[1] == "download":
                                        continue
                                    elif item[1] == "gateway":
                                        continue
                                    elif item[1] == "override flag":
                                        continue
                                    elif item[1] == "vlan":
                                        continue
                                    elif item[1] == "accesstype":
                                        continue
                                    elif item[1] == "OSPF area":
                                        continue
                                    elif item[1] == "upload":
                                        continue
                                    elif item[1] == "IPv6":
                                        continue
                                    elif item[1] == "IPv6 gateway":
                                        continue
                                    elif item[1] == "trusted source IPv4":
                                        continue
                                    elif item[1] == "trusted source IPv6":
                                        continue
                                    elif item[1] == "RPF status IPv4":
                                        continue
                                    elif item[1] == "RPF status IPv6":
                                        continue
                                    elif item[1] == "IP":
                                        circuitwb.write(
                                            circuit_counter,
                                            index, str(public_address))
                                    else:
                                        circuitwb.write(
                                            circuit_counter,
                                            index,
                                            dotted_key_list(link, item[0]))
                                circuit_counter += 1
            print("loopbacks")
            if "loopbackInterfaces" in devmod["data"]:
                for _idx, (loop, data) in enumerate(devmod["data"]["loopbackInterfaces"].items()):
                    for index, item in enumerate(ds_loopwb):
                        if item[1] == "hostname":
                            loopwb.write(
                                loop_counter,
                                index,
                                str(edge["name"]))
                        elif item[1] == "segment":
                            loopwb.write(
                                loop_counter,
                                index, str(device_segments[data["segmentId"]]))
                        elif item[1] == "name":
                            loopwb.write(
                                loop_counter,
                                index, str(loop))
                        elif item[1] == "ipv4 advertised":
                            if "advertise" in data:
                                loopwb.write(
                                    loop_counter,
                                    index,
                                    dotted_key_list(data, item[0]))
                        elif item[1] == "ipv6 advertised":
                            if "advertise" in data["v6Detail"]:
                                loopwb.write(
                                    loop_counter,
                                    index,
                                    dotted_key_list(data, item[0]))
                        else:
                            loopwb.write(
                                loop_counter,
                                index,
                                dotted_key_list(data, item[0]))
                    loop_counter += 1
        ntp_servers = ""
        if "ntp" in devmod["data"] and "servers" in devmod["data"]["ntp"]:
            ntp_servers = [server['server'] for server in devmod["data"]["ntp"]["servers"]]
            for index, item in enumerate(data_source_overrideswb):
                if item[1] == "hostname":
                        edgeoverrideswb.write(
                            edgeoverride_counter, index, str(edge["name"]))
                elif item[1] == "ntp servers":
                    edgeoverrideswb.write(edgeoverride_counter, index, ', '.join(ntp_servers))
            edgeoverride_counter += 1
        print("firewall module")
        if (firmod != "") and (
                "data" in firmod):
            override_ssh = ""
            override_snmp = ""
            override_ui = ""
            override_fw = ""
            if "services" in firmod["data"]:
                if firmod["data"]["services"]["ssh"]["enabled"]:
                    networks = ""
                    for ip1 in firmod[
                        "data"]["services"][
                            "ssh"]["allowSelectedIp"]:
                        networks += ip1 + ","
                    if networks == "":
                        override_ssh = "allow ALL LAN"
                    else:
                        override_ssh = networks
                else:
                    override_ssh = "Deny all"
                if firmod["data"]["services"]["snmp"]["enabled"]:
                    networks = ""
                    for ip1 in firmod[
                        "data"]["services"][
                            "snmp"]["allowSelectedIp"]:
                        networks += ip1 + ","
                    if networks == "":
                        override_snmp = "allow ALL LAN"
                    else:
                        override_snmp = networks
                else:
                    override_snmp = "Deny all"
                if firmod["data"]["services"]["localUi"]["enabled"]:
                    networks = ""
                    for ip1 in firmod[
                        "data"]["services"][
                            "localUi"]["allowSelectedIp"]:
                        networks += ip1 + ","
                    if networks == "":
                        override_ui = "port: " + str(
                            firmod["data"]["services"][
                                "localUi"]["portNumber"]) + " allow ALL LAN"
                    else:
                        override_ui = "port: " + str(
                            firmod["data"]["services"][
                                "localUi"]["portNumber"]) + " " + networks
                else:
                    override_ui = "port: " + str(
                        firmod["data"]["services"]["localUi"][
                            "portNumber"]) + " deny All"
                override_fw = "disabled"
                if "firewall_enabled" in firmod["data"]:
                    if firmod["data"]["firewall_enabled"]:
                        override_fw = "enabled"                        
                for index, item in enumerate(data_source_overrideswb):
                    if item[1] == "hostname":
                        edgeoverrideswb.write(
                            edgeoverride_counter, index, str(edge["name"]))
                    elif item[1] == "Firewall enabled":
                        edgeoverrideswb.write(
                            edgeoverride_counter, index, str(override_fw))
                    elif item[1] == "Support access":
                        edgeoverrideswb.write(
                            edgeoverride_counter, index, str(override_ssh))
                    elif item[1] == "SNMP Access":
                        edgeoverrideswb.write(
                            edgeoverride_counter, index, str(override_snmp))
                    elif item[1] == "Web UI":
                        edgeoverrideswb.write(
                            edgeoverride_counter, index, str(override_ui))
                    else:
                        continue
                edgeoverride_counter += 1
            if "segments" in firmod["data"]:
                for fw_segment in firmod["data"]["segments"]:
                    if "outbound" in fw_segment:
                        for fwrule in fw_segment["outbound"]:
                            parsed = parse_fw_rule(fwrule, dpi_apps)
                            sourceinfo = "prefix: " + parsed[
                                "srcip"] + parsed[
                                    "srcmask"] + " vlan:" + parsed[
                                        "svlan"] + " port:" + parsed["srcport"]
                            destinationinfo = "prefix: " + parsed[
                                "dstip"] + parsed[
                                    "dstmask"] + " vlan:" + parsed[
                                        "dvlan"] + " port:" + parsed["dstport"]
                            for index, item in enumerate(data_source_overrideswb):
                                if item[1] == "hostname":
                                    edgeoverrideswb.write(
                                        edgeoverride_counter, index,
                                        str(edge["name"]))
                                elif item[1] == "segment":
                                    edgeoverrideswb.write(
                                        edgeoverride_counter,
                                        index, str(device_segments[
                                            fw_segment["segment"]["segmentId"]]))
                                elif item[1] == "Outbound rule":
                                    edgeoverrideswb.write(
                                        edgeoverride_counter,
                                        index, str(parsed["name"]))
                                elif item[1] == "Match source":
                                    edgeoverrideswb.write(
                                        edgeoverride_counter,
                                        index, str(sourceinfo))
                                elif item[1] == "Match dest":
                                    edgeoverrideswb.write(
                                        edgeoverride_counter,
                                        index, str(destinationinfo))
                                elif item[1] == "Match Appl":
                                    edgeoverrideswb.write(
                                        edgeoverride_counter, index, str(
                                            parsed["app"]))
                                elif item[1] == "Action":
                                    edgeoverrideswb.write(
                                        edgeoverride_counter, index, str(
                                            parsed["action"]))
                                else:
                                    continue
                            edgeoverride_counter += 1
            # INBOUND firewall rules
            if "inbound" in firmod["data"]:
                for in_rule in firmod["data"]["inbound"]:
                    if in_rule["action"]["type"] == "port_forwarding":
                        parsed = parse_fw_rule(in_rule, dpi_apps)
                        for index, item in enumerate(data_source_overrideswb):
                            if item[1] == "hostname":
                                edgeoverrideswb.write(
                                    edgeoverride_counter, index,
                                    str(edge["name"]))
                            elif item[1] == "segment":
                                edgeoverrideswb.write(
                                    edgeoverride_counter,
                                    index, str(device_segments[
                                        in_rule["action"]["segmentId"]]))
                            elif item[1] == "Name":
                                edgeoverrideswb.write(
                                    edgeoverride_counter,
                                    index, str(parsed["name"]))
                            elif item[1] == "Protocol":
                                edgeoverrideswb.write(
                                    edgeoverride_counter,
                                    index, str(parsed["proto"]))
                            elif item[1] == "Interface":
                                edgeoverrideswb.write(
                                    edgeoverride_counter,
                                    index, str(parsed["interface"]))
                            elif item[1] == "Outside IP":
                                edgeoverrideswb.write(
                                    edgeoverride_counter,
                                    index, str(parsed["dstip"]))
                            elif item[1] == "WAN ports":
                                edgeoverrideswb.write(
                                    edgeoverride_counter,
                                    index, str(parsed["dstport"]))
                            elif item[1] == "LAN IP":
                                edgeoverrideswb.write(
                                    edgeoverride_counter,
                                    index, str(in_rule["action"]["nat"][
                                        "lan_ip"]))
                            elif item[1] == "LAN port":
                                edgeoverrideswb.write(
                                    edgeoverride_counter,
                                    index, str(in_rule["action"]["nat"][
                                        "lan_port"]))
                            elif item[1] == "Remote IP subnet":
                                edgeoverrideswb.write(
                                    edgeoverride_counter,
                                    index,
                                    str(parsed["srcip"] + parsed["srcmask"]))
                            elif item[1] == "Type":
                                edgeoverrideswb.write(
                                    edgeoverride_counter,
                                    index, str(in_rule["action"]["type"]))
                            else:
                                continue
                    else:
                        parsed = parse_fw_rule(in_rule, dpi_apps)
                        for index, item in enumerate(data_source_overrideswb):
                            if item[1] == "hostname":
                                edgeoverrideswb.write(
                                    edgeoverride_counter, index,
                                    str(edge["name"]))
                            elif item[1] == "segment":
                                edgeoverrideswb.write(
                                    edgeoverride_counter,
                                    index, str(device_segments[
                                        in_rule["action"]["segmentId"]]))
                            elif item[1] == "Name":
                                edgeoverrideswb.write(
                                    edgeoverride_counter,
                                    index, str(in_rule["name"]))
                            elif item[1] == "Protocol":
                                edgeoverrideswb.write(
                                    edgeoverride_counter,
                                    index, str(parsed["proto"]))
                            elif item[1] == "Interface":
                                edgeoverrideswb.write(
                                    edgeoverride_counter,
                                    index, str(parsed["interface"]))
                            elif item[1] == "Outside IP":
                                edgeoverrideswb.write(
                                    edgeoverride_counter,
                                    index, str(in_rule["match"]["dip"]))
                            elif item[1] == "traffic source port":
                                edgeoverrideswb.write(
                                    edgeoverride_counter,
                                    index, str(parsed["dstport"]))
                            elif item[1] == "LAN IP":
                                edgeoverrideswb.write(
                                    edgeoverride_counter,
                                    index, str(in_rule["action"]["nat"][
                                        "lan_ip"]))
                            elif item[1] == "Remote IP subnet":
                                edgeoverrideswb.write(
                                    edgeoverride_counter,
                                    index,
                                    str(parsed["srcip"] + parsed["srcmask"]))
                            elif item[1] == "Outbound traffic":
                                if "outbound" in in_rule["action"]["nat"]:
                                    edgeoverrideswb.write(
                                        edgeoverride_counter,
                                        index,
                                        str(in_rule["action"]["nat"]["outbound"]))
                            elif item[1] == "Type":
                                edgeoverrideswb.write(
                                    edgeoverride_counter,
                                    index, str(in_rule["action"]["type"]))
                            else:
                                continue
                    edgeoverride_counter += 1
        print("qos module")
        if (qosmod != "") and (
                "data" in qosmod and "segments" in qosmod["data"]):
            for segment in qosmod["data"]["segments"]:
                for qosrule in segment["rules"]:
                    parsed = parse_business_rule(
                        qosrule,
                        dpi_apps,
                        csssites,
                        bhhubs[segment["segment"]["segmentId"]],
                        nsdgw, object_groups)
                    for index, item in enumerate(data_source_overrideswb):
                        if item[1] == "hostname":
                            edgeoverrideswb.write(
                                edgeoverride_counter,
                                index, str(edge["name"]))
                        elif item[1] == "segment":
                            edgeoverrideswb.write(
                                edgeoverride_counter,
                                index, str(segment["segment"]["name"]))
                        elif item[1] == "Rule # & name":
                            edgeoverrideswb.write(
                                edgeoverride_counter,
                                index, str(parsed["name"]))
                        elif item[1] == "Match Source":
                            edgeoverrideswb.write(
                                edgeoverride_counter,
                                index, str(parsed["src"]))
                        elif item[1] == "Match Dest":
                            edgeoverrideswb.write(
                                edgeoverride_counter,
                                index, str(parsed["dst"]))
                        elif item[1] == "Match Appli":
                            if parsed["app"] == "":
                                continue
                            edgeoverrideswb.write(
                                edgeoverride_counter,
                                index, str(parsed["app"]))
                        elif item[1] == "Action Net Service":
                            edgeoverrideswb.write(
                                edgeoverride_counter,
                                index, str(parsed["netService"]))
                        elif item[1] == "Action Link":
                            edgeoverrideswb.write(
                                edgeoverride_counter,
                                index, str(parsed["actionLink"]))
                        elif item[1] == "Action Prio":
                            edgeoverrideswb.write(
                                edgeoverride_counter,
                                index, str(parsed["actionPri"]))
                        elif item[1] == "Action SRV Class":
                            edgeoverrideswb.write(
                                edgeoverride_counter,
                                index, str(parsed["actionSRVClass"]))
                        elif item[1] == "Action link Preffered":
                            edgeoverrideswb.write(
                                edgeoverride_counter,
                                index, str(parsed["ActionLinkPref"]))
                        elif item[1] == "DSCP inner":
                            edgeoverrideswb.write(
                                edgeoverride_counter,
                                index, str(parsed["dscpInner"]))
                        elif item[1] == "DSCP outer":
                            edgeoverrideswb.write(
                                edgeoverride_counter,
                                index, str(parsed["dscpOuter"]))
                        elif item[1] == "Destination Address Group":
                            edgeoverrideswb.write(
                                edgeoverride_counter,
                                index, str(parsed["dAddressGroup"]))
                        elif item[1] == "Destination Port Group":
                            edgeoverrideswb.write(
                                edgeoverride_counter,
                                index, str(parsed["dPortGroup"]))
                        elif item[1] == "Source Address Group":
                            edgeoverrideswb.write(
                                edgeoverride_counter,
                                index, str(parsed.get("sAddressGroup", "")))
                        elif item[1] == "Source Port Group":
                            edgeoverrideswb.write(
                                edgeoverride_counter,
                                index, str(parsed.get("sPortGroup", "")))
                        else:
                            continue
                    edgeoverride_counter += 1
        logging.debug("MDS report device completed: %s", edge["name"])
    for profile in profiles:
        logging.debug("MDS report profile started: %s", profile["name"])
        devmod = ""
        firmod = ""
        qosmod = ""
        wanmod = ""
        profile_segments = {}
        bhhubs = {}
        nsdgw = []
        csssites = []
        # #preparations - split into modules
        for module in profile["modules"]:
            if module["name"] == "deviceSettings":
                devmod = module
            elif module["name"] == "firewall":
                firmod = module
            elif module["name"] == "QOS":
                qosmod = module
            elif module["name"] == "WAN":
                wanmod = module
        # Device module create segmentlist
        for segment in devmod["data"]["segments"]:
            profile_segments[segment[
                "segment"]["segmentId"]] = segment["segment"]["name"]
        if "deviceSettings:css:provider" in devmod["refs"]:
            if isinstance(
                devmod[
                    "refs"]["deviceSettings:css:provider"], list):
                csssites = devmod[
                        "refs"]["deviceSettings:css:provider"]
            else:
                csssites.append(
                    devmod[
                        "refs"]["deviceSettings:css:provider"])
        if "deviceSettings:vpn:dataCenter" in devmod["refs"]:
            if isinstance(devmod[
                "refs"][
                    "deviceSettings:vpn:dataCenter"], list):
                nsdgw = devmod[
                    "refs"]["deviceSettings:vpn:dataCenter"]
            else:
                nsdgw.append(devmod["refs"][
                        "deviceSettings:vpn:dataCenter"])
        # Device module loop
        for segment in devmod["data"]["segments"]:
            refsegment = []
            if isinstance(
                devmod[
                    "refs"]["deviceSettings:segment"], list):
                for tmpsegment in devmod[
                    "refs"][
                        "deviceSettings:segment"]:
                    if tmpsegment[
                        "data"]["segmentId"] == segment[
                            "segment"]["segmentId"]:
                        refsegment = tmpsegment
            else:
                refsegment = devmod[
                    "refs"]["deviceSettings:segment"]
            # CSS
            for csssite in csssites:
                if refsegment[
                    "logicalId"] == csssite[
                        "segmentLogicalId"]:
                    cssencryption = ""
                    csshash = ""
                    csskeyproto = ""
                    if ("tunnelingProtocol" in segment["css"]["config"]) and (
                        segment[
                            "css"]["config"]["tunnelingProtocol"] == "GRE"):
                        # apparently it is GRE..
                        cssencryption = "GRE"
                        csshash = "GRE"
                    else:
                        csshash = segment[
                            "css"]["config"]["authenticationAlgorithm"]
                        cssencryption = segment[
                            "css"]["config"]["encryptionAlgorithm"]
                        if "IKEPROP" in segment["css"]["config"]:
                            csskeyproto = "IKEv" + str(
                                segment["css"]["config"][
                                    "IKEPROP"]["protocolVersion"])
                    for index, item in enumerate(ds_profileswb):
                        if item[1] == "Profile Name":
                            profileswb.write(
                                profile_counter, index, str(profile["name"]))
                        elif item[1] == "Service name":
                            profileswb.write(
                                profile_counter, index, str(csssite["name"]))
                        elif item[1] == "Service Type":
                            profileswb.write(
                                profile_counter, index, str(csssite[
                                    "data"]["provider"]))
                        elif item[1] == "Primary PoP":
                            profileswb.write(
                                profile_counter, index, str(csssite[
                                    "data"]["config"]["primaryServer"]))
                        elif item[1] == "Secondary PoP":
                            profileswb.write(
                                profile_counter, index, str(csssite[
                                    "data"]["config"]["secondaryServer"]))
                        elif item[1] == "Segment":
                            profileswb.write(
                                profile_counter,
                                index, str(refsegment["name"]))
                        elif item[1] == "Hash":
                            profileswb.write(
                                profile_counter, index, str(csshash))
                        elif item[1] == "Encryption":
                            profileswb.write(
                                profile_counter, index, str(cssencryption))
                        elif item[1] == "Key Exch proto":
                            profileswb.write(
                                profile_counter, index, str(csskeyproto))
                        else:
                            continue
                    profile_counter += 1
            for segpro in devmod["data"]["segments"]:
                if segpro[
                    "segment"]["segmentId"] == segment[
                        "segment"]["segmentId"]:
                    if "backHaulEdges" in segpro["vpn"]:
                        bhhubs[
                            segment["segment"][
                                "segmentId"]] = segpro[
                                    "vpn"]["backHaulEdges"]
                    else:
                        bhhubs[
                            segment["segment"][
                                "segmentId"]] = []
            # BGP
            if "bgp" in segment and segment["bgp"]["enabled"] is not False:
                for bgpsession in segment["bgp"]["neighbors"]:
                    localas = [
                        "",
                        segment["bgp"]["ASN"]][
                            segment["bgp"]["ASN"] is not None]
                    remoteas = [
                        "",
                        bgpsession["neighborAS"]][
                            bgpsession["neighborAS"] is not None]
                    neighborip = [
                        "",
                        bgpsession["neighborIp"]][
                            bgpsession["neighborIp"] is not None]
                    intname = ""
                    if "neighborTag" in bgpsession:
                        bgpneiflag = bgpsession["neighborTag"]
                    else:
                        bgpneiflag = ""
                    if "keepalive" in bgpsession:
                        bgpneikeepalive = bgpsession["keepalive"]
                    else:
                        bgpneikeepalive = ""
                    if "holdtime" in bgpsession:
                        bgpneiholdtime = bgpsession["holdtime"]
                    else:
                        bgpneiholdtime = ""
                    if "enableMd5" in bgpsession:
                        bgpneimd5 = True
                    else:
                        bgpneimd5 = False
                    if "allowAS" in bgpsession:
                        bgpneiallowas = "Enabled"
                    else:
                        bgpneiallowas = ""
                    if "connect" in bgpsession:
                        bgpneiconnect = bgpsession["connect"]
                    else:
                        bgpneiconnect = ""
                    if "defaultRoute" in bgpsession:
                        bgpneidefaultroute = "Enabled"
                    else:
                        bgpneidefaultroute = ""
                    if bgpneimd5:
                        bgpneimd5value = "yes"
                        if "md5Password" in bgpsession:
                            bgpneimd5pass = str(bgpsession["md5Password"])
                        else:
                            bgpneimd5pass = ""
                    else:
                        bgpneimd5value = "no"
                        bgpneimd5pass = ""
                    if (bgpneiflag != "") or (bgpneikeepalive != "") or (
                        bgpneikeepalive != "") or (
                            bgpneiholdtime != "") or (
                                bgpneimd5) or (
                                    bgpneiallowas != "") or (
                                        bgpneiconnect != "") or (
                                            bgpneidefaultroute != ""):
                        bgpadditionaloptions = "yes"
                    else:
                        bgpadditionaloptions = ""
                    inboundbgpfilter = ""
                    for bgpneiprofile in bgpsession[
                        "inboundFilter"][
                            "ids"]:
                        if "filters" in segment["bgp"]:
                            for filters in segment["bgp"]["filters"]:
                                if bgpneiprofile == filters["id"]:
                                    inboundbgpfilter += filters["name"] + "; "
                    outboundbgpfilter = ""
                    for bgpneiprofile in bgpsession[
                        "outboundFilter"][
                            "ids"]:
                        if "filters" in segment["bgp"]:
                            for filters in segment["bgp"]["filters"]:
                                if bgpneiprofile == filters["id"]:
                                    outboundbgpfilter += filters["name"] + "; "
                    for index, item in enumerate(ds_profileswb):
                        if item[1] == "Profile Name":
                            profileswb.write(
                                profile_counter,
                                index, str(profile["name"]))
                        elif item[1] == "Segment":
                            profileswb.write(
                                profile_counter,
                                index, str(segment[
                                                "segment"]["name"]))
                        elif item[1] == "Local ASN":
                            profileswb.write(
                                profile_counter,
                                index, str(localas))
                        elif item[1] == "Remote ASN":
                            profileswb.write(
                                profile_counter,
                                index, str(remoteas))
                        elif item[1] == "Neighbor IP":
                            profileswb.write(
                                profile_counter,
                                index, str(neighborip))
                        elif item[1] == "Inbound Filter":
                            profileswb.write(
                                profile_counter,
                                index, str(inboundbgpfilter))
                        elif item[1] == "Outbound Filter":
                            profileswb.write(
                                profile_counter,
                                index, str(outboundbgpfilter))
                        elif item[1] == "Additional Options":
                            profileswb.write(
                                profile_counter,
                                index,
                                str(bgpadditionaloptions))
                        elif item[1] == "Neighbor Flag:":
                            profileswb.write(
                                profile_counter,
                                index, str(bgpneiflag))
                        elif item[1] == "Neighbor Flag:":
                            profileswb.write(
                                profile_counter,
                                index, str(bgpneiflag))
                        elif item[1] == "Allow AS":
                            profileswb.write(
                                profile_counter,
                                index, str(bgpneiallowas))
                        elif item[1] == "Default route:":
                            profileswb.write(
                                profile_counter,
                                index, str(bgpneidefaultroute))
                        elif item[1] == "Keep Alive:":
                            profileswb.write(
                                profile_counter,
                                index, str(bgpneikeepalive))
                        elif item[1] == "Hold Timer:":
                            profileswb.write(
                                profile_counter,
                                index, str(bgpneiholdtime))
                        elif item[1] == "Connect:":
                            profileswb.write(
                                profile_counter,
                                index, str(bgpneiconnect))
                        elif item[1] == "MD5 Auth:":
                            profileswb.write(
                                profile_counter,
                                index, str(bgpneimd5value))
                        elif item[1] == "MD5 Password:":
                            profileswb.write(
                                profile_counter,
                                index, str(bgpneimd5pass))
                        else:
                            continue
                    profile_counter += 1
                # Filter rules
                if "filters" in segment["bgp"]:
                    for bgpfilters in segment["bgp"]["filters"]:
                        for rules in bgpfilters["rules"]:
                            if len(rules["action"]["values"]) > 0:
                                for action in rules["action"]["values"]:
                                    for index, item in enumerate(ds_profileswb):
                                        if item[1] == "Profile Name":
                                            profileswb.write(
                                                profile_counter,
                                                index,
                                                str(profile["name"]))
                                        elif item[1] == "Segment":
                                            profileswb.write(
                                                profile_counter,
                                                index,
                                                str(segment[
                                                    "segment"][
                                                        "name"]))
                                        elif item[1] == "Filter Name:":
                                            profileswb.write(
                                                profile_counter,
                                                index,
                                                str(bgpfilters["name"]))
                                        elif item[1] == "Match Type":
                                            profileswb.write(
                                                profile_counter,
                                                index,
                                                str(rules["match"][
                                                    "type"]))
                                        elif item[1] == "Match Value":
                                            profileswb.write(
                                                profile_counter,
                                                index,
                                                str(rules["match"][
                                                    "value"]))
                                        elif item[1] == "Exact Match":
                                            profileswb.write(
                                                profile_counter,
                                                index,
                                                str(rules["match"][
                                                    "exactMatch"]))
                                        elif item[1] == "Action Type":
                                            profileswb.write(
                                                profile_counter,
                                                index,
                                                str(rules[
                                                    "action"]["type"]))
                                        elif item[1] == "Action Set":
                                            profileswb.write(
                                                profile_counter,
                                                index,
                                                str(action["type"]))
                                        elif item[1] == "Set Value":
                                            profileswb.write(
                                                profile_counter,
                                                index,
                                                str(action["value"]))
                                        else:
                                            continue
                                    profile_counter += 1
                            else:
                                for index, item in enumerate(ds_profileswb):
                                    if item[1] == "Profile Name":
                                        profileswb.write(
                                            profile_counter,
                                            index,
                                            str(profile["name"]))
                                    elif item[1] == "Segment":
                                        profileswb.write(
                                            profile_counter,
                                            index,
                                            str(segment["segment"][
                                                "name"]))
                                    elif item[1] == "Filter Name:":
                                        profileswb.write(
                                            profile_counter,
                                            index,
                                            str(bgpfilters["name"]))
                                    elif item[1] == "Match Type":
                                        profileswb.write(
                                            profile_counter,
                                            index,
                                            str(rules["match"]["type"]))
                                    elif item[1] == "Match Value":
                                        profileswb.write(
                                            profile_counter,
                                            index,
                                            str(rules["match"]["value"]))
                                    elif item[1] == "Exact Match":
                                        profileswb.write(
                                            profile_counter,
                                            index,
                                            str(rules["match"][
                                                "exactMatch"]))
                                    elif item[1] == "Action Type":
                                        profileswb.write(
                                            profile_counter,
                                            index,
                                            str(rules["action"]["type"]))
                                    elif item[1] == "Action Set":
                                        profileswb.write(
                                            profile_counter,
                                            index,
                                            str("DENY"))
                                    elif item[1] == "Set Value":
                                        profileswb.write(
                                            profile_counter,
                                            index,
                                            str(""))
                                    else:
                                        continue
                                profile_counter += 1
            # Cloud VPN
            cloudvpnb2b = "Disabled"
            cloudvpnb2bover = ""
            cloudvpnb2bdynamic = ""
            cloudvpnnvs = "Disabled"
            cloudvpnnvslst = ""
            hublist = ""
            #LAN NAT source or destination
            if "rules" in segment["nat"]:
                for rule in segment["nat"]["rules"]:
                    for index, item in enumerate(ds_profileswb):
                        if item[1] == "Profile Name":
                            profileswb.write(
                                profile_counter,
                                index, str(profile["name"]))
                        elif item[1] == "Segment":
                            profileswb.write(
                                profile_counter,
                                index, str(segment[
                                                "segment"]["name"]))
                        elif item[1] == "NAT type":
                            profileswb.write(
                                profile_counter,
                                index, str(rule["type"]))
                        elif item[1] == "nat description":
                            profileswb.write(
                                profile_counter,
                                index, str(rule["description"]))
                        elif item[1] == "nat source route IP":
                            profileswb.write(
                                profile_counter,
                                index, str(rule["srcCidrIp"]))
                        elif item[1] == "nat source route prefix":
                            profileswb.write(
                                profile_counter,
                                index, str(rule["srcCidrPrefix"]))
                        elif item[1] == "nat destination route IP":
                            profileswb.write(
                                profile_counter,
                                index, str(rule["destCidrIp"]))
                        elif item[1] == "nat destination route prefix":
                            profileswb.write(
                                profile_counter,
                                index, str(rule["destCidrPrefix"]))
                        elif item[1] == "nat inside IP":
                            profileswb.write(
                                profile_counter,
                                index, str(rule["insideCidrIp"]))
                        elif item[1] == "nat inside prefix":
                            profileswb.write(
                                profile_counter,
                                index, str(rule["insideCidrPrefix"]))
                        elif item[1] == "nat inside port":
                            if rule["insidePort"] == -1:
                                profileswb.write(
                                    profile_counter,
                                    index, "")
                            else:
                                profileswb.write(
                                    profile_counter,
                                    index, str(rule["insidePort"]))
                        elif item[1] == "nat outside IP":
                            profileswb.write(
                                profile_counter,
                                index, str(rule["outsideCidrIp"]))
                        elif item[1] == "nat outside prefix":
                            profileswb.write(
                                profile_counter,
                                index, str(rule["outsideCidrPrefix"]))
                        elif item[1] == "nat outside port":
                            if rule["outsidePort"] == -1:
                                profileswb.write(
                                    profile_counter,
                                    index, "")
                            else:
                                profileswb.write(
                                    profile_counter,
                                    index, str(rule["outsidePort"]))
                        else:
                            continue
                    profile_counter += 1
            #LAN NAT source AND destination
            if "dualRules" in segment["nat"]:
                for rule in segment["nat"]["dualRules"]:
                    for index, item in enumerate(ds_profileswb):
                        if item[1] == "Profile Name":
                            profileswb.write(
                                profile_counter,
                                index, str(profile["name"]))
                        elif item[1] == "Segment":
                            profileswb.write(
                                profile_counter,
                                index, str(segment[
                                                "segment"]["name"]))
                        elif item[1] == "nats&d description":
                            profileswb.write(
                                profile_counter,
                                index, str(rule["description"]))
                        elif item[1] == "nats&d source inside IP":
                            profileswb.write(
                                profile_counter,
                                index, str(rule["srcInsideCidrIp"]))
                        elif item[1] == "nats&d source inside prefix":
                            profileswb.write(
                                profile_counter,
                                index, str(rule["srcInsideCidrPrefix"]))
                        elif item[1] == "nats&d source outside IP":
                            profileswb.write(
                                profile_counter,
                                index, str(rule["srcOutsideCidrIp"]))
                        elif item[1] == "nats&d source outside prefix":
                            profileswb.write(
                                profile_counter,
                                index, str(rule["srcOutsideCidrPrefix"]))
                        elif item[1] == "nats&d destination inside IP":
                            profileswb.write(
                                profile_counter,
                                index, str(rule["destInsideCidrIp"]))
                        elif item[1] == "nats&d destination inside prefix":
                            profileswb.write(
                                profile_counter,
                                index, str(rule["destInsideCidrPrefix"]))
                        elif item[1] == "nats&d destination outside IP":
                            profileswb.write(
                                profile_counter,
                                index, str(rule["destOutsideCidrIp"]))
                        elif item[1] == "nats&d destination outside prefix":
                            profileswb.write(
                                profile_counter,
                                index, str(rule["destOutsideCidrPrefix"]))
                        else:
                            continue
                    profile_counter += 1
            if segment["vpn"]["edgeToEdge"]:
                cloudvpnb2b = "Enabled"
                if segment["vpn"]["edgeToEdgeDetail"]["useCloudGateway"]:
                    cloudvpnb2bover = "Use Velocloud GW"
                else:
                    usehubsstring = ""
                    for hub in segment["vpn"]["edgeToEdgeDetail"]["vpnHubs"]:
                        usehubsstring += str(hub["name"]) + " "
                    cloudvpnb2bover = "Use HUBs: " + str(usehubsstring)
                if segment["vpn"]["edgeToEdgeDetail"]["dynamic"]["enabled"]:
                    if segment["vpn"][
                        "edgeToEdgeDetail"][
                            "dynamic"]["isolation"]["enabled"]:
                        cloudvpnb2bdynamic = "To edges within profile"
                    else:
                        cloudvpnb2bdynamic = "To all edges"
            if segment["vpn"]["edgeToDataCenter"]:
                cloudvpnnvs = "Enabled"
                for site in nsdgw:
                    if devmod["id"] == site["moduleId"]:
                        cloudvpnnvslst += str(site["name"]) + "; "
            if segment["vpn"]["edgeToEdgeHub"]["enabled"]:
                for hub in segment["vpn"]["edgeToEdgeHub"]["vpnHubs"]:
                    hublist += str(hub["name"]) + "; "
            for index, item in enumerate(ds_profileswb):
                if item[1] == "Profile Name":
                    profileswb.write(
                        profile_counter,
                        index, str(profile["name"]))
                elif item[1] == "Segment":
                    profileswb.write(
                        profile_counter,
                        index, str(segment["segment"]["name"]))
                elif item[1] == "Branch to Non-VeloCloud Site":
                    profileswb.write(
                        profile_counter,
                        index, str(cloudvpnnvs))
                elif item[1] == "Branch to Non-VeloCloud Sites":
                    profileswb.write(
                        profile_counter,
                        index, str(cloudvpnnvslst))
                elif item[1] == "Hubs":
                    profileswb.write(
                        profile_counter,
                        index, str(hublist))
                elif item[1] == "Branch to Branch VPN":
                    profileswb.write(
                        profile_counter,
                        index, str(cloudvpnb2b))
                elif item[1] == "Overlay VPN established":
                    profileswb.write(
                        profile_counter,
                        index, str(cloudvpnb2bover))
                elif item[1] == "Dynamic Branch To Branch VPN":
                    profileswb.write(
                        profile_counter,
                        index, str(cloudvpnb2bdynamic))
                else:
                    continue
            profile_counter += 1
            # OSPF
            if segment["ospf"]["enabled"]:
                for ospfarea in segment["ospf"]["areas"]:
                    for index, item in enumerate(ds_profileswb):
                        if item[1] == "Profile Name":
                            profileswb.write(
                                profile_counter,
                                index, str(profile["name"]))
                        elif item[1] == "Segment":
                            profileswb.write(
                                profile_counter,
                                index, str(segment[
                                                "segment"]["name"]))
                        elif item[1] == "Redistribute BGP":
                            if segment["ospf"]["bgp"]["enabled"]:
                                profileswb.write(
                                    profile_counter,
                                    index, str("yes"))
                        elif item[1] == "metric":
                            if segment["ospf"]["bgp"]["enabled"]:
                                profileswb.write(
                                    profile_counter,
                                    index, str(segment["ospf"][
                                        "bgp"]["metric"]))
                        elif item[1] == "Metric type":
                            if segment["ospf"]["bgp"]["enabled"]:
                                profileswb.write(
                                    profile_counter,
                                    index, str(segment["ospf"]["bgp"][
                                        "metricType"]))
                        elif item[1] == "Overlay prefixes":
                            if segment["ospf"]["defaultPrefixes"]:
                                profileswb.write(
                                    profile_counter,
                                    index, str("yes"))
                            else:
                                profileswb.write(
                                    profile_counter,
                                    index, str("no"))
                        elif item[1] == "Default route":
                            profileswb.write(
                                profile_counter,
                                index, str(segment["ospf"][
                                    "defaultRoutes"]))
                        elif item[1] == "Advertise":
                            profileswb.write(
                                profile_counter,
                                index, str(segment["ospf"][
                                    "defaultRouteAdvertise"]))
                        elif item[1] == "AreaID":
                            profileswb.write(
                                profile_counter,
                                index, str(ospfarea["id"]))
                        elif item[1] == "Area Name":
                            profileswb.write(
                                profile_counter,
                                index, str(ospfarea["name"]))
                        elif item[1] == "Area type":
                            profileswb.write(
                                profile_counter,
                                index, str(ospfarea["type"]))
                        else:
                            continue
                    profile_counter += 1
        ntp_servers = ""
        if "ntp" in devmod["data"] and "servers" in devmod["data"]["ntp"]:
            ntp_servers = [server['server'] for server in devmod["data"]["ntp"]["servers"]]
            for index, item in enumerate(ds_profileswb):
                if item[1] == "Profile Name":
                        profileswb.write(
                            profile_counter, index, str(profile["name"]))
                elif item[1] == "ntp servers":
                    profileswb.write(profile_counter, index, ', '.join(ntp_servers))
            profile_counter += 1
        # FW module
        if (firmod != ""
            ) and (
                "data" in firmod):
            # edge access
            override_ssh = ""
            override_snmp = ""
            override_ui = ""
            override_fw = ""
            if "services" in firmod["data"]:
                if firmod["data"]["services"]["ssh"]["enabled"]:
                    networks = ""
                    for ip1 in firmod[
                        "data"]["services"][
                            "ssh"]["allowSelectedIp"]:
                        networks += ip1 + ","
                    if networks == "":
                        override_ssh = "allow ALL LAN"
                    else:
                        override_ssh = networks
                else:
                    override_ssh = "Deny all"
                if firmod["data"]["services"]["snmp"]["enabled"]:
                    networks = ""
                    for ip1 in firmod[
                        "data"]["services"][
                            "snmp"]["allowSelectedIp"]:
                        networks += ip1 + ","
                    if networks == "":
                        override_snmp = "allow ALL LAN"
                    else:
                        override_snmp = networks
                else:
                    override_snmp = "Deny all"
                if firmod["data"]["services"]["localUi"]["enabled"]:
                    networks = ""
                    for ip1 in firmod[
                        "data"]["services"][
                            "localUi"]["allowSelectedIp"]:
                        networks += ip1 + ","
                    if networks == "":
                        override_ui = "port: " + str(
                            firmod["data"]["services"][
                                "localUi"]["portNumber"]) + " allow ALL LAN"
                    else:
                        override_ui = "port: " + str(
                            firmod["data"]["services"][
                                "localUi"]["portNumber"]) + " " + networks
                else:
                    override_ui = "port: " + str(
                        firmod["data"]["services"]["localUi"][
                            "portNumber"]) + " deny All"
                override_fw = "disabled"
                if "firewall_enabled" in firmod["data"]:
                    if firmod["data"]["firewall_enabled"]:
                        override_fw = "enabled"
                for index, item in enumerate(ds_profileswb):
                    if item[1] == "Profile Name":
                        profileswb.write(
                            profile_counter, index, str(profile["name"]))
                    elif item[1] == "Firewall enabled":
                        profileswb.write(
                            profile_counter, index, str(override_fw))
                    elif item[1] == "Support access":
                        profileswb.write(
                            profile_counter, index, str(override_ssh))
                    elif item[1] == "SNMP Access":
                        profileswb.write(
                            profile_counter, index, str(override_snmp))
                    elif item[1] == "Web UI":
                        profileswb.write(
                            profile_counter, index, str(override_ui))
                    else:
                        continue
                profile_counter += 1
            # FW rules
            for fw_segment in firmod["data"]["segments"]:
                if "outbound" in fw_segment:
                    for fwrule in fw_segment["outbound"]:
                        parsed = parse_fw_rule(fwrule, dpi_apps)
                        sourceinfo = "prefix: " + parsed[
                            "srcip"] + parsed[
                                "srcmask"] + " vlan:" + parsed[
                                    "svlan"] + " port:" + parsed["srcport"]
                        destinationinfo = "prefix: " + parsed[
                            "dstip"] + parsed[
                                "dstmask"] + " vlan:" + parsed[
                                    "dvlan"] + " port:" + parsed["dstport"]
                        for index, item in enumerate(ds_profileswb):
                            if item[1] == "Profile Name":
                                profileswb.write(
                                    profile_counter, index,
                                    str(profile["name"]))
                            elif item[1] == "Segment":
                                profileswb.write(
                                    profile_counter,
                                    index, str(device_segments[
                                        fw_segment["segment"]["segmentId"]]))
                            elif item[1] == "Outbound rule":
                                profileswb.write(
                                    profile_counter,
                                    index, str(parsed["name"]))
                            elif item[1] == "Match source":
                                profileswb.write(
                                    profile_counter,
                                    index, str(sourceinfo))
                            elif item[1] == "Match dest":
                                profileswb.write(
                                    profile_counter,
                                    index, str(destinationinfo))
                            elif item[1] == "Match Appli":
                                profileswb.write(
                                    profile_counter, index, str(
                                        parsed["app"]))
                            elif item[1] == "Action":
                                profileswb.write(
                                    profile_counter, index, str(
                                        parsed["action"]))
                            else:
                                continue
                        profile_counter += 1
        # BP
        for segment in qosmod["data"]["segments"]:
            for qosrule in segment["rules"]:
                parsed = parse_business_rule(
                    qosrule,
                    dpi_apps,
                    csssites,
                    bhhubs[segment["segment"]["segmentId"]],
                    nsdgw, object_groups)
                for index, item in enumerate(ds_profileswb):
                    if item[1] == "Profile Name":
                        profileswb.write(
                            profile_counter,
                            index, str(profile["name"]))
                    elif item[1] == "Segment":
                        profileswb.write(
                            profile_counter,
                            index, str(segment["segment"]["name"]))
                    elif item[1] == "Rule # & name":
                        profileswb.write(
                            profile_counter,
                            index, str(parsed["name"]))
                    elif item[1] == "Match Source":
                        profileswb.write(
                            profile_counter,
                            index, str(parsed["src"]))
                    elif item[1] == "Match Dest":
                        profileswb.write(
                            profile_counter,
                            index, str(parsed["dst"]))
                    elif item[1] == "Match Appl":
                        if parsed["app"] == "":
                            continue
                        profileswb.write(
                            profile_counter,
                            index, str(parsed["app"]))
                    elif item[1] == "Action Net Service":
                        profileswb.write(
                            profile_counter,
                            index, str(parsed["netService"]))
                    elif item[1] == "Action Link":
                        profileswb.write(
                            profile_counter,
                            index, str(parsed["actionLink"]))
                    elif item[1] == "Action Prio":
                        profileswb.write(
                            profile_counter,
                            index, str(parsed["actionPri"]))
                    elif item[1] == "Action SRV Class":
                        profileswb.write(
                            profile_counter,
                            index, str(parsed["actionSRVClass"]))
                    elif item[1] == "DSCP inner":
                        profileswb.write(
                            profile_counter,
                            index, str(parsed["dscpInner"]))
                    elif item[1] == "DSCP outer":
                        profileswb.write(
                            profile_counter,
                            index, str(parsed["dscpOuter"]))
                    elif item[1] == "Destination Address Group":
                        profileswb.write(
                            profile_counter,
                            index, str(parsed["dAddressGroup"]))
                    elif item[1] == "Destination Port Group":
                        profileswb.write(
                            profile_counter,
                            index, str(parsed["dPortGroup"]))
                    elif item[1] == "Source Address Group":
                        profileswb.write(
                            profile_counter,
                            index, str(parsed.get("sAddressGroup", "")))
                    elif item[1] == "Source Port Group":
                        profileswb.write(
                            profile_counter,
                            index, str(parsed.get("sPortGroup", "")))
                    else:
                        continue
                profile_counter += 1
    wb1.close()
    out_name.seek(0)
    return b64encode(out_name.read()).decode()
