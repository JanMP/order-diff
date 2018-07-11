(function (root, factory) {
  if (typeof define === 'function' && define.amd) { // eslint-disable-line no-undef
    define(['order-diff', 'expect.js'], factory);// eslint-disable-line no-undef
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('../'), require('expect.js'));
  } else {
    root.returnExports = factory(root.OrderDiff, root.expect);
  }
  // eslint-disable-next-line no-undef
}(typeof self !== 'undefined' ? self : this, function (order, expect) {

  describe('order-diff', function () {
    var empty = {};

    describe('A target that has no properties', function () {

      it('shows no differences when compared to another empty object', function () {
        expect(order.diff(empty, {}).length).to.be(0);
      });

      describe('when compared to a different type of keyless object', function () {
        var comparandTuples = [
          ['an array', {
            key: []
          }],
          ['an object', {
            key: {}
          }],
          ['a date', {
            key: new Date()
          }],
          ['a null', {
            key: null
          }],
          ['a regexp literal', {
            key: /a/
          }],
          ['Math', {
            key: Math
          }]
        ];

        comparandTuples.forEach(function (lhsTuple) {
          comparandTuples.forEach(function (rhsTuple) {
            if (lhsTuple[0] === rhsTuple[0]) {
              return;
            }
            it('shows differences when comparing ' + lhsTuple[0] + ' to ' + rhsTuple[0], function () {
              var diff = order.diff(lhsTuple[1], rhsTuple[1]);
              expect(diff).to.be.ok();
              expect(diff.length).to.be(1);
              expect(diff[0]).to.have.property('kind');
              expect(diff[0].kind).to.be('E');
            });
          });
        });
      });

      describe('when compared with an object having other properties', function () {
        var comparand = {
          other: 'property',
          another: 13.13
        };
        var diff = order.diff(empty, comparand);

        it('the differences are reported', function () {
          expect(diff).to.be.ok();
          expect(diff.length).to.be(2);

          expect(diff[0]).to.have.property('kind');
          expect(diff[0].kind).to.be('N');
          expect(diff[0]).to.have.property('path');
          expect(diff[0].path).to.be.an(Array);
          expect(diff[0].path[0]).to.eql('other');
          expect(diff[0]).to.have.property('rhs');
          expect(diff[0].rhs).to.be('property');

          expect(diff[1]).to.have.property('kind');
          expect(diff[1].kind).to.be('N');
          expect(diff[1]).to.have.property('path');
          expect(diff[1].path).to.be.an(Array);
          expect(diff[1].path[0]).to.eql('another');
          expect(diff[1]).to.have.property('rhs');
          expect(diff[1].rhs).to.be(13.13);
        });

      });

    });

    describe('A target that has one property', function () {
      var lhs = {
        one: 'property'
      };

      it('shows no differences when compared to itself', function () {
        expect(order.diff(lhs, lhs).length).to.be(0);
      });

      it('shows the property as removed when compared to an empty object', function () {
        var diff = order.diff(lhs, empty);
        expect(diff).to.be.ok();
        expect(diff.length).to.be(1);
        expect(diff[0]).to.have.property('kind');
        expect(diff[0].kind).to.be('D');
      });

      it('shows the property as edited when compared to an object with null', function () {
        var diff = order.diff(lhs, {
          one: null
        });
        expect(diff).to.be.ok();
        expect(diff.length).to.be(1);
        expect(diff[0]).to.have.property('kind');
        expect(diff[0].kind).to.be('E');
      });

      it('shows the property as edited when compared to an array', function () {
        var diff = order.diff(lhs, ['one']);
        expect(diff).to.be.ok();
        expect(diff.length).to.be(1);
        expect(diff[0]).to.have.property('kind');
        expect(diff[0].kind).to.be('E');
      });

    });

    describe('A target that has null value', function () {
      var lhs = {
        key: null
      };

      it('shows no differences when compared to itself', function () {
        expect(order.diff(lhs, lhs).length).to.be(0);
      });

      it('shows the property as removed when compared to an empty object', function () {
        var diff = order.diff(lhs, empty);
        expect(diff).to.be.ok();
        expect(diff.length).to.be(1);
        expect(diff[0]).to.have.property('kind');
        expect(diff[0].kind).to.be('D');
      });

      it('shows the property is changed when compared to an object that has value', function () {
        var diff = order.diff(lhs, {
          key: 'value'
        });
        expect(diff).to.be.ok();
        expect(diff.length).to.be(1);
        expect(diff[0]).to.have.property('kind');
        expect(diff[0].kind).to.be('E');
      });

      it('shows that an object property is changed when it is set to null', function () {
        lhs.key = {
          nested: 'value'
        };
        var diff = order.diff(lhs, {
          key: null
        });
        expect(diff).to.be.ok();
        expect(diff.length).to.be(1);
        expect(diff[0]).to.have.property('kind');
        expect(diff[0].kind).to.be('E');
      });

    });


    describe('A target that has a date value', function () {
      var lhs = {
        key: new Date(555555555555)
      };

      it('shows the property is changed with a new date value', function () {
        var diff = order.diff(lhs, {
          key: new Date(777777777777)
        });
        expect(diff).to.be.ok();
        expect(diff.length).to.be(1);
        expect(diff[0]).to.have.property('kind');
        expect(diff[0].kind).to.be('E');
      });

    });


    describe('A target that has a NaN', function () {
      var lhs = {
        key: NaN
      };

      it('shows the property is changed when compared to another number', function () {
        var diff = order.diff(lhs, {
          key: 0
        });
        expect(diff).to.be.ok();
        expect(diff.length).to.be(1);
        expect(diff[0]).to.have.property('kind');
        expect(diff[0].kind).to.be('E');
      });

      it('shows no differences when compared to another NaN', function () {
        var diff = order.diff(lhs, {
          key: NaN
        });
        expect(diff.length).to.be(0);
      });

    });


    describe('can revert namespace using noConflict', function () {
      if (order.noConflict) {
        order = order.noConflict();

        it('conflict is restored (when applicable)', function () {
          // In node there is no global conflict.
          if (typeof globalConflict !== 'undefined') {
            expect(OrderDiff).to.be(order); // eslint-disable-line no-undef
          }
        });

        it('OrderDiff functionality available through result of noConflict()', function () {
          expect(order.applyDiff).to.be.a('function');
        });
      }
    });


    describe('When filtering keys', function () {
      var lhs = {
        enhancement: 'Filter/Ignore Keys?',
        numero: 11,
        submittedBy: 'ericclemmons',
        supportedBy: ['ericclemmons'],
        status: 'open'
      };
      var rhs = {
        enhancement: 'Filter/Ignore Keys?',
        numero: 11,
        submittedBy: 'ericclemmons',
        supportedBy: [
          'ericclemmons',
          'TylerGarlick',
          'flitbit',
          'ergdev'
        ],
        status: 'closed',
        fixedBy: 'flitbit'
      };

      describe('if the filtered property is an array', function () {

        it('changes to the array do not appear as a difference', function () {
          var prefilter = function (path, key, type) { // eslint-disable-line no-unused-vars
            return key === 'supportedBy';
          };
          var diff = order(lhs, rhs, prefilter);
          expect(diff).to.be.ok();
          expect(diff.length).to.be(2);
          expect(diff[0]).to.have.property('kind');
          expect(diff[0].kind).to.be('E');
          expect(diff[1]).to.have.property('kind');
          expect(diff[1].kind).to.be('N');
        });

      });

      describe('if the filtered property is not an array', function () {

        it('changes do not appear as a difference', function () {
          var prefilter = function (path, key, type) { // eslint-disable-line no-unused-vars
            return key === 'fixedBy';
          };
          var diff = order(lhs, rhs, prefilter);
          expect(diff).to.be.ok();
          expect(diff.length).to.be(4);
          expect(diff[0]).to.have.property('kind');
          expect(diff[0].kind).to.be('N');
          expect(diff[1]).to.have.property('kind');
          expect(diff[1].kind).to.be('N');
          expect(diff[2]).to.have.property('kind');
          expect(diff[2].kind).to.be('N');
          expect(diff[3]).to.have.property('kind');
          expect(diff[3].kind).to.be('E');
        });

      });
    });

    describe('A target that has nested values', function () {
      var nestedOne = {
        noChange: 'same',
        levelOne: {
          levelTwo: 'value'
        },
        arrayOne: [{
          objValue: 'value'
        }]
      };
      var nestedTwo = {
        noChange: 'same',
        levelOne: {
          levelTwo: 'another value'
        },
        arrayOne: [{
          objValue: 'new value'
        }, {
          objValue: 'more value'
        }]
      };

      it('shows no differences when compared to itself', function () {
        expect(order.diff(nestedOne, nestedOne).length).to.be(0);
      });

      it('shows the property as removed when compared to an empty object', function () {
        var diff = order(nestedOne, empty);
        expect(diff).to.be.ok();
        expect(diff.length).to.be(3);
        expect(diff[0]).to.have.property('kind');
        expect(diff[0].kind).to.be('D');
        expect(diff[1]).to.have.property('kind');
        expect(diff[1].kind).to.be('D');
      });

      it('shows the property is changed when compared to an object that has value', function () {
        var diff = order.diff(nestedOne, nestedTwo);
        expect(diff).to.be.ok();
        expect(diff.length).to.be(4);
      });

      it('shows the property as added when compared to an empty object on left', function () {
        var diff = order.diff(empty, nestedOne);
        expect(diff).to.be.ok();
        expect(diff.length).to.be(3);
        expect(diff[0]).to.have.property('kind');
        expect(diff[0].kind).to.be('N');
      });

      describe('when diff is applied to a different empty object', function () {
        var diff = order.diff(nestedOne, nestedTwo);

        var result = {
          arrayOne: [{
            objValue: 'value'
          }]
        };

        it('has result with nested values', function () {
          order.applyChange(result, nestedTwo, diff[0]);
          expect(result.levelOne).to.be.ok();
          expect(result.levelOne).to.be.an('object');
          expect(result.levelOne.levelTwo).to.be.ok();
          expect(result.levelOne.levelTwo).to.eql('another value');
        });

        it('has result without deleted value', function () {
          order.applyChange(result, nestedTwo, diff[1]);
          expect(result.arrayOne).to.be.ok();
          expect(result.arrayOne).to.be.an('array');
          expect(result.arrayOne.length).to.be(0);
        });

        it('has result with new added array objects', function () {
          order.applyChange(result, nestedTwo, diff[2]);
          expect(result.arrayOne).to.be.ok();
          expect(result.arrayOne).to.be.an('array');
          expect(result.arrayOne[0]).to.be.ok();
          expect(result.arrayOne[0].objValue).to.be.ok();
          expect(result.arrayOne[0].objValue).to.equal('new value');
        });

        it('has result with other added array objects', function () {
          order.applyChange(result, nestedTwo, diff[3]);
          expect(result.arrayOne).to.be.ok();
          expect(result.arrayOne).to.be.an('array');
          expect(result.arrayOne[1]).to.be.ok();
          expect(result.arrayOne[1].objValue).to.be.ok();
          expect(result.arrayOne[1].objValue).to.equal('more value');
        });
      });
    });

    describe('regression test for bug #10, ', function () {
      var lhs = {
        id: 'Release',
        phases: [{
          id: 'Phase1',
          tasks: [{
            id: 'Task1'
          }, {
            id: 'Task2'
          }]
        }, {
          id: 'Phase2',
          tasks: [{
            id: 'Task3'
          }]
        }]
      };
      var rhs = {
        id: 'Release',
        phases: [{
          // E: Phase1 -> Phase2
          id: 'Phase2',
          tasks: [{
            id: 'Task3'
          }]
        }, {
          id: 'Phase1',
          tasks: [{
            id: 'Task1'
          }, {
            id: 'Task2'
          }]
        }]
      };

      describe('differences in nested arrays are detected', function () {
        var diff = order.diff(lhs, rhs);

        // there should be differences
        expect(diff).to.be.ok();
        expect(diff.length).to.be(1);

        it('differences can be applied', function () {
          var applied = order.applyDiff(lhs, rhs);

          it('and the result equals the rhs', function () {
            expect(applied).to.eql(rhs);
          });

        });
      });

    });

    describe('regression test for bug #35', function () {
      var lhs = ['a', 'a', 'a'];
      var rhs = ['a'];

      it('can apply diffs between two top level arrays', function () {
        var differences = order.diff(lhs, rhs);

        differences.forEach(function (it) {
          order.applyChange(lhs, rhs, it);
        });

        expect(lhs).to.eql(['a']);
      });
    });

    describe('Objects from different frames', function () {
      if (typeof globalConflict === 'undefined') { return; }

      // eslint-disable-next-line no-undef
      var frame = document.createElement('iframe');
      // eslint-disable-next-line no-undef
      document.body.appendChild(frame);

      var lhs = new frame.contentWindow.Date(2010, 1, 1);
      var rhs = new frame.contentWindow.Date(2010, 1, 1);

      it('can compare date instances from a different frame', function () {
        var differences = order.diff(lhs, rhs);

        expect(differences).to.be(undefined);
      });
    });

    describe('Comparing regexes should work', function () {
      var lhs = /foo/;
      var rhs = /foo/i;

      it('can compare regex instances', function () {
        var diff = order.diff(lhs, rhs);

        expect(diff.length).to.be(1);

        expect(diff[0].kind).to.be('E');
        expect(diff[0].path).to.not.be.ok();
        expect(diff[0].lhs).to.be('/foo/');
        expect(diff[0].rhs).to.be('/foo/i');
      });
    });

    describe('subject.toString is not a function', function () {
      var lhs = {
        left: 'yes',
        right: 'no',
      };
      var rhs = {
        left: {
          toString: true,
        },
        right: 'no',
      };

      it('should not throw a TypeError', function () {
        var diff = order.diff(lhs, rhs);

        expect(diff.length).to.be(1);
      });
    });

    describe('regression test for issue #83', function () {
      var lhs = {
        date: null
      };
      var rhs = {
        date: null
      };

      it('should not detect a difference', function () {
        expect(order.diff(lhs, rhs).length).to.be(0);
      });
    });

    describe('regression test for issue #70', function () {

      it('should detect a difference with undefined property on lhs', function () {
        var diff = order.diff({ foo: undefined }, {});

        expect(diff).to.be.an(Array);
        expect(diff.length).to.be(1);

        expect(diff[0].kind).to.be('D');
        expect(diff[0].path).to.be.an('array');
        expect(diff[0].path).to.have.length(1);
        expect(diff[0].path[0]).to.be('foo');
        expect(diff[0].lhs).to.be(undefined);

      });

      it('should detect a difference with undefined property on rhs', function () {
        var diff = order.diff({}, { foo: undefined });

        expect(diff).to.be.an(Array);
        expect(diff.length).to.be(1);

        expect(diff[0].kind).to.be('N');
        expect(diff[0].path).to.be.an('array');
        expect(diff[0].path).to.have.length(1);
        expect(diff[0].path[0]).to.be('foo');
        expect(diff[0].rhs).to.be(undefined);

      });
    });

    describe('regression test for issue #98', function () {
      var lhs = { foo: undefined };
      var rhs = { foo: undefined };

      it('should not detect a difference with two undefined property values', function () {
        var diff = order.diff(lhs, rhs);

        expect(diff.length).to.be(0);

      });
    });

    describe('regression tests for issue #102', function () {
      it('should not throw a TypeError', function () {

        var diff = order.diff(null, undefined);

        expect(diff).to.be.an(Array);
        expect(diff.length).to.be(1);

        expect(diff[0].kind).to.be('D');
        expect(diff[0].lhs).to.be(null);

      });

      it('should not throw a TypeError', function () {

        var diff = order.diff(Object.create(null), { foo: undefined });

        expect(diff).to.be.an(Array);
        expect(diff.length).to.be(1);

        expect(diff[0].kind).to.be('N');
        expect(diff[0].rhs).to.be(undefined);
      });
    });

    describe('Order independent hash testing', function () {
      function sameHash(a, b) {
        expect(order.orderIndepHash(a, true)).to.equal(order.orderIndepHash(b, true));
      }

      function differentHash(a, b) {
        expect(order.orderIndepHash(a, true)).to.not.equal(order.orderIndepHash(b, true));
      }

      describe('Order indepdendent hash function should give different values for different objects', function () {
        it('should give different values for different "simple" types', function () {
          differentHash(1, -20);
          differentHash('foo', 45);
          differentHash('pie', 'something else');
          differentHash(1.3332, 1);
          differentHash(1, null);
          differentHash('this is kind of a long string, don\'t you think?', 'the quick brown fox jumped over the lazy doge');
          differentHash(true, 2);
          differentHash(false, 'flooog');
        });

        it('should give different values for string and object with string', function () {
          differentHash('some string', { key: 'some string' });
        });

        it('should give different values for number and array', function () {
          differentHash(1, [1]);
        });

        it('should give different values for string and array of string', function () {
          differentHash('string', ['string']);
        });

        it('should give different values for boolean and object with boolean', function () {
          differentHash(true, { key: true });
        });

        it('should give different values for different arrays', function () {
          differentHash([1, 2, 3], [1, 2]);
          differentHash([1, 4, 5, 6], ['foo', 1, true, undefined]);
          differentHash([1, 4, 6], [1, 4, 7]);
          differentHash([1, 3, 5], ['1', '3', '5']);
        });

        it('should give different values for different objects', function () {
          differentHash({ key: 'value' }, { other: 'value' });
          differentHash({ a: { b: 'c' } }, { a: 'b' });
        });

        it('should differentiate between arrays and objects', function () {
          differentHash([1, true, '1'], { a: 1, b: true, c: '1' });
        });
      });

      describe('Order independent hash function should work in pathological cases', function () {
        it('should work in funky javascript cases', function () {
          differentHash(undefined, null);
          differentHash(0, undefined);
          differentHash(0, null);
          differentHash(0, false);
          differentHash(0, []);
          differentHash('', []);
          differentHash(3.22, '3.22');
          differentHash(true, 'true');
          differentHash(false, 0);
        });

        it('should work on empty array and object', function () {
          differentHash([], {});
        });

        it('should work on empty object and undefined', function () {
          differentHash({}, undefined);
        });

        it('should work on empty array and array with 0', function () {
          differentHash([], [0]);
        });
      });

      describe('Order independent hash function should be order independent', function () {
        it('should not care about array order', function () {
          sameHash([1, 2, 3], [3, 2, 1]);
          sameHash(['hi', true, 9.4], [true, 'hi', 9.4]);
        });

        it('should not care about key order in an object', function () {
          sameHash({ foo: 'bar', foz: 'baz' }, { foz: 'baz', foo: 'bar' });
        });

        it('should work with complicated objects', function () {
          var obj1 = {
            foo: 'bar',
            faz: [
              1,
              'pie',
              {
                food: 'yum'
              }
            ]
          };

          var obj2 = {
            faz: [
              'pie',
              {
                food: 'yum'
              },
              1
            ],
            foo: 'bar'
          };

          sameHash(obj1, obj2);
        });
      });
    });


    describe('Order indepedent array comparison should work', function () {
      it('can compare simple arrays in an order independent fashion', function () {
        var lhs = [1, 2, 3];
        var rhs = [1, 3, 2];

        var diff = order.diff(lhs, rhs, null, null, true);
        expect(diff.length).to.be(0);
      });

      it('still works with repeated elements', function () {
        var lhs = [1, 1, 2];
        var rhs = [1, 2, 1];

        var diff = order.diff(lhs, rhs, null, null, true);
        expect(diff.length).to.be(0);
      });

      it('works on complex objects', function () {
        var obj1 = {
          foo: 'bar',
          faz: [
            1,
            'pie',
            {
              food: 'yum'
            }
          ]
        };

        var obj2 = {
          faz: [
            'pie',
            {
              food: 'yum'
            },
            1
          ],
          foo: 'bar'
        };

        var diff = order.diff(obj1, obj2, null, null, true);
        expect(diff.length).to.be(0);
      });

      it('should report some difference in non-equal arrays', function () {
        var lhs = [1, 2, 3];
        var rhs = [2, 2, 3];

        var diff = order.diff(lhs, rhs, null, null, true);
        expect(diff.length).to.be.ok();
      });


    });

  });

}));
