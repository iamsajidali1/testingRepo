# Onboarding

## New application

* Check the latest version displayed in the bubble on the top of the page
* Find the ``/register`` API with the latest version prefix (e.g. ``/v2/register``)
* Fill the application details and emails (required fields)

  * App name will be displayed in your messages, choose wisely!
  * Use different emails for email and backup email fields so we can contact you if something goes wrong.

* Store the token from the registering API securely as you'll be required to provide it in each HTTP request.

## Permissions

Paperplane is guarded with [AAF](https://aaf.it.att.com) (via LGW) and also uses token-based authorization to properly identify what APIs your application uses.

To get a permission for Paperplane in AAF write an email to the application contact either on this page or in the [MOTS catalogue](http://ebiz.sbc.com/mots/detail.cfm?appl_id=30344).

## Authorization

* ``Authorization`` header with Basic auth containing either AAF mechID or Global Login user (``attuid@csp.att.com``) in a base64-encoded format
* ``X-Authorization`` header with Token auth containing the token provided by the registration API.

## Sending messages

To send a message always use the latest available API with this pattern: ``/v*/message``. Check the required fields in the Swagger API documentation as well as other available use-cases.

## Sending events

To send an event you first need to create it via the ``/v*/event`` API, then store the event's ``uid`` and provide it later to the ``/v*/message`` API as a parameter.

Notes:

* In Outlook client the event name (summary) and description are ignored and email subject and body are used instead.
* Outlook ignores the RFC standard to such extent it tries to tell you the datetime is adjusted from UTC timezone. That's incorrect and the time is adjusted in a standard way by the ``timezone`` field.

## Subscribe to app notifications

To subscribe to an application announcements first create an account via ``/v*/subscribe/register`` and then check the categories each announcement can take in ``/v*/subscribe/types``. Once you know the IDs of the categories, you can check the IDs for the application you want to subscribe to at ``/v*/application`` and use its ID in the request body.

For example, this is a subscription to an app with ID 16 with a DEBUG category for the user with ID 57:

```
{
    "app": 16,
    "type": 1,
    "user": 57
}
```
