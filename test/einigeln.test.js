var assert = require('assert');
var Einigeln = require('../einigeln');

// TODO: Implement some more tests like these: https://github.com/silexphp/Pimple/blob/master/src/Pimple/Tests/PimpleTest.php

describe('Einigeln', function () {

    describe('Parameter', function () {

        it('should return the given values', function () {
            var di = new Einigeln();

            di.set('bar', 'baz');
            di.set('foo', 42);

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
            var di = new Einigeln();
            di.set('bar', 42);

            di.set('foo', function () {
                return 'bar';
            });

            di.extend('foo', function (oldDefinition, container) {
                return '' + oldDefinition() + ' ' + container.get('bar');
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

            di.extend('foo', function (oldDefinition) {
                return '' + oldDefinition();
            });

            // Expecting differnt results because its a factory.
            assert.strictEqual('42', di.get('foo'));
            assert.strictEqual('43', di.get('foo'));
        });
    });

    describe('Inject', function () {
        it('should define services without injections', function () {
            var di = new Einigeln();

            di.inject('foo', function () {
                assert.deepEqual({}, [].slice.call(arguments));
                return 42;
            });

            assert.strictEqual(42, di.get('foo'));
        });

        it('should define classes as services without injections', function () {
            var di = new Einigeln();

            var foo = function Foo() {
                assert.deepEqual({}, [].slice.call(arguments));
            };

            di.inject('foo', foo);

            assert(di.get('foo') instanceof foo);
        });

        it('should define classes as services with given injections', function () {
            var di = new Einigeln();

            di.set('hello', 'world');
            di.set('bar', 42);

            var foo = function Foo(hello, answer) {
                assert.deepEqual(["world", 42], [].slice.call(arguments));
                this.bar = function () {
                    return '' + hello + ': ' + answer;
                };
            };

            di.inject('foo', foo, ['hello', 'bar']);

            assert(di.get('foo') instanceof foo);
            assert.strictEqual('world: 42', di.get('foo').bar());
        });

        it('should define services with given injections', function () {
            var di = new Einigeln();

            di.set('hello', 'world');

            di.set('foo', function () {
                return 42;
            });

            di.inject('bar', function (foo, hello) {
                assert.deepEqual([42, 'world'], [].slice.call(arguments));
                return '' + hello + ': ' + foo;
            }, ['foo', 'hello']);

            assert.strictEqual(42, di.get('foo'));
            assert.strictEqual('world: 42', di.get('bar'));
        });

        /*
        it('should define services with magic injections', function () {
            var di = new Einigeln();

            di.set('hello', 'world');
            di.set('foo', function () {
                return 42;
            });

            di.inject('baz', function (foo, hello) {
                assert.deepEqual([42, 'world'], [].slice.call(arguments));
                return '' + hello + ': ' + foo;
            });

            assert.strictEqual(42, di.get('foo'));
            assert.strictEqual('world: 42', di.get('baz'));
        });

        it('should define services with magic injections from variables', function () {
            var di = new Einigeln();

            di.set('hello', 'world');
            di.set('foo', function () {
                return 42;
            });

            var service = function (foo, hello) {
                assert.deepEqual([42, 'world'], [].slice.call(arguments));
                return '' + hello + ': ' + foo;
            };

            di.inject('baz', service);

            assert.strictEqual(42, di.get('foo'));
            assert.strictEqual('world: 42', di.get('baz'));
        });
         */
    });

    describe('Tags', function () {
        it('should start with empty tags', function () {
            var di = new Einigeln();
            assert.deepEqual([], di.tagged('aTag'));
        });

        it('should return given tags', function () {
            var di = new Einigeln();

            di.tag('foo', 'aTag');
            di.tag('bar', 'aTag', {some: 'config'});

            assert.deepEqual([{name: 'foo', config: {}}, {name: 'bar', config: {some: 'config'}}], di.tagged('aTag'));
        });

        it('should not return unique tags', function () {
            var di = new Einigeln();

            di.tag('foo', 'aTag');
            di.tag('foo', 'aTag');

            assert.deepEqual([{name: 'foo', config: {}}, {name: 'foo', config: {}}], di.tagged('aTag'));
        });
    });

    describe('Unset', function () {
        it('should unset a parameter', function () {
            var di = new Einigeln();

            di.set('bar', 42);

            assert(di.exists('bar'));
            assert.strictEqual(42, di.get('bar'));

            di.unset('bar');

            assert(!di.exists('bar'));
            assert.throws(
                function () {
                    di.raw('bar');
                },
                /not defined/
            );
        });

        it('should unset a service', function () {
            var di = new Einigeln();

            di.set('foo', function() {
                return 42;
            });

            assert(di.exists('foo'));
            di.unset('foo');
            assert(!di.exists('foo'));
            assert.throws(
                function () {
                    di.raw('foo');
                },
                /not defined/
            );
        });

        it('should not unset a frozen service', function () {
            var di = new Einigeln();

            di.set('foo', function() {
                return 42;
            });

            assert(di.exists('foo'));
            assert.strictEqual(42, di.get('foo'));

            assert.throws(
                function () {
                    di.unset('foo');
                },
                /frozen/
            );

            assert(di.exists('foo'));
        });
    });

    describe('Compiler', function () {
        it('should accept a controlCallback with valid interface', function () {
            var control = function (config) {
                assert(true === config.instantiate);
                assert(false === config.locked);
                assert(config.compiler.onCompilePost instanceof Function);
                assert(config.compiler.onCompilePre instanceof Function);
                assert(config.compiler.emitCompile instanceof Function);
            };

            var di = new Einigeln(control);

            var compiler = di.getCompiler();
            assert(compiler.onCompilePost instanceof Function);
            assert(compiler.onCompilePre instanceof Function);
            assert(compiler.emitCompile instanceof Function);
        });

        it('should disable instantiation on request', function () {
            var config = null;
            var di = new Einigeln(function (internalConfig) {
                config = internalConfig;
            });

            config.instantiate = false;
            di.set('foo', function () {
                return 42;
            });
            di.set('param', 1337);

            // Creating services will fail
            assert.throws(
                function () {
                    di.get('foo');
                },
                /instantiate/
            );

            // or fetching their raw function.
            assert.throws(
                function () {
                    di.raw('foo');
                },
                /instantiate/
            );

            // while fetching parameters works.
            assert.strictEqual(1337, di.get('param'));

            // After enabling instantiation container will comply.
            config.instantiate = true;

            assert(di.raw('foo') instanceof Function);
            assert.strictEqual(42, di.get('foo'));
            assert.strictEqual(1337, di.get('param'));
        });

        it('should send events', function () {
            var config = null;
            var di = new Einigeln(function (internalConfig) {
                config = internalConfig;
                config.instantiate = false;
            });

            var compilePre = false;
            config.compiler.onCompilePre(function () {
                compilePre = true;
            });

            var compilePost = false;
            config.compiler.onCompilePost(function () {
                compilePost = true;
            });

            // Ensure state before compile.
            assert(false === config.instantiate);
            assert(false === config.locked);
            assert(false === compilePre);
            assert(false === compilePost);

            config.compiler.emitCompile();

            // Assert state after compile.
            assert(true === config.instantiate);
            assert(false === config.locked);
            assert(true === compilePre);
            assert(true === compilePost);
        });

        it('should lock definition changes', function () {
            var config = null;
            var di = new Einigeln(function (internalConfig) {
                config = internalConfig;
            });

            di.set('foo', function () {
                return 42;
            });
            di.set('param', 1337);

            config.locked = true;

            // Overwriting anything fails.
            assert.throws(
                function () {
                    di.set('foo', function () {
                        return 43;
                    });
                },
                /locked/
            );
            assert.throws(
                function () {
                    di.set('param', function () {
                        return 1337;
                    });
                },
                /locked/
            );

            // Extending too
            assert.throws(
                function () {
                    di.extend('foo', function () {
                        return 44;
                    });
                },
                /locked/
            );
        });

        it('should inject container', function () {
            var config = null;
            var di = new Einigeln(function (internalConfig) {
                config = internalConfig;
            });

            var counter = 0;

            config.compiler.onCompilePre(function(container) {
                assert(container.get instanceof Function);
                assert(container.set instanceof Function);
                assert(container.exists instanceof Function);
                counter++;
            });

            config.compiler.onCompilePost(function(container) {
                assert(container.get instanceof Function);
                assert(container.set instanceof Function);
                assert(container.exists instanceof Function);
                counter++;
            });

            config.compiler.emitCompile();
            assert.strictEqual(2, counter);
        });
    });
});
