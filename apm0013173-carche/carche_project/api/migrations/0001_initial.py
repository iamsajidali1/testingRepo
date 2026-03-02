# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Template',
            fields=[
                ('id', models.AutoField(verbose_name='ID', primary_key=True,
                                        serialize=False, auto_created=True)),
                ('name', models.CharField(max_length=128)),
                ('contractid', models.CharField(max_length=30, blank=True)),
                ('services', models.CharField(max_length=30, blank=True)),
                ('path', models.CharField(max_length=128)),
                ('body', models.TextField()),
                ('version', models.IntegerField(default=1)),
                ('deviceModel', models.CharField(max_length=128, blank=True)),
                ('dateCreated', models.DateTimeField(editable=False)),
            ],
        ),
    ]
