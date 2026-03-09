from django.db import migrations


def seed(apps, schema_editor):
    subtypemodel = apps.get_model('api', 'SubscriptionTypeModel')
    subtypemodel.objects.bulk_create([
        subtypemodel(
            id=1, name="DEBUG", description=(
                "Extended non-standard messages, useful for developers and"
                " not intended for public audience."
            )
        ),
        subtypemodel(
            id=2, name="INFO", description=(
                "Standard messages intended for public audience."
            )
        ),
        subtypemodel(
            id=3, name="WARNING", description=(
                "Warning messages, useful for notifying the audience about"
                " some past changes in the application, backwards incompatible"
                " changes or pending action items."
            )
        ),
        subtypemodel(
            id=4, name="ERROR", description=(
                "Error messages, useful for notifying the audience about"
                " unexpected downtimes or errors caused in the application"
                " e.g. during new version release, migrations, etc."
            )
        ),
        subtypemodel(
            id=5, name="CRITICAL", description=(
                "Critical messages, useful for notifying the audience about"
                " critical action items such as password changes, expiration"
                " dates, etc."
            )
        ),
        subtypemodel(
            id=6, name="MAINTENANCE", description=(
                "Maintenance messages, useful for notifying the audience about"
                " upcoming maintenance dates/hours and acions to do "
                "before/during/after migration."
            )
        )
    ])


class Migration(migrations.Migration):
    dependencies = [
        ('api', '0008_subscriptiontypemodel'),
    ]
    operations = [migrations.RunPython(seed)]
