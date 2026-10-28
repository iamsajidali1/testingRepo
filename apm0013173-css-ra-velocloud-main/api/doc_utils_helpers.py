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


def _logical_id_match(candidate_id, expected_id):
    """Compare logical IDs while tolerating optional dc: prefix."""
    if candidate_id is None or expected_id is None:
        return False
    cand = str(candidate_id)
    exp = str(expected_id)
    return cand == exp or cand.replace("dc:", "", 1) == exp.replace("dc:", "", 1)


def _find_name_for_logical_id(value, logical_id):
    """Recursively find a human-readable name for a logicalId in nested refs."""
    if value is None:
        return ""

    if isinstance(value, dict):
        candidate_ids = [
            value.get("logicalId"),
            value.get("edgeLogicalId"),
            value.get("gatewayLogicalId"),
            value.get("nsdLogicalId"),
            value.get("id"),
            value.get("uuid"),
        ]
        if any(_logical_id_match(candidate, logical_id) for candidate in candidate_ids):
            for name_key in ("name", "displayName", "gatewayName", "providerName", "nsd"):
                if value.get(name_key):
                    return str(value.get(name_key))

        for nested_value in value.values():
            found = _find_name_for_logical_id(nested_value, logical_id)
            if found:
                return found

    if isinstance(value, list):
        for item in value:
            found = _find_name_for_logical_id(item, logical_id)
            if found:
                return found

    return ""


def _resolve_backhaul_name(route_cfg, css, bhubs, nsd_gw):
    """Resolve routeCfg logicalId to readable name from known route objects."""
    if not isinstance(route_cfg, dict):
        return ""

    if route_cfg.get("name"):
        return str(route_cfg.get("name"))

    logical_id = route_cfg.get("logicalId")
    if not logical_id:
        return ""

    for source in (bhubs or [], css or [], nsd_gw or []):
        resolved = _find_name_for_logical_id(source, logical_id)
        if resolved:
            return resolved

    return ""


def _build_action_link_pref(selected_route_action):
    """Build ActionLinkPref while suppressing empty or N/A link names."""
    if not isinstance(selected_route_action, dict):
        return ""

    link_policy = str(selected_route_action.get("linkPolicy") or "auto")
    display_policy = "mandatory" if link_policy == "fixed" else link_policy

    wanlink = selected_route_action.get("wanlink")
    wanlink_name = selected_route_action.get("wanLinkName")

    link_value = ""
    if wanlink and str(wanlink).strip().lower() != "auto":
        link_value = str(wanlink).strip()
    elif wanlink_name:
        link_value = str(wanlink_name).strip()

    if not link_value or link_value.lower() == "n/a":
        return display_policy

    return f"{display_policy}:{link_value}"


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
    #print(rule["name"])
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
    action = json_in.get("action", {})
    route_type = action.get("routeType", "edge2Cloud")
    route_action_by_type = {
        "edge2Cloud": "edge2CloudRouteAction",
        "edge2DataCenter": "edge2DataCenterRouteAction",
        "edge2Edge": "edge2EdgeRouteAction",
    }
    route_action_name = route_action_by_type.get(route_type, "edge2CloudRouteAction")
    selected_route_action = action.get(route_action_name) or action.get("edge2CloudRouteAction", {})
    route_policy = selected_route_action.get("routePolicy", "")
    route_cfg = selected_route_action.get("routeCfg") or {}

    if route_policy == "gateway":
        rule["netService"] = "Multi-Path"
    elif route_policy == "backhaul":
        backhaul = ""
        if route_cfg == EmptyDic:
            rule["netService"] = " "
        else:
            if route_cfg.get("type") == "edge":
                for backhauledge in route_cfg.get("backhaulEdges", []):
                    for hub in bhubs:
                        if "logicalId" in hub:
                            if _logical_id_match(hub["logicalId"], backhauledge.get("edgeLogicalId")):
                                hub["name"]
                                backhaul += hub["name"] + "; "
            elif route_cfg.get("type") == "cloudSecurityService":
                for csssite in css:
                    if _logical_id_match(route_cfg.get("logicalId"), csssite.get("logicalId")):
                        backhaul += csssite["name"]
            elif route_cfg.get("type") == "dataCenter":
                for nvssite in nsd_gw:
                    if _logical_id_match(route_cfg.get("logicalId"), nvssite.get("logicalId")):
                        backhaul += nvssite["name"]
            if backhaul == "":
                backhaul = _resolve_backhaul_name(route_cfg, css, bhubs, nsd_gw)
        rule["netService"] = "backhaul to:" + backhaul
    elif route_cfg.get("logicalId"):
        # Some NSDE/data-center rules use routePolicy=direct/auto but still carry routeCfg target.
        backhaul = _resolve_backhaul_name(route_cfg, css, bhubs, nsd_gw)
        if backhaul:
            rule["netService"] = "backhaul to:" + backhaul
        else:
            rule["netService"] = "direct"
    else:
        rule["netService"] = "direct"
    if "serviceGroup" in selected_route_action:
        if selected_route_action["serviceGroup"] == "ALL":
            rule["actionLink"] = 'auto'
        else:
            rule["actionLink"] = selected_route_action["serviceGroup"]
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
    # Extract wanLinkName and keep output clean when link is missing.
    rule["ActionLinkPref"] = _build_action_link_pref(selected_route_action)
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
