from django.db import migrations


def seed(apps, schema_editor):
    msgtypemodel = apps.get_model('api', 'MessageTypeModel')
    msgtypemodel.objects.create(
        id=7, name="q-chatbot-message",
        description="Q ChatBot 1-to-1 message."
    )


class Migration(migrations.Migration):
    dependencies = [
        ('api', '0043_email_notify_fields'),
    ]
    operations = [migrations.RunPython(seed)]
