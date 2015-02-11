/**
 * TODO: Write docs.
 */

var EventEmitter = require('events').EventEmitter;

/**
 * Einigeln is a dependency injection container with some more features controlling instantiation.
 *
 * A Compiler is integrated offering events for pre and post allowing instantiations in the container.
 *
 * @param controlCallback
 * @constructor
 */
module.exports = function Einigeln(controlCallback) {
    'use strict';

    // Typecheck controlCallback
    if (undefined !== controlCallback && !(controlCallback instanceof Function)) {
        throw new Error('Control Callback needs to be a function.');
    }
    controlCallback = controlCallback || function () {
        // Intended NOOP.
    };

    var compiler = null;
    var events = new EventEmitter();
    var config = {
        /**
         * Flag if the container will allow instantiating service callbacks.
         * By default it is true, and can be switched to false if needed or used with `emitCompile()`.
         */
        instantiate: true,
        /**
         * Flag if changing definitions in the container is allowed.
         */
        locked: false,
        /**
         * Interface for the compiler.
         */
        compiler: {
            /**
             * Register a callback for after container has started instantiating.
             * @param callback
             */
            onCompilePost: function (callback) {
                events.on('compiler.post', callback);
            },
            /**
             * Register a callback for before container will start instantiating.
             * @param callback
             */
            onCompilePre: function (callback) {
                events.on('compiler.pre', callback);
            },
            /**
             * Trigger the event "compile.pre".
             * Will set `config.instantiate` to true.
             * Then trigger the event "compile.post".
             */
            emitCompile: function () {
                events.emit('compiler.pre', this);
                config.instantiate = true;
                events.emit('compiler.post', this);
            }
        }
    };
    // Enable external callback to change internal values.
    controlCallback(config);

    /**
     * Map from key => parameter|callback|calculatedValue
     * Will contain the calculated value, if calculated[key] => true.
     */
    var definitions = {};

    /**
     * Map from key => Function
     * If the callback has been executed once.
     */
    var callbacks = {};

    /**
     * Map from tag => true
     * Will contain a entry if the tagged function should be a factory.
     */
    var factories = {};

    /**
     * Map from tag => true
     * Will contain a entry if the tagged function should not be executed.
     */
    var protect = {};

    /**
     * Map from key => true
     * Will contain a entry if the service has been already calculated.
     */
    var frozen = {};

    /**
     * Counter for tagging functions.
     * @type {number}
     */
    var functionId = 1;

    /**
     * Array containing a list of tags with multiple services and configurations.
     *
     * @type {{}}
     */
    var tagged = {};

    /**
     * Throw a error if service key is not defined.
     * @param key
     */
    var checkServiceisDefined = function (key) {
        if (!(key in definitions)) {
            throw new Error("Service is not defined: '" + key + "'");
        }
    };

    /**
     * Return true if obj is a function.
     * @param obj
     * @returns {boolean}
     */
    var isFunction = function (obj) {
        return (obj instanceof Function);
    };

    /**
     * Will tag a object with a hidden attribute if not yet done and return that tag.
     *
     * @param obj
     * @returns String
     */
    var tagObject = function (obj) {
        if (obj._einigeln_id_) {
            return obj._einigeln_id_;
        }
        obj._einigeln_id_ = '#' + functionId++;
        if (Object.defineProperty) {
            // Hide the attribute partially.
            Object.defineProperty(obj, '_einigeln_id_', {enumerable: false});
        }
        return obj._einigeln_id_;
    };

    /**
     * Will return the hidden tag for a object if exists or NULL.
     *
     * @returns {*}
     */
    var getTag = function(obj) {
        if (obj._einigeln_id_) {
            return obj._einigeln_id_;
        }
        return null;
    };

    /**
     * Define a parameter|service for given key. Existing definitions will be overwritten.
     * If a service is a callback and it has been executed, it can not be overwritten because it is frozen.
     *
     * @param key
     * @param definition
     * @returns this
     */
    this.set = function (key, definition) {
        // Ensure the given key is a string
        if(typeof key !== 'string') {
            throw new Error('Key is not a string. Only strings are supported as keys.');
        }

        if(true === config.locked) {
            throw new Error('Container is locked, no changes possible.');
        }

        if(key in frozen) {
            throw new Error('Cannot overwrite frozen service: '+key);
        }

        definitions[key] = definition;
        return this;
    };

    /**
     * Helper for generating service definition with magic injections.
     *
     * If the last parameter `injects` is given, the values from that array are used
     * as services for arguments for given definition.
     *
     * If the last parameter is not given, the needed injections will be tried to calculated from the function signature.
     *
     * @param key
     * @param definition
     * @param injects
     * @returns this
     */
    this.inject = function (key, definition, injects) {
        var container = this;

        if (undefined !== injects && !injects.map) {
            throw new Error('injects parameter needs to have function `map()`.');
        }

        if (!isFunction(definition)) {
            throw new Error('Only functions can have injections.');
        }

        if (undefined === injects) {
            // Calculate injections from function signature.
            var fnString = definition.toString().replace(/((\/\/.*$)|(\/\*[\s\S]*?\*\/)|(\s))/mg, '');
            // Only use magical injections if function takes any arguments.
            if (0 !== fnString.indexOf('function()')) {
                injects = fnString.match(/^function\s*[^\(]*\(\s*([^\)]*)\)/m)[1].split(/,/);
            }
        }
        injects = injects || [];

        return this.set(key, function () {
            // Check if all dependencies exist before fetching from container.
            injects.forEach(function (name) {
                if (!container.exists(name)) {
                    throw new Error("Needed dependency '" + name + "' does not exist in container.");
                }
            });

            // Fetch services from container.
            var injectedServices = injects.map(function (name) {
                return container.get(name);
            });

            if (isFunction(definition)) {
                return definition.apply(definition, injectedServices);
            }
            return definition;
        });
    };

    /**
     * Will return the parameter|callback or factory result|protected service.
     * When given key is not defined a error will be thrown.
     *
     * @param key
     * @returns {*}
     */
    this.get = function (key) {
        checkServiceisDefined(key);

        var definition = definitions[key];

        if (!isFunction(definition)) {
            // Value is just a parameter.
            return definition;
        }

        // Anything below here will result in executing a factory or service callback.

        if(false === config.instantiate) {
            throw new Error('Container is not configured to instantiate services.');
        }

        if(getTag(definition) in protect) {
            // This callback should never be executed and should be returned as is.
            return definition;
        }

        if (key in callbacks) {
            // Value is already calculated.
            return definition;
        }

        // Calculate value if its a function.
        if (isFunction(definition)) {

            // If the function has been tagged as a factory use it as such.
            if(getTag(definition) in factories) {
                return definition(this);
            }

            // Just calculate the function once and store the result.
            definitions[key] = definition(this);
            // Store the callback function, so we can give it out via raw().
            callbacks[key] = definition;
            // mark this service as "frozen", so it can not be overwritten or such.
            frozen[key] = true;
        }

        return definitions[key];
    };

    /**
     * Will return true, if a service is defined.
     *
     * @param key
     * @returns {boolean}
     */
    this.exists = function (key) {
        return (key in definitions);
    };


    /**
     * Will remove the definition of a service.
     *
     * Can not be done, if the container is locked or the service is frozen.
     *
     * @param key
     * @returns {exports}
     */
    this.unset = function (key) {

        if(true === config.locked) {
            throw new Error('Container is locked, no changes possible.');
        }

        if(key in definitions) {
            // It is a defined service.

            if(key in frozen) {
                throw new Error('Cannot unset frozen service: '+key);
            }

            var tag = getTag(definitions[key]);

            if(tag in factories) {
                delete factories[tag];
            }

            if(tag in protect) {
                delete protect[tag];
            }

            delete definitions[key];
            delete callbacks[key];
            delete frozen[key];
        }

        return this;
    };

    /**
     * Will add a list of tags to a service.
     *
     * @param key string
     * @param tag string
     * @param config object
     */
    this.tag = function (key, tag, config) {
        config = config || {};
        if (!(tag in tagged)) {
            tagged[tag] = [];
        }
        tagged[tag].push({name: key, config: config});
    };

    /**
     * Will return the names of service names tagged with given tag.
     *
     * @param tag
     * @returns [string]
     */
    this.tagged = function (tag) {
        if (tag in tagged) {
            return tagged[tag];
        }
        return [];
    };

    /**
     * Will mark the given function as a "factory".
     *
     * @param fn
     * @returns fn
     */
    this.factory = function (fn) {
        if (!isFunction(fn)) {
            throw new Error('Argument is not a function');
        }

        // We tag that function so we know it should be used as a factory.
        var tag = tagObject(fn);
        factories[tag] = true;

        return fn;
    };

    /**
     * Will mark the given function as a parameter that should never be executed.
     * @param fn
     * @returns fn
     */
    this.protect = function (fn) {
        if (!isFunction(fn)) {
            throw new Error('Argument is not a function');
        }

        // We tag that function so we know it should not be executed.
        var tag = tagObject(fn);
        protect[tag] = true;

        return fn;
    };

    /**
     * Will return the initial function or any other given value.
     *
     * @param key
     * @returns {*}
     */
    this.raw = function (key) {
        checkServiceisDefined(key);

        // If the definition was a function and has been executed,
        // the function will be stored in callbacks.
        if (key in callbacks) {
            return callbacks[key];
        }

        if(false === config.instantiate) {
            throw new Error('Container is not configured to instantiate services.');
        }

        // We don't know what kind of service it is, so simply return its definition.
        return definitions[key];
    };

    /**
     * Extend a existing service with the given function.
     *
     * The given function will be called with: fn(oldDefinition, container)
     *
     * @param key
     * @param fn
     * @returns this
     */
    this.extend = function (key, fn) {
        checkServiceisDefined(key);

        var definition = definitions[key];

        if(!isFunction(definition)) {
            throw new Error('Service is not a function. Only Functions can be extended.');
        }

        if(!isFunction(fn)) {
            throw new Error('Extension argument is not a function.');
        }

        // Wrap old definition in new callback.
        var extended = function(container) {
            return fn(definition, container);
        };
        
        // If the old function was tagged as a factory, it has to be replaced by new extension.
        if(getTag(definition) in factories) {
            delete factories[getTag(definition)];
            this.factory(extended);
        }

        // Register extended service as new service.
        return this.set(key, extended);
    };

    /**
     * Will return a list of registered keys as Strings.
     *
     * @returns String[]
     */
    this.keys = function () {
        return Object.keys(definitions);
    };

    /**
     * Will return the Compiler offering registering Callbacks for pre and post instantiation.
     * @returns {*}
     */
    this.getCompiler = function() {
        return config.compiler;
    }
};
