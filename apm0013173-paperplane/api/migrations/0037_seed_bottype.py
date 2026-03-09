from django.db import migrations


def seed(apps, schema_editor):
    model = apps.get_model('api', 'BotTypeModel')
    model.objects.bulk_create([model(
        id=1, name="q-bot",
        description="AT&T Q messenger bot."
    ), model(
        id=2, name="webex-bot",
        description="Cisco Webex Teams bot."
    )])


class Migration(migrations.Migration):
    dependencies = [
        ('api', '0036_bottypemodel'),
    ]
    operations = [migrations.RunPython(seed)]
