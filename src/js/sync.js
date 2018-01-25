function getSyncClients () {
  return [{
    filename: 'Apple.png',
    url: 'https://www.apple.com'
  }, {
    filename: 'MTV.png',
    url: 'http://www.mtv.com/'
  }, {
    filename: 'T-mobile.png',
    url: 'https://www.t-mobile.com/'
  }, {
    filename: 'Toyota.png',
    url: 'http://www.toyota-global.com/'
  }, {
    filename: 'netflix.png',
    url: 'https://netflix.com'
  }, {
    filename: 'UBISOFT.png',
    url: 'https://ubisoft.com'
  }];
}

function transformSyncPage () {
  var obj = {};
  obj.projects = [{
    name: 'Apple Watch',
    youTubeId: 'B3iLFckm-oU',
    thumbnail: 'apple.jpg'
  }, {
    name: 'Body Combat',
    youTubeId: 'ErzmFWc98Tw',
    thumbnail: 'body%20combat.jpg'
  }, {
    name: 'Gogoro',
    youTubeId: 'XZ04IYATpAU',
    thumbnail: 'gogoro.jpg'
  }, {
    name: 'GoPro',
    thumbnail: 'gopro.jpg',
    youTubeId: '9qRqfWJ6ONU'
  }, {
    name: 'Nintendo Switch',
    youTubeId: 'X5V6x3lpGlY',
    thumbnail: 'nintendo%20switch.jpg'
  }, {
    name: 'Washington Post',
    youTubeId: 'knaOIBmL6cg',
    thumbnail: 'wp.jpg'
  }];

  obj.clients = getSyncClients();

  obj.projects = obj.projects.map(function (proj) {
    proj.thumbnailUrl = 'https://assets.monstercat.com/sync/projects/' + proj.thumbnail
    return proj
  });

  return obj;
}

function transformSyncTracks (result, done) {
  result.results = result.results.map(function (track, index) {
    track = mapReleaseTrack(track, index);
    track.release = mapRelease(track.release);
    track.playUrl = getPlayUrl(track.albums, track.release._id);
    track.index = index;
    return track;
  }, []);
  //Sort by date
  result.results = result.results.sort(function (a, b) {
    if(a.release.releaseDate == b.release.releaseDate) {
      return 0;
    }
    return new Date(a.release.releaseDate).getTime() > new Date(b.release.releaseDate).getTime() ? 1 : -1;
  });
  var trackIds = [];
  //Remove dupes (dupes are returned when tracks are on multiple releases)
  result.results = result.results.filter(function (track) {
    if(trackIds.indexOf(track._id) >= 0 || trackIds.length == 6) {
      return false
    }
    trackIds.push(track._id);
    return true;
  });
  //Fix indexes after removing dupes
  result.results = result.results.map(function (track, index) {
    track.index = index;
    return track;
  })
  return done(null, result);
}

function openSyncProjectModal (e) {
  var anchor = findParentWith(e.target, 'a');
  var youTubeId = anchor.getAttribute('youtube-id');
  var src = 'https://www.youtube.com/embed/' + youTubeId + '?autoplay=1';
  var scope = {
    name: anchor.getAttribute('project-name'),
    src: src
  }

  openModal('sync-project-modal', scope);
}


function submitSyncContactForm (e, el) {
  e.preventDefault();
  var data = getTargetDataSet(el)
  data.date = new Date().toISOString()
  var fullname = data.fullName,
      email = data.email,
      songs = data.songs;
  var ef = document.querySelector('#errorForm')
  ef.classList.remove('shown')
  if (fullname && email && songs){
    requestWithFormData({
      url: "https://google-sheet.monstercat.com/1us0PqnmbgeCsrgDpYXIxEB3mX0VtzG-IwZjmwD2iqWI/3",
      data: data,
      method: 'POST'
    }, function (err, resp) {
      if(err) {
        ef.innerText = "There's been an error. Please try again later."
        ef.classList.add('shown')
        return
      }
      else {
        ef.classList.remove('shown')
        document.querySelector('#submitBtn').value = 'Success!'
        document.querySelector('#submitBtn').classList.add('submitted')
        toasty.success('Sent!')
      }

    })
  } else{
    ef.innerText = "Please fill out your name, email and the songs required."
    ef.classList.add('shown')
  }
}