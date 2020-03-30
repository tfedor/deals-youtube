const Info = {
    'version': chrome.runtime.getManifest().version,
};


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

