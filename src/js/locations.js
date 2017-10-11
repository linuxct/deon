function getGooglePlaceCountryName (place) {
  if(!place || !place.address_components) {
    return false
  }
  var last = place.address_components[place.address_components.length - 1]
  if(parseInt(last.long_name) > 0) {
    last = place.address_components[place.address_components.length - 2]
  }
  var country = last.long_name
  //TODO: Some kind of search is probably better
  if(country == 'United States') {
    country = 'United States of America'
  }
  return country
}

function getAutoCompleteInputMap (place) {
  var inputs = {
    googleMapsPlaceId: place.place_id,
    lat: place.geometry.location.lat(),
    lng: place.geometry.location.lng(),
    country: getGooglePlaceCountryName(place),
    placeName: place.name,
    placeNameFull: place.formatted_address
  }
  return inputs
}

function initLocationAutoComplete () {
  var options = {
    types: ['(cities)'],
  };
  var inputs = document.querySelectorAll('.location-auto-complete');
  if(inputs == null || inputs.length == 0) {
    return false
  }
  inputs.forEach(function (input) {
    var parent = input.parentElement;
    var autocomplete = new google.maps.places.Autocomplete(input, options);
    google.maps.event.addListener(autocomplete, 'place_changed', function() {
      var place = autocomplete.getPlace()
      var lat = place.geometry.location.lat()
      var lng = place.geometry.location.lng()
      var c = getGooglePlaceCountryName(place)
      parent.querySelector('input[name=googleMapsPlaceId]').value = place.place_id
      var placeNameInput = parent.querySelector('input[name=placeNameFull]')
      if(placeNameInput) {
        placeNameInput.value = place.formatted_address
      }
      var locationName = parent.querySelector('[role="my-location"]')
      if(locationName) {
        locationName.innerHTML = '<strong>' + place.formatted_address + '</strong>'
      }
    });

    google.maps.event.addDomListener(input, 'keydown', function(e) {
      //If they aren't selecting one of the options then enter means submit
      if(document.querySelector('.pac-item.pac-item-selected') == null) {
        return true
      }

      //Otherwise prevent default, cause they're just selecting a location, not submitting the form
      if (e.keyCode == 13) {
        e.preventDefault();
      }
    })
  });
}