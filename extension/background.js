// Default IP lookup API
const defaultApiUrl = "https://ipapi.co/{ip}/json";
let currentApiUrl = defaultApiUrl;

// API URLs
const apiUrls = {
    "ipapi.co": "https://ipapi.co/{ip}/json",
    "ipinfo.io": "https://ipinfo.io/{ip}/json",
    "cloudflare": "https://www.cloudflare.com/cdn-cgi/trace", // 需要解析响应
    "geoIpify": "https://geo.ipify.org/api/v2/country,city?apiKey=at_xxxxxxxxxxxxx&ipAddress={ip}", // 需要替换API Key
    "bigDataCloud": "https://api.bigdatacloud.net/data/ip-geolocation?ip={ip}",
    "custom": "custom" // 添加自定义选项
};


// Load API URL from storage
chrome.storage.sync.get({ apiUrl: currentApiUrl }, (items) => {
    currentApiUrl = items.apiUrl;
});

// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "ipLocationFinder",
        title: chrome.i18n.getMessage("contextMenuTitle"),
        contexts: ["selection"],
    });
});

// Context menu click handler
chrome.contextMenus.onClicked.addListener((info, tab) => {
    handleIpQuery(info.selectionText.trim(), tab.id);
});

// API URL update handler
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === "sync" && changes.apiUrl) {
        currentApiUrl = changes.apiUrl.newValue;
    }
});

// IP address validation
function isValidIP(ip) {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

// Send location information
function sendCountryInfo(countryCode, city, tabId) {
    chrome.tabs.sendMessage(tabId, {
        type: "ipLocation",
        country: countryCode,
        city: city
    });
}

// Send error message
function sendError(message, tabId) {
    chrome.tabs.sendMessage(tabId, { type: "error", message });
}


// Generic IP lookup function
async function queryIpLocation(ip, tabId) {
    console.log("background.js: queryIpLocation called, ip:", ip, "tabId", tabId);
    try {
        let apiUrl = currentApiUrl;
        if (currentApiUrl !== apiUrls["custom"]) {
            apiUrl = currentApiUrl.replace("{ip}", ip);
        }

        if (currentApiUrl === apiUrls["cloudflare"]) {
            const response = await fetch(apiUrl);
            if (!response.ok) {
                console.error(`HTTP error! Status: ${response.status}`);
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const text = await response.text();
            const countryLine = text.split('\n').find(line => line.startsWith('loc='));
            if (countryLine) {
                const countryCode = countryLine.split('=')[1];
                sendCountryInfo(countryCode, null, tabId);
            } else {
                sendError(chrome.i18n.getMessage("errorNoLocation"), tabId);
                return;
            }
        } else if (currentApiUrl === apiUrls["geoIpify"]) {
            const response = await fetch(apiUrl);
            if (!response.ok) {
                console.error(`HTTP error! Status: ${response.status}`);
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const data = await response.json();
            sendCountryInfo(data.location.country, data.location.city, tabId);
        } else if (currentApiUrl === apiUrls["bigDataCloud"]) {
            const response = await fetch(apiUrl);
            if (!response.ok) {
                console.error(`HTTP error! Status: ${response.status}`);
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const data = await response.json();
            sendCountryInfo(data.countryCode, data.city, tabId);
        } else {
            const response = await fetch(apiUrl);
            if (!response.ok) {
                console.error(`HTTP error! Status: ${response.status}`);
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const data = await response.json();
            let city = data.city;
            if (currentApiUrl === apiUrls["ipinfo.io"]) {
                city = data.region
                if (!city || !city.trim()) {
                    city = data.city
                }
            }
            sendCountryInfo(data.country, city, tabId);
        }
    } catch (error) {
        console.error("Error fetching location:", error);
        sendError(`${chrome.i18n.getMessage("errorFetchLocation")}: ${error.message}`, tabId);
    }
}

async function handleIpQuery(ip, tabId) {
    if (isValidIP(ip)) {
        await queryIpLocation(ip, tabId);
    } else {
        sendError(chrome.i18n.getMessage("errorInvalidIp"), tabId);
    }
}

// Message listener for content.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("background.js: onMessage received:", message, "sender:", sender);
    if (message.type === 'queryIp') {
        if (sender.tab && sender.tab.id) {
            console.log("background.js: queryIp message received, ip:", message.ip, "tabId:", sender.tab.id);
            queryIpLocation(message.ip, sender.tab.id);
        } else {
            console.error("background.js: sender.tab or sender.tab.id undefined")
        }
    }
});