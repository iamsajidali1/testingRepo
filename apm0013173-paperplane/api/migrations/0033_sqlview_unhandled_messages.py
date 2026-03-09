import sys
from os import environ
from textwrap import dedent
from django.db import migrations


class Migration(migrations.Migration):
    """
    Add view for all messages where the message type has handled flag zero.
    """

    view_name = 'unhandled_messages'

    dependencies = [
        ('api', '0032_update_leportal_messagetype'),
    ]

    sql = dedent(f'''
        CREATE OR REPLACE VIEW {view_name} AS SELECT
            *
        FROM messages
        WHERE type_id IN (
            SELECT id FROM message_type WHERE handle = 0
        );
    ''')
    if "test" in sys.argv or environ.get("ENV", "").lower() == "unittest":
        sql = sql.replace(" OR REPLACE", "")

    operations = [
        migrations.RunSQL(f'DROP VIEW IF EXISTS {view_name}'),
        migrations.RunSQL(sql)
    ]
