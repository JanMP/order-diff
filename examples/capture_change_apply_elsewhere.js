/*jshint indent:2, laxcomma:true, laxbreak:true*/
var util = require('util') // eslint-disable-line no-unused-vars
, assert = require('assert')
, diff = require('..')
, expect = require('expect.js')
, data = require('./practice-data')
, _ = require('lodash')
, type
;

var i = Math.floor(Math.random() * data.length) + 1;
var j = Math.floor(Math.random() * data.length) + 1;

while (j === i) {
  j = Math.floor(Math.random() * data.length) + 1;
}

type = _.random(2);

var source = data[i];
var clone = _.cloneDeep(source);
var comparand = data[j];

// source and comparand are different objects
assert.notEqual(source, comparand);

// source and comparand have differences in their structure
assert.notDeepEqual(source, comparand);

// record the differences between source and comparand
var changes;
if (type === 0) {
  changes = diff(source, comparand);
} else if (type === 1) {
  changes = diff(source, comparand, null, null, true);
} else {
  changes = diff(source, comparand, null, null, false);
}

// console.log(util.inspect(changes, false, 9)); // eslint-disable-line no-console

// apply the changes to the source
changes.forEach(function (change) {
  diff.applyChange(source, comparand, change);
});

// source and copmarand are now deep equal
if (type === 0) {
  expect(diff.objectEqual(source, comparand)).to.be(true);
} else if (type === 1) {
  expect(diff.objectEqual(source, comparand, true)).to.be(true);
} else {
  expect(diff.objectEqual(source, comparand, false)).to.be(true);
}

// Simulate serializing to a remote copy of the object (we've already go a copy, copy the changes)...

var remote = JSON.parse(JSON.stringify(clone));
var remoteChanges = JSON.parse(JSON.stringify(changes));

// source and remote are different objects
assert.notEqual(source, remote);

// changes and remote changes are different objects
assert.notEqual(changes, remoteChanges);

// remote and comparand are different objects
assert.notEqual(remote, comparand);

// console.log(util.inspect(remoteChanges, false, 9)); // eslint-disable-line no-console

remoteChanges.forEach(function (change) {
  diff.applyChange(remote, undefined, change);
});

if (type === 0) {
  expect(diff.objectEqual(remote, comparand)).to.be(true);
} else if (type === 1) {
  expect(diff.objectEqual(remote, comparand, true)).to.be(true);
} else {
  expect(diff.objectEqual(remote, comparand, false)).to.be(true);
}
