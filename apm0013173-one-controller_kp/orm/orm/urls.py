from django.urls import path
from django.db.models.base import ModelBase
from orm import models, views


urlpatterns = []
for model in dir(models):
    if not isinstance(getattr(models, model), ModelBase):
        continue
    urlpatterns.append(path(f"{model.lower()}/", views.DbView.as_view()))
    urlpatterns.append(
        path(f"{model.lower()}/<int:id>/", views.DbView.as_view())
    )
