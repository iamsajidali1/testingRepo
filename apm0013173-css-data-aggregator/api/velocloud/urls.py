from django.urls import include, path, re_path

from api.velocloud.views import NetworkInsights

urlpatterns = [
    path("network-insights/", view=NetworkInsights.as_view(), name="network-insights"),
]