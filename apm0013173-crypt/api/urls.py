"""
"api" application URLs included in "crypt_app" urls.py.
"""

from django.urls import path
from django.contrib import admin
from django.conf.urls import url
from rest_framework.permissions import AllowAny
from drf_yasg.views import get_schema_view
from drf_yasg.openapi import Info, Contact, License
from crypt_app.settings import get_document
from api import views


schema_view = get_schema_view(
    Info(
        title="Crypt API endpoints",
        default_version="v1",
        contact=Contact(name="Arif, Toslim (ta147p)", email="ta147p@att.com"),
        license=License(
            name=(
                "AT&T Intellectual Property. All rights reserved. NGNSD CIST"
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
    url(
        r"^swagger(?P<format>\.json|\.yaml)$",
        schema_view.without_ui(cache_timeout=0), name="schema-json"
    ),
    url(
        r"^swagger/$",
        schema_view.with_ui("swagger", cache_timeout=0),
        name="schema-swagger-ui"
    ),
    url(
        r"^redoc/$",
        schema_view.with_ui("redoc", cache_timeout=0),
        name="schema-redoc"
    ),
    # doc end

    path("admin/", admin.site.urls),

    # v1
    path("v1/kdbx/", views.KdbxFiles.as_view()),
    path("v1/kdbx/<id>", views.KdbxFilesRUD.as_view()),
    path("v1/credentials/", views.Credentials.as_view()),
    path("v1/token-resync", views.TokenResync.as_view())
]
