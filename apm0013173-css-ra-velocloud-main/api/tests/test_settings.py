import os
from contextlib import closing
from pathlib import Path
import runpy
import sqlite3
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch


SETTINGS = Path(__file__).resolve().parents[2] / "velocloud_app" / "settings.py"


class PrivateDatabaseTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        with patch.dict(os.environ, {"ENV": "unittest", "APP_DIR": str(self.root), "DJANGO_SECRET": "test-only"}):
            self.settings = runpy.run_path(str(SETTINGS))
        self.gettempdir = patch("tempfile.gettempdir", return_value=str(self.root))
        self.gettempdir.start()
        self.addCleanup(self.gettempdir.stop)

    def test_test_database_is_isolated(self):
        self.assertEqual(self.settings["DATABASES"]["default"]["NAME"], "unittest")
        self.assertFalse((self.root / "css-ra-velocloud").exists())

    def test_private_stable_path(self):
        create = self.settings["_private_database_path"]
        path = Path(create())
        self.assertEqual(create(), str(path))
        self.assertEqual(path.parent.stat().st_mode & 0o777, 0o700)
        self.assertEqual(path.parent.name, "css-ra-velocloud")
        with closing(sqlite3.connect(path)) as database:
            database.execute("CREATE TABLE shared (value INTEGER)")
        self.assertEqual(create(), str(path))

    def test_rejects_public_directory(self):
        directory = self.root / "css-ra-velocloud"
        directory.mkdir()
        directory.chmod(0o755)
        with self.assertRaises(PermissionError):
            self.settings["_private_database_path"]()

    def test_rejects_directory_symlink(self):
        target = self.root / "target"
        target.mkdir(mode=0o700)
        (self.root / "css-ra-velocloud").symlink_to(target, target_is_directory=True)
        with self.assertRaises(PermissionError):
            self.settings["_private_database_path"]()

    def test_rejects_database_symlink(self):
        path = Path(self.settings["_private_database_path"]())
        target = self.root / "outside.sqlite3"
        target.touch()
        path.symlink_to(target)
        with self.assertRaises(PermissionError):
            self.settings["_private_database_path"]()

    def test_rejects_nonregular_database(self):
        path = Path(self.settings["_private_database_path"]())
        path.mkdir()
        with self.assertRaises(PermissionError):
            self.settings["_private_database_path"]()

    def test_rejects_directory_owned_by_another_user(self):
        self.settings["_private_database_path"]()
        with patch("os.getuid", return_value=os.getuid() + 1):
            with self.assertRaises(PermissionError):
                self.settings["_private_database_path"]()

    def test_workers_share_one_database(self):
        environment = dict(os.environ, ENV="dev", TMPDIR=str(self.root),
                           APP_DIR=str(self.root), DJANGO_SECRET="test-only")
        script = (
            "import runpy, sqlite3; "
            f"settings = runpy.run_path({str(SETTINGS)!r}); "
            "connection = sqlite3.connect(settings['DATABASES']['default']['NAME'], timeout=30); "
            "connection.execute('CREATE TABLE IF NOT EXISTS workers (value INTEGER)'); "
            "connection.execute('INSERT INTO workers VALUES (1)'); "
            "connection.commit(); connection.close()"
        )
        workers = [subprocess.Popen([sys.executable, "-c", script], env=environment,
                                    stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True) for _ in range(2)]
        for worker in workers:
            _, error = worker.communicate(timeout=30)
            self.assertEqual(worker.returncode, 0, error)
        path = self.root / "css-ra-velocloud" / "velocloud.sqlite3"
        with closing(sqlite3.connect(path)) as connection:
            self.assertEqual(connection.execute("SELECT COUNT(*) FROM workers").fetchone()[0], 2)
