let ipIcon;
let currentSelectedText;
let tooltip;
let locationSpanElementMap = new Map();

// Get SVG icon URL
const ipIconUrl = chrome.runtime.getURL("icon.svg");

// Event listener for mouseup
document.addEventListener('mouseup', handleMouseUp);

// Handle mouseup event
function handleMouseUp() {
    removeTooltip();
    removeIcon(currentSelectedText);
    const selectedText = window.getSelection().toString().trim();

    if (selectedText && isValidIP(selectedText)) {
        currentSelectedText = selectedText;
        showIcon();
        queryIpLocation(currentSelectedText);
    }
}

// Display IP lookup icon
function showIcon() {
    removeIcon(currentSelectedText);
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const endRect = range.getClientRects()[range.getClientRects().length - 1];

    ipIcon = document.createElement("img");
    ipIcon.src = ipIconUrl;
    ipIcon.style.position = "absolute";
    ipIcon.style.top = endRect.top + window.scrollY - 22 + "px";
    ipIcon.style.left = endRect.right + window.scrollX + 2 + "px";
    ipIcon.style.zIndex = 9999;
    ipIcon.classList.add('ip-location-icon');
    document.body.appendChild(ipIcon);
}

// Remove IP lookup icon
function removeIcon(ipText) {
    if (ipIcon && ipText === currentSelectedText) {
        ipIcon.remove();
        ipIcon = null;
    }
}

// Send IP location query
async function queryIpLocation(ip) {
    console.log("content.js: queryIpLocation called, ip:", ip);
    try {
        const response = await chrome.runtime.sendMessage({
            type: 'queryIp',
            ip
        });
        console.log("content.js: queryIpLocation response", response);
    } catch (error) {
        console.error("content.js: Error sending message:", error);
    }
}

// Handle messages from background script
chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "ipLocation") {
        insertLocation(message.country, message.city);
    } else if (message.type === "error") {
        showTooltip(message.message, true);
    } else if (message.type === "info") {
        showTooltip(message.message, false);
    }
});

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
    tooltip.style.fontSize = "0.6em";
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
        const flagIconUrl = chrome.runtime.getURL(`./flag254/${countryCode.toLowerCase()}.png`);
        const flagImage = `<img src="${flagIconUrl}" style="display:inline-block;vertical-align:middle;margin-right:2px; width:18px; height:13px;">`;
        locationText = `(${flagImage}${countryCode}`;
        if (city && city.trim()) {
            locationText = `${locationText},${city})`;
        } else {
            locationText = `${locationText})`;
        }
    }
    locationSpan.innerHTML = locationText;

    const fragment = document.createDocumentFragment();
    const beforeIpTextNode = document.createTextNode(selectedText.substring(0, ipIndex + currentSelectedText.length));
    const afterIpTextNode = document.createTextNode(selectedText.substring(ipIndex + currentSelectedText.length));

    fragment.appendChild(beforeIpTextNode);
    fragment.appendChild(locationSpan);
    fragment.appendChild(afterIpTextNode);

    selectedTextNode.textContent = '';
    selectedTextNode.parentNode.insertBefore(fragment, selectedTextNode);
    selectedTextNode.remove();
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
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}