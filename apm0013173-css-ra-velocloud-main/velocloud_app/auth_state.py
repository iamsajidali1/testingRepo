"""Read existing user, token and signed-session records without Django.

Signing salts and backend names are persisted data-format identifiers.
"""
import base64
import datetime as dt
import hashlib
import hmac
import json
import secrets
import sqlite3
import string
import time
import zlib
from contextlib import closing
from dataclasses import dataclass
from email.utils import formatdate
from http.cookies import SimpleCookie
from pathlib import Path
import unicodedata

from velocloud_app import settings

REMOTE_BACKEND = 'django.contrib.auth.backends.RemoteUserBackend'
MODEL_BACKEND = 'django.contrib.auth.backends.ModelBackend'
SESSION_SALT = 'django.contrib.sessions.SessionStore'
USER_HASH_SALT = 'django.contrib.auth.models.AbstractBaseUser.get_session_auth_hash'
CHARS = string.ascii_letters + string.digits


class AuthenticationError(Exception):
    def __init__(self, detail):
        self.detail = detail


class SessionInterrupted(Exception):
    pass


@dataclass(repr=False)
class User:
    id: int | None = None
    username: str = ''
    password: str = ''
    email: str = ''
    is_active: bool = False

    @property
    def is_authenticated(self):
        return self.id is not None

    @property
    def pk(self):
        return self.id

    def get_username(self):
        return self.username

    def __str__(self):
        return self.username if self.is_authenticated else 'AnonymousUser'

    def __repr__(self):
        return '<User: ' + str(self) + '>'

    @property
    def is_anonymous(self):
        return not self.is_authenticated

    def get_session_auth_hash(self):
        return _salted_hmac(USER_HASH_SALT, self.password).hexdigest()


def _connection():
    connection = sqlite3.connect(settings.DATABASES['default']['NAME'], timeout=5)
    connection.row_factory = sqlite3.Row
    connection.execute('PRAGMA foreign_keys=ON')
    return connection


def _user(row):
    keys = ('id', 'username', 'password', 'email', 'is_active')
    return User(**{key: row[key] for key in keys}) if row else User()


def get_user(user_id=None, username=None):
    column, value = ('id', user_id) if username is None else ('username', username)
    with closing(_connection()) as database:
        return _user(database.execute(f'SELECT id, username, password, email, is_active FROM auth_user WHERE {column}=?', (value,)).fetchone())


def create_user(username, email='', password=None):
    username = unicodedata.normalize('NFKC', username)
    email = email.strip()
    if '@' in email:
        local, domain = email.rsplit('@', 1)
        email = local + '@' + domain.lower()
    salt = ''.join(secrets.choice(CHARS) for _ in range(22))
    encoded = ('!' + ''.join(secrets.choice(CHARS) for _ in range(40)) if password is None else
               'pbkdf2_sha256$1200000$' + salt + '$' + base64.b64encode(
                   hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 1_200_000)).decode())
    with closing(_connection()) as database, database:
        database.execute("INSERT INTO auth_user (password, last_login, is_superuser, username, first_name, last_name, email, is_staff, is_active, date_joined) VALUES (?, NULL, 0, ?, '', '', ?, 0, 1, ?)",
                         (encoded, username, email, dt.datetime.now(dt.timezone.utc).replace(tzinfo=None).isoformat(' ')))
    return get_user(username=username)


def initialize_database():
    """Bootstrap the original schema only for an empty database.

    Existing databases are checked, never altered or rebuilt.
    """
    with closing(_connection()) as database:
        tables = {row[0] for row in database.execute("SELECT name FROM sqlite_master WHERE type='table' AND name != 'sqlite_sequence'")}
        if tables:
            missing = {'auth_user', 'authtoken_token', 'django_session'} - tables
            if missing:
                raise RuntimeError('Existing database is missing authentication tables: ' + ', '.join(sorted(missing)))
            return False
        # The captured dump restores tables in lexical order. Foreign keys are
        # checked after all original tables/data exist, as with sqlite restore.
        database.execute('PRAGMA foreign_keys=OFF')
        database.executescript(Path(__file__).with_name('auth_schema.sql').read_text())
        if database.execute('PRAGMA foreign_key_check').fetchall():
            raise RuntimeError('Original authentication schema failed foreign key validation')
        database.execute('PRAGMA foreign_keys=ON')
        return True


def _salted_hmac(salt, value):
    key = hashlib.sha256((salt + settings.SECRET_KEY).encode()).digest()
    return hmac.new(key, value.encode(), hashlib.sha256)


def _b64(data):
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode()


def decode_session(value):
    try:
        signed, signature = value.rsplit(':', 1)
        expected = _b64(_salted_hmac(SESSION_SALT + 'signer', signed).digest())
        if not hmac.compare_digest(signature, expected):
            return {}
        encoded, timestamp = signed.rsplit(':', 1)
        alphabet = string.digits + string.ascii_uppercase + string.ascii_lowercase
        for char in timestamp.removeprefix('-'):
            alphabet.index(char)
        compressed = encoded.startswith('.')
        encoded = encoded.removeprefix('.')
        data = base64.urlsafe_b64decode(encoded + '=' * (-len(encoded) % 4))
        if compressed:
            data = zlib.decompress(data)
        return json.loads(data.decode('latin-1'))
    except (ValueError, TypeError, UnicodeError, zlib.error):
        return {}


def encode_session(data):
    raw = json.dumps(data, separators=(',', ':')).encode('latin-1')
    compressed = zlib.compress(raw)
    encoded = '.' + _b64(compressed) if len(compressed) < len(raw) - 1 else _b64(raw)
    value, number = '', int(time.time())
    alphabet = string.digits + string.ascii_uppercase + string.ascii_lowercase
    while number:
        number, digit = divmod(number, 62)
        value = alphabet[digit] + value
    signed = encoded + ':' + (value or '0')
    return signed + ':' + _b64(_salted_hmac(SESSION_SALT + 'signer', signed).digest())


class Session:
    def __init__(self, key):
        self.session_key = key if key and len(key) >= 8 else None
        self.data = {}
        self.modified = False
        if self.session_key:
            with closing(_connection()) as database:
                row = database.execute('SELECT session_data, expire_date FROM django_session WHERE session_key=?', (self.session_key,)).fetchone()
            if row and dt.datetime.fromisoformat(row['expire_date']).replace(tzinfo=dt.timezone.utc) > dt.datetime.now(dt.timezone.utc):
                self.data = decode_session(row['session_data'])
            else:
                self.session_key = None

    def get(self, key, default=None):
        return self.data.get(key, default)

    def flush(self):
        if self.session_key:
            with closing(_connection()) as database, database:
                database.execute('DELETE FROM django_session WHERE session_key=?', (self.session_key,))
        self.session_key, self.data, self.modified = None, {}, True

    def save(self):
        expiry = dt.datetime.now(dt.timezone.utc) + dt.timedelta(seconds=1_209_600)
        values = (encode_session(self.data), expiry.replace(tzinfo=None).isoformat(' '))
        with closing(_connection()) as database, database:
            if self.session_key:
                changed = database.execute('UPDATE django_session SET session_data=?, expire_date=? WHERE session_key=?',
                                           (*values, self.session_key)).rowcount
                if not changed:
                    raise SessionInterrupted("The request's session was deleted before the request completed.")
            else:
                while True:
                    key = ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(32))
                    try:
                        database.execute('INSERT INTO django_session (session_key, session_data, expire_date) VALUES (?, ?, ?)', (key, *values))
                    except sqlite3.IntegrityError:
                        continue
                    self.session_key = key
                    break


def start_request(request):
    request.session = Session(request.COOKIES.get('sessionid'))
    request.user = User()
    backend = request.session.get('_auth_user_backend')
    user_id = request.session.get('_auth_user_id')
    if user_id is not None and backend in (REMOTE_BACKEND, MODEL_BACKEND):
        user = get_user(user_id=int(user_id))
        if user.is_authenticated and user.is_active:
            signature = request.session.get('_auth_user_hash', '')
            if hmac.compare_digest(str(signature).encode(), user.get_session_auth_hash().encode()):
                request.user = user
            else:
                request.session.flush()
    remote_user = request.META.get('REMOTE_USER')
    if not remote_user:
        if request.user.is_authenticated and backend == REMOTE_BACKEND:
            request.session.flush()
            request.user = User()
    elif not request.user.is_authenticated or request.user.username != remote_user:
        if request.user.is_authenticated and backend == REMOTE_BACKEND:
            request.session.flush()
        user = get_user(username=remote_user)
        if not user.is_authenticated:
            user = create_user(remote_user)
        if user.is_active:
            previous = dict(request.session.data)
            if '_auth_user_id' in previous:
                previous = {}
            request.session.flush()
            request.user = user
            request.session.data = {**previous, '_auth_user_id': str(user.id), '_auth_user_backend': REMOTE_BACKEND,
                                    '_auth_user_hash': user.get_session_auth_hash()}
            request.session.modified = True
            with closing(_connection()) as database, database:
                database.execute('UPDATE auth_user SET last_login=? WHERE id=?',
                                 (dt.datetime.now(dt.timezone.utc).replace(tzinfo=None).isoformat(' '), user.id))
            request.csrf_secret = ''.join(secrets.choice(CHARS) for _ in range(32))
            request.csrf_update = True


def authenticate(request):
    header = request.META.get('HTTP_AUTHORIZATION', '').encode('latin-1').split()
    request.user, request.auth = User(), None
    if not header or header[0].lower() != b'token':
        return None
    if len(header) == 1:
        raise AuthenticationError('Invalid token header. No credentials provided.')
    if len(header) > 2:
        raise AuthenticationError('Invalid token header. Token string should not contain spaces.')
    try:
        key = header[1].decode()
    except UnicodeError as exc:
        raise AuthenticationError('Invalid token header. Token string should not contain invalid characters.') from exc
    with closing(_connection()) as database:
        row = database.execute('SELECT u.id, u.username, u.password, u.email, u.is_active FROM authtoken_token t JOIN auth_user u ON u.id=t.user_id WHERE t.key=?', (key,)).fetchone()
    user = _user(row)
    if not user.is_authenticated:
        raise AuthenticationError('Invalid token.')
    if not user.is_active:
        raise AuthenticationError('User inactive or deleted.')
    request.user, request.auth = user, key
    return user, key


def _set_cookie(response, name, value, **attrs):
    cookie = SimpleCookie()
    cookie[name] = value
    for key, value in attrs.items():
        if value is not None:
            cookie[name][key.replace('_', '-')] = value
    response.raw_headers.append((b'set-cookie', cookie[name].OutputString().encode('latin-1')))


def finish_request(request, response):
    vary = [item.strip() for item in response.headers.get('Vary', '').split(',') if item.strip()]
    if 'Cookie' not in vary:
        vary.append('Cookie')
    response.headers['Vary'] = ', '.join(vary)
    session = request.session
    if 'sessionid' in request.COOKIES and not session.session_key and not session.data:
        _set_cookie(response, 'sessionid', '', expires='Thu, 01 Jan 1970 00:00:00 GMT', max_age=0, path='/', samesite='Lax')
    elif session.modified and session.data and response.status_code < 500:
        session.save()
        _set_cookie(response, 'sessionid', session.session_key, expires=formatdate(time.time() + 1_209_600, usegmt=True),
                    max_age=1_209_600, path='/', httponly=True, samesite='Lax')
    if getattr(request, 'csrf_update', False):
        _set_cookie(response, 'csrftoken', request.csrf_secret, expires=formatdate(time.time() + 31_449_600, usegmt=True),
                    max_age=31_449_600, path='/', samesite='Lax')
    return response
