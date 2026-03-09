from django.db import migrations


def seed(apps, schema_editor):
    evttypemodel = apps.get_model('api', 'MessageTypeModel')
    evttypemodel.objects.get(id=8, name="calendar-event").delete()


class Migration(migrations.Migration):
    dependencies = [
        ('api', '0051_seed_eventtype_calendarevent'),
    ]
    operations = [migrations.RunPython(seed)]
