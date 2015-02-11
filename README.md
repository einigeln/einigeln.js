# Einigeln.js [![Build Status](https://travis-ci.org/h4cc/einigeln.js.svg)](https://travis-ci.org/h4cc/einigeln.js)

Einigeln is a library to do "Dependency Injection" or "Inversion of Control", inspired by some other libraries like Pimple or Electrolyte.

The difference from the other libraries, this one targets at:

* Throwing errors if anything invalid happens.
* Lazy instantiation of services.
* Access to raw service definitions.
* Tagging of services with configurations.
* Frozen Services if they have been created at least once.
* Lock Container by configuration, so definition will change.
* Forbid instantiation by configuration, so container will behave like a containerBuilder.
* Compiler that enables events before and after instantiation is enabled.

Other features have not been targeted, like:

* Not including `require` actions. These need to be done by users.
* Not offering a `module.export[@require]` Syntax or such, but could be added if needed.

In the end Einigeln is a container that can be given to 3-rd-party code to define their own services inside.

------------------------------------

## API

There are just a few calls, ordered by the most common ones:

```javascript

var Einigeln = require('einigeln');

var di = new Einigeln();

// Defining a parameter
di.set('name', 'world');

// Defining a service
di.set('hello', function(container) {
    // `container` is the same instance as `di`
    return 'hello '+container.get('name')
});

// Defining a service with inject
di.inject('bye', function(name) {
    // `name` has been injected.
    return 'by '+name
}, ['name']);

// Check if a definition exists
di.exists('name'); // true

// Remove a definition
di.set('foo', 42);
di.unset('foo');
di.exists('foo'); // false

// Factory, is a callback that will by executed every time the service is accessed.
di.set('random', di.factory(function(container) {
    return Math.random();
}));

//--- Tagging services

TODO: tag, tagged

//--- Some more uncommon API calls:

var keys = di.keys();
console.log('All defined services: ', keys);

// Extend will wrap the old service callback with the new given one.
di.set('alice', function(container) {
    return 'Hello Alice!';
});
di.extend('alice', function(oldDefinition, container) {
    return 'Hello Bob! '+oldDefinition();
});
console.log(di.get('alice')); // Will output 'Hello Bob! Hello Alice!'

// Protect, is a callback that will not be executed and should be threaded like a static parameter.
di.set('simple.callback', di.protect(function(container) {
    return 'Very simple!';
}));

// Raw will return the callback used in the service definition.
di.set('leet', function(container) {
    return 1337;
});
var leet = di.get('leet');
console.log(leet());
```

## Compiler

Using the compiler is a more advances feature, even if it works quite simple.

```javascript
TODO
```

## TODO:

* Create some more tests.
* If somebody wants to use it in a browser, change module loading that way.

## About the name:

Imagine a hedgehog that curls himself to a ball.
There is a german word for that called "einigeln", with no english representation AFAIK.
The german name of hedgehog is by the way "igel".

