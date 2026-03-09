from django.apps import apps
from django.db import migrations, models
from django.db.models import F


def purge(apps, schema_editor):
    typemodel = apps.get_model('api', 'MessageTypeModel')
    types = typemodel.objects.all()
    types = [item.name for item in types]

    msgmodel = apps.get_model('api', 'MessageModel')
    msgmodel.objects.exclude(type__in=types).delete()


class Migration(migrations.Migration):
    dependencies = [
        ('api', '0016_convert_char_to_fk_messagetype')
    ]

    operations = [
        migrations.RunPython(purge)
    ]
