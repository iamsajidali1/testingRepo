from django.db import migrations


def seed(apps, schema_editor):
    msgtypemodel = apps.get_model('api', 'MessageTypeModel')
    msgtypemodel.objects.create(
        id=6, name="webex-teams-room-message",
        description="Cisco Webex Teams room message."
    )


class Migration(migrations.Migration):
    dependencies = [
        ('api', '0033_sqlview_unhandled_messages'),
    ]
    operations = [migrations.RunPython(seed)]
