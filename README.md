# asciifacesbot
Telegram Bot [@asciifacesbot](https://telegram.me/asciifacesbot) that allows you to append ascii faces to your messages ¯\\\_(ツ)\_/¯

## Backend
Bot runs on [Google App Engine](https://cloud.google.com/appengine/)

## Telegram API
Bot replies to every incoming webhook and doesn't send requests to the API directly

## How to run your own `asciifacesbot`
- Clone this project
- Run `pip install -r requirements.txt -t lib/` to install dependencies
- Download and install [App Engine SDK](https://cloud.google.com/appengine/downloads)
- Register your app in [Google Cloud console](https://console.cloud.google.com)
- Register your bot via [BotFather](https://telegram.me/BotFather)
- Rename `sample_app.yaml` to `app.yaml` and replace `yourappid` with your App engine app id and `YOUR_TELEGRAM_BOT_TOKEN` with your bot token 
- Run `appcfg.py update .` in the project folder
- ¯\\\_(ツ)\_/¯

## TODO:
- [x] Add basic inline bot 
- [ ] Do something with thumbnail
- [ ] Setup your favorite faces through bot commands
- [ ] [Collect feedback](https://core.telegram.org/bots/inline#collecting-feedback)


Thanks to https://github.com/maxogden/cool-ascii-faces for the list of faces ¯\\\_(ツ)\_/¯
