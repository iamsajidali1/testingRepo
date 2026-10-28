#!/usr/bin/env python
"""FastAPI development server and compatible local setup commands."""
import argparse
import shutil
from pathlib import Path


def main():
    parser = argparse.ArgumentParser()
    commands = parser.add_subparsers(dest='command', required=True)
    server = commands.add_parser('runserver')
    server.add_argument('addrport', nargs='?', default='127.0.0.1:8000')
    server.add_argument('--noreload', action='store_true')
    server.add_argument('--nothreading', action='store_true')
    for name in ('migrate', 'collectstatic'):
        command = commands.add_parser(name)
        command.add_argument('--noinput', '--no-input', action='store_true')
    args = parser.parse_args()
    if args.command == 'runserver':
        import uvicorn
        host, separator, port = args.addrport.rpartition(':')
        if not separator:
            host, port = '127.0.0.1', args.addrport
        uvicorn.run('velocloud_app.asgi:application', host=host.strip('[]'), port=int(port), reload=not args.noreload)
    elif args.command == 'migrate':
        from velocloud_app.auth_state import initialize_database
        print('Initialized original authentication/session schema.' if initialize_database() else 'Existing authentication/session tables unchanged.')
    else:
        from velocloud_app.settings import STATIC_ROOT
        source = Path(__file__).resolve().parent / 'velocloud_app/static'
        shutil.copytree(source, STATIC_ROOT, dirs_exist_ok=True)
        print('Static browser assets collected.')


if __name__ == '__main__':
    main()
