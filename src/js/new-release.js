//Links from higher priority platforms will appear higher on the page
var RELEASE_LINK_MAP = {
  spotify: {
    label: 'Listen on Spotify',
    icon: 'spotify',
    cta: 'Play',
    priority: 100
  },
  itunes: {
    cta: 'Download',
    label: 'Download on iTunes',
    icon: 'apple',
    priority: 90,
    oldLabel: 'Download On iTunes'
  },
  applemusic: {
    cta: 'Play',
    icon: 'apple',
    label: 'Apple Music',
    priority: 80
  },
  googleplay: {
    cta: 'Download',
    label: 'Get on Google Play',
    oldLabel: 'Get on Google Play',
    icon: 'google',
    priority: 70
  },
  bandcamp: {
    cta: 'Download',
    label: 'Buy on Bandcamp',
    oldLabel: 'Buy from Bandcamp',
    icon: 'bandcamp',
    priority: 60
  },
  soundcloud: {
    cta: 'Listen',
    label: 'Listen on SoundCloud',
    icon: 'soundcloud',
    priority: 50
  },
  youtube: {
    cta: 'Watch',
    label: 'Watch on YouTube',
    icon: 'social-y',
    priority: 40
  },
  beatport: {
    cta: 'Get',
    icon: 'link',
    label: 'Get on Beatport',
    oldLabel: 'Get From Beatport',
    priority: 30
  },
  mixcloud: {
    cta: 'Get',
    icon: 'link',
    label: 'Get on Mixcloud',
    priority: 20
  }
}

/**
 * Returns a no-dupe list of all artists website details on the given tracks
 *
 * @param tracks List of tracks returned by /api/catalo/browse with the artistDetails property
 * @returns {Array[Object]}
 */
function getAllTracksWebsiteArtists (tracks) {
  var artists = [];
  var artistIds = [];
  tracks.forEach(function (track) {
    track.artistDetails.forEach(function (artist) {
      if (artistIds.indexOf(artist._id) == -1) {
        artists.push(transformWebsiteDetails(artist));
        artistIds.push(artist._id);
      }
    })
  })

  return artists;
}

/**
 * Returns a no-dupe list of all artists user details on the given tracks
 *
 * @param tracks List of tracks returned by /api/catalo/browse with the artistUsers property
 * @returns {Array[Object]}
 */
function getAllTracksArtistsUsers (tracks) {
  var users = [];
  var userIds = [];
  tracks.forEach(function (track) {
    track.artistUsers.forEach(function (user) {
      if (userIds.indexOf(user._id) == -1) {
        users.push(user);
        userIds.push(user._id);
      }
    })
  })
  return users;
}

/**
 * Transforms merch products returned from shopify
 *
 * @param {Object} obj Result of request to shopify
 * @returns {Object}
 */
function transformReleaseMerch (obj) {
  shuffle(obj.products)
  obj.products = obj.products.slice(0,8)
  obj.products = obj.products.map(function (prod) {
    prod.utm = '?utm_source=website&utm_medium=release_page'
    return prod
  })
  obj.activeTest = transformReleasePage.scope.activeTest
  return obj
}

/**
 * Transforms the result of getting events of artists on this release.
 *
 * @param {Object} obj
 * @param {Array[Object]} obj.results The events
 * @param {Object}
 */
function transformReleaseEvents (obj) {
  var scope = transformReleasePage.scope
  obj.results = transformEvents(obj.results)
  obj.results = obj.results.slice(0, 10)
  obj.artistsList = scope.releaseArtists
  obj.listArtists = scope.releaseArtists.length <= 4;

  return obj;
}

function getArtistsTwitters (artists) {
  artists.reduce(function (handles, artist) {
    if (artist.socials) {
      artist.socials.forEach(function (social) {
        if(social.platform == 'twitter') {
          handles.push({
            handle: getTwitterLinkUsername(social.link).substr(1)
          })
        }
      })
    }
    return handles
  }, [])
}

/**
 * Transforms the new release page
 *
 * @param {Object} obj Result of the request to get the release
 * @param {Function} done
 */
function transformReleasePage (obj, done) {
  var scope = {
    release: mapRelease(obj)
  }

  requestJSON({
    url: endpoint + '/catalog/browse/?albumId=' + scope.release._id,
    withCredentials: true
  }, function (err, body) {
    if (err) {
      return done(err);
    }
    transformTracks(body.results, function (err, tracks) {
      tracks = tracks.map(function (track, index) {
        track.trackNumber = index + 1;
        return track;
      })
      if(err) {
        return done(err);
      }

      scope.releaseArtists = getAllTracksWebsiteArtists(tracks)
      scope.releaseArtistUsers = getAllTracksArtistsUsers(tracks)
      scope.releaseArtistsLimited = scope.releaseArtists.length <= 6 ? scope.releaseArtists.slice() : []
      scope.moreReleasesFetchUrl = endpoint +
        '/catalog/browse?types=Single,EP,Album&limit=10&artistIds=' +
        scope.releaseArtistUsers.map(x => x._id)

      //All of the twitter handles of the artists, so we can create Twitter follow buttons
      scope.artistTwitters = getArtistsTwitters(scope.releaseArtists)

      scope.coverImage = scope.release.cover;
      scope.tracks = tracks;
      scope.hasGoldAccess = hasGoldAccess()
      scope.artistIds = scope.releaseArtists.map(wd => wd._id).join(',')
      setPageTitle(scope.release.title + ' by ' + scope.release.renderedArtists)

      //For testing purposes you can turn on certain features with a hash in the link
      var feature = window.location.hash.substr(1);
      //feature = 'artistsEvents';
      scope.feature = {
        merch: false,
        tweet: false,
        gold: false,
        twitterFollowButtons: false,
        moreFromArtists: false,
        artistsEvents: false
      }

      /*if (feature) {
        scope.feature[feature] = true
      }
      else {
        scope.feature = false
      }*/
      splittests.release1FeatureOrder = new SplitTest({
        name: 'release-1-featuresorder',
        dontCheckStarter: true,
        modifiers: {
          'gold-merch-more': function (_this) {
            scope.features = [{
              gold: true
            }, {
              merch: true
            }, {
              moreFromArtists: true
            }]
          },
          'merch-gold-more' : function (_this) {
            scope.features = [{
              merch: true
            }, {
              gold: true
            }, {
              moreFromArtists: true
            }]
          },
          'more-merch-gold' : function (_this) {
            scope.features = [{
              moreFromArtists: true
            }, {
              merch: true
            }, {
              gold: true
            }]
          }
          ,
          'more-gold-merch' : function (_this) {
            scope.features = [{
              moreFromArtists: true
            }, {
              gold: true
            }, {
              merch: true
            }]
          }
        },
        onStarted: function () {
          scope.activeTest = 'release1FeatureOrder'
          transformReleasePage.scope = scope;
          done(null, scope)
        }
      })
      splittests.release1FeatureOrder.start()
      //done(null, scope);
    });
  });
}

function completedReleasePage () {
  startCountdownTicks();

  var followButtons = document.querySelectorAll('[twitter-follow]');
  followButtons.forEach(function (el) {
    twttr.widgets.createFollowButton(
      el.getAttribute('twitter-follow'),
      el,
      { size: 'large' }
    )
  })

  //TODO: Store tweet IDs in releases and check them here
  /*
  var tweetContainer = document.getElementById('release-official-tweet')
  if (tweetContainer) {
    twttr.widgets.createTweet(
      '963485399766122501',
      tweetContainer,
      {
        theme: 'light'
      }
    )
  }
  */
}

function transformMoreReleases (obj, done) {
  var pageScope = transformReleasePage.scope
  transformTracks(obj.results, function (err, tracks) {
    if (err) {
      done(err)
      return
    }
    shuffle(tracks)
    tracks = tracks.filter((x) => {
      return x.release._id != pageScope.release._id
    }).splice(0, tracks.length >= 8 ? 8 : 6)
    var scope = {
      results: tracks,
      activeTest: pageScope.activeTest,
      showArtistsList: pageScope.releaseArtistUsers.length <= 4,
      artistsList: pageScope.releaseArtists
    }
    done(null, scope)
  })
}
