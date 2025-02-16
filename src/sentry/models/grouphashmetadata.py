from django.db import models
from django.utils import timezone

from sentry.backup.scopes import RelocationScope
from sentry.db.models import FlexibleForeignKey, Model, region_silo_model


@region_silo_model
class GroupHashMetadata(Model):
    __relocation_scope__ = RelocationScope.Excluded

    # GENERAL
    grouphash = FlexibleForeignKey("sentry.GroupHash", unique=True, related_name="metadata")
    date_added = models.DateTimeField(default=timezone.now)

    class Meta:
        app_label = "sentry"
        db_table = "sentry_grouphashmetadata"
