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

  function DiffMoved(path, origin, target) {
    DiffMoved.super_.call(this, 'M', path);
    Object.defineProperty(this, 'lhs', {
      value: origin,
      enumerable: true
    });
    Object.defineProperty(this, 'rhs', {
      value: target,
      enumerable: true
    });
  }
  inherits(DiffMoved, Diff);

  function getFilter(prefilter) {
    if (prefilter) {
      if (typeof (prefilter) === 'function') {
        return function(currentPath, key, type) {
          return prefilter(currentPath, key, type);
        };
      } else if (typeof (prefilter) === 'object') {
        if (prefilter.prefilter) {
          return function (currentPath, key, type) {
            return prefilter.prefilter(currentPath, key, type);
          };
        }
        if (prefilter.normalize) {
          return function (currentPath, key, type, lhs, rhs) {
            return prefilter.normalize(currentPath, key, type, lhs, rhs);
          };
        }
      }
    }
    return function () {
      return false;
    };
  }

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

  function objectSimilar(lhs, rhs, orderIndependent, scale) {
    scale = scale || 0.5;
    var ltype = realTypeOf(lhs);
    var lkeys = [];
    var rkeys = [];
    var count = 0;
    if (ltype !== realTypeOf(rhs)) {
      return false;
    }
    if (ltype !== 'array' && ltype !== 'object') {
      return true;
    }
    if (ltype === 'array') {
      lhs.forEach(function (item) {
        lkeys.push(getOrderIndependentHash(item, orderIndependent));
      });
      rhs.forEach(function (item) {
        rkeys.push(getOrderIndependentHash(item, orderIndependent));
      });
    } else if (ltype === 'object') {
      lkeys = Object.keys(lhs);
      rkeys = Object.keys(rhs);
    }
    lkeys.forEach(function (item) {
      if (rkeys.indexOf(item) !== -1) {
        ++count;
      }
    });
    if (count > lkeys.length * scale && count > rkeys.length * scale) {
      return true;
    } else {
      return false;
    }
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

  function compareArray(lhs, rhs, peerList, useList, orderIndependent, scale) {
    scale = scale || 0.5;
    var i, j, k;
    var lhashList = {};
    var hashList = {};
    var lastPeer;
    var hash;
    lhs.forEach(function (item, index) {
      peerList.push([index, -1]);
      hash = getOrderIndependentHash(item, orderIndependent);
      if (lhashList.hash) {
        lhashList[hash].push(index);
      } else {
        lhashList[hash] = [index];
      }
    });
    rhs.forEach(function (item, index) {
      hash = getOrderIndependentHash(item, orderIndependent);
      if (hashList.hash) {
        hashList[hash].push(index);
      } else {
        hashList[hash] = [index];
      }
    });
    for (lastPeer = undefined, i = 0; i < lhs.length; ++i) {
      if (peerList[i][1] !== -1) {
        lastPeer = peerList[i];
        continue;
      }
      hash = getOrderIndependentHash(lhs[i], orderIndependent);
      if (!hashList[hash]) {
        continue;
      }
      if (lastPeer) {
        k = lastPeer[1] + 1;
      } else {
        k = 0;
      }
      if (k < rhs.length && undefined === useList[k] && objectEqual(lhs[i], rhs[k], orderIndependent)) {
        peerList[i][1] = k;
        useList[k] = i;
        hashList[hash].splice(hashList[hash].indexOf(k), 1);
        if (hashList[hash].length === 0) {
          delete hashList[hash];
        }
        lhashList[hash].splice(lhashList[hash].indexOf(i), 1);
        if (lhashList[hash].length === 0) {
          delete lhashList[hash];
        }
        lastPeer = [i, k];
        continue;
      }
      if (lhashList[hash].length === 1 && hashList[hash].length === 1
        && objectEqual(lhs[i], rhs[hashList[hash][0]], orderIndependent)) {
        k = hashList[hash][0];
        peerList[i][1] = k;
        useList[k] = i;
        delete hashList[hash];
        delete lhashList[hash];
        lastPeer = [i, k];
      }
    }
    for (lastPeer = undefined, i = lhs.length - 1; i >= 0; --i) {
      if (peerList[i][1] !== -1) {
        lastPeer = peerList[i];
        continue;
      }
      hash = getOrderIndependentHash(lhs[i], orderIndependent);
      if (!hashList[hash]) {
        continue;
      }
      if (lastPeer) {
        k = lastPeer[1] - 1;
      } else {
        k = rhs.length - 1;
      }
      if (k >= 0 && undefined === useList[k] && objectEqual(lhs[i], rhs[k], orderIndependent)) {
        peerList[i][1] = k;
        useList[k] = i;
        hashList[hash].splice(hashList[hash].indexOf(k), 1);
        if (hashList[hash].length === 0) {
          delete hashList[hash];
        }
        lhashList[hash].splice(lhashList[hash].indexOf(i), 1);
        if (lhashList[hash].length === 0) {
          delete lhashList[hash];
        }
        lastPeer = [i, k];
        continue;
      }
      if (lhashList[hash].length === 1 && hashList[hash].length === 1
        && objectEqual(lhs[i], rhs[hashList[hash][0]], orderIndependent)) {
        k = hashList[hash][0];
        peerList[i][1] = k;
        useList[k] = i;
        delete hashList[hash];
        delete lhashList[hash];
        lastPeer = [i, k];
      }
    }
    for (i = 0; i < lhs.length; ++i) {
      if (peerList[i][1] !== -1) {
        lastPeer = peerList[i];
        continue;
      }
      hash = getOrderIndependentHash(lhs[i], orderIndependent);
      if (!hashList[hash]) {
        continue;
      }
      for (j = 0; j < hashList[hash].length; ++j) {
        if (objectEqual(lhs[i], rhs[hashList[hash][j]], orderIndependent)) {
          break;
        }
      }
      if (j !== hashList[hash].length) {
        k = hashList[hash][j];
        peerList[i][1] = k;
        useList[k] = i;
        hashList[hash].splice(j, 1);
        if (hashList[hash].length === 0) {
          delete hashList[hash];
        }
        lhashList[hash].splice(lhashList[hash].indexOf(i), 1);
        if (lhashList[hash].length === 0) {
          delete lhashList[hash];
        }
      }
    }
    if (scale !== true) {
      for (lastPeer = undefined, i = 0; i < lhs.length; ++i) {
        if (peerList[i][1] !== -1) {
          lastPeer = peerList[i];
          continue;
        }
        if (lastPeer) {
          k = lastPeer[1] + 1;
          if (k < rhs.length && undefined === useList[k] && objectSimilar(lhs[i], rhs[k], orderIndependent, scale)) {
            peerList[i][1] = k;
            peerList[i][2] = true;
            useList[k] = i;
            lastPeer = [i, k];
            continue;
          }
        }
      }
      for (lastPeer = undefined, i = lhs.length - 1; i >= 0; --i) {
        if (peerList[i][1] !== -1) {
          lastPeer = peerList[i];
          continue;
        }
        if (lastPeer) {
          k = lastPeer[1] - 1;
          if (k >= 0 && undefined === useList[k] && objectSimilar(lhs[i], rhs[k], orderIndependent)) {
            peerList[i][1] = k;
            peerList[i][2] = true;
            useList[k] = i;
            lastPeer = [i, k];
            continue;
          }
        }
      }
    }
    useList.length = rhs.length;
  }

  function compareObject(lhs, rhs, peerList, useList, orderIndependent, scale) {
    scale = scale || 0.5;
    var i, k;
    var lastPeer;
    var akeys = Object.keys(lhs);
    var pkeys = Object.keys(rhs);
    for (i = 0; i < akeys.length; ++i) {
      k = akeys[i];
      if (undefined !== rhs[k]) {
        useList[pkeys.indexOf(k)] = i;
        if (objectEqual(lhs[k], rhs[k], orderIndependent)) {
          peerList.push([k, pkeys.indexOf(k)]);
        } else {
          peerList.push([k, pkeys.indexOf(k), true]);
        }
      } else {
        peerList.push([k, -1]);
      }
    }
    for (lastPeer = undefined, i = 0; i < akeys.length; ++i) {
      if (peerList[i][1] !== -1) {
        lastPeer = peerList[i];
        continue;
      }
      if (lastPeer) {
        k = lastPeer[1] + 1;
      } else {
        k = 0;
      }
      if (k < pkeys.length && undefined === useList[k]
        && objectEqual(lhs[akeys[i]], rhs[pkeys[k]], orderIndependent)) {
        peerList[i][1] = k;
        useList[k] = i;
      }
    }
    for (lastPeer = undefined, i = akeys.length - 1; i >= 0; --i) {
      if (peerList[i][1] !== -1) {
        lastPeer = peerList[i];
        continue;
      }
      if (lastPeer) {
        k = lastPeer[1] - 1;
      } else {
        k = pkeys.length - 1;
      }
      if (k >= 0 && undefined === useList[k]
        && objectEqual(lhs[akeys[i]], rhs[pkeys[k]], orderIndependent)) {
        peerList[i][1] = k;
        useList[k] = i;
      }
    }
    if (scale !== true) {
      for (lastPeer = undefined, i = 0; i < akeys.length; ++i) {
        if (peerList[i][1] !== -1) {
          lastPeer = peerList[i];
          continue;
        }
        if (lastPeer) {
          k = lastPeer[1] + 1;
        } else {
          k = 0;
        }
        if (k < pkeys.length && undefined === useList[k]) {
          if (objectSimilar(lhs[akeys[i]], rhs[pkeys[k]], orderIndependent)) {
            peerList[i][1] = k;
            peerList[i][2] = true;
            useList[k] = i;
          }
        }
      }
      for (lastPeer = undefined, i = pkeys.length - 1; i >= 0; --i) {
        if (peerList[i][1] !== -1) {
          lastPeer = peerList[i];
          continue;
        }
        if (lastPeer) {
          k = lastPeer[1] - 1;
        } else {
          k = pkeys.length - 1;
        }
        if (k >= 0 && undefined === useList[k]) {
          if (objectSimilar(lhs[akeys[i]], rhs[pkeys[k]], orderIndependent)) {
            peerList[i][1] = k;
            peerList[i][2] = true;
            useList[k] = i;
          }
        }
      }
    }
    useList.length = pkeys.length;
  }

  function indexOfArray(array) {
    return function(i) {
      return array[i];
    };
  }

  function pathOfArray() {
    return function (i) {
      return i;
    };
  }

  function targetOfArray() {
    return function (i) {
      return i;
    };
  }

  function indexOfObjectLhs(object) {
    return function (i) {
      return object[i];
    };
  }

  function indexOfObjectRhs(object) {
    var keys = Object.keys(object);
    return function (i) {
      return object[keys[i]];
    };
  }

  function indexOfObjectKey(object) {
    var keys = Object.keys(object);
    return function (i) {
      return keys[i];
    };
  }

  function pathOfObject(peerList) {
    return function (i) {
      return peerList[i][0];
    };
  }

  function pathOfNewObject(peerList, rhs) {
    var keys = Object.keys(rhs);
    return function (i) {
      return keys[peerList[i][1]];
    };
  }

  function targetOfObject(peerList) {
    return function (i) { // eslint-disable-line consistent-return
      if (i !== 0) {
        return peerList[i - 1][0];
      }
    };
  }

  function orderObjectDiff(lhs, rhs, changes, prefilter, path, type, orderIndependent) {
    var i, j, k;
    var peerList = [];
    var useList = [];
    var offset;
    var ll, rl;
    if (type === 'object') {
      compareObject(lhs, rhs, peerList, useList, orderIndependent);
    } else {
      compareArray(lhs, rhs, peerList, useList, orderIndependent);
    }
    var indexOfLhs = (type === 'object') ? indexOfObjectLhs(lhs) : indexOfArray(lhs);
    var indexOfRhs = (type === 'object') ? indexOfObjectRhs(rhs) : indexOfArray(rhs);
    var pathOfItem = (type === 'object') ? pathOfObject(peerList) : pathOfArray();
    var pathOfNewItem = (type === 'object') ? pathOfNewObject(peerList, rhs) : pathOfArray();
    var indexOfNewItem = (type === 'object') ? pathOfNewObject(peerList, rhs) : function () {return -1;};
    var targetOfItem = (type === 'object') ? targetOfObject(peerList) : targetOfArray();
    var indexOfRhsKey = (type === 'object') ? indexOfObjectKey(rhs) : undefined;

    function doDiffIndex(index) {
      var kl = peerList[index][0];
      var kr = peerList[index][1];
      if (peerList[index][2]) {
        if (!prefilter(path, pathOfItem(index), 'E', indexOfLhs(kl), indexOfRhs(kr))) {
          orderDiff(indexOfLhs(kl), indexOfRhs(kr), changes, prefilter, path.concat(pathOfItem(index)), null, orderIndependent); // eslint-disable-line no-use-before-define
        }
      }
      if (type === 'object') {
        if (kl !== indexOfRhsKey(kr)) {
          if (!prefilter(path, pathOfItem(index), 'E', undefined, indexOfRhsKey(kr))) {
            changes.push(new DiffEdit(path.concat(pathOfItem(index)), undefined, indexOfRhsKey(kr)));
            peerList[index][0] = indexOfRhsKey(kr);
          }
        }
      }
    }

    if ((type === 'array' && orderIndependent) || (type === 'object' && orderIndependent !== false)) {
      offset = 0;
      for (i = 0, j = 0; i < useList.length + offset;) {
        if (i < peerList.length && peerList[i][1] === -1) {
          if (prefilter(path, pathOfItem(i), 'D', indexOfLhs(peerList[i][0]))) {
            ++offset;
            ++i;
          } else {
            changes.push(new DiffDeleted(path.concat(pathOfItem(i)), indexOfLhs(peerList[i][0])));
            peerList.splice(i, 1);
          }
          continue;
        }
        if (undefined === useList[j]) {
          if (prefilter(path, pathOfNewItem(i), 'N', undefined, indexOfRhs(j))) {
            --offset;
          } else {
            changes.push(new DiffNew(path.concat(pathOfItem(i)), indexOfRhs(j)));
            peerList.splice(i, 0, [indexOfNewItem(i), j]);
            ++i;
          }
          ++j;
          continue;
        }
        if (peerList[i] && peerList[i][1] !== -1) {
          doDiffIndex(i);
          ++i;
          continue;
        }
        if (undefined !== useList[j]) {
          ++j;
          continue;
        }
      }
    } else {
      offset = 0;
      for (i = 0; i < useList.length + offset;) {
        if (i < peerList.length && peerList[i][1] === -1) {
          if (prefilter(path, pathOfItem(i), 'D', indexOfLhs(peerList[i][0]))) {
            ++offset;
            ++i;
          } else {
            changes.push(new DiffDeleted(path.concat(pathOfItem(i)), indexOfLhs(peerList[i][0])));
            peerList.splice(i, 1);
          }
          continue;
        }
        if (undefined === useList[i - offset]) {
          if (prefilter(path, pathOfNewItem(i), 'N', undefined, indexOfRhs(i - offset))) {
            --offset;
          } else {
            changes.push(new DiffNew(path.concat(pathOfItem(i)), indexOfRhs(i - offset)));
            peerList.splice(i, 0, [indexOfNewItem(i), i - offset]);
            ++i;
          }
          continue;
        }
        if (peerList[i][1] <= i - offset) {
          doDiffIndex(i);
          if (peerList[i][1] < i - offset) {
            // left by move filter
            --offset;
          }
          ++i;
          continue;
        }
        for (k = i + 1; k < peerList.length && peerList[k][1] !== i - offset; ++k); // eslint-disable-line curly
        if (k === peerList.length) {
          // can't find the target because move filter
          --offset;
          continue;
        }
        for (rl = 1; rl < peerList.length - k && peerList[k + rl][1] === i - offset + rl; ++rl); // eslint-disable-line curly
        if (undefined !== useList[peerList[i][1] - 1]) {
          j = peerList[i][1];
          for (ll = 1; ll < peerList.length - i && peerList[i + ll][1] === j + ll; ++ll); // eslint-disable-line curly
          if (ll < rl) {
            rl = peerList[i][1] - 1;
            for (k = i + ll; peerList[k][1] !== rl; ++k); // eslint-disable-line curly
            for (j = 0; j < ll; ++j) {
              if (prefilter(path, pathOfItem(i), 'M', indexOfLhs(peerList[i][0]), targetOfItem(k + 1))) {
                doDiffIndex(i);
                ++offset;
                ++i;
              } else {
                changes.push(new DiffMoved(path.concat(pathOfItem(i)), indexOfLhs(peerList[i][0]), targetOfItem(k + 1)));
                peerList.splice(k + 1, 0, peerList.splice(i, 1)[0]);
              }
            }
            continue;
          }
        }
        for (j = 0; j < rl; ++j) {
          if (prefilter(path, pathOfItem(k + j), 'M', indexOfLhs(peerList[k + j][0]), targetOfItem(i))) {
            ++offset;
          } else {
            changes.push(new DiffMoved(path.concat(pathOfItem(k + j)), indexOfLhs(peerList[k + j][0]), targetOfItem(i)));
            peerList.splice(i, 0, peerList.splice(k + j, 1)[0]);
            doDiffIndex(i);
            ++i;
          }
        }
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
        orderObjectDiff(lhs, rhs, changes, prefilter, path, 'array', orderIndependent);
      } else {
        orderObjectDiff(lhs, rhs, changes, prefilter, path, 'object', orderIndependent);
      }
    } else if (lhs !== rhs) {
      if (!(ltype === 'number' && isNaN(lhs) && isNaN(rhs))) {
        changes.push(new DiffEdit(currentPath, lhs, rhs));
      }
    }
  }

  function observableDiff(lhs, rhs, observer, prefilter, orderIndependent) {
    var changes = [];
    orderDiff(lhs, rhs, changes, getFilter(prefilter), null, null, orderIndependent);
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
    objectSimilar: {
      value: objectSimilar,
      enumerable: true
    },
    objectEqual: {
      value: objectEqual,
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
