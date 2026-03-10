from django.urls import include, path, re_path

from rest_framework.permissions import AllowAny

from drf_yasg.views import get_schema_view
from drf_yasg.openapi import Info, Contact, License
from aggregator.utils import get_readme

SchemaView = get_schema_view(
    Info(
        title="CSS Data Aggregator",
        default_version="v1",
        contact=Contact(name="Arif, Toslim (ta147p)", email="toslim.arif@intl.att.com"),
        license=License(
            name=(
                "AT&T Intellectual Property. All rights reserved."
                " Client Implementation Scripting Team"
            )
        ),
        description=get_readme("onboarding.md"),
        terms_of_service="https://www.att.com/legal/terms.attWebsiteTermsOfUse.html",
    ),
    public=True,
    permission_classes=[AllowAny],
)

urlpatterns = [
    # Doc Begins Here
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
    # Doc End Here
    
    # V1: Actual API Endpoints Begins Here
    
    # -------------------------------------------
    # All VeloCloud Related Endpoints Begins Here
    path("velocloud/", include("api.velocloud.urls"))
    # All VeloCloud Related Endpoints Ends Here
    # -----------------------------------------
    
    # V1: Actual API Endpoints Ends Here
]