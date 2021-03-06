(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(factory());
}(this, function () { 'use strict';

	var commonjsGlobal = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {}

	function interopDefault(ex) {
		return ex && typeof ex === 'object' && 'default' in ex ? ex['default'] : ex;
	}

	function createCommonjsModule(fn, module) {
		return module = { exports: {} }, fn(module, module.exports), module.exports;
	}

	var index = createCommonjsModule(function (module) {
	'use strict';
	// Create a range object for efficently rendering strings to elements.
	var range;

	var testEl = (typeof document !== 'undefined') ?
	    document.body || document.createElement('div') :
	    {};

	var XHTML = 'http://www.w3.org/1999/xhtml';
	var ELEMENT_NODE = 1;
	var TEXT_NODE = 3;
	var COMMENT_NODE = 8;

	// Fixes <https://github.com/patrick-steele-idem/morphdom/issues/32>
	// (IE7+ support) <=IE7 does not support el.hasAttribute(name)
	var hasAttributeNS;

	if (testEl.hasAttributeNS) {
	    hasAttributeNS = function(el, namespaceURI, name) {
	        return el.hasAttributeNS(namespaceURI, name);
	    };
	} else if (testEl.hasAttribute) {
	    hasAttributeNS = function(el, namespaceURI, name) {
	        return el.hasAttribute(name);
	    };
	} else {
	    hasAttributeNS = function(el, namespaceURI, name) {
	        return !!el.getAttributeNode(name);
	    };
	}

	function toElement(str) {
	    if (!range && document.createRange) {
	        range = document.createRange();
	        range.selectNode(document.body);
	    }

	    var fragment;
	    if (range && range.createContextualFragment) {
	        fragment = range.createContextualFragment(str);
	    } else {
	        fragment = document.createElement('body');
	        fragment.innerHTML = str;
	    }
	    return fragment.childNodes[0];
	}

	var specialElHandlers = {
	    /**
	     * Needed for IE. Apparently IE doesn't think that "selected" is an
	     * attribute when reading over the attributes using selectEl.attributes
	     */
	    OPTION: function(fromEl, toEl) {
	        fromEl.selected = toEl.selected;
	        if (fromEl.selected) {
	            fromEl.setAttribute('selected', '');
	        } else {
	            fromEl.removeAttribute('selected', '');
	        }
	    },
	    /**
	     * The "value" attribute is special for the <input> element since it sets
	     * the initial value. Changing the "value" attribute without changing the
	     * "value" property will have no effect since it is only used to the set the
	     * initial value.  Similar for the "checked" attribute, and "disabled".
	     */
	    INPUT: function(fromEl, toEl) {
	        fromEl.checked = toEl.checked;
	        if (fromEl.checked) {
	            fromEl.setAttribute('checked', '');
	        } else {
	            fromEl.removeAttribute('checked');
	        }

	        if (fromEl.value !== toEl.value) {
	            fromEl.value = toEl.value;
	        }

	        if (!hasAttributeNS(toEl, null, 'value')) {
	            fromEl.removeAttribute('value');
	        }

	        fromEl.disabled = toEl.disabled;
	        if (fromEl.disabled) {
	            fromEl.setAttribute('disabled', '');
	        } else {
	            fromEl.removeAttribute('disabled');
	        }
	    },

	    TEXTAREA: function(fromEl, toEl) {
	        var newValue = toEl.value;
	        if (fromEl.value !== newValue) {
	            fromEl.value = newValue;
	        }

	        if (fromEl.firstChild) {
	            fromEl.firstChild.nodeValue = newValue;
	        }
	    }
	};

	function noop() {}

	/**
	 * Returns true if two node's names and namespace URIs are the same.
	 *
	 * @param {Element} a
	 * @param {Element} b
	 * @return {boolean}
	 */
	var compareNodeNames = function(a, b) {
	    return a.nodeName === b.nodeName &&
	           a.namespaceURI === b.namespaceURI;
	};

	/**
	 * Create an element, optionally with a known namespace URI.
	 *
	 * @param {string} name the element name, e.g. 'div' or 'svg'
	 * @param {string} [namespaceURI] the element's namespace URI, i.e. the value of
	 * its `xmlns` attribute or its inferred namespace.
	 *
	 * @return {Element}
	 */
	function createElementNS(name, namespaceURI) {
	    return !namespaceURI || namespaceURI === XHTML ?
	        document.createElement(name) :
	        document.createElementNS(namespaceURI, name);
	}

	/**
	 * Loop over all of the attributes on the target node and make sure the original
	 * DOM node has the same attributes. If an attribute found on the original node
	 * is not on the new node then remove it from the original node.
	 *
	 * @param  {Element} fromNode
	 * @param  {Element} toNode
	 */
	function morphAttrs(fromNode, toNode) {
	    var attrs = toNode.attributes;
	    var i;
	    var attr;
	    var attrName;
	    var attrNamespaceURI;
	    var attrValue;
	    var fromValue;

	    for (i = attrs.length - 1; i >= 0; --i) {
	        attr = attrs[i];
	        attrName = attr.name;
	        attrNamespaceURI = attr.namespaceURI;
	        attrValue = attr.value;

	        if (attrNamespaceURI) {
	            attrName = attr.localName || attrName;
	            fromValue = fromNode.getAttributeNS(attrNamespaceURI, attrName);

	            if (fromValue !== attrValue) {
	                fromNode.setAttributeNS(attrNamespaceURI, attrName, attrValue);
	            }
	        } else {
	            fromValue = fromNode.getAttribute(attrName);

	            if (fromValue !== attrValue) {
	                fromNode.setAttribute(attrName, attrValue);
	            }
	        }
	    }

	    // Remove any extra attributes found on the original DOM element that
	    // weren't found on the target element.
	    attrs = fromNode.attributes;

	    for (i = attrs.length - 1; i >= 0; --i) {
	        attr = attrs[i];
	        if (attr.specified !== false) {
	            attrName = attr.name;
	            attrNamespaceURI = attr.namespaceURI;

	            if (attrNamespaceURI) {
	                attrName = attrName = attr.localName || attrName;

	                if (!hasAttributeNS(toNode, attrNamespaceURI, attrName)) {
	                    fromNode.removeAttributeNS(attrNamespaceURI, attr.localName);
	                }
	            } else {
	                if (!hasAttributeNS(toNode, null, attrName)) {
	                    fromNode.removeAttribute(attrName);
	                }
	            }
	        }
	    }
	}

	/**
	 * Copies the children of one DOM element to another DOM element
	 */
	function moveChildren(fromEl, toEl) {
	    var curChild = fromEl.firstChild;
	    while (curChild) {
	        var nextChild = curChild.nextSibling;
	        toEl.appendChild(curChild);
	        curChild = nextChild;
	    }
	    return toEl;
	}

	function defaultGetNodeKey(node) {
	    return node.id;
	}

	function morphdom(fromNode, toNode, options) {
	    if (!options) {
	        options = {};
	    }

	    if (typeof toNode === 'string') {
	        if (fromNode.nodeName === '#document' || fromNode.nodeName === 'HTML') {
	            var toNodeHtml = toNode;
	            toNode = document.createElement('html');
	            toNode.innerHTML = toNodeHtml;
	        } else {
	            toNode = toElement(toNode);
	        }
	    }

	    var getNodeKey = options.getNodeKey || defaultGetNodeKey;
	    var onBeforeNodeAdded = options.onBeforeNodeAdded || noop;
	    var onNodeAdded = options.onNodeAdded || noop;
	    var onBeforeElUpdated = options.onBeforeElUpdated || noop;
	    var onElUpdated = options.onElUpdated || noop;
	    var onBeforeNodeDiscarded = options.onBeforeNodeDiscarded || noop;
	    var onNodeDiscarded = options.onNodeDiscarded || noop;
	    var onBeforeElChildrenUpdated = options.onBeforeElChildrenUpdated || noop;
	    var childrenOnly = options.childrenOnly === true;

	    // This object is used as a lookup to quickly find all keyed elements in the original DOM tree.
	    var fromNodesLookup = {};

	    function walkDiscardedChildNodes(node) {
	        if (node.nodeType === ELEMENT_NODE) {
	            var curChild = node.firstChild;
	            while (curChild) {
	                if (!getNodeKey(curChild)) {
	                    // Only report the node as discarded if it is not keyed. We do this because
	                    // at the end we loop through all keyed elements that were unmatched
	                    // and then discard them in one final pass.
	                    onNodeDiscarded(curChild);
	                    if (curChild.firstChild) {
	                        walkDiscardedChildNodes(curChild);
	                    }
	                }

	                curChild = curChild.nextSibling;
	            }
	        }
	    }

	    function removeNode(node, parentNode) {
	        if (onBeforeNodeDiscarded(node) === false) {
	            return;
	        }

	        if (parentNode) {
	            parentNode.removeChild(node);
	        }

	        onNodeDiscarded(node);
	        walkDiscardedChildNodes(node);
	    }

	    // // TreeWalker implementation is no faster, but keeping this around in case this changes in the future
	    // function indexTree(root) {
	    //     var treeWalker = document.createTreeWalker(
	    //         root,
	    //         NodeFilter.SHOW_ELEMENT);
	    //
	    //     var el;
	    //     while((el = treeWalker.nextNode())) {
	    //         var key = getNodeKey(el);
	    //         if (key) {
	    //             fromNodesLookup[key] = el;
	    //         }
	    //     }
	    // }

	    // // NodeIterator implementation is no faster, but keeping this around in case this changes in the future
	    //
	    // function indexTree(node) {
	    //     var nodeIterator = document.createNodeIterator(node, NodeFilter.SHOW_ELEMENT);
	    //     var el;
	    //     while((el = nodeIterator.nextNode())) {
	    //         var key = getNodeKey(el);
	    //         if (key) {
	    //             fromNodesLookup[key] = el;
	    //         }
	    //     }
	    // }

	    function indexTree(node) {
	        if (node.nodeType === ELEMENT_NODE) {
	            var curChild = node.firstChild;
	            while (curChild) {
	                var key = getNodeKey(curChild);
	                if (key) {
	                    fromNodesLookup[key] = curChild;
	                }

	                // Walk recursively
	                indexTree(curChild);

	                curChild = curChild.nextSibling;
	            }
	        }
	    }

	    indexTree(fromNode);

	    function handleNodeAdded(el) {
	        onNodeAdded(el);

	        var curChild = el.firstChild;
	        while (curChild) {
	            var nextSibling = curChild.nextSibling;

	            var key = getNodeKey(curChild);
	            if (key) {
	                var unmatchedFromEl = fromNodesLookup[key];
	                if (unmatchedFromEl && compareNodeNames(curChild, unmatchedFromEl)) {
	                    curChild.parentNode.replaceChild(unmatchedFromEl, curChild);
	                    morphEl(unmatchedFromEl, curChild);
	                }
	            }

	            handleNodeAdded(curChild);
	            curChild = nextSibling;
	        }
	    }

	    function morphEl(fromEl, toEl, childrenOnly) {
	        var toElKey = getNodeKey(toEl);
	        if (toElKey) {
	            // If an element with an ID is being morphed then it is will be in the final
	            // DOM so clear it out of the saved elements collection
	            delete fromNodesLookup[toElKey];
	        }

	        if (!childrenOnly) {
	            if (onBeforeElUpdated(fromEl, toEl) === false) {
	                return;
	            }

	            morphAttrs(fromEl, toEl);
	            onElUpdated(fromEl);

	            if (onBeforeElChildrenUpdated(fromEl, toEl) === false) {
	                return;
	            }
	        }

	        if (fromEl.nodeName !== 'TEXTAREA') {
	            var curToNodeChild = toEl.firstChild;
	            var curFromNodeChild = fromEl.firstChild;
	            var curToNodeKey;

	            var fromNextSibling;
	            var toNextSibling;
	            var matchingFromEl;

	            outer: while (curToNodeChild) {
	                toNextSibling = curToNodeChild.nextSibling;
	                curToNodeKey = getNodeKey(curToNodeChild);

	                while (curFromNodeChild) {
	                    var curFromNodeKey = getNodeKey(curFromNodeChild);
	                    fromNextSibling = curFromNodeChild.nextSibling;

	                    var curFromNodeType = curFromNodeChild.nodeType;

	                    var isCompatible = undefined;

	                    if (curFromNodeType === curToNodeChild.nodeType) {
	                        if (curFromNodeType === ELEMENT_NODE) {
	                            // Both nodes being compared are Element nodes

	                            if (curToNodeKey) {
	                                // The target node has a key so we want to match it up with the correct element
	                                // in the original DOM tree
	                                if (curToNodeKey !== curFromNodeKey) {
	                                    // The current element in the original DOM tree does not have a matching key so
	                                    // let's check our lookup to see if there is a matching element in the original
	                                    // DOM tree
	                                    if ((matchingFromEl = fromNodesLookup[curToNodeKey])) {
	                                        if (curFromNodeChild.nextSibling === matchingFromEl) {
	                                            // Special case for single element removals. To avoid removing the original
	                                            // DOM node out of the tree (since that can break CSS transitions, etc.),
	                                            // we will instead discard the current node and wait until the next
	                                            // iteration to properly match up the keyed target element with its matching
	                                            // element in the original tree
	                                            isCompatible = false;
	                                        } else {
	                                            // We found a matching keyed element somewhere in the original DOM tree.
	                                            // Let's moving the original DOM node into the current position and morph
	                                            // it.

	                                            // NOTE: We use insertBefore instead of replaceChild because we want to go through
	                                            // the `removeNode()` function for the node that is being discarded so that
	                                            // all lifecycle hooks are correctly invoked
	                                            fromEl.insertBefore(matchingFromEl, curFromNodeChild);

	                                            if (!curFromNodeKey) {
	                                                removeNode(curFromNodeChild, fromEl);
	                                            }
	                                            fromNextSibling = curFromNodeChild.nextSibling;
	                                            curFromNodeChild = matchingFromEl;
	                                        }
	                                    } else {
	                                        // The nodes are not compatible since the "to" node has a key and there
	                                        // is no matching keyed node in the source tree
	                                        isCompatible = false;
	                                    }
	                                }
	                            } else if (curFromNodeKey) {
	                                // The original has a key
	                                isCompatible = false;
	                            }

	                            isCompatible = isCompatible !== false && compareNodeNames(curFromNodeChild, curToNodeChild);
	                            if (isCompatible) {
	                                // We found compatible DOM elements so transform
	                                // the current "from" node to match the current
	                                // target DOM node.
	                                morphEl(curFromNodeChild, curToNodeChild);
	                            }

	                        } else if (curFromNodeType === TEXT_NODE || curFromNodeType == COMMENT_NODE) {
	                            // Both nodes being compared are Text or Comment nodes
	                            isCompatible = true;
	                            // Simply update nodeValue on the original node to
	                            // change the text value
	                            curFromNodeChild.nodeValue = curToNodeChild.nodeValue;
	                        }
	                    }

	                    if (isCompatible) {
	                        // Advance both the "to" child and the "from" child since we found a match
	                        curToNodeChild = toNextSibling;
	                        curFromNodeChild = fromNextSibling;
	                        continue outer;
	                    }

	                    // No compatible match so remove the old node from the DOM and continue trying to find a
	                    // match in the original DOM. However, we only do this if the from node is not keyed
	                    // since it is possible that a keyed node might match up with a node somewhere else in the
	                    // target tree and we don't want to discard it just yet since it still might find a
	                    // home in the final DOM tree. After everything is done we will remove any keyed nodes
	                    // that didn't find a home
	                    if (!curFromNodeKey) {
	                        removeNode(curFromNodeChild, fromEl);
	                    }

	                    curFromNodeChild = fromNextSibling;
	                }

	                // If we got this far then we did not find a candidate match for
	                // our "to node" and we exhausted all of the children "from"
	                // nodes. Therefore, we will just append the current "to" node
	                // to the end
	                if (curToNodeKey && (matchingFromEl = fromNodesLookup[curToNodeKey]) && compareNodeNames(matchingFromEl, curToNodeChild)) {
	                    fromEl.appendChild(matchingFromEl);
	                    morphEl(matchingFromEl, curToNodeChild);
	                } else {
	                    if (onBeforeNodeAdded(curToNodeChild) !== false) {
	                        fromEl.appendChild(curToNodeChild);
	                        handleNodeAdded(curToNodeChild);
	                    }
	                }

	                curToNodeChild = toNextSibling;
	                curFromNodeChild = fromNextSibling;
	            }

	            // We have processed all of the "to nodes". If curFromNodeChild is
	            // non-null then we still have some from nodes left over that need
	            // to be removed
	            while (curFromNodeChild) {
	                fromNextSibling = curFromNodeChild.nextSibling;
	                if (!getNodeKey(curFromNodeChild)) {
	                    removeNode(curFromNodeChild, fromEl);
	                }
	                curFromNodeChild = fromNextSibling;
	            }
	        }

	        var specialElHandler = specialElHandlers[fromEl.nodeName];
	        if (specialElHandler) {
	            specialElHandler(fromEl, toEl);
	        }
	    } // END: morphEl(...)

	    var morphedNode = fromNode;
	    var morphedNodeType = morphedNode.nodeType;
	    var toNodeType = toNode.nodeType;

	    if (!childrenOnly) {
	        // Handle the case where we are given two DOM nodes that are not
	        // compatible (e.g. <div> --> <span> or <div> --> TEXT)
	        if (morphedNodeType === ELEMENT_NODE) {
	            if (toNodeType === ELEMENT_NODE) {
	                if (!compareNodeNames(fromNode, toNode)) {
	                    onNodeDiscarded(fromNode);
	                    morphedNode = moveChildren(fromNode, createElementNS(toNode.nodeName, toNode.namespaceURI));
	                }
	            } else {
	                // Going from an element node to a text node
	                morphedNode = toNode;
	            }
	        } else if (morphedNodeType === TEXT_NODE || morphedNodeType === COMMENT_NODE) { // Text or comment node
	            if (toNodeType === morphedNodeType) {
	                morphedNode.nodeValue = toNode.nodeValue;
	                return morphedNode;
	            } else {
	                // Text node to something else
	                morphedNode = toNode;
	            }
	        }
	    }

	    if (morphedNode === toNode) {
	        // The "to node" was not compatible with the "from node" so we had to
	        // toss out the "from node" and use the "to node"
	        onNodeDiscarded(fromNode);
	    } else {
	        morphEl(morphedNode, toNode, childrenOnly);

	        for (var k in fromNodesLookup) {
	            var elToRemove = fromNodesLookup[k];
	            if (elToRemove) {
	                removeNode(elToRemove, elToRemove.parentNode);
	            }
	        }
	    }

	    if (!childrenOnly && morphedNode !== fromNode && fromNode.parentNode) {
	        // If we had to swap out the from node with a new node because the old
	        // node was not compatible with the target node then we need to
	        // replace the old DOM node in the original DOM tree. This is only
	        // possible if the original DOM node was part of a DOM tree which
	        // we know is the case if it has a parent node.
	        fromNode.parentNode.replaceChild(morphedNode, fromNode);
	    }

	    return morphedNode;
	}

	module.exports = morphdom;
	});

	var morphdom = interopDefault(index);

	var matchesSelector = createCommonjsModule(function (module) {
	/*! Lee Cooper <lee.cooper@lski.uk> - matches-selector-polyfill - 1.0.0 */!function(e,t){if(!e.Element)throw new Error("Element is required for matches-selector-polyfill to be used");"function"==typeof define&&define.amd?define([],t):"object"==typeof module&&module.exports&&(module.exports=t())}(commonjsGlobal,function(){"use strict";function e(e){for(var t=this,r=t.parentNode.querySelectorAll(e),o=r.length;--o>=0;)if(r.item(o)===t)return!0;return!1}function t(e,t){return o.call(e,t)}var r=Element.prototype,o=r.matches||r.webkitMatchesSelector||r.mozMatchesSelector||r.msMatchesSelector||e;return t});
	});

	interopDefault(matchesSelector);

	var selectors = {};

	// Observe document for dynamically added components
	(new MutationObserver(function (mutations) {
	  mutations.forEach(function (mutation) {
	    [].slice.call(mutation.addedNodes || [])
	      .filter(function (node) { return node.nodeType === 1; })
	      .forEach(function (node) {
	        Object.keys(selectors)
	          .filter(function (selector) { return node.matches(selector); })
	          .forEach(function (selector) { return selectors[selector](node); });
	      });
	  });
	})).observe(document, {
	  childList: true,
	  subtree: true
	});

	// DOM builder, JSX style
	var svgns = 'http://www.w3.org/2000/svg';
	var specialAttrs = {
	  className: 'class',
	  htmlFor: 'for',
	};
	var svgTags = [
	  'svg',
	  'altGlyph', 'altGlyphDef', 'altGlyphItem', 'animate', 'animateColor',
	  'animateMotion', 'animateTransform', 'circle', 'clipPath', 'color-profile',
	  'cursor', 'defs', 'desc', 'ellipse', 'feBlend', 'feColorMatrix',
	  'feComponentTransfer', 'feComposite', 'feConvolveMatrix', 'feDiffuseLighting',
	  'feDisplacementMap', 'feDistantLight', 'feFlood', 'feFuncA', 'feFuncB',
	  'feFuncG', 'feFuncR', 'feGaussianBlur', 'feImage', 'feMerge', 'feMergeNode',
	  'feMorphology', 'feOffset', 'fePointLight', 'feSpecularLighting',
	  'feSpotLight', 'feTile', 'feTurbulence', 'filter', 'font', 'font-face',
	  'font-face-format', 'font-face-name', 'font-face-src', 'font-face-uri',
	  'foreignObject', 'g', 'glyph', 'glyphRef', 'hkern', 'image', 'line',
	  'linearGradient', 'marker', 'mask', 'metadata', 'missing-glyph', 'mpath',
	  'path', 'pattern', 'polygon', 'polyline', 'radialGradient', 'rect',
	  'set', 'stop', 'switch', 'symbol', 'text', 'textPath', 'title', 'tref',
	  'tspan', 'use', 'view', 'vkern',
	];
	var h = function (nodeName, attributes) {
	  var children = [], len = arguments.length - 2;
	  while ( len-- > 0 ) children[ len ] = arguments[ len + 2 ];

	  var node = (svgTags.indexOf(nodeName) > -1) ?
	    document.createElementNS(svgns, nodeName) :
	    document.createElement(nodeName);
	  var setAttribute = function (attr) {
	    node.setAttribute(specialAttrs[attr] || attr, attributes[attr]);
	  };
	  Object.keys(attributes || {}).forEach(setAttribute);
	  children.forEach(function (child) {
	    if (Array.isArray(child)) {
	      var fragment = document.createDocumentFragment();
	      child.forEach(function (subchild) { return fragment.appendChild(subchild); });
	      node.appendChild(fragment);
	    } else if (typeof (child || '') === 'string') {
	      node.appendChild(document.createTextNode(child || ''));
	    } else {
	      node.appendChild(child);
	    }
	  });
	  return node;
	};

	// bind a selector to a view function
	var bind = function (selector, view, options) {
	  if ( options === void 0 ) options={};

	  var render = function (node) {
	    morphdom(node, view(node.dataset), Object.assign({}, options, {childrenOnly: true}))
	  };
	  var init = function (node) {
	    (new MutationObserver(function (mutations) {
	      var dirty = mutations.some(function (mut) { return mut.attributeName ?
	        mut.attributeName.startsWith('data-') : Boolean(mut.removedNodes.length); }
	      );
	      if (dirty) {
	        render(node);
	      }
	    })).observe(node, {
	      attributes: true,
	      childList: true,
	    });
	    render(node);
	  };
	  [].slice.call(document.querySelectorAll(selector)).forEach(init);
	  selectors[selector] = selectors[selector] || init;
	};

	var hello = function (data) { return (
	  h( 'body', null, "hello, ", h( 'span', null, data.name ),
	    h( 'pre', null,
	      h( 'code', null,
	        Object.keys(data)
	          .map(function (key) { return (key + "=\"" + (data[key]) + "\""); })
	          .join('\n')
	      )
	    ),
	    h( 'ul', { className: 'grid-list' },
	      Array
	        .apply(null, Array(parseInt(data.count)))
	        .map(function (el, index) { return (
	          h( 'li', {
	            'data-component': 'item', 'data-what': index })
	        ); })
	    )
	  )
	); };

	var item = function (data) { return h( 'body', null, data.what ); };

	var svg = function (data) { return (
	  h( 'body', null,
	    h( 'svg', { viewBox: "0 0 100 100" },
	      h( 'ellipse', { cx: "50", cy: "80", rx: "46", ry: "19", fill: "#07c" }),
	      h( 'path', {
	        d: 'M43,0c-6,25,16,22,1,52c11,3,19,0,19-22c38,18,16,63-12,64c-25,2-55-39-8-94', fill: '#e34' }),
	      h( 'path', {
	        d: 'M34,41c-6,39,29,32,33,7c39,42-69,63-33-7', fill: '#fc2', style: ("opacity: " + (data.opacity)) })
	    )
	  )
	); };

	bind('[data-component=hello]', hello);
	bind('[data-component=item]', item);
	bind('[data-component=svg]', svg);

}));