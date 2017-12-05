"""catalyst URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/1.11/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  url(r'^$', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  url(r'^$', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.conf.urls import url, include
    2. Add a URL to urlpatterns:  url(r'^blog/', include('blog.urls'))
"""
from django.conf.urls import include, url
from django.contrib import admin

from .views import views, users

urlpatterns = [
    url(r'^$', views.index),

    url(r'^admin/', admin.site.urls),

    url(r'^power-words/$', views.power_words, name='catalyst_power_words'),
    url(r'^power-words-frame/$', views.power_words_frame),
    url(r'^books/$', views.books, name='catalyst_books'),
    url(r'^book/(?P<book_id>\w+)/$', views.book, name='catalyst_book'),
    url(r'^book-frame/$', views.book_frame),
    url(r'^create-book/$', views.create_book, name='catalyst_create_book'),
    url(r'^create-book/delete/$', views.create_book_delete, name='catalyst_create_book_delete'),
    url(r'^create-book/image-search/$', views.create_book_image_search, name='catalyst_create_book_image_search'),
    url(r'^create-book/save/$', views.create_book_save, name='catalyst_create_book_save'),
    url(r'^create-book/save-audio/$', views.create_book_save_audio, name='catalyst_create_book_save_audio'),
    url(r'^create-book/save-image/$', views.create_book_save_image, name='catalyst_create_book_save_image'),
    url(r'^create-book/save-video/$', views.create_book_save_video, name='catalyst_create_book_save_video'),
    url(r'^create-book/save-tts/$', views.create_book_save_tts, name='catalyst_create_book_save_tts'),
    url(r'^tts/$', views.tts),
    url(r'^activities/$', views.activities, name='catalyst_activities'),
    # url(r'^assessments/$', views.assessments, name='catalyst_assessments'),
    url(r'^definition/$', views.definition, name='catalyst_definition'),

    url(r'^users/$', users.list, name='catalyst_users'),
    url(r'^users/create/$', users.create, name='catalyst_users_create'),
    url(r'^users/(?P<user_id>\w+)/$', users.user_details, name='catalyst_user_details'),
    url(r'^users/(?P<user_id>\w+)/delete/$', users.user_delete, name='catalyst_user_delete'),
    url(r'^sign-in/$', users.sign_in, name='catalyst_sign_in'),
    # url(r'^sign-in/google/$', views.sign_in_google, name='catalyst_sign_in_google'),
    url(r'^sign-out/$', users.sign_out, name='catalyst_sign_out'),

]
