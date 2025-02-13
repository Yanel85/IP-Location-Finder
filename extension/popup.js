document.addEventListener("DOMContentLoaded", () => {
    const apiUrlSelect = document.getElementById("apiUrl");
    const statusDiv = document.getElementById("status");
    const optionsTitle = document.getElementById("optionsTitle");
    const optionsHeading = document.getElementById("optionsHeading");
    const optionsApiLabel = document.getElementById("optionsApiLabel");
    const customApiInput = document.getElementById("customApiUrl");

    function updateLocaleText() {
        optionsTitle.textContent = chrome.i18n.getMessage("optionsTitle");
        optionsHeading.textContent = chrome.i18n.getMessage("optionsHeading");
        optionsApiLabel.textContent = chrome.i18n.getMessage("optionsApiLabel");
    }
    updateLocaleText();

    chrome.storage.sync.get({ apiUrl: "https://ipapi.co/{ip}/json" }, (items) => {
        apiUrlSelect.value = items.apiUrl;
        //if items.apiUrl is not in the select list, set it to custom
        if (!Array.from(apiUrlSelect.options).map(option => option.value).includes
            (items.apiUrl)) {
            apiUrlSelect.value = "custom";
            statusDiv.textContent = items.apiUrl;
        }
    });

    apiUrlSelect.addEventListener("change", () => {
        const apiUrl = apiUrlSelect.value;
        if (apiUrl === 'custom') {
            customApiInput.style.display = 'block';
            customApiInput.addEventListener('input', () => {
                chrome.storage.sync.set({ apiUrl: customApiInput.value }, () => {
                    statusDiv.textContent = chrome.i18n.getMessage("optionsSaved");
                    setTimeout(() => {
                        statusDiv.textContent = "";
                    }, 1000);
                });
            });
        } else {
            customApiInput.style.display = 'none';
            chrome.storage.sync.set({ apiUrl: apiUrl }, () => {
                statusDiv.textContent = chrome.i18n.getMessage("optionsSaved");
                setTimeout(() => {
                    statusDiv.textContent = "";
                }, 1000);
            });
        }
    });
});