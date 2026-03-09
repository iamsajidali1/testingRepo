from django.db import migrations


def seed(apps, schema_editor):
    msgtypemodel = apps.get_model('api', 'MessageTypeModel')
    msgtypemodel.objects.bulk_create([
        msgtypemodel(
            id=1, name="qmessage", description="Standard 1-to-1 Q message."
        ),
        msgtypemodel(
            id=2, name="email", description=(
                "Plaintext E-mail message auto-supporting HTML code if it"
                " contains <html> tag."
            )
        ),
        msgtypemodel(
            id=3, name="broadcast", description=(
                "Broadcasting message to all subscribers for a specific"
                " subscription type."
            )
        )
    ])


class Migration(migrations.Migration):
    dependencies = [
        ('api', '0011_messagetypemodel'),
    ]
    operations = [migrations.RunPython(seed)]
