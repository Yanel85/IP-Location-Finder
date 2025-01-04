// ==UserScript==
// @name         IP Location Finder
// @namespace    https://github.com/Yanel85/IP-Location-Finder/
// @version      1.2
// @description  Finds the geographical location of IP addresses on a page.
// @author       Perry Yen
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      ipapi.co
// @connect      ipinfo.io
// @connect      www.cloudflare.com
// @connect      geo.ipify.org
// @connect      api.bigdatacloud.net
// @icon         https://flagcdn.com/24x18/cn.png
// @license      GPL3
// ==/UserScript==

(function () {
    'use strict';

    let currentSelectedText;
    let tooltip;
    let locationSpanElementMap = new Map();

    const ipIconUrl = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cGF0aCBkPSJNMTEuOTk5NyAxLjk5OTk2QzguMTMzOSAxLjk5OTk2IDQuOTk5NzQgNS4xMzQwMiA0Ljk5OTc0IDguOTk5OTZDMjkuMTkzNSA4Ljk5OTk2IDExLjk5OTcgMTYuMDAwMyAxMS45OTk3IDE2LjAwMDNDMTEuOTk5NyAxNi4wMDAzIDE0Ljg2NTQgOC45OTk5NiAyMC45OTk3IDguOTk5OTZDMTkuMTkzNSA4Ljk5OTk2IDE1Ljk5OTcgNS4xMzQwMiAxMS45OTk3IDEuOTk5OTZaIiBmaWxsPSIjMTA5NkRiIi8+CiAgPHBhdGggZD0iTTEyIDExLjk5OTlDMTMuNjU2OSAxMS45OTk5IDE1IDEwLjY1NjggMTUgOC45OTk5M0MxNSA3LjM0MzA5IDEzLjY1NjkgNi4wMDAwNyAxMiA2LjAwMDA3QzEwLjM0MzEgNi4wMDAwNyA5IDcuMzQzMDkgOSA4Ljk5OTkzQzkgMTAuNjU2OCA4LjM0MzE0IDExLjk5OTkgMTIgMTEuOTk5OVoiIGZpbGw9IiMxMDk2RGIiLz4KICA8cGF0aCBkPSJNMTEuOTk5NyAxNy45OTk2QzkuMzI3NjcgMTcuOTk5NiAzLjMzOTYyIDE5LjMzMTcgMy4zMzk2MiAyMi45OTk2VjIzLjOTk2SDIxLjY1OTVWMjIuOTk5NkMzMS42NTk1IDIwLjMzMTcgMTYuNjkxNCAxNy45OTk2IDExLjk5OTcgMTcuOTk5NloiIGZpbGw9IiMxMDk2RGIiLz4KPC9zdmc+";

    // API URLs
    const apiUrls = {
        "ipapi.co": "https://ipapi.co/{ip}/json",
        "ipinfo.io": "https://ipinfo.io/{ip}/json",
        "cloudflare": "https://www.cloudflare.com/cdn-cgi/trace",
        "bigDataCloud": "https://api.bigdatacloud.net/data/ip-geolocation?ip={ip}",
        "custom": "custom" // 添加自定义选项
    };

    let currentApiUrl = GM_getValue("apiUrl", "https://ipinfo.io/{ip}/json");

    // Event listener for mouseup
    document.addEventListener('mouseup', handleMouseUp);

    // Handle mouseup event
    function handleMouseUp() {
        removeTooltip();
        //removeIcon(currentSelectedText);
        const selectedText = window.getSelection().toString().trim();

        if (selectedText && isValidIP(selectedText)) {
            currentSelectedText = selectedText;
            //showIcon();
            queryIpLocation(currentSelectedText);
        }
    }

    // Display IP lookup icon


    // Send IP location query
    async function queryIpLocation(ip) {
        try {
            let apiUrl = currentApiUrl;
            if (currentApiUrl !== apiUrls["custom"]) {
                apiUrl = currentApiUrl.replace("{ip}", ip);
            }

            const response = await GM_xmlhttpRequestPromise(apiUrl);
            if (response.status !== 200) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            let data = response.responseText;
            if (currentApiUrl === apiUrls["cloudflare"]) {
                const countryLine = data.split('\n').find(line => line.startsWith('loc='));
                if (countryLine) {
                    const countryCode = countryLine.split('=')[1];
                    insertLocation(countryCode, null);
                } else {
                    showTooltip("error", true);
                }
            } else {
                data = JSON.parse(data);
                let city = data.city;
                if (currentApiUrl === apiUrls["ipinfo.io"]) {
                    city = data.region;
                    if (!city || !city.trim()) {
                        city = data.city;
                    }
                }
                if (currentApiUrl === apiUrls["geoIpify"]) {
                    insertLocation(data.location.country, data.location.city);
                } else if (currentApiUrl === apiUrls["bigDataCloud"]) {
                    insertLocation(data.countryCode, data.city);
                } else {
                    insertLocation(data.country, city);
                }
            }


        } catch (error) {
            //console.error("content.js: Error sending message:", error);
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
        tooltip.style.padding = "5px";
        tooltip.style.border = "1px solid #ccc";
        tooltip.style.borderRadius = "4px";
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
        const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
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
        settingsDiv.style.top = "10px"
        settingsDiv.style.right = "10px"
        settingsDiv.style.padding = "10px"
        settingsDiv.style.background = "white"
        settingsDiv.style.border = "1px solid black"
        settingsDiv.style.zIndex = "9999999"

        const apiUrlLabel = document.createElement('label')
        apiUrlLabel.textContent = "API:"
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
        customApiInput.placeholder = "Enter custom API URL"
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
            customApiInput.style.display = (currentApiUrl === "custom" ? "block" : "none");
            statusDiv.textContent = "Settings Saved"
            setTimeout(() => {
                statusDiv.textContent = "";
            }, 1000);
        })

        const statusDiv = document.createElement("div")
        settingsDiv.append(statusDiv)


        apiUrlSelect.addEventListener("change", (event) => {
            const selectedValue = event.target.value;
            customApiInput.style.display = (selectedValue === "custom" ? "block" : "none");
        })

        document.body.appendChild(settingsDiv)

    }

    createSettingsUI();
})();