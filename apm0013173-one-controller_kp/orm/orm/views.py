import re

import rest_framework

from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.serializers import SerializerMetaclass
from rest_framework.mixins import UpdateModelMixin, DestroyModelMixin

from django.db.models.base import ModelBase
from orm import models, serializers, filters


class DbView(DestroyModelMixin, UpdateModelMixin, generics.GenericAPIView):
    lookup_field = "id"
    lookup_url_kwarg = "id"

    @staticmethod
    def find_name(path):
        match = re.findall(r"/api/(\w+)", path)
        if match:
            return match[0]
        return None

    @staticmethod
    def find_model(name):
        all_models = [
            model for model in dir(models)
            if isinstance(getattr(models, model), ModelBase)
        ]

        found = next(filter(
            lambda item: item.lower() == name,
            all_models
        ), None)

        return getattr(models, found, None)

    @staticmethod
    def find_serializer(name):
        all_serializers = [
            serial for serial in dir(serializers)
            if isinstance(getattr(serializers, serial), SerializerMetaclass)
        ]
        found = next(filter(
            lambda item: item.lower() == name,
            all_serializers
        ), None)

        return getattr(serializers, found, None)

    def get_serializer_class(self):
        model_lower = DbView.find_name(self.request.path)
        if self.request.method.lower() in ("post", "put", "patch"):
            model_lower = f"create{model_lower}"
        return DbView.find_serializer(model_lower)

    def get_queryset(self):
        model_lower = DbView.find_name(self.request.path)
        model = DbView.find_model(model_lower)
        return model.objects.all()

    def get(self, request, *_, **__):
        if self.lookup_url_kwarg in self.kwargs:
            instance = self.get_object()
            serializer = self.get_serializer_class()(instance)
            return Response(serializer.data)

        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)

        if page is not None:
            serializer = self.get_serializer_class()(page, many=True)
            return self.get_paginated_response(serializer.data)

        serialized = self.get_serializer_class()(page, many=True)
        return Response(serialized.data)

    def post(self, request):
        model = DbView.find_model(DbView.find_name(request.path))
        serializer = self.get_serializer_class()(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def delete(self, request, *args, **kwargs):
        return self.destroy(request, *args, **kwargs)

    def put(self, request, *args, **kwargs):
        return self.update(request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)
