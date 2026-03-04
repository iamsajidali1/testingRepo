from django.db import models
from django.contrib.auth.models import User as UserModel


class KdbxFiles(models.Model):
    user = models.ForeignKey(UserModel, on_delete=models.DO_NOTHING)
    name = models.CharField(max_length=256)
    file = models.TextField()

    class Meta:
        constraints = [models.UniqueConstraint(
            fields=["user", "name"], name="user_kdbx_files"
        )]
