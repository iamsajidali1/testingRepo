#!/usr/bin/env python
import django
import traceback
from os import environ
environ.setdefault('DJANGO_SETTINGS_MODULE', 'pp_application.settings')
django.setup()


def main():
    """
    Create superuser in case there is none.
    """

    user = environ.get('PP_ADMIN_USER', 'admin')
    passwd = environ.get('PP_ADMIN_PASS', 'admin')

    from django.contrib.auth import get_user_model
    user_model = get_user_model()
    try:
        user_model.objects.create_superuser(
            user, 'admin@localhost', passwd
        )
    except django.db.utils.IntegrityError as exc:
        exc_id, msg, *_ = exc.args
        if exc_id != 1062 or "admin" not in msg:
            traceback.print_exc()
        else:
            print("Admin found, OK")


if __name__ == '__main__':
    main()
