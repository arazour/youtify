import webapp2
from google.appengine.api import urlfetch
import urllib
import yaml
from model import get_current_youtify_user_model
import json as simplejson
import urlparse

try:
    import config
except ImportError:
    import config_template as config

class CallbackHandler(webapp2.RequestHandler):

    def get(self):

        url = 'http://api.soundcloud.com/oauth2/token'
        http_method = 'POST'
        params = {
            'client_id': config.SOUNDCLOUD_CLIENTID,
            'client_secret': config.SOUNDCLOUD_CLIENT_SECRECT,
            'redirect_uri': config.SOUNDCLOUD_REDIRECT_URL,
            'grant_type': "authorization_code",
            'code': self.request.get('code')
        }
        payload = urllib.urlencode(params)
        response = urlfetch.fetch(url=url, payload=payload, method=http_method, deadline=10, validate_certificate=True)
        session = yaml.load(response.content)

        if 'access_token' in session:
            response = urlfetch.fetch(url='http://api.soundcloud.com/me.json?oauth_token='+session['access_token'], method='GET',  deadline=10, validate_certificate=True, headers={"Accept": "application/json"})
            me = yaml.load(response.content)

            user = get_current_youtify_user_model()

            user.soundcloud_user_name = me['username']
            user.soundcloud_access_token = session['access_token']

            user.save()

            redirect_uri = self.request.cookies.get('redirect_uri') or '/'

            self.response.headers['Set-Cookie'] = 'redirect_uri=deleted; expires=Thu, 01 Jan 1970 00:00:00 GMT'

            self.redirect(redirect_uri)
        else:
            self.response.headers['Content-Type'] = 'text/plain'

            self.response.out.write('Soundcloud connection failed')
            self.response.out.write('\n\n')

            self.response.out.write(str(session))


class ConnectHandler(webapp2.RequestHandler):
    def get(self):
        redirect_uri = self.request.get('redirect_uri')
        if redirect_uri and redirect_uri != 'deleted':
            self.response.headers['Set-Cookie'] = 'redirect_uri=' + redirect_uri
        url = 'https://api.soundcloud.com/connect?response_type=code&redirect_uri='+urllib.quote_plus(config.SOUNDCLOUD_REDIRECT_URL)+'&client_id='+config.SOUNDCLOUD_CLIENTID+'&scope=non-expiring'
        self.redirect(url)

class DisconnectHandler(webapp2.RequestHandler):

    def get(self):
        redirect_uri = self.request.get('redirect_uri', '/')

        user = get_current_youtify_user_model()

        user.soundcloud_user_name = None
        user.soundcloud_access_token = None

        user.save()

        self.redirect(redirect_uri)

class StreamHandler(webapp2.RequestHandler):

    def get(self):
        user = get_current_youtify_user_model()
        cursor = self.request.get('cursor')
        response = urlfetch.fetch(url='http://api.soundcloud.com/me/activities/all?limit=30&oauth_token='+user.soundcloud_access_token + '&cursor=' + cursor, method='GET',  deadline=10, validate_certificate=True, headers={"Accept": "application/json"})
        streamJson = yaml.load(response.content)
        stream = {'tracks': []}
        parsed = urlparse.urlparse(streamJson['next_href'])
        stream['cursor'] = urlparse.parse_qs(parsed.query)['cursor']
        for item in streamJson['collection']:
            if item['type'] == 'track':
                track = {'id': item['origin']['id'], 'title': item['origin']['title'], 'type': 'soundcloud'}
                stream['tracks'].append(track)

        self.response.write(simplejson.dumps(stream))


app = webapp2.WSGIApplication([
        ('/soundcloud/callback', CallbackHandler),
        ('/soundcloud/connect', ConnectHandler),
        ('/soundcloud/disconnect', DisconnectHandler),
        ('/soundcloud/stream', StreamHandler),
    ], debug=True)
