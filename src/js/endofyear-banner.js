/*
👀 👀 👀 👀 👀 👀 👀 👀 👀 👀 👀 👀 👀
Hey no peeking! The sale is a surprise ;)
👀 👀 👀 👀 👀 👀 👀 👀 👀 👀 👀 👀 👀
*/
var endOfYearCountdown;
document.addEventListener('DOMContentLoaded', function() {
  endOfYearCountdown = new CountdownBanner('endofyear', {
    /**/
    revealDate: new Date("Sat Dec 23 2017 00:01:00 GMT-0500 (EST)"),
    startDate: new Date("Tue Dec 26 2017 09:00:00 GMT-0500 (EST)"),
    endDate: new Date("Sun Dec 31 2017 23:59:59 GMT-0500 (EST)"),
    /**/
    /**
    revealDate: new Date(new Date().getTime() - 1000),
    startDate: new Date(new Date().getTime() + 3000),
    endDate: new Date(new Date().getTime() + 1200000 * 200),
    /**/
    urlInfo: 'https://shop.monstercat.com/pages/yearendsale?utm_source=WebsiteBanner&utm_campaign=EOY',
    urlButton: 'https://shop.monstercat.com/pages/yearendsale?utm_source=WebsiteBannerButton&utm_campaign=EOY',
    buttonLabel: 'Go to Shop',
    infoTemplate: 'endofyear-countdown-info'
  });
  endOfYearCountdown.start(function () {
    var i = 1;
    setInterval(function () {
      if(i > 4) {
        i = 0;
      }
      document.querySelectorAll('#countdown-banner .sale-unit span').forEach(function (el, index) {
        el.classList.toggle('active', index == i || index == i + 5);
      });
      i++
    }, 3000);
  });
});

/**
 * This function is attached to the countdown element in the "completed"
 * attribute. It is called when the countdown reaches zero
 */
function countdownBannerCompleted () {
  endOfYearCountdown.countdownEnd();
}