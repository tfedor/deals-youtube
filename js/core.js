const Info = {
    'version': "1.0.0",
};

/**
 * Shim for Promise.finally() for browsers (Waterfox/FF 56) that don't have it
 * https://github.com/domenic/promises-unwrapping/issues/18#issuecomment-57801572
 */
if (typeof Promise.prototype.finally === 'undefined') {
    Object.defineProperty(Promise.prototype, 'finally', {
        'value': function(callback) {
            var constructor = this.constructor;
            return this.then(function(value) {
                return constructor.resolve(callback()).then(function(){
                    return value;
                });
            }, function(reason) {
                return constructor.resolve(callback()).then(function(){
                    console.error(reason);
                    throw reason;
                });
            });
        },
    });
}


class ExtensionResources {

    static getURL(pathname) {
        return chrome.runtime.getURL(pathname);
    }

}


/**
 * DOMPurify setup
 * @see https://github.com/cure53/DOMPurify
 */
(async function() {
    /**
     * NOTE FOR ADDON REVIEWER:
     * We are modifying default DOMPurify settings to allow other protocols in URLs
     * and to allow links to safely open in new tabs.
     *
     * We took the original Regex and added chrome-extension://, moz-extension://
     * which are needed for linking local resources from extension
     */

    let purifyConfig = {
        ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|chrome-extension|moz-extension):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
    };

    DOMPurify.setConfig(purifyConfig);
})();


class HTML {

    static escape(str) {
        // @see https://stackoverflow.com/a/4835406
        let map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };

        return str.replace(/[&<>"']/g, function(m) { return map[m]; });
    }

    static fragment(html) {
        let template = document.createElement('template');
        template.innerHTML = DOMPurify.sanitize(html);
        return template.content;
    }

    static element(html) {
        return HTML.fragment(html).firstElementChild;
    }

    static inner(node, html) {
        if (typeof node == 'undefined' || node === null) {
            console.warn(`${node} is not an Element.`);
            return null;
        }
        if (typeof node == "string") {
            node = document.querySelector(node);
        }
        if (!(node instanceof Element)) {
            console.warn(`${node} is not an Element.`);
            return null;
        }
        
        node.innerHTML = DOMPurify.sanitize(html);
        return node;
    }

    static wrap(node, html) {
        if (typeof node == 'undefined' || node === null) {
            console.warn(`${node} is not an Element.`);
            return null;
        }
        if (typeof node == "string") {
            node = document.querySelector(node);
        }
        if (!(node instanceof Element)) {
            console.warn(`${node} is not an Element.`);
            return null;
        }

        let wrapper = HTML.element(html);
        node.replaceWith(wrapper);
        wrapper.appendChild(node);
        return wrapper;
    }

    static adjacent(node, position, html) {
        if (typeof node == 'undefined' || node === null) {
            console.warn(`${node} is not an Element.`);
            return null;
        }
        if (typeof node == "string") {
            node = document.querySelector(node);
        }
        if (!(node instanceof Element)) {
            console.warn(`${node} is not an Element.`);
            return null;
        }
        
        node.insertAdjacentHTML(position, DOMPurify.sanitize(html));
        return node;
    }

    static beforeBegin(node, html) {
        HTML.adjacent(node, "beforebegin", html);
    }

    static afterBegin(node, html) {
        HTML.adjacent(node, "afterbegin", html);
    }

    static beforeEnd(node, html) {
        HTML.adjacent(node, "beforeend", html);
    }

    static afterEnd(node, html) {
        HTML.adjacent(node, "afterend", html);
    }
}

