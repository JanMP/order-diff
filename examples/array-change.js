/*jshint indent:2, laxcomma:true, laxbreak:true*/
var util = require('util');
var expect = require('expect.js');
var deep = require('..');
var _ = require('lodash');

var lhs = {
  'id': 'Release',
  'phases': [{
    'id': 'Phase1',
    'tasks': [
      { 'id': 'Task1' },
      { 'id': 'Task2' }
    ]
  }, {
    'id': 'Phase2',
    'tasks': [
      { 'id': 'Task3' }
    ]
  }]
};

var rhs = {
  'phases': [{
    // E: Phase1 -> Phase2
    'id': 'Phase2',
    'tasks': [
      { 'id': 'Task3' }
    ]
  }, {
    'id': 'Phase1',
    'tasks': [
      { 'id': 'Task1' },
      { 'id': 'Task2' }
    ]
  }],
  'id': 'Release'
};

var clone = _.cloneDeep(lhs);
var diff = deep.diff(lhs, rhs);
console.log(util.inspect(diff, false, 9)); // eslint-disable-line no-console
clone = deep.applyDiff(clone, rhs, diff);
console.log(util.inspect(clone, false, 9)); // eslint-disable-line no-console
expect(deep.objectEqual(clone, rhs)).to.be(true);

clone = _.cloneDeep(lhs);
diff = deep.diff(lhs, rhs, null, null, true);
console.log(util.inspect(diff, false, 9)); // eslint-disable-line no-console
clone = deep.applyDiff(clone, rhs, diff);
console.log(util.inspect(clone, false, 9)); // eslint-disable-line no-console
expect(deep.objectEqual(clone, rhs, true)).to.be(true);

clone = _.cloneDeep(lhs);
diff = deep.diff(lhs, rhs, null, null, false);
console.log(util.inspect(diff, false, 9)); // eslint-disable-line no-console
clone = deep.applyDiff(clone, rhs, diff);
console.log(util.inspect(clone, false, 9)); // eslint-disable-line no-console
expect(deep.objectEqual(clone, rhs, false)).to.be(true);

