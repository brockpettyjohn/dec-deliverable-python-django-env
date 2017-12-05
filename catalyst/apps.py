from django.apps import AppConfig
from django.db.models.signals import post_migrate


class CatalystConfig(AppConfig):
    name = 'catalyst'

    def ready(self):
        from catalyst.management import create_initial_data
        # pre_migrate.connect(inject_rename_contenttypes_operations, sender=self)
        post_migrate.connect(create_initial_data)
        # checks.register(check_generic_foreign_keys, checks.Tags.models)
