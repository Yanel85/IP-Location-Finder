document.addEventListener("DOMContentLoaded", () => {
    const apiUrlSelect = document.getElementById("apiUrl");
    const statusDiv = document.getElementById("status");
    const optionsTitle = document.getElementById("optionsTitle");
    const optionsHeading = document.getElementById("optionsHeading");
    const optionsApiLabel = document.getElementById("optionsApiLabel");

    function updateLocaleText() {
        optionsTitle.textContent = chrome.i18n.getMessage("optionsTitle");
        optionsHeading.textContent = chrome.i18n.getMessage("optionsHeading");
        optionsApiLabel.textContent = chrome.i18n.getMessage("optionsApiLabel");
    }

    updateLocaleText();


    chrome.storage.sync.get({ apiUrl: "https://ipapi.co/{ip}/json" }, (items) => {
        apiUrlSelect.value = items.apiUrl;
    });

    apiUrlSelect.addEventListener("change", () => {
        const apiUrl = apiUrlSelect.value;
        chrome.storage.sync.set({ apiUrl: apiUrl }, () => {
            statusDiv.textContent = chrome.i18n.getMessage("optionsSaved");
            setTimeout(() => {
                statusDiv.textContent = "";
            }, 1000);
        });
    });
});