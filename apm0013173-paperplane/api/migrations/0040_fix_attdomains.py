from django.db import migrations


def seed(apps, schema_editor):
    model = apps.get_model('api', 'AttDomainsModel')
    model.objects.filter(id=19, name="cci.att.com").delete()

    items = model.objects.filter(id__gt=18)
    for item in items:
        item.id -= 1
        item.save()
    model.objects.filter(id__gt=22).delete()


class Migration(migrations.Migration):
    dependencies = [
        ('api', '0039_seed_botauthheader'),
    ]
    operations = [migrations.RunPython(seed)]
