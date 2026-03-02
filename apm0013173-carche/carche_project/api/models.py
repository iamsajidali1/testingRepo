"""Defining models as template and generatedconfig"""
from django.db import models
from django.utils import timezone


class Template(models.Model):
    """Define the template model"""
    id = models.AutoField(verbose_name='ID', primary_key=True,
                          serialize=False, auto_created=True)
    name = models.CharField(max_length=128)
    contractid = models.CharField(max_length=30, blank=True)
    services = models.CharField(max_length=30, blank=True)
    path = models.CharField(max_length=128)
    body = models.TextField()
    version = models.IntegerField(default=1)
    deviceModel = models.CharField(max_length=128, blank=True)
    # this field is used in other project change require other changes
    # convert camel case to snake style will be done in future
    # pylint: disable=C0103
    dateCreated = models.DateTimeField(editable=False)
    # pylint: disable=C0103
    templateType = models.CharField(max_length=128, default="cArche")
    # pylint: disable=C0103
    vendorType = models.CharField(max_length=255, default="CISCO SYSTEMS")

    def save(self, *args, **kwargs):
        """ On save, update timestamp """
        if not self.id:
            self.dateCreated = timezone.now()
        return super(Template, self).save(*args, **kwargs)


class GeneratedConfig(models.Model):
    """Define the generatedconfig model"""
    id = models.AutoField(verbose_name='ID', primary_key=True,
                          serialize=False, auto_created=True)
    templateid = models.ForeignKey(Template, on_delete=models.CASCADE)
    templatebody = models.TextField()
    generatedconfig = models.TextField()
    # pylint: disable=C0103
    dateCreated = models.DateTimeField(editable=False)
    inputdata = models.TextField()

    def save(self, *args, **kwargs):
        """ On save, update timestamp """
        if not self.id:
            self.dateCreated = timezone.now()
        return super(GeneratedConfig, self).save(*args, **kwargs)
