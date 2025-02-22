![02.jpg](./img/02.jpg)

# IP Location Finder

| ![00](./img/00.png) | A Chrome extension that identifies the geographic location of IP addresses on a webpage. |
|----------------------------------|-----------------------------|


## Features

![2](./img/1.png)
*   **Automatic IP Detection:** Automatically detects IP addresses (IPv4 and IPv6) when you select text on a webpage.
*   **Geographic Location:** Displays the country and city (when available) associated with the selected IP address.
*   **Flag Icon & Country Code:** Displays a flag icon and country code alongside the location information.
*   **Flexible API:** Uses an external API for IP geolocation lookup, with customizable API options in the extension's settings.
*   **Clean Display:** Displays the location in the format: `(FlagIcon CountryCode, City)`. If city is unavailable, only shows `(FlagIcon CountryCode)`.

## Installation

* Offline install :

1.  Download [Releases](https://github.com/Yanel85/IP-Location-Finder/releases).
2.  Open Chrome browser and navigate to `chrome://extensions/`.
3.  Enable "Developer mode" in the top right corner.
4.  Click "Load unpacked" and select the extension directory.
5.  The extension will now be installed.

* [Chrome Web Store ](https://chromewebstore.google.com/detail/ip-%E5%9C%B0%E5%9D%80%E5%AE%9A%E4%BD%8D%E5%99%A8/eohliaamdakpjlipdfdkpgjnpbdbipel)

* [Microsoft Edge](https://microsoftedge.microsoft.com/addons/detail/ofoepnlfldpckgnekinaplppcknbdcdm)

* [Tampermonkey](https://greasyfork.org/zh-CN/scripts/522749-ip-location-finder)

## Usage

1.  Navigate to any webpage.
2.  Select text that contains an IP address (IPv4 or IPv6).
3.  The IP location information will be displayed next to the selected text, with a flag icon and the country code and city(if available) in the format `(FlagIcon CountryCode, City)` or  `(FlagIcon CountryCode)` if city is unavailable.
4.  Click the extension icon to access settings and change the API source.

## Settings

You can customize the extension in the popup window:

*   **Select API:** Choose from a list of predefined API URLs for the IP location lookup. Custom supports.
    *   `ipapi.co`
    *   `ipinfo.io`
    *   `GeoIpify`
    *   `custom`

## Third-Party Libraries
* flag-icons: for flag images.

## Contributing

Feel free to fork the repository and submit pull requests with improvements or bug fixes.

## License

This code is licensed under the GNU General Public License v3.0. The license text can be found in the LICENSE file.
