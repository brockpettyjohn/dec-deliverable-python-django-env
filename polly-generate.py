import json
import os
import random
import sys
from contextlib import closing

from boto3 import Session
from botocore.exceptions import BotoCoreError, ClientError

session = Session()
polly = session.client('polly')
outputFormat = 'mp3'
book = 'caterpillar'#'peter'
#book = 'peter'
voices = ('Amy', 'Emma', 'Joanna', 'Ivy', 'Joey', 'Justin', 'Kendra', 'Kimberly', 'Salli', 'Brian')
voices = ('Emma',)
base_path = os.path.join('catalyst', 'static', 'catalyst', book)
colors = [
    '#4A90E2', # Blue
    '#D0021B', # Red
    '#F5A623', # Orange
    '#F8E71C', # Yellow
    '#7ED321', # Green
    '#BD10E0', # Pink
    '#9013FE', # Purple
    '#50E3C2', # Teal
]
with open(os.path.join(base_path, 'english.json')) as f:
    english_texts = json.load(f)
with open(os.path.join(base_path, 'images.json')) as f:
    images = json.load(f)
for voiceId in voices:
    voice_path = os.path.join(base_path, voiceId)
    audio_path = os.path.join(voice_path, 'audio')
    for path in (voice_path, audio_path):
        if not os.path.exists(path):
            os.makedirs(path)
    pages = []
    audio_count = 1
    for page_count, text in enumerate(english_texts):
        image = images[page_count]
        page = {
            'text': text,
            'audio': '',
            'audio_info': [],
            'image': image,
            'color': '' if (text or image) else random.choice(colors),
        }
        pages.append(page)
        if text:
            response = polly.synthesize_speech(Text=text,
                                               VoiceId=voiceId,
                                               OutputFormat=outputFormat)
            with closing(response['AudioStream']) as stream:
                body = stream.read()
                with open(os.path.join(audio_path, '{}.mp3'.format(audio_count)), 'wb') as audio_file:
                    audio_file.write(body)
                page['audio'] = '{}.mp3'.format(audio_count)
                audio_count += 1
            response = polly.synthesize_speech(Text=page['text'],
                                               VoiceId=voiceId,
                                               OutputFormat='json',
                                               SpeechMarkTypes=['word'])
            with closing(response['AudioStream']) as stream:
                body = stream.read()
                # audio_info_dict = {}
                audio_info_list = []
                for audio_info_str in body.decode().split():
                    audio_info = json.loads(audio_info_str)
                    audio_info_list.append(audio_info)
                    # audio_info_dict[audio_info['time']] = audio_info
                page['audio_info'] = audio_info_list
                print(audio_info_list)

    with open(os.path.join(voice_path, 'meta.json'), 'w') as f:
        json.dump(pages, f)

    # with open(os.path.join(path, 'meta_audio.json'), 'w') as f:
    #     json.dump(audio_meta, f)
    # with open(os.path.join(path, 'meta.json'), 'w') as f:
    #     json.dump(meta, f)