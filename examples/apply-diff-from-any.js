/*jshint indent:2, laxcomma:true, laxbreak:true*/
var util = require('util') // eslint-disable-line no-unused-vars
, diff = require('..')
, expect = require('expect.js')
, data = require('./practice-data')
, _ = require('lodash')
;

var cycle = -1
, i
, len = data.length
, prior = {}
, comparand
, records
, type
;

var applyEachChange = function (ch) {
        diff.applyChange(prior, comparand, ch);
      };

while (++cycle < 10) {
  i = -1;
  while (++i < len) {

    type = _.random(2);

    comparand = data[i];

    // get the difference...
    if (type === 0) {
      records = diff(prior, comparand);
    } else if (type === 1) {
      records = diff(prior, comparand, null, null, true);
    } else {
      records = diff(prior, comparand, null, null, false);
    }

    // console.log(util.inspect(records, false, 9)); // eslint-disable-line no-console

    // round-trip serialize to prune the underlying types...
    var serialized = JSON.stringify(records);
    var desierialized = JSON.parse(serialized);

    if (desierialized.length) {
      desierialized.forEach(applyEachChange);
    }

    if (type === 0) {
      expect(diff.objectEqual(prior, comparand)).to.be(true);
    } else if (type === 1) {
      expect(diff.objectEqual(prior, comparand, true)).to.be(true);
    } else {
      expect(diff.objectEqual(prior, comparand, false)).to.be(true);
    }
  }
}
