MockingJS
===

## JSON Schema mocking utility

MockingJS is a light-weight instance generator for JSON Schema.
It provides everything needed for mocking data based on DRAFT-4 while still
giving complete control over property value assignment.

### Installation

    npm i zanona/mockingjs -S

#### Simple use case

```js
var mock = require('mockingjs'),
    doc = mock(schema.definitions.Org); //returns a ready to use document
```

#### Customize properties

```js
  var mock = require('mockingjs'),
      doc;

  mock.onProperty(function (path, options) {
      path = paths.join('.');
      if (path.match('name')) { return 'Acme Inc.'; }
      if (path.match('location.city')) { return 'The Capitol'; }
      if (options.format === 'email')  { return 'email@example.com'; }
  });

  doc = mock(schema.definitions.Org);
 ```

### .onProperty(Function callback)

Callback provides access to the following parameters"

- __(Array) path:__ the path for the current property. _i.e: ["location", "country", "name"]_
- __(Object) options:__ information about the current property such as
  `format`, `type` and additional options like `maxLength`, etc.
