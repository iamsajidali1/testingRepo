from django.db import migrations

# Define constants for repeated literals
DCAE_DPD_DESCRIPTION = (
    "DCAE / DPD (https://wiki.web.att.com/display/DPD, "
    "https://wiki.web.att.com/pages/viewpage.action?pageId=535015552)"
)
AZURE_NETWORK_CLOUD_DESCRIPTION = "Azure / Network Cloud"

def seed(apps, schema_editor):
    attdommod = apps.get_model('api', 'AttDomainsModel')
    attdommod.objects.bulk_create([
        attdommod(id=1, name="intl.att.com", description="primary"),
        attdommod(id=2, name="us.att.com", description="primary"),
        attdommod(id=3, name="emea.att.com", description="primary"),
        attdommod(id=4, name="americas.att.com", description="primary"),
        attdommod(id=5, name="ap.att.com", description="primary"),
        attdommod(id=6, name="next.att.com", description="primary"),
        attdommod(id=7, name="itservices.sbc.com", description="primary"),
        attdommod(id=8, name="att.com", description="primary"),
        attdommod(id=9, name="labs.att.com", description="primary"),
        attdommod(id=10, name="frd.directv.com", description="primary"),
        attdommod(
            id=11, name="mx.att.com", description=(
                "Cisco (https://wiki.web.att.com/display"
                "/WebEx/Cisco+Provisioning+Requests)"
            )
        ),
        attdommod(
            id=12, name="alascom.att.com", description=(
                "Cisco (https://wiki.web.att.com/display"
                "/WebEx/Cisco+Provisioning+Requests)"
            )
        ),
        attdommod(id=13, name="mt.att.com", description="Middletown (US)"),
        attdommod(id=14, name="oss.att.com", description="Middletown (US)"),
        attdommod(
            id=15, name="research.att.com", description=DCAE_DPD_DESCRIPTION
        ),
        attdommod(
            id=16, name="cci.att.com", description=DCAE_DPD_DESCRIPTION
        ),
        attdommod(
            id=17, name="cip.att.com", description=DCAE_DPD_DESCRIPTION
        ),
        attdommod(
            id=18, name="tci.att.com", description=AZURE_NETWORK_CLOUD_DESCRIPTION
        ),
        attdommod(
            id=19, name="cci.att.com", description=AZURE_NETWORK_CLOUD_DESCRIPTION
        ),
        attdommod(
            id=20, name="iplabs.att.com", description=AZURE_NETWORK_CLOUD_DESCRIPTION
        ),
        attdommod(
            id=21, name="aldc.att.com", description=AZURE_NETWORK_CLOUD_DESCRIPTION
        ),
        attdommod(id=22, name="it.att.com", description="services"),
        attdommod(id=23, name="vci.att.com", description="services")
    ])


class Migration(migrations.Migration):
    dependencies = [
        ('api', '0021_auto_20191014_1320'),
    ]
    operations = [migrations.RunPython(seed)]
