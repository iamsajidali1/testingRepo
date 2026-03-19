from django.db.models.fields.related import ForeignKey
from django.db.models import CharField, TextField, JSONField

from rest_framework.filters import SearchFilter

from django_filters.rest_framework import DjangoFilterBackend


def rec_lookup(model, parent: str = None):
    searchable = []
    meta = model._meta
    for field in meta.fields:
        if not isinstance(field, ForeignKey):
            name = field.name
            if parent:
                name = f"{parent}__{name}"
            searchable.append(name)
            continue

        name = f"{field.name}_id"
        if parent:
            name = f"{parent}__{name}"
        #searchable.append(f"={name}")
        searchable += rec_lookup(
            model=field.related_model, parent=field.name
        )
    return searchable


def get_search_fields(view, request):
    # circular import if on top
    from orm.views import DbView

    model_lower = DbView.find_name(request.path)
    model = DbView.find_model(model_lower)

    searchable = rec_lookup(model)
    return searchable


class FkSearchFilter(SearchFilter):
    def get_search_fields(self, view, request):
        return get_search_fields(view, request)


class FkDjangoFilterBackend(DjangoFilterBackend):
    def get_filterset_class(self, view, queryset=None):
        return super().get_filterset_class(view, queryset=queryset)

    def filter_queryset(self, request, queryset, view):
        fields = get_search_fields(view, request)
        self.filter_fields = fields

        data = super().filter_queryset(request, queryset, view)
        query = super().get_filterset_kwargs(request, queryset, view)
        query = query.get("data", {})

        if query and any([key for key in query.keys() if key in fields]):
            data = data.filter(
                **{key: val for key, val in query.items() if key in fields}
            )

        return data
