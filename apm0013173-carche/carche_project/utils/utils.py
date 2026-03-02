import logging

from re import compile, sub
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_tracking.mixins import LoggingMixin


_logger = logging.getLogger(__name__)


def cleanhtml(raw_html):
    cleanr = compile('<.*?>')
    return sub(cleanr, '', raw_html)
