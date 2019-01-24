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
 
 describe("oipfObjectFactory", function() {
    
    it("exists", function() {
        expect(window.oipfObjectFactory).toBeDefined();
    });
});

describe("window[\"oipf-object-polyfill\"]", function() {
    
    it("exists", function() {
        expect(window["oipf-object-polyfill"]).toBeDefined();
    });
});


describe("main", function() {

    var oipf = window["oipf-object-polyfill"];
    
    beforeAll(function() {
        var style = document.createElement("style");
        style.innerHTML = "object { visibility:hidden; }";
        document.head.appendChild(style);
    });
    
    it("has method registerNonVisualObject", function() {
        expect(oipf.registerNonVisualObject).toBeDefined();
    });
    
    describe("registration using registerNonVisualObject", function() {
        
        it("creates the named factory function when called", function() {
            var f=function() {};
            expect(window.oipfObjectFactory.createNonVisualTest).not.toBeDefined();
            oipf.registerNonVisualObject("createNonVisualTest", f);
            expect(window.oipfObjectFactory.createNonVisualTest).toBeDefined();
            expect(typeof window.oipfObjectFactory.createNonVisualTest).toBe("function");
        });
        
        it("calls the supplied function when the named method is invoked, and its return value is returned", function() {
            var f = jasmine.createSpy("func").and.callFake(function() { return "foo"; });
            oipf.registerNonVisualObject("createNonVisualTest", f);
            expect(f).not.toHaveBeenCalled();
            var result = window.oipfObjectFactory.createNonVisualTest();
            expect(result).toEqual("foo");
            expect(f).toHaveBeenCalled();
        });
    });
    
    it("has method registerOipfObject", function() {
        expect(oipf.registerOipfObject).toBeDefined();
    });
    
    describe("registration using registerOipfObject", function() {
        
        it("creates the named factory function when registerOipfObject is called", function() {
            expect(window.oipfObjectFactory.createTestTest).not.toBeDefined();
            oipf.registerOipfObject("test/test", "createTestTest", function() {}, function() {});
            expect(window.oipfObjectFactory.createTestTest).toBeDefined();
            expect(typeof window.oipfObjectFactory.createTestTest).toBe("function");
        });
    });
    
    
    describe("for a registered mixin", function() {
        
        describe("when the create method is called on the oipfObjectFactory", function() {
            var mixinSpy = jasmine.createSpy("mixin"); 
            var unmixSpy = jasmine.createSpy("unmix"); 
            mixinSpy.x=5;
            var object;
            
            beforeEach(function() {
                oipf.registerOipfObject("test/type", "createTestObject", mixinSpy, unmixSpy);
                mixinSpy.calls.reset();
                unmixSpy.calls.reset();
            });
            
            afterEach(function() {
                // remove anything stray from the DOM
                if (object) {
                    object.type = "";
                    object = undefined;
                }
            });
            
            it("will call the supplied mixin if the factory is called, and the returned object will be the one that was passed to the mixin", function() {
                expect(mixinSpy).not.toHaveBeenCalled();
                expect(unmixSpy).not.toHaveBeenCalled();

                object = oipfObjectFactory.createTestObject();
                expect(object).toBeDefined();
                
                expect(mixinSpy).toHaveBeenCalledWith(object);
                expect(unmixSpy).not.toHaveBeenCalled();
            });
            
        });
        
        describe("for when <object> elements are added to the document", function() {
            
            
            var mixinSpy = jasmine.createSpy("mixin"); 
            var unmixSpy = jasmine.createSpy("unmix"); 
            
            beforeEach(function() {
                oipf.registerOipfObject("test/type", "createTestObject", mixinSpy, unmixSpy);
                mixinSpy.calls.reset();
                unmixSpy.calls.reset();
                mixinSpy.and.callFake(function() {});
                unmixSpy.and.callFake(function() {});
            });
            
            afterEach(function() {
                // remove anything stray from the DOM
                var objects = document.getElementsByTagName("object");
                for(var i=0; i<objects.length; i++) {
                    objects[i].type = ""; // force handler removal
                    objects[i].parentNode.removeChild(objects[i]);
                }
            });
            
            it("will call the supplied mixin if an <object> with the specified mimetype is included in the page", function(done) {
                document.body.innerHTML += '<object id="obj" type="test/type"></object>';
                var obj = document.getElementById("obj");
                expect(obj).toBeDefined();
                
                var timeout = setTimeout(function() {
                    expect(mixinSpy).toHaveBeenCalledWith(obj);
                    done();
                }, 900);

                mixinSpy.and.callFake(function() {
                    clearTimeout(timeout);
                    done();
                });
            },1000);

            it("will not call the supplied mixin function if an <object> with a different mimetype is included in the page", function(done) {
                document.body.innerHTML += '<object id="obj" type="test/different-type"></object>';
                var obj = document.getElementById("obj");
                
                setTimeout(function() {
                    expect(mixinSpy).not.toHaveBeenCalled();
                    done();
                }, 900);
            },1000);

            it("will call the supplied mix and unmix functions if an <object> changes mimetype while in the page", function(done) {
                document.body.innerHTML += '<object id="obj" type="test/different-type"></object>';
                var obj = document.getElementById("obj");
                
                setTimeout(function() {
                    expect(mixinSpy).not.toHaveBeenCalled();
                    expect(unmixSpy).not.toHaveBeenCalled();
                    
                    obj.type="test/type";
                    
                    setTimeout(function() {
                        expect(mixinSpy).toHaveBeenCalledWith(obj);
                        expect(unmixSpy).not.toHaveBeenCalled();
                        mixinSpy.calls.reset();

                        obj.type="test/another-different-type";
                        
                        setTimeout(function() {
                            expect(mixinSpy).not.toHaveBeenCalled();
                            expect(unmixSpy).toHaveBeenCalledWith(obj);
                            
                            done();
                        },900);
                    },900);
                },900);
                
            },3000);

        });
        
        
        describe("for when <object> elements are created using document.createElement but not added to the DOM", function() {
            
            
            var mixinSpy = jasmine.createSpy("mixin");
            var unmixSpy = jasmine.createSpy("unmix");
            var object;
            
            beforeEach(function() {
                oipf.registerOipfObject("test/type", "createTestObject", mixinSpy, unmixSpy);
                mixinSpy.calls.reset();
                unmixSpy.calls.reset();
                mixinSpy.and.callFake(function() {});
                unmixSpy.and.callFake(function() {});
                object = null;
            });
            
            afterEach(function() {
                // remove anything stray from the DOM
                if (object) {
                    object.type = "";
                    object = undefined;
                }
            });
            
            it("will call the supplied mixin if an <object> with the specified mimetype ", function(done) {
                object = document.createElement("object");
                expect(object).toBeDefined();
                
                setTimeout(function() {
                    expect(mixinSpy).not.toHaveBeenCalled();
                    
                    object.type = "test/type";
                
                    var timeout = setTimeout(function() {
                        expect(mixinSpy).toHaveBeenCalledWith(object);
                        done();
                    }, 900);
                    
                    mixinSpy.and.callFake(function() {
                        clearTimeout(timeout);
                        done();
                    });
                },900);

            },2000);

            it("will not call the supplied mixin function if an <object> with a different mimetype", function(done) {
                object = document.createElement("object");
                object.type = "test/different-type";
                
                setTimeout(function() {
                    expect(mixinSpy).not.toHaveBeenCalled();
                    done();
                }, 900);
            },1000);

            it("will call the supplied mix and unmix functions if an <object> changes mimetype ", function(done) {
                object = document.createElement("object");
                object.type = "test/different-type";
                
                setTimeout(function() {
                    expect(mixinSpy).not.toHaveBeenCalled();
                    expect(unmixSpy).not.toHaveBeenCalled();
                    
                    object.type="test/type";
                    
                    setTimeout(function() {
                        expect(mixinSpy).toHaveBeenCalledWith(object);
                        expect(unmixSpy).not.toHaveBeenCalled();
                        mixinSpy.calls.reset();

                        object.type="test/another-different-type";
                        
                        setTimeout(function() {
                            expect(mixinSpy).not.toHaveBeenCalled();
                            expect(unmixSpy).toHaveBeenCalledWith(object);
                            
                            done();
                        },900);
                    },900);
                },900);
                
            },3000);

        });
        
        describe("for when <object> elements are created using document.createElement then added to the DOM", function() {
            
            
            var mixinSpy = jasmine.createSpy("mixin");
            var unmixSpy = jasmine.createSpy("unmix");
            var object;
            
            beforeEach(function() {
                oipf.registerOipfObject("test/type", "createTestObject", mixinSpy, unmixSpy);
                mixinSpy.calls.reset();
                unmixSpy.calls.reset();
                mixinSpy.and.callFake(function() {});
                unmixSpy.and.callFake(function() {});
                object = null;
            });
            
            afterEach(function() {
                // remove anything stray from the DOM
                if (object) {
                    object.type = "";
                }
                // remove anything stray from the DOM
                var objects = document.getElementsByTagName("object");
                for(var i=0; i<objects.length; i++) {
                    objects[i].type = ""; // force handler removal
                    objects[i].parentNode.removeChild(objects[i]);
                }
            });
            
            it("will not call the mixin twice if the object is created with the mimetype outside the documet using document.createElement and then inserted into it", function(done) {
                object = document.createElement("object");
                object.type = "test/type";

                setTimeout(function() {
                    expect(mixinSpy).toHaveBeenCalledWith(object);
                    expect(unmixSpy).not.toHaveBeenCalled();
                    mixinSpy.calls.reset();
                    
                    document.body.appendChild(object);
                    
                    mixinSpy.and.callFake(function() { fail("Should not have been mixed-in again."); });
                    unmixSpy.and.callFake(function() { fail("Should not have been mixed-in again."); });
                    
                    setTimeout(function() {
                        expect(mixinSpy).not.toHaveBeenCalled();
                        expect(unmixSpy).not.toHaveBeenCalled();
                        
                        document.body.removeChild(object);

                        setTimeout(function() {
                            expect(mixinSpy).not.toHaveBeenCalled();
                            expect(unmixSpy).not.toHaveBeenCalled();
                            done();
                        }, 900);
                    }, 900);
                },900);
            });
            
        }, 3000);

    });
    
});
