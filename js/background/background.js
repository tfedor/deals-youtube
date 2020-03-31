
class Api {

    static async getEndpoint(endpoint, query) {
        let url = new URL(endpoint);
        for (let [k, v] of Object.entries(query)) {
            url.searchParams.append(k, v);
        }
        let response = await fetch(url, { "method": "GET" });
        return await response.json();
    }
}


let actionCallbacks = new Map([
    ['prices', async (params) => {

        let response = await Api.getEndpoint(Config.ApiServerHost + "/v02/game/plain/", {
            key: Config.ApiKey,
            title: params.title
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

    Promise.resolve(callback(message.params))
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
