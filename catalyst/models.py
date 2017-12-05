from django.conf import settings
from django.contrib.auth.models import AbstractUser, Group, Permission
from django.contrib.contenttypes.models import ContentType
from django.core.validators import RegexValidator
from django.db import models
from django.db.utils import ProgrammingError


class User(AbstractUser):
    class Meta:
        permissions = (
            ("view_user", "Can view users"),
        )
    ROLES = (
        ('admin', 'Admin'),
        ('teacher', 'Teacher'),
    )
    picture = models.URLField()
    role = models.CharField(max_length=10, choices=ROLES, default=ROLES[0][0])
    def save(self, *args, **kwargs):
        add_group = True
        if self.id:
            old_role = User.objects.get(id=self.id).role
            if old_role == self.role:
                add_group = False
            else:
                old_group, created = Group.objects.get_or_create(name=old_role)
                self.groups.remove(old_group)

        super(User, self).save(*args, **kwargs)

        if add_group:
            group, created = Group.objects.get_or_create(name=self.role)
            self.groups.add(group)



class Book(models.Model):
    class Meta:
        permissions = (
            ("view_book", "Can view books"),
        )
    title = models.CharField(max_length=255)
    author = models.CharField(max_length=255)
    illustrator = models.CharField(max_length=255)
    cover_image_url = models.URLField(max_length=255, default='')
    pages = models.TextField()
    reading_level = models.CharField(max_length=255, default='')
    lexile_level = models.CharField(max_length=255, default='')
    creator = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
