
class Api {
    // FF doesn't support static members
    // static origin; // this *must* be overridden
    // static params = {};
    // withResponse? use a boolean to include Response object in result?
    static _fetchWithDefaults(endpoint, query={}, params={}) {
        let url = new URL(endpoint, this.origin);
        params = Object.assign({}, this.params, params);
        if (params && params.method === 'POST' && !params.body) {
            let formData = new FormData();
            for (let [k, v] of Object.entries(query)) {
                formData.append(k, v);
            }
            params.body = formData;
        } else {
            for (let [k, v] of Object.entries(query)) {
                url.searchParams.append(k, v);
            }
        }
        return fetch(url, params);
    }
    static getEndpoint(endpoint, query) {
        if (!endpoint.endsWith('/'))
            endpoint += '/';
        return this._fetchWithDefaults(endpoint, query, { 'method': 'GET', }).then(response => response.json());
    }
}
Api.params = {};



let actionCallbacks = new Map([
    ['prices', async (data) => {

        let response = await Api.getEndpoint(Config.ApiServerHost + "/v02/game/plain/", {
            key: Config.ApiKey,
            title: data.params.title
        });

        if (!response.data || !response.data.plain) { return false; }
        let plain = response.data.plain;

        response = await Api.getEndpoint(Config.ApiServerHost + "/v01/game/overview/", {
            key: Config.ApiKey,
            plains: plain
        });

        if (!response.data || !response.data[plain]) { return false; }

        return response.data[plain];
    }]
]);



chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (!sender || !sender.tab) { return false; } // not from a tab, ignore
    if (!message || !message.action) { return false; }
  
    let callback = actionCallbacks.get(message.action);
    if (!callback) {
        // requested action not recognized, reply with error immediately
        sendResponse({ 'error': `Did not recognize '${message.action}' as an action.`, });
        return false;
    }

    Promise.resolve(callback(message))
        .then(response => sendResponse({ 'response': response, }))
        .catch(function(err) {
            console.error(err, message.action);
            let response = {
                'error': true,
                'message': "An unknown error occurred.",
                'action': message.action,
            };
            if (typeof err == 'string') {
                response.message = err;
            } else if (err instanceof Error) {
                // JSON.stringify(Error) == "{}"
                response.message = err.message;
                response.stack = err.stack;
            } else {
                response.message = err.toString();
                response.stack = (new Error()).stack;
            }
            sendResponse(response);
        });

    // keep channel open until callback resolves
    return true;
});
