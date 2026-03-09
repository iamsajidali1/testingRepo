from django.db import migrations


def seed(apps, schema_editor):
    msgtypemodel = apps.get_model('api', 'MessageTypeModel')
    msgtypemodel.objects.filter(id=5).update(
        handle=False
    )


class Migration(migrations.Migration):
    dependencies = [
        ('api', '0031_messagetypemodel_handle'),
    ]
    operations = [migrations.RunPython(seed)]
