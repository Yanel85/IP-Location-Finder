document.addEventListener("DOMContentLoaded", () => {
    const apiUrlSelect = document.getElementById("apiUrl");
    const statusDiv = document.getElementById("status");

    chrome.storage.sync.get({ apiUrl: "https://ipapi.co/{ip}/country" }, (items) => {
        apiUrlSelect.value = items.apiUrl;
    });

    apiUrlSelect.addEventListener("change", () => {
        const apiUrl = apiUrlSelect.value;
        chrome.storage.sync.set({ apiUrl: apiUrl }, () => {
            statusDiv.textContent = "设置已保存";
            setTimeout(() => {
                statusDiv.textContent = "";
            }, 1000);
        });
    });
});