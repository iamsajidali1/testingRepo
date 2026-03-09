from django.apps import apps
from django.db import migrations, models
from django.db.models import F


def convert(apps, schema_editor):
    typemodel = apps.get_model('api', 'MessageTypeModel')
    types = typemodel.objects.all()
    types = {item.name: item.id for item in types}

    msgmodel = apps.get_model('api', 'MessageModel')
    messages = {
        msgtype: msgmodel.objects.filter(type=msgtype)
        for msgtype in types
    }
    for msgtype, msgbulk in messages.items():
        msgbulk.update(new_type=types[msgtype])


class Migration(migrations.Migration):
    dependencies = [
        ('api', '0015_messagemodel_new_type')
    ]

    operations = [
        migrations.RunPython(convert)
    ]
