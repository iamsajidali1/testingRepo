#pylint:disable = too-many-lines
""" report module with smaller functions """
from datetime import datetime
from base64 import b64encode
import logging
import sys
import json
import ipaddress
from io import BytesIO
from typing import NamedTuple
import numpy as np
import pandas as pd
import xlsxwriter
from xlsxwriter.format import Format
from openpyxl import load_workbook
from openpyxl.styles import PatternFill, Font, Alignment
from openpyxl.worksheet.table import Table, TableStyleInfo
from openpyxl.formatting.rule import FormulaRule
from openpyxl.utils import get_column_letter
from api.doc_utils_helpers import dotted_key_list
from api.doc_utils_helpers import parse_business_rule
import re
from api.utils import (get_license_name, calculate_max_trough, calculate_average, calculate_95th_percentile, calculate_29_subnet)


logging.basicConfig(
    stream=sys.stdout,
    level=logging.DEBUG,
    format='%(asctime)s: %(levelname)-8s: %(message)s'
)


SOURCE_NAME = 'Source Name'
RULE_NAME = 'Rule # & name'
MATCH_SOURCE = 'Match Source'
SOURCE_ADDRESS_GROUP = 'Source Address Group'
SOURCE_ADDRESS_GROUP_DETAILS = 'Source Address Group details'
SOURCE_PORT_GROUP = 'Source Port Group'
SOURCE_PORT_GROUP_DETAILS = 'Source Port Group details'
MATCH_DESTINATION = 'Match Dest'
DESTINATION_ADDRESS_GROUP = 'Destination Address Group'
DESTINATION_ADDRESS_GROUP_DETAILS = 'Destination Address Group details'
DESTINATION_PORT_GROUP = 'Destination Port Group'
DESTINATION_PORT_GROUP_DETAILS = 'Destination Port Group details'
MATCH_APPLICATION = 'Match Appl'
ACTION_NETWORK_SERVICE = 'Action Net Service'
ACTION_LINK = 'Action Link'
ACTION_PRIORITY = 'Action Prio'
ACTION_SERVICE_CLASS = 'Action SRV Class'
ACTION_LINK_PREFERRED = 'Action link Preffered'
DSCP_OUTER = 'DSCP outer'
POLICY_TABLE = 'Policy Table'
ACTIVATION_TIME = 'Activation Time'
LTS_RELEASE = 'LTS release'
MODEL_NUMBER = 'Model Number'
SOFTWARE_VERSION = 'Software Version'
HA_MODE = 'HA Mode'
EDGE_STATE = 'Edge State'
OVERLAY_NAME = 'Overlay Name'
PACKET_LOSS_RX = 'Packet Loss RX %'
PACKET_LOSS_TX = 'Packet Loss TX %'
BYTES_RX = 'Bytes RX'
BYTES_TX = 'Bytes TX'
JITTER_RX = 'Jitter RX (ms)'
JITTER_TX = 'Jitter TX (ms)'
LATENCY_RX = 'Latency RX (ms)'
LATENCY_TX = 'Latency TX (ms)'
LICENSE_LEVEL = 'License Level'
LICENSE_BANDWIDTH = 'License Bandwidth'
LATENCY_RX_NUMERIC = 'Latency RX (ms)_num'
JITTER_RX_NUMERIC = 'Jitter RX (ms)_num'
PACKET_LOSS_RX_NUMERIC = 'Packet Loss RX %_num'
UTIL_HIGH_RX = 'Util 80-100% Rx [%]'
UTIL_HIGH_TX = 'Util 80-100% Tx [%]'
UTIL_MEDIUM_RX = 'Util 60-80% Rx [%]'
UTIL_IDLE_RX = 'Util <30% Rx [%]'
AGGREGATED_MAX = 'Aggregated Max [Mbps]'
AGGREGATED_AVERAGE = 'Aggregated Throughput Avg [Mbps]'
AGGREGATED_PERCENTILE = 'Aggregated Throughput 95th percentile [Mbps]'
LICENSE_SIZING = 'License sizing'
UTIL_HIGH_TX_BUSINESS = 'Util 80-100% Tx BH [%]'
UTIL_HIGH_RX_BUSINESS = 'Util 80-100% Rx BH [%]'
UTIL_IDLE_RX_BUSINESS = 'Util <30% Rx BH [%]'
UTIL_IDLE_TX_BUSINESS = 'Util <30% Tx BH [%]'


class _ServiceFormats(NamedTuple):
    header: Format
    section: Format
    critical: Format
    warning: Format
    normal: Format
    title: Format


class _CapacityFormats(NamedTuple):
    title: Format
    header: Format
    alert: Format
    normal: Format
    critical: Format
    high: Format
    medium: Format
    ok: Format
    section: Format
    readme_header: Format
    readme_normal: Format


def _backhaul_edges_by_segment(device_module: dict) -> dict:
    """Return profile backhaul edges keyed by segment ID."""
    backhaul_edges = {}
    for segment in device_module.get("data", {}).get("segments", []):
        segment_id = segment["segment"]["segmentId"]
        backhaul_edges[segment_id] = segment.get("vpn", {}).get("backHaulEdges", [])
    return backhaul_edges


def _merge_ref_values(refs, key):
    """Return normalized list of ref values for one key."""
    value = refs.get(key)
    if isinstance(value, list):
        return value
    if value:
        return [value]
    return []


def _append_unique_refs(result, seen, refs, keys):
    for key in keys:
        for entry in _merge_ref_values(refs, key):
            entry_key = id(entry)
            if isinstance(entry, dict):
                entry_key = entry.get("logicalId") or entry.get("name") or entry_key
            entry_key = str(entry_key)
            if entry_key not in seen:
                seen.add(entry_key)
                result.append(entry)


def _collect_css_and_nsdgw(device_module: dict, qos_module: dict):
    """Collect CSS and data-center refs from both device and QOS module refs."""
    csssites, nsdgw = [], []
    seen_css, seen_nsd = set(), set()
    ref_maps = [
        (device_module or {}).get("refs", {}),
        (qos_module or {}).get("refs", {}),
    ]

    for refs in ref_maps:
        if not isinstance(refs, dict):
            continue

        _append_unique_refs(csssites, seen_css, refs, ("deviceSettings:css:provider",))
        _append_unique_refs(nsdgw, seen_nsd, refs, (
            "deviceSettings:dataCenter",
            "deviceSettings:vpn:dataCenter",
            "deviceSettings:edgeDirectNvs:provider",
        ))

    return csssites, nsdgw


def _append_qos_rows(rows, source_name, source_type, qos_module, csssites, bhhubs, nsdgw, dpi_apps, object_groups):
    """Parse QOS rules and append normalized rows."""
    if not qos_module:
        return

    segments = qos_module.get("data", {}).get("segments", [])
    for segment in segments:
        segment_name = segment.get("segment", {}).get("name", "")
        segment_id = segment.get("segment", {}).get("segmentId")
        hubs = bhhubs.get(segment_id, [])

        for qosrule in segment.get("rules", []):
            parsed = parse_business_rule(
                qosrule,
                dpi_apps,
                csssites,
                hubs,
                nsdgw,
                object_groups,
            )
            d_addr_group = _group_content_from_rule(object_groups, qosrule, "dAddressGroup")
            d_port_group = _group_content_from_rule(object_groups, qosrule, "dPortGroup")
            s_addr_group = _group_content_from_rule(object_groups, qosrule, "sAddressGroup")
            s_port_group = _group_content_from_rule(object_groups, qosrule, "sPortGroup")
            match_dest = _normalize_match_dest(str(parsed.get("dst", "")), object_groups, hubs, csssites, nsdgw)
            rows.append({
                "Source Type": source_type,
                SOURCE_NAME: source_name,
                "Segment": segment_name,
                RULE_NAME: str(parsed.get("name", "")),
                MATCH_SOURCE: str(parsed.get("src", "")),
                SOURCE_ADDRESS_GROUP: str(parsed.get("sAddressGroup", "")),
                SOURCE_ADDRESS_GROUP_DETAILS: s_addr_group,
                SOURCE_PORT_GROUP: str(parsed.get("sPortGroup", "")),
                SOURCE_PORT_GROUP_DETAILS: s_port_group,
                MATCH_DESTINATION: match_dest,
                DESTINATION_ADDRESS_GROUP: str(parsed.get("dAddressGroup", "")),
                DESTINATION_ADDRESS_GROUP_DETAILS: d_addr_group,
                DESTINATION_PORT_GROUP: str(parsed.get("dPortGroup", "")),
                DESTINATION_PORT_GROUP_DETAILS: d_port_group,
                MATCH_APPLICATION: str(parsed.get("app", "")),
                ACTION_NETWORK_SERVICE: str(parsed.get("netService", "")),
                ACTION_LINK: str(parsed.get("actionLink", "")),
                ACTION_PRIORITY: str(parsed.get("actionPri", "")),
                ACTION_SERVICE_CLASS: str(parsed.get("actionSRVClass", "")),
                ACTION_LINK_PREFERRED: str(parsed.get("ActionLinkPref", "")),
                "DSCP inner": str(parsed.get("dscpInner", "")),
                DSCP_OUTER: str(parsed.get("dscpOuter", "")),
            })


def _find_group_by_logical_id(object_groups, logical_id):
    """Return object-group dict by logicalId if present."""
    if not logical_id:
        return None

    groups = object_groups
    if isinstance(object_groups, dict):
        groups = object_groups.get("data") or object_groups.get("objectGroups") or []

    if not isinstance(groups, list):
        return None

    for group in groups:
        if isinstance(group, dict) and group.get("logicalId") == logical_id:
            return group
    return None


def _extract_group_content(group):
    """Return readable object-group contents for export."""
    if not isinstance(group, dict):
        return ""

    preferred_keys = [
        "entries", "objects", "elements", "members", "addresses", "ports",
        "ranges", "prefixes", "values", "value", "data", "items",
    ]
    for key in preferred_keys:
        if key in group and group[key] not in (None, "", [], {}):
            val = group[key]
            if isinstance(val, (list, dict)):
                return json.dumps(val, ensure_ascii=False)
            return str(val)

    filtered = {
        key: value for key, value in group.items()
        if key not in {
            "name", "logicalId", "id", "enterpriseId", "created", "modified",
            "description", "type", "isSystemDefined",
        } and value not in (None, "", [], {})
    }
    if filtered:
        return json.dumps(filtered, ensure_ascii=False)
    return ""


def _format_port_entry(entry):
    """Format one port entry using requested protocol mapping and range rules."""
    if not isinstance(entry, dict):
        return ""

    proto_map = {
        17: "UDP",
        6: "TCP",
    }
    proto = entry.get("proto")
    proto_name = proto_map.get(proto, str(proto) if proto is not None else "")

    low = entry.get("port_low")
    high = entry.get("port_high")

    if low is None and high is None:
        return proto_name.strip()

    if low is None:
        port_text = str(high)
    elif high is None:
        port_text = str(low)
    elif low == high:
        port_text = str(low)
    else:
        port_text = f"{low}-{high}"

    return f"{proto_name} {port_text}".strip()


def _format_address_entry(entry):
    """Format one address entry to domain or CIDR where possible."""
    if not isinstance(entry, dict):
        return str(entry)

    if entry.get("domain"):
        return str(entry.get("domain"))

    ip_val = entry.get("ip")
    mask_val = entry.get("mask")
    rule_type = str(entry.get("rule_type", "")).lower()

    if ip_val and (mask_val or rule_type == "prefix"):
        cidr_value = _to_cidr(ip_val, mask_val)
        if cidr_value:
            return cidr_value
        if mask_val:
            return f"{ip_val}/{mask_val}"
        return str(ip_val)

    if ip_val:
        return str(ip_val)

    if entry.get("prefix"):
        try:
            return str(ipaddress.ip_network(str(entry.get("prefix")), strict=False))
        except Exception:
            return str(entry.get("prefix"))

    return json.dumps(entry, ensure_ascii=False)


def _standardize_group_content(field_name, raw_content):
    """Standardize group content for BP extract columns."""
    if raw_content in (None, "", [], {}):
        return ""

    parsed = raw_content
    if isinstance(raw_content, str):
        try:
            parsed = json.loads(raw_content)
        except Exception:
            return raw_content

    if not isinstance(parsed, list):
        return str(raw_content)

    if field_name in ("dPortGroup", "sPortGroup"):
        formatted = [item for item in (_format_port_entry(entry) for entry in parsed) if item]
        return ", ".join(formatted)

    if field_name in ("dAddressGroup", "sAddressGroup"):
        formatted = [item for item in (_format_address_entry(entry) for entry in parsed) if item]
        return ", ".join(formatted)

    return str(raw_content)


def _prefix_length(ip_obj, mask_val):
    if mask_val is None or mask_val == "":
        return 128 if ip_obj.version == 6 else 32
    mask_str = str(mask_val)
    if mask_str.isdigit():
        return int(mask_str)
    if ip_obj.version == 4:
        return ipaddress.IPv4Network(f"0.0.0.0/{mask_str}").prefixlen
    bits = f"{int(ipaddress.IPv6Address(mask_str)):0128b}"
    if "01" in bits:
        raise ValueError("Non-contiguous IPv6 netmask")
    return bits.count("1")


def _to_cidr(ip_val, mask_val):
    """Convert IPv4/IPv6 ip+mask into canonical CIDR string."""
    try:
        ip_obj = ipaddress.ip_address(str(ip_val))
        prefix_len = _prefix_length(ip_obj, mask_val)
        network = ipaddress.ip_network(f"{ip_obj}/{prefix_len}", strict=False)
        return str(network)
    except ValueError:
        return ""


def _group_content_from_rule(object_groups, qosrule, field_name):
    """Resolve group contents from rule match logicalId."""
    logical_id = qosrule.get("match", {}).get(field_name)
    group = _find_group_by_logical_id(object_groups, logical_id)
    raw_content = _extract_group_content(group)
    return _standardize_group_content(field_name, raw_content)


def _reference_name(value, logical_id):
    normalized_target = str(logical_id)
    normalized_target_no_prefix = normalized_target.replace("dc:", "", 1)
    for id_key in ("logicalId", "edgeLogicalId", "gatewayLogicalId", "id", "uuid"):
        candidate = value.get(id_key)
        if candidate is None:
            continue
        text = str(candidate)
        if (text == normalized_target or text == f"dc:{normalized_target_no_prefix}"
                or text.replace("dc:", "", 1) == normalized_target_no_prefix):
            for name_key in ("name", "displayName", "gatewayName", "providerName"):
                if value.get(name_key):
                    return str(value.get(name_key))
    return ""


def _find_name_for_logical_id(value, logical_id):
    """Recursively search nested structures for a name matching logical_id."""
    if isinstance(value, dict):
        name = _reference_name(value, logical_id)
        if name:
            return name
        children = value.values()
    elif isinstance(value, list):
        children = value
    else:
        return ""

    for child in children:
        found = _find_name_for_logical_id(child, logical_id)
        if found:
            return found
    return ""


def _resolve_match_dest_name(logical_id, object_groups, hubs, csssites, nsdgw):
    """Resolve dc logicalId to a readable name from known sources."""
    group = _find_group_by_logical_id(object_groups, logical_id)
    if isinstance(group, dict) and group.get("name"):
        return str(group.get("name"))

    for source in (hubs or [], csssites or [], nsdgw or []):
        resolved = _find_name_for_logical_id(source, logical_id)
        if resolved:
            return resolved

    return ""


def _normalize_match_dest(match_dest, object_groups, hubs, csssites, nsdgw):
    """Replace 'prefix: dc:<uuid>' with resolved name when possible."""
    text = str(match_dest or "")
    if text.strip().lower() == "prefix: any":
        return "Internet"
    match = re.search(r"^\s*prefix:\s*dc:([0-9a-fA-F-]{36})\s*$", text)
    if not match:
        return text

    logical_id = match.group(1)
    resolved_name = _resolve_match_dest_name(logical_id, object_groups, hubs, csssites, nsdgw)
    if resolved_name:
        return f"prefix: {resolved_name}"
    return text


def _combine_policy_components(match_value, group_name, group_details, port_name, port_details):
    """Build multiline Source/Destination cell from optional components."""
    parts = []
    if match_value:
        parts.append(str(match_value))
    if group_name:
        parts.append(f"Group: {group_name}")
    if group_details:
        parts.append(str(group_details))
    if port_name:
        parts.append(f"Ports: {port_name}")
    if port_details:
        parts.append(str(port_details))
    return "\n".join([part for part in parts if str(part).strip()])


def _build_policy_table_rows(raw_rows):
    """Map raw BP extract rows into Policy Table rows."""
    mapped_rows = []
    for raw in raw_rows:
        source_value = _combine_policy_components(
            raw.get(MATCH_SOURCE, ""),
            raw.get(SOURCE_ADDRESS_GROUP, ""),
            raw.get(SOURCE_ADDRESS_GROUP_DETAILS, ""),
            raw.get(SOURCE_PORT_GROUP, ""),
            raw.get(SOURCE_PORT_GROUP_DETAILS, ""),
        )
        destination_value = _combine_policy_components(
            raw.get(MATCH_DESTINATION, ""),
            raw.get(DESTINATION_ADDRESS_GROUP, ""),
            raw.get(DESTINATION_ADDRESS_GROUP_DETAILS, ""),
            raw.get(DESTINATION_PORT_GROUP, ""),
            raw.get(DESTINATION_PORT_GROUP_DETAILS, ""),
        )
        application = str(raw.get(MATCH_APPLICATION, "") or "").strip() or "Any"

        mapped_rows.append([
            raw.get(SOURCE_NAME, ""),
            raw.get("Segment", ""),
            raw.get(RULE_NAME, ""),
            source_value,
            destination_value,
            application,
            raw.get(ACTION_LINK, ""),
            raw.get(ACTION_NETWORK_SERVICE, ""),
            raw.get(ACTION_PRIORITY, ""),
            raw.get(ACTION_SERVICE_CLASS, ""),
            raw.get(ACTION_LINK_PREFERRED, ""),
            raw.get(DSCP_OUTER, ""),
        ])
    return mapped_rows


def _validate_policy_table_output(raw_rows, headers, policy_rows, raw_sheet_name, workbook):
    """Validate generated Policy Table against required constraints."""
    if len(policy_rows) != len(raw_rows):
        raise ValueError("Policy Table row count does not match raw-data row count")
    if len(headers) != 12:
        raise ValueError("Policy Table must contain exactly 12 columns")

    expected_headers = [
        SOURCE_NAME,
        "Segment",
        "Rule # & Name",
        "Source",
        "Destination",
        "Application",
        "Action",
        "Network Service",
        "Priority",
        "Service Class",
        "Preferred Link",
        "DSCP Outer",
    ]
    if headers != expected_headers:
        raise ValueError("Policy Table headers do not match requested headers")

    invalid_tokens = {"#REF!", "#VALUE!", "#NAME?", "#SPILL!", "#DIV/0!"}
    for row in policy_rows:
        for value in row:
            if isinstance(value, str) and value.strip().upper() in invalid_tokens:
                raise ValueError("Policy Table contains invalid Excel error token")

    if raw_sheet_name not in workbook.sheetnames:
        raise ValueError("Original raw worksheet is missing")


def _read_policy_raw_rows(raw_ws):
    raw_headers = [
        raw_ws.cell(row=1, column=col_idx).value
        for col_idx in range(1, raw_ws.max_column + 1)
    ]
    header_to_index = {str(name): idx + 1 for idx, name in enumerate(raw_headers) if name is not None}

    required_raw_headers = [
        SOURCE_NAME, "Segment", RULE_NAME, MATCH_SOURCE,
        SOURCE_ADDRESS_GROUP, SOURCE_ADDRESS_GROUP_DETAILS,
        SOURCE_PORT_GROUP, SOURCE_PORT_GROUP_DETAILS, MATCH_DESTINATION,
        DESTINATION_ADDRESS_GROUP, DESTINATION_ADDRESS_GROUP_DETAILS,
        DESTINATION_PORT_GROUP, DESTINATION_PORT_GROUP_DETAILS, MATCH_APPLICATION,
        ACTION_LINK, ACTION_NETWORK_SERVICE, ACTION_PRIORITY, ACTION_SERVICE_CLASS,
        ACTION_LINK_PREFERRED, DSCP_OUTER,
    ]
    missing = [name for name in required_raw_headers if name not in header_to_index]
    if missing:
        raise ValueError(f"Missing required raw headers: {', '.join(missing)}")

    raw_rows = []
    for row_idx in range(2, raw_ws.max_row + 1):
        raw_row = {}
        for key, col_idx in header_to_index.items():
            raw_row[key] = raw_ws.cell(row=row_idx, column=col_idx).value
        raw_rows.append(raw_row)
    return raw_rows


def _format_policy_sheet(policy_ws, last_row):
    header_fill = PatternFill(fill_type="solid", fgColor="17365D")
    header_font = Font(color="FFFFFF", bold=True)
    header_alignment = Alignment(horizontal="center", vertical="center")
    body_alignment_top = Alignment(vertical="top", wrap_text=False)
    body_font = Font(size=9)

    for col_idx in range(1, 13):
        cell = policy_ws.cell(row=1, column=col_idx)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = header_alignment

    policy_ws.row_dimensions[1].height = 30

    wrap_columns = {4, 5, 6, 7, 8, 11}
    center_columns = {9, 10, 12}
    for row_idx in range(2, last_row + 1):
        for col_idx in range(1, 13):
            cell = policy_ws.cell(row=row_idx, column=col_idx)
            cell.font = body_font
            if col_idx in wrap_columns:
                cell.alignment = Alignment(vertical="top", wrap_text=True)
            elif col_idx in center_columns:
                cell.alignment = Alignment(horizontal="center", vertical="top", wrap_text=False)
            else:
                cell.alignment = body_alignment_top

    widths = {
        "A": 25, "B": 15, "C": 22, "D": 29, "E": 29, "F": 21,
        "G": 26, "H": 15, "I": 10, "J": 13, "K": 29, "L": 11,
    }
    for col_letter, width in widths.items():
        policy_ws.column_dimensions[col_letter].width = width

    for col_idx in range(13, 51):  # M:AX
        policy_ws.column_dimensions[get_column_letter(col_idx)].hidden = True

    high_fill = PatternFill(fill_type="solid", fgColor="F4CCCC")
    high_font = Font(color="9C0006", bold=True)
    normal_fill = PatternFill(fill_type="solid", fgColor="FFF2CC")
    normal_font = Font(color="7F6000")
    low_fill = PatternFill(fill_type="solid", fgColor="E2F0D9")
    low_font = Font(color="375623")

    priority_range = f"I2:I{last_row if last_row >= 2 else 2}"
    policy_ws.conditional_formatting.add(
        priority_range,
        FormulaRule(formula=['LOWER($I2)="high"'], stopIfTrue=False, fill=high_fill, font=high_font),
    )
    policy_ws.conditional_formatting.add(
        priority_range,
        FormulaRule(formula=['LOWER($I2)="normal"'], stopIfTrue=False, fill=normal_fill, font=normal_font),
    )
    policy_ws.conditional_formatting.add(
        priority_range,
        FormulaRule(formula=['LOWER($I2)="low"'], stopIfTrue=False, fill=low_fill, font=low_font),
    )

    # Keep gridlines hidden and do not freeze panes.
    policy_ws.sheet_view.showGridLines = False
    policy_ws.freeze_panes = None


def _apply_policy_table_sheet(out_name):
    """Create formatted Policy Table worksheet while preserving the raw worksheet unchanged."""
    out_name.seek(0)
    workbook = load_workbook(out_name)

    # Reuse current workbook naming and locate existing BP raw worksheet dynamically.
    raw_sheet_name = workbook.sheetnames[0]
    if "BPExtract" in workbook.sheetnames:
        raw_sheet_name = "BPExtract"
    raw_ws = workbook[raw_sheet_name]

    raw_rows = _read_policy_raw_rows(raw_ws)

    policy_headers = [
        SOURCE_NAME,
        "Segment",
        "Rule # & Name",
        "Source",
        "Destination",
        "Application",
        "Action",
        "Network Service",
        "Priority",
        "Service Class",
        "Preferred Link",
        "DSCP Outer",
    ]
    policy_rows = _build_policy_table_rows(raw_rows)
    _validate_policy_table_output(raw_rows, policy_headers, policy_rows, raw_sheet_name, workbook)

    if POLICY_TABLE in workbook.sheetnames:
        workbook.remove(workbook[POLICY_TABLE])
    policy_ws = workbook.create_sheet(POLICY_TABLE)

    for col_idx, header in enumerate(policy_headers, start=1):
        policy_ws.cell(row=1, column=col_idx, value=header)

    for row_offset, row_values in enumerate(policy_rows, start=2):
        for col_idx, value in enumerate(row_values, start=1):
            policy_ws.cell(row=row_offset, column=col_idx, value=value)

    last_row = len(policy_rows) + 1
    table_ref = f"A1:L{last_row if last_row >= 2 else 2}"
    table = Table(displayName="PolicyRulesView", ref=table_ref)
    table.tableStyleInfo = TableStyleInfo(
        name="TableStyleMedium2",
        showFirstColumn=False,
        showLastColumn=False,
        showRowStripes=True,
        showColumnStripes=False,
    )
    policy_ws.add_table(table)

    _format_policy_sheet(policy_ws, last_row)

    # Place Policy Table before raw worksheet and make it active with A1 selected.
    raw_index = workbook.sheetnames.index(raw_sheet_name)
    workbook._sheets.remove(policy_ws)
    workbook._sheets.insert(raw_index, policy_ws)
    workbook.active = workbook.sheetnames.index(POLICY_TABLE)
    policy_ws.sheet_view.selection[0].activeCell = "A1"
    policy_ws.sheet_view.selection[0].sqref = "A1"

    output = BytesIO()
    workbook.save(output)
    output.seek(0)
    return output



def _append_source_qos_rows(sources, source_type, rows, dpi_apps, object_groups):
    for source in sources:
        if source_type == "edge":
            print(source["name"])
        configstack = source.get("configstack", {}) if source_type == "edge" else source
        modules = configstack.get("modules", [])
        devmod = ""
        qosmod = ""
        for module in modules:
            if module.get("name") == "deviceSettings":
                devmod = module
            elif module.get("name") == "QOS":
                qosmod = module

        if not devmod:
            continue

        csssites, nsdgw = _collect_css_and_nsdgw(devmod, qosmod)
        bhhubs = _backhaul_edges_by_segment(devmod)
        _append_qos_rows(
            rows,
            source_name=source.get("name", ""),
            source_type=source_type,
            qos_module=qosmod,
            csssites=csssites,
            bhhubs=bhhubs,
            nsdgw=nsdgw,
            dpi_apps=dpi_apps,
            object_groups=object_groups,
        )


def danone_bp_extract_generate(edge_list, dpi_apps, routable_apps, object_groups, profiles):
    """Generate QOS-only business policy extract for edges and profiles."""
    out_name = BytesIO()

    for app in routable_apps.get("applications", []):
        dpi_apps["applications"].append(app)
    with open('api/app_additional.json', encoding='utf-8') as json_file:
        for app in json.load(json_file):
            dpi_apps["applications"].append(app)

    rows = []

    _append_source_qos_rows(edge_list, "edge", rows, dpi_apps, object_groups)

    _append_source_qos_rows(profiles, "profile", rows, dpi_apps, object_groups)

    wb = xlsxwriter.Workbook(out_name)
    ws = wb.add_worksheet('BPExtract')

    headers = [
        "Source Type",
        SOURCE_NAME,
        "Segment",
        RULE_NAME,
        MATCH_SOURCE,
        SOURCE_ADDRESS_GROUP,
        SOURCE_ADDRESS_GROUP_DETAILS,
        SOURCE_PORT_GROUP,
        SOURCE_PORT_GROUP_DETAILS,
        MATCH_DESTINATION,
        DESTINATION_ADDRESS_GROUP,
        DESTINATION_ADDRESS_GROUP_DETAILS,
        DESTINATION_PORT_GROUP,
        DESTINATION_PORT_GROUP_DETAILS,
        MATCH_APPLICATION,
        ACTION_NETWORK_SERVICE,
        ACTION_LINK,
        ACTION_PRIORITY,
        ACTION_SERVICE_CLASS,
        ACTION_LINK_PREFERRED,
        "DSCP inner",
        DSCP_OUTER,
    ]

    for col, header in enumerate(headers):
        ws.write(0, col, header)

    for row_idx, row in enumerate(rows, start=1):
        for col_idx, header in enumerate(headers):
            ws.write(row_idx, col_idx, row.get(header, ""))

    ws.set_column(0, len(headers) - 1, 24)
    wb.close()
    out_name = _apply_policy_table_sheet(out_name)
    out_name.seek(0)
    return b64encode(out_name.read()).decode()

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
        (['activationTime'], ACTIVATION_TIME),
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

# Software lifecycle map
SOFTWARE_RELEASES = [
    {"version": "3.0.", "eogs": "2021-05-15", "eotg": "2021-08-15"},
    {"version": "3.1.", "eogs": "2021-05-15", "eotg": "2021-08-15"},
    {"version": "3.2", "eogs": "2021-12-15", "eotg": "2022-03-15"},
    {"version": "3.3", "eogs": "2021-12-15", "eotg": "2022-03-15"},
    {"version": "3.4.", "eogs": "2022-12-31", "eotg": "2023-03-31"},
    {"version": "4.0.", "eogs": "2022-09-30", "eotg": "2022-12-30"},
    {"version": "4.2.", "eogs": "2023-06-30", "eotg": "2025-09-30"},
    {"version": "4.3.", "eogs": "2023-06-30", "eotg": "2025-09-30"},
    {"version": "4.5.", "eogs": "2025-09-30", "eotg": "2025-12-31"},
    {"version": "5.0.", "eogs": "2026-02-28", "eotg": "2027-02-28"},
    {"version": "5.1.", "eogs": "2026-02-28", "eotg": "2027-02-28"},
    {"version": "5.2.0", "eogs": "2026-02-28", "eotg": "2027-02-28"},
    {"version": "5.2.2", "eogs": "2026-02-28", "eotg": "2027-02-28"},
    {"version": "5.2.3", "eogs": "2027-03-16", "eotg": LTS_RELEASE},
    {"version": "5.2.4", "eogs": "2027-03-16", "eotg": LTS_RELEASE},
    {"version": "5.4.", "eogs": "2026-02-28", "eotg": "2027-02-28"},
    {"version": "6.1.2", "eogs": "Not yet announced", "eotg": LTS_RELEASE},
    {"version": "6.1.", "eogs": "Not yet announced", "eotg": "Not LTS release"}
]

def _service_release_dates(sw_version: str):
    if not sw_version:
        return "", ""
    sw_version = str(sw_version).strip()

    # Guard numeric-run starts and prevent backtracking within each run.
    m = re.search(r"(?<!\d)(\d++\.\d++\.\d++)", sw_version)
    if not m:
        m = re.search(r"(?<!\d)(\d++\.\d++)", sw_version)
        if not m:
            return "", ""
        parsed_version = m.group(1)
    else:
        parsed_version = m.group(1)

    for rel in SOFTWARE_RELEASES:
        if rel["version"] == parsed_version:
            return rel["eogs"], rel["eotg"]

    best_match = None
    for rel in SOFTWARE_RELEASES:
        rel_version = rel["version"].rstrip(".")
        if parsed_version.startswith(rel_version):
            best_match = rel
            break

    if best_match:
        return best_match["eogs"], best_match["eotg"]

    return "", ""

def _service_license_level(license_str):
    if pd.isna(license_str) or license_str == '':
        return 'No License'
    license_upper = str(license_str).upper()
    if 'PREMIUM' in license_upper:
        return 'PREMIUM'
    elif 'STANDARD' in license_upper:
        return 'STANDARD'
    elif 'ENTERPRISE' in license_upper:
        return 'ENTERPRISE'
    return 'Other'

def _service_license_bandwidth(license_str):
    if pd.isna(license_str) or license_str == '':
        return 'Unknown'
    license_str = str(license_str).strip()
    match = re.search(r'(?<!\d)(\d++(?:\.\d*+)?)\s*+(Mbps|Gbps)', license_str)
    if match:
        return f"{match.group(1)} {match.group(2)}"
    return 'Unknown'


def _service_site_rows(edge_list):
    # Extract sites data
    sites_data = []
    for edge in edge_list or []:
        software_version = dotted_key_list(edge, ['softwareVersion'])
        eogs, eotg = _service_release_dates(software_version)

        site_row = {
            'Hostname': dotted_key_list(edge, ['name']),
            MODEL_NUMBER: dotted_key_list(edge, ['modelNumber']),
            'Profile': dotted_key_list(edge, ['configuration', 'enterprise', 'name']),
            'Custom Info': dotted_key_list(edge, ['customInfo']),
            'Description': dotted_key_list(edge, ['description']),
            'Serial Number': dotted_key_list(edge, ['serialNumber']),
            'HA Serial Number': '' if edge.get('haState') == "UNCONFIGURED" else dotted_key_list(edge, ['haSerialNumber']),
            SOFTWARE_VERSION: software_version,
            'End of General Support': eogs,
            'End of Technical Guidance': eotg,
            'License': edge.get('licenses', [{}])[0].get('alias', '') if edge.get('licenses') else '',
            'Is Hub': dotted_key_list(edge, ['isHub']),
            HA_MODE: dotted_key_list(edge, ['haMode']),
            'Country': dotted_key_list(edge, ['site', 'country']),
            'State': dotted_key_list(edge, ['site', 'state']),
            'City': dotted_key_list(edge, ['site', 'city']),
            'Street Address': dotted_key_list(edge, ['site', 'streetAddress']),
            'Street Address 2': dotted_key_list(edge, ['site', 'streetAddress2']),
            'Postal Code': dotted_key_list(edge, ['site', 'postalCode']),
            'Timezone': dotted_key_list(edge, ['site', 'timezone']),
            ACTIVATION_TIME: dotted_key_list(edge, ['activationTime']),
            'Activation State': dotted_key_list(edge, ['activationState']),
            EDGE_STATE: dotted_key_list(edge, ['edgeState'])
        }
        sites_data.append(site_row)
    return sites_data


def _service_circuit_row(edge, link, perf_data):
    interfaces = link.get('interfaces', [])
    if isinstance(interfaces, list):
        interfaces_str = ', '.join(map(str, interfaces))
    else:
        interfaces_str = str(interfaces) if interfaces is not None else ''

    circuit_row = {
        'Hostname': edge.get('name', ''),
        OVERLAY_NAME: link.get('name', ''),
        'mode': link.get('mode', ''),
        'type': link.get('type', ''),
        'backupOnly': link.get('backupOnly', ''),
        'interfaces': interfaces_str,
        'IP Address': link.get('publicIpAddress', ''),
        PACKET_LOSS_RX: round(perf_data.get('bestLossPctRx', 0), 3) if perf_data.get('bestLossPctRx') is not None else '',
        PACKET_LOSS_TX: round(perf_data.get('bestLossPctTx', 0), 3) if perf_data.get('bestLossPctTx') is not None else '',
        BYTES_RX: convert_bytes(perf_data.get('bytesRx')) if perf_data.get('bytesRx') is not None else '',
        BYTES_TX: convert_bytes(perf_data.get('bytesTx')) if perf_data.get('bytesTx') is not None else '',
        JITTER_RX: round(perf_data.get('bestJitterMsRx', 0), 2) if perf_data.get('bestJitterMsRx') is not None else '',
        JITTER_TX: round(perf_data.get('bestJitterMsTx', 0), 2) if perf_data.get('bestJitterMsTx') is not None else '',
        LATENCY_RX: round(perf_data.get('bestLatencyMsRx', 0), 2) if perf_data.get('bestLatencyMsRx') is not None else '',
        LATENCY_TX: round(perf_data.get('bestLatencyMsTx', 0), 2) if perf_data.get('bestLatencyMsTx') is not None else '',
        'isp': link.get('isp', ''),
        'Bytes RX raw': perf_data.get('bytesRx'),
        'Bytes TX raw': perf_data.get('bytesTx'),
        'internalId': link.get('internalId', '')
    }
    return circuit_row


def _service_circuit_rows(edge_list, circuits_performance):
    # Extract circuits data
    circuits_data = []
    circuits_perf_lookup = {}

    if circuits_performance:
        for perf in circuits_performance:
            link_id = perf.get('internalId') or perf.get('linkLogicalId')
            if link_id:
                circuits_perf_lookup[link_id] = perf

    for edge in edge_list or []:
        wan_links = edge.get('wanLinks', {}).get('links', [])
        for link in wan_links:
            link_internal_id = link.get('internalId', '')
            perf_data = circuits_perf_lookup.get(link_internal_id, {})

            circuit_row = _service_circuit_row(edge, link, perf_data)

            circuits_data.append(circuit_row)
    return circuits_data


def _service_distributions(df_sites):
    # Summary distributions
    if MODEL_NUMBER in df_sites.columns:
        model_dist = df_sites[MODEL_NUMBER].value_counts(dropna=False).reset_index()
        model_dist.columns = [MODEL_NUMBER, 'Count']
    else:
        model_dist = pd.DataFrame(columns=[MODEL_NUMBER, 'Count'])

    if SOFTWARE_VERSION in df_sites.columns:
        sw_dist = df_sites[SOFTWARE_VERSION].value_counts(dropna=False).reset_index()
        sw_dist.columns = [SOFTWARE_VERSION, 'Count']
    else:
        sw_dist = pd.DataFrame(columns=[SOFTWARE_VERSION, 'Count'])

    license_dist = df_sites[LICENSE_LEVEL].value_counts(dropna=False).reset_index()
    license_dist.columns = [LICENSE_LEVEL, 'Count']

    bandwidth_dist = df_sites[LICENSE_BANDWIDTH].value_counts(dropna=False).reset_index()
    bandwidth_dist.columns = [LICENSE_BANDWIDTH, 'Count']

    if HA_MODE in df_sites.columns:
        ha_dist = df_sites[HA_MODE].value_counts(dropna=False).reset_index()
        ha_dist.columns = [HA_MODE, 'Count']
    else:
        ha_dist = pd.DataFrame(columns=[HA_MODE, 'Count'])
    return model_dist, sw_dist, license_dist, bandwidth_dist, ha_dist


def _write_service_data_sheets(writer, df_sites, df_circuits, distributions):
    workbook = writer.book
    model_dist, sw_dist, license_dist, bandwidth_dist, ha_dist = distributions
    # Write sites sheet
    df_sites.to_excel(writer, index=False, sheet_name='Sites')
    worksheet_sites = writer.sheets['Sites']
    if len(df_sites.columns) > 0 and not df_sites.empty:
        worksheet_sites.add_table(0, 0, len(df_sites), len(df_sites.columns) - 1, {
            'columns': [{'header': column_name} for column_name in df_sites.columns],
            'style': 'Table Style Medium 9'
        })
    worksheet_sites.set_column('A:Z', 20)

    # Write circuits sheet
    df_circuits.to_excel(writer, index=False, sheet_name='Circuits')
    worksheet_circuits = writer.sheets['Circuits']
    if len(df_circuits.columns) > 0 and not df_circuits.empty:
        worksheet_circuits.add_table(0, 0, len(df_circuits), len(df_circuits.columns) - 1, {
            'columns': [{'header': column_name} for column_name in df_circuits.columns],
            'style': 'Table Style Medium 9'
        })
    worksheet_circuits.set_column('A:Z', 20)

    # Hidden data sheets for charts
    def write_hidden_data_sheet(sheet_name, df_data):
        ws = workbook.add_worksheet(sheet_name)
        ws.hide()
        for c_idx, col in enumerate(df_data.columns):
            ws.write(0, c_idx, col)
        for r_idx, row in enumerate(df_data.values, start=1):
            for c_idx, val in enumerate(row):
                ws.write(r_idx, c_idx, val)
        return ws

    write_hidden_data_sheet('data_model', model_dist)
    write_hidden_data_sheet('data_sw', sw_dist)
    write_hidden_data_sheet('data_license', license_dist)
    write_hidden_data_sheet('data_bandwidth', bandwidth_dist)
    write_hidden_data_sheet('data_ha', ha_dist)


def _service_analysis_formats(workbook: xlsxwriter.Workbook) -> _ServiceFormats:
    header_fill = workbook.add_format({'bg_color': '#4472C4', 'font_color': 'white', 'bold': True, 'border': 1})
    section_fill = workbook.add_format({'bg_color': '#2F5496', 'font_color': 'white', 'bold': True, 'align': 'center', 'valign': 'vcenter', 'border': 1})
    alert_fill_red = workbook.add_format({'bg_color': '#FF6B6B', 'border': 1})
    alert_fill_orange = workbook.add_format({'bg_color': '#FFB347', 'border': 1})
    thin_border_format = workbook.add_format({'border': 1})
    title_format = workbook.add_format({'bold': True, 'font_size': 14, 'font_color': '#2F5496', 'align': 'center', 'valign': 'vcenter'})
    return _ServiceFormats(header_fill, section_fill, alert_fill_red,
                           alert_fill_orange, thin_border_format, title_format)


def _write_service_site_status(analysis_ws, df_sites, current_row, formats: _ServiceFormats):
    analysis_ws.merge_range(current_row, 0, current_row, 1, '1. SITE STATUS OVERVIEW', formats.section)
    current_row += 1
    analysis_ws.write(current_row, 0, 'Metric', formats.header)
    analysis_ws.write(current_row, 1, 'Count', formats.header)
    current_row += 1
    total_sites = len(df_sites)
    connected_sites = len(df_sites[df_sites[EDGE_STATE] == 'CONNECTED']) if EDGE_STATE in df_sites.columns else 0
    offline_sites = len(df_sites[df_sites[EDGE_STATE] == 'OFFLINE']) if EDGE_STATE in df_sites.columns else 0
    undeployed_sites = len(df_sites[df_sites[EDGE_STATE] == 'NEVER_ACTIVATED']) if EDGE_STATE in df_sites.columns else 0
    connection_rate = connected_sites / total_sites * 100 if total_sites > 0 else 0
    site_metrics = [
        ('Total Sites', total_sites),
        ('Connected Sites', connected_sites),
        ('Offline Sites', offline_sites),
        ('Undeployed Sites', undeployed_sites),
        ('Active Sites (%)', round(connection_rate, 1)),
    ]
    for metric, value in site_metrics:
        analysis_ws.write(current_row, 0, metric, formats.normal)
        analysis_ws.write(current_row, 1, value, formats.normal)
        current_row += 1
    current_row += 1
    return current_row


def _write_service_model_distribution(analysis_ws, df_sites, current_row, formats: _ServiceFormats):
    analysis_ws.merge_range(current_row, 0, current_row, 1, '2. MODEL DISTRIBUTION', formats.section)
    current_row += 1
    analysis_ws.write(current_row, 0, MODEL_NUMBER, formats.header)
    analysis_ws.write(current_row, 1, 'Count', formats.header)
    current_row += 1
    if MODEL_NUMBER in df_sites.columns:
        model_counts = df_sites[MODEL_NUMBER].replace('', pd.NA).dropna().value_counts().head(10)
        for model, count in model_counts.items():
            analysis_ws.write(current_row, 0, model, formats.normal)
            analysis_ws.write(current_row, 1, count, formats.normal)
            current_row += 1
    current_row += 1
    return current_row


def _write_service_version_distribution(analysis_ws, df_sites, current_row, formats: _ServiceFormats):
    analysis_ws.merge_range(current_row, 0, current_row, 1, '3. SOFTWARE VERSION DISTRIBUTION', formats.section)
    current_row += 1
    analysis_ws.write(current_row, 0, SOFTWARE_VERSION, formats.header)
    analysis_ws.write(current_row, 1, 'Count', formats.header)
    current_row += 1
    if SOFTWARE_VERSION in df_sites.columns:
        sw_counts = df_sites[SOFTWARE_VERSION].value_counts(dropna=False)
        for version, count in sw_counts.items():
            analysis_ws.write(current_row, 0, version if version else '(blank)', formats.normal)
            analysis_ws.write(current_row, 1, count, formats.normal)
            current_row += 1
    current_row += 2
    return current_row


def _write_service_circuit_summary(analysis_ws, df_circuits, current_row, formats: _ServiceFormats):
    analysis_ws.merge_range(current_row, 0, current_row, 1, '4. CIRCUIT ANALYSIS', formats.section)
    current_row += 1
    analysis_ws.write(current_row, 0, 'Metric', formats.header)
    analysis_ws.write(current_row, 1, 'Value', formats.header)
    current_row += 1
    total_circuits = len(df_circuits)
    private_circuits = len(df_circuits[df_circuits['mode'] == 'PRIVATE']) if 'mode' in df_circuits.columns else 0
    public_circuits = len(df_circuits[df_circuits['mode'] == 'PUBLIC']) if 'mode' in df_circuits.columns else 0
    avg_latency_rx = pd.to_numeric(df_circuits[LATENCY_RX], errors='coerce').mean() if LATENCY_RX in df_circuits.columns else 0
    avg_latency_tx = pd.to_numeric(df_circuits[LATENCY_TX], errors='coerce').mean() if LATENCY_TX in df_circuits.columns else 0
    circuit_metrics = [
        ('Total Circuits', total_circuits),
        ('Private Circuits', private_circuits),
        ('Public Circuits', public_circuits),
        ('Avg Latency RX (ms)', round(avg_latency_rx, 2) if not pd.isna(avg_latency_rx) else 0),
        ('Avg Latency TX (ms)', round(avg_latency_tx, 2) if not pd.isna(avg_latency_tx) else 0),
    ]
    for metric, value in circuit_metrics:
        analysis_ws.write(current_row, 0, metric, formats.normal)
        analysis_ws.write(current_row, 1, value, formats.normal)
        current_row += 1
    current_row += 2
    return current_row


def _service_numeric_columns(df_circuits):
    # Numeric helper columns
    if LATENCY_RX in df_circuits.columns:
        df_circuits[LATENCY_RX_NUMERIC] = pd.to_numeric(df_circuits[LATENCY_RX], errors='coerce')
    else:
        df_circuits[LATENCY_RX_NUMERIC] = pd.Series(dtype='float64')

    if JITTER_RX in df_circuits.columns:
        df_circuits[JITTER_RX_NUMERIC] = pd.to_numeric(df_circuits[JITTER_RX], errors='coerce')
    else:
        df_circuits[JITTER_RX_NUMERIC] = pd.Series(dtype='float64')

    if PACKET_LOSS_RX in df_circuits.columns:
        df_circuits[PACKET_LOSS_RX_NUMERIC] = pd.to_numeric(df_circuits[PACKET_LOSS_RX], errors='coerce')
    else:
        df_circuits[PACKET_LOSS_RX_NUMERIC] = pd.Series(dtype='float64')


def _write_service_volume_rx(analysis_ws, df_circuits, current_row, formats: _ServiceFormats):
    analysis_ws.merge_range(current_row, 0, current_row, 4, '8. TOP 10 CIRCUITS BY DATA VOLUME (RX)', formats.section)
    current_row += 1
    headers_volume_rx = ['Hostname', OVERLAY_NAME, 'Mode', 'ISP', 'Total Data RX']
    for i, header in enumerate(headers_volume_rx):
        analysis_ws.write(current_row, i, header, formats.header)
    current_row += 1
    if not df_circuits.empty:
        df_circuits['Bytes_RX_raw'] = pd.to_numeric(df_circuits['Bytes RX raw'], errors='coerce').fillna(0)
        worst_volume_rx = df_circuits.nlargest(10, 'Bytes_RX_raw')[['Hostname', OVERLAY_NAME, 'mode', 'isp', BYTES_RX]]
        for _, row in worst_volume_rx.iterrows():
            analysis_ws.write(current_row, 0, row['Hostname'], formats.normal)
            analysis_ws.write(current_row, 1, row[OVERLAY_NAME] if pd.notna(row[OVERLAY_NAME]) else '', formats.normal)
            analysis_ws.write(current_row, 2, row['mode'] if pd.notna(row['mode']) else '', formats.normal)
            analysis_ws.write(current_row, 3, row['isp'] if pd.notna(row['isp']) else '', formats.normal)
            analysis_ws.write(current_row, 4, row[BYTES_RX], formats.normal)
            current_row += 1
    current_row += 2
    return current_row


def _write_service_volume_tx(analysis_ws, df_circuits, current_row, formats: _ServiceFormats):
    analysis_ws.merge_range(current_row, 0, current_row, 4, '8B. TOP 10 CIRCUITS BY DATA VOLUME (TX)', formats.section)
    current_row += 1
    headers_volume_tx = ['Hostname', OVERLAY_NAME, 'Mode', 'ISP', 'Total Data TX']
    for i, header in enumerate(headers_volume_tx):
        analysis_ws.write(current_row, i, header, formats.header)
    current_row += 1
    if not df_circuits.empty:
        df_circuits['Bytes_TX_raw'] = pd.to_numeric(df_circuits['Bytes TX raw'], errors='coerce').fillna(0)
        worst_volume_tx = df_circuits.nlargest(10, 'Bytes_TX_raw')[['Hostname', OVERLAY_NAME, 'mode', 'isp', BYTES_TX]]
        for _, row in worst_volume_tx.iterrows():
            analysis_ws.write(current_row, 0, row['Hostname'], formats.normal)
            analysis_ws.write(current_row, 1, row[OVERLAY_NAME] if pd.notna(row[OVERLAY_NAME]) else '', formats.normal)
            analysis_ws.write(current_row, 2, row['mode'] if pd.notna(row['mode']) else '', formats.normal)
            analysis_ws.write(current_row, 3, row['isp'] if pd.notna(row['isp']) else '', formats.normal)
            analysis_ws.write(current_row, 4, row[BYTES_TX], formats.normal)
            current_row += 1
    current_row += 2
    return current_row


def _write_service_isp_distribution(analysis_ws, df_circuits, current_row, formats: _ServiceFormats):
    analysis_ws.merge_range(current_row, 0, current_row, 2, '9. ISP DISTRIBUTION (Top 15)', formats.section)
    current_row += 1
    analysis_ws.write(current_row, 0, 'ISP Name', formats.header)
    analysis_ws.write(current_row, 1, 'Circuit Count', formats.header)
    analysis_ws.write(current_row, 2, '% of Total', formats.header)
    current_row += 1
    if 'isp' in df_circuits.columns:
        isp_data = df_circuits[df_circuits['isp'].notna() & (df_circuits['isp'] != '') & (df_circuits['isp'] != '0')]
        isp_counts = isp_data['isp'].value_counts().head(15)
        total_with_isp = len(isp_data)
        for isp, count in isp_counts.items():
            pct = f'{count / total_with_isp * 100:.1f}%' if total_with_isp > 0 else '0%'
            analysis_ws.write(current_row, 0, isp, formats.normal)
            analysis_ws.write(current_row, 1, count, formats.normal)
            analysis_ws.write(current_row, 2, pct, formats.normal)
            current_row += 1
    current_row += 2
    return current_row


def _write_service_alerts(analysis_ws, df_circuits, current_row, formats: _ServiceFormats):
    analysis_ws.merge_range(current_row, 0, current_row, 2, '10. PERFORMANCE ALERTS SUMMARY', formats.section)
    current_row += 1
    analysis_ws.write(current_row, 0, 'Alert Type', formats.header)
    analysis_ws.write(current_row, 1, 'Threshold', formats.header)
    analysis_ws.write(current_row, 2, 'Count', formats.header)
    current_row += 1
    alerts = []
    high_latency = len(df_circuits[df_circuits[LATENCY_RX_NUMERIC] > 50])
    very_high_latency = len(df_circuits[df_circuits[LATENCY_RX_NUMERIC] > 100])
    alerts.append(('High Latency', '> 50 ms', high_latency))
    alerts.append(('Very High Latency', '> 100 ms', very_high_latency))
    high_jitter = len(df_circuits[df_circuits[JITTER_RX_NUMERIC] > 5])
    very_high_jitter = len(df_circuits[df_circuits[JITTER_RX_NUMERIC] > 10])
    alerts.append(('High Jitter', '> 5 ms', high_jitter))
    alerts.append(('Very High Jitter', '> 10 ms', very_high_jitter))
    packet_loss = len(df_circuits[df_circuits[PACKET_LOSS_RX_NUMERIC] > 0.1])
    high_packet_loss = len(df_circuits[df_circuits[PACKET_LOSS_RX_NUMERIC] > 1])
    alerts.append(('Packet Loss', '> 0.1%', packet_loss))
    alerts.append(('High Packet Loss', '> 1%', high_packet_loss))
    for alert, threshold, count in alerts:
        analysis_ws.write(current_row, 0, alert, formats.normal)
        analysis_ws.write(current_row, 1, threshold, formats.normal)
        fmt = formats.warning if count > 0 else formats.normal
        analysis_ws.write(current_row, 2, count, fmt)
        current_row += 1


def _write_service_charts(workbook, distributions):
    model_dist, sw_dist, license_dist, bandwidth_dist, ha_dist = distributions
    # Summary sheet with charts
    summary_ws = workbook.add_worksheet('Summary')
    summary_ws.set_column('A:Z', 20)

    chart_positions = [
        (0, 0),
        (0, 6),
        (32, 0),
        (32, 6),
        (64, 0),
    ]

    def add_chart_if_data(chart, sheet_name, df_data, title, pos_row, pos_col, chart_type='column'):
        if df_data.empty:
            summary_ws.write(pos_row, pos_col, f'No data for {title}')
            return

        chart.set_title({'name': title})
        chart.set_style(209 if chart_type != 'pie' else 253)
        chart.add_series({
            'name': title,
            'categories': [sheet_name, 1, 0, len(df_data), 0],
            'values': [sheet_name, 1, 1, len(df_data), 1],
            'data_labels': {'value': True} if chart_type != 'pie' else {}
        })
        chart.set_size({'width': 800, 'height': 600})
        summary_ws.insert_chart(pos_row, pos_col, chart)

    chart_model = workbook.add_chart({'type': 'column'})
    add_chart_if_data(chart_model, 'data_model', model_dist, 'Model Number Distribution', *chart_positions[0], chart_type='column')

    chart_sw = workbook.add_chart({'type': 'column'})
    add_chart_if_data(chart_sw, 'data_sw', sw_dist, 'Software Version Distribution', *chart_positions[1], chart_type='column')

    chart_license = workbook.add_chart({'type': 'column'})
    add_chart_if_data(chart_license, 'data_license', license_dist, 'License Level Distribution', *chart_positions[2], chart_type='column')

    chart_bandwidth = workbook.add_chart({'type': 'column'})
    add_chart_if_data(chart_bandwidth, 'data_bandwidth', bandwidth_dist, 'License Bandwidth Distribution', *chart_positions[3], chart_type='column')

    chart_ha = workbook.add_chart({'type': 'pie'})
    add_chart_if_data(chart_ha, 'data_ha', ha_dist, 'HA Mode Distribution', *chart_positions[4], chart_type='pie')


def _service_metric_format(value, warning, critical, formats: _ServiceFormats):
    numeric = pd.to_numeric(value, errors='coerce')
    if pd.notna(numeric):
        if numeric > critical:
            return formats.critical
        if numeric > warning:
            return formats.warning
    return formats.normal


def _write_service_ranked_row(worksheet, row_number, row, metric, row_format):
    worksheet.write(row_number, 0, row['Hostname'], row_format)
    for column, key in enumerate((OVERLAY_NAME, 'mode', 'isp'), start=1):
        worksheet.write(row_number, column, row[key] if pd.notna(row[key]) else '', row_format)
    worksheet.write(row_number, 4, row[metric], row_format)


def _write_service_ranked_section(worksheet, dataframe, current_row, title, metric, thresholds, formats: _ServiceFormats):
    warning, critical = thresholds
    worksheet.merge_range(current_row, 0, current_row, 4, title, formats.section)
    current_row += 1
    for column, header in enumerate(('Hostname', OVERLAY_NAME, 'Mode', 'ISP', metric)):
        worksheet.write(current_row, column, header, formats.header)
    current_row += 1
    if not dataframe.empty and metric in dataframe.columns:
        numeric_column = f'{metric}_num'
        dataframe[numeric_column] = pd.to_numeric(dataframe[metric], errors='coerce')
        columns = ['Hostname', OVERLAY_NAME, 'mode', 'isp', metric]
        for _, row in dataframe.nlargest(10, numeric_column)[columns].iterrows():
            row_format = _service_metric_format(row[metric], warning, critical, formats)
            _write_service_ranked_row(worksheet, current_row, row, metric, row_format)
            current_row += 1
    return current_row + 2


def service_manager_report(edge_list: list, circuits_performance):
    """Report that provides sites and circuits information."""
    sites_data = _service_site_rows(edge_list)
    circuits_data = _service_circuit_rows(edge_list, circuits_performance)
    df_sites = pd.DataFrame(sites_data)
    df_circuits = pd.DataFrame(circuits_data)
    df_sites = df_sites.fillna('')
    df_circuits = df_circuits.fillna('')
    if 'License' not in df_sites.columns:
        df_sites['License'] = ''
    df_sites[LICENSE_LEVEL] = df_sites['License'].apply(_service_license_level)
    df_sites[LICENSE_BANDWIDTH] = df_sites['License'].apply(_service_license_bandwidth)
    distributions = _service_distributions(df_sites)
    out_name = BytesIO()
    with pd.ExcelWriter(out_name, engine='xlsxwriter') as writer:
        workbook = writer.book
        _write_service_data_sheets(writer, df_sites, df_circuits, distributions)
        analysis_ws = workbook.add_worksheet('Analysis')
        formats = _service_analysis_formats(workbook)
        analysis_ws.merge_range('A1:I1', 'Network Infrastructure Analysis Dashboard', formats.title)
        current_row = 3
        current_row = _write_service_site_status(analysis_ws, df_sites, current_row, formats)
        current_row = _write_service_model_distribution(analysis_ws, df_sites, current_row, formats)
        current_row = _write_service_version_distribution(analysis_ws, df_sites, current_row, formats)
        current_row = _write_service_circuit_summary(analysis_ws, df_circuits, current_row, formats)
        _service_numeric_columns(df_circuits)
        ranked_sections = [
            ('5. TOP 10 WORST CIRCUITS BY LATENCY (RX) TO VELOCLOUD GW', LATENCY_RX, 50, 100),
            ('5B. TOP 10 WORST CIRCUITS BY LATENCY (TX) TO VELOCLOUD GW', LATENCY_TX, 50, 100),
            ('5C. TOP 10 WORST CIRCUITS BY JITTER (RX) TO VELOCLOUD GW', JITTER_RX, 5, 10),
            ('5D. TOP 10 WORST CIRCUITS BY JITTER (TX) TO VELOCLOUD GW', JITTER_TX, 5, 10),
            ('5E. TOP 10 WORST CIRCUITS BY PACKET LOSS (RX) % TO VELOCLOUD GW', PACKET_LOSS_RX, 0.1, 1),
            ('5F. TOP 10 WORST CIRCUITS BY PACKET LOSS (TX) % TO VELOCLOUD GW', PACKET_LOSS_TX, 0.1, 1),
        ]
        for title, metric, warning, critical in ranked_sections:
            current_row = _write_service_ranked_section(analysis_ws, df_circuits, current_row, title, metric, (warning, critical), formats)
        current_row = _write_service_volume_rx(analysis_ws, df_circuits, current_row, formats)
        current_row = _write_service_volume_tx(analysis_ws, df_circuits, current_row, formats)
        current_row = _write_service_isp_distribution(analysis_ws, df_circuits, current_row, formats)
        _write_service_alerts(analysis_ws, df_circuits, current_row, formats)
        analysis_ws.set_column('A:A', 35)
        analysis_ws.set_column('B:D', 20)
        analysis_ws.set_column('E:I', 18)
        _write_service_charts(workbook, distributions)
    out_name.seek(0)
    return b64encode(out_name.read()).decode()


Service_Manager_Report = service_manager_report


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


def citizenswanlinksdoc(all_edges_api):
    wanlinks_data = []
    for edge in all_edges_api:
        edge_name = edge["name"]
        wanlinks = edge.get("recentLinks", [])
        if wanlinks:
            for link in wanlinks:
                link["edge_name"] = edge_name
                wanlinks_data.append(link)
    df = pd.DataFrame(wanlinks_data)
    output = BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        df.to_excel(writer, index=False, sheet_name='WAN Links')
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
        (['activationTime'], ACTIVATION_TIME),
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
                charts.extend([
                    wbk.add_chart({'type': 'line'}),
                    wbk.add_chart({'type': 'line'}),
                    wbk.add_chart({'type': 'line'}),
                    wbk.add_chart({'type': 'line'}),
                ])
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
    events = events.drop(
        ['id', 'segmentName', 'edgeId', 'enterpriseUsername', 'category', 'severity'],
        axis=1, errors='ignore')
    def parse_datetime(date_str):
        try:
            return pd.to_datetime(date_str, errors='coerce', utc=True).tz_convert(None)
        except Exception:
            return pd.to_datetime(date_str.replace('.000Z', 'Z'), errors='coerce', utc=True).tz_convert(None)
    events['eventTime'] = events['eventTime'].apply(parse_datetime)
    events['created'] = events['created'].apply(parse_datetime)
    events['interface'] = events['message'].str.extract(r'(GE[1-6]|SFP[1-4])')
    events = events.sort_values(['edgeName', 'interface', 'eventTime', 'detail'])

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
    complete_events = complete_events.drop(columns=columns_to_drop)

    # Group by and aggregate
    summary = complete_events.groupby(['edgeName', 'interface', 'Overlay name'], as_index=False).agg({'downtime': 'sum', 'interface': 'count'})
    summary = summary.rename(columns={'downtime': 'downtime[sec]', 'interface': 'occurrences'})

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
    converted_bandwidth = convert_bandwidth(license_value.split('|')[1].strip() if isinstance(license_value, str) and '|' in license_value else None)
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
    
    # Replace zero or NaN bandwidth values with NaN to avoid division errors
    merged_df['bandwidth[Mbps]'] = merged_df['bandwidth[Mbps]'].replace(0, np.nan)
    
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
    readme_text_a1 = """Either your customer's VCO setup includes over 500 edges, or you've chosen more than 500 edges. Due to the report's high demand on resources, it cannot be produced. For customers with over 500 edges in VCO, please reach out to mi449w@intl.att.com"""
    out_name = BytesIO()  
    wb = xlsxwriter.Workbook(out_name)  
    ws_readme = wb.add_worksheet('Read me')  
    ws_readme.write('A1', readme_text_a1)

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
        # Fill NaN values in CustomInfo with empty string before grouping
        if "CustomInfo" in df.columns:
            df["CustomInfo"] = df["CustomInfo"].fillna("")
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
                if col.endswith(('_mean', '_95th_percentile')):
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
        'Default SW version', 'Serial Number', 'HA Serial Number', MODEL_NUMBER, EDGE_STATE, 'Activation date', 'HA state', 'Address line 1', 'Address line 2', 'State',
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


def create_hw_stats_excel(rows):
    """
    Generate an Excel file from HWStats query rows.
    Columns: hostname, datetime, cpu, memory.
    CPU and memory cells are colour-coded:
      < 50  → green  (#C6EFCE)
      50–70 → orange (#FFEB9C)
      > 70  → red    (#FFC7CE)
    Returns base64-encoded xlsx string.
    """
    df = pd.DataFrame(rows, columns=["hostname", "datetime", "cpu", "memory"])
    output = BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        df.to_excel(writer, index=False, sheet_name='HW Stats')
        workbook = writer.book
        worksheet = writer.sheets['HW Stats']

        # Column widths
        worksheet.set_column(0, 0, 30)  # hostname
        worksheet.set_column(1, 1, 22)  # datetime
        worksheet.set_column(2, 3, 12)  # cpu, memory

        # Table style
        worksheet.add_table(0, 0, len(df), len(df.columns) - 1, {
            'columns': [{'header': col} for col in df.columns],
            'style': 'Table Style Medium 9'
        })

        # Colour formats
        fmt_green  = workbook.add_format({'bg_color': '#C6EFCE', 'font_color': '#276221'})
        fmt_orange = workbook.add_format({'bg_color': '#FFEB9C', 'font_color': '#9C6500'})
        fmt_red    = workbook.add_format({'bg_color': '#FFC7CE', 'font_color': '#9C0006'})

        # Apply conditional formatting to cpu (col index 2) and memory (col index 3)
        data_rows = len(df)
        for col_idx in [2, 3]:
            # green: < 50
            worksheet.conditional_format(1, col_idx, data_rows, col_idx, {
                'type': 'cell', 'criteria': '<', 'value': 50, 'format': fmt_green
            })
            # orange: >= 50 and <= 70
            worksheet.conditional_format(1, col_idx, data_rows, col_idx, {
                'type': 'cell', 'criteria': 'between', 'minimum': 50, 'maximum': 70,
                'format': fmt_orange
            })
            # red: > 70
            worksheet.conditional_format(1, col_idx, data_rows, col_idx, {
                'type': 'cell', 'criteria': '>', 'value': 70, 'format': fmt_red
            })

    encoded_excel = b64encode(output.getvalue()).decode('utf-8')
    output.close()
    return encoded_excel


def _get_link_status(row):
    """Determine link status based on RX/TX utilization buckets."""
    rx_hi = row.get(UTIL_HIGH_RX, 0)
    tx_hi = row.get(UTIL_HIGH_TX, 0)
    rx_mid = row.get(UTIL_MEDIUM_RX, 0)
    tx_mid = row.get('Util 60-80% Tx [%]', 0)
    rx_low = row.get('Util 30-60% Rx [%]', 0)
    tx_low = row.get('Util 30-60% Tx [%]', 0)
    rx_idle = row.get(UTIL_IDLE_RX, 0)
    tx_idle = row.get('Util <30% Tx [%]', 0)

    if max(rx_hi, tx_hi) >= 20:
        return 'Critical'
    elif max(rx_hi, tx_hi) >= 5:
        return 'High'
    elif any(v > 0 for v in [rx_hi, tx_hi, rx_mid, tx_mid, rx_low, tx_low]):
        return 'Medium'
    elif rx_idle >= 99 and tx_idle >= 99:
        return 'Idle'
    return 'OK'


def _get_risk_level(row):
    """Determine risk level for license utilization."""
    if pd.isna(row.get('utilization_pct')):
        return 'N/A'
    pct = row['utilization_pct']
    if pct >= 80:
        return 'CRITICAL'
    elif pct >= 60:
        return 'MEDIUM'
    return 'LOW'


def _capacity_summary_row(edge_id, edata, all_edges):
    edge = next((e for e in all_edges if e.get("id") == edge_id), {})
    all_tp = edata["all_throughput_values"]

    license_bw = None
    if edge.get("licenses"):
        alias = edge["licenses"][0].get("alias", "")
        bw = convert_bandwidth(
            alias.split('|')[1].strip()
            if '|' in alias else None
        )
        if bw is not None:
            license_bw = bw

    if all_tp:
        p95 = round(sorted(all_tp)[int(len(all_tp) * 0.95)], 2)
        sizing = "N/A"
        if license_bw:
            sizing = "OK" if p95 <= license_bw else "Undersized"
    else:
        p95 = 0
        sizing = "N/A"
    return edge, all_tp, license_bw, p95, sizing


def _capacity_edge_summary(edge_aggregated_data, all_edges):
    # ---- Build Edge Summary ----
    edge_summary_rows = []
    for edge_id, edata in edge_aggregated_data.items():
        edge, all_tp, license_bw, p95, sizing = _capacity_summary_row(edge_id, edata, all_edges)

        edge_summary_rows.append({
            "edge_id": edata["edge_id"],
            "edge_name": edata["edge_name"],
            "custominfo": edge.get("customInfo", "N/A"),
            "description": edge.get("description", "N/A"),
            "HwModel": edge.get("modelNumber", "N/A"),
            "license": (edge.get("licenses", [{}])[0].get("alias", "N/A")
                        if edge.get("licenses") else "N/A"),
            "license_BW": license_bw if license_bw else "N/A",
            "link_count": edata["link_count"],
            AGGREGATED_MAX: (
                round(max(all_tp), 2) if all_tp else 0
            ),
            AGGREGATED_AVERAGE: (
                round(sum(all_tp) / len(all_tp), 2) if all_tp else 0
            ),
            AGGREGATED_PERCENTILE: p95,
            LICENSE_SIZING: sizing,
        })
    return edge_summary_rows


def _capacity_formats(wb: xlsxwriter.Workbook) -> _CapacityFormats:
    title_fmt = wb.add_format({'bold': True, 'font_size': 14, 'font_color': 'white', 'bg_color': '#2F5496', 'border': 1})
    header_fmt = wb.add_format({'bold': True, 'font_size': 11, 'font_color': 'white', 'bg_color': '#4472C4', 'border': 1})
    alert_fmt = wb.add_format({'bg_color': '#FFC000', 'border': 1, 'bold': True})
    normal_fmt = wb.add_format({'border': 1})
    critical_fmt = wb.add_format({'bg_color': '#FF6B6B', 'border': 1})
    high_fmt = wb.add_format({'bg_color': '#FFA500', 'border': 1})
    medium_fmt = wb.add_format({'bg_color': '#FFD93D', 'border': 1})
    ok_fmt = wb.add_format({'bg_color': '#6BCB77', 'border': 1})
    section_fmt = wb.add_format({'bold': True, 'font_size': 12, 'font_color': 'white', 'bg_color': '#2E75B6', 'border': 1})
    readme_header_fmt = wb.add_format({'bold': True, 'font_size': 10, 'bg_color': '#D6DCE4', 'border': 1})
    readme_normal_fmt = wb.add_format({'font_size': 10, 'border': 1, 'text_wrap': True, 'valign': 'top'})
    return _CapacityFormats(
        title_fmt, header_fmt, alert_fmt, normal_fmt, critical_fmt, high_fmt,
        medium_fmt, ok_fmt, section_fmt, readme_header_fmt, readme_normal_fmt)


def _write_capacity_readme(wb, formats: _CapacityFormats):
    ws_readme = wb.add_worksheet('README')
    ws_readme.set_column('A:A', 35)
    ws_readme.set_column('B:B', 80)
    ws_readme.set_column('C:C', 50)
    row = 0
    ws_readme.merge_range(row, 0, row, 2, 'CAPACITY PLANNER - COLUMN REFERENCE GUIDE', formats.title)
    row += 1
    ws_readme.merge_range(row, 0, row, 2, 'This document explains all columns and metrics used in the Capacity Planner report')
    row += 2
    ws_readme.merge_range(row, 0, row, 2, 'GENERAL TERMS & ABBREVIATIONS', formats.section)
    row += 1
    for hdr_col, hdr_val in enumerate(['Term', 'Description']):
        ws_readme.write(row, hdr_col, hdr_val, formats.readme_header)
    row += 1
    terms = [
        ('BH (Business Hours)', 'Monday to Friday, 8:00 AM - 5:00 PM local time based on site address configured in VeloCloud Orchestrator'),
        ('Rx', 'Receive - Inbound traffic (download direction)'),
        ('Tx', 'Transmit - Outbound traffic (upload direction)'),
        ('95th Percentile', 'Statistical measure excluding top 5% peaks - industry standard for bandwidth billing and capacity planning'),
        ('Edge', 'SD-WAN appliance/device at each site'),
        ('Link', 'Individual WAN circuit/connection on an Edge'),
        ('ISP', 'Internet Service Provider - carrier providing the circuit'),
        ('Mbps', 'Megabits per second - bandwidth measurement unit'),
        ('Gbps', 'Gigabits per second (1 Gbps = 1000 Mbps)'),
    ]
    for term, desc in terms:
        ws_readme.write(row, 0, term, formats.readme_normal)
        ws_readme.write(row, 1, desc, formats.readme_normal)
        row += 1
    row += 1
    ws_readme.merge_range(row, 0, row, 2, 'EDGE SUMMARY COLUMNS', formats.section)
    row += 1
    for hdr_col, hdr_val in enumerate(['Column', 'Description']):
        ws_readme.write(row, hdr_col, hdr_val, formats.readme_header)
    row += 1
    edge_cols = [
        ('edge_id', 'Unique identifier for the Edge device in VeloCloud Orchestrator'),
        ('edge_name', 'Name of the Edge device (typically includes site code)'),
        ('custominfo', 'Site address and location details'),
        ('license', 'License tier description including bandwidth, region, and contract term'),
        ('license_BW', 'Licensed bandwidth in Mbps'),
        ('link_count', 'Number of WAN links configured on this Edge'),
        (AGGREGATED_MAX, 'Highest combined throughput (Rx+Tx) observed across all links'),
        (AGGREGATED_AVERAGE, 'Average combined throughput across all links'),
        (AGGREGATED_PERCENTILE, '95th percentile of combined throughput - used for license compliance'),
        (LICENSE_SIZING, 'OK = within license | Undersized = 95th pctl exceeds license BW | N/A = no data'),
    ]
    for c, d in edge_cols:
        ws_readme.write(row, 0, c, formats.readme_normal)
        ws_readme.write(row, 1, d, formats.readme_normal)
        row += 1
    row += 1
    ws_readme.merge_range(row, 0, row, 2, 'UTILIZATION TIME DISTRIBUTION', formats.section)
    row += 1
    for hdr_col, hdr_val in enumerate(['Column', 'Description', 'Interpretation']):
        ws_readme.write(row, hdr_col, hdr_val, formats.readme_header)
    row += 1
    util_cols = [
        ('Util 80-100% Rx/Tx [%]', '% of time link spent at 80-100% capacity', 'Critical - Congestion occurring'),
        ('Util 60-80% Rx/Tx [%]', '% of time link spent at 60-80% capacity', 'High - Approaching saturation'),
        ('Util 30-60% Rx/Tx [%]', '% of time link spent at 30-60% capacity', 'Medium - Healthy utilization'),
        ('Util <30% Rx/Tx [%]', '% of time link spent below 30% capacity', 'Low - Underutilized'),
    ]
    for c, d, interp in util_cols:
        ws_readme.write(row, 0, c, formats.readme_normal)
        ws_readme.write(row, 1, d, formats.readme_normal)
        ws_readme.write(row, 2, interp, formats.readme_normal)
        row += 1
    row += 1
    ws_readme.merge_range(row, 0, row, 2, 'STATUS LEGEND', formats.section)
    row += 1
    for hdr_col, hdr_val in enumerate(['Status', 'Meaning', 'Action']):
        ws_readme.write(row, hdr_col, hdr_val, formats.readme_header)
    row += 1
    icons = [
        ('Critical', '>80% utilization >=20% of time', 'Immediate upgrade'),
        ('High', '>80% utilization >=5% of time', 'Plan upgrade'),
        ('Medium', 'Some utilization above 30%', 'Monitor'),
        ('OK', 'Healthy utilization', 'No action'),
        ('Idle', 'Very low or no traffic', 'Review if needed'),
    ]
    for s, m, a in icons:
        ws_readme.write(row, 0, s, formats.readme_normal)
        ws_readme.write(row, 1, m, formats.readme_normal)
        ws_readme.write(row, 2, a, formats.readme_normal)
        row += 1

    # ================================================================


def _write_capacity_link_stats(ws_util, df_links, r, formats: _CapacityFormats):
    total_links = len(df_links)
    links_over_80 = len(df_links[df_links[UTIL_HIGH_RX] > 0]) if UTIL_HIGH_RX in df_links.columns else 0
    links_over_60 = len(df_links[(df_links[UTIL_HIGH_RX] > 0) | (df_links[UTIL_MEDIUM_RX] > 0)]) if UTIL_HIGH_RX in df_links.columns else 0
    links_under_30 = len(df_links[df_links[UTIL_IDLE_RX] > 60]) if UTIL_IDLE_RX in df_links.columns else 0
    stats_data = [
        ['Metric', 'Value', 'Key Alerts', 'Count'],
        ['Total Links', total_links, 'Congested (>80%)', links_over_80],
        ['Links >80%', links_over_80, '>60% utilized', links_over_60],
        ['Links >60%', links_over_60, 'Underutilized', links_under_30],
        ['Underutilized', links_under_30, '', ''],
    ]
    for row_data in stats_data:
        fmt = formats.header if row_data[0] == 'Metric' else formats.normal
        for c, val in enumerate(row_data):
            ws_util.write(r, c, val, fmt)
        r += 1
    r += 1
    return r


def _capacity_status_format(value, formats: _CapacityFormats):
    return {'Critical': formats.critical, 'High': formats.high, 'Medium': formats.medium}.get(value, formats.normal)


def _write_capacity_congested(wb, ws_util, df_work, top_n, r, formats: _CapacityFormats):
    congested_title_fmt = wb.add_format({'bold': True, 'font_size': 12, 'font_color': 'white', 'bg_color': '#C00000', 'border': 1})
    ws_util.merge_range(r, 0, r, 8, f'TOP {top_n} MOST CONGESTED LINKS (Business Hours >80%) & Overall >80%', congested_title_fmt)
    r += 2
    df_cong = df_work[(df_work[UTIL_HIGH_RX_BUSINESS] > 0) | (df_work[UTIL_HIGH_TX_BUSINESS] > 0)].copy() if UTIL_HIGH_RX_BUSINESS in df_work.columns else pd.DataFrame()
    if not df_cong.empty:
        df_cong['max_80'] = df_cong[[UTIL_HIGH_RX_BUSINESS, UTIL_HIGH_TX_BUSINESS]].max(axis=1)
        df_cong = df_cong.sort_values('max_80', ascending=False).head(top_n)
        cong_cols = [
            'edge_name',
            'link_name',
            'interface',
            'isp',
            UTIL_HIGH_RX_BUSINESS,
            UTIL_HIGH_TX_BUSINESS,
            UTIL_HIGH_RX,
            UTIL_HIGH_TX,
            'status',
        ]
        for c, col in enumerate(cong_cols):
            ws_util.write(r, c, col, formats.header)
        r += 1
        for _, dr in df_cong.iterrows():
            for c, col in enumerate(cong_cols):
                val = dr.get(col, '')
                fmt = formats.normal
                if col == 'status':
                    fmt = _capacity_status_format(val, formats)
                ws_util.write(r, c, val, fmt)
            r += 1
    r += 2
    return r


def _write_capacity_underutilized(wb, ws_util, df_work, top_n, r, formats: _CapacityFormats):
    under_title_fmt = wb.add_format({'bold': True, 'font_size': 12, 'font_color': 'white', 'bg_color': '#70AD47', 'border': 1})
    ws_util.merge_range(r, 0, r, 8, f'TOP {top_n} UNDERUTILIZED LINKS (Business Hours <30%)', under_title_fmt)
    r += 2
    if UTIL_IDLE_RX_BUSINESS in df_work.columns:
        df_under = df_work[(df_work[UTIL_IDLE_RX_BUSINESS] > 0) | (df_work[UTIL_IDLE_TX_BUSINESS] > 0)].sort_values(UTIL_IDLE_RX_BUSINESS, ascending=False).head(top_n)
        under_cols = [
            'edge_name',
            'link_name',
            'interface',
            'isp',
            UTIL_IDLE_RX_BUSINESS,
            UTIL_IDLE_TX_BUSINESS,
            'Avg Throughput Rx [Mbps]',
            'Avg Throughput Tx [Mbps]',
            'status',
        ]
        for c, col in enumerate(under_cols):
            ws_util.write(r, c, col, formats.header)
        r += 1
        for _, dr in df_under.iterrows():
            for c, col in enumerate(under_cols):
                ws_util.write(r, c, dr.get(col, ''), formats.normal)
            r += 1
    r += 2
    return r


def _write_capacity_link_details(wb, ws_util, df_work, r, formats: _CapacityFormats):
    detail_title_fmt = wb.add_format({'bold': True, 'font_size': 12, 'font_color': 'white', 'bg_color': '#2F5496', 'border': 1})
    ws_util.merge_range(r, 0, r, 22, 'DETAILED LINK UTILIZATION (Sorted by Highest Utilization)', detail_title_fmt)
    r += 2
    df_sorted = df_work.sort_values(UTIL_HIGH_RX, ascending=False).reset_index(drop=True) if UTIL_HIGH_RX in df_work.columns else df_work
    detail_cols = [
        'edge_name',
        'link_name',
        'interface',
        'isp',
        'Avg Throughput Rx [Mbps]',
        'Avg Throughput Tx [Mbps]',
        UTIL_HIGH_RX,
        UTIL_HIGH_TX,
        UTIL_MEDIUM_RX,
        'Util 60-80% Tx [%]',
        'Util 30-60% Rx [%]',
        'Util 30-60% Tx [%]',
        UTIL_IDLE_RX,
        'Util <30% Tx [%]',
        UTIL_HIGH_RX_BUSINESS,
        UTIL_HIGH_TX_BUSINESS,
        'Util 60-80% Rx BH [%]',
        'Util 60-80% Tx BH [%]',
        'Util 30-60% Rx BH [%]',
        'Util 30-60% Tx BH [%]',
        UTIL_IDLE_RX_BUSINESS,
        UTIL_IDLE_TX_BUSINESS,
        'status',
    ]
    existing_detail_cols = [c for c in detail_cols if c in df_sorted.columns]
    for c, col in enumerate(existing_detail_cols):
        ws_util.write(r, c, col, formats.header)
    r += 1
    for _, dr in df_sorted.iterrows():
        for c, col in enumerate(existing_detail_cols):
            val = dr.get(col, '')
            fmt = formats.normal
            if col == 'status':
                fmt = _capacity_status_format(val, formats)
            ws_util.write(r, c, val, fmt)
        r += 1


def _write_capacity_utilization(wb, df_links, num_edges, formats: _CapacityFormats):
    if not df_links.empty:
        if num_edges < 100:
            top_n = 10
        elif num_edges <= 500:
            top_n = 20
        else:
            top_n = 30
        ws_util = wb.add_worksheet('Link Utilization Analysis')
        ws_util.set_column(0, 29, 15)
        r = 0
        ws_util.merge_range(r, 0, r, 7, 'LINK UTILIZATION ANALYSIS', formats.title)
        r += 2
        ws_util.merge_range(r, 0, r, 3, 'QUICK STATS & ALERTS', formats.alert)
        r += 2
        r = _write_capacity_link_stats(ws_util, df_links, r, formats)
        df_work = df_links.copy()
        df_work['status'] = df_work.apply(_get_link_status, axis=1)
        r = _write_capacity_congested(wb, ws_util, df_work, top_n, r, formats)
        r = _write_capacity_underutilized(wb, ws_util, df_work, top_n, r, formats)
        _write_capacity_link_details(wb, ws_util, df_work, r, formats)

    # ================================================================


def _capacity_license_data(df_summary):
    df_valid = df_summary[df_summary['license_BW'] != 'N/A'].copy()
    df_na = df_summary[df_summary['license_BW'] == 'N/A'].copy()

    if not df_valid.empty:
        df_valid['license_BW'] = pd.to_numeric(df_valid['license_BW'], errors='coerce')
        df_valid['utilization_pct'] = (
            df_valid[AGGREGATED_PERCENTILE]
            / df_valid['license_BW']
        ) * 100
        df_valid['headroom_mbps'] = (
            df_valid['license_BW']
            - df_valid[AGGREGATED_PERCENTILE]
        )
        df_valid['headroom_pct'] = (
            df_valid['headroom_mbps'] / df_valid['license_BW']
        ) * 100
        df_valid['risk_level'] = df_valid.apply(_get_risk_level, axis=1)
        df_valid = df_valid.sort_values(
            'utilization_pct', ascending=False
        ).reset_index(drop=True)

        critical_count = len(df_valid[df_valid['utilization_pct'] >= 80])
        medium_count = len(df_valid[
            (df_valid['utilization_pct'] >= 60)
            & (df_valid['utilization_pct'] < 80)
        ])
        low_count = len(df_valid[df_valid['utilization_pct'] < 50])
    else:
        critical_count = medium_count = low_count = 0
    return df_valid, df_na, critical_count, medium_count, low_count


def _capacity_license_format(value, formats: _CapacityFormats):
    if value >= 80:
        return formats.critical
    if value >= 60:
        return formats.high
    if value >= 45:
        return formats.medium
    return formats.ok


def _write_capacity_licensed_rows(ws_lic, df_valid, r, formats: _CapacityFormats):
    if not df_valid.empty:
        for _, vr in df_valid.iterrows():
            util_str = f"{vr['utilization_pct']:.1f}%"
            headroom_str = f"{vr['headroom_pct']:.1f}%"
            vals = [
                vr['edge_name'],
                vr.get('custominfo', ''),
                vr['HwModel'],
                vr.get('license', ''),
                vr['license_BW'],
                vr[AGGREGATED_PERCENTILE],
                vr[AGGREGATED_MAX],
                vr[AGGREGATED_AVERAGE],
                util_str,
                vr['headroom_mbps'],
                headroom_str,
                vr['risk_level'],
                vr[LICENSE_SIZING],
            ]
            for c, val in enumerate(vals):
                fmt = formats.normal
                if c == 8:
                    fmt = _capacity_license_format(vr['utilization_pct'], formats)
                ws_lic.write(r, c, val, fmt)
            r += 1
    return r


def _write_capacity_unlicensed_rows(ws_lic, df_na, r, formats: _CapacityFormats):
    for _, row in df_na.iterrows():
        values = [
            row['edge_name'], row.get('custominfo', ''),
            row['HwModel'], row.get('license', ''), 'N/A',
            row[AGGREGATED_PERCENTILE],
            row[AGGREGATED_MAX],
            row[AGGREGATED_AVERAGE],
            'N/A', 'N/A', 'N/A', 'N/A', 'N/A',
        ]
        for column, value in enumerate(values):
            ws_lic.write(r, column, value, formats.normal)
        r += 1


def _write_capacity_license_analysis(wb, df_summary, formats: _CapacityFormats):
    if not df_summary.empty:
        ws_lic = wb.add_worksheet('License Analysis')
        ws_lic.set_column(0, 12, 16)
        r = 0
        ws_lic.merge_range(r, 0, r, 12, 'LICENSE CAPACITY ANALYSIS', formats.title)
        r += 1
        ws_lic.merge_range(r, 0, r, 12, 'Sorted by Utilization % - Highest Risk First')
        r += 2
        ws_lic.merge_range(r, 0, r, 3, 'QUICK STATS', formats.alert)
        r += 2
        df_valid, df_na, critical_count, medium_count, low_count = _capacity_license_data(df_summary)
        stats_rows = [
            ['Metric', 'Value', 'Risk Summary', 'Count'],
            ['Total Edges', len(df_summary), 'CRITICAL', critical_count],
            ['Undersized', len(df_summary[df_summary[LICENSE_SIZING] == 'Undersized']), 'MEDIUM', medium_count],
            ['N/A Licenses', len(df_na), 'LOW', low_count],
        ]
        for row_data in stats_rows:
            fmt = formats.header if row_data[0] == 'Metric' else formats.normal
            for c, val in enumerate(row_data):
                ws_lic.write(r, c, val, fmt)
            r += 1
        r += 2
        lic_columns = [
            'Edge Name',
            'Site',
            'HwModel',
            'Region',
            'License (Mbps)',
            '95th Pctl (Mbps)',
            'Max',
            'Avg',
            'Util %',
            'Headroom (Mbps)',
            'Headroom %',
            'Risk',
            'Status',
        ]
        for c, col in enumerate(lic_columns):
            ws_lic.write(r, c, col, formats.header)
        r += 1
        r = _write_capacity_licensed_rows(ws_lic, df_valid, r, formats)
        _write_capacity_unlicensed_rows(ws_lic, df_na, r, formats)


def capacity_planner_report(all_paths_data, edge_aggregated_data, all_edges):
    """
    Generate Capacity Planner Excel report.

    Parameters
    ----------
    all_paths_data : list[dict]
        Per-link rows produced by collect_capacity_data.
    edge_aggregated_data : dict
        Per-edge aggregation (throughput values, link count).
    all_edges : list[dict]
        Raw edge list from getEnterpriseEdges (with site, licenses).

    Returns
    -------
    str   base64-encoded xlsx content.
    """
    df_links = pd.DataFrame(all_paths_data)
    edge_summary_rows = _capacity_edge_summary(edge_aggregated_data, all_edges)
    df_summary = pd.DataFrame(edge_summary_rows)
    num_edges = len(all_edges)
    output = BytesIO()
    wb = xlsxwriter.Workbook(output, {'in_memory': True, 'nan_inf_to_errors': True})
    formats = _capacity_formats(wb)
    _write_capacity_readme(wb, formats)
    if not df_links.empty:
        df_links_export = df_links.drop(columns=['timestamp', 'circuit_bandwidth_rx_mbps', 'circuit_bandwidth_tx_mbps'], errors='ignore')
        write_df_to_sheet(wb, df_links_export, 'Link Details')
    if not df_summary.empty:
        write_df_to_sheet(wb, df_summary, 'Edge Summary')
    _write_capacity_utilization(wb, df_links, num_edges, formats)
    _write_capacity_license_analysis(wb, df_summary, formats)
    wb.close()
    output.seek(0)
    return b64encode(output.read()).decode()
