import cgi
import hashlib
import json
import logging
import os
import xml.etree.ElementTree
import pdb
import sys
import time
from contextlib import closing

import requests
from boto3 import Session
from botocore.exceptions import BotoCoreError, ClientError
from django import forms
from django.forms import ModelForm
from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.http import HttpResponse, JsonResponse, StreamingHttpResponse
from django.shortcuts import redirect, render, reverse
from django.views.decorators.csrf import csrf_exempt
from pydub import AudioSegment

from catalyst.models import Book, User
from catalyst.util import resize_image

logger = logging.getLogger(__name__)

try:
    session = Session()
    polly = session.client('polly')
    s3 = session.client('s3')
except:
    logger.error('Error instantiating AWS services. AWS credentials might not be configured correctly. '
                 'http://docs.aws.amazon.com/general/latest/gr/aws-access-keys-best-practices.html')


def index(request):
    context = {}
    return render(request, 'catalyst/index.html', context=context)


@login_required
def books(request):
    books = []
    for book in Book.objects.order_by('title'):
        image = book.cover_image_url or ''
        if not image:
            for page in json.loads(book.pages):
                if page['images']:
                    image = page['images'][0]['src']
        books.append({
            'image': image,
            'title': book.title,
            'sub_title': '{}'.format(book.author) if book.author else '',
            'url': reverse('catalyst_book', kwargs={'book_id': book.id}),
            'new': True,
            'edit_url': '{}?book_id={}'.format(reverse('catalyst_create_book'), book.id),
            'reading_level': book.reading_level,
            'lexile_level': book.lexile_level,
            'can_edit': book.creator_id == request.user.id or request.user.has_perm('catalyst.change_book'),
        })
    jsonBooks = json.dumps(books)
    context = {
        'items': books,
        'search_placeholder': 'Search by title, grade level, Lexile, or author',
        'option_1': 'Read',
        'option': 'Understand',
        'show_record': True,
        'add_button_text': 'Add Book',
        'json_books': jsonBooks,
        'can_add_book': request.user.has_perm('catalyst.add_book'),
    }
    return render(request, 'catalyst/cards.html', context=context)


@login_required
def activities(request):
    context = {
        'items': [
            {
                'image': '/static/catalyst/powerwords.jpg',
                'title': 'Power Words',
                'sub_title': 'Drag & Drop, Grade 2',
                'url': reverse('catalyst_power_words'),
            },
            {
                'image': '/static/catalyst/violin.png',
                'title': 'Classical Paintings',
                'sub_title': 'Ranking, Grade 4',
                'url': reverse('catalyst_power_words'),
            },
            {
                'image': '/static/catalyst/abcs_new.jpg',
                'title': 'Learn Your ABCs',
                'sub_title': 'Matching, Grade 1',
                'url': reverse('catalyst_power_words'),
            },
        ],
        'search_placeholder': 'Search by name, subject, or content',
        'no_action': True,
        'add_button_text': 'Add Activity',
    }
    jsonBooks = json.dumps(context['items'])
    context['json_books'] = jsonBooks
    return render(request, 'catalyst/cards.html', context=context)


# @login_required
# def assessments(request):
#     context = {
#         'items': [],
#         'search_placeholder': 'Search',
#         'add_button_text': 'Add Assessment',
#     }
#     return render(request, 'catalyst/cards.html', context=context)

@login_required
def users(request):
    users = User.objects.all()
    context = {
        'users': users,
    }
    return render(request, 'catalyst/users/users.html', context=context)


class UserForm(forms.ModelForm):
    class Meta:
        model = User
        fields = ('first_name', 'last_name', 'username', 'email', 'password')

    def save(self, commit=True):
        user = super(UserForm, self).save(commit=False)
        user.set_password(self.cleaned_data["password"])
        if commit:
            user.save()
        return user


@login_required
def show_user(request, user_id):
    context = {}
    return render(request, 'catalyst/users/user_show.html', context=context)


@login_required
def create_user(request):
    context = {
        'form': UserForm(),
    }
    if request.method == 'POST':
        form = UserForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect('catalyst_users')
    else:
        return render(request, 'catalyst/users/user_new.html', context=context)


@login_required
def edit_user(request, user_id):
    user_record = User.objects.get(id=user_id)
    form = UserForm(instance=user_record)
    return render(request, 'catalyst/users/user_edit.html')


@login_required
def delete_user(request):
    user_id = request.GET.get('user_id') or request.POST.get('user_id')
    if user_id:
        user = User.objects.get(id=user_id)
        user.delete()
    return redirect('catalyst_users')


@login_required
def power_words(request):
    return render(request, 'catalyst/lesson.html', context={'lesson_path': 'power-words-frame'})


@login_required
def power_words_frame(request):
    return render(request, 'catalyst/power_words.html')


class BookForm(forms.Form):
    voice = forms.ChoiceField(choices=(
        ('Emma', 'Emma - UK English'),
        ('Amy', 'Amy - UK English '),
        ('Brian', 'Brian - UK English'),
        ('Joanna', 'Joanna - US English'),
        ('Ivy', 'Ivy - US English'),
        ('Kendra', 'Kendra - US English'),
        ('Kimberly', 'Kimberly - US English'),
        ('Salli', 'Salli - US English'),
        ('Joey', 'Joey - US English'),
        ('Justin', 'Justin - US English'),
    ))

    def __init__(self, *args, **kwargs):
        super(BookForm, self).__init__(*args, **kwargs)
        self.fields['voice'].widget.attrs['class'] = 'frosted'


@login_required
def book(request, book_id):
    book = Book.objects.get(id=book_id)
    if not book:
        return HttpResponse(status_code=404)
    pages = json.loads(book.pages)
    readingLevel = book.reading_level
    lexileLevel = book.lexile_level
    voice = request.GET.get('voice', 'Emma')
    understand_mode = bool(request.GET.get('understand'))
    record_mode = bool(request.GET.get('record'))
    context = {
        'book_id': book_id,
        'pages': pages,
        'voice': voice,
        'form': BookForm(request.GET),
        'understand_mode': understand_mode,
        'record_mode': record_mode,
        'reading_level': readingLevel,
        'lexile_level': lexileLevel
        # 'image_maps': image_maps,
    }
    for page_index, page in enumerate(pages):
        for text_index, text in enumerate(page.get('texts', [])):
            if text['audio']['type'] == 'tts' and not understand_mode:
                text['texts_array'] = []
                byte_text = text['text'].encode('utf8')
                for reversed_word_index, word in enumerate(reversed(text.get('audio', {}).get('meta', []))):
                    word_index = len(text['audio']['meta']) - \
                        reversed_word_index - 1
                    content = byte_text[word['end']:].decode('utf8')
                    if content:
                        text['texts_array'].insert(
                            0, {'type': 'filler', 'content': content})
                    byte_text = byte_text[:word['end']]
                    text['texts_array'].insert(0, {
                        'type': 'word',
                        'content': byte_text[word['start']:word['end']].decode('utf8'),
                        'wordIndex': word_index,
                    })
                    byte_text = byte_text[:word['start']]
                if byte_text:
                    text['texts_array'].insert(
                        0, {'type': 'filler', 'content': byte_text.decode('utf8')})
                for tmp_text in text['texts_array']:
                    tmp_text['content'] = tmp_text['content'].replace(
                        '\n', '<br>')
            else:
                if text['text']:
                    text['text_split'] = text['text'].replace(
                        '\n', '<br> ').split()
    context['pages_json'] = json.dumps(pages)

    if understand_mode:
        pages.append({'text': '&nbsp;&nbsp;&nbsp;&nbsp; <b>Good job!</b>'})
    return render(request, 'catalyst/book.html', context=context)


@csrf_exempt
def tts(request):
    text = request.GET.get('text') or request.POST.get('text')
    output_format = 'mp3'
    voice = request.GET.get('voice', request.POST.get('voice', 'Emma'))
    response = polly.synthesize_speech(Text=text,
                                       VoiceId=voice,
                                       OutputFormat=output_format)
    # return StreamingHttpResponse(response['AudioStream'])
    with closing(response['AudioStream']) as stream:
        return HttpResponse(stream.read(), content_type='audio/mp3')

    #     body = stream.read()
    #     with open('catalyst/static/catalyst/peter/audio/peter{}.mp3'.format(audio_count), 'wb') as audio_file:
    #         audio_file.write(body)
    #     page['audio'] = 'peter{}.mp3'.format(audio_count)
    #     audio_count += 1


def book_frame(request):
    return render(request, 'catalyst/book.html')


def frame(request):
    return render(request, 'catalyst/frame.html')


def definition(request):
    word = request.GET.get('word', '').lower()
    try_words = [word]
    if word.endswith('s'):
        try_words.append(word[:-1])
    result = []
    try:
        for r in requests.get('https://api.pearson.com/v2/dictionaries/wordwise/entries?headword={}&apikey=1zyUvLM2sGbuWqXLcEkQQOtvQLlX1w6i'.format(word)).json()['results']:
            if r.get('headword', '').lower() in try_words:
                # they give us other definitions with similar words, only use exact matches
                definition = ''
                for sense in r.get('senses', []):
                    definitions = sense.get('definition')
                    if definitions:
                        if not isinstance(definitions, list):
                            definitions = [definitions]
                        definition += '<br>'.join(['{}.'.format(d.capitalize())
                                                   for d in definitions])
                    for example in sense.get('examples', []):
                        if example.get('text'):
                            definition += '<br>Example: {}'.format(
                                example['text'])
                    if sense.get('translation'):
                        definition += '<br>{}'.format(sense.get('translation'))
                result.append(definition)

        # r = requests.get('http://services.aonaware.com/DictService/DictService.asmx/Define?word={}'.format(word))
        # root = xml.etree.ElementTree.fromstring(r.content)
        # for definition in root.find('{http://services.aonaware.com/webservices/}Definitions'):
        #     word_definition = definition.find('{http://services.aonaware.com/webservices/}WordDefinition')
        #     result.append(word_definition.text)
            # return HttpResponse(word_definition.text)
    except:
        raise
    if result:
        return HttpResponse('<br><br>'.join([r for r in result]))
    else:
        return HttpResponse('')


@login_required
def create_book(request):
    book_id = request.GET.get('book_id')
    voices = forms.ChoiceField(choices=(
        ('Emma', 'Emma - UK English'),
        ('Amy', 'Amy - UK English '),
        ('Brian', 'Brian - UK English'),
        ('Joanna', 'Joanna - US English'),
        ('Ivy', 'Ivy - US English'),
        ('Kendra', 'Kendra - US English'),
        ('Kimberly', 'Kimberly - US English'),
        ('Salli', 'Salli - US English'),
        ('Joey', 'Joey - US English'),
        ('Justin', 'Justin - US English'),
    ))
    default_text = {
        'text': '',
        'style': {
            'left': '10%',
            'top': '10%',
            'width': '80%',
            'font-family': 'Poppins',
            'font-size': '2em',
            'color': 'black',
            'text-align': 'left',
        },
        'audio': {
            'type': 'none',
            'meta': [],
            'values': [],
            'recordingType': 'none',
        },
        'shadow': False,
        'bold': False,
        'italic': False,
    }
    default_image = {
        'src': 'https://s3-us-west-2.amazonaws.com/revroad-catalyst/images/blank_image.png',
        'style': {
            'top': '0%',
            'left': '0%',
            'width': '100%',
        }
    }
    default_video = {
        'style': {
            'top': '0%',
            'left': '0%',
            'width': '40%',
        }
    }
    default_vocab = {
        'word': '',
        'type': '',
        'audio': '',
    }
    if book_id:
        book = Book.objects.get(id=book_id)
        pages = book.pages
        title = book.title
        author = book.author
        illustrator = book.illustrator
        cover_image_url = book.cover_image_url
        reading_level = book.reading_level
        lexile_level = book.lexile_level
        voice = request.GET.get('voice', 'Emma')
    else:
        pages = [{
            'texts': [],
            'images': [],
            'videos': [],
            'vocabulary': [],
        }]
        pages = json.dumps(pages)
        title = ''
        author = ''
        illustrator = ''
        cover_image_url = ''
        voice = request.GET.get('voice', 'Emma')
        reading_level = ''
        lexile_level = ''
    context = {
        'book_id': book_id,
        'voice': voice,
        'voices': voices,
        'pages': pages,
        'title': title,
        'author': author,
        'illustrator': illustrator,
        'cover_image_url': cover_image_url,
        'reading_level': reading_level,
        'lexile_level': lexile_level,
        'default_text': json.dumps(default_text),
        'default_image': json.dumps(default_image),
        'default_video': json.dumps(default_video),
        'default_vocab': json.dumps(default_vocab),
    }
    return render(request, 'catalyst/create_book.html', context=context)


@csrf_exempt
@login_required
def create_book_delete(request):
    book_id = request.GET.get('book_id') or request.POST.get('book_id')
    if book_id:
        book = Book.objects.get(id=book_id)
        book.delete()
    return redirect('catalyst_books')


@csrf_exempt
@login_required
def create_book_save(request):
    book_id = request.POST.get('book_id')
    title = request.POST.get('title')
    author = request.POST.get('author')
    illustrator = request.POST.get('illustrator')
    cover_image_url = request.POST.get('cover_image_url')
    pages = request.POST.get('pages')
    voice = request.POST.get('voice')
    reading_level = request.POST.get('reading_level')
    lexile_level = request.POST.get('lexile_level')
    if book_id:
        book = Book.objects.get(id=book_id)
    else:
        book = Book(creator=request.user)
    book.title = title
    book.voice = voice
    book.author = author
    book.illustrator = illustrator
    book.cover_image_url = cover_image_url
    book.pages = pages
    book.reading_level = reading_level
    book.lexile_level = lexile_level
    book.save()
    ret = {
        'book_id': book.id
    }
    return HttpResponse(json.dumps(ret), content_type='application/json')


@csrf_exempt
@login_required
def create_book_save_audio(request):
    audio_file = request.FILES.get('audio')
    if ".wav" in audio_file.name:
        audio_object = AudioSegment.from_wav(audio_file)
        audio_object = audio_object.export(format="mp3")
    if ".ogg" in audio_file.name:
        audio_object = AudioSegment.from_ogg(audio_file)
        audio_object = audio_object.export(format="mp3")
    if ".mp3" in audio_file.name:
        audio_object = audio_file
    url = ''
    if audio_file:
        audio_data = audio_object.read()
        sha = hashlib.sha1()
        sha.update(audio_data)
        bucket = 'revroad-catalyst'
        key = 'audio/{}'.format(sha.hexdigest())
        s3.put_object(Bucket=bucket, Key=key, Body=audio_data,
                      ACL='public-read', ContentType='audio/mp3')
        url = '{}/{}/{}'.format(s3.meta.endpoint_url, bucket, key)
    return HttpResponse(url)
# Text to Speech


@csrf_exempt
@login_required
def create_book_save_tts(request):
    # text = request.POST.get('text')
    text = request.POST.get('text')
    voiceId = request.POST.get('voiceId')
    # voiceId = request.POST.get('voiceId')
    # voiceId = request.GET.get('voice', request.POST.get('voice', 'Emma'))
    response = polly.synthesize_speech(Text=text,
                                       VoiceId=voiceId,
                                       OutputFormat='mp3')
    with closing(response['AudioStream']) as stream:
        body = stream.read()
        audio_info_list = []
        bucket = 'revroad-catalyst'
        sha = hashlib.sha1()
        sha.update(body)
        key = 'audio/tts/{}'.format(sha.hexdigest())
        s3.put_object(Bucket=bucket, Key=key, Body=body,
                      ACL='public-read', ContentType='audio/mp3')
        url = '{}/{}/{}'.format(s3.meta.endpoint_url, bucket, key)
        response = polly.synthesize_speech(Text=text,
                                           VoiceId=voiceId,
                                           OutputFormat='json',
                                           SpeechMarkTypes=['word'])
        with closing(response['AudioStream']) as stream:
            body = stream.read()
            for audio_info_str in body.decode().split():
                audio_info = json.loads(audio_info_str)
                audio_info_list.append(audio_info)
        return JsonResponse({'url': url, 'audio_info': audio_info_list})


@csrf_exempt
@login_required
def create_book_save_image(request):
    image_file = request.FILES.get('image')
    url = ''
    if image_file:
        image_file = resize_image(image_file)
        image_file.seek(0)
        audio_data = image_file.read()
        sha = hashlib.sha1()
        sha.update(audio_data)
        bucket = 'revroad-catalyst'
        key = 'images/{}'.format(sha.hexdigest())
        s3.put_object(Bucket=bucket, Key=key, Body=audio_data,
                      ACL='public-read', ContentType=image_file.content_type)
        url = '{}/{}/{}'.format(s3.meta.endpoint_url, bucket, key)
        image_file.close()
    return HttpResponse(url)


@csrf_exempt
@login_required
def create_book_save_video(request):
    video_file = request.FILES.get('video')
    url = ''
    if video_file:
        audio_data = video_file.read()
        sha = hashlib.sha1()
        sha.update(audio_data)
        bucket = 'revroad-catalyst'
        key = 'videos/{}'.format(sha.hexdigest())
        s3.put_object(Bucket=bucket, Key=key, Body=audio_data,
                      ACL='public-read', ContentType=video_file.content_type)
        url = '{}/{}/{}'.format(s3.meta.endpoint_url, bucket, key)
    return HttpResponse(url)


class LoginForm(forms.ModelForm):
    class Meta:
        model = User
        fields = ('username', 'password')
        widgets = {
            'username': forms.TextInput(attrs={'placeholder': 'Username'}),
            'password': forms.PasswordInput(attrs={'placeholder': 'Password'}),
        }

    def __init__(self, *args, **kwargs):
        self.request = kwargs.pop('request', None)
        super(LoginForm, self).__init__(*args, **kwargs)

    def clean(self):
        username = self.cleaned_data.get('username')
        password = self.cleaned_data.get('password')
        user = authenticate(self.request, username=username, password=password)
        self.cleaned_data['user'] = user
        if not user or not user.is_active:
            raise forms.ValidationError(
                "Sorry, the username or password is invalid. Please try again.")
        return self.cleaned_data


def sign_in(request):
    if request.method == 'POST':
        form = LoginForm(request.POST, request=request)
        if form.is_valid():
            user = form.cleaned_data.get('user')
            if user is not None:
                login(request, user)
                return redirect('catalyst_books')
    else:
        form = LoginForm()
    context = {
        'form': form,
        # 'fade_in': request.GET.get('animate') or not request.COOKIES.get('faded_in'),
    }
    response = render(request, 'catalyst/sign_in.html', context)
    # response.set_cookie(key='faded_in', value=1)
    return response


def sign_out(request):
    logout(request)
    return redirect('catalyst_sign_in')


@csrf_exempt
def create_book_image_search(request):
    q = request.POST.get('q')
    items = []
    if q:
        # tbas = 0 is Usage Rights = Labeled for reuse
        # tbs = sur:fc is Usage Rights = Labeled for reuse
        url = 'https://www.google.com/search?q={}&tbs=sur:fc&espv=2&biw=1366&bih=667&site=webhp&source=lnms&tbm=isch&sa=X&ei=XosDVaCXD8TasATItgE&ved=0CAcQ_AUoAg'.format(
            q.replace(' ', '%20'))
        items = _images_get_all_items(_download_page(url))
    return JsonResponse({'items': items})
    # api_key = 'AIzaSyDvWh62ZSG_EN4_2nX9ISPpb9HjApHhz9c'
    # url = 'https://www.googleapis.com/customsearch/v1?key={}&cx=YOUR CUSTOM SEARCH ENGINE IDENTIFIER&q=your query&searchType=Image'.format(api_key)


def _download_page(url):
    # Downloading entire Web Document (Raw Page Content)
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36',
    }
    return requests.get(url, headers=headers).text


def _images_get_next_item(s):
    # Finding 'Next Image' from the given raw page
    start_line = s.find('rg_di')
    if start_line == -1:  # If no links are found then give an error!
        end_quote = 0
        link = "no_links"
        return link, end_quote
    else:
        start_line = s.find('"class="rg_meta"')
        start_content = s.find('"ou"', start_line + 1)
        end_content = s.find(',"ow"', start_content + 1)
        content_raw = str(s[start_content + 6:end_content - 1])
        return content_raw, end_content


def _images_get_all_items(page):
    # Getting all links with the help of '_images_get_next_image'
    items = []
    while True:
        item, end_content = _images_get_next_item(page)
        if item == "no_links":
            break
        else:
            # Append all the links in the list named 'Links'
            items.append(item)
            # Timer could be used to slow down the request for image downloads
            # time.sleep(0.1)
            page = page[end_content:]
    return items
