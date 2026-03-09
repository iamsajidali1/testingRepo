"""
"api" application URLs included in "pp_application" urls.py.
"""

from django.urls import path
from django.contrib import admin
from django.conf.urls import url
from rest_framework.permissions import AllowAny
from drf_yasg.views import get_schema_view
from drf_yasg.openapi import Info, Contact, License
from pp_application.settings import get_document
from api import views


schema_view = get_schema_view(
    Info(
        title="Paperplane API endpoints",
        default_version="v2",
        contact=Contact(name="Stedl, Matus (ms639x)", email="ms639x@att.com"),
        license=License(
            name=(
                "AT&T Intellectual Property. All rights reserved."
                " Service Delivery DevOps"
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
    url(r"^message$", views.MessageView.as_view()),
    path(
        "message/unprocessed/<int:type_id>",
        views.UnhandledMessageView.as_view()
    ),
    path(
        "message/process/<int:message_id>",
        views.HandleMessageView.as_view()
    ),
    url(r"^message/types$", views.MessageTypeView.as_view()),
    url(
        r"^trigger/planned-messages$",
        views.TriggerCheckPlannedMessagesView.as_view()
    ),

    # v2
    path("v2/register", views.V2RegistrationView.as_view()),
    path("v2/message", views.V2MessageView.as_view()),
    path("v2/event", views.V2EventView.as_view()),
    path(
        "v2/message/unprocessed/<int:type_id>",
        views.UnhandledMessageView.as_view()
    ),
    path(
        "v2/message/process/<int:message_id>",
        views.HandleMessageView.as_view()
    ),
    path(r"v2/message/types", views.MessageTypeView.as_view()),
    path(r"v2/event/types", views.EventTypeView.as_view()),
    path(r"v2/subscribe/types", views.V2SubscriptionTypeView.as_view()),
    path(r"v2/subscribe/register", views.V2RegisterSubscriberView.as_view()),
    path(r"v2/subscribe", views.V2SubscribeView.as_view()),
    path(r"v2/time", views.V2TimeView.as_view()),
    path(
        "v2/trigger/planned-messages",
        views.TriggerCheckPlannedMessagesView.as_view()
    ),
    path("v2/bot/types", views.V2BotTypeView.as_view()),
    path("v2/bot/headers", views.V2BotHeaderView.as_view()),
    path("v2/application", views.V2ApplicationView.as_view()),
    path("status", views.Status.as_view())
]
