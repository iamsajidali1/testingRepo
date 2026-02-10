# pylint: disable=missing-docstring
from django.urls import path, re_path

from rest_framework.permissions import AllowAny

from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)

from utilities_app.settings import get_document
from api import views

# pylint: disable=invalid-name
urlpatterns = [
    # OpenAPI schema (JSON/YAML)
    path("schema/", SpectacularAPIView.as_view(), name="schema"),
    # Swagger UI
    path("swagger/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    # Redoc UI
    path("redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
    # Your API endpoints
    path("test/edf/<str:connection>", views.EDFTestConnection.as_view()),
    path("onetouch/config/<str:hostname>", views.OneTouchConfig.as_view()),
    path("onetouch/ping/", views.OneTouchPing.as_view()),
    path("onetouch/bootstrap/", views.OneTouchBootstrap.as_view()),
    path("client/runssh/", views.RunCLISSH.as_view()),
    path("others/geo/", views.GetGeolocationForRA.as_view()),
    path('files/upload/', views.FileUploadView.as_view()),
    path('files/download/', views.FileDownloadView.as_view()),
    re_path(r"report/others/circuits/?$", views.GetCircuitDetails.as_view()),
    re_path(r"report/others/geo/?$", views.GetGeolocationsForRA.as_view()),
    re_path(r"report/others/bvoipTeleNumbers/?$", views.GetBvoipTeleNumbers.as_view()),
]
