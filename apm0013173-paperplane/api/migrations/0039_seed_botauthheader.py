from django.db import migrations


def seed(apps, schema_editor):
    botmodel = apps.get_model('api', 'BotTypeModel')
    model = apps.get_model('api', 'BotAuthHeaderModel')

    model.objects.bulk_create([model(
        id=1,
        type=botmodel.objects.get(name="q-bot"),
        header="X-Bot-Type",
        description="Specifies what bot should be used"
    ), model(
        id=2,
        type=botmodel.objects.get(name="q-bot"),
        header="X-Bot-Username",
        description="Q Bot username."
    ), model(
        id=3,
        type=botmodel.objects.get(name="q-bot"),
        header="X-Bot-Password",
        description="Q Bot password."
    ), model(
        id=4,
        type=botmodel.objects.get(name="webex-bot"),
        header="X-Bot-Type",
        description="Specifies what bot should be used"
    ), model(
        id=5,
        type=botmodel.objects.get(name="webex-bot"),
        header="X-Bot-Token",
        description="Token for a Cisco Webex Teams bot."
    )])


class Migration(migrations.Migration):
    dependencies = [
        ('api', '0038_botauthheadermodel'),
    ]
    operations = [migrations.RunPython(seed)]
