function requestSelfShopCodes (done) {
  requestJSON({
    withCredentials: true,
    url: endpoint + '/self/shop-codes'
  }, function (err, result) {
    if(err) {
      return done(err);
    }
    else {
      result = transformShopCodes(result);
      var obj = {};
      obj.codes = result.results;
      obj.lastCreated = result.lastCreated;
      obj.nextCodeDate = new Date(new Date(obj.lastCreated).getTime() + 1000 * 60 * 60 * 24 * 30);
      obj.currentCode = obj.codes[0];
      obj.gold = result.gold;
    }
    done(null, obj);
  });
}

function transformShopCode (code) {
  if(code.expires) {
    code.expiresFormatted = formatDate(code.expires)
  }
  code.discountText = (parseInt(code.value) * -1) + '% off';
  if(code.rewardFor == '1month') {
    code.rewardForText = 'Gold'
  }
  else if (code.rewardFor == '1year') {
    code.rewardForText = '1+ year of Gold'
  }
  else if (code.rewardFor == '2years') {
    code.rewardForText = '2+ years of Gold'
  }
  return code
}

function transformShopCodes (result) {
  result.results = result.results.map(transformShopCode);
  return result;
}

function transformShopCodesPage (obj, done) {
  obj = obj || {};
  obj.isGold = hasGoldAccess();

  if(!isSignedIn() || !obj.isGold) {
    return done(null, obj);
  }
  requestSelfShopCodes(function (err, result) {
    console.log('err,result',err,result);
    Object.keys(result).forEach(function (key) {
      obj[key] = result[key];
    });

    done(err, obj);
  });
}

function completedShopCodesPage () {
  startCountdownTicks();
}