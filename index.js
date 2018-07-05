;(function(root, factory) { // eslint-disable-line no-extra-semi
  var orderDiff = factory(root);
  // eslint-disable-next-line no-undef
  if (typeof define === 'function' && define.amd) {
      // AMD
      define('OrderDiff', function() { // eslint-disable-line no-undef
          return orderDiff;
      });
  } else if (typeof exports === 'object') {
      // Node.js
      module.exports = orderDiff;
  } else {
      // Browser globals
      var _orderdiff = root.OrderDiff;
      orderDiff.noConflict = function() {
          if (root.OrderDiff === orderDiff) {
              root.OrderDiff = _orderdiff;
          }
          return orderDiff;
      };
      root.OrderDiff = orderDiff;
  }
}(this, function(root) {
  var validKinds = ['N', 'E', 'M', 'D'];

  // nodejs compatible on server side and in the browser.
  function inherits(ctor, superCtor) {
    ctor.super_ = superCtor;
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  }

  function Diff(kind, path) {
    Object.defineProperty(this, 'kind', {
      value: kind,
      enumerable: true
    });
    if (path && path.length) {
      Object.defineProperty(this, 'path', {
        value: path,
        enumerable: true
      });
    }
  }

  function DiffEdit(path, origin, value) {
    DiffEdit.super_.call(this, 'E', path);
    if (typeof origin !== 'undefined') {
      Object.defineProperty(this, 'lhs', {
        value: origin,
        enumerable: true
      });
    }
    Object.defineProperty(this, 'rhs', {
      value: value,
      enumerable: true
    });
  }
  inherits(DiffEdit, Diff);

  function DiffNew(path, value) {
    DiffNew.super_.call(this, 'N', path);
    Object.defineProperty(this, 'rhs', {
      value: value,
      enumerable: true
    });
  }
  inherits(DiffNew, Diff);

  function DiffDeleted(path, value) {
    DiffDeleted.super_.call(this, 'D', path);
    Object.defineProperty(this, 'lhs', {
      value: value,
      enumerable: true
    });
  }
  inherits(DiffDeleted, Diff);

  function DiffMoved(path, target, origin, value) {
    DiffMoved.super_.call(this, 'M', path);
    Object.defineProperty(this, 'target', {
      value: target,
      enumerable: true
    });
    if (typeof origin !== 'undefined') {
      Object.defineProperty(this, 'lhs', {
        value: origin,
        enumerable: true
      });
    }
    if (typeof value !== 'undefined') {
      Object.defineProperty(this, 'rhs', {
        value: value,
        enumerable: true
      });
    }
  }
  inherits(DiffMoved, Diff);

  function realTypeOf(subject) {
    var type = typeof subject;
    if (type !== 'object') {
      return type;
    }

    if (subject === Math) {
      return 'math';
    } else if (subject === null) {
      return 'null';
    } else if (Array.isArray(subject)) {
      return 'array';
    } else if (Object.prototype.toString.call(subject) === '[object Date]') {
      return 'date';
    } else if (typeof subject.toString === 'function' && /^\/.*\//.test(subject.toString())) {
      return 'regexp';
    }
    return 'object';
  }

  // http://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
  function hashThisString(string) {
    var hash = 0;
    if (string.length === 0) { return hash; }
    for (var i = 0; i < string.length; i++) {
      var char = string.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }

  // Gets a hash of the given object in an array order-independent fashion
  // also object key order independent (easier since they can be alphabetized)
  function getOrderIndependentHash(object, orderIndependent) {
    var accum = 0;
    var accumList = [];
    var type = realTypeOf(object);

    if (type === 'array') {
      var arrayString;
      if (orderIndependent) {
        object.forEach(function (item) {
          accum += getOrderIndependentHash(item, orderIndependent);
        });
        arrayString = '[type: array, hash: ' + accum + ']';
      } else {
        object.forEach(function (item) {
          accumList.push(getOrderIndependentHash(item, orderIndependent));
        });
        arrayString = '[type: array, hash: ' + accumList.join(', ') + ']';
      }
      return hashThisString(arrayString);
    }

    if (type === 'object') {
      var keyValueString;
      var objectString;
      var key;
      if (orderIndependent !== false) {
        for (key in object) {
          if (object.hasOwnProperty(key)) {
            keyValueString = 'key: ' + key + ', value hash: ' + getOrderIndependentHash(object[key]);
            accum += hashThisString(keyValueString);
          }
        }
        objectString = '[type: object, hash: ' + accum + ']';
      } else {
        for (key in object) {
          if (object.hasOwnProperty(key)) {
            keyValueString = 'key: ' + key + ', value hash: ' + getOrderIndependentHash(object[key]);
            accumList.push(hashThisString(keyValueString));
          }
        }
        objectString = '[type: object, hash: ' + accumList.join(', ') + ']';
      }
      return hashThisString(objectString);
    }

    // Non object, non array...should be good?
    var stringToHash = '[ type: ' + type + ' ; value: ' + object + ']';
    return hashThisString(stringToHash);
  }

  function objectEqual(lhs, rhs, orderIndependent) {
    if (lhs === rhs) {
      return true;
    }
    if (realTypeOf(lhs) !== realTypeOf(rhs)) {
      return false;
    }
    if (realTypeOf(lhs) === 'date') {
      if (lhs - rhs !== 0) {
        return false;
      } else {
        return true;
      }
    }
    if (typeof lhs === 'number' && isNaN(lhs) && isNaN(rhs)) {
      return true;
    }
    if (getOrderIndependentHash(lhs, orderIndependent) !== getOrderIndependentHash(rhs, orderIndependent)) {
      return false;
    }
    if (Array.isArray(lhs)) {
      var i;
      if (lhs.length !== rhs.length) {
        return false;
      }
      if (orderIndependent) {
        var hashList = {};
        var hash;
        rhs.forEach(function(item, index) {
          hash = getOrderIndependentHash(item, orderIndependent);
          if (hashList.hash) {
            hashList[hash].push(index);
          } else {
            hashList[hash] = [index];
          }
        });
        for (i = 0; i < lhs.length; ++i) {
          hash = getOrderIndependentHash(lhs[i], orderIndependent);
          if (!hashList[hash]) {
            return false;
          }
          var j;
          for (j = 0; j < hashList[hash].length; ++j) {
            if (objectEqual(lhs[i], rhs[hashList[hash][j]], orderIndependent)) {
              break;
            }
          }
          if (j === hashList[hash].length) {
            return false;
          }
        }
      } else {
        for (i = 0; i < lhs.length; ++i) {
          if (!objectEqual(lhs[i], rhs[i], orderIndependent)) {
            return false;
          }
        }
      }
      return true;
    } else {
      var key;
      if (orderIndependent === false) {
        if (!objectEqual(Object.keys(lhs), Object.keys(rhs), orderIndependent)) {
          return false;
        }
      }
      for (key in lhs) {
        if (lhs.hasOwnProperty(key)) {
          if (!rhs.hasOwnProperty(key)) {
            return false;
          }
          if (!objectEqual(lhs.key, rhs.key, orderIndependent)) {
            return false;
          }
        }
      }
      for (key in rhs) {
        if (rhs.hasOwnProperty(key)) {
          if (!rhs.hasOwnProperty(key)) {
            return false;
          }
        }
      }
      return true;
    }
  }

  function orderArrayDiff(lhs, rhs, changes, prefilter, path, orderIndependent) {
    var i, j, k;
    var hashList = {};
    var peerList = [];
    var useList = [];
    var hash;
    var ll, rl;
    rhs.forEach(function (item, index) {
      hash = getOrderIndependentHash(item, orderIndependent);
      if (hashList.hash) {
        hashList[hash].push(index);
      } else {
        hashList[hash] = [index];
      }
    });
    for (i = 0; i < lhs.length; ++i) {
      hash = getOrderIndependentHash(lhs[i], orderIndependent);
      if (!hashList[hash]) {
        peerList.push([i, -1]);
        continue;
      }
      for (j = 0; j < hashList[hash].length; ++j) {
        if (objectEqual(lhs[i], rhs[hashList[hash][j]], orderIndependent)) {
          break;
        }
      }
      if (j === hashList[hash].length) {
        peerList.push([i, -1]);
      } else {
        peerList.push([i, hashList[hash][j]]);
        useList[hashList[hash][j]] = i;
        hashList[hash].splice(j, 1);
        if (hashList[hash].length === 0) {
          delete hashList[hash];
        }
      }
    }
    useList.length = rhs.length;
    if (orderIndependent) {
      for (i = 0, j = 0; i < rhs.length;) {
        if (i < peerList.length && peerList[i][1] === -1) {
          changes.push(new DiffDeleted(path.concat(i), lhs[peerList[i][0]]));
          peerList.splice(i, 1);
          if (undefined === useList[j]) {
            changes.push(new DiffNew(path.concat(i), rhs[j]));
            peerList.splice(i, 0, [-1, j]);
            ++i;
            ++j;
          }
          continue;
        }
        if (undefined === useList[j]) {
          changes.push(new DiffNew(path.concat(i), rhs[j]));
          peerList.splice(i, 0, [-1, j]);
          ++i;
          ++j;
          continue;
        }
        while (peerList[i] && peerList[i][1] !== -1) {
          ++i;
        }
        while (undefined !== useList[j]) {
          ++j;
        }
      }
    } else {
      for (i = 0; i < rhs.length;) {
        if (i < peerList.length && peerList[i][1] === -1) {
          changes.push(new DiffDeleted(path.concat(i), lhs[peerList[i][0]]));
          peerList.splice(i, 1);
          if (undefined === useList[i]) {
            changes.push(new DiffNew(path.concat(i), rhs[i]));
            peerList.splice(i, 0, [-1, i]);
            ++i;
          }
          continue;
        }
        if (undefined === useList[i]) {
          changes.push(new DiffNew(path.concat(i), rhs[i]));
          peerList.splice(i, 0, [-1, i]);
          ++i;
          continue;
        }
        if (peerList[i][1] === i) {
          ++i;
          continue;
        }
        for (k = i + 1; peerList[k][1] !== i; ++k); // eslint-disable-line curly
        for (rl = 1; rl < peerList.length - k && peerList[k + rl][1] === i + rl; ++rl); // eslint-disable-line curly
        if (useList[peerList[i][1] - 1]) {
          j = peerList[i][1];
          for (ll = 1; ll < peerList.length - i && peerList[i + ll][1] === j + ll; ++ll); // eslint-disable-line curly
          if (ll < rl) {
            rl = peerList[i][1] - 1;
            for (k = i + ll; peerList[k][1] !== rl; ++k); // eslint-disable-line curly
            for (j = 0; j < ll; ++j) {
              changes.push(new DiffMoved(path.concat(i), k + 1, lhs[peerList[i + j][0]]));
            }
            peerList.splice(k + 1 - ll, 0, ...peerList.splice(i, ll));
            continue;
          }
        }
        for (j = 0; j < rl; ++j) {
          changes.push(new DiffMoved(path.concat(k + j), i + j, lhs[peerList[k + j][0]]));
        }
        peerList.splice(i, 0, ...peerList.splice(k, rl));
        i += rl;
      }
    }
  }

  function orderObjectDiff(lhs, rhs, changes, prefilter, path, orderIndependent) {
    var i, j, k;
    var akeys = Object.keys(lhs);
    var pkeys = Object.keys(rhs);
    var ll, rl;
    if (orderIndependent !== false) {
      for (i = 0; i < akeys.length; ++i) {
        k = akeys[i];
        if (pkeys.indexOf(k) === -1) {
          changes.push(new DiffDeleted(path.concat(k), lhs[k]));
        } else {
          orderDiff(lhs[k], rhs[k], changes, prefilter, path.concat(k), null, orderIndependent); // eslint-disable-line no-use-before-define
        }
      }
      for (i = 0; i < pkeys.length; ++i) {
        k = pkeys[i];
        if (akeys.indexOf(k) === -1) {
          changes.push(new DiffNew(path.concat(k), rhs[k]));
        }
      }
    } else {
      for (i = 0; i < pkeys.length;) {
        if (pkeys.indexOf(akeys[i]) === -1) {
          changes.push(new DiffDeleted(path.concat(akeys[i]), lhs[akeys[i]]));
          akeys.splice(i, 1);
          if (akeys.indexOf(pkeys[i]) === -1) {
            changes.push(new DiffNew(path.concat(pkeys[i]), rhs[pkeys[i]]));
            akeys.splice(i, 0, pkeys[i]);
            ++i;
            continue;
          }
        }
        if (akeys.indexOf(pkeys[i]) === -1) {
          changes.push(new DiffNew(path.concat(pkeys[i]), rhs[pkeys[i]]));
          akeys.splice(i, 0, pkeys[i]);
          ++i;
          continue;
        }
        if (akeys[i] === pkeys[i]) {
          k = akeys[i];
          orderDiff(lhs[k], rhs[k], changes, prefilter, path.concat(k), null, orderIndependent); // eslint-disable-line no-use-before-define
          ++i;
          continue;
        }
        j = akeys.indexOf(pkeys[i]);
        for (rl = 1; rl < akeys.length - j && akeys[j + rl] === pkeys[rl]; ++rl); // eslint-disable-line curly
        if (akeys.indexOf(pkeys[pkeys.indexOf(akeys[i]) - 1]) !== -1) {
          j = pkeys.indexOf(akeys[i]);
          for (ll = 1; ll < akeys.length - i && akeys[i + ll] === pkeys[j + ll]; ++ll); // eslint-disable-line curly
          if (ll < rl) {
            rl = pkeys[pkeys.indexOf(akeys[i]) - 1];
            for (j = 0; j < ll; ++j) {
              k = akeys[i + j];
              changes.push(new DiffMoved(path.concat(k), rl, lhs[k]));
              orderDiff(lhs[k], rhs[k], changes, prefilter, path.concat(k), null, orderIndependent); // eslint-disable-line no-use-before-define
              rl = k;
            }
            rl = pkeys.indexOf(akeys[i]);
            akeys.splice(rl + 1 - ll, 0, ...akeys.splice(i, ll));
            continue;
          }
        }
        ll = (i === 0 ? '' : akeys[i - 1]);
        for (j = 0; j < rl; ++j) {
          k = pkeys[i];
          changes.push(new DiffMoved(path.concat(k), ll, lhs[k]));
          orderDiff(lhs[k], rhs[k], changes, prefilter, path.concat(k), null, orderIndependent); // eslint-disable-line no-use-before-define
          ll = k;
        }
        ll = akeys.indexOf(pkeys[i]);
        akeys.splice(i, 0, ...akeys.splice(ll, rl));
        i += rl;
      }
    }
  }

  function orderDiff(lhs, rhs, changes, prefilter, path, key, orderIndependent) {
    changes = changes || [];
    path = path || [];
    var currentPath = path.slice(0);
    if (typeof key !== 'undefined' && key !== null) {
      if (prefilter) {
        if (typeof (prefilter) === 'function' && prefilter(currentPath, key)) {
          return;
        } else if (typeof (prefilter) === 'object') {
          if (prefilter.prefilter && prefilter.prefilter(currentPath, key)) {
            return;
          }
          if (prefilter.normalize) {
            var alt = prefilter.normalize(currentPath, key, lhs, rhs);
            if (alt) {
              lhs = alt[0];
              rhs = alt[1];
            }
          }
        }
      }
      currentPath.push(key);
    }

    // Use string comparison for regexes
    if (realTypeOf(lhs) === 'regexp' && realTypeOf(rhs) === 'regexp') {
      lhs = lhs.toString();
      rhs = rhs.toString();
    }

    var ltype = typeof lhs;
    var rtype = typeof rhs;

    var ldefined = ltype !== 'undefined';
    var rdefined = rtype !== 'undefined';

    if (!ldefined && rdefined) {
      changes.push(new DiffNew(currentPath, rhs));
    } else if (!rdefined && ldefined) {
      changes.push(new DiffDeleted(currentPath, lhs));
    } else if (realTypeOf(lhs) !== realTypeOf(rhs)) {
      changes.push(new DiffEdit(currentPath, lhs, rhs));
    } else if (realTypeOf(lhs) === 'date' && (lhs - rhs) !== 0) {
      changes.push(new DiffEdit(currentPath, lhs, rhs));
    } else if (ltype === 'object' && lhs !== null) {
      if (Array.isArray(lhs)) {
        orderArrayDiff(lhs, rhs, changes, prefilter, path, orderIndependent);
      } else {
        orderObjectDiff(lhs, rhs, changes, prefilter, path, orderIndependent);
      }
    } else if (lhs !== rhs) {
      if (!(ltype === 'number' && isNaN(lhs) && isNaN(rhs))) {
        changes.push(new DiffEdit(currentPath, lhs, rhs));
      }
    }
  }

  function observableDiff(lhs, rhs, observer, prefilter, orderIndependent) {
    var changes = [];
    orderDiff(lhs, rhs, changes, prefilter, null, null, orderIndependent);
    if (observer) {
      for (var i = 0; i < changes.length; ++i) {
        observer(changes[i]);
      }
    }
    return changes;
  }

  function accumulateDiff(lhs, rhs, prefilter, accum, orderIndependent) {
    var observer = (accum) ?
      function (difference) {
        if (difference) {
          accum.push(difference);
        }
      } : undefined;
    var changes = observableDiff(lhs, rhs, observer, prefilter, orderIndependent);
    return (accum) ? accum : (changes.length) ? changes : undefined;
  }

  function applyChange(target, source, change) {
    if (typeof change === 'undefined' && source && ~validKinds.indexOf(source.kind)) {
      change = source;
    }
    if (target && change && change.kind) {
      var it = target,
        i = -1,
        last = change.path ? change.path.length - 1 : 0;
      while (++i < last) {
        if (typeof it[change.path[i]] === 'undefined') {
          it[change.path[i]] = (typeof change.path[i + 1] !== 'undefined' && typeof change.path[i + 1] === 'number') ? [] : {};
        }
        it = it[change.path[i]];
      }
      switch (change.kind) {
        case 'A':
          if (change.path && typeof it[change.path[i]] === 'undefined') {
            it[change.path[i]] = [];
          }
          // applyArrayChange(change.path ? it[change.path[i]] : it, change.index, change.item);
          break;
        case 'D':
          delete it[change.path[i]];
          break;
        case 'E':
        case 'N':
          it[change.path[i]] = change.rhs;
          break;
      }
    }
  }

  function applyDiff(target, source, prefilter, orderIndependent) {
    if (target && source) {
      var onChange = function (change) {
        applyChange(target, source, change);
      };
      observableDiff(target, source, onChange, prefilter, orderIndependent);
    }
  }

  Object.defineProperties(accumulateDiff, {

    diff: {
      value: accumulateDiff,
      enumerable: true
    },
    observableDiff: {
      value: observableDiff,
      enumerable: true
    },
    orderIndepHash: {
      value: getOrderIndependentHash,
      enumerable: true
    },
    applyDiff: {
      value: applyDiff,
      enumerable: true
    },
    applyChange: {
      value: applyChange,
      enumerable: true
    },
    isConflict: {
      value: function () {
        return typeof $conflict !== 'undefined';
      },
      enumerable: true
    }
  });

  // hackish...
  accumulateDiff.OrderDiff = accumulateDiff;
  // ...but works with:
  // import OrderDiff from 'order-diff'
  // import { OrderDiff } from 'order-diff'
  // const OrderDiff = require('order-diff');
  // const { OrderDiff } = require('order-diff');

  root.OrderDiff = accumulateDiff;
  return accumulateDiff;
}));
