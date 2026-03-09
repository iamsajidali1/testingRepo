"""
Instructions to use:

$ export AAF_PASS='my global logon password'  # don't show while presenting ;)
$ python3.7 -m virtualenv paperplane-migration --no-download
$ source ./paperplane-migration/bin/activate
$ https_proxy=http://pxyapp.proxy.att.com:8080 pip install -U pip requests
$ python main.py

Paperplane environment (dev/test/perf/web/azure): azure
Paperplane token: <token>
AAF mechID@namespace: my-attuid@csp.att.com

"""

import sys
import os

try:
    import requests
except ImportError:
    print("pip install requests")
    sys.exit(1)

from base64 import b64encode as b64

MESSAGE_BODY = "Paperplane message testing"

attuid = input("Attuid of the recipient: ")
env = input("Paperplane environment (dev/test/perf/web/azure): ") or "dev"
token = input("Paperplane token: ")
auth_user = input("AAF mechID@namespace: ") or "m16735@bok.att.com"
auth_password = os.environ.get("AAF_PASS") or input(
    "AAF mechID password or Global Logon password: "
)
auth = f"{auth_user}:{auth_password}".encode("utf-8")
proxies = {
    "https": "http://pxyapp.proxy.att.com:8080", "no_proxy": ".att.com"
}

print("Comment out proxies = {} if the hostname cannot be reached")
proxies = {}

base_url = f"https://paperplane.{env}.att.com"
if env == "azure":
    base_url = input(
        "Base URL for API on Azure (https://paperplane.dev.att.com or like): "
    )

headers = {
    "X-Authorization": f"Token {token}"
}

# if AAF feature is present in Azure, include this to headers{}
if env != "azure":
    headers["Authorization"] = f"Basic {b64(auth).decode('utf-8')}"


def main():
    print("mail")
    mail()
    print("attachment")
    mail_attachment()
    print("q")
    q()
    print("q chatbot")
    q_chatbot()
    print("webex")
    webex()
    print("calendar event")
    calendar_event()


def q():
    resp = requests.post(
        f"{base_url}/api/v2/message",
        headers=headers,
        json={
            "type": "qmessage", "body": MESSAGE_BODY,
            "to": [attuid], "subject": f"{env}: Hello message"
        },
        proxies=proxies         # Enabled server certificate validation by removing verify=False from all requests.post calls.
    )
    assert resp.status_code == 201, (resp.status_code, resp.content)

def q_chatbot():
    resp = requests.post(
        f"{base_url}/api/v2/message",
        headers=headers,
        json={
            "type": "q-chatbot-message", "body": MESSAGE_BODY,
            "to": [attuid], "subject": f"{env}: Hello message"
        },
        proxies=proxies     #removing verify=False
    )
    assert resp.status_code == 201, (resp.status_code, resp.content)


def webex():
    resp = requests.post(
        f"{base_url}/api/v2/message",
        headers=headers,
        json={
            "type": "webex-teams-message",
            "body": MESSAGE_BODY,
            "to": [f"{attuid}@att.com"], "subject": f"{env}: Hello message"
        },
        proxies=proxies     #removing verify=False
    )
    assert resp.status_code == 201, (resp.status_code, resp.content)


def mail():
    resp = requests.post(
        f"{base_url}/api/v2/message",
        headers=headers,
        json={
            "type": "email", "body": MESSAGE_BODY,
            "to": [f"{attuid}@att.com"], "subject": f"{env}: Hello message"
        },
        proxies=proxies     #removing verify=False
    )
    assert resp.status_code == 201, (resp.status_code, resp.content)


def mail_attachment():
    resp = requests.post(
        f"{base_url}/api/v2/message",
        headers=headers,
        json={
            "type": "email", "body": "Paperplane attachment testing",
            "to": [f"{attuid}@att.com"],
            "subject": f"{env}: It should be attached :)",
            "attachments": {"test.txt": "c29tZSB0ZXN0IHRleHQK"}
        },
        proxies=proxies     #removing verify=False
    )
    assert resp.status_code == 201, (resp.status_code, resp.content)


def calendar_event():
    evt = requests.post(
        f"{base_url}/api/v2/event",
        headers=headers,
        json={
            "type": "calendar-event",
            "begin": "2030-04-09T16:00:00",
            "end": "2030-04-09T16:30:00",
            "timezone": "UTC+2"
        },
        proxies=proxies     #removing verify=False
    )
    assert evt.status_code == 201, (evt.status_code, evt.content)

    resp = requests.post(
        f"{base_url}/api/v2/message",
        headers=headers,
        json={
            "type": "email",
            "body": "email-body",
            "to": [
                f"{attuid}@att.com"
            ],
            "subject": "Email with test calendar event",
            "event_uid": evt.json()["uid"]
        },
        proxies=proxies     #removing verify=False
    )
    assert resp.status_code == 201, (resp.status_code, resp.content)


if __name__ == "__main__":
    main()
