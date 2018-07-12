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
  var validKinds = ['N', 'E', 'M', 'D', 'R'];

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

  function DiffNew(path, value, target) {
    DiffNew.super_.call(this, 'N', path);
    if (typeof target !== 'undefined') {
      Object.defineProperty(this, 'lhs', {
        value: target,
        enumerable: true
      });
    }
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

  function DiffReplace(path, origin, key) {
    DiffReplace.super_.call(this, 'R', path);
    Object.defineProperty(this, 'lhs', {
      value: origin,
      enumerable: true
    });
    Object.defineProperty(this, 'rhs', {
      value: key,
      enumerable: true
    });
  }
  inherits(DiffReplace, Diff);

  function getFilter(prefilter) {
    if (prefilter) {
      if (typeof (prefilter) === 'function') {
        return function(path, key, type) {
          return prefilter(path, key, type);
        };
      } else if (typeof (prefilter) === 'object') {
        if (prefilter.prefilter) {
          return function (path, key, type) {
            return prefilter.prefilter(path, key, type);
          };
        }
        if (prefilter.normalize) {
          return function (path, key, type, lhs, rhs) {
            return prefilter.normalize(path, key, type, lhs, rhs);
          };
        }
      }
    }
    return function () {
      return false;
    };
  }

  function getFunctionOption(f) {
    if (typeof (f) === 'function') {
      return f;
    }
    return function () {
      return f;
    };
  }

  function getScale(scale) {
    if (typeof scale === 'boolean') {
      return function () { return scale; };
    } else if (typeof scale === 'number' || scale === undefined) {
      if (scale === undefined) {
        scale = 0.5;
      }
      if (scale > 0 && scale <= 1) {
        return function (path, lhs, rhs, count) {
          if (lhs !== undefined && rhs !== undefined) {
            if (Array.isArray(lhs)) {
              return count > scale * lhs.length && count > scale * rhs.length;
            } else {
              return count > scale * Object.keys(lhs).length && count > scale * Object.keys(rhs).length;
            }
          } else {
            return scale;
          }
        };
      } else {
        if (scale >= 0) {
          scale = -1;
        }
        return function (path, lhs, rhs, count) {
          if (lhs !== undefined && rhs !== undefined) {
            if (Array.isArray(lhs)) {
              return count - lhs.length >= scale && count - rhs.length >= scale;
            } else {
              return count - Object.keys(lhs).length >= scale && count - Object.keys(rhs).length >= scale;
            }
          } else {
            return scale;
          }
        };
      }
    } else if (typeof scale === 'function') {
      return function (path, lhs, rhs, count) {
        if (lhs !== undefined && rhs !== undefined) {
          var result = scale(path, lhs, rhs, count);
          if (typeof result === 'boolean') {
            return result;
          } else if (typeof result === 'number' || result === undefined) {
            if (result === undefined) {
              result = 0.5;
            }
            if (result > 0 && result <= 1) {
              if (Array.isArray(lhs)) {
                return count > result * lhs.length && count > result * rhs.length;
              } else {
                return count > result * Object.keys(lhs).length && count > result * Object.keys(rhs).length;
              }
            } else {
              if (result >= 0) {
                result = -1;
              }
              if (Array.isArray(lhs)) {
                return count - lhs.length >= result && count - rhs.length >= result;
              } else {
                return count - Object.keys(lhs).length >= result && count - Object.keys(rhs).length >= result;
              }
            }
          } else {
            return false;
          }
        } else {
          return scale(path);
        }
      };
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
  function getOrderIndependentHash(object, orderIndependent, pathCache, valueCache) {
    orderIndependent = getFunctionOption(orderIndependent);
    pathCache = pathCache || [];
    valueCache = valueCache || [];

    var accum = 0;
    var accumList = [];
    var type = realTypeOf(object);
    var i;

    if (type === 'array' || type === 'object') {
      if ((i = valueCache.indexOf(object)) !== -1) {
        return hashThisString(pathCache.slice(i).join(','));
      }
    }

    if (type === 'array') {
      var arrayString;
      if (orderIndependent(pathCache)) {
        for (i = 0; i < object.length; ++i) {
          accum += getOrderIndependentHash(object[i], orderIndependent, pathCache.concat(0), valueCache.concat([object]));
        }
        arrayString = '[type: array, hash: ' + accum + ']';
      } else {
        for (i = 0; i < object.length; ++i) {
          accumList.push(getOrderIndependentHash(object[i], orderIndependent, pathCache.concat(i), valueCache.concat([object])));
        }
        arrayString = '[type: array, hash: ' + accumList.join(', ') + ']';
      }
      return hashThisString(arrayString);
    }

    if (type === 'object') {
      var keyValueString;
      var objectString;
      var key;
      if (orderIndependent(pathCache) !== false) {
        for (key in object) {
          if (object.hasOwnProperty(key)) {
            keyValueString = 'key: ' + key + ', value hash: ' + getOrderIndependentHash(object[key], orderIndependent, pathCache.concat(key), valueCache.concat(object));
            accum += hashThisString(keyValueString);
          }
        }
        objectString = '[type: object, hash: ' + accum + ']';
      } else {
        for (key in object) {
          if (object.hasOwnProperty(key)) {
            keyValueString = 'key: ' + key + ', value hash: ' + getOrderIndependentHash(object[key], orderIndependent, pathCache.concat(key), valueCache.concat(object));
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

  function objectSimilar(lhs, rhs, path, scale) {
    scale = getScale(scale);
    var ltype = realTypeOf(lhs);
    var lkeys = [];
    var rkeys = [];
    var count = 0;
    var i;
    if (ltype !== realTypeOf(rhs)) {
      return false;
    }
    if (ltype !== 'array' && ltype !== 'object') {
      return true;
    }
    if (ltype === 'array') {
      for (i = 0; i < lhs.length; ++i) {
        lkeys.push(getOrderIndependentHash(lhs[i]));
      }
      for (i = 0; i < rhs.length; ++i) {
        rkeys.push(getOrderIndependentHash(rhs[i]));
      }
    } else if (ltype === 'object') {
      lkeys = Object.keys(lhs);
      rkeys = Object.keys(rhs);
    }
    lkeys.forEach(function (item) {
      if (rkeys.indexOf(item) !== -1) {
        ++count;
      }
    });
    return scale(path, lhs, rhs, count);
  }

  function objectEqual(lhs, rhs, orderIndependent, pathCache, valueCache) {
    orderIndependent = getFunctionOption(orderIndependent);
    pathCache = pathCache || [];
    valueCache = valueCache || [];
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
    if ((valueCache.indexOf(rhs)) !== -1) {
      // if circular object, only them the same
      return lhs === rhs;
    }
    if (getOrderIndependentHash(lhs, orderIndependent) !== getOrderIndependentHash(rhs, orderIndependent)) {
      return false;
    }
    if (Array.isArray(lhs)) {
      var i;
      if (lhs.length !== rhs.length) {
        return false;
      }
      if (orderIndependent(pathCache)) {
        var hashList = {};
        var hash;
        rhs.forEach(function(item, index) {
          hash = getOrderIndependentHash(item, orderIndependent);
          if (hashList[hash]) {
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
            if (objectEqual(lhs[i], rhs[hashList[hash][j]], orderIndependent, pathCache.concat(hashList[hash][j]), valueCache.concat([rhs]))) {
              break;
            }
          }
          if (j === hashList[hash].length) {
            return false;
          }
        }
      } else {
        for (i = 0; i < lhs.length; ++i) {
          if (!objectEqual(lhs[i], rhs[i], orderIndependent, pathCache.concat(i), valueCache.concat([rhs]))) {
            return false;
          }
        }
      }
      return true;
    } else {
      var key;
      if (orderIndependent(pathCache) === false) {
        if (!objectEqual(Object.keys(lhs), Object.keys(rhs), orderIndependent)) {
          return false;
        }
      }
      for (key in lhs) {
        if (lhs.hasOwnProperty(key)) {
          if (!rhs.hasOwnProperty(key)) {
            return false;
          }
          if (!objectEqual(lhs[key], rhs[key], orderIndependent, pathCache.concat(key), valueCache.concat(rhs))) {
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

  function arrayContain(array, value) {
    var hash = getOrderIndependentHash(value, false);
    for (var i = 0; i < array.length; ++i) {
      if (hash === getOrderIndependentHash(array[i], false)
        && objectEqual(array[i], value, false)) {
        return true;
      }
    }
    return false;
  }

  function compareArray(lhs, rhs, peerList, useList, orderIndependent, scale, pathCache, valueCache) {
    var i, j, k;
    var lhashList = {};
    var hashList = {};
    var lastPeer;
    var hash;
    lhs.forEach(function (item, index) {
      peerList.push([index, -1]);
      hash = getOrderIndependentHash(item, orderIndependent, pathCache.concat(index), valueCache.concat([rhs]));
      if (lhashList[hash]) {
        lhashList[hash].push(index);
      } else {
        lhashList[hash] = [index];
      }
    });
    rhs.forEach(function (item, index) {
      hash = getOrderIndependentHash(item, orderIndependent, pathCache.concat(index), valueCache.concat([rhs]));
      if (hashList[hash]) {
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
      hash = getOrderIndependentHash(lhs[i], orderIndependent, pathCache.concat(i), valueCache.concat([rhs]));
      if (!hashList[hash]) {
        continue;
      }
      if (lastPeer) {
        k = lastPeer[1] + 1;
      } else {
        k = 0;
      }
      if (k < rhs.length && undefined === useList[k] && objectEqual(lhs[i], rhs[k], orderIndependent, pathCache.concat(k), valueCache.concat([rhs]))) {
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
        && objectEqual(lhs[i], rhs[hashList[hash][0]], orderIndependent, pathCache.concat(hashList[hash][0]), valueCache.concat([rhs]))) {
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
      hash = getOrderIndependentHash(lhs[i], orderIndependent, pathCache.concat(i), valueCache.concat([rhs]));
      if (!hashList[hash]) {
        continue;
      }
      if (lastPeer) {
        k = lastPeer[1] - 1;
      } else {
        k = rhs.length - 1;
      }
      if (k >= 0 && undefined === useList[k] && objectEqual(lhs[i], rhs[k], orderIndependent, pathCache.concat(k), valueCache.concat([rhs]))) {
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
        && objectEqual(lhs[i], rhs[hashList[hash][0]], orderIndependent, pathCache.concat(hashList[hash][0]), valueCache.concat([rhs]))) {
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
      hash = getOrderIndependentHash(lhs[i], orderIndependent, pathCache.concat(i), valueCache.concat([rhs]));
      if (!hashList[hash]) {
        continue;
      }
      for (j = 0; j < hashList[hash].length; ++j) {
        if (objectEqual(lhs[i], rhs[hashList[hash][j]], orderIndependent, pathCache.concat(hashList[hash][j]), valueCache.concat([rhs]))) {
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
    if (scale(pathCache) !== true) {
      for (lastPeer = undefined, i = 0; i < lhs.length; ++i) {
        if (peerList[i][1] !== -1) {
          lastPeer = peerList[i];
          continue;
        }
        if (lastPeer) {
          k = lastPeer[1] + 1;
          if (k < rhs.length && undefined === useList[k] && objectSimilar(lhs[i], rhs[k], pathCache.concat(i), scale)) {
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
          if (k >= 0 && undefined === useList[k] && objectSimilar(lhs[i], rhs[k], pathCache.concat(i), scale)) {
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

  function compareObject(lhs, rhs, peerList, useList, orderIndependent, scale, pathCache, valueCache) {
    var i, k;
    var lastPeer;
    var akeys = Object.keys(lhs);
    var pkeys = Object.keys(rhs);
    for (i = 0; i < akeys.length; ++i) {
      k = akeys[i];
      if (undefined !== rhs[k]) {
        useList[pkeys.indexOf(k)] = i;
        if (objectEqual(lhs[k], rhs[k], orderIndependent, pathCache.concat(k), valueCache.concat(rhs))) {
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
        && objectEqual(lhs[akeys[i]], rhs[pkeys[k]], orderIndependent, pathCache.concat(pkeys[k]), valueCache.concat(rhs))) {
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
        && objectEqual(lhs[akeys[i]], rhs[pkeys[k]], orderIndependent, pathCache.concat(pkeys[k]), valueCache.concat(rhs))) {
        peerList[i][1] = k;
        useList[k] = i;
      }
    }
    if (scale(pathCache) !== true) {
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
          if (objectSimilar(lhs[akeys[i]], rhs[pkeys[k]], pathCache.concat(akeys[i]), scale)) {
            peerList[i][1] = k;
            peerList[i][2] = true;
            useList[k] = i;
          }
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
        if (k >= 0 && undefined === useList[k]) {
          if (objectSimilar(lhs[akeys[i]], rhs[pkeys[k]], pathCache.concat(akeys[i]), scale)) {
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

  function pathOfNewObject(rhs) {
    var keys = Object.keys(rhs);
    return function (i, j) {
      return keys[j];
    };
  }

  function targetOfObject(peerList) {
    return function (i) { // eslint-disable-line consistent-return
      if (i !== 0) {
        return peerList[i - 1][0];
      }
    };
  }

  function orderObjectDiff(lhs, rhs, changes, prefilter, path, type, orderIndependent, scale, valueCache) {
    var i, j, k;
    var peerList = [];
    var useList = [];
    var ll, rl;
    if (type === 'object') {
      compareObject(lhs, rhs, peerList, useList, orderIndependent, scale, path, valueCache);
    } else {
      compareArray(lhs, rhs, peerList, useList, orderIndependent, scale, path, valueCache);
    }
    var indexOfLhs = (type === 'object') ? indexOfObjectLhs(lhs) : indexOfArray(lhs);
    var indexOfRhs = (type === 'object') ? indexOfObjectRhs(rhs) : indexOfArray(rhs);
    var pathOfItem = (type === 'object') ? pathOfObject(peerList) : pathOfArray();
    var pathOfNewItem = (type === 'object') ? pathOfNewObject(rhs) : pathOfArray();
    var indexOfNewItem = (type === 'object') ? pathOfNewObject(rhs) : function () {return -1;};
    var targetOfItem = (type === 'object') ? targetOfObject(peerList) : targetOfArray();
    var indexOfRhsKey = (type === 'object') ? indexOfObjectKey(rhs) : undefined;

    function doDiffIndex(index) {
      var kl = peerList[index][0];
      var kr = peerList[index][1];
      if (peerList[index][2]) {
        if (!prefilter(path, pathOfItem(index), 'E', indexOfLhs(kl), indexOfRhs(kr))) {
          if (scale(path.concat(pathOfItem(index))) === false) {
            changes.push(new DiffEdit(path.concat(pathOfItem(index)), indexOfLhs(kl), indexOfRhs(kr)));
          } else {
            orderDiff(indexOfLhs(kl), indexOfRhs(kr), changes, prefilter, path.concat(pathOfItem(index)), orderIndependent, scale, valueCache.concat([rhs])); // eslint-disable-line no-use-before-define
          }
        }
      }
      if (type === 'object') {
        if (kl !== indexOfRhsKey(kr)) {
          if (!prefilter(path, pathOfItem(index), 'R', indexOfLhs(index), indexOfRhsKey(kr))) {
            changes.push(new DiffReplace(path.concat(pathOfItem(index)), indexOfLhs(index), indexOfRhsKey(kr)));
            peerList[index][0] = indexOfRhsKey(kr);
          }
        }
      }
    }

    var length = useList.length;
    var offset = 0;
    if ((type === 'array' && orderIndependent(path)) || (type === 'object' && orderIndependent(path) !== false)) {
      for (i = 0, j = 0; i < peerList.length || i < length + offset;) {
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
        if (j < useList.length && undefined === useList[j]) {
          if (prefilter(path, pathOfNewItem(i, j), 'N', undefined, indexOfRhs(j))) {
            --offset;
          } else {
            changes.push(new DiffNew(path.concat(pathOfNewItem(i, j)), indexOfRhs(j),
              (type === 'object') ? undefined : targetOfItem(j)));
            peerList.splice(i, 0, [indexOfNewItem(i, j), j]);
            ++i;
          }
          ++j;
          continue;
        }
        if (i < peerList.length && peerList[i] && peerList[i][1] !== -1) {
          doDiffIndex(i);
          ++i;
          continue;
        }
        if (j < useList.length && undefined !== useList[j]) {
          ++j;
          continue;
        }
      }
    } else {
      for (i = 0; i < peerList.length || i < length + offset;) {
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
        if (i - offset < useList.length && undefined === useList[i - offset]) {
          if (prefilter(path, pathOfNewItem(i, i - offset), 'N', undefined, indexOfRhs(i - offset))) {
            --offset;
          } else {
            changes.push(new DiffNew(path.concat(pathOfNewItem(i, i - offset)), indexOfRhs(i - offset),
              (type === 'object') ? targetOfItem(i) : targetOfItem(i - offset)));
            peerList.splice(i, 0, [indexOfNewItem(i, i - offset), i - offset]);
            ++i;
          }
          continue;
        }
        if (i < peerList.length && peerList[i][1] <= i - offset) {
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
        if (i < peerList.length && undefined !== useList[peerList[i][1] - 1]) {
          j = peerList[i][1]; // temp use of j
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

  function orderDiff(lhs, rhs, changes, prefilter, path, orderIndependent, scale, valueCache) {
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
      changes.push(new DiffNew(path, rhs));
    } else if (!rdefined && ldefined) {
      changes.push(new DiffDeleted(path, lhs));
    } else if (realTypeOf(lhs) !== realTypeOf(rhs)) {
      changes.push(new DiffEdit(path, lhs, rhs));
    } else if (realTypeOf(lhs) === 'date' && (lhs - rhs) !== 0) {
      changes.push(new DiffEdit(path, lhs, rhs));
    } else if (valueCache.indexOf(rhs) !== -1) {
      // rhs has circular
      if (lhs !== rhs) {
        changes.push(new DiffEdit(path, lhs, rhs));
      }
      return;
    } else if (ltype === 'object' && lhs !== null && rhs !== null) {
      orderObjectDiff(lhs, rhs, changes, prefilter, path, Array.isArray(lhs) ? 'array' : 'object', orderIndependent, scale, valueCache);
    } else if (lhs !== rhs) {
      if (!(ltype === 'number' && isNaN(lhs) && isNaN(rhs))) {
        changes.push(new DiffEdit(path, lhs, rhs));
      }
    }
  }

  function observableDiff(lhs, rhs, observer, prefilter, orderIndependent, scale) {
    var changes = [];
    orderDiff(lhs, rhs, changes, getFilter(prefilter), [], getFunctionOption(orderIndependent), getScale(scale === undefined ? 0.5 : scale), []);
    if (observer) {
      for (var i = 0; i < changes.length; ++i) {
        observer(changes[i]);
      }
    }
    return changes;
  }

  function accumulateDiff(lhs, rhs, prefilter, accum, orderIndependent, scale) {
    var observer = (accum) ?
      function (difference) {
        if (difference) {
          accum.push(difference);
        }
      } : undefined;
    var changes = observableDiff(lhs, rhs, observer, prefilter, orderIndependent, scale);
    return (accum) ? accum : changes;
  }

  function reachByPath(object, path, c) {
    path = path || [];
    var i = -1,
      last = path.length - 1;
    if (last === -1) {
      return true;
    }
    while (++i < last) {
      if (typeof object[path[i]] === 'undefined') {
        if (c) {
          object[path[i]] = ((typeof path[i + 1]) === 'number' ? [] : {});
        } else {
          return false;
        }
      }
      object = object[path[i]];
    }
    var lastType = (typeof path[last] === 'number') ? 'array' : 'object';
    if (realTypeOf(object) !== lastType) {
      return false;
    }
    return object;
  }

  function objectInsertIndex(object, key, index, value) {
    var keys = Object.keys(object);
    var help = {};
    for (; index < keys.length; ++index) {
      help[keys[index]] = object[keys[index]];
      delete object[keys[index]];
    }
    object[key] = value;
    for (key in help) {
      object[key] = help[key];
    }
  }

  function objectInsert(object, key, target, value) {
    var keys = Object.keys(object);
    var i;
    if (undefined === target) {
      i = 0;
    } else {
      i = keys.indexOf(target);
      // can't find the target in the object insert into the last.
      if (i === -1) {
        i = keys.length;
      } else {
        ++i;
      }
    }
    objectInsertIndex(object, key, i, value);
  }

  function objectMove(object, key, target, value) {
    var v = object[key];
    if (undefined !== v) {
      // use self value for move
      value = v;
      delete object[key];
    }
    objectInsert(object, key, target, value);
  }

  function objectReplaceKey(object, key, newKey, value) {
    var v = object[key];
    var i;
    if (undefined !== v) {
      // use self value for replace
      value = v;
      i = Object.keys(object).indexOf(key);
      delete object[key];
    } else {
      // can't fine the sub key of object, add the value
      i = Object.keys(object).length;
    }
    objectInsertIndex(object, newKey, i, value);
  }

  function applyChange(target, source, change) {
    if (typeof change === 'undefined' && source && ~validKinds.indexOf(source.kind)) {
      change = source;
      source = undefined;
    }
    var path = change.path;
    if (!path) {
      return true;
    }
    var last = path[path.length - 1];
    var it = reachByPath(target, path, true);
    var th;
    if (!it) {
      return false;
    }
    if (source) {
      th = reachByPath(source, path);
      if (!th) {
        return false;
      }
    }
    switch (change.kind) {
      case 'M':
        if (source) {
          if (typeof last !== 'number' && change.rhs
            && realTypeOf(change.lhs) !== realTypeOf(th[change.rhs])) {
            return false;
          }
        }
        if (typeof last === 'number') {
          it.splice(change.rhs, 0, it.splice(last, 1)[0]);
        } else {
          objectMove(it, last, change.rhs, change.lhs);
        }
        break;
      case 'D':
        if (realTypeOf(it[last]) !== realTypeOf(change.lhs)) {
          return false;
        }
        if (typeof last === 'number') {
          it.splice(last, 1);
        } else {
          delete it[last];
        }
        break;
      case 'E':
        if (source) {
          if (typeof last === 'number') {
            if (!arrayContain(th, change.rhs)) {
              return false;
            }
          } else {
            if (!objectEqual(th[last], change.rhs, false)) {
              return false;
            }
          }
        }
        if (it[last] && realTypeOf(it[last]) !== realTypeOf(change.lhs)) {
          return false;
        }
        it[last] = change.rhs;
        break;
      case 'N':
        if (source) {
          if (typeof last === 'number') {
            th = th[change.lhs];
          } else {
            th = th[last];
          }
          if (!objectEqual(th, change.rhs, false)) {
            return false;
          }
        }
        if (typeof last === 'number') {
          it.splice(last, 0, change.rhs);
        } else if (change.lhs) {
          objectInsert(it, last, change.lhs, change.rhs);
        } else {
          it[last] = change.rhs;
        }
        break;
      case 'R':
        objectReplaceKey(it, last, change.rhs, change.lhs);
        break;
      default:
        return false;
    }
    return true;
  }

  function applyDiff(target, source, changes, filter, prefilter, orderIndependent, scale) {
    if (!Array.isArray(changes)) {
      scale = orderIndependent;
      orderIndependent = prefilter;
      prefilter = filter;
      filter = changes;
      changes = undefined;
    }
    var failList = [];
    var onChange = function (change) {
      if (!filter || filter(target, source, change)) {
        if (!change.path) {
          target = change.rhs;
          throw 'FullReplace';
        }
        if (!applyChange(target, source, change)) {
          failList.push(change);
        }
      }
    };
    try {
      if (!changes) {
        observableDiff(target, source, onChange, prefilter, orderIndependent, scale);
      } else {
        changes.forEach(onChange);
      }
    } catch (e) {
      if (e === 'FullReplace') {
        return target;
      }
    }
    if (failList.length) {
      throw failList;
    }
    return target;
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
