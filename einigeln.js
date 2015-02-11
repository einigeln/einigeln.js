/**
 * TODO: Write docs.
 */

module.exports = function Einigeln() {
    "use strict";

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
            throw new Error('Service is not defined: ' + key);
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
     * Will tag a object with a hidden attribute if not yet done
     * and return that tag.
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

    this.set = function (key, definition) {
        // Ensure the given key is a string
        if(typeof key !== 'string') {
            throw new Error('Key is not a string. Only strings are supported as keys.');
        }

        if(key in frozen) {
            throw new Error('Cannot overwrite frozen service: '+key);
        }

        definitions[key] = definition;
        return this;
    };

    this.get = function (key) {
        checkServiceisDefined(key);

        var definition = definitions[key];

        if(getTag(definition) in protect) {
            // This callback should never be executed and should be returned as is.
            return definition;
        }

        if (!isFunction(definition)) {
            // Value is just a parameter.
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

    this.unset = function () {
        // TODO
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

        // We don't know what kind of service it is, so simply return its definition.
        return definitions[key];
    };

    /**
     * Extend a existing service with the given function.
     *
     * The given function will be called with: fn(resultOfExistingService, container)
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
            return fn(definition(container), container);
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
};
