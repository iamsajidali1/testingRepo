from django.db import migrations


def seed(apps, schema_editor):
    msgtypemodel = apps.get_model('api', 'MessageTypeModel')
    msgtypemodel.objects.create(
        id=8, name="calendar-event",
        description="A standard .ics calendar event"
    )


class Migration(migrations.Migration):
    dependencies = [
        ('api', '0045_seed_att_domains_external'),
    ]
    operations = [migrations.RunPython(seed)]
