from django.db import migrations


def seed(apps, schema_editor):
    evttypemodel = apps.get_model('api', 'EventTypeModel')
    evttypemodel.objects.create(
        id=1, name="calendar-event",
        description="A standard .ics calendar event"
    )


class Migration(migrations.Migration):
    dependencies = [
        ('api', '0050_eventtypemodel'),
    ]
    operations = [migrations.RunPython(seed)]
