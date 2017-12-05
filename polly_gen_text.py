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
#voices = ('Amy',)
texts = [
    {
        'name': '2-1',
        # 'text': '<speak>Click on the word <prosody volume="x-loud" rate="x-slow">four</prosody></speak>',
        'text': 'Click on the word - four',
    },
    {
        'name': '2-2',
        'text': 'Click on the word - time.',
    },
    {
        'name': '3-1',
        'text': 'Click on the picture of the bunny.',
    },
    {
        'name': '3-2',
        'text': 'Click on the word - underneath.',
    },
    {
        'name': '4-1',
        'text': 'Click on the word - morning.',
    },
    {
        'name': '4-2',
        'text': 'Click on the word - garden.',
    },
    {
        'name': 'correct',
        'text': 'That’s right',
    },
    {
        'name': 'incorrect',
        'text': 'Incorrect: Try again.',
    },
    {
        'name': 'good_job',
        'text': 'Good job.',
    },
]
texts = [
    {
        'name': 'begin_recording',
        'text': 'You are going to record this book in your own voice. After the page is read to you, click the microphone button and read the page out loud. Click the square button when you are done reading.'
    }
]

# voices = ('Brian',)
for voiceId in voices:
    # path = os.path.join('catalyst', 'static', 'catalyst', 'peter', voiceId)
    path = os.path.join('catalyst', 'static', 'catalyst', 'audio', voiceId)
    if not os.path.exists(path):
        os.makedirs(path)
    for text in texts:
        response = polly.synthesize_speech(Text=text['text'],
                                        #    TextType='ssml',
                                           VoiceId=voiceId,
                                           OutputFormat=outputFormat)
        with closing(response['AudioStream']) as stream:
            print('saving to ', os.path.join(path, '{}.mp3'.format(text['name'])))
            with open(os.path.join(path, '{}.mp3'.format(text['name'])), 'wb') as audio_file:
                audio_file.write(stream.read())
