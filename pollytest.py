import json
import os
import sys
from contextlib import closing

from boto3 import Session
from botocore.exceptions import BotoCoreError, ClientError

session = Session()
polly = session.client('polly')
outputFormat = 'mp3'
voices = ('Amy', 'Emma', 'Joanna', 'Ivy', 'Joey', 'Justin', 'Kendra', 'Kimberly', 'Salli', 'Brian')
#voices = ('Brian',)
for voiceId in voices:
    audio_count = 1
    audio_meta = []
    path = os.path.join('catalyst', 'static', 'catalyst', 'peter', voiceId)
    with open(os.path.join(path, 'meta.json')) as f:
        meta = json.load(f)
        for page in meta:
            if page.get('text'):
                response = polly.synthesize_speech(Text=page['text'],
                                                   VoiceId=voiceId,
                                                   OutputFormat=outputFormat)
                with closing(response['AudioStream']) as stream:
                    body = stream.read()
                    with open(os.path.join(path, 'audio', '{}.mp3'.format(audio_count)), 'wb') as audio_file:
                        audio_file.write(body)
                    page['audio'] = '{}.mp3'.format(audio_count)
                    audio_count += 1
                response = polly.synthesize_speech(Text=page['text'],
                                                   VoiceId=voiceId,
                                                   OutputFormat='json',
                                                   SpeechMarkTypes=['word'])
                with closing(response['AudioStream']) as stream:
                    body = stream.read()
                    audio_info_dict = {}
                    audio_info_list = []
                    for audio_info_str in body.decode().split():
                        audio_info = json.loads(audio_info_str)
                        audio_info_list.append(audio_info)
                        audio_info_dict[audio_info['time']] = audio_info
                    audio_meta.append(audio_info_list)
            else:
                page['audio'] = ''
                audio_meta.append([])

    with open(os.path.join(path, 'meta_audio.json'), 'w') as f:
        json.dump(audio_meta, f)
    with open(os.path.join(path, 'meta.json'), 'w') as f:
        json.dump(meta, f)