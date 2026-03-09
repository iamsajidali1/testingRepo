from django.db import migrations


def seed(apps, schema_editor):
    attdommod = apps.get_model('api', 'AttDomainsModel')
    attdommod.objects.bulk_create([
        attdommod(id=23, name="test.amcustomercare.att-mail.com", description=(
            "INAP external AT&T email domain provided by ji2748 (CSO)"
        )),
        attdommod(id=24, name="amcustomercare.att-mail.com", description=(
            "INAP external AT&T email domain provided by ji2748 (CSO)"
        ))
    ])


class Migration(migrations.Migration):
    dependencies = [
        ('api', '0044_seed_q_chatbot_messagetype'),
    ]
    operations = [migrations.RunPython(seed)]
