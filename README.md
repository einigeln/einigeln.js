# Einigeln.js [![Build Status](https://travis-ci.org/einigeln/einigeln.js.svg)](https://travis-ci.org/h4cc/einigeln.js)

Einigeln is a library to do "Dependency Injection" or "Inversion of Control" initially for NodeJS, inspired by some other libraries like [Pimple](http://pimple.sensiolabs.org/) or [Electrolyte](https://github.com/jaredhanson/electrolyte).

The difference from the other libraries, this one targets at:

* Throwing errors if anything invalid happens.
* Lazy instantiation of services.
* Access to raw service definitions.
* Tagging services with configurations.
* Frozen Services if they have been created at least once.
* Lock Container by configuration, so definitions will not change.
* Forbid instantiation by configuration, so container will behave like a ContainerBuilder.
* Compiler that enables events before and after instantiation is enabled.

Other features have not been targeted, like:

* Not (yet) including `require` actions. These need to be done by users.
* Not (yet) offering a `module.export[@require]` Syntax or such, but could be added if needed.

In the end Einigeln is a container that can be given to 3-rd-party code to define their own services inside.

------------------------------------

## API

There are just a few calls, ordered by the most common ones:

```javascript
// This code can also be found at: `example.js`

var Einigeln = require('./einigeln');

var container = new Einigeln();

// Defining a parameter
container.set('name', 'world');
console.log(container.get('name'));

// Defining a service
container.set('hello', function(container) {
    // `container` is the same instance as outside `container`
    return 'hello '+container.get('name')
});
console.log(container.get('hello'));

// Defining a service with inject
container.inject('bye', function(name) {
    // `name` has been injected.
    return 'bye '+name
}, ['name']);
console.log(container.get('bye'));

// Defining a service with MAGIC inject
container.inject('bye2', function(name) {
    // `name` has been MAGICALLY injected.
    return 'bye '+name
});
console.log(container.get('bye2'));

// Check if a definition exists
container.exists('name'); // true

// Remove a definition
container.set('foo', 42);
container.unset('foo');
container.exists('foo'); // false

// Factory, is a callback that will by executed every time the service is accessed.
container.set('random', container.factory(function(container) {
    return Math.random();
}));
console.log('Two random numbers: ', container.get('random'), container.get('random'));

//--- Tagging services

container.set('static.users', function(container) {
    return ['alice', 'bob'];
});
container.tag('static.users', 'userprovider', {some: 'config'});
console.log(container.tagged('userprovider'));
// Will output:
// [ { name: 'static.users', config: { some: 'config' } } ]

//--- Some more uncommon API calls:

var keys = container.keys();
console.log('All defined services: ', keys);

// Extend will wrap the old service callback with the new given one.
container.set('alice', function(container) {
    return 'Hello Alice!';
});
container.extend('alice', function(oldDefinition, container) {
    return 'Hello Bob! '+oldDefinition();
});
console.log(container.get('alice')); // Will output 'Hello Bob! Hello Alice!'

// Protect, is a callback that will not be executed and should be threaded like a static parameter.
container.set('simple.callback', container.protect(function(container) {
    return 'Very simple!';
}));
console.log(container.get('simple.callback')());

// Raw will return the callback used in the service definition.
container.set('leet', function(container) {
    return 1337;
});
var leet = container.raw('leet');
console.log(leet());
```

## Compiler

Using the compiler is a more advances feature, even if it works quite simple.

```javascript
var containerConfig = null;
container = new Einigeln(function(config) {
    containerConfig = config;
});
console.log(containerConfig);
// Will output:
// { instantiate: true,
//   locked: false,
//   compiler:
//      { onCompilePost: [Function],
//        onCompilePre: [Function],
//        emitCompile: [Function] } }

// Disabling instantiation for container:
containerConfig.instantiate = false;

// Registering for Compiler events:
containerConfig.compiler.onCompilePre(function(container) {
    // This event will be called when the compiler will 'emitCompile()'.
    // In such a callback, a second chance for changes in the definitions is given.
    // This could be used to change the definitions of modules that have put their definitions after you in the container.
    console.log('containerConfig.instantiate is', containerConfig.instantiate);
    console.log('onCompilePre');
});

containerConfig.compiler.onCompilePost(function(container) {
    // This event will be called just _after_ 'onCompilePre()' with always `instantiate: true`.
    // In such a callback, there can be done stuff with the real instantiated objects.
    // The difference to `onCompilePre` is, that here we can not change the definitions inside the container anymore,
    // but can do late wiring of instantiated services from the container.
    console.log('containerConfig.instantiate is', containerConfig.instantiate);
    console.log('onCompilePost');
});

// Run the compiler callbacks.
containerConfig.compiler.emitCompile();

// Lock the container, so changes are not possible.
containerConfig.locked = true;

// This will fail then:
container.set('foo', 'bar');
```

## TODO

* If somebody wants to use it in a browser, change module loading that way.

## About the name

Imagine a hedgehog that curls himself to a ball.
There is a german word for that called "einigeln", with no english representation AFAIK.
The analogy to this library is the possibility to protected the container from unwanted changes from outside.
