var URIManager = {
    initialPopStateHasRun: false,

    init: function() {
        window.addEventListener('popstate', function(event) {
            // Chrome throws an initial popState, http://dropshado.ws/post/15251622664/ignore-initial-popstate
			var isChrome = navigator.userAgent.toLowerCase().indexOf('chrome') > -1;
            if (isChrome && !URIManager.initialPopStateHasRun) {
                URIManager.initialPopStateHasRun = true;
                return;
            }
            URIManager.loadState();
        });
        URIManager.loadWarnings();
        URIManager.loadState();
    },
    loadWarnings: function() {
        if (window.top !== window.self) {
            Utils.showModalBox('This address is not affiliated with Youtify. Always use www.youtify.com');
        }
    },
    loadState: function() {
        var handlers = [
            [
                '/search',
                function(matches) {
                    var q = '';
                    if (location.search) {
                        q = decodeURI(location.search.match('q=(.*)')[1]);
                    }
                    $('#top .search input').val(q).keyup();
                }
            ],
            [
                '/tracks/(.*)/(.*)',
                function(matches) {
                    vid = new Video({
                        videoId: matches[2],
                        type: matches[1]
                    });
                    if (player.initialized) {
                        player.play(vid);
                    } else {
                        EventSystem.addEventListener('player_manager_initialized', function() {
                            player.play(vid);
                        });
                    }
                    EventSystem.addEventListener('video_info_fetched', function(info) {
                        var hasRunOnce = false;
                        if (!hasRunOnce) {
                            hasRunOnce = true;
                            vid.title = info.title;
                            vid.createListView();
                            Queue.setAutoQueue([vid]);
                        }
                    });
                    $('#left .queue').mousedown();
                }
            ],
            [
                '/soundcloud/(.*)',
                function(matches) {
                    ExternalUserPage.load('soundcloud', matches[1]);
                }
            ],
            [
                '/youtube/(.*)',
                function(matches) {
                    ExternalUserPage.load('youtube', matches[1]);
                }
            ],
            [
                '/playlists/(.*)',
                function(matches) {
                    loadPlaylist(matches[1]);
                }
            ],
            [
                '/profile',
                function(matches) {
                    UserManager.loadCurrentUser();
                }
            ],
            [
                '/users/(.*)',
                function(matches) {
                    UserManager.loadProfile(matches[1]);
                }
            ],
            [
                '/toplist/playlists',
                function(matches) {
                    HomeScreen.show('playlists');
                }
            ],
            [
                '/recommendations',
                function(matches) {
                    HomeScreen.show('recommendations');
                }
            ],
            [
                '/queue',
                function(matches) {
                    Queue.getMenuItem().select();
                }
            ],
            [
                '/dropbox',
                function(matches) {
                    Dropbox.getMenuItem().select();
                }
            ],
            [
                '/stream',
                function(matches) {
                    Stream.getMenuItem().select();
                }
            ],

            [
                '/(.+)',
                function(matches) {
                    // Fix for youtube ads screwup
                    if (matches[1].toLowerCase() !== 'doubleclick/dartiframe.html') {
                        UserManager.loadProfile(matches[1]);
                    }
                }
            ],
            [
                '/',
                function(matches) {
                    HomeScreen.menuItem.select();
                }
            ]
        ];

        var i;
        for (i = 0; i < handlers.length; i += 1) {
            var handler = handlers[i];
            var matches = location.pathname.match(handler[0]);
            if (matches) {
                handler[1](matches);
                break;
            }
        }
    }
};
    
