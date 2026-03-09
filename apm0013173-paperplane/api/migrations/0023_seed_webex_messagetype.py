from django.db import migrations


def seed(apps, schema_editor):
    msgtypemodel = apps.get_model('api', 'MessageTypeModel')
    msgtypemodel.objects.create(
        id=4, name="webex-teams-message",
        description="Standard 1-to-1 Cisco Webex Teams message."
    )


class Migration(migrations.Migration):
    dependencies = [
        ('api', '0022_seed_att_domains'),
    ]
    operations = [migrations.RunPython(seed)]
