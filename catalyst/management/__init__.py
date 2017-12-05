from django.contrib.auth.models import AbstractUser, Group, Permission
from django.contrib.contenttypes.models import ContentType
from catalyst.models import User

def create_initial_data(**kwargs):#app_config, verbosity=2, interactive=True, using=DEFAULT_DB_ALIAS, apps=global_apps, **kwargs):
    try:
        admin_group, created = Group.objects.get_or_create(name='admin')
        teacher_group, created = Group.objects.get_or_create(name='teacher')
        user_content_type = ContentType.objects.get(
            app_label='catalyst', model='user')
        book_content_type = ContentType.objects.get(
            app_label='catalyst', model='book')

        for model, content_type in (('user', user_content_type), ('book', book_content_type)):
            for codename in ('add_{}'.format(model), 'change_{}'.format(model), 'delete_{}'.format(model), 'view_{}'.format(model)):
                admin_group.permissions.add(Permission.objects.get(codename=codename, content_type=content_type))
        # for codename in ('add_book',):
        #     teacher_group.permissions.add(Permission.objects.get(codename=codename, content_type=book_content_type))Ï

        for username, group in (('revroad', admin_group), ('revroad_teacher', teacher_group)):
            try:
                obj = User.objects.get(username=username)
            except User.DoesNotExist:
                obj = User.objects.create_user(
                    username, '{}@revroad.com'.format(username), 'roadie')
                obj.save()
                obj.groups.add(group)
    except Exception as e:
        print("manage create_initial_data error", e)
        return
