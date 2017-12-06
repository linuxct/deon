var artistsToShow = 30;
var songPollsToArtists = {};
Object.keys(artistSongPolls).forEach(function (artistId) {
  songPollsToArtists[artistSongPolls[artistId]] = artistId;
});


function getBestOfSongPolls (done) {
  var songPollIds = Object.keys(artistSongPolls).map(function (key) {
    return artistSongPolls[key];
  })
  requestJSON({
    url: endpoint + '/poll/counts/?ids=' + songPollIds.join(','),
    withCredentials: true
  }, done);
}

function transformBestOf2017Results (obj, done) {
  obj = obj || {};
  done(null, {loading: true});
  requestJSON({
    url: endpoint + '/poll/' + artistPollId + '/breakdown',
    withCredentials: true
  }, function (err, breakdown) {
    if(err) {
      return toasty(new Error(err));
    }
    obj.poll = breakdown.poll;
    transformBestOf2017Results.poll = obj.poll;

    //Map results to the choices in the poll
    var voteResults = breakdown.countsByIndex.map(function (votes, index) {
      return {
        artistId: obj.poll.choices[index],
        votes: votes
      }
    });

    var artistIds = voteResults.map(function (result) {
      return result.artistId
    });

    requestJSON({
      url: endpoint + '/catalog/artists-by-users?ids=' + artistIds.join(','),
      withCredentials: true
    }, function (err, result) {
      if(err) {
        return toasty(new Error(err));
      }
      var atlas = {}
      result.results.forEach(function (result) {
        atlas[result._id] = result;
      })

      obj.results = voteResults.sort(function (a, b) {
        return a.votes > b.votes ? -1 : 1;
      })

      obj.results = obj.results .map(function (result, index) {
        result.artist = atlas[result.artistId];
        result.rank = index + 1;
        return result
      });

      obj.status = breakdown.status;
      obj.showThankYou = getCookie('hideBestOf2017ThankYou') != 'true' && breakdown.status.voted;
      obj.votedForTweet = getVotedForTweet(atlas, breakdown);
      obj.tweetIntentURL = getVotedForTweetIntentUrl(obj.votedForTweet);
      transformBestOf2017Results.artistAtlas = atlas;
      getBestOfSongPolls(function (err, result) {
        var songIds = result.results.reduce(function (ids, result) {
          return ids.concat(result.poll.choices);
        }, []);
        requestJSON({
          url: endpoint + '/catalog/track?ids=' + songIds.join(','),
          withCredentials: true
        }, function (err, result) {
          transformBestOf2017Results.trackAtlas = result.results.reduce(function (atlas, track) {
            track.releaseId = track.albums[0].albumId;
            track.playUrl = getPlayUrl(track.albums, track.releaseId);
            track.downloadLink = getDownloadLink(track.releaseId, track._id);
            atlas[track._id] = track;
            return atlas;
          });
          obj.loading = false;
          done(null, obj);
        });
      })
    });
  });
}
transformBestOf2017Results.poll = {}
transformBestOf2017Results.trackAtlas = {}

function completedBestOf2017Results () {
  var meta = {
    'og:title': 'Monstercat Best of 2017 Results',
    'og:description': 'Monstercat Best of 2017 voting is underway. Have your voice heard, choose the songs that made up the soundtrack to 2017.',
    'og:type': 'website',
    'og:url': 'https://www.monstercat.com/bestof2017/results',
    'og:image': 'https://assets.monstercat.com/bestof2017header.jpg'
  }
  var loadingDiv = document.querySelector('[role=bestof2017-results-loading]');
  if(loadingDiv != null) {
    return
  }
  updateBestOf2017Results.lastUpdated = new Date().getTime();
  var timeoutUpdateResults = null;
  var updateResults = function () {
    if(!window.stopUpdating) {
      updateBestOf2017Results();
    }
    clearTimeout(timeoutUpdateResults);
    if(new Date(transformBestOf2017Results.poll.end) > new Date()) {
      timeoutUpdateResults = setTimeout(updateResults, 30000);
    }
  }
  updateResults();

  var timeoutUpdateTimeNotice = null;
  var updateTimeNotice = function () {
    var now = new Date().getTime();

    var diff = now - updateBestOf2017Results.lastUpdated;
    var diffS = diff / 1000;
    var updatedText = 'Last updated ';
    if(diffS < 10) {
      updatedText += 'just now';
    }
    else if(diffS < 60) {
      updatedText += 'less than a minute ago';
    }
    else if(diffS > 60) {
      var minutes = Math.round(diffS / 60);
      updatedText += minutes + ' minute' + (minutes == 1 ? '' : 's') + ' ago';
    }

    updatedText += '.';

    if(new Date(transformBestOf2017Results.poll.end).getTime() < now) {
      updatedText += ' Voting is closed.';
    }
    else {
      updatedText += ' Voting closes at ' + getBestOf2017EndTime() + '.';
    }

    var el = document.querySelector("[role=last-updated]");
    if(!el) {
      return
    }
    el.innerHTML = updatedText;
    el.classList.toggle('hide', false);
    clearTimeout(timeoutUpdateTimeNotice);
    timeoutUpdateTimeNotice = setTimeout(updateTimeNotice, 1000);
  }
  updateTimeNotice();

  var rows = document.querySelectorAll('.artist-row');
  rows.forEach(function (r) {
    r.addEventListener('click', function (e) {
      var path = e.path;
      for (var i = 0; i < e.path.length; i++) {
        t = e.path[i]
        if (t.hasAttribute && t.hasAttribute('action')) {
          return
        }
      }
      var playButton = r.querySelector('button[play-link]');
      if(playButton) {
        runAction(e, playButton)
      }
    })
  })

  window.addEventListener('popstate', function () {
    clearTimeout(timeout);
    clearTimeout(timeoutUpdateTimeNotice);
  });
}

/**
 * Grabs the vote results and updates the rank/votes/position of all the artists
 * displayed on the page.
 * They are all rendered on page load, and we hide/show them by manipulating
 * their css classes
 */
function updateBestOf2017Results () {
  requestJSON({
    url: endpoint + '/poll/' + artistPollId + '/breakdown',
    withCredentials: true
  }, function (err, result) {

    //Let's build our array of artist results sorted by rank
    var artistResults = result.countsByIndex.map(function (votes, index) {
      //votes = Math.round((Math.random() * 100));//TESTING
      return {
        artistId: result.poll.choices[index],
        votes: votes
      }
    })
    .sort(function (a, b) {
      if (a.votes == b.votes) return 0
      return a.votes > b.votes ? -1 : 1;
    })
    .filter(function (result) {
      if(result == false) {
        return false
      }
      var sel = '.bestof2017-result[artist-id="' + result.artistId + '"]';
      var el = document.querySelector(sel);
      result.el = el;
      return el != null
    })
    .map(function (result, index) {
      result.rank = index+1
      if(!transformBestOf2017Results.artistAtlas[result.artistId]) {
        console.log('Skipping this vote result because artist not found in atlas')
        return false
      }
      transformBestOf2017Results.artistAtlas[result.artistId].rank = result.rank;
      result.artist = transformBestOf2017Results.artistAtlas[result.artistId]
      return result
    });

    //Now we grab all the polls for the songs, one per artist
    getBestOfSongPolls(function (err, result) {
      if(err) {
        console.error('Error getting song polls in updateBestOf2017:', err);
        return
      }

      //Sort these polls by the rank of the artist they are associated with
      var polls = result.results.reduce(function (list, result) {
        var artistId = songPollsToArtists[result.poll._id];
        var artist = transformBestOf2017Results.artistAtlas[artistId];
        if(artist && artist.rank) {
          result.artist = artist;
          list.push(result);
        }

        return list
      }, []).sort(function (pollA, pollB) {
        if(pollA.artist.rank == pollB.artist.rank) {
          return 0
        }

        return pollA.artist.rank > pollB.artist.rank ? 1 : -1;
      });

      //Get the top songs by going down the ranking of artists and checking each artist
      //for their top song that hasn't already been taken by a previous artist
      //Skip artists whose songs are already ranking in top 30 by another artist
      var topSongIds = [];
      var artistsToDemote = []
      var topUniqueSongs = polls.reduce(function (allTopSongs, poll, pollIndex) {
        if(allTopSongs.length == artistsToShow) {
          return allTopSongs
        }
        var artistTopSongs= Object.keys(poll.countsByValue).map(function (songId, index) {
          var track = transformBestOf2017Results.trackAtlas[songId];
          var votes = poll.countsByValue[songId];
          //var votes = Math.round((Math.random() * 100));//TESTING
          return {
            track: track,
            votes: votes
          }
        })
        .filter(function (r) {
          return r.votes > 0 && r.track
        })
        .sort(function (a, b) {
          if(a.votes == b.votes) {
            return 0;
          }
          return a.votes > b.votes ? 1 : -1;
        });

        var topSong;
        var songIndex = 0;
        //Find the next top song by going until we find one that hasn't already been added
        //If we run out of songs we stop then as well
        do {
          if(artistTopSongs[songIndex]) {
            topSong = artistTopSongs[songIndex]
          }
          else{
            topSong = false;
          }
          songIndex++;
        }
        while(topSong && topSongIds.indexOf(topSong.track._id) >= 0);

        if(!topSong) {
          artistsToDemote.push(poll.artist._id);
          return allTopSongs;
        }

        topSongIds.push(topSong.track._id);
        allTopSongs.push(topSong);
        return allTopSongs;
      }, []);

      //Resort all of the artists, making sure to put demoted ones on the bottom
      artistResults = artistResults.sort(function (a, b) {
        var demoteA = artistsToDemote.indexOf(a.artistId) >= 0;
        var demoteB = artistsToDemote.indexOf(b.artistId) >= 0;

        if(demoteA && !demoteB) {
          return 1;
        }

        if(demoteB && !demoteA) {
          return -1;
        }

        return a.rank < b.rank ? -1  : 1;
      });

      //Redo the ranking now that some artists might have moved around
      artistResults = artistResults.map(function (ar, index) {
        ar.rank = index + 1;
        ar.track = topUniqueSongs[index] ? topUniqueSongs[index].track : false;
        return ar
      });

      //Update vote and rank text and CSS classes
      var numUpdated = 0;
      artistResults.forEach(function (result, index) {
        var artistId = result.artist._id;
        var rank = result.rank;
        var el = result.el;
        if(!el) {
          return;
        }

        updateArtistRowElRank(el, rank);
        numUpdated++;
        el.classList.toggle('top', rank <= artistsToShow);
        var votesEl = el.querySelector('[role=votes]');
        votesEl.innerHTML = result.votes + ' vote' + (result.votes == 1 ? '' : 's');
        renderArtistRowTrack(artistId, result.track);
      });


      var resultContainer = document.querySelector('.bestof2017-results');
      if(resultContainer) {
        resultContainer.classList.toggle('loading', false);
      }
      //Here we are updating the indexes of the play butons based on their
      //display order, which will match the order of artistRows since it was sorted above
      //Note: display order is based on classes, not position in HTML
      var trackIndex = 0;
      artistResults.forEach(function (ar, artistIndex) {
        var playButton = ar.el.querySelector('button[index][play-link]')
        if(ar.track) {
          if(playButton) {
            playButton.setAttribute('index', trackIndex);
            trackIndex++;
          }
        }
      });

      //We need to clear out the player and rebuild its list of items
      //so that when it hits the end it plays the NEW next song
      //If you play song #5 and it moves to #3 before it's done
      //the next song to autoplay should be #4

      //Grab the tracks from the dom. Some new ones may have been added
      //These are sorted by the [index] property on the button
      var playableTracks = buildTracks();

      playableTracks = playableTracks.map(function (track) {
        track.skip = false; //skip will hide unlicensable tracks from licensees, so we turn it off
        return track;
      })

      //If the player is currently playing or loading a song, we need to update the index of the player
      //to match the new position of the song, because it may have moved
      //We do this by going through the new list of songs built from the HTML until we
      //find the song that matches the trackId of what's currently in the player
      var newIndex = -1;
      if(player.playing || player.loading) {
        var currentSong = player.items[player.index]
        var found = false;
        for(var i = 0; i < playableTracks.length; i++) {
          var t= playableTracks[i];
          if(t.trackId == currentSong.trackId) {
            newIndex = i;
            found = true;
            break;
          }
        }

        //If the song they were listening to is no longer on the page, then put their location as before the first place song
        if(!found) {
          player.index = -1;
        }
        else {
          player.index = newIndex;
        }
      }

      player.set(playableTracks);
      if(newIndex > -1) {
        player.index = newIndex;
      }
      updateControls();
    });

    //updateBestOf2017SongResults();
    updateBestOf2017Results.lastUpdated = new Date().getTime();
  });
}

function updateArtistRowElRank (el, rank) {
  var rankEl = el.querySelector('[role=rank]');
  rankEl.innerHTML = rank
  var cls = el.getAttribute('class');
  cls = cls.replace(/rank-[0-9]+/, '')
  cls += ' rank-' + rank;
  el.setAttribute('class', cls);
  el.setAttribute('rank', rank);
}

function renderArtistRowTrack (artistId, track) {
  var sel= '.artist-row[artist-id="' + artistId+ '"]';
  var el = document.querySelector(sel);
  if(!el) {
    console.warn('No el for this artistRow')
    return
  }
  var topSongEl = el.querySelector('[role=top-song]')

  if(track) {
    el.classList.toggle('no-top-song', false);
    track.streamable = true;
    track.releaseId = track.albums[0].releaseId
    var votes = track.votes + ' vote' + (track.votes == 1 ? '': 's');
    track.hasGold = hasGoldAccess();
    render(topSongEl, getTemplate('bestof2017-topsong'), track);
    updateArtistRowReleaseArt(artistId, track);
  }
  else {
    el.classList.toggle('no-top-song', true);
    render(topSongEl, getTemplate('bestof2017-topsong'), false);
  }

}

var artistPollChoices = [];
function transformBestOf2017 (obj, done) {
  obj = obj || {}
  obj.hasVoted = false;
  obj.isSignedIn = isSignedIn();
  obj.artistBlocks = [];
  for(var i = 0; i < 10; i++) {
    obj.artistBlocks.push(i);
  }
  requestJSON({
    url: endpoint + '/poll/' + artistPollId + '/breakdown',
    withCredentials: true
  }, function (err, breakdown) {
    var poll = breakdown.poll;
    var ids = poll.choices.join(',');
    artistPollChoices = poll.choices;
    obj.status = breakdown.status;
    requestJSON({
      url: endpoint + '/catalog/artists-by-users?ids=' + ids,
      withCredentials: true
    }, function (err, result) {
      transformBestOf2017.artists = result.results.sort(function (a, b) {
        aname = a.name.toUpperCase();
        bname = b.name.toUpperCase();
        if (aname == bname){
          return 0
        }

        return aname < bname ? -1 : 1
      })
      transformBestOf2017.artistAtlas = {}
      transformBestOf2017.artists = transformBestOf2017.artists.map(function (artist) {
        artist.pollId = artistSongPolls[artist._id];
        transformBestOf2017.artistAtlas[artist._id] = artist;
        return artist
      })
      obj.artistOptions = [{_id: "-1", name: 'select an artist'}].concat(transformBestOf2017.artists);
      obj.votedForTweet = getVotedForTweet(transformBestOf2017.artistAtlas, breakdown);
      obj.tweetIntentURL = getVotedForTweetIntentUrl(obj.votedForTweet);
      obj.viewResultsLink = true;
      obj.votingCloseTime = getBestOf2017EndTime(poll.end)
      done(null, obj);
    });
  });
}

function getBestOf2017EndTime (date) {
  return 'Thursday, Dec 7th @ 11:59 PM PST';
}


function getArtistDetails (vanityUri, done) {
  if(getArtistDetails.atlas[vanityUri]) {
    return done(null, getArtistDetails.atlas[vanityUri])
  }

  if(vanityUri === undefined) {
    return done('No vanityUri');
  }

  requestJSON({
    url: endpoint + '/catalog/artist/' + vanityUri
  }, function (err, artist) {
    if(err) {
      return done(err);
    }

    getArtistDetails.atlas[vanityUri] = artist;
    return done(null, getArtistDetails.atlas[vanityUri])
  })
}
getArtistDetails.atlas = {}

function changeBestOf2017Song (e) {
  var artistId = this.getAttribute('artist-id');
  var songs = transformBestOf2017.artistAtlas[artistId].tracks;
  var song = songs[this.value];
  updateArtistRowReleaseArt(artistId, song);
}

function updateArtistRowReleaseArt (artistId, song) {
  var artistRowEl = document.querySelector('.artist-row[artist-id="' + artistId + '"]');
  var banner = artistRowEl.querySelector('.banner');

  if(!song) {
    artistRowEl.classList.toggle('empty', true);
    banner.classList.toggle('on', false);
    banner.setAttribute('release', '');
    banner.style.backgroundImage = '';
    return
  }
  if(artistRowEl.getAttribute('track-id') == song._id) {
    return
  }
  artistRowEl.setAttribute('track-id', song._id);
  var releaseIds = song.albums.map(function (alb) {
    return alb.albumId;
  });
  requestJSON({
    url: endpoint + '/catalog/release?ids=' + releaseIds.join(',') + '&sortOn=releaseDate&sortValue=1&limit=1'
  }, function (err, result) {
    if(err) {
      return console.error(err);
    }

    //Here we are loading up the album art of the first release that this song appeared on
    //Doing it with a new Image() call allows us to fade it in after the image is fully loaded
    var album = result.results[0];
    var slug = slugify(album.title + ' ' + album.renderedArtists);
    var img = new Image();
    img.onload = function () {
      banner.setAttribute('release', slug)
      banner.style.backgroundImage = 'url("' + img.src + '")';
      banner.classList.toggle('on', true);
      artistRowEl.classList.toggle('empty', false);
    }
    img.src = album.coverUrl + '?image_width=1024';
  });
}

function completedBestOf2017 () {
  var meta = {
    'og:title': 'Monstercat Best of 2017',
    'og:description': 'Monstercat Best of 2017 voting is underway. Have your voice heard, choose the songs that made up the soundtrack to 2017.',
    'og:type': 'website',
    'og:url': 'https://www.monstercat.com/bestof2017',
    'og:image': 'https://assets.monstercat.com/bestof2017header.jpg'
  }
  setMetaData(meta)
  var artistSelects = document.querySelectorAll('select[role=bestof2017-artist]')
  artistSelects.forEach(function (el, index) {
    el.addEventListener('change', function (e) {
      if(!isSignedIn()) {
        go('/sign-in?redirect=bestof2017')
        toasty('Log in or sign up to vote on Best of 2017');
        return
      }
      var artistId = el.value
      var artistRowEl = document.querySelector('.artist-row-' + index);
      var songArtistNameEl = document.querySelector('.artist-row-' + index + ' span[role=artist-name]')
      var artistNameEl = document.querySelector('.artist-row-' + index + ' h3[role=artist-name]')
      var songEl = document.querySelector('.artist-row-' + index + ' select[role=song-poll]')
      var bannerEl = artistRowEl.querySelector('.banner')

      if(artistId && artistId != "-1") {
        artistRowEl.classList.toggle('no-artist', false);
        artistRowEl.setAttribute('artist-id', artistId);
        var data = getBestOf2017FormData();
        var otherSelectedArtists = data.artist.reduce(function (list, id, i) {
          if(index != i) {
            list.push(id);
          }
          return list
        }, []);

        if(otherSelectedArtists.indexOf(artistId) >= 0) {
          toasty(new Error("Cannot select the same artist twice"));
          el.value = "-1"
          var event = document.createEvent("HTMLEvents");
          event.initEvent("change",true,false);
          el.dispatchEvent(event);
          return false
        }

        var artist = transformBestOf2017.artistAtlas[artistId];
        songArtistNameEl.innerHTML = artist.name;
        artistNameEl.innerHTML = artist.name;
        songEl.innerHTML = '<option>loading...</option>';
        songEl.disabled = false;
        songEl.setAttribute('artist-id', artistId);

        getArtistDetails(artist.vanityUri, function (err, details) {
          if(err) {
            bannerEl.classList.toggle('on', false);
            bannerEl.style.backgroundImage = '';
            artistRowEl.classList.toggle('empty', true);
            return
          }
        });
      }
      else {
        songArtistNameEl.innerHTML = '';
        artistNameEl.innerHTML = 'Select an Artist';
        artistRowEl.removeAttribute('artist-id');
        artistRowEl.classList.toggle('no-artist', true);
        artistRowEl.classList.toggle('empty', true);
        songEl.innerHTML = '';
        songEl.disabled = true;
        bannerEl.style.backgroundImage = '';
        return
      }

      var songPollId = artistSongPolls[artistId];
      requestJSON({
        url: endpoint + '/poll/' + songPollId
      }, function (err, poll) {
        if(err) {
          return toasty(new Error(err))
        }
        var trackIds = poll.choices
        transformBestOf2017.artistAtlas[artistId].pollChoices = poll.choices;//Need these preserved in the order in the poll since we vote using indexes
        requestJSON({
          url: endpoint + '/catalog/track?ids=' + trackIds.join(',')
        }, function (err, result) {
          if(err) {
            return toasty(new Error(err));
          }
          transformBestOf2017.artistAtlas[artistId].tracks = result.results.reduce(function (atlas, row) {
            atlas[row._id] = row;
            return atlas;
          }, {});
          songEl.removeEventListener('change', changeBestOf2017Song);
          songEl.addEventListener('change', changeBestOf2017Song);

          var options = result.results.sort(function (ta, tb) {
            if (ta.title == tb.title) {
              return 0
            }

            return ta.title > tb.title ? 1 : -1;
          }).map(function (track) {
            return '<option value="' + track._id + '">' + track.title + ' by ' + track.artistsTitle + '</option>'
          });

          if(options.length > 1) {
            songEl.innerHTML = '<option value=0>select a song</option>' + options;
            //
          }
          else {
            songEl.innerHTML = options;
          }

          changeBestOf2017Song.call(songEl);
          songEl.disabled = false
        });
      });
    });
  });
  hookBestOfTweetButton();
}

function hookBestOfTweetButton () {
  var tweetText = document.querySelector('[name=tweet]');
  if(!tweetText) {
    return
  }
  var tweetButton = document.querySelector('a[role=tweet]');
  function updateTweetIntent () {
    var url = getVotedForTweetIntentUrl(tweetText.value);
    tweetButton.setAttribute('href', url);
  }
  tweetText.addEventListener('keyup', updateTweetIntent);
  updateTweetIntent();
}

function getBestOf2017FormData () {
  var form = document.querySelector('form[role=bestof2017]')
  var data = formToObject(form);
  return data
}

function clickSubmitBestOf2017 (e) {
  var data = getBestOf2017FormData();
  var dupe = false;
  var songVotes = {};
  var pollVotes = [];
  var missingSongVotes = [];
  var artistVotes = Object.keys(data.artist).reduce(function (list, index) {
    if(data.artist[index] && data.artist[index] != "-1") {
      var artistId = data.artist[index];

      //Check for a dupe and set dupe to true so we can use it for err messages
      if(list.indexOf(artistId) >= 0) {
        dupe = true;
        return []
      }
      else {
        //We vote with the index of the choice, so find this artist's id in the choices of the poll
        list.push(artistPollChoices.indexOf(artistId));
        var artist =  transformBestOf2017.artistAtlas[artistId];

        //Only add their song vote if they've picked something
        if(data.artistSongs[index] && data.artistSongs[index] != "0") {
          var songId = data.artistSongs[index];
          pollVotes.push({
            pollId: artist.pollId,
            choices: [artist.pollChoices.indexOf(songId)],
            type: 'song',
            artist: artist,
            song: artist.tracks[songId]
          });
        }
        else {
          missingSongVotes.push(artist.name);
        }
      }
    }
    return list
  }, []);

  if(missingSongVotes.length) {
    return toasty(new Error('Please select your favorite song' + (missingSongVotes.length == 1 ? '' : 's') + ' for ' + commaAnd(missingSongVotes) + '.'))
  }

  if (artistVotes.length == 0) {
    if(dupe) {
      toasty(new Error('You can only vote for each artist once'));
    }
    else {
      toasty(new Error('You need to select at least one artist'));
    }
    return
  }

  //This section is preventing you from voting for a song twice
  //This can happen when two artists work on the same song
  var songIdVotes = [];
  var songArtistVotes = [];
  var dupeSongs = false;
  pollVotes.forEach(function (pv) {
    var songId = pv.song._id;
    var index = songIdVotes.indexOf(songId);
    if(index >= 0) {
      toasty(new Error('Sorry, but you can\'t vote for the same song twice. Your vote for <em>' + pv.song.title + '</em> is already under ' + songArtistVotes[index] + '.'));
      dupeSongs = true;
    }
    else {
      songIdVotes.push(songId);
      songArtistVotes.push(pv.artist.name);
    }
  });

  if(dupeSongs) {
    return
  }

  pollVotes.push({
    pollId: artistPollId,
    choices: artistVotes,
    type: 'artist'
  });

  var callbacks = 0;
  pollVotes.forEach(function (item) {
    requestJSON({
      url: endpoint + '/vote',
      method: 'POST',
      data: {
        pollId: item.pollId,
        choices: item.choices
      },
      withCredentials: true
    }, function (err, obj) {
      callbacks++
      if (err) return toasty(Error(err.message))
      else {
        //Last callback
        if(callbacks == pollVotes.length) {
          toasty('Voting successful!')
          go('/bestof2017')
        }
      }
    })
  });
}

function getVotedForTweetIntentUrl (tweet) {
  return 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(tweet);
}

function getVotedForTweet (artistAtlas, breakdown) {
  if(breakdown.status.voted) {
    artists = breakdown.userVotes[0].choicesByValue.map(function (aid) {
      var artist = artistAtlas[aid];
      return artist
    });
  }
  else {
    return false
  }
  var tweet = 'My @Monstercat Best of 2017 artists are ' + artists.map(function (artist) {
    return getArtistTwitterMention(artist)
  }).join(' ') + '';

  var link = 'https://monstercat.com/bestof2017';
  if(tweet.length + link.length < 281) {
    tweet += ' ' + link;
  }

  var hashtag = ' #McatBestof2017'
  if(tweet.length + hashtag.length <= 280) {
    tweet += hashtag;
  }

  return tweet;
}

function clickCloseBestOf2017ThankYou () {
  setCookie('hideBestOf2017ThankYou', "true");
  var alert = document.querySelector('[role=thank-you-alert]');
  alert.classList.toggle('hide', true);
}

/* These are functions I used to fiddle with the position of releases to get the best looking */
function move (dir) {
  var el = document.querySelector('.banner[release]');
  var y = window.getComputedStyle(el).backgroundPositionY;
  y = y.replace('%', '');
  y = parseFloat(y);
  y += dir;
  el.style.backgroundPositionY = y + '%';
  console.log(`.banner[release=` + el.getAttribute('release') + `] {
  background-position-y: ` + y + `%;
}`)
}

function reset () {
  var el = document.querySelector('.banner[release]');
  el.style.backgroundPositionY = null;
}

function down (num) {
  num= num || -0.5
  move(num * -1);
}

function up (num) {
  num = num || 0.5;
  move(num);
}