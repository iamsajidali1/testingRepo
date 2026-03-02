from django.conf.urls import url
from . import views

urlpatterns = [
    url(r'listTemplates', views.ListTemplates.as_view()),
    url(r'updateTemplate', views.UpdateTemplate.as_view()),
    url(r'getTemplate', views.GetTemplate.as_view()),
    url(r'deleteTemplate', views.DeleteTemplate.as_view()),
    url(r'generateConfig', views.GenerateConfig.as_view()),
    url(r'listDirectory', views.ListDirectory.as_view()),
    url(r'getVariables', views.GetVariables.as_view()),
    url(r'templates', views.BasicListTemplates.as_view()),
    url(r'a2j-translator/translate', views.a2jTranslate.as_view()),
]
