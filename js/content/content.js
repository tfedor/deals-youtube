
class Background {
    static async _message(message) {

        return new Promise(function (resolve, reject) {
            chrome.runtime.sendMessage(message, function(response) {
                if (!response) {
                    reject("No response from extension background context.");
                    return;
                }
                if (typeof response.error !== 'undefined') {
                    response.localStack = (new Error(message.action)).stack;
                    reject(response);
                    return;
                }
                resolve(response.response);
            });
        });
    }
    
    static action(requested, params) {
        if (typeof params == 'undefined')
            return Background._message({ 'action': requested, });
        return Background._message({ 'action': requested, 'params': params, });
    }
}


/**
 * Event handler for uncaught Background errors
 */
function unhandledrejection(ev) {
    let err = ev.reason;
    if (!err || !err.error) return; // Not a background error
    ev.preventDefault();
    ev.stopPropagation();
    console.group("An error occurred in the background context.");
    console.error(err.localStack);
    console.error(err.stack);
    console.groupEnd();
}

window.addEventListener('unhandledrejection', unhandledrejection);


let ExtensionLayer = (function() {

    let self = {};

    // NOTE: use cautiously!
    // Run script in the context of the current tab
    self.runInPageContext = function(fun) {
        let script  = document.createElement("script");
        script.textContent = '(' + fun + ")();";
        document.documentElement.appendChild(script);
        script.parentNode.removeChild(script);
    };

    return self;
})();


/**
 * NOTE FOR ADDON REVIEWER:
 * This class is meant to simplify communication between extension context and page context.
 * Basically, we have wrapped postMessage API in this class.
 */
class Messenger {
    static postMessage(msgID, info) {
        window.postMessage({
            type: `es_${msgID}`,
            information: info
        }, window.location.origin);
    }

    // Used for one-time events
    static onMessage(msgID) {
        return new Promise(resolve => {
            let callback = function(e) {
                if (e.source !== window) { return; }
                if (!e.data || !e.data.type) { return; }
                if (e.data.type === `es_${msgID}`) {
                    resolve(e.data.information);
                    window.removeEventListener("message", callback);
                }
            };
            window.addEventListener("message", callback);
        });
    }
}

// Inject the Messenger class into the DOM, providing the same interface for the page context side
(function() {
    let script = document.createElement("script");
    script.textContent = Messenger.toString();
    document.documentElement.appendChild(script);
})();


let WatchPage = (function(){

    let self = {};

    let _currentGameName = null;

    self._getGameName = async function() {
        let titleNode = document.querySelector("#meta-contents #title");
        if (!titleNode) { return false; }
        return titleNode.innerText;
    };

    self._createItadBox = function(url, title, subtitle, callToAction) {
        return `<a href='${url}' class='itad-box'>
                <div class='itad-box__thumb'>
                    <img class='itad-box__img' src="${ExtensionResources.getURL("/img/logo.svg")}">
                </div>
                <div>
                    <div class='itad-box__title'>${title}</div>
                    <div class='itad-box__subtitle'>${subtitle}</div>
                    <div class='itad-box__cta'>${callToAction}
                        <!-- YT image -->
                        <svg class='itad-box__icon' viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" focusable="false">
                            <g><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"></path></g>
                        </svg>
                    </div>
                </div>
            </a>`
    };

    self._getContentsNode = function() {
        return document.querySelector("#meta-contents #contents");
    };

    self._addPricingToPage = function(html) {

        let contentsNode = self._getContentsNode();
        if (!contentsNode) {
            let observer = new MutationObserver(() => {
                let contentsNode = self._getContentsNode();
                if (!contentsNode) { return; }

                HTML.afterEnd(contentsNode, html);
                observer.disconnect();
            });

            observer.observe(document.body, {childList: true, subtree: true});
        } else {
            HTML.afterEnd(contentsNode, html);
        }
    };

    self._loadPriceInfo = async function() {
        let gameName = await self._getGameName();
        if (!gameName) {
            console.log("Did not find game name on this page");
            return;
        }

        if (gameName === _currentGameName) { return; }
        _currentGameName = gameName;

        let prices = await Background.action("prices", {title: gameName});
        if (!prices) {
            console.error("Couldn't load prices for " + gameName);
            return;
        }

        let price = prices.price;
        let priceBox = "";

        if (price) {
            priceBox = self._createItadBox(
                price.url,
                price.price_formatted,
                `-${price.cut}% at ${price.store}`,
                "Buy now"
            );
        }

        let itadBox = self._createItadBox(
            prices.urls.info,
            "IsThereAnyDeal",
            "",
            "See more"
        );

        let currentContainer = document.querySelector(".itad-container");
        if (currentContainer) {
            currentContainer.parentNode.removeChild(currentContainer);
        }
        self._addPricingToPage(`<div class="itad-container">${priceBox}${itadBox}</div>`);
    };

    self._pageListener = function(metaContentsNode) {
        (new MutationObserver(self._loadPriceInfo))
            .observe(metaContentsNode, {childList: true, subtree: true});
    };


    self.init = async function() {

        console.log.apply(console, [
            "%c Augmented %cYouTube v" + Info.version + " %c by https://isthereanydeal.com/",
            "background: #000000;color:#ff0000",
            "background: #000000;color: #ffffff",
            "",
        ]);

        let metaContents = document.querySelector("#meta-contents");
        if (!metaContents) {
            let metaObserver = new MutationObserver(() => {
                let metaContents = document.querySelector("#meta-contents");
                if (!metaContents) { return; }
                self._pageListener(metaContents);
                metaObserver.disconnect()
            });
            metaObserver.observe(document.body, { childList: true, subtree: true });
        } else {
            self._pageListener(metaContents);
        }
    };

    return self;
})();



WatchPage.init();
