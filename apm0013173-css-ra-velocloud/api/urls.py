# pylint: disable=missing-docstring
from django.urls import path
from django.urls import re_path

from rest_framework.permissions import AllowAny

from drf_yasg.views import get_schema_view
from drf_yasg.openapi import Info, Contact, License

from velocloud_app.settings import get_document
from api import views


schema_view = get_schema_view(
    Info(
        title="CSS Resource Adapter - Velocloud",
        default_version="v1",
        contact=Contact(name="Ondrej Licak (ol024y)", email="ol024y@att.com"),
        license=License(
            name=(
                "AT&T Intellectual Property. All rights reserved."
                " MSDE Client Implementation Scripting Team"
            )
        ),
        description=get_document("onboarding.md")
    ),
    public=True,
    permission_classes=[AllowAny],
)


# pylint: disable=invalid-name
urlpatterns = [
    # doc begin
    re_path(
        r"^swagger(?P<format>\.json|\.yaml)$",
        schema_view.without_ui(cache_timeout=0), name="schema-json"
    ),
    re_path(
        r"^swagger/$",
        schema_view.with_ui("swagger", cache_timeout=0),
        name="schema-swagger-ui"
    ),
    re_path(
        r"^redoc/$",
        schema_view.with_ui("redoc", cache_timeout=0),
        name="schema-redoc"
    ),
    # doc end
    path("report/billing", views.BillingReport.as_view()),
    path("report/linkMetrics", views.LinkMetricReport.as_view()),
    path("report/QOEMetrics", views.QOEReport.as_view()),
    path("report/deviceCount", views.DeviceCount.as_view()),
    path("report/routingTable", views.VCOGetRoutingTable.as_view()),
    path("report/cssLocation", views.VCOGetCSSList.as_view()),
    path("user/add", views.UserAdd.as_view()),
    path("mds/", views.Mds.as_view()),
    path("report/mds", views.MdsGenerate.as_view()),
    path("report/lmac", views.LMAC.as_view()),
    path("report/vcoConfigReport", views.VcoGetSpecificConfig.as_view()),
    path("report/vcoGatewayMigrations", views.VCOGatewayMigration.as_view()),
    path("edge/provision", views.EdgeProvision.as_view()),
    path("edge/aaedgeprovision", views.AAEdgeProvision.as_view()),
    path("report/linksDownParser", views.linksDownParser.as_view()),
    path("report/utilisationMetrics", views.UtilisationMetrics.as_view()),
    path("report/getNetworkOverviewInfo", views.GetNetworkOverviewInfo.as_view()),
    path("report/troughputMax", views.troughputMax.as_view()),
    path("report/getEdgeNames", views.getEdgeNames.as_view()),
    path("report/linkStatistics", views.linkStatistics.as_view()),
    path("report/packetloss", views.packetLoss.as_view()),
    path("report/objectgroups", views.objectgroups.as_view()),
    path("report/licenses", views.licenses.as_view()),
    path("report/applicationInsight", views.applicationInsight.as_view()),
    path("report/aggregatedLinksStatistics", views.aggregatedLinksStatistics.as_view()),
    path("report/aggregatedEdgeStatistics", views.aggregatedEdgeStatistics.as_view()),
    path("report/gamingApplicationInsight", views.gamingApplicationInsight.as_view()),
    path("report/staticRoutesExport", views.staticRoutesExport.as_view()),
    path("report/siteInfoDetail", views.siteInfoDetail.as_view()),
    path("edge/provisionCitizens", views.EdgeProvisionCitizens.as_view()),
    path("report/flowsExportGE5", views.flowsExportGE5.as_view()),
    path("report/SephoraListPaths", views.Sephora_list_paths.as_view()),
    path("report/tunnelsExport", views.tunnelsExport.as_view()),
    path("report/edgeMetricsInfo", views.edgeMetricsInfo.as_view()),
    path("report/bgpFromGateway", views.bgpFromGateway.as_view()),
    path("report/msimLicense", views.msimLicense.as_view()),
    path("report/dailyEdgeStatistics", views.dailyEdgeStatistics.as_view()),
    path("report/dailyCircuitStatistics", views.dailyCircuitStatistics.as_view()),
    path("report/publicIpExport", views.publicIpExport.as_view()),
    path("report/AdidasLMAC", views.AdidasLMAC.as_view()),
    ]