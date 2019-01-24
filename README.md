# Polyfill for HbbTV 'oipfObjectFactory'

**This is a [polyfill](https://en.wikipedia.org/wiki/Polyfill) that implements the
 [oipfObjectFactory](http://www.oipf.tv/web-spec/volume5.html#object-factory-api) used in [HbbTV](https://www.hbbtv.org/) and a framework for adding code to support your own object types.**

HbbTV/OIPF defines the use of the \<object\> element to implement various APIs. Applications can create these objects in several ways. The following are supported by this polyfill:

1. By declaring them in the HTML:

        <object type="hbbtv/MediaSynchroniser" id="msync"></object>
        
        ...
        
        var msync = document.getElementById("msync");
        msync.initMediaSynchroniser(...);

2. Or by creating the DOM elements in Javascript:

        var msync = document.createElement("object")
        msync.type = "hbbtv/MediaSynchroniser"
    
3. Or by using the methods of the `oipfObjectFactory` object:

        var msync = oipfObjectFactory.createMediaSynchroniser();


## Getting started

## Either: in a node/npm project

Add as a dependency to `package.json`:

    ...
    dependencies: {
      ...
      "oipf-object-polyfill": "git+https://git@github.com:2-IMMERSE/oipf-object-polyfill.git#master"
    }

Then in your javascript:

    var oipf = require("oipf-object-polyfill");

This installs the override of `window.oipfObjectFactory` and returns access to the API for adding your own custom object types to the factory:


## Or: directly within a webpage

To do stuff outside of your own node/npm projects, first clone this repository.
Then install it to build a polyfill that can be included as a script in a page:

    $ git clone https://github.com/2-IMMERSE/oipf-object-polyfill.git
    $ cd oipf-object-polyfill
    $ npm install
    $ npm build

The JS file ready for use in the browser is output as `dist/oipf-object-polyfill.js`

So to access the API:

    <script type="text/javascript" src="dist/oipf-object-polyfill.js"></script>
    
    <script type="text/javascript">

        var oipf = window["oipf-object-polyfill"]
        
        ...

    </script>

This installs the override of `window.oipfObjectFactory` and returns access to the API for adding your own custom object types to the factory:


## Implementing your oipf objects

You do this by registering your implementation of an object by providing
two functions - a "mixin" function that adds the functionality to the HTMLObjectElement and an "unmix"
function that removes it. You must also specify the mimetype and the name for the factory function
that the oipfObjectFactory will provide.

For example:

    var oipf = require("oipf-object-polyfill");

    function mix(htmlObjElement) {
        htmlObjElement.myfunc = function() {
            console.log("my function!")
        };
    };
    
    function unmix(htmlObjElement) {
        delete htmlObjElement.myfunc;
    }

    oipf.registerOipfObject(
        "x-mycompany/my-object",    // mimetype
        "createMyObject",           // method name to be added to oipfObjectFactory
        mixin,                      // adds functionality to HTMLObjectElement
        unmix                       // takes functionality away from HTMLObjectElement
    );

In the example above, a new object type is defined. It has a single simple method `myfunc()`. It can be accessed by declaring or creating object elements with mimetype `x-mycompany/my-object` or by calling `oipfObjectFactory.createMyObject()`
    

## How it behaves

If there is already an existing `oipfObjectFactory` object then this polyfill will not replace it but will instead try to add new `createXXXX()` methods to the existing one.

The net result is a webpage that will behave much like expected.
You can declare \<object\> elements in the page itself:
    
    <body>
        <object id="1" type="x-mycompany/my-object"></object>
    </body>
    
You can then access it, or create new objects as you would expect. E.g.

    objElem = document.getElementById("1");
    
    objElem.myfunc();
    
Or you can create the objects programmatically using `document.createElement()`:
    
    newObj = document.createElement("object");
    newObj.type = "x-mycompany/my-object";
    setTimeout(function() {
        // let event handling run to modify the object before we use it
        newObj.myfunc();
    }, 1);

Or you can use the `oipfObjectFactory`:

    newObj = oipfObjectFactory.createMyObject();
    newObj.myfunc();
    
    
## Caveats

### DOM changes are not immediate

This implementation of this polyfill requires the [MutationObserver W3C API](https://developer.mozilla.org/en/docs/Web/API/MutationObserver).
This should be implemented in most modern browsers.

The side-effect of this is that When using document.createElement() or
modifying the DOM directly, the changes will only happen when the mutation
observer event handlers are run. This might be immediately, or it might not.
This could be implementation dependent.

So, for example, the following might fail because MutationObserver event
handlers have not had a chance to run:
```javascript
newObj = document.createElement("object");
newObj.type = "x-mycompany/my-object";

// the effect of setting newObj.type will not change the object until
// event handlers get to run. Therefore the next function call could
// fail...

newObj.myfunc();    // fails
```

Your code should wait for the next cycle of the [Javascript event loop](https://developer.mozilla.org/en-US/docs/Web/JavaScript/EventLoop) before using an
object created in this way. Using `setTimeout()` with a timeout of zero is a way to achieve this:

```javascript
newObj = document.createElement("object");
newObj.type = "x-mycompany/my-object";

setTimeout(useNewObject, 0)

function useNewObject() {
  newObj.myfunc()
}
```

### Do not create an \<object\> as a child of an element that is not in the document 


If you create an \<object\> without using `document.createElement()` by, for example
setting the `innerHTML` property of an element then it will not be detected
by this polyfill if that element is not in the document.

So for example, the following will not work:
```javascript
orphan = document.createElement("div");
orphan.innerHTML = '<object type="x-mycompany/my-object"></object>';

setTimeout(function() {
  var newObj = orphan.getElementsByTagName("object")[0]
  
  newObj.myfunc(); // fails
}, 1);
```


## License and Authors

<img src="https://2immerse.eu/wp-content/uploads/2016/04/2-IMM_150x50.png" align="left"/><em>This project has been contributed by the British Broadcasting Corporation to the <a href="https://2immerse.eu/">2-IMMERSE</a> project which is co-funded by the European Commission’s <a hef="http://ec.europa.eu/programmes/horizon2020/">Horizon 2020</a> Research Programme</em>

All code and documentation is licensed by the original author and contributors under the Apache License v2.0:

* [British Broadcasting Corporation](http://www.bbc.co.uk/rd) (original author)

See AUTHORS file for a full list of individuals and organisations that have
contributed to this code.

## Contributing

If you wish to contribute to this project, please get in touch with the authors.

