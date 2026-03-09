from django.db import migrations


def seed(apps, schema_editor):
    msgtypemodel = apps.get_model('api', 'MessageTypeModel')
    msgtypemodel.objects.create(
        id=5, name="leportal-notification",
        description="Remotely processable notification for LE Portal"
    )


class Migration(migrations.Migration):
    dependencies = [
        ('api', '0029_auto_20191127_0901'),
    ]
    operations = [migrations.RunPython(seed)]
