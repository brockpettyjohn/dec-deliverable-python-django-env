from io import BytesIO
from os import urandom

from django.conf import settings
from django.core.mail import send_mail
from django.shortcuts import resolve_url
from django.utils.six.moves.urllib.parse import urlparse
from PIL import Image


def send_email(sender, to, subject, body):
    if settings.GOOGLE_APP_ENGINE:
        from google.appengine.api import mail
        mail.send_mail(sender=sender, to=to, subject=subject, body=body)
    else:
        send_mail(subject, body, sender, [to])


def context_processor(request):
    tabs_primary = []
    if request.user:
        active_tab = 'Books'
        path_components = urlparse(request.build_absolute_uri()).path.split('/')
        if len(path_components) > 1 and path_components[1]:
            active_tab = path_components[1].title()
        # tabs_primary.append({'name': 'Home', 'url': resolve_url('phonesoap_home')})
        tabs_primary.append({
            'name': 'Books',
            'url': resolve_url('catalyst_books'),
            # 'icon': 'books',
            'icon': 'book',
        })
        tabs_primary.append({
            'name': 'Activities',
            'url': resolve_url('catalyst_activities'),
            # 'icon': 'casino',
            'icon': 'soccer-ball-o',
        })
        if request.user.has_perm('catalyst.view_user'):
            tabs_primary.append({
                'name': 'Users',
                'url' : resolve_url('catalyst_users'),
                'icon': 'users'
                })
    return {
        'tabs_primary': tabs_primary,
        'active_tab': active_tab,
    }


def resize_image(image_object, max_dimension=2048):
    try:
        image = Image.open(image_object)
        if image.height > max_dimension or image.width > max_dimension:
            im = Image.open(image_object)
            im.thumbnail((max_dimension, max_dimension), Image.ANTIALIAS)
            outfile = BytesIO()
            im.save(outfile, image_object.content_type.split('/')[1])
            outfile.content_type = image_object.content_type
            return outfile
    except:
        pass
    return image_object