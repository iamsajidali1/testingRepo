""" module for document generator helper functions
"""
import logging
import sys


logging.basicConfig(
    stream=sys.stdout,
    level=logging.DEBUG,
    format='%(asctime)s: %(levelname)-8s: %(message)s'
)


def dotted_key_list(data, keys):
    """ Search function to generate full json path """
    if keys:
        if data is not None and keys[0] in data:
            return dotted_key_list(data[keys[0]], keys[1:])
        else:
            return "N/A"
    return str(data)


def get_my_app_name(json_object, appid):
    """ Function that will return application name from app map"""
    return [
        obj for obj in json_object["applications"]
        if obj['id'] == appid
    ][0]['displayName']

def get_my_object_name(json_object, logicalId):
    """ Function that will return application name from app map"""
    for item in json_object:
        if item.get('logicalId') == logicalId:
            return item.get('name')
    return None


def get_my_class_name(json_object, appid):
    """ Function that will return class name from app map"""
    return "All" + json_object["applicationClasses"][appid]


def netmask_to_cidr(netmask):
    """function to convert from network mask to cidr
    input: 255.255.255.0 return: 24"""
    return sum([bin(int(x)).count('1') for x in netmask.split('.')])


def merge_two_dicts(dct1, dct2):
    """ function that will merge 2 dictionaries"""
    dctl = dct1.copy()   # start with keys and values of x
    dctl.update(dct2)    # modifies z with keys and values of y
    return dctl


def parse_business_rule(json_in, appmap, css, bhubs, nsd_gw, object_groups):
    """ function that will get data from velocloud business policy rule json
    to our structure """
    rule = {}
    rule["dPortGroup"] = ""
    rule["dAddressGroup"] = ""
    rule["sPortGroup"] = ""
    rule["sAddressGroup"] = ""
    EmptyDic = {}
    rule["name"] = json_in["name"]
    rule["src"] = "prefix: " + (json_in["match"].get("sip") or json_in["match"].get("sipV6", ""))
    if (json_in["match"]["ssm"] != "255.255.255.255") and (json_in["match"]["ssm"] != "any"):
        rule["src"] += " " + str(json_in["match"]["ssm"])
    if json_in["match"]["svlan"] != -1:
        rule["src"] += "vlan: " + str(json_in["match"]["svlan"])
    if "dAddressGroup" in json_in["match"]:
        if json_in["match"]["dAddressGroup"]:
            rule["dAddressGroup"] = get_my_object_name(object_groups, json_in["match"]["dAddressGroup"])
    if "sAddressGroup" in json_in["match"]:
        if json_in["match"]["sAddressGroup"]:
            rule["sAddressGroup"] = get_my_object_name(object_groups, json_in["match"]["sAddressGroup"])
    if "sPortGroup" in json_in["match"]:
        if json_in["match"]["sPortGroup"]:
            rule["sPortGroup"] = get_my_object_name(object_groups, json_in["match"]["sPortGroup"])
    if "dPortGroup" in json_in["match"]:
        if json_in["match"]["dPortGroup"]:
            rule["dPortGroup"] = get_my_object_name(object_groups, json_in["match"]["dPortGroup"])
    if json_in["match"]["sport_low"] != -1:
        rule["src"] += "port: " + str(json_in["match"]["sport_low"])
    if json_in["match"]["sport_high"] != -1:
        rule["src"] += "port: " + str(json_in["match"]["sport_high"])
    rule["dst"] = "prefix: " + (json_in["match"].get("dip") or json_in["match"].get("dipV6", ""))
    if (json_in["match"]["dsm"] != "255.255.255.255") and (json_in["match"]["dsm"] != "any"):
        rule["dst"] += " " + str(json_in["match"]["dsm"])
    if json_in["match"]["dvlan"] != -1:
        rule["dst"] += " vlan: " + str(json_in["match"]["dvlan"])
    if json_in["match"]["dport_low"] != -1:
        rule["dst"] += " port: " + str(json_in["match"]["dport_low"])
    if json_in["match"]["dport_high"] != -1:
        rule["dst"] += " port: " + str(json_in["match"]["dport_high"])
    rule["app"] = ""
    if json_in["match"]["appid"] != -1:
        rule["app"] = get_my_app_name(appmap, json_in["match"]["appid"])
    elif json_in["match"]["classid"] != -1:
        rule["app"] = get_my_class_name(appmap, json_in["match"]["classid"])
    if json_in["action"]["edge2CloudRouteAction"]["routePolicy"] == "gateway":
        rule["netService"] = "Multi-Path"
    elif json_in["action"]["edge2CloudRouteAction"]["routePolicy"] == "backhaul":
        backhaul = ""
        if json_in["action"]["edge2CloudRouteAction"]["routeCfg"] == EmptyDic:
            rule["netService"] = " "
        else:
            if json_in["action"]["edge2CloudRouteAction"]["routeCfg"]["type"] == "edge":
                for backhauledge in json_in["action"]["edge2CloudRouteAction"]["routeCfg"]["backhaulEdges"]:
                    for hub in bhubs:
                        if "logicalId" in hub:
                            if hub["logicalId"] == backhauledge["edgeLogicalId"]:
                                hub["name"]
                                backhaul += hub["name"] + "; "
            elif json_in["action"]["edge2CloudRouteAction"]["routeCfg"]["type"] == "cloudSecurityService":
                for csssite in css:
                    if json_in["action"]["edge2CloudRouteAction"]["routeCfg"]["logicalId"] == csssite["logicalId"]:
                        backhaul += csssite["name"]
            elif json_in["action"]["edge2CloudRouteAction"]["routeCfg"]["type"] == "dataCenter":
                for nvssite in nsd_gw:
                    if json_in["action"]["edge2CloudRouteAction"]["routeCfg"]["logicalId"] == nvssite["logicalId"]:
                        backhaul += nvssite["name"]
        rule["netService"] = "backhaul to:" + backhaul
    else:
        rule["netService"] = "direct"
    if "serviceGroup" in json_in["action"]["edge2CloudRouteAction"]:
        if json_in["action"]["edge2CloudRouteAction"]["serviceGroup"] == "ALL":
            rule["actionLink"] = 'auto'
        else:
            rule["actionLink"] = json_in["action"]["edge2CloudRouteAction"]["serviceGroup"]
    else:
        rule["actionLink"] = 'auto'
    rule["actionPri"] = json_in["action"]["QoS"]["txScheduler"]["priority"]
    rule["actionSRVClass"] = json_in["action"]["QoS"]["type"]
    if "linkInnerDscpTag" in json_in["action"]["edge2EdgeRouteAction"] and "linkOuterDscpTag" in json_in["action"]["edge2EdgeRouteAction"]:
        rule["dscpInner"] = json_in["action"]["edge2EdgeRouteAction"]["linkInnerDscpTag"]
        rule["dscpOuter"] = json_in["action"]["edge2EdgeRouteAction"]["linkOuterDscpTag"]
    else:
        rule["dscpInner"] = ""
        rule["dscpOuter"] = ""
    # Extract wanLinkName
    rule["ActionLinkPref"] = ""
    if "wanlink" in json_in["action"]["edge2CloudRouteAction"]:
        if "auto" not in json_in["action"]["edge2CloudRouteAction"]["wanlink"]:
            if json_in['action']['edge2CloudRouteAction']['linkPolicy'] == "fixed":
                rule["ActionLinkPref"] = f"mandatory:{json_in['action']['edge2CloudRouteAction']['wanlink']}"
            else:
                rule["ActionLinkPref"] = f"{json_in['action']['edge2CloudRouteAction']['linkPolicy']}:{json_in['action']['edge2CloudRouteAction']['wanlink']}"
        else:
            if "wanLinkName" in json_in['action']['edge2CloudRouteAction']:
                if json_in['action']['edge2CloudRouteAction']['linkPolicy'] == "fixed":
                    rule["ActionLinkPref"] = f"mandatory:{json_in['action']['edge2CloudRouteAction']['wanLinkName']}"
                else:
                    rule["ActionLinkPref"] = f"{json_in['action']['edge2CloudRouteAction']['linkPolicy']}:{json_in['action']['edge2CloudRouteAction']['wanLinkName']}"
            else:
                rule["ActionLinkPref"] = f"{json_in['action']['edge2CloudRouteAction']['linkPolicy']}:N/A"
    return rule


def parse_fw_rule(json_in, appmap):
    """ function that will get data from velocloud json firewall rule structure
    to our structure"""
    rule = {}
    rule["name"] = str(json_in["name"])
    if "type" in json_in["action"]:
        rule["type"] = str(json_in["action"]["type"])
    else:
        rule["type"] = ""
    if json_in["match"]["proto"] == 6:
        rule["proto"] = "TCP"
    elif json_in["match"]["proto"] == 17:
        rule["proto"] = "UDP"
    elif json_in["match"]["proto"] == 1:
        rule["proto"] = "ICMP"
    elif json_in["match"]["proto"] == 47:
        rule["proto"] = "GRE"
    else:
        rule["proto"] = ""
    if "interface" in json_in["action"]:
        if json_in["action"]["subinterfaceId"] == -1:
            rule["interface"] = str(json_in["action"]["interface"])
        else:
            rule["interface"] = str(json_in["action"][
                "interface"]) + "." + str(json_in[
                    "action"]["subinterfaceId"])
    else:
        rule["interface"] = ""
    if "dip" in json_in["match"]:
        rule["dstip"] = str(json_in["match"]["dip"])
    else:
        rule["dstip"] = "any"
    rule["dstmask"] = ""
    if "ipVersion" in json_in["match"] and json_in["match"]["ipVersion"] != "IPv6":
        if (json_in["match"]["dsm"] != "any") and (
            json_in["match"][
                "dsm"] != "255.255.255.255"):
            rule["dstmask"] = "/" + str(netmask_to_cidr(json_in["match"]["dsm"]))
    else:
        rule["dstmask"] = json_in["match"]["dsm"]
    rule["dstport"] = ""
    if (json_in["match"]["dport_low"] != -1
        ) and (
            json_in["match"]["dport_high"] != -1):
        rule["dstport"] = str(json_in["match"][
            "dport_low"]) + "-" + str(json_in["match"]["dport_high"])
    elif json_in["match"]["dport_low"] != -1:
        rule["dstport"] = str(json_in["match"]["dport_low"])
    elif json_in["match"]["dport_high"] != -1:
        rule["dstport"] = str(json_in["match"]["dport_high"])
    rule["srcport"] = ""
    if (json_in["match"]["sport_low"] != -1
        ) and (
            json_in["match"]["sport_high"] != -1):
        rule["srcport"] = str(json_in["match"][
            "sport_low"]) + "-" + str(json_in["match"]["sport_high"])
    elif json_in["match"]["sport_low"] != -1:
        rule["srcport"] = str(json_in["match"]["sport_low"])
    elif json_in["match"]["sport_high"] != -1:
        rule["srcport"] = str(json_in["match"]["sport_high"])
    rule["srcmask"] = ""
    if "ipVersion" in json_in["match"] and json_in["match"]["ipVersion"] != "IPv6":
        if (json_in["match"]["ssm"] != "any") and (
            json_in["match"][
                "ssm"] != "255.255.255.255"):
            rule["srcmask"] = "/" + str(netmask_to_cidr(json_in["match"]["ssm"]))
    else:
        rule["srcmask"] = json_in["match"]["ssm"]
    if "sip" in json_in["match"]:
        rule["srcip"] = str(json_in["match"]["sip"])
    else:
        rule["srcip"] = "any"
    if json_in["match"]["svlan"] != -1:
        rule["svlan"] = str(json_in["match"]["svlan"])
    else:
        rule["svlan"] = ""
    if json_in["match"]["dvlan"] != -1:
        rule["dvlan"] = str(json_in["match"]["dvlan"])
    else:
        rule["dvlan"] = ""
    rule["action"] = ""
    if "allow_or_deny" in json_in["action"]:
        rule["action"] = json_in["action"]["allow_or_deny"]
    rule["app"] = ""
    if json_in["match"]["appid"] != -1:
        rule["app"] = get_my_app_name(appmap, json_in["match"]["appid"])
    elif json_in["match"]["classid"] != -1:
        rule["app"] = get_my_class_name(appmap, json_in["match"]["classid"])
    rule["log"] = ""
    if "loggingEnabled" in json_in:
        if json_in["loggingEnabled"]:
            rule["log"] = "yes"
    return rule
