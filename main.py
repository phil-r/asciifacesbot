# -*- coding: utf-8 -*-

import os
import json
import logging

from google.appengine.api import urlfetch
from google.appengine.ext import deferred

from flask import Flask, request, jsonify

from faces import faces


app = Flask(__name__)


@app.route('/')
def hello():
  """Return a friendly HTTP greeting."""
  return "Hello!"


@app.route('/{}'.format(os.environ['TELEGRAM_BOT_TOKEN']), methods=['POST'])
def webhook():
  req = request.get_json()
  logging.info(req)
  inline_query = req.get('inline_query')
  message = req.get('message')
  if inline_query:
    offset = inline_query.get('offset')
    offset = 0 if not offset else int(offset)
    results = [{'type': 'article',
                'id': '{}'.format(i),
                'title': s,
                'message_text': '{} {}'.format(inline_query.get('query'), s),
                } for i, s in enumerate(faces[offset:offset + 50])]
    resp = {'method': 'answerInlineQuery',
            'inline_query_id': inline_query.get('id'),
            'results': results,
            'next_offset': str(offset + len(results))}
    return jsonify(**resp)
  elif message:
    text = message.get('text')
    if text == '/list':
      resp = {'method': 'sendMessage',
              'text': '\n'.join(faces),
              'chat_id': message.get('from').get('id')}
    else:
      resp = {'method': 'sendMessage',
              'text': 'I know only /list command ¯\_(ツ)_/¯',
              'chat_id': message.get('from').get('id')}
    return jsonify(**resp)
  return 'OK'


@app.errorhandler(404)
def page_not_found(e):
  return 'Sorry, Nothing at this URL.', 404


@app.errorhandler(500)
def application_error(e):
  return 'Sorry, unexpected error: {}'.format(e), 500
