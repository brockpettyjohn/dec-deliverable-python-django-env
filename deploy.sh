#!/bin/bash
rm -rf static/
./manage.py collectstatic
gcloud --project=catalyst-173314 app deploy
