// API chain order (fixed failover sequence)
const API_NAMES = ["ipapi.co", "ipinfo.io", "ip-api.com"];
const apiUrls = {
    "ipapi.co": "https://ipapi.co/{ip}/json",
    "ipinfo.io": "https://ipinfo.io/{ip}/json",
    "ip-api.com": "http://ip-api.com/json/{ip}"
};

const FETCH_TIMEOUT = 5000;
const cache = {};

// Current user selection: { apiUrl: string, startApi: string|null }
// startApi = the API name user picked; failover starts from there
let currentApiUrl = apiUrls["ipapi.co"];
let currentStartApi = "ipapi.co";

// Load from storage
chrome.storage.sync.get({ apiUrl: currentApiUrl, startApi: "ipapi.co" }, (items) => {
    currentApiUrl = items.apiUrl;
    currentStartApi = items.startApi;
});

chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === "sync") {
        if (changes.apiUrl) {
            currentApiUrl = changes.apiUrl.newValue;
            Object.keys(cache).forEach(key => delete cache[key]);
        }
        if (changes.startApi) {
            currentStartApi = changes.startApi.newValue;
        }
    }
});

// Build failover chain starting from the user's selected API
function buildApiChain(startApiName) {
    const startIdx = API_NAMES.indexOf(startApiName);
    if (startIdx === -1) return [];
    return [...API_NAMES.slice(startIdx), ...API_NAMES.slice(0, startIdx)];
}

// Fetch with timeout using AbortController
async function fetchWithTimeout(url, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { signal: controller.signal });
        return response;
    } finally {
        clearTimeout(timer);
    }
}

// Parse response based on API type
function parseApiResponse(data, apiName) {
    if (apiName === "ip-api.com") {
        return {
            countryCode: data.countryCode,
            city: data.city,
            info: data.isp
        };
    }
    // ipapi.co / ipinfo.io / custom
    let countryCode = [data.countryCode, data.country, data.country_code].find(c => c && c.length === 2);
    let city = data.city;
    let info = data.org;
    if (apiName === "ipinfo.io") {
        city = data.region && data.region.trim() ? data.region : data.city;
    }
    return { countryCode, city, info };
}

// Try each API in the failover chain until one succeeds
async function queryIpWithFailover(ip, tabId) {
    const chain = buildApiChain(currentStartApi);
    if (chain.length === 0) {
        sendError(chrome.i18n.getMessage("errorFetchLocation") + ": no API configured", tabId);
        return;
    }

    let lastError;
    for (const apiName of chain) {
        const apiUrl = apiUrls[apiName];
        if (!apiUrl) continue;

        let url = apiUrl.replace("{ip}", ip);

        try {
            console.log(`background.js: trying ${apiName}, ip: ${ip}`);
            const response = await fetchWithTimeout(url, FETCH_TIMEOUT);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            const { countryCode, city, info } = parseApiResponse(data, apiName);

            cache[ip] = { countryCode, city };
            sendCountryInfo(countryCode, city, tabId);
            if (info) sendInfo(info, tabId);

            console.log(`background.js: ${apiName} succeeded for ${ip}`);
            return;
        } catch (err) {
            console.warn(`background.js: ${apiName} failed for ${ip}:`, err.message);
            lastError = err;
            // Continue to next API in chain
        }
    }

    // All APIs failed
    console.error(`background.js: all APIs failed for ${ip}:`, lastError?.message);
    sendError(`${chrome.i18n.getMessage("errorFetchLocation")}: ${lastError?.message || "unknown error"}`, tabId);
}

// Main entry: check cache first, then query
async function queryIpLocation(ip, tabId) {
    console.log("background.js: queryIpLocation called, ip:", ip, "tabId:", tabId);

    if (cache[ip]) {
        console.log("background.js: IP found in cache:", ip);
        const { countryCode, city } = cache[ip];
        sendCountryInfo(countryCode, city, tabId);
        return;
    }

    await queryIpWithFailover(ip, tabId);
}

// Messaging
function sendCountryInfo(countryCode, city, tabId) {
    chrome.tabs.sendMessage(tabId, { type: "ipLocation", country: countryCode, city: city });
}

function sendError(message, tabId) {
    chrome.tabs.sendMessage(tabId, { type: "error", message });
}

function sendInfo(msg, tabId) {
    chrome.tabs.sendMessage(tabId, { type: "info", msg: msg });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("background.js: onMessage received:", message, "sender:", sender);
    if (message.type === 'queryIp') {
        if (sender.tab && sender.tab.id) {
            queryIpLocation(message.ip, sender.tab.id);
        } else {
            console.error("background.js: sender.tab or sender.tab.id undefined");
        }
    }
});
