/**
 * Copyright 2018 British Broadcasting Corporation
 *  
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy
 * of the License at
 *  
 *     http://www.apache.org/licenses/LICENSE-2.0
 *  
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 **/
 
/**
 * Emulation of oipfObjectFactory as defined in HbbTV 2.0 specification
 * (ETSI 102 796 v1.3.1) and polyfill for creation of objects in the DOM

 * monitors for the creation of <object> elements, and adds functionality to them
 * if they have a particular mimetype in the "type" attribute
 *
 * Uses MutationObserver to spot <object> tags being added to the DOM, and
 * overrides document.createElement() to intercept the other route to new elements
 * being craeted.
 *
 * When an <object> is created, a second mutation observer is attached to check
 * the "type" attribute. When the mimetype matches one of those registered then
 * a customiser method is called to modify the object.
 */

if (typeof WeakMap === "undefined") {
	var WeakMap = require('weak-map');
}

var MIMETYPE_HANDLERS = {};

var CURRENT_MIXIN_MIMETYPE = new WeakMap();
var MONITORING = new WeakMap();

var scanForAndModifyObjects = function() {
	var elements = document.getElementsByTagName("object");
	for(var i=0; i<elements.length; i++) {
		setupMonitorOnObject(elements[i]);
	}
};

/**
 * Checks an HTMLObjectElement's `type` attribute and if it matches a supported
 * mimetype, then it mixes in the functionality (if not already mixed in)
 * or unmixes it if the type is one that is not supported.
 *
 * @param {HTMLObjectElement} elem Object element that will have functionality added if type is a supported mimetype and if functionality is not already added.
 */
var modifyObjectIfNeeded = function(elem) {
    var currentMixinMimetype = CURRENT_MIXIN_MIMETYPE.get(elem);
    var newMimetype = elem.type.toLowerCase();
    if (currentMixinMimetype != newMimetype) {
        // change type
        // first deprecate existing type
        var currentHandler = MIMETYPE_HANDLERS[currentMixinMimetype];
        if (currentHandler) {
            currentHandler.unmix(elem);
        }
        
        CURRENT_MIXIN_MIMETYPE.set(elem, newMimetype);
        var newHandler = MIMETYPE_HANDLERS[newMimetype];
        if (newHandler) {
            newHandler.mixin(elem);
        }
    }
};


if (typeof document === "undefined") {
	throw "Not supported in a non-browser environment. ('document' object needed)";
}

if (typeof MutationObserver === "undefined") {
	throw "Requires 'MutationObserver' in browser environment.";
}

var objectObserver = new MutationObserver(function (mutations, observer) {
    for(var i=0; i<mutations.length; i++) {
        if (mutations[i].attributeName == "type") {
            modifyObjectIfNeeded(mutations[i].target);
        }
    }
});

var setupMonitorOnObject = function(elem) {
    // don't if already being monitored
    if (MONITORING.get(elem)) {
        return;
    }
    
    MONITORING.set(elem,true);
    
    objectObserver.observe(elem,{ attributes: true, attributeFilter:["type"] });
    modifyObjectIfNeeded(elem);
};

var documentObserver = new MutationObserver(function (mutations, observer) {
    for(var i=0; i<mutations.length; i++) {
        for(var j=0; j<mutations[i].addedNodes.length; ++j) {
            var node = mutations[i].addedNodes[j];
            if (node.tagName && node.tagName.toLowerCase() == "object") {
                setupMonitorOnObject(node);
            }
        }
    }
});

documentObserver.observe(document, { childList: true, subtree: true });

document.addEventListener("readystatechange", function() {
	switch (document.readyState) {
		case "interactive":
		case "complete":
			scanForAndModifyObjects();
			break;
		default:
			break;
	}
});

/* Override document.createElement to customise objects the moment they
   are created.
 */
var existing_createElement = document.createElement;

document.createElement = function(tagname ,options) {
    var element = existing_createElement.apply(this, arguments);
    
    if (tagname.toLowerCase() == "object") {
        setupMonitorOnObject(element);
    }
    
    return element;
};


/** Internal method to register a polyfill implementation of a particular mimeType
   with the oipfObjectFactory.
   
   Causes isObjectSupport() to return true for the specified mimetype.
   
   If the method name is XXX, then the function is registered as
   oipfObjectFactory.XXX
   
   @param mimeType    MimeType of object.
   @param methodName  Factory function name.
   @param mixinFunc   Function that takes an HTMLObjectElement and mixes in the functionality for this object
   @param unmixFunc   Function that takes an HTMLObjectElement that already has the functionality mixed in and removes it (un-mixing-in)
 */
var registerOipfObject = function(mimeType, methodName, mixinFunc, unmixFunc) {

	// create the factory func. Just setting the 'type' will trigger the mixinFunc
	// process, because we are already hooked into document.createElement()
	window.oipfObjectFactory[methodName] = function() {
		var newObject = document.createElement("object");
		newObject.type = mimeType;
		modifyObjectIfNeeded(newObject);
		return newObject;
	};
	
	MIMETYPE_HANDLERS[mimeType.toLowerCase()] = {
		"mixin": mixinFunc,
		"unmix": unmixFunc
	};
	scanForAndModifyObjects();
};

/** Internal method to regisrer a polyfill implementation of a non-visual object
 *
 * @param methodName Factory function name
 * @param methodFunc Factory function. Takes no parameters and should return the object.
 */
var registerNonVisualObject = function(methodName, methodFunc) {
	window.oipfObjectFactory[methodName] = methodFunc;
};

/** Internal method to register a polyfill implementation of a particular mimeType
   for an object element, without being a part of the oipf object factory.
   
   @param mimeType    MimeType of object.
   @param mixinFunc   Function that takes an HTMLObjectElement and mixes in the functionality for this object
   @param unmixFunc   Function that takes an HTMLObjectElement that already has the functionality mixed in and removes it (un-mixing-in)
 */
var registerNonFactoryObject = function(mimeType, mixinFunc, unmixFunc) {
	MIMETYPE_HANDLERS[mimeType.toLowerCase()] = {
		"mixin": mixinFunc,
		"unmix": unmixFunc
	};
	scanForAndModifyObjects();
};

/* Register the OIPF Object factory as an attribute of the global 'window'
   object. */

// create oipfObjectFactory if not already in existence	
if (window.oipfObjectFactory === undefined) {
	window.oipfObjectFactory = {};
}
	
// hook into 'isObjectSupported', chaining with existing method (if it exists)
var existing_isObjectSupported = window.oipfObjectFactory.isObjectSupported;

window.oipfObjectFactory.isObjectSupported = function(mimeType) {
	var alreadySupported = false;
	
	if (existing_isObjectSupported !== undefined) {
		alreadySupported = existing_isObjectSupported(mimeType);
	}
	
	if (alreadySupported) {
		return true; 
	} else {
		mimeType = mimeType.toLowerCase();
		return Boolean(MIMETYPE_HANDLERS[mimeType]);
	}
};


module.exports = {
	registerOipfObject: registerOipfObject,
	registerNonFactoryObject: registerNonFactoryObject,
	registerNonVisualObject: registerNonVisualObject
};


