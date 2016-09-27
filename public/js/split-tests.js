var supportThisReleaseButtonsTest = new SplitTest({
  getButtons: function () {
    var buttons = document.querySelectorAll('.modal--release ul li a')
    return buttons
  },
  name: 'support-this-release-buttons',
  modifiers: {
    'button': function () {
      //control
    },
    'button--cta': function (_this) {
      var buttons = _this.getButtons()
      for(var i = 0; i < buttons.length; i++) {
        buttons[i].classList.add('button--cta')
      }
    }
  },
  checkStart: function (test) {
    return document.querySelector('.modal--release') != null
  },
  onStarted: function () {
    var buttons = this.getButtons()
    for(var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', function () {
        this.convert()
      }.bind(this))
    }    
  }
})

var homePageViewReleaseButton = new SplitTest({
  name: 'home-page-view-release-button',
  checkStart: function () {
    var matches = window.location.pathname.match('^\/?$')
    return matches && document.querySelector('.featured-details') != null
  },
  onStarted: function () {
    document.querySelector('.featured-details .button--cta').addEventListener('click', function () {
      this.convert()
    }.bind(this))
  },
  modifiers: {
    'view-this': function () {
      document.querySelector('.featured-details .button--cta').innerHTML = 'View <i class="fa fa-chevron-right"></i>'
    },
    'check-it-out': function () {
      document.querySelector('.featured-details .button--cta').innerHTML = 'Check It Out <i class="fa fa-chevron-right"></i>'
    }
  }
});
