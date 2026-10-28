import copy
import datetime
import inspect
import os
import subprocess
import sys
import unittest
from unittest.mock import Mock, patch

from api import utils


def configuration_stack():
    device = {
        "routedInterfaces": [{"name": "GE1", "override": True}],
        "interfaces": [{"name": "GE2", "disabled": True}],
        "lan": {"interfaces": [{"name": "GE3"}], "networks": [{"vlanId": 1, "cidrIp": "10.0.0.1"}]},
        "segments": [{"bgp": {"neighbors": [{"id": 9}]}, "linkInternalLogicalId": "old-link"}],
    }
    wan = {
        "networks": [{"name": "network", "interface": "GE1", "internalId": "old-network"}],
        "links": [{"name": "link", "interfaces": ["GE1"], "internalId": "old-link"}],
    }
    modules = [
        {"name": "deviceSettings", "id": 1, "configurationId": 10, "data": device},
        {"name": "WAN", "id": 2, "data": wan},
        {"name": "firewall", "id": 3, "data": {"rules": []}},
        {"name": "QOS", "id": 4, "data": {"rules": [
            {"ruleLogicalId": "old-rule", "linkInternalLogicalId": "old-link"}
        ]}},
    ]
    return [
        {"name": "Edge Specific Profile", "modules": modules},
        {"name": "Profile", "modules": [{"name": "deviceSettings", "data": copy.deepcopy(device)}]},
    ]


class ApiUrlTests(unittest.TestCase):
    def test_https_and_schemeless_hosts(self):
        for url in ("https://example.velocloud.net", "example.velocloud.net"):
            with self.subTest(url=url):
                self.assertEqual(utils._validate_api_base_url(url), "https://example.velocloud.net")

    def test_cleartext_and_other_schemes_are_rejected_before_login(self):
        for scheme in ("http", "ftp", "file"):
            with self.subTest(scheme=scheme), patch.object(utils.req, "Session") as session:
                with self.assertRaisesRegex(ValueError, "must use HTTPS"):
                    utils.get_session("user", "test-only", f"{scheme}://example.velocloud.net")
                session.assert_not_called()

    def test_server_configured_cleartext_url_is_rejected(self):
        with patch.dict(os.environ, {"API_BASE_URL": "http://example.velocloud.net"}):
            with self.assertRaisesRegex(ValueError, "must use HTTPS"):
                utils._validate_api_base_url(None)

    def test_untrusted_https_host_is_rejected(self):
        with patch.dict(os.environ, {"API_BASE_URL": "", "API_BASE_ALLOWED_HOSTS": ""}):
            with self.assertRaisesRegex(ValueError, "Untrusted API base URL host"):
                utils._validate_api_base_url("https://untrusted.example.invalid")

    def test_request_credentials_select_each_trusted_orchestrator_without_global_url(self):
        with patch.dict(os.environ, {"API_BASE_URL": "", "API_BASE_ALLOWED_HOSTS": ""}):
            for host in ("vco109-usca1.velocloud.net", "vco-other.velocloud.net"):
                with self.subTest(host=host):
                    request = Mock(META={
                        "HTTP_X_USERNAME": "report-user",
                        "HTTP_X_PASSWORD": "test-only",
                        "HTTP_X_URL": host,
                        "HTTP_X_TENANT_ID": "123",
                    })
                    self.assertEqual(utils.get_credentials(request),
                                     ("report-user", "test-only", f"https://{host}", "123"))

    def test_request_orchestrator_takes_precedence_over_global_default(self):
        with patch.dict(os.environ, {"API_BASE_URL": "https://default.velocloud.net"}):
            request = Mock(META={"HTTP_X_URL": "https://selected.velocloud.net"})
            self.assertEqual(utils.get_credentials(request)[2], "https://selected.velocloud.net")

    def test_request_credentials_fall_back_to_configured_url(self):
        with patch.dict(os.environ, {"API_BASE_URL": "https://default.velocloud.net"}):
            for headers in ({}, {"HTTP_X_URL": ""}):
                with self.subTest(headers=headers):
                    self.assertEqual(utils.get_credentials(Mock(META=headers))[2],
                                     "https://default.velocloud.net")

    def test_request_credentials_allow_explicitly_trusted_custom_host(self):
        with patch.dict(os.environ, {"API_BASE_URL": "", "API_BASE_ALLOWED_HOSTS": "orchestrator.example.com"}):
            request = Mock(META={"HTTP_X_URL": "https://orchestrator.example.com"})
            self.assertEqual(utils.get_credentials(request)[2], "https://orchestrator.example.com")

    def test_request_credentials_reject_invalid_destinations_even_with_valid_default(self):
        urls = (
            "http://example.velocloud.net", "ftp://example.velocloud.net",
            "https://untrusted.example.invalid", "https://example.velocloud.net.evil.invalid",
            "https://user:password@example.velocloud.net", "https://example.velocloud.net?query=1",
            "https://example.velocloud.net#fragment", "https://127.0.0.1",
        )
        with patch.dict(os.environ, {"API_BASE_URL": "https://default.velocloud.net",
                                     "API_BASE_ALLOWED_HOSTS": ""}):
            for url in urls:
                request = Mock(META={"HTTP_X_URL": url})
                with self.subTest(url=url), self.assertRaises(ValueError):
                    utils.get_credentials(request)

    def test_request_credentials_require_a_destination(self):
        with patch.dict(os.environ, {"API_BASE_URL": "", "API_BASE_ALLOWED_HOSTS": ""}):
            request = Mock(META={})
            with self.assertRaisesRegex(ValueError, "Missing required API_BASE_URL"):
                utils.get_credentials(request)


class ResponseTests(unittest.TestCase):
    def setUp(self):
        self.response = Mock(status_code=200)
        self.response.json.return_value = [{"id": 1}]
        self.session = Mock()
        self.session.post.return_value = self.response

    def test_success_and_error_json_contract(self):
        for function in (utils.get_all_edges_configs, utils.get_enterprise_bgp_peer_status,
                         utils.get_all_edges_wanlinks, utils.get_all_edges_sites_licenses_wan,
                         utils.get_all_edges_licenses, utils.get_applications):
            for status in (200, 500):
                with self.subTest(function=function.__name__, status=status):
                    self.response.status_code = status
                    self.assertEqual(function("https://example.velocloud.net", self.session, 1),
                                     [{"id": 1}])

    def test_invalid_json_is_not_success(self):
        self.response.json.side_effect = ValueError("invalid JSON")
        with self.assertRaises(ValueError):
            utils.get_all_edges_configs("https://example.velocloud.net", self.session, 1)

    def test_capacity_failure_shape(self):
        self.response.status_code = 500
        self.assertEqual(
            utils.get_edge_link_series_capacity("https://example.velocloud.net", self.session, 1, 2, {}, 10),
            {"error": "Failed for edge 2"},
        )

    def test_batch_error_keeps_interval(self):
        self.response.status_code = 500
        results = utils.get_link_Bandwidth("https://example.velocloud.net", self.session, 1, [(100, 200)])
        self.assertEqual(results[0]["starttime"], 100)
        self.assertIn("error", results[0])

    def test_all_changed_api_response_contracts(self):
        names = (
            "get_all_edges_configs", "get_enterprise_bgp_peer_status", "get_all_edges_wanlinks",
            "get_all_edges_sites_licenses_wan", "get_all_edges_recentlinks", "get_all_edges_licenses",
            "get_object_groups", "get_all_edges_configs_only", "get_all_edges_hostname", "create_user",
            "get_applications", "get_peer_path", "get_enterprises", "get_routable_applications",
            "get_enterprise_inventory", "get_all_profiles", "get_edge_config_stack", "set_edge_software",
            "get_enterprise_edge_list", "get_all_customers", "update_edge_config", "insert_edge_module",
            "get_gateways", "get_routes", "get_segments", "get_gateway_edge_assignment",
            "get_enterprise_services", "get_enterprise_services_full", "get_edge_link_series",
            "get_edge_link_serie_utilisation_metrics", "get_aggregate_links_metrics", "get_aggregate_edge_metrics",
            "get_tenantid_nonmsp", "get_customer_name_nonmsp", "create_edge", "update_edge_attributes",
            "get_qoe_edge", "get_application_edge", "get_gamingapplication_edge", "get_toptalkers_edge",
            "get_qoe_edge_month", "get_qoe_Agregate_month", "get_link_packet_loss", "get_link_packet_loss_prev_month",
            "get_link_Agregate_month", "get_edge_status_series", "get_edge_status_series_general",
            "get_edge_link_daily_series", "get_edge_status_daily_series", "get_network_overview_info",
            "get_edge_status_series_utilisation_metrics", "get_licenses",
        )
        string_errors = {
            "get_gateways", "get_routes", "get_segments", "get_gateway_edge_assignment",
            "get_enterprise_services", "get_enterprise_services_full", "get_network_overview_info",
        }
        special_success = {"get_tenantid_nonmsp": 7, "get_customer_name_nonmsp": "test"}
        for name in names:
            function = getattr(utils, name)
            arguments = dict.fromkeys(inspect.signature(function).parameters, 1)
            arguments.update(api="https://example.velocloud.net", ses=self.session)
            overrides = {
                "user": {"email": "test@example.invalid", "First Name": "Test", "Last Name": "User",
                         "roleId": 1, "level": "msp"},
                "json_body": {}, "timestart": "start", "timeend": "end",
            }
            arguments.update({key: value for key, value in overrides.items() if key in arguments})
            for status in (200, 400, 500):
                with self.subTest(function=name, status=status):
                    self.response.status_code = status
                    payload = {"id": 7, "name": "test"} if status == 200 else {"error": {"message": "failed"}}
                    self.response.json.return_value = payload
                    expected = payload
                    if status == 200:
                        expected = special_success.get(name, payload)
                    elif name in string_errors:
                        expected = "failed"
                    elif name == "get_all_customers" and status == 400:
                        expected = "enterpriseaccessonly"
                    self.assertEqual(function(**arguments), expected)

    def test_nested_upstream_errors(self):
        self.response.status_code = 500
        self.response.json.return_value = {"error": {"data": {"error": [{"message": "nested failure"}]}}}
        for function in (utils.update_edge_config, utils.insert_edge_module, utils.create_edge):
            with self.subTest(function=function.__name__):
                self.assertEqual(function("", self.session, {}), self.response.json.return_value)

    def test_reset_failure_does_not_send_email(self):
        self.response.status_code = 500
        self.response.json.return_value = {"error": {"message": "failed"}}
        self.assertEqual(utils.password_reset_user("", self.session, 1, 2, "msp"),
                         self.response.json.return_value)
        self.assertEqual(self.session.post.call_count, 1)

    def test_reset_email_status_contract(self):
        email = {key: "value" for key in ("subject", "replyTo", "to", "passwordResetURL", "message", "from")}
        email["isActive"] = 1
        for level in ("msp", "enterprise"):
            for status in (200, 500):
                with self.subTest(level=level, status=status):
                    initial = Mock(status_code=200)
                    initial.json.return_value = email
                    final = Mock(status_code=status)
                    final.json.return_value = {"sent": status == 200}
                    self.session.post.side_effect = [initial, final]
                    self.assertEqual(utils.password_reset_user("", self.session, 1, 2, level),
                                     final.json.return_value)

    def test_license_invalid_error_shape_is_explicit(self):
        self.response.status_code = 500
        self.response.json.return_value = []
        with self.assertRaises(ValueError):
            utils.get_licenses("", self.session, 1)

    def test_error_handling_survives_python_optimization(self):
        script = (
            "from unittest.mock import Mock; from api import utils; "
            "session = Mock(); session.post.return_value.status_code = 400; "
            "result = utils.get_all_customers('https://example.velocloud.net', session); "
            "raise SystemExit(0 if result == 'enterpriseaccessonly' else 1)"
        )
        result = subprocess.run([sys.executable, "-O", "-c", script], check=False,
                                capture_output=True, text=True, timeout=30,
                                env=dict(os.environ, PYTHONDONTWRITEBYTECODE="1"))
        self.assertEqual(result.returncode, 0, result.stderr)


class RmaTests(unittest.TestCase):
    def migrate(self):
        return utils.migrate_rma_interfaces_and_wan("https://example.velocloud.net", Mock(), 1, 2, 3)

    def test_payload_omits_none_and_preserves_types(self):
        source = {"name": "edge", "configuration": {"enterprise": {"id": 42}},
                  "licenses": [{"licenseId": 7}], "ha": True}
        original = copy.deepcopy(source)
        payload = utils.build_rma_edge_payload(source, "1", "model")
        self.assertEqual(payload["configurationId"], "42")
        self.assertEqual(payload["edgeLicenseId"], 7)
        self.assertEqual(payload["enterpriseId"], 1)
        self.assertTrue(payload["haEnabled"])
        self.assertEqual(source, original)
        self.assertNotIn("configurationId", utils.build_rma_edge_payload({}, "1", "model"))

    def test_full_migration_preserves_order_and_rewrites_ids(self):
        old, new, refreshed = (configuration_stack() for _ in range(3))
        refreshed[0]["modules"][1]["data"]["networks"][0]["internalId"] = "new-network"
        refreshed[0]["modules"][1]["data"]["links"][0]["internalId"] = "new-link"
        original = copy.deepcopy((old, new, refreshed))
        with patch.object(utils, "get_edge_config_stack", side_effect=[old, new, refreshed]), \
                patch.object(utils, "_update_rma_module", return_value={}) as update:
            result = self.migrate()
        self.assertNotIn("error", result)
        calls = update.call_args_list
        self.assertEqual([call.args[3] for call in calls],
                         ["deviceSettings", "WAN", "firewall", "deviceSettings", "QOS"])
        self.assertIsNone(calls[1].args[5]["links"][0]["internalId"])
        segment = calls[3].args[5]["segments"][0]
        self.assertEqual(segment["linkInternalLogicalId"], "new-link")
        self.assertIsNone(segment["bgp"]["neighbors"][0]["id"])
        qos = calls[4].args[5]["rules"][0]
        self.assertIsNone(qos["ruleLogicalId"])
        self.assertEqual(qos["linkInternalLogicalId"], "new-link")
        actual_stacks = (old, new, refreshed)
        self.assertEqual(actual_stacks, original)

    def test_missing_module_stops_updates(self):
        with patch.object(utils, "get_edge_config_stack", return_value=[]), \
                patch.object(utils, "_update_rma_module") as update:
            self.assertIn("error", self.migrate())
        update.assert_not_called()

    def test_update_failure_stops_migration(self):
        with patch.object(utils, "get_edge_config_stack", side_effect=[
            configuration_stack(), configuration_stack()
        ]), patch.object(utils, "_update_rma_module", return_value={"error": "rejected"}) as update:
            self.assertEqual(self.migrate()["error"], "Failed to update deviceSettings")
        self.assertEqual(update.call_count, 1)

    def test_missing_ids_retries_without_dependent_updates(self):
        old, new = configuration_stack(), configuration_stack()
        refreshed = configuration_stack()
        for section in ("networks", "links"):
            for item in refreshed[0]["modules"][1]["data"][section]:
                item["internalId"] = None
        with patch.object(utils, "get_edge_config_stack", side_effect=[old, new] + [refreshed] * 5), \
                patch.object(utils, "_update_rma_module", return_value={}) as update, \
                patch.object(utils.time, "sleep") as sleep:
            result = self.migrate()
        self.assertIn("missingOldLogicalIds", result)
        self.assertEqual(update.call_count, 3)
        self.assertEqual(sleep.call_count, 4)

    def test_source_stack_error(self):
        with patch.object(utils, "get_edge_config_stack", side_effect=[{"error": "failed"}, []]):
            self.assertEqual(self.migrate()["error"], "Failed to read source edge configuration stack")

    def test_target_stack_error(self):
        with patch.object(utils, "get_edge_config_stack", side_effect=[[], {"error": "failed"}]):
            self.assertEqual(self.migrate()["error"], "Failed to read new edge configuration stack")

    def test_refresh_error(self):
        with patch.object(utils, "get_edge_config_stack", side_effect=[
            configuration_stack(), configuration_stack(), {"error": "failed"}
        ]), patch.object(utils, "_update_rma_module", return_value={}):
            self.assertEqual(self.migrate()["error"], "Failed to refresh new edge configuration after WAN update")

    def test_module_update_errors_stop_later_steps(self):
        for index, message in ((1, "Failed to update WAN"), (2, "Failed to update firewall"),
                               (3, "Failed to update LAN and segments"), (4, "Failed to configure QOS")):
            results = [{}] * index + [{"error": "failed"}]
            with self.subTest(module=index), \
                    patch.object(utils, "get_edge_config_stack", side_effect=[
                        configuration_stack(), configuration_stack(), configuration_stack()
                    ]), patch.object(utils, "_update_rma_module", side_effect=results) as update:
                self.assertEqual(self.migrate()["error"], message)
                self.assertEqual(update.call_count, index + 1)

    def test_missing_qos_is_inserted(self):
        old, new = configuration_stack(), configuration_stack()
        new[0]["modules"] = [module for module in new[0]["modules"] if module["name"] != "QOS"]
        with patch.object(utils, "get_edge_config_stack", side_effect=[old, new, configuration_stack()]), \
                patch.object(utils, "_update_rma_module", return_value={}), \
                patch.object(utils, "insert_edge_module", return_value={}) as insert:
            self.assertNotIn("error", self.migrate())
        self.assertEqual(insert.call_args.args[2]["configurationId"], 10)
        self.assertIsNone(insert.call_args.args[2]["data"]["rules"][0]["ruleLogicalId"])

    def test_missing_qos_configuration_id(self):
        new = configuration_stack()
        new[0]["modules"] = [module for module in new[0]["modules"] if module["name"] != "QOS"]
        del new[0]["modules"][0]["configurationId"]
        with patch.object(utils, "get_edge_config_stack", side_effect=[
            configuration_stack(), new, configuration_stack()
        ]), patch.object(utils, "_update_rma_module", return_value={}):
            self.assertEqual(self.migrate()["error"], "Failed to find replacement configuration ID for QOS module")

    def test_interface_overrides_and_profile_inheritance(self):
        profiles = {"routedInterfaces": {"GE1": {"name": "GE1", "disabled": True}}}
        source = {"routedInterfaces": [{"name": "GE2", "disabled": True, "override": True}]}
        original = copy.deepcopy((source, profiles))
        migrated, skipped = utils._migrate_rma_interfaces(
            source, profiles, {"routedInterfaces": [{"name": "GE3", "disabled": True}]}, {}, "routedInterfaces"
        )
        self.assertEqual(skipped, [])
        by_name = {item["name"]: item for item in migrated}
        self.assertEqual(by_name["GE1"], {"name": "GE1", "disabled": True, "override": True})
        self.assertEqual(by_name["GE2"], {"name": "GE2", "disabled": True, "override": True})
        self.assertTrue(by_name["GE3"]["override"])
        actual_inputs = (source, profiles)
        self.assertEqual(actual_inputs, original)

    def test_vlan_fallback_and_unsupported_nfv(self):
        data = {}
        vlan = utils._ensure_rma_vlan1_network(data, {})
        self.assertEqual(vlan["cidrIp"], "198.51.100.1")
        self.assertTrue(vlan["override"])
        cleaned = utils._strip_unsupported_nfv_entries({"lan": [{"nfv": "remove", "name": "keep"}]})
        self.assertEqual(cleaned, {"lan": [{"name": "keep"}]})

    def test_wan_filters_and_resets_source_ids(self):
        ids = {}
        items = [{"name": "link", "interfaces": ["GE1"], "logicalId": "a", "internalId": "b"},
                 {"name": "skip", "interfaces": ["GE2"]}]
        result = utils._copy_rma_wan_items(items, {"GE1"}, "link", ids)
        self.assertEqual(len(result), 1)
        self.assertIsNone(result[0]["logicalId"])
        self.assertEqual(set(ids), {"a", "b"})
        self.assertEqual(items[0]["logicalId"], "a")


class CapacityTests(unittest.TestCase):
    @staticmethod
    def series(start=None):
        start = start or int(datetime.datetime(2026, 10, 19, 8, tzinfo=datetime.timezone.utc).timestamp() * 1000)
        return [{
            "linkId": 7, "link": {"displayName": "WAN", "isp": "ISP", "interface": "GE1"},
            "series": [
                {"metric": metric, "data": values, "startTime": start, "tickInterval": 300000}
                for metric, values in (
                    ("bytesRx", [30000000, 22500000]),
                    ("bytesTx", [0, 0]),
                    ("bpsOfBestPathRx", [1000000, 1000000]),
                    ("bpsOfBestPathTx", [0, 0]),
                    ("bestLatencyMsRx", [None, 2]),
                )
            ],
        }]

    def test_metrics_and_output_shape(self):
        with patch.object(utils, "get_edge_link_series_capacity", return_value=self.series()):
            edge, rows = utils.process_edge_capacity(
                {"id": 1, "name": "edge", "site": {"timezone": "UTC"}}, "", Mock(), 2, {}, 2
            )
        self.assertEqual(edge, {"edge_id": 1, "edge_name": "edge",
                                "all_throughput_values": [0.8, 0.6], "link_count": 1})
        self.assertEqual(len(rows), 1)
        row = rows[0]
        self.assertEqual(row["Max Throughput Rx [Mbps]"], 0.8)
        self.assertEqual(row["Avg Throughput Rx [Mbps]"], 0.7)
        self.assertEqual(row["Avg Throughput Rx BH [Mbps]"], 0.7)
        self.assertEqual(row["Util 80-100% Rx [%]"], 50)
        self.assertEqual(row["Util 60-80% Rx [%]"], 50)
        self.assertEqual(row["Bandwidth Rx [Mbps]"], [1.0])
        self.assertEqual(row["Avg Latency Rx [ms]"], 2)
        self.assertEqual(row["link_id"], 7)

    def test_empty_series(self):
        with patch.object(utils, "get_edge_link_series_capacity", return_value=[]):
            edge, rows = utils.process_edge_capacity({"id": 1}, "", Mock(), 2, {}, 2)
        self.assertEqual(rows, [])
        self.assertEqual(edge["all_throughput_values"], [])

    def test_upstream_error(self):
        with patch.object(utils, "get_edge_link_series_capacity", return_value={"error": "failed"}):
            edge, rows = utils.process_edge_capacity({"id": 1}, "", Mock(), 2, {}, 2)
        self.assertEqual(rows, [])
        self.assertEqual(edge["link_count"], 0)

    def test_exact_bucket_boundaries(self):
        for percent, expected in ((0, "below_30"), (29.99, "below_30"), (30, "60_30"),
                                  (59.99, "60_30"), (60, "80_60"), (79.99, "80_60"),
                                  (80, "100_80"), (100, "100_80"), (120, "100_80")):
            with self.subTest(percent=percent):
                self.assertEqual(utils._capacity_bucket(percent), expected)

    def test_edge_local_business_hour_boundaries(self):
        timezone = utils.ZoneInfo("America/New_York")
        for hour, minute, expected in ((11, 59, False), (12, 0, True), (20, 59, True), (21, 0, False)):
            timestamp = datetime.datetime(2026, 10, 19, hour, minute, tzinfo=datetime.timezone.utc).timestamp()
            with self.subTest(hour=hour, minute=minute):
                self.assertEqual(utils._capacity_business_hours(timestamp, timezone), expected)

    def test_dst_offset_changes_and_weekends(self):
        timezone = utils.ZoneInfo("America/New_York")
        for month, day, hour, expected in ((10, 30, 12, True), (11, 2, 12, False),
                                          (11, 2, 13, True), (11, 1, 13, False)):
            timestamp = datetime.datetime(2026, month, day, hour, tzinfo=datetime.timezone.utc).timestamp()
            with self.subTest(month=month, day=day, hour=hour):
                self.assertEqual(utils._capacity_business_hours(timestamp, timezone), expected)

    def test_report_uses_edge_timezone_not_server_clock(self):
        timestamp = int(datetime.datetime(2026, 10, 19, 8, tzinfo=datetime.timezone.utc).timestamp() * 1000)
        with patch.object(utils, "get_edge_link_series_capacity", return_value=self.series(timestamp)):
            _, rows = utils.process_edge_capacity(
                {"id": 1, "site": {"timezone": "America/New_York"}}, "", Mock(), 2, {}, 2
            )
        self.assertEqual(rows[0]["Avg Throughput Rx BH [Mbps]"], 0)
        self.assertEqual(rows[0]["Util 80-100% Rx BH [%]"], 0)
        self.assertEqual(rows[0]["Avg Throughput Rx [Mbps]"], 0.7)

    def test_invalid_timezone_logs_fallback(self):
        with self.assertLogs(level="WARNING") as logs:
            timezone = utils._capacity_timezone("not/a/timezone")
        self.assertEqual(timezone, datetime.timezone.utc)
        self.assertIn("using UTC", logs.output[0])

    def test_empty_link_preserves_default_columns(self):
        with patch.object(utils, "get_edge_link_series_capacity", return_value=[{"series": []}]):
            edge, rows = utils.process_edge_capacity({"id": 1}, "", Mock(), 2, {}, 2)
        self.assertEqual(edge["all_throughput_values"], [0])
        self.assertEqual(rows[0]["timestamp"], "N/A")
        self.assertEqual(rows[0]["Bandwidth Rx [Mbps]"], 0)
        self.assertEqual(rows[0]["Util <30% Tx BH [%]"], 0)

    def test_unequal_series_and_missing_samples(self):
        series = {"bytesRx": [0.3, 0.6, 0.8], "bytesTx": [],
                  "bpsOfBestPathRx": [1], "bpsOfBestPathTx": []}
        timestamp = datetime.datetime(2026, 10, 19, 8, tzinfo=datetime.timezone.utc).timestamp() * 1000
        metrics = utils._capacity_utilization(series, datetime.timezone.utc, timestamp, 300000)
        self.assertEqual(metrics["Util 30-60% Rx [%]"], 100)
        self.assertEqual(metrics["Util 80-100% Tx [%]"], 0)

    def test_last_month_returns_expected_utc_intervals(self):
        class FixedDate(datetime.date):
            @classmethod
            def today(cls):
                return cls(2026, 11, 5)

        with patch.object(utils.datetime, "date", FixedDate):
            intervals = utils.last_month(all_days=False, business_hours=True)
        self.assertEqual(intervals[0], ("2026-10-01T08:00:00+00:00", "2026-10-01T16:59:59+00:00"))
        self.assertEqual(intervals[-1], ("2026-10-30T08:00:00+00:00", "2026-10-30T16:59:59+00:00"))
        self.assertEqual(len(intervals), 22)

    def test_last_month_local_hours_follow_dst(self):
        class FixedDate(datetime.date):
            @classmethod
            def today(cls):
                return cls(2026, 12, 5)

        with patch.object(utils.datetime, "date", FixedDate):
            intervals = utils.last_month(business_hours=True, timezone="America/New_York", adjust_hours=True)
        self.assertEqual(intervals[0], ("2026-11-01T08:00:00-05:00", "2026-11-01T16:59:59-05:00"))
        self.assertEqual(len(intervals), 30)
