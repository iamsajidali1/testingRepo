# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='template',
            name='templateType',
            field=models.CharField(max_length=128, default='cArche'),
        ),
        migrations.AddField(
            model_name='template',
            name='vendorType',
            field=models.CharField(max_length=255, default='CISCO SYSTEMS'),
        ),
    ]
