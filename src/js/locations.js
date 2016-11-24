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

function initLocationAutoComplete (input, options) {
  options = options || {}
  var defaults = {
    types: ['(cities)'],
  };
  for(var key in defaults) {
    options[key] = options.hasOwnProperty(key) ? options[key] : defaults[key]
  }
  var autocomplete = new google.maps.places.Autocomplete(input, options)

  google.maps.event.addListener(autocomplete, 'place_changed', function() {
    var place = autocomplete.getPlace()
    var inputs = getAutoCompleteInputMap(place)
    for(var name in inputs) {
      document.querySelector('input[name=' + name + ']').value = inputs[name]
    }
    var locationNames = document.querySelectorAll('[role="my-location"]')
    if(locationNames && locationNames.length > 0) {
      for(var i = 0; i < locationNames.length; i++) {
        locationNames[i].innerHTML = '<strong>' + place.formatted_address + '</strong>'
      }
    }
  });
  //Prevent hitting enter to select autocomplete option from submitting the form
  google.maps.event.addDomListener(input, 'keydown', function(e) { 
    if (e.keyCode == 13) { 
      e.preventDefault(); 
    }
  });
  return autocomplete
}