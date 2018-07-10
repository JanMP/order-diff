# order-diff

[![CircleCI](https://circleci.com/gh/logoran/diff.svg?style=svg)](https://circleci.com/gh/logoran/diff)

[![NPM](https://nodei.co/npm/order-diff.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/order-diff/)

**order-diff** is a javascript/node. js module providing utility functions for determining the structural differences between objects and includes some utilities for applying differences across objects. Thanks for flitbit for create [deep-diff](http://github.com/flitbit)

## Plan List

* Use function for independent option, not only default or true or false.
* Use function for scale option, not only a float for percentage.
* Now the data not support object with circular, support circular object.

## Install

```bash
npm install order-diff
```

## Features

* Get the structural differences between two objects.
* Observe the structural differences between two objects.
* When structural differences represent change, apply change from one object to another.
* When structural differences represent change, selectively apply change from one object to another.
* Object can dependent with the key-value order and array can independent with order.

## Installation

```bash
npm install order-diff
```

### Importing

#### nodejs

```javascript
var diff = require('order-diff')
// or:
// const diff = require('order-diff');
// const { diff } = require('order-diff');
// or:
// const OrderDiff = require('order-diff');
// const { OrderDiff } = require('order-diff');
// es6+:
// import diff from 'order-diff';
// import { diff } from 'order-diff';
// es6+:
// import OrderDiff from 'order-diff';
// import { OrderDiff } from 'order-diff';
```

#### browser

```html
<script src="https://cdn.jsdelivr.net/npm/order-diff@1/dist/order-diff.min.js"></script>
```

> In a browser, `order-diff` defines a global variable `OrderDiff`. If there is a conflict in the global namespace you can restore the conflicting definition and assign `order-diff` to another variable like this: `var order = OrderDiff.noConflict();`.

## Simple Examples

In order to describe differences, change revolves around an `origin` object. For consistency, the `origin` object is always the operand on the `left-hand-side` of operations. The `comparand`, which may contain changes, is always on the `right-hand-side` of operations.

``` javascript
var diff = require('order-diff').diff;

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
  description: 'it\'s an object!',
  name: 'updated object',
  details: {
    it: 'has',
    an: 'array',
    with: ['few', 'a', 'more', 'elements', { than: 'before' }]
  }
};

var differences = diff(lhs, rhs);
```

* The code snippet above would result in the following structure describing the differences by default:

``` javascript
[{
    "kind": "E",
    "path": ["name"],
    "lhs": "my object",
    "rhs": "updated object"
},
{
    "kind": "M",
    "path": ["details", "with", 1],
    "lhs": "few",
    "rhs": 0
},
{
    "kind": "N",
    "path": ["details", "with", 2],
    "lhs": 2,
    "rhs": "more"
},
{
    "kind": "N",
    "path": ["details", "with", 4],
    "lhs": 4,
    "rhs":
    {
        "than": "before"
    }
}]
```

* IF independent of array order.

``` javascript
var differences = diff(lhs, rhs, null, null, true);
```

* Would result in the following structure describing the differences:

``` javascript
[{
    "kind": "E",
    "path": ["name"],
    "lhs": "my object",
    "rhs": "updated object"
},
{
    "kind": "N",
    "path": ["details", "with", 3],
    "lhs": 2,
    "rhs": "more"
},
{
    "kind": "N",
    "path": ["details", "with", 4],
    "lhs": 4,
    "rhs":
    {
        "than": "before"
    }
}]
```

* IF dependent of object order.

``` javascript
var differences = diff(lhs, rhs, null, null, false);
```

* Would result in the following structure describing the differences:

``` javascript
[{
    "kind": "M",
    "path": ["description"],
    "lhs": "it's an object!"
},
{
    "kind": "E",
    "path": ["name"],
    "lhs": "my object",
    "rhs": "updated object"
},
{
    "kind": "M",
    "path": ["details", "with", 1],
    "lhs": "few",
    "rhs": 0
},
{
    "kind": "N",
    "path": ["details", "with", 2],
    "lhs": 2,
    "rhs": "more"
},
{
    "kind": "N",
    "path": ["details", "with", 4],
    "lhs": 4,
    "rhs":
    {
        "than": "before"
    }
}]
```

### Differences

Differences are reported as one or more change records. Change records have the following structure:

* `kind` - indicates the kind of change; will be one of the following:
  * `N` - indicates a newly added property/element
  * `D` - indicates a property/element was deleted
  * `E` - indicates a property/element was edited
  * `M` - indicates a property/element was move place when dependent order
  * `R` - indicates a object change a property/element's name
* `path` - the property path (from the left-hand-side root)
* `lhs` - the value on the left-hand-side of the comparison (undefined if kind === 'N')
* `rhs` - the value on the right-hand-side of the comparison (undefined if kind === 'D')

Change records are generated for all structural differences between `origin` and `comparand`. The methods only consider an object's own properties and array elements; those inherited from an object's prototype chain are not considered.

differences. If the structural differences are applied from the `comparand` to the `origin` then the two objects will compare as "order equal" using order-deep.objectEqual.

### Changes

When two objects differ, you can observe the differences as they are calculated and selectively apply those changes to the origin object (left-hand-side).

``` javascript
var observableDiff = require('order-diff').observableDiff;
var applyChange = require('order-diff').applyChange;

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
  description: 'it\'s an object!',
  name: 'updated object',
  details: {
    it: 'has',
    an: 'array',
    with: ['few', 'a', 'more', 'elements', { than: 'before' }]
};

observableDiff(lhs, rhs, function (d) {
  // Apply all changes except to the name property...
  if (d.path[d.path.length - 1] !== 'name') {
    applyChange(lhs, rhs, d);
  }
});
```

## API Documentation

A standard import of `var diff = require('order-diff')` is assumed in all of the code examples. The import results in an object having the following public properties:

* `diff(lhs, rhs, prefilter, acc, orderIndependent, scale)` &mdash; calculates the differences between two objects, optionally prefiltering elements for comparison, and optionally using the specified accumulator.
* `observableDiff(lhs, rhs, observer, prefilter, orderIndependent, scale)` &mdash; calculates the differences between two objects and reports each to an observer function, optionally, prefiltering elements for comparison.
* `applyDiff(target, source, filter, prefilter, orderIndependent, scale)` &mdash; applies any structural differences from a source object to a target object, optionally filtering each difference.
* `applyDiff(target, source, changes, filter)` &mdash; applies any structural differences of changes from a source object to a target object, if source is set it will check all the changes if it is real differences of source, optionally filtering each difference.
* `applyChange(target, source, change)` &mdash; applies a single change record to a target object. NOTE: `source` is unused and may be removed.
* `objectEqual(lhs, rhs, orderIndependent)` &mdash; check if the two objects is different with order independent option.

### `diff`

The `diff` function calculates the difference between two objects.

#### Arguments

* `lhs` - the left-hand operand; the origin object.
* `rhs` - the right-hand operand; the object being compared structurally with the origin object.
* `prefilter` - an optional function that determines whether difference analysis should continue down the object graph.
* `acc` - an optional accumulator/array (requirement is that it have a `push` function). Each difference is pushed to the specified accumulator.
* `orderIndependent` - an optional indicate array and object order dependence. default array with order and object without order. IF true array will without order, false object will with order.
* `scale` - an optional float that similarity more than that indicate two objects is similar with each other. the default is 0.5(50%). If it is true two object must equal.

Returns either an array of changes, if there are no changes, [].

#### Pre-filtering Object Properties

The `prefilter`'s signature should be `function(path, key)` and it should return a truthy value for any `path`-`key` combination that should be filtered. If filtered, the difference analysis does no further analysis of on the identified object-property path.

```javascript
const diff = require('order-diff');
const assert = require('assert');

const data = {
  issue: 126,
  submittedBy: 'abuzarhamza',
  title: 'readme.md need some additional example prefilter',
  posts: [
    {
      date: '2018-04-16',
      text: `additional example for prefilter for order-diff would be great.
      https://stackoverflow.com/questions/38364639/pre-filter-condition-order-diff-node-js`
    }
  ]
};

const clone = JSON.parse(JSON.stringify(data));
clone.title = 'README.MD needs additional example illustrating how to prefilter';
clone.disposition = 'completed';

const two = diff(data, clone);
const none = diff(data, clone,
  (path, key) => path.length === 0 && ~['title', 'disposition'].indexOf(key)
);

assert.equal(two.length, 2, 'should reflect two differences');
assert.equal(two.length, 0, 'should reflect no differences');
```

## Contributing

When contributing, keep in mind that it is an objective of `order-diff` to have no package dependencies. This may change in the future, but for now, no-dependencies.

Please run the unit tests before submitting your PR: `npm test`. Hopefully your PR includes additional unit tests to illustrate your change/modification!

When you run `npm test`, linting will be performed and any linting errors will fail the tests... this includes code formatting.

> Thanks to all those who have contributed so far!
