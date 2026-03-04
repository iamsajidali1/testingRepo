# pylint: disable=missing-docstring
from django.urls import path, re_path

from rest_framework.permissions import AllowAny

from drf_yasg.views import get_schema_view
from drf_yasg.openapi import Info, Contact, License

from vmanage_app.settings import get_document
from api import views


SchemaView = get_schema_view(
    Info(
        title="CSS Resource Adapter - vManage",
        default_version="v1",
        contact=Contact(name="Arif, Toslim (ta147p)", email="toslim.arif@intl.att.com"),
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
        SchemaView.without_ui(cache_timeout=0), name="schema-json"
    ),
    re_path(
        r"^swagger/$",
        SchemaView.with_ui("swagger", cache_timeout=0),
        name="schema-swagger-ui"
    ),
    re_path(
        r"^redoc/$",
        SchemaView.with_ui("redoc", cache_timeout=0),
        name="schema-redoc"
    ),
    # doc end
    path("status", views.Status.as_view()),
    path("report/getDevicesList", views.GetDevicesList.as_view()),
    path("report/getInterfaceStatistics", views.GetInterfaceStatistics.as_view()), 
    path("report/getBulkApisOption", views.GetBulkApisOptionOutput.as_view()),
    path("report/getDeviceTemplates", views.GetDeviceFeatureTemplates.as_view()),
    path("report/showTemplateAttachedDevices", views.ShowTemplateAttachedDevices.as_view()),
    path("report/showDevicesTshoot", views.ShowDevicesTshoot.as_view()),
    path("report/mds", views.mds.as_view()),
]
