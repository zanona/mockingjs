var scrab = require('scrab'),
    mock,
    onPropertyCallback;

function isString(obj) {
    return obj && obj.constructor.name === 'String';
}
function isArray(obj) {
    return obj && obj.constructor.name === 'Array';
}
function isObject(obj) {
    return obj && obj.constructor.name === 'Object';
}

function random(min, max) {
    min = min || 0;
    max = max || 1;
    if (min > max) { max = min + max; }
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomUUID() {
    function s() {
        return Math.floor((1 + Math.random()) * 0x10000)
          .toString(16)
          .substring(1);
    }
    return s() + s() + '-' + s() + '-' + s() + '-'
         + s() + '-' + s() + s() + s();
}
function randomDate() {
    var start = new Date(),
        end = new Date(2020, 0, 1);
    return new Date(
        start.getTime() + Math.random() * (end.getTime() - start.getTime())
    );
}
function randomString(min, max) {
    return scrab.sentence({
        min: min || 1,
        max: max || 10,
        join: ' ',
        punctuate: false
    }).substr(0, max);
}
function randomEmail() {
    var providers = ['gmail', 'yahoo', 'hotmail'],
        tlds = ['.com', '.co.uk', '.be', '.fr'];
    return [
        scrab.words(2).join('.'),
        random(10, 99),
        '@',
        providers[random(0, providers.length - 1)],
        tlds[random(0, tlds.length - 1)]
    ].join('');
}
function randomUri() {
    var tlds = ['.com', '.co.uk', '.net', '.biz', '.co', '.tk', '.be', 'us'];
    return ''
        + (random() ? 'http://' : 'https://')
        + scrab.words({min: 1, max: 2}).join('-').toLowerCase()
        + tlds[random(0, tlds.length -1)];
}

function filterUnique(array, max) {
    var unique = [], i;
    for (i = 0; i < array.length; i += 1) {
        if (unique.length === max) { break; }
        if (unique.indexOf(array[i]) === -1) {
            unique.push(array[i]);
        }
    }
    return unique;
}
function shouldAddProperty(propertyName, requiredProperties) {
    var isSkippable = requiredProperties.indexOf(propertyName) === -1;
    if (isSkippable) {
        return random();
    } else {
        return true;
    }
}
function listMissingDependencies(obj, dependencies) {
    var missing = [];
    function checkMissing(dependencyName) {
        if (!obj[dependencyName]) { return; }
        var dependency = dependencies[dependencyName];

        if (isObject(dependency)) {
            missing.push(dependency);
        } else if (isArray(dependency)) {
            dependency.forEach(function (depName) {
                if (!obj[depName]) { missing.push(depName); }
            });
        }
    }
    Object.keys(dependencies).forEach(checkMissing);
    return missing;
}
function addKeyToPath(key, path) {
    var pathCopy = Object.assign([], path);
    pathCopy.push(key);
    return pathCopy;
}

function mockObject(properties, options, path) {
    var obj = {},
        objPath,
        missingDeps;

    Object.keys(properties).forEach(function (key) {
        if (shouldAddProperty(key, options.required)) {
            objPath = addKeyToPath(key, path);
            obj[key] = mock(properties[key], options, objPath);
        }
    });
    missingDeps = listMissingDependencies(obj, options.dependencies);
    if (missingDeps.length) {
        missingDeps.forEach(function (dep) {
            if (isObject(dep)) {
                Object.assign(obj, mock(dep, options, path));
            } else if (isString(dep) && properties[dep]) {
                // Verify is dep is present, skip otherwise to avoid errors
                // Force addition or missing dependency
                if (options.required.indexOf(dep) === -1) {
                    options.required.push(dep);
                }
                objPath = addKeyToPath(dep, path);
                obj[dep] = mock(properties[dep], options, objPath);
            }
        });
    }

    // Prevent empty objects
    if (!Object.keys(obj).length) {
        return mockObject(properties, options, path);
    }
    return obj;
}

function mockArray(items, options, path) {
    var array, max, min, size;

    min = options.minItems || 1;
    max = options.maxItems || random(min, 3);

    if (options.uniqueItems) {
        size = max * 100;
    } else {
        size = random(min, max);
    }

    array = [];
    function generateItem() {
        var value = mock(items, null, path);
        // Prevent empty objects in array
        if (isObject(value) && !Object.keys(value).length) { return generateItem(); }
        array.push(value);
    }
    Array(size).fill(1).forEach(generateItem);
    if (options.uniqueItems) { array = filterUnique(array, max); }

    return array;
}

function mockAllOf(items, path) {
    var obj = {},
        simple = false;
    items.forEach(function (item) {
        if (item.properties) {
            Object.assign(obj, mock(item, path));
        } else {
            simple = true;
            Object.assign(obj, item);
        }
    });
    if (simple) { obj = mock(obj, path); }
    return obj;
}

function mockOneOf(items, path) {
    var obj = {},
        index = 0,
        item = items[random(0, index.length - 1)],
        value = mock(item, path);

    if (isObject(value)) {
        Object.assign(obj, value);
    } else {
        obj = value;
    }
    return obj;
}

function mockNumber(options) {
    var value, max, min;
    min = options.minimum || 0;
    max = options.maximum || random(min, 1000);
    if (options.exclusiveMinimum) { min -= 1; }
    if (options.exclusiveMaximum) { max  -= 1; }
    value = random(min, max);
    if (options.multipleOf) {
        value = value - (value % options.multipleOf);
        if (value === 0) { value = options.multipleOf; }
    }
    return value;
}

function mockString(options) {
    var min = options.minLength,
        max = options.maxLength;

    switch (options.format) {
        case 'uuid':
            return randomUUID();
        case 'date-time':
            return randomDate().toJSON();
        case 'date':
            return randomDate().toJSON().split('T')[0];
        case 'uri':
            return randomUri();
        case 'email':
            return randomEmail();
        default:
            return randomString(min, max);
    }
    // TODO
    // if (options.pattern) { }
}

function mockEnum(termsList) {
    var randomPosition = random(0, termsList.length - 1);
    return termsList[randomPosition];
}

function mockType(type, options, path) {

    if (onPropertyCallback && onPropertyCallback.call) {
        options.type = type;
        var value = onPropertyCallback(path, options);
        if (typeof value !== 'undefined') { return value; }
    }
    if (options.enum) {
        return mockEnum(options.enum);
    }
    if (type === 'string') {
        return mockString(options);
    }
    if (type === 'number' || type === 'integer') {
        return mockNumber(options);
    }
    if (type === 'boolean') {
        return !!random();
    }
    if (type === 'null') {
        return null;
    }
}

function getOptionKeys(schema) {
  const opts = {};
  Object.keys(schema).forEach((key) => {
    opts[key] = schema[key];
  });
  return opts;
}

mock = function (schema, options, path) {
    if (schema.properties) {
        options = {
            required: schema.required || [],
            dependencies: schema.dependencies || {}
        };
        return mockObject(schema.properties, options, path);
    }
    if (schema.items) {
        /*
        options = {
            maxItems: schema.maxItems,
            minItems: schema.minItems,
            uniqueItems: schema.uniqueItems
        };
        */
        options = getOptionKeys(schema);
        return mockArray(schema.items, options, path);
    }
    if (schema.allOf) {
        return mockAllOf(schema.allOf, path);
    }
    if (schema.anyOf) {
        return mockAllOf(schema.anyOf, path);
    }
    if (schema.oneOf) {
        return mockOneOf(schema.oneOf, path);
    }
    if (schema.type) {
        /*
        options = {
            maximum: schema.maximum,
            minimum: schema.minimum,
            exclusiveMaximum: schema.exclusiveMaximum,
            exclusiveMinimum: schema.exclusiveMinimum,
            multipleOf: schema.multipleOf,
            maxLength: schema.maxLength,
            minLength: schema.minLength,
            format: schema.format,
            pattern: schema.pattern,
            enum: schema.enum
        };
        */
        options = getOptionKeys(schema);
        return mockType(schema.type, options, path);
    }
};

mock.onProperty = function (cb) { onPropertyCallback = cb; };

module.exports = mock;
