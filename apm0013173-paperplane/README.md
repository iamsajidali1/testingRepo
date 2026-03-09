# Paperplane

Notification service.

## Register

Go to http://URL/register and fill out these fields:

- app_name     -> name of your application
- email        -> your email
- backup_email -> email of your peer or manager who can backup you

You'll receive back a ``token`` that you'll need to use in the APIs
via HTTP header like this: ``Authorization: Token <value>``.
