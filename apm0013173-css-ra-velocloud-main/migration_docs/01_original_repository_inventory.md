# Original repository inventory

Baseline: Git commit `063da1e` (original ZIP contents), branch `codex/fastapi-migration`.

All listed files were read in full for the structural inventory. Python analysis uses AST, including nested functions, imports, calls, globals and module-level statements. This is source evidence, not executed parity evidence. No production services were contacted.

| File | Lines | SHA-256 |
|---|---:|---|
| `.coveragerc` | 10 | `852536a9553aaba53833b4c91aaa759effa2ecf63edf576b267e6609de958e18` |
| `.dockerenv` | 5 | `2b8b412811a2b2739400fadb5c3eea634f6653fd01fe96731313494ef6348263` |
| `.dockerignore` | 8 | `e58342326fc543cda692c92513a86073a036df255746b0a6459ee1681c69e458` |
| `.github/variables/ci_vars.yaml` | 142 | `af5d33a07381aed4d36b14ed302932381f0c6f4be7bd14e88b5515829587a6fa` |
| `.github/variables/configuration.yaml` | 29 | `b7af8181c5e1c983901ecb6c8758657821e7ac83b5ab66c9979f736ddb98376c` |
| `.github/variables/dev/cd_vars.yaml` | 25 | `e92c3112c0c7783a1b6e522cf00c58acea34adbb0add5c77ee76371f0c123eab` |
| `.github/variables/prod/cd_vars.yaml` | 38 | `7c6bb184f0a1f9b4275bbab423d79caebb1afda3ecfd3467f7320826b1ac2c43` |
| `.github/variables/shared_vars.yaml` | 148 | `fe195949204eef56e7fcd9781bf019778cd9f7c4eabf6da744307be750457691` |
| `.github/workflows/cd.yaml` | 258 | `fe3df664d2a8f9ece473580335caa82ccb4f7677dedb27c28a984ba0eecc068d` |
| `.github/workflows/ci.yaml` | 70 | `b2cd7f17e10fb6400b2548b72d6818257ee93aecd743f54bb3f6b60e67d866aa` |
| `.github/workflows/promote.yaml` | 50 | `0ba966f8e0f59575e62667f684c35cd38bb27b56d62cac3c53946b164062df76` |
| `.gitignore` | 10 | `8b7735b6b5bbed6244beef1fa46773c129ac004ee30471a0d9938e59c7d221ac` |
| `ADI_ip_ranges.json` | 1012 | `6ab382c1db130117abb1f533fd47b60e09a443e7200a9cfc5713ab14e4114b36` |
| `All_aplication.json` | 2256 | `17c7e303d571ed473da07415d1065ac868b651465762c9fd1fc39ecc4fc504de` |
| `api/__init__.py` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `api/app_additional.json` | 268 | `aa77dcd25f696765edc4254ab955868073211193af1e1fc5ddaee4951277f423` |
| `api/doc_utils_helpers.py` | 346 | `ffbe9fe1457eaef73bc06d1b799f4c080dd3f8641e2c35f00d9c4e815db4da54` |
| `api/docs_mds.py` | 3303 | `b0c2a52fa6205460cfddc771a767fe3de2c765d16b123b2705153a7c701af9b0` |
| `api/docs_other.py` | 4686 | `09406cff4dafb6c5933ab3cdf0085963182f9c18d5f900e21ac4b03333402279` |
| `api/serializers.py` | 76 | `12fdf11cf47496ae1840eb266aa986f28dfef61a7211c4c0bf26f82544b36fa3` |
| `api/tests/__init__.py` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `api/tests/test_docs_other.py` | 314 | `1bd2284ce023b7204c743b984f22f8b4d7d0404d5b5fcf0e66c0d57a2b1d89a2` |
| `api/tests/test_settings.py` | 93 | `dc2621b155fb894a59fe8f9aadb8905c87340452fdea8ee07c51faed8f00b400` |
| `api/tests/test_utils.py` | 507 | `b96884cce9d110881ffe091783e8b889081eaeed03b391b550170c090fc3a5fc` |
| `api/tests/test_views.py` | 325 | `67e155265f85e5471dc3f8ffa173dfb1dd8a106c741aa4b345d8255d9e19d038` |
| `api/tests/test_wsgi.py` | 60 | `874353bc4cf91da13496f64fa1df5a53ddd5cdf13eac32e5f1be3143378db1ab` |
| `api/urls.py` | 96 | `f4cc25f1d6e8f749f45df6321cc42494454776b434f2ecda04f92fd9efeb49a4` |
| `api/utils.py` | 3107 | `48447be11b2ac1f7814a7840d44e909095cf16d969436f4b4d5c8dee191107ec` |
| `api/views.py` | 5566 | `dce66317b21561b8d648116bba90a8b748d2435e7898f4398b5701a06e4a0fa3` |
| `azure-pipelines.yml` | 275 | `4e344f6c9e7d12a0197004fcae633adb852812a745a09a7b267904ef1bd8907e` |
| `chart/.helmignore` | 23 | `c5a9bd139c9e10545d48e9a9637e2eeb16777918f97b69e193b429026dce8235` |
| `chart/Chart.yaml` | 24 | `c5e07679bee9960c2ddb4af0ce2a192d55750102a86d5474b40a2ce6022733f4` |
| `chart/envs/dev.yaml` | 43 | `70066af5f24d16e5a12501c45955599fd1f37437b6f00842cf191d554690132e` |
| `chart/envs/prod.yaml` | 45 | `30124bffdacbf66315537368f80cfa5ff449508652c0a7b231f63309dab898f9` |
| `chart/templates/_helpers.tpl` | 62 | `0c8c4030bbc47cd3817ec09ee85bde87ef2fada6c2e243727e97c3c98e781e10` |
| `chart/templates/deployment.yaml` | 117 | `5bdd85eac0a913df493bf8a91d1ea657f3c7b3a42cc0883c7b51106836db0c63` |
| `chart/templates/hpa.yaml` | 29 | `26c7c5a66415d575c0d1347476c50ce969edf940613a74e7c10f8fe3ac13d1ea` |
| `chart/templates/ingress.yaml` | 62 | `131d8cf9b6d48fa1cb0771ff2d4b6259c7504ece239c77bb3bbb9742ff5df44c` |
| `chart/templates/NOTES.txt` | 22 | `5d875ca1731fc8e326f29b44556d25c412292045444efca5a004a4990f4ccc6f` |
| `chart/templates/secretproviderclass.yaml` | 32 | `ebb8182fbc9c7a0c53c010558fb264823bfd26ed7c4a37116b323cd6d9922c3f` |
| `chart/templates/service.yaml` | 16 | `b2abf6c3e6c254f5a479c1e4b9df72c2bf902554ecb932a576ea5e76bf8a8802` |
| `chart/templates/serviceaccount.yaml` | 17 | `635a4cf1766ee28efa9dc440e58220f330a9cdbdb4b98a3f6127a2ea92f2c131` |
| `chart/templates/tests/test-connection.yaml` | 15 | `c2efd77a79c286f80fdffe95b2173a55256288e7a327e93c7126a4ae99a9583f` |
| `chart/values-nprd.yaml` | 32 | `bb343e6a1e4127f2b608320d16517da65f0e1a5bd150330ed8f3062d032b1a75` |
| `chart/values-prod.yaml` | 35 | `84c1a4f0a4c1a6ed86f10cce4a635e05b6bb0169a9c95b6189a463e5a72ad035` |
| `chart/values.yaml` | 134 | `a9ec636c4491eb46b0a9906d9274ec9c32e0f976a6a86206120d8807725ef827` |
| `config/.gitkeep` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `createproject.sh` | 23 | `3149169470c7fdbdd317e28f56b3c015054ea6c6a7f869d9a5661e5aa74f9054` |
| `Dockerfile` | 65 | `5df0c5b2403431bc2e98ee960142610c667c7db1eb80e69bc87e7758bc8c3b48` |
| `Dockerfile.unsecured` | 71 | `7ec7da9609627d096e5a3337b0e2f1567e9a69e0e91a62e87c10e22527be1edb` |
| `gunicorn.py` | 25 | `b25afbab8353bd006a643de4bd85ce6075a033ad0195a8a0ceb21cd0a7ba45b8` |
| `manage.py` | 21 | `ae339dfacf333444fec5aac555dd03b1a5747e9a967be74f67cc9102426e652b` |
| `nginx.conf` | 77 | `840b12161705b8fd2e59a18afe530e81a689b0b31387acaa3479b403d741c3d6` |
| `pytest.ini` | 3 | `736b5c98eff9615a37b0935b1d96a544cbad14b87f7860ab58a4f22b6edbf5ac` |
| `qualitygate/pr-qualitygate.properties` | 10 | `4aafbb41ab273502fd930d7d7331cdb7f50d4ac7a9b0b791ddab0aa19232bfab` |
| `qualitygate/qualitygate.properties` | 37 | `6cfe44d73d476adff596a0ff83479d7aa449e83c2b7a5598902c900f166bbea9` |
| `README.md` | 100 | `7f90d8069954f44f468b8b6a052b14bc57d01c74e7269b9d8918102cbba5a3f3` |
| `requirements.txt` | 18 | `676b80073de5199374f7dd8baf2a6aeef5beabceb4b8dfd17c4effd362594b03` |
| `run.sh` | 15 | `c0ca155be1bd92a8b5c0fd4b460aba54b7f2946f12ddc97ad20794f8a8d1e08e` |
| `start.sh` | 40 | `17aae047e263aec316eeb832c009e77e273eb16e5462612c2ffe8459c3ad7b1b` |
| `test.json` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `uwsgi.ini` | 20 | `6f2bbdea4742b03065f85ce2cc360e2bd0f91db790c31a44f5d5b0564ce9e123` |
| `velocloud` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `velocloud_app/__init__.py` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `velocloud_app/documents/onboarding.md` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `velocloud_app/middleware/auth.py` | 232 | `2ef3089691c39fee93e95f8f94a619a6417388cb2f014c963d15828edc273ba8` |
| `velocloud_app/settings.py` | 182 | `020b8369a23f465139bdfa7b1b0b6e42b85b8ca0ba5dfa3fcd87eebbf3560811` |
| `velocloud_app/urls.py` | 31 | `27fe2462bc9f445ef1aaaaa040807721c6f5b09f5e5d15e8d8c05163dca7fdb2` |
| `velocloud_app/wsgi.py` | 27 | `9c70b6d17feb388586cbc2c725eb617566513c84bd129455cf2f13215e70729c` |

## Module-level dependency and side-effect inventory

All production Python files are parsed in full; functions and nested calls are in document 03. Module statements below include imports, global assignments and top-level control/initialization. Reading/parsing source is not execution evidence.

### `api/__init__.py`

Imports: none.

Globals: none.

Module-level calls: none.

### `api/doc_utils_helpers.py`

Imports: `import logging`; `import sys`.

Globals: none.

Module-level calls: `logging.basicConfig (line 7)`.

### `api/docs_mds.py`

Imports: `from io import BytesIO`; `from base64 import b64encode`; `import logging`; `import sys`; `import ipaddress`; `import json`; `import xlsxwriter`; `from api.doc_utils_helpers import dotted_key_list, parse_business_rule, parse_fw_rule, merge_two_dicts`.

Globals: none.

Module-level calls: `logging.basicConfig (line 13)`.

### `api/docs_other.py`

Imports: `from datetime import datetime`; `from base64 import b64encode`; `import logging`; `import sys`; `import json`; `import ipaddress`; `from io import BytesIO`; `from typing import NamedTuple`; `import numpy as np`; `import pandas as pd`; `import xlsxwriter`; `from xlsxwriter.format import Format`; `from openpyxl import load_workbook`; `from openpyxl.styles import PatternFill, Font, Alignment`; `from openpyxl.worksheet.table import Table, TableStyleInfo`; `from openpyxl.formatting.rule import FormulaRule`; `from openpyxl.utils import get_column_letter`; `from api.doc_utils_helpers import dotted_key_list`; `from api.doc_utils_helpers import parse_business_rule`; `import re`; `from api.utils import get_license_name, calculate_max_trough, calculate_average, calculate_95th_percentile, calculate_29_subnet`.

Globals: `SOURCE_NAME`, `RULE_NAME`, `MATCH_SOURCE`, `SOURCE_ADDRESS_GROUP`, `SOURCE_ADDRESS_GROUP_DETAILS`, `SOURCE_PORT_GROUP`, `SOURCE_PORT_GROUP_DETAILS`, `MATCH_DESTINATION`, `DESTINATION_ADDRESS_GROUP`, `DESTINATION_ADDRESS_GROUP_DETAILS`, `DESTINATION_PORT_GROUP`, `DESTINATION_PORT_GROUP_DETAILS`, `MATCH_APPLICATION`, `ACTION_NETWORK_SERVICE`, `ACTION_LINK`, `ACTION_PRIORITY`, `ACTION_SERVICE_CLASS`, `ACTION_LINK_PREFERRED`, `DSCP_OUTER`, `POLICY_TABLE`, `ACTIVATION_TIME`, `LTS_RELEASE`, `MODEL_NUMBER`, `SOFTWARE_VERSION`, `HA_MODE`, `EDGE_STATE`, `OVERLAY_NAME`, `PACKET_LOSS_RX`, `PACKET_LOSS_TX`, `BYTES_RX`, `BYTES_TX`, `JITTER_RX`, `JITTER_TX`, `LATENCY_RX`, `LATENCY_TX`, `LICENSE_LEVEL`, `LICENSE_BANDWIDTH`, `LATENCY_RX_NUMERIC`, `JITTER_RX_NUMERIC`, `PACKET_LOSS_RX_NUMERIC`, `UTIL_HIGH_RX`, `UTIL_HIGH_TX`, `UTIL_MEDIUM_RX`, `UTIL_IDLE_RX`, `AGGREGATED_MAX`, `AGGREGATED_AVERAGE`, `AGGREGATED_PERCENTILE`, `LICENSE_SIZING`, `UTIL_HIGH_TX_BUSINESS`, `UTIL_HIGH_RX_BUSINESS`, `UTIL_IDLE_RX_BUSINESS`, `UTIL_IDLE_TX_BUSINESS`, `SOFTWARE_RELEASES`, `Service_Manager_Report`.

Module-level calls: `logging.basicConfig (line 26)`.

### `api/serializers.py`

Imports: `from rest_framework import serializers as ser`.

Globals: none.

Module-level calls: none.

### `api/urls.py`

Imports: `from django.urls import path`; `from django.urls import re_path`; `from rest_framework.permissions import AllowAny`; `from drf_yasg.views import get_schema_view`; `from drf_yasg.openapi import Info, Contact, License`; `from velocloud_app.settings import get_document`; `from api import views`.

Globals: `schema_view`, `urlpatterns`.

Module-level calls: `get_schema_view (line 14)`; `Info (line 15)`; `Contact (line 18)`; `License (line 19)`; `get_document (line 25)`; `re_path (line 35)`; `re_path (line 39)`; `re_path (line 44)`; `path (line 50)`; `path (line 51)`; `path (line 52)`; `path (line 53)`; `path (line 54)`; `path (line 55)`; `path (line 56)`; `path (line 57)`; `path (line 58)`; `path (line 59)`; `path (line 60)`; `path (line 61)`; `path (line 62)`; `path (line 63)`; `path (line 64)`; `path (line 65)`; `path (line 66)`; `path (line 67)`; `path (line 68)`; `path (line 69)`; `path (line 70)`; `path (line 71)`; `path (line 72)`; `path (line 73)`; `path (line 74)`; `path (line 75)`; `path (line 76)`; `path (line 77)`; `path (line 78)`; `path (line 79)`; `path (line 80)`; `path (line 81)`; `path (line 82)`; `path (line 83)`; `path (line 84)`; `path (line 85)`; `path (line 86)`; `path (line 87)`; `path (line 88)`; `path (line 89)`; `path (line 90)`; `path (line 91)`; `path (line 92)`; `path (line 93)`; `path (line 94)`; `path (line 95)`; `schema_view.without_ui (line 37)`; `schema_view.with_ui (line 41)`; `schema_view.with_ui (line 46)`; `views.BillingReport.as_view (line 50)`; `views.LinkMetricReport.as_view (line 51)`; `views.QOEReport.as_view (line 52)`; `views.DeviceCount.as_view (line 53)`; `views.VCOGetRoutingTable.as_view (line 54)`; `views.VCOGetCSSList.as_view (line 55)`; `views.UserAdd.as_view (line 56)`; `views.Mds.as_view (line 57)`; `views.MdsGenerate.as_view (line 58)`; `views.LMAC.as_view (line 59)`; `views.VcoGetSpecificConfig.as_view (line 60)`; `views.VCOGatewayMigration.as_view (line 61)`; `views.EdgeProvision.as_view (line 62)`; `views.AAEdgeProvision.as_view (line 63)`; `views.linksDownParser.as_view (line 64)`; `views.UtilisationMetrics.as_view (line 65)`; `views.GetNetworkOverviewInfo.as_view (line 66)`; `views.troughputMax.as_view (line 67)`; `views.getEdgeNames.as_view (line 68)`; `views.linkStatistics.as_view (line 69)`; `views.packetLoss.as_view (line 70)`; `views.objectgroups.as_view (line 71)`; `views.licenses.as_view (line 72)`; `views.applicationInsight.as_view (line 73)`; `views.aggregatedLinksStatistics.as_view (line 74)`; `views.aggregatedEdgeStatistics.as_view (line 75)`; `views.gamingApplicationInsight.as_view (line 76)`; `views.staticRoutesExport.as_view (line 77)`; `views.siteInfoDetail.as_view (line 78)`; `views.EdgeProvisionCitizens.as_view (line 79)`; `views.flowsExportGE5.as_view (line 80)`; `views.Sephora_list_paths.as_view (line 81)`; `views.tunnelsExport.as_view (line 82)`; `views.edgeMetricsInfo.as_view (line 83)`; `views.bgpFromGateway.as_view (line 84)`; `views.msimLicense.as_view (line 85)`; `views.dailyEdgeStatistics.as_view (line 86)`; `views.dailyCircuitStatistics.as_view (line 87)`; `views.publicIpExport.as_view (line 88)`; `views.AdidasLMAC.as_view (line 89)`; `views.HWStats.as_view (line 90)`; `views.ServiceManagerReport.as_view (line 91)`; `views.CapacityPlanner.as_view (line 92)`; `views.citizenswanlinks.as_view (line 93)`; `views.DanoneBPExtract.as_view (line 94)`; `views.EdgeRMA.as_view (line 95)`.

### `api/utils.py`

Imports: `import sys`; `from base64 import b64decode`; `import logging`; `from csv import DictReader`; `from io import StringIO`; `import random`; `import string`; `import pandas as pd`; `import numpy as np`; `from zoneinfo import ZoneInfo, ZoneInfoNotFoundError`; `import datetime`; `import time`; `import ipaddress`; `from os import environ`; `from concurrent.futures import ThreadPoolExecutor, as_completed`; `import requests as req`; `from websocket._core import create_connection`; `from websocket._exceptions import WebSocketConnectionClosedException`; `import json`; `import ssl`; `from copy import deepcopy`; `from urllib.parse import urlparse`.

Globals: `API_BASE`, `EDGE_SPECIFIC_PROFILE`, `EDGE_LIST_FAILURE`, `TRUSTED_API_DOMAIN_SUFFIXES`, `proxies`, `ADI_ip_ranges`, `CAPACITY_METRIC_LABELS`, `CAPACITY_BUCKET_LABELS`.

Module-level calls: `logging.basicConfig (line 60)`; `environ.get (line 111)`; `environ.get (line 112)`; `open (line 2157)`; `json.load (line 2158)`; `ipaddress.ip_network (line 2160)`.

### `api/views.py`

Imports: `import logging`; `import sys`; `import os`; `import base64`; `import json`; `import uuid`; `import time`; `import math`; `import mysql.connector`; `from rest_framework import generics, status`; `from rest_framework.response import Response`; `from django.utils.decorators import method_decorator`; `from django.http import HttpResponse`; `from drf_yasg.utils import swagger_auto_schema`; `from jsonpath_ng import ext`; `import pandas as pd`; `from api import serializers`; `from api.docs_mds import mds_generate`; `from datetime import datetime`; `from api.docs_other import site_list, link_report, qoe_report, service_manager_report, inventory_report, route_report, create_edge_performance_file, bgp_from_gw_neighbor_routes, css_location_report, citizenswanlinksdoc, create_tunnels_file, publicIpExportDoc, all_msim_license, all_tunnels_info, sephora_list_paths, vcg_migration, application_report, staticRoutesExportDoc, ge5_flows_report, gaming_application_report, event_logs_parse, max_troughput_report, max_agregate_incorrect_input, def_object_group, get_link_statisctics_aggregate, get_link_packet_loss_aggregate, create_hw_stats_excel, capacity_planner_report, danone_bp_extract_generate`; `from api.utils import get_session, resolve_params, get_credentials, get_all_edges_configs, create_user, password_reset_user, get_applications, get_routable_applications, get_edge_config_stack, get_edge_link_series, get_qoe_edge, get_enterprise_inventory, get_tenantid_nonmsp, get_qoe_edge_month, get_edge_status_series, update_edge_config, get_enterprises, get_gateways, get_enterprise_services, get_enterprise_services_full, create_edge, update_edge_attributes, create_filename, create_filename_QOE, get_websocket_bgp_from_gateway, get_gateway_edge_assignment, get_routes, get_segments, get_edge_status_series_general, get_enterprise_edge_list, get_all_events_log, get_qoe_Agregate_month, get_enterprise_bgp_peer_status, get_edge_link_serie_utilisation_metrics, get_customer_name_nonmsp, get_edge_status_series_utilisation_metrics, get_network_overview_info, calculate_troughput, aggregate_troughput, last_month, calculation_circuit_daily_statistics, assignee_hostname_and_attributes, set_edge_software, get_daily_link_statistics, get_licenses, get_toptalkers_edge, get_aggregate_edge_metrics, get_edge_link_daily_series, get_edge_status_daily_series, calculate_daily_edge_statistics, get_edge_models, get_all_edges_hostname, get_application_edge, get_all_edges_licenses, get_all_edges_recentlinks, get_link_packet_loss_prev_month, get_websocket, get_all_edges_sites_licenses_wan, get_all_customers, get_all_ge5_flows, insert_edge_module, update_last_octet, get_all_edges_configs_only, get_all_edges_wanlinks, get_all_gamings_flows, get_gamingapplication_edge, get_link_Agregate_month, get_link_packet_loss, get_object_groups, aggregate_links, get_aggregate_links_metrics, collect_capacity_data, get_param_value, normalize_rma_model, get_latest_operator_config, build_rma_edge_payload, migrate_rma_interfaces_and_wan`.

Globals: `EDGE_PERFORMANCE_FINISHED`, `GLOBAL_SEGMENT`, `CONFIGURATION_UPDATE_UNFINISHED`.

Module-level calls: `logging.basicConfig (line 43)`.

### `gunicorn.py`

Imports: none.

Globals: `wsgi_app`, `loglevel`, `workers`, `bind`, `reload`, `errorlog`, `loglevel`, `accesslog`, `access_log_format`, `capture_output`, `timeout`, `keepalive`.

Module-level calls: none.

### `manage.py`

Imports: `import os`; `import sys`.

Globals: none.

Module-level calls: `main (line 21)`.

### `velocloud_app/__init__.py`

Imports: none.

Globals: none.

Module-level calls: none.

### `velocloud_app/middleware/auth.py`

Imports: `import re`; `import traceback`; `from string import ascii_letters`; `from random import choice`; `from pprint import pprint`; `from urllib.parse import unquote, urlparse`; `from base64 import b64decode`; `from functools import lru_cache`; `import requests`; `from django.shortcuts import redirect`; `from django.conf import settings`; `from django.http import HttpResponse`; `from django.contrib.auth import get_user_model`.

Globals: `LETTERS`, `GL_URL`, `AAF_URL`, `AAF_INVALID_USERNAME`, `AAF_UNEXPECTED_FORMAT`, `DISABLE_CACHE`, `PATH_TO_EXCLUDE`, `HOST_DOMAIN_TO_EXCLUDE`.

Module-level calls: `''.join (line 19)`; `str (line 19)`; `range (line 19)`.

### `velocloud_app/settings.py`

Imports: `import os`; `import stat`; `import sys`; `import tempfile`; `from os import environ`; `from os.path import abspath, dirname, join`; `from pathlib import Path`.

Globals: `BASE_DIR`, `ENV`, `UNITTEST`, `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`, `INSTALLED_APPS`, `REST_FRAMEWORK`, `MIDDLEWARE`, `AUTHENTICATION_BACKENDS`, `ROOT_URLCONF`, `TEMPLATES`, `WSGI_APPLICATION`, `DATABASES`, `AUTH_PASSWORD_VALIDATORS`, `LANGUAGE_CODE`, `TIME_ZONE`, `USE_I18N`, `USE_L10N`, `USE_TZ`, `MYSQL_DUPLICATE_ENTRY`, `SWAGGER_SETTINGS`, `FORCE_SCRIPT_NAME`, `STATIC_URL`, `STATIC_ROOT`, `DOC_PATH`, `CALL_PATH`, `TEMPLATE_PATH`, `MATOMO_URLS`, `MATOMO_IDS`, `TMATOMO_API_TOKEN`, `PAPERPLANE_URL`, `PAPERPLANE_TOKEN`.

Module-level calls: `dirname (line 13)`; `dirname (line 13)`; `abspath (line 13)`; `environ.get('ENV', 'dev').lower (line 14)`; `environ.get (line 14)`; `environ.get (line 19)`; `os.environ.get (line 26)`; `os.environ.get (line 27)`; `_private_database_path (line 122)`; `environ.get (line 161)`; `join (line 164)`; `dirname (line 164)`; `abspath (line 164)`; `join (line 165)`; `dirname (line 165)`; `abspath (line 165)`; `join (line 166)`; `dirname (line 166)`; `abspath (line 166)`; `environ.get (line 174)`; `environ.get (line 182)`.

### `velocloud_app/urls.py`

Imports: `from django.urls import path, re_path`; `from django.conf.urls import include`; `from django.conf.urls.static import static`; `from django.views.generic.base import RedirectView`; `from velocloud_app.settings import STATIC_URL, STATIC_ROOT`.

Globals: `urlpatterns`.

Module-level calls: `static (line 31)`; `re_path (line 23)`; `path (line 26)`; `include (line 23)`; `RedirectView.as_view (line 28)`.

### `velocloud_app/wsgi.py`

Imports: `import os`; `from django.core.wsgi import get_wsgi_application`.

Globals: `django_application`, `URL_PREFIX`.

Module-level calls: `os.environ.setdefault (line 10)`; `get_wsgi_application (line 12)`; `os.environ.pop('SCRIPT_NAME', '').rstrip (line 19)`; `os.environ.pop (line 19)`.

