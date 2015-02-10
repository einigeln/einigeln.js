var assert = require('assert');
var Einigeln = require('../einigeln');

// TODO: Implement some more tests like these: https://github.com/silexphp/Pimple/blob/master/src/Pimple/Tests/PimpleTest.php

describe('Einigeln', function () {

    describe('Parameter', function () {

        it('should return the given values', function () {
            var di = new Einigeln({bar: 'baz', 'foo': 42});

            assert.equal('baz', di.get('bar'));
            assert.equal(42, di.get('foo'));

            var array = ['b'];
            var obj = {a: 42};

            di.set('int', 1);
            di.set('float', 2.3);
            di.set('string', 'c');
            di.set('array', array);
            di.set('object', obj);

            assert.equal(1, di.get('int'));
            assert.equal(2.3, di.get('float'));
            assert.equal('c', di.get('string'));
            assert.equal(array, di.get('array'));
            assert.equal(obj, di.get('object'));
        });
    });

    describe('Metadata', function () {
        it('should return all registered keys', function () {
            var di = new Einigeln();

            di.set('foo', 1);
            di.set('bar', 1);
            di.set('baz', function () {
                return 42;
            });

            assert.deepEqual(['foo', 'bar', 'baz'], di.keys());
        });

        it('should tell which services exists', function () {
            var di = new Einigeln();

            di.set('foo', 1);
            di.set('baz', function () {
                return 42;
            });

            assert.strictEqual(true, di.exists('foo'));
            assert.strictEqual(true, di.exists('baz'));

            assert.strictEqual(false, di.exists('nope'));
            assert.strictEqual(false, di.exists(''));
        });
    });

    describe('Services', function () {

        it('should instantiate simple services', function () {
            var di = new Einigeln();

            di.set('foo', function () {
                return 'bar';
            });

            assert.equal('bar', di.get('foo'));
        });

        it('should instantiate extended services', function () {
            var di = new Einigeln();

            di.set('bar', 42);
            di.set('foo', function (di) {
                return 'bar: ' + di.get('bar');
            });

            assert.equal('bar: 42', di.get('foo'));
        });

        it('should instantiate services only once', function () {
            var di = new Einigeln();

            di.set('foo', function () {
                return new Error('test');
            });

            assert.strictEqual(di.get('foo'), di.get('foo'));
        });

        it('should instantiate factory services always', function () {
            var di = new Einigeln();

            di.set('foo', di.factory(function () {
                return new Error('test');
            }));

            assert.notStrictEqual(di.get('foo'), di.get('foo'));
        });
    });

    describe('Raw definitions', function () {

        it('should return correct raw definition', function () {
            var di = new Einigeln();

            var raw = function () {
                return 'bar';
            };

            di.set('foo', raw);

            assert.strictEqual(raw, di.raw('foo'));
        });

        it('should return parameter', function () {
            var di = new Einigeln();

            di.set('foo', 42);

            assert.strictEqual(42, di.raw('foo'));
        });
    });

    describe('Protected', function () {
        it('should return protected definitions as is', function () {
            var di = new Einigeln();

            var raw = function () {
                return 'bar';
            };

            di.set('foo', di.protect(raw));

            assert.strictEqual(raw, di.get('foo'));
        });
    });

    describe('Extend', function () {
        it('should extend service', function () {
            var di = new Einigeln({bar: 42});

            di.set('foo', function () {
                return 'bar';
            });

            di.extend('foo', function (innerResult, container) {
                return '' + innerResult + ' ' + container.get('bar');
            });

            assert.strictEqual('bar 42', di.get('foo'));
            assert.strictEqual('bar 42', di.get('foo'));
        });

        it('should extend a factory', function () {
            var di = new Einigeln();

            var counter = 42;

            di.set('foo', di.factory(function () {
                return counter++;
            }));

            di.extend('foo', function (innerResult) {
                return '' + innerResult;
            });

            // Expecting differnt results because its a factory.
            assert.strictEqual('42', di.get('foo'));
            assert.strictEqual('43', di.get('foo'));
        });
    });
});
