document.addEventListener("DOMContentLoaded", () => {
    const apiUrlSelect = document.getElementById("apiUrl");
    const statusDiv = document.getElementById("status");
    const optionsTitle = document.getElementById("optionsTitle");
    const optionsHeading = document.getElementById("optionsHeading");
    const optionsApiLabel = document.getElementById("optionsApiLabel");
    const customApiInput = document.getElementById("customApiUrl");

    // Map option value (URL) → API name for failover chain
    const URL_TO_NAME = {
        "https://ipapi.co/{ip}/json": "ipapi.co",
        "https://ipinfo.io/{ip}/json": "ipinfo.io",
        "http://ip-api.com/json/{ip}": "ip-api.com"
    };

    function updateLocaleText() {
        optionsTitle.textContent = chrome.i18n.getMessage("optionsTitle");
        optionsHeading.textContent = chrome.i18n.getMessage("optionsHeading");
        optionsApiLabel.textContent = chrome.i18n.getMessage("optionsApiLabel");
    }
    updateLocaleText();

    chrome.storage.sync.get({ apiUrl: "https://ipapi.co/{ip}/json", startApi: "ipapi.co" }, (items) => {
        apiUrlSelect.value = items.apiUrl;
        if (!Array.from(apiUrlSelect.options).map(o => o.value).includes(items.apiUrl)) {
            apiUrlSelect.value = "custom";
            customApiInput.style.display = "block";
            customApiInput.value = items.apiUrl;
        }
    });

    customApiInput.addEventListener("input", () => {
        chrome.storage.sync.set({ apiUrl: customApiInput.value, startApi: "custom" }, () => {
            statusDiv.textContent = chrome.i18n.getMessage("optionsSaved");
            setTimeout(() => { statusDiv.textContent = ""; }, 1000);
        });
    });

    apiUrlSelect.addEventListener("change", () => {
        const val = apiUrlSelect.value;
        if (val === "custom") {
            customApiInput.style.display = "block";
        } else {
            customApiInput.style.display = "none";
            const startApi = URL_TO_NAME[val] || "ipapi.co";
            chrome.storage.sync.set({ apiUrl: val, startApi }, () => {
                statusDiv.textContent = chrome.i18n.getMessage("optionsSaved");
                setTimeout(() => { statusDiv.textContent = ""; }, 1000);
            });
        }
    });
});
