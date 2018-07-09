var util = require('util')
, diff = require('..')
, _ = require('lodash')
, expect = require('expect.js')
, type
, clone
;

var lhs = {
	name: 'my object',
	description: 'it\'s an object!',
	details: {
		it: 'has',
		an: 'array',
		with: ['a', 'few', 'elements']
	}
};

var rhs = {
	name: 'updated object',
	description: 'it\'s an object!',
	details: {
		it: 'has',
		an: 'array',
		with: ['a', 'few', 'more', 'elements', { than: 'before' }]
	}
};

for (type = 0; type < 3; ++type) {
	clone = _.cloneDeep(lhs);
	var differences = diff.diff(clone, rhs);

	// Print the differences to the console...
	util.log(util.inspect(differences, false, 99));

	diff.observableDiff(lhs, rhs, function (d) { // eslint-disable-line no-loop-func
		// Apply all changes except those to the 'name' property...
		if (d.path.length !== 1 || d.path.join('.') !== 'name') {
			diff.applyChange(clone, rhs, d);
		}
	}, function (path, key, type) { // eslint-disable-line no-shadow
		var p = (path && path.length) ? path.join('/') : '<no-path>';
		util.log('prefilter: path = ' + p + ' key = ' + key + ', type = ', type);
	},
  (type === 0) ? undefined : (type === 1));

	util.log(util.inspect(clone, false, 99));

	if (type === 0) {
		expect(diff.objectEqual(clone, rhs)).to.be(false);
	} else if (type === 1) {
		expect(diff.objectEqual(clone, rhs, true)).to.be(false);
	} else {
		expect(diff.objectEqual(clone, rhs, false)).to.be(false);
	}

	clone.name = 'updated object';

	if (type === 0) {
		expect(diff.objectEqual(clone, rhs)).to.be(true);
	} else if (type === 1) {
		expect(diff.objectEqual(clone, rhs, true)).to.be(true);
	} else {
		expect(diff.objectEqual(clone, rhs, false)).to.be(true);
	}
}
