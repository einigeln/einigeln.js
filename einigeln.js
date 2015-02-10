/**
 * TODO: Write docs.
 */


module.exports = function Einigeln(initialDefinitions) {
    "use strict";

    // Hint: The initialDefinitions will be inserted at the end of the class.

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

    // Insert the given definitions from constructor into this object.
    initialDefinitions = initialDefinitions || {};
    for (var key in initialDefinitions) {
        if (initialDefinitions.hasOwnProperty(key)) {
            this.set(key, initialDefinitions[key]);
        }
    }
};


/*

 (function () {

 "use strict";

 var _self = this;


 var isFunction = function (obj) {
 return (obj instanceof Function);
 };

 //var reservedProperties = ['get', 'set', 'factory', 'raw', 'protect', 'share', 'toString', 'constructor'];


 this.Container = function (definitions) {
 if (!(this instanceof _self.Container)) {
 return new _self.Container(definitions);
 }

 this.values = {};

 for (var key in definitions) {
 if (definitions.hasOwnProperty(key)) {
 this.set(key, definitions[key]);
 }
 }
 };


 this.Container.prototype = {

 set: function (key, definition) {
 return this;
 },

 get: function (key) {
 return null;
 },

 exists: function () {
 return false;
 },

 unset: function () {

 },

 factory: function (fn) {

 },

 protect: function (fn) {

 },

 raw: function (key) {
 return null;
 },

 extend: function (key, fn) {
 return this;
 },

 keys: function () {
 return [];
 }



 get: function (key) {
 if (this._definitions[key] === undefined)return;
 if (_isFunction(this._definitions[key])) {
 return this._definitions[key].call(this, this);
 }
 return this._definitions[key];
 },


 set: function (key, definition) {
 this._definitions[key] = definition;
 if (reservedProperties.indexOf(key) === -1) {
 Object.defineProperty(this, key, {
 get: function () {
 return this.get(key);
 },
 configurable: true,
 enumerable: true
 });
 }
 return this
 },


 raw: function (key) {
 return this._definitions[key];
 },


 share: function (definition) {
 var cached, self = this;
 return function () {
 if (cached === undefined) {
 cached = definition.call(self, self);
 }
 return cached;
 }
 },

 protect: function (definition, context) {
 context = context || this;
 return function () {
 return definition.bind(context);
 }
 },

 extend: function (key, definition) {
 return definition.bind(this, this.get(key), this);
 },


 register: function (definitionProvider) {
 return definitionProvider(this);
 }

 };

 // Whats this?
 if (this.define instanceof Function) {
 var self = this;
 this.define('container', [], function () {
 return self.Container
 });
 }

 //CommonJS
 if (module && module.exports) {
 module.exports = this.Container;
 }
 }).apply(this);
 */
