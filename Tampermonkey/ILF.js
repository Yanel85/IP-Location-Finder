// ==UserScript==
// @name         IP Location Finder
// @namespace    https://github.com/Yanel85/IP-Location-Finder/
// @version      1.5
// @description  Finds the geographical location of IP addresses on a page.
// @author       Perry Yen
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      ipapi.co
// @connect      ipinfo.io
// @connect      ip-api.com
// @icon         https://raw.githubusercontent.com/Yanel85/IP-Location-Finder/refs/heads/main/extension/icon.svg
// @license      GPL3
// ==/UserScript==

(function () {
    'use strict';

    let currentSelectedText;
    let tooltip;
    let locationSpanElementMap = new Map();

    // API URLs
    const apiUrls = {
        "ipapi.co": "https://ipapi.co/{ip}/json",
        "ipinfo.io": "https://ipinfo.io/{ip}/json",
        "ip-api.com": "https://ip-api.com/json/{ip}",
        "custom": "custom"
    };

    let currentApiUrl = GM_getValue("apiUrl", "https://ip-api.com/json/{ip}");

    const cache = {};

    // Event listener for mouseup
    document.addEventListener('mouseup', handleMouseUp);

    // Handle mouseup event
    function handleMouseUp() {
        removeTooltip();
        const selectedText = window.getSelection().toString().trim();

        if (selectedText && isValidIP(selectedText)) {
            currentSelectedText = selectedText;
            queryIpLocation(currentSelectedText);
        }
    }


    // Send IP location query with automatic API failover
    async function queryIpLocation(ip) {
        // 检查缓存
        if (cache[ip]) {
            const { countryCode, city } = cache[ip];
            insertLocation(countryCode, city);
            return;
        }

        // API 级联顺序（非 custom 时按此顺序尝试）
        const apiChain = ["ip-api.com", "ipapi.co", "ipinfo.io"];

        const tryApis = async () => {
            // 确定要尝试的 API 列表
            let apisToTry;
            if (currentApiUrl === apiUrls["custom"]) {
                apisToTry = ["custom"];
            } else {
                // 找到当前 API 在级联链中的位置，从它开始往后试
                const currentKey = Object.keys(apiUrls).find(k => apiUrls[k] === currentApiUrl);
                if (currentKey && apiChain.includes(currentKey)) {
                    const idx = apiChain.indexOf(currentKey);
                    apisToTry = [...apiChain.slice(idx), ...apiChain.slice(0, idx)];
                } else {
                    apisToTry = [...apiChain];
                }
            }

            let lastError;
            for (const apiKey of apisToTry) {
                const apiUrl = apiKey === "custom"
                    ? currentApiUrl.replace("{ip}", ip)
                    : apiUrls[apiKey].replace("{ip}", ip);

                try {
                    const response = await GM_xmlhttpRequestPromise(apiUrl);
                    if (response.status === 200) {
                        let data = JSON.parse(response.responseText);
                        let result;
                        if (apiKey === "ip-api.com") {
                            result = { countryCode: data.countryCode, city: data.city };
                        } else {
                            result = { countryCode: data.country, city: data.city };
                        }
                        cache[ip] = { countryCode: result.countryCode, city: result.city };
                        insertLocation(result.countryCode, result.city);
                        return; // 成功，退出
                    }
                    lastError = new Error(`HTTP ${response.status} (${apiKey})`);
                } catch (error) {
                    lastError = error;
                }
            }
            throw lastError || new Error("All APIs failed");
        };

        try {
            await tryApis();
        } catch (error) {
            showTooltip(`error: ${error.message}`, true);
        }
    }

    // Display tooltip message
    function showTooltip(text, isError = false) {
        removeTooltip();
        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();


        tooltip = document.createElement("div");
        tooltip.style.position = "absolute";
        tooltip.style.background = isError ? "red" : "lightgreen";
        tooltip.style.color = "black";
        tooltip.style.padding = "3px";
        tooltip.style.border = "1px solid #ccc";
        tooltip.style.borderRadius = "4px";
        tooltip.style.fontSize = "0.6em";
        tooltip.style.zIndex = "9999"; // Ensure tooltip is above all elements
        tooltip.textContent = text;
        tooltip.style.top = rect.bottom + window.scrollY + "px";
        tooltip.style.left = rect.left + window.scrollX + "px";


        document.body.appendChild(tooltip);

        setTimeout(() => {
            removeTooltip();
        }, 3000);
    }

    // Remove tooltip
    function removeTooltip() {
        if (tooltip) {
            tooltip.remove();
            tooltip = null;
        }
    }

    // Insert IP location into the page
    function insertLocation(countryCode, city) {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        const selectedTextNode = range.startContainer;

        if (selectedTextNode.nodeType !== Node.TEXT_NODE) return;
        const selectedText = selectedTextNode.textContent;
        const ipIndex = selectedText.indexOf(currentSelectedText);

        if (ipIndex === -1) return;
        removeLocationSpan(currentSelectedText);

        locationSpanElementMap.set(currentSelectedText, document.createElement('span'));
        let locationSpan = locationSpanElementMap.get(currentSelectedText);
        locationSpan.style.color = 'red';
        locationSpan.style.fontWeight = 'bold';
        locationSpan.style.fontSize = '0.6em';

        let locationText = "";
        if (countryCode) {
            const flagIconUrl = `https://flagcdn.com/24x18/${countryCode.toLowerCase()}.png`;
            const flagImage = `<img src="${flagIconUrl}" style="display:inline-block;vertical-align:middle;margin-right:2px; width:18px; height:13px;">`;
            locationText = `(${flagImage}${countryCode}`;
            if (city && city.trim()) {
                locationText = `${locationText},${city})`;
            } else {
                locationText = `${locationText})`;
            }
        }
        locationSpan.innerHTML = locationText;

        const beforeIpTextNode = document.createTextNode(selectedText.substring(0, ipIndex + currentSelectedText.length));
        const afterIpTextNode = document.createTextNode(selectedText.substring(ipIndex + currentSelectedText.length));

        selectedTextNode.textContent = '';

        selectedTextNode.parentNode.insertBefore(beforeIpTextNode, selectedTextNode);
        selectedTextNode.parentNode.insertBefore(locationSpan, selectedTextNode);
        selectedTextNode.parentNode.insertBefore(afterIpTextNode, selectedTextNode);

        window.getSelection().empty();
    }

    function removeLocationSpan(ipText) {
        if (locationSpanElementMap.has(ipText)) {
            let locationSpan = locationSpanElementMap.get(ipText)
            locationSpan.remove();
            locationSpanElementMap.delete(ipText);
        }
    }

    // IP address validation
    function isValidIP(ip) {
        const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
        const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;
        const ipv4CidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/([0-9]|[1-2][0-9]|3[0-2])$/;

        if (ipv4CidrRegex.test(ip)) {
            ip = ip.split('/')[0]; // 去除CIDR部分
        }
        return ipv4Regex.test(ip) || ipv6Regex.test(ip);
    }


    // Helper function for GM_xmlhttpRequest
    function GM_xmlhttpRequestPromise(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                url: url,
                method: "GET",
                onload: (response) => {
                    resolve(response);
                },
                onerror: (error) => {
                    reject(error);
                }
            });
        });
    }

    function createSettingsUI() {
        const settingsDiv = document.createElement('div')
        settingsDiv.style.position = "fixed"
        settingsDiv.style.bottom = "10px"
        settingsDiv.style.right = "80px"
        settingsDiv.style.padding = "10px"
        settingsDiv.style.background = "white"
        settingsDiv.style.border = "1px solid black"
        settingsDiv.style.zIndex = "9999999"
        settingsDiv.style.display = "flex"
        settingsDiv.style.flexDirection = "column"
        settingsDiv.style.width = "200px"
        settingsDiv.style.fontSize = "12px"

        const apiUrlLabel = document.createElement('label')
        apiUrlLabel.textContent = "IP Location Finder API option:"
        const apiUrlSelect = document.createElement('select');
        Object.keys(apiUrls).forEach(key => {
            const option = document.createElement("option");
            option.value = apiUrls[key]
            option.text = key
            apiUrlSelect.add(option)
        })
        apiUrlSelect.value = currentApiUrl;
        settingsDiv.append(apiUrlLabel, apiUrlSelect)

        const customApiInput = document.createElement('input');
        customApiInput.type = "text"
        customApiInput.placeholder = "Replace the API's IP with {ip}."
        customApiInput.style.display = (currentApiUrl === "custom" ? "block" : "none");

        settingsDiv.append(customApiInput);

        const saveButton = document.createElement("button")
        saveButton.textContent = "Save"
        settingsDiv.append(saveButton)

        saveButton.addEventListener("click", () => {
            const selectedValue = apiUrlSelect.value
            if (selectedValue === 'custom') {
                currentApiUrl = customApiInput.value;
            } else {
                currentApiUrl = selectedValue;
            }
            GM_setValue("apiUrl", currentApiUrl);
            customApiInput.style.display = (currentApiUrl === apiUrls["custom"] ? "block" : "none");
            statusDiv.textContent = "Settings Saved"
            setTimeout(() => {
                statusDiv.textContent = "";
            }, 1000);
        })

        const statusDiv = document.createElement("div")
        settingsDiv.append(statusDiv)


        apiUrlSelect.addEventListener("change", (event) => {
            const selectedValue = event.target.value;
            customApiInput.style.display = (selectedValue === apiUrls["custom"] ? "block" : "none");
        })

        document.body.appendChild(settingsDiv)

    }

    createSettingsUI();
})();