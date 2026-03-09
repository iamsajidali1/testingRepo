import json
from os import environ
from ast import literal_eval
from base64 import b64decode
from traceback import print_exc
import ssl
from smtplib import (
    SMTP, SMTPAuthenticationError, SMTPConnectError, SMTPException, SMTPHeloError, SMTPRecipientsRefused, SMTPSenderRefused,
    SMTPDataError, SMTPNotSupportedError
)
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from email.encoders import encode_base64
from datetime import datetime, timezone
from functools import lru_cache
from pprint import pformat

import requests as req

from dateutil import tz
from django.shortcuts import get_object_or_404
from pp_application.settings import (
    SMTP_URL, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, PROXY, WEBEX_API_URL, WEBEX_ATT_ORG,
    DEFAULT_FROM_EMAIL, ENV, ON_AZURE
)
from ics import Calendar, Event, Organizer
from ics.grammar.parse import ContentLine
from api import models  # import only 'models' otherwise circular import!


def notify_new_registration(app_data: dict):
    """
    Notify administrator about a new registration, forward to the new user.
    """
    try:
        app = models.ApplicationModel.objects.get(id=app_data["id"])
        email = models.MessageTypeModel.objects.get(name="email")
        # first ping admin about new user
        new_message(models.MessageModel(
            type=email, to=["ms639x@att.com"], app=app, body=pformat({
                key: val for key, val in app_data.items() if key != "token"
            }), subject=f"[Paperplane] [ADMIN] New user in {ENV}"
        ))

        # then send credentials to user
        new_message(models.MessageModel(
            type=email, to=[app_data["email"]], app=app, body=pformat(
                dict(app_data.items())
            ), subject=f"[Paperplane] New user in {ENV}"
        ))
    except Exception:  # pylint: disable=broad-except
        print_exc()


def check_planned_messages():
    """
    Go through all of the messages that are not yet processed and have non-NULL
    time values (i.e. scheduled ones), check with current time and trigger
    if there is a match between the times.
    """
    messages = models.MessageModel.objects.filter(
        time__isnull=False, processed=0
    )

    print(f"messages: {len(messages)}")
    for msg in messages:
        new_message(instance=msg)


@lru_cache(maxsize=128)
def get_webex_email(webex_email: str, token: str) -> str:
    result = "{}"

    resp = req.get(
        url=f"{WEBEX_API_URL}/people",
        params=dict(
            email=webex_email, orgId=WEBEX_ATT_ORG
        ),
        proxies={} if ON_AZURE else PROXY,
        headers={
            "Authorization": f"Bearer {token}"
        }
    )

    print(resp.status_code, resp.content)
    if resp.status_code != 200:
        return result
    return resp.text


@lru_cache(maxsize=1)
def fetch_raw_att_email_domains() -> list:
    # pull all and bake as list() to prevent DB calls
    return list(models.AttDomainsModel.objects.all().values())


@lru_cache(maxsize=1)
def fetch_att_email_domains() -> list:
    return [item["name"] for item in fetch_raw_att_email_domains()]


@lru_cache(maxsize=32)
def get_msg_type_id(name: str) -> int:
    return models.MessageTypeModel.objects.get(name=name).id


def webex_email_lookup(attuid: str, options: dict = {}):
    token = environ.get('WEBEXBOT_TOKEN', '')
    if options.get("bot_type") == "webex-bot":
        token = options.get("bot_token")

    result = None
    domains = fetch_att_email_domains()

    for domain in domains:
        print(f"{attuid}@{domain}")
        resp = get_webex_email(f"{attuid}@{domain}", token=token)
        data = json.loads(resp)
        print(f"data: {data!r}")
        if data and data["items"]:
            result = data["items"][0]["emails"][0]
            break
    return result


def all_att_emails(emails: list) -> bool:
    domains = fetch_att_email_domains()
    all_emails = [
        item for item in emails if len(item) >= 3
        # remove one-character, empty string, etc
        # expects at least 3 chars e.e. c@c
    ]

    result = False
    try:
        partial = [rec.split("@")[1] in domains for rec in all_emails]
        result = all(partial) if partial != [] else False
    except IndexError as ierr:
        # missing @, don't care, mark as non-att mail
        print(ierr, all_emails)
    finally:
        return result


def send_email_non_att_recipients(**kwargs):
    return send_email(
        subject="Paperplane: Error while sending a message!",
        reply_to=DEFAULT_FROM_EMAIL, **kwargs
    )


def send_email(
        display_name: str, from_email: str, to_emails: list, subject: str,
        body: str, message_id: int = None, reply_to: str = "",
        bcc_emails: list = [], notify_delivered: bool = False,
        notify_read: bool = False, event_uid: str = None,
        headers: dict = {}, options: dict = {}, **__
):
    # headers: https://tools.ietf.org/html/rfc4021#page-7
    with SMTP(host=SMTP_URL, port=SMTP_PORT) as smtp:
         # Create an SSL Context to support TLS 1.2
        context = ssl.SSLContext(ssl.PROTOCOL_TLSv1_2)
    
        print(f"Connecting to SMTP server: {SMTP_URL}:{SMTP_PORT}")
        smtp.ehlo()
        smtp.starttls(context=context)
        smtp.ehlo()
        try:
            print(f"Attempting to login to SMTP server for user: {SMTP_USER}")
            smtp.login(user=SMTP_USER, password=SMTP_PASSWORD)
            print("Login successful")
        except SMTPNotSupportedError:
            print("SMTP AUTH extension not supported by server. Skipping authentication.")
        except Exception as e:
            print(f"Failed to login to SMTP server: {e}")
            return (500, f"Failed to login to SMTP server: {e}")
        
        msg_type = "plain"
        if "<html>" in body:
            msg_type = "html"

        mail = MIMEMultipart("alternative")
        mail.attach(MIMEText(body, msg_type))

        mail["Subject"] = subject if subject else display_name
        mail["From"] = f'"{display_name}" <{from_email}>'
        # Flatten to_emails if nested (e.g., ['["ms639x@exo.att.com"]'])
        def flatten(lst):
            # If the list is a single string that looks like a list, parse it
            if len(lst) == 1 and isinstance(lst[0], str) and lst[0].startswith("["):
                import json
                try:
                    inner = json.loads(lst[0])
                    if isinstance(inner, list):
                        return inner
                except Exception:
                    pass
            # If the list is nested, flatten it
            flat = []
            for item in lst:
                if isinstance(item, list):
                    flat.extend(item)
                else:
                    flat.append(item)
            return flat

        to_emails = flatten(to_emails)
        mail["To"] = ",".join(to_emails)

        if bcc_emails:
            mail["Bcc"] = ",".join(bcc_emails)
        if reply_to:
            mail["Reply-To"] = reply_to
        if notify_delivered:
            mail["Return-Receipt-To"] = reply_to or from_email
        if notify_read:
            mail["Disposition-Notification-To"] = reply_to or from_email

        attachments = []
        if message_id:
            attachments = models.AttachmentModel.objects.filter(
                message=models.MessageModel.objects.get(id=message_id)
            )

        for inst in attachments:
            try:
                file = MIMEApplication(b64decode(inst.binary), Name=inst.name)
                file["Content-Disposition"] = (
                    f'attachment; filename="{inst.name}"'
                )
                mail.attach(file)
            except Exception:  # pylint: disable=broad-except
                print_exc()

        for header, hvalue in headers.items():
            mail[header] = hvalue

        if event_uid:
            orgz = Organizer(email=from_email)
            print(f"Organizer: {orgz!r}")
            evt_mim = create_calendar(
                uid=event_uid, attendees=to_emails, organizer=orgz
            )
            # attach only if new/updated/cancelled
            if evt_mim:
                mail.attach(evt_mim)

        for mime in options.get("mimes", []):
            mail.attach(mime)

        # handle SMTP errors properly
        resp = (None, None)
        try:
            print("Sending email")
            print("SMTP ENVELOPE:")
            print(f"From: {from_email}")
            print(f"To: {to_emails}")
            print(f"Bcc: {bcc_emails}")
            print(f"Reply-To: {reply_to}")
            print(f"Subject: {subject}")
            print(f"Body: {body}")
            print(f"Headers: {headers}")
            print(f"Notify Delivered: {notify_delivered}")
            print(f"Notify Read: {notify_read}")
            print(f"Attachments: {[getattr(a, 'name', None) for a in attachments]}")
            print("MAIL MIME:")
            print(mail)
            smtp.send_message(mail)
            resp = (250, "Message sent successfully")
            print("Email sent successfully")
        except SMTPRecipientsRefused as exc:
            resp = (550, " | ".join([f"{k}: {v}" for k, v in exc.recipients.items()]))
            print(f"SMTPRecipientsRefused: {exc}")
        except SMTPSenderRefused as exc:
            resp = (exc.smtp_code, exc.smtp_error.decode())
            print(f"SMTPSenderRefused: {exc}")
        except SMTPDataError as exc:
            resp = (exc.smtp_code, exc.smtp_error.decode())
            print(f"SMTPDataError: {exc}")
        except SMTPNotSupportedError as exc:
            resp = (471, str(exc))
            print(f"SMTPNotSupportedError: {exc}")
        except SMTPAuthenticationError as exc:
            resp = (exc.smtp_code, exc.smtp_error.decode())
            print(f"SMTPAuthenticationError: {exc}")
        except SMTPConnectError as exc:
            resp = (exc.smtp_code, exc.smtp_error.decode())
            print(f"SMTPConnectError: {exc}")
        except SMTPHeloError as exc:
            resp = (exc.smtp_code, exc.smtp_error.decode())
            print(f"SMTPHeloError: {exc}")
        except SMTPException as exc:
            resp = (500, str(exc))
            print(f"SMTPException: {exc}")
        except Exception as exc:
            resp = (500, str(exc))
            print(f"Unexpected error: {exc}")
        finally:
            print(f"Returning response: {resp}")
            return resp


def create_calendar(uid: str, organizer: str, attendees: list):
    evt = get_object_or_404(models.EventModel, uid=uid)

    # ignore already sent data
    if evt.processed:
        return None

    # bump sequence to tell client about an update order
    if evt.rescheduled or evt.cancelled:
        evt.sequence += 1

    cancel = evt.cancelled

    # constants for ics
    method = "REQUEST"
    status = "CONFIRMED"
    if cancel:
        method = status = "CANCEL"

    # time
    zone = tz.gettz(evt.timezone)
    begin = datetime.fromisoformat(evt.begin).replace(tzinfo=zone)
    end = datetime.fromisoformat(evt.end).replace(tzinfo=zone)

    # calendar + event create
    ics = Calendar()
    ics.method = method
    event = Event()
    event.organizer = organizer

    # people
    for attendee in attendees:
        event.add_attendee(attendee)

    # content
    event.description = evt.description
    event.uid = evt.uid
    event.begin = begin
    event.end = end
    event.extra += [
        ContentLine(name="STATUS", value=status),
        ContentLine(name="SEQUENCE", value=str(evt.sequence)),
        ContentLine(
            name="X-MICROSOFT-CDO-APPT-SEQUENCE", value=str(evt.sequence)
        ),
        ContentLine(name="X-MICROSOFT-CDO-BUSYSTATUS", value="TENTATIVE"),
        ContentLine(name="X-MICROSOFT-CDO-INTENDEDSTATUS", value="BUSY"),
        ContentLine(name="X-MICROSOFT-CDO-ALLDAYEVENT", value="FALSE"),
        ContentLine(name="X-MICROSOFT-CDO-IMPORTANCE", value="1"),
        ContentLine(name="X-MICROSOFT-CDO-INSTTYPE", value="0"),
        ContentLine(name="X-MICROSOFT-DONOTFORWARDMEETING", value="FALSE"),
        ContentLine(name="X-MICROSOFT-DISALLOW-COUNTER", value="FALSE"),
        ContentLine(name="SUMMARY", value=evt.name)
    ]
    ics.events.add(event)

    # finish and create attachment
    filename = "invite.ics"
    mim = MIMEBase('text', "calendar", method=ics.method, name=filename)
    data = str(event).replace("ENV:VEVENT", (
        "BEGIN:VALARM\n"
        "ACTION:DISPLAY\n"
        "DESCRIPTION:REMINDER\n"
        "TRIGGER;RELATED=START:-PT15M\n"
        "END:VALARM\n"
        "END:VEVENT\n"
    ))
    mim.set_payload(
        "BEGIN:VCALENDAR\n"
        f"METHOD:{method}\n"
        "VERSION:2.0\n"
        "PRODID:Microsoft Exchange Server 2010\n"
        f"{data}\n"
        "END:VCALENDAR\n"
    )

    encode_base64(mim)
    mim.add_header('Content-Description', filename)
    mim.add_header("Content-class", "urn:content-classes:calendarmessage")
    mim.add_header("Filename", filename)
    mim.add_header("Path", filename)
    print(str(mim))

    # send email
    evt.rescheduled = False  # trigger-value, always reset
    evt.processed = True
    evt.save()
    return mim

def send_broadcast(
        display_name: str, app, from_email: str,
        subscription_types: list, subject: str, body: str,
        reply_to: str = "", message_id: int = None,
        notify_delivered: bool = False, notify_read: bool = False,
        options: dict = {}
):
    to_list = models.SubscriberModel.objects.filter(
        app=app, type__in=models.SubscriptionTypeModel.objects.filter(
            name__in=subscription_types
        )
    )
    to_list = [item.user.email for item in to_list]
    resp = send_email(
        from_email=from_email,
        to_emails=to_list,
        subject=subject,
        body=body,
        message_id=message_id,
        display_name=display_name,
        notify_delivered=notify_delivered,
        notify_read=notify_read,
        reply_to=reply_to,
        headers={
            "List-Help": "<https://paperplane.web.att.com> (Paperplane info)",
            "List-Unsubscribe": (
                "<mailto:ms639x@att.com?subject=Paperplane%20unsubscribe"
                "&body=unsubscribe>"
            ),
            "List-Post": "<https://paperplane.web.att.com> (Paperplane info)",
            "List-Owner": "<mailto:m16735-ap@mta01.att-mail.com> (SDdevops RM)"
        },
        options=options
    )
    return resp


def send_webex_message(
        to_ids: list, message: str, options: dict = {}, **__
):
    token = environ.get('WEBEXBOT_TOKEN', '')
    if options.get("bot_type") == "webex-bot":
        token = options.get("bot_token")

    responses = []

    for item in to_ids:
        attuid = item.split("@")[0]
        email = webex_email_lookup(attuid, options=options)

        if not email:
            print(f"Could not retrieve email for {attuid}")
            continue

        responses.append(req.post(
            url=f"{WEBEX_API_URL}/messages",
            proxies={} if ON_AZURE else PROXY,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}"
            },
            data=json.dumps({
                "toPersonEmail": email,
                "text": message
            })
        ))
    return (
        [item.status_code for item in responses],
        [getattr(item, "content", None) for item in responses]
    )


def send_webex_room_message(
        to_ids: list, message: str, options: dict = {}, **__
):
    token = environ.get('WEBEXBOT_TOKEN', '')
    if options.get("bot_type") == "webex-bot":
        token = options.get("bot_token")

    responses = []

    for item in to_ids:
        responses.append(req.post(
            url=f"{WEBEX_API_URL}/messages",
            proxies={} if ON_AZURE else PROXY,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}"
            },
            data=json.dumps({
                "roomId": item,
                "text": message
            })
        ))
    return (
        [item.status_code for item in responses],
        [getattr(item, "content", None) for item in responses]
    )


def new_message(instance, options: dict = {}):
    print("Called new_message")
    if vars(instance).get("skip_signals", False):
        print("Skipping signal!")
        return
    if instance.processed:
        return

    time = None
    if isinstance(instance.time, str):
        time = datetime.fromisoformat(instance.time)
    else:
        time = instance.time
    print(f"Time: {time}")

    if time is not None and time > datetime.now(timezone.utc):
        print("Will schedule later")
        return

    import json
    to_list = None
    if isinstance(instance.to, str):
        try:
            to_list = json.loads(instance.to)
        except Exception:
            to_list = []
    else:
        to_list = instance.to

    # Flatten any nested list structure (e.g., [["email"]], [[["email"]]], etc.)
    def flatten_email_list(lst):
        while isinstance(lst, list) and len(lst) == 1 and isinstance(lst[0], list):
            lst = lst[0]
        return lst
    to_list = flatten_email_list(to_list)
    print(f"TO: {to_list}")

    if isinstance(instance.bcc, str):
        try:
            bcc_list = json.loads(instance.bcc)
        except Exception:
            bcc_list = []
    else:
        bcc_list = instance.bcc
    print(f"BCC: {bcc_list}")

    to = "\n".join(to_list)  # pylint: disable=invalid-name
    print(
        f"""
        Sending message to {instance.type} now:

        Header:
        from: {instance.app}
        to: {to}
        time: {instance.time}

        Body: {instance.body}
        """
    )

    resp = (None, None)
    print(instance.app.from_email)
    print(instance.app.email)
    if instance.type.id == get_msg_type_id("email"):
        resp = send_email(
            to_emails=to_list,
            reply_to=instance.app.reply_to_email or instance.app.email,
            bcc_emails=bcc_list,
            subject=instance.subject,
            body=instance.body,
            from_email=instance.app.from_email or instance.app.email,
            display_name=instance.app.app_name,
            message_id=instance.id,
            notify_delivered=instance.notify_delivered,
            notify_read=instance.notify_read,
            event_uid=instance.event_uid,
            event_app=instance.app,
            options=options
        )

    elif instance.type.id == get_msg_type_id("broadcast"):
        resp = send_broadcast(
            display_name=instance.app.app_name,
            app=instance.app,
            subscription_types=to_list,
            subject=instance.app.app_name,
            body=instance.body,
            from_email=instance.app.from_email or instance.app.email,
            reply_to=instance.app.reply_to_email or instance.app.email,
            message_id=instance.id,
            notify_delivered=instance.notify_delivered,
            notify_read=instance.notify_read,
            options=options
        )

    elif instance.type.id == get_msg_type_id("webex-teams-message"):
        resp = send_webex_message(
            to_ids=to_list, message=instance.body,
            message_id=instance.id, options=options
        )
    elif instance.type.id == get_msg_type_id("webex-teams-room-message"):
        resp = send_webex_room_message(
            to_ids=to_list, message=instance.body,
            message_id=instance.id, options=options
        )
    print("resp:", resp)

    instance.processed = True
    instance.save()