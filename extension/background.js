// Default IP lookup API
const defaultApiUrl = "https://ipapi.co/{ip}/json";
let currentApiUrl = defaultApiUrl;

// API URLs
const apiUrls = {
    "ipapi.co": "https://ipapi.co/{ip}/json",
    "ipinfo.io": "https://ipinfo.io/{ip}/json",
    "geoIpify": "https://geo.ipify.org/api/v2/country,city?apiKey=at_9kY03l6G3CExGRBVfAqHQLIvOSj2m&ipAddress={ip}", // 需要替换API Key
    "ip-api.com": "http://ip-api.com/json/{ip}",
    "custom": "custom" // 添加自定义选项
};

// 缓存对象
const cache = {};

// Load API URL from storage
chrome.storage.sync.get({ apiUrl: currentApiUrl }, (items) => {
    currentApiUrl = items.apiUrl;
});



// API URL update handler
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === "sync" && changes.apiUrl) {
        currentApiUrl = changes.apiUrl.newValue;
        // 清空缓存
        Object.keys(cache).forEach(key => delete cache[key]);

    }
});



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
//Send info message
function sendInfo(msg, tabId) {
    console.log("background.js: sendInfo called, msg:", msg, "tabId", tabId);
    chrome.tabs.sendMessage(tabId, {
        type: "info",
        msg: msg
    });
}

// Generic IP lookup function
async function queryIpLocation(ip, tabId) {
    console.log("background.js: queryIpLocation called, ip:", ip, "tabId", tabId);

    // 检查缓存
    if (cache[ip]) {
        console.log("background.js: IP found in cache:", ip);
        const { countryCode, city } = cache[ip];
        sendCountryInfo(countryCode, city, tabId);
        return;
    }

    try {
        let apiUrl = currentApiUrl.replace("{ip}", ip);

        if (currentApiUrl === apiUrls["geoIpify"]) {
            const response = await fetch(apiUrl);
            if (!response.ok) {
                console.error(`HTTP error! Status: ${response.status}`);
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const data = await response.json();
            cache[ip] = { countryCode: data.location.country, city: data.location.city }; // 缓存结果
            sendCountryInfo(data.location.country, data.location.city, tabId);
            sendInfo(data.isp, tabId);
        } else if (currentApiUrl === apiUrls["ip-api.com"]) {
            const lang = ['en', 'de', 'es', 'fr', 'ja', 'pt-BR', 'ru', 'zh-CN'];
            let brwlang = chrome.i18n.getUILanguage();
            if (!lang.includes(brwlang)) {
                brwlang = 'en';
            }
            const apiUrladdlang = apiUrl + "?lang=" + brwlang;
            const response = await fetch(apiUrladdlang);
            if (!response.ok) {
                console.error(`HTTP error! Status: ${response.status}`);
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const data = await response.json();
            cache[ip] = { countryCode: data.countryCode, city: data.city }; // 缓存结果
            sendCountryInfo(data.countryCode, data.city, tabId);
            sendInfo(data.isp, tabId);
        } else {
            const response = await fetch(apiUrl);
            if (!response.ok) {
                console.error(`HTTP error! Status: ${response.status}`);
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const data = await response.json();
            let countryCode = [data.countryCode, data.country, data.country_code].find(code => code && code.length === 2);
            let city = data.city;
            if (currentApiUrl === apiUrls["ipinfo.io"]) {
                city = data.region;
                if (!city || !city.trim()) {
                    city = data.city;
                }
            }
            cache[ip] = { countryCode: countryCode, city }; // 缓存结果
            sendCountryInfo(countryCode, city, tabId);
            sendInfo(data.org, tabId);
        }
    } catch (error) {
        console.error("Error fetching location:", error);
        sendError(`${chrome.i18n.getMessage("errorFetchLocation")}: ${error.message}`, tabId);
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

