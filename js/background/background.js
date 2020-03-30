
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


chrome.runtime.onMessage.addListener(async (message, sender) => {
    if (!sender || !sender.tab) { return; } // not from a tab, ignore
    if (!message || !message.action) { return; }

    let callback = actionCallbacks.get(message.action);

    if (!callback) {
        // requested action not recognized, reply with error immediately
        throw new Error(`Did not recognize "${message.action}" as an action.`);
    }

    let res;
    try {
        res = await callback(message.params);
    } catch(err) {
        console.error(`Failed to execute callback ${message.action}: ${err.name}: ${err.message}\n${err.stack}`);
        throw { "message": err.name };
    }
    return res;
});
