import copy
import datetime
import os
from pathlib import Path
import unittest
from unittest.mock import Mock, patch


class ThroughputLicenseFailureTests(unittest.TestCase):
    def test_upstream_license_error_is_reported_without_generating_report(self):
        environment = {
            "DJANGO_SETTINGS_MODULE": "velocloud_app.settings",
            "ENV": "unittest",
            "APP_DIR": str(Path(__file__).resolve().parents[2]),
            "DJANGO_SECRET": "test-only",
        }
        with patch.dict(os.environ, environment):
            import django
            django.setup()
            from api import views

            view = views.troughputMax()
            parsed = Mock()
            parsed.data = {"devices": []}
            with patch.object(view, "get_serializer", return_value=parsed), \
                    patch.object(views, "get_credentials", return_value=("user", "test-only", "url", 1)), \
                    patch.object(views, "get_session"), \
                    patch.object(views, "get_licenses", return_value={"error": {"message": "upstream failed"}}), \
                    patch.object(views, "get_all_edges_configs") as get_edges:
                result = view.post(Mock())
        self.assertEqual(result.data, {
            "userMessage": "Max Agr troughput report failed to finish", "message": "upstream failed",
        })
        get_edges.assert_not_called()


def policy_stack(include_qos=True, css_id="css-provider", with_refs=True):
    modules = [{
        "name": "deviceSettings", "configurationId": 10,
        "data": {"segments": [
            {"segment": {"name": "Global Segment"}, "css": {"provider": {"logicalId": css_id}}},
        ]},
    }]
    if include_qos:
        module = {
            "name": "QOS", "id": 20,
            "data": {"segments": [
                {"segment": {"name": "Global Segment"}, "rules": [{"name": "existing"}]},
                {"segment": {"name": "Other"}, "rules": [{"name": "untouched"}]},
            ]},
        }
        if with_refs:
            module["refs"] = {"reference": "keep"}
        modules.append(module)
    return [{"name": "Edge Specific Profile", "modules": modules}, {"name": "Profile", "modules": []}]


class ViewTests(unittest.TestCase):
    def setUp(self):
        environment = {
            "DJANGO_SETTINGS_MODULE": "velocloud_app.settings",
            "ENV": "unittest", "APP_DIR": str(Path(__file__).resolve().parents[2]),
            "DJANGO_SECRET": "test-only",
        }
        self.environment = patch.dict(os.environ, environment)
        self.environment.start()
        self.addCleanup(self.environment.stop)
        import django
        django.setup()
        from api import views
        self.views = views

    def invoke(self, view_class, data):
        view = view_class()
        parsed = Mock()
        parsed.data = data
        with patch.object(view, "get_serializer", return_value=parsed), \
                patch.object(self.views, "get_credentials", return_value=("user", "test-only", "url", 1)), \
                patch.object(self.views, "get_session", return_value=Mock()):
            return view.post(Mock())


class ServiceManagerViewTests(ViewTests):
    def test_report_generator_and_response_contract(self):
        edges = [{"name": "edge-a"}]
        performance = [{"internalId": "link-a"}]
        with patch.object(self.views, "get_all_edges_sites_licenses_wan", return_value=edges), \
                patch.object(self.views, "get_link_packet_loss_prev_month", return_value=performance), \
                patch.object(self.views, "service_manager_report", return_value="encoded") as generate, \
                patch.object(self.views, "create_filename", return_value="Monthly_SM_Report.xlsx"):
            result = self.invoke(self.views.ServiceManagerReport, {"params": [], "devices": []})
        generate.assert_called_once_with(edges, performance)
        self.assertEqual(result.data["filename"], "Monthly_SM_Report.xlsx")
        self.assertEqual(result.data["message"], "Monthly_SM_Report finished")
        self.assertEqual(result.data["data"], [
            {"type": "application/vnd.ms-excel", "value": "encoded"},
        ])


class PolicyViewTests(ViewTests):
    def run_policy(self, view_class, stack, edges=None):
        if edges is None:
            edges = [{"name": "Edge_Demo01", "id": 1}, {"name": "not-selected", "id": 2}]
        with patch.object(self.views, "get_all_edges_configs", return_value=edges), \
                patch.object(self.views, "get_edge_config_stack", return_value=stack) as get_stack, \
                patch.object(self.views, "update_edge_config", return_value={"updated": True}) as update, \
                patch.object(self.views, "insert_edge_module", return_value={"inserted": True}) as insert, \
                patch.object(self.views.time, "sleep"):
            result = self.invoke(view_class, {"params": [], "devices": [{"hostname": "Edge_Demo01"}]})
        return result, update, insert, get_stack

    def test_lmac_preserves_rules_refs_and_module_name(self):
        response, update, insert, get_stack = self.run_policy(self.views.LMAC, policy_stack())
        self.assertEqual(response.data["message"], "Configuration update finished")
        self.assertEqual(len(response.data["data"]), 1)
        self.assertEqual(get_stack.call_count, 1)
        insert.assert_not_called()
        payload = update.call_args.args[2]
        self.assertEqual(payload["id"], 20)
        self.assertEqual(payload["_update"]["name"], "deviceSettings")
        self.assertEqual(payload["_update"]["refs"], {"reference": "keep"})
        segments = payload["_update"]["data"]["segments"]
        self.assertEqual(segments[0]["rules"][-1], {"name": "existing"})
        self.assertEqual(segments[1]["rules"], [{"name": "untouched"}])

    def test_adidas_replaces_only_global_rules(self):
        response, update, insert, _ = self.run_policy(self.views.AdidasLMAC, policy_stack())
        self.assertEqual(response.data["message"], "Configuration update finished")
        insert.assert_not_called()
        payload = update.call_args.args[2]
        self.assertEqual(payload["_update"]["name"], "QOS")
        segments = payload["_update"]["data"]["segments"]
        self.assertNotIn({"name": "existing"}, segments[0]["rules"])
        self.assertEqual(segments[1]["rules"], [{"name": "untouched"}])
        self.assertEqual(segments[0]["rules"][0]["name"], "Omnihub")
        self.assertEqual(segments[0]["rules"][0]["action"]["edge2CloudRouteAction"]["routeCfg"]["logicalId"],
                         "css-provider")

    def test_adidas_inserts_missing_qos(self):
        response, update, insert, _ = self.run_policy(self.views.AdidasLMAC, policy_stack(include_qos=False))
        self.assertEqual(response.data["message"], "Configuration update finished")
        update.assert_not_called()
        payload = insert.call_args.args[2]
        self.assertEqual(payload["configurationId"], 10)
        self.assertEqual(payload["name"], "QOS")
        self.assertEqual(payload["data"]["segments"][0]["segment"]["name"], "Global Segment")

    def test_adidas_does_not_update_existing_qos_without_css(self):
        response, update, insert, _ = self.run_policy(self.views.AdidasLMAC, policy_stack(css_id=None))
        self.assertEqual(response.data["message"], "Configuration update finished")
        update.assert_not_called()
        insert.assert_not_called()

    def test_adidas_inserts_without_css_as_before(self):
        response, update, insert, _ = self.run_policy(
            self.views.AdidasLMAC, policy_stack(include_qos=False, css_id=None)
        )
        self.assertEqual(response.data["message"], "Configuration update finished")
        update.assert_not_called()
        insert.assert_called_once()

    def test_payload_without_refs_does_not_invent_them(self):
        for view_class in (self.views.LMAC, self.views.AdidasLMAC):
            with self.subTest(view=view_class.__name__):
                _, update, _, _ = self.run_policy(view_class, policy_stack(with_refs=False))
                self.assertNotIn("refs", update.call_args.args[2]["_update"])

    def test_policy_errors_keep_error_response(self):
        for view_class in (self.views.LMAC, self.views.AdidasLMAC):
            with self.subTest(view=view_class.__name__):
                response, update, insert, _ = self.run_policy(view_class, [])
                self.assertIn("failed", response.data["message"])
                update.assert_not_called()
                insert.assert_not_called()


class RmaViewTests(ViewTests):
    def setUp(self):
        super().setUp()
        self.inventory = [{
            "id": 2, "name": "source", "configuration": {
                "enterprise": {"id": 10}, "operator": {"id": 4, "name": "6.0"}
            }, "licenses": [{"licenseId": 5}],
        }]
        self.data = {"params": [{"RmaDeviceModel": "7x0"}], "devices": [{"hostname": "source"}]}

    def run_rma(self, created=None, software=None, migration=None, inventory=None, data=None):
        with patch.object(self.views, "get_all_edges_configs", return_value=(
            self.inventory if inventory is None else inventory
        )), patch.object(self.views, "create_edge", return_value=(
            {"id": 3, "activationKey": "test-key"} if created is None else created
        )) as create, patch.object(self.views, "set_edge_software", return_value=(
            {"software": "updated"} if software is None else software
        )) as update, patch.object(self.views, "migrate_rma_interfaces_and_wan", return_value=(
            {"WAN": "updated"} if migration is None else migration
        )) as migrate:
            result = self.invoke(self.views.EdgeRMA, self.data if data is None else data)
        return result, create, update, migrate

    def test_success_includes_provisioning_context(self):
        response, create, update, migrate = self.run_rma()
        result = response.data[0]
        self.assertEqual(result["message"], "source_RMA activation key: test-key")
        self.assertEqual(result["sourceEdge"], "source")
        self.assertEqual(result["modelNumber"], "edge7X0")
        self.assertEqual(result["osUpdate"], {"software": "updated"})
        self.assertEqual(result["interfaceWanUpdate"], {"WAN": "updated"})
        self.assertEqual(create.call_args.args[2], result["provisionPayload"])
        self.assertEqual(update.call_args.args[2:], (1, 3, 4, 1))
        self.assertEqual(migrate.call_args.args[2:], (1, 2, 3))

    def test_create_error_variants_stop_followup(self):
        for error in ({"message": "failed"}, {"data": {"error": [{"message": "failed"}]}}):
            with self.subTest(error=error):
                result, _, update, migrate = self.run_rma(created={"error": error})
                self.assertEqual(result.data[0]["message"], "failed")
                update.assert_not_called()
                migrate.assert_not_called()

    def test_missing_provisioning_fields(self):
        inventory = copy.deepcopy(self.inventory)
        del inventory[0]["licenses"]
        del inventory[0]["configuration"]["enterprise"]
        result, create, _, _ = self.run_rma(inventory=inventory)
        self.assertEqual(result.data[0]["missingFields"], ["configurationId", "edgeLicenseId"])
        create.assert_not_called()

    def test_software_failure_stops_migration(self):
        result, _, _, migrate = self.run_rma(software={"error": {"message": "rejected"}})
        self.assertIn("OS update failed", result.data[0]["userMessage"])
        self.assertEqual(result.data[0]["message"], "rejected")
        migrate.assert_not_called()

    def test_migration_failure_keeps_context(self):
        result, _, _, _ = self.run_rma(migration={"error": "migration rejected", "details": "reason"})
        self.assertIn("migration failed", result.data[0]["userMessage"])
        self.assertEqual(result.data[0]["interfaceWanUpdate"]["details"], "reason")

    def test_inventory_error(self):
        result, create, _, _ = self.run_rma(inventory={"error": {"message": "failed"}})
        self.assertEqual(result.status_code, 502)
        create.assert_not_called()

    def test_validation_failures(self):
        missing_model = {"params": [], "devices": [{"hostname": "source"}]}
        missing_device = {"params": [{"RmaDeviceModel": "7x0"}], "devices": [{"hostname": "missing"}]}
        no_operator = copy.deepcopy(self.inventory)
        del no_operator[0]["configuration"]["operator"]
        for data, inventory in ((missing_model, self.inventory), (missing_device, self.inventory),
                                (self.data, no_operator)):
            with self.subTest(data=data, inventory=inventory):
                result, create, _, _ = self.run_rma(data=data, inventory=inventory)
                self.assertEqual(result.status_code, 400)
                create.assert_not_called()


class HardwareStatisticsTests(ViewTests):
    def setUp(self):
        super().setUp()
        self.database_environment = patch.dict(os.environ, {
            "VELO_DB_HOST": "localhost", "VELO_DB_USER": "test-user", "VELO_DB_PASS": "test-only",
        })
        self.database_environment.start()
        self.addCleanup(self.database_environment.stop)
        self.connection = Mock()
        self.cursor = self.connection.cursor.return_value
        self.cursor.column_names = ("hostname", "datetime", "cpu", "memory")
        self.cursor.fetchall.return_value = [
            ("edge", datetime.datetime(2026, 10, 1, 8), 25, 50),
        ]

    def request(self, output="json"):
        request = Mock()
        request.data = {"startDate": "2026-10-01", "endDate": "2026-10-02",
                        "customerName": "example", "output": output}
        view = self.views.HWStats()
        view.format_kwarg = None
        view.request = request
        return view.post(request)

    def test_json_shape_and_parameterized_query(self):
        with patch.object(self.views.mysql.connector, "connect", return_value=self.connection):
            result = self.request()
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.data, {"data": [
            {"hostname": "edge", "datetime": "2026-10-01T08:00:00", "cpu": 25, "memory": 50},
        ]})
        self.connection.cursor.assert_called_once_with()
        self.assertEqual(self.cursor.execute.call_args.args[1], ("2026-10-01", "2026-10-02", "example"))
        self.cursor.close.assert_called_once()
        self.connection.close.assert_called_once()

    def test_query_failure_closes_resources_and_reports_error(self):
        self.cursor.execute.side_effect = self.views.mysql.connector.Error("query rejected")
        with patch.object(self.views.mysql.connector, "connect", return_value=self.connection), \
                self.assertLogs(level="ERROR"):
            result = self.request()
        self.assertEqual(result.status_code, 500)
        self.assertEqual(result.data, {"userMessage": "Database query failed."})
        self.cursor.close.assert_called_once()
        self.connection.close.assert_called_once()

    def test_excel_receives_same_dictionary_rows(self):
        with patch.object(self.views.mysql.connector, "connect", return_value=self.connection), \
                patch.object(self.views, "create_hw_stats_excel", return_value="encoded") as excel:
            result = self.request("xlsx")
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.data["data"][0]["value"], "encoded")
        self.assertEqual(excel.call_args.args[0][0]["hostname"], "edge")

    def test_cursor_creation_failure_closes_connection(self):
        self.connection.cursor.side_effect = self.views.mysql.connector.Error("cursor rejected")
        with patch.object(self.views.mysql.connector, "connect", return_value=self.connection), \
                self.assertLogs(level="ERROR"):
            result = self.request()
        self.assertEqual(result.status_code, 500)
        self.connection.close.assert_called_once()

    def test_excel_failure_is_reported(self):
        with patch.object(self.views.mysql.connector, "connect", return_value=self.connection), \
                patch.object(self.views, "create_hw_stats_excel", side_effect=ValueError("invalid data")), \
                self.assertLogs(level="ERROR"):
            result = self.request("xlsx")
        self.assertEqual(result.status_code, 500)
        self.assertEqual(result.data, {"userMessage": "Failed to generate Excel file."})
