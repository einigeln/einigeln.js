/**
 * This is a script for demonstrating Einigeln Container usage.
 *
 * @author Julius Beckmann
 *
 * @type {exports}
 */

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


//--- Extended usage of container and compiler.

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
