Stream = {
    $rightView: null,
    $tracklist: null,
    menuItem: null,
    cursor: "",
    tracks: [],

    init: function() {
        var self = Stream;
        self.$rightView = $('#right > .stream');
        self.$tracklist = $('#right > .stream .tracklist');
        if (UserManager.currentUser && UserManager.currentUser.soundcloudUserName) {
            self.menuItem = new MenuItem({
                cssClasses: ['stream'],
                title: TranslationSystem.get('Soundcloud Stream'),
                $contentPane: self.$rightView,
                onSelected: function() {
                    if (self.isEmpty()) {
                        self.loadTracks();
                        self.show();
                    }
                    history.pushState(null, null, '/stream');
                    if (self.isEmpty()) {
                        self.$rightView.find('.help-box').show();
                    } else {
                        self.$rightView.find('.help-box').hide();
                    }
                },
                translatable: true
            });
            Menu.getGroup('misc').addMenuItem(self.menuItem);
        }


        (function() {
            var timeout;
            self.$rightView.scroll(function(event) {
                if (timeout) {
                    clearTimeout(timeout);
                }
                timeout = setTimeout(function() {
                    var $pane = $('#right .stream .tracklist');
                    if (self.$rightView.scrollTop() >= ($pane.height() - self.$rightView.height()))
                        self.loadTracks();
                }, 100);
            });
        }());
    },
    show: function() {
        Stream.$rightView.show();
        history.pushState(null, null, '/stream');
    },
    isEmpty: function() {
        var self = this;
        return self.tracks === null || self.tracks.length === 0;
    },
    getMenuItem: function() {
        return this.menuItem;
    },
    loadTracks: function() {
        var self = Stream,
            list = function() {
                $.getJSON('/soundcloud/stream?cursor=' + self.cursor, function(data) {
                    self.cursor = data.cursor;
                    var results = Search.getVideosFromSoundCloudSearchData(data.tracks);
                    $.each(results, function(i, video) {
                        if (video) {
                            video.createListView().appendTo(self.$tracklist);
                            self.tracks.push(video);
                        }
                    });

                    self.$tracklist.data('results-count', results.length);

                    if (results.length >= Search.itemsPerPage) {
                        self.$tracklist.addClass('has-more');
                    } else {
                        self.$tracklist.removeClass('has-more');
                    }

                    LoadingBar.hide();
                });
            };
        LoadingBar.show();
        list();
    }
};