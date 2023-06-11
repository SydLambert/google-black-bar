// ==UserScript==
// @name     Google Black Bar
// @version  1
// @grant    none
// @include https://google.com/
// @include https://google.com/search/*
// @include https://www.google.com/*
// @include https://www.google.com/search/*
// @include https://www.google.com/search
// @include https://images.google.com/*
// ==/UserScript==

class UrlTransformer {
    constructor (name, displayName, transform) {
        this.name = name;
        this.displayName = displayName;
        this.transform = transform;
    }
}

const GOOGLE_SERVICES = [
    "web",
    "images",
    "maps",
    "play",
    "youtube",
    "news",
    "shopping",
];

const TRANSFORMERS = {
    web: new UrlTransformer("web", "Web", (query, location) => {
        return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    }),
    images: new UrlTransformer("images", "Images", (query, location) => {
        return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`;
    }),
    maps: new UrlTransformer("maps", "Maps", (query, location) => {
        return `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
    }),
    play: new UrlTransformer("play", "Play", (query, location) => {
        return `https://play.google.com/store/search?q=${encodeURIComponent(query)}`;
    }),
    youtube: new UrlTransformer("youtube", "YouTube", (query, location) => {
        return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    }),
    news: new UrlTransformer("news", "News", (query, location) => {
        return `https://www.google.com/search?tbm=nws&q=${encodeURIComponent(query)}`;
    }),
    shopping: new UrlTransformer("shopping", "Shopping", (query, location) => {
        return `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(query)}`;
    }),
};
const TRANSFORMERS_ORDER = [
    "web",
    "images",
    "maps",
    "play",
    "youtube",
    "news",
    "shopping",
];


function determineCurrentPageService() {
    let searchParams = new URLSearchParams(location.search);

    switch (searchParams.get("tbm")) {
        case "isch": return "images";
        case "nws": return "news";
        case "shop": return "shopping";
    }

    if (/^(www\.)?youtube\.com$/.test(location.host)) {
        return "youtube";
    }

    if (location.host == "images.google.com") {
        return "images";
    }

    if (location.host == "play.google.com") {
        return "play";
    }

    if (/^(www\.)?google\.com$/.test(location.host)) {
        if (location.pathname.startsWith("/search")) {
            return "web";
        }
        if (location.pathname.startsWith("/maps")) {
            return "maps";
        }
    }

    return null;
}


function extractQueryFromCurrentPage() {
    let currentService = determineCurrentPageService();

    if (currentService === null) {
        throw "Cannot determine current service, therefore cannot extract query";
    }

    let searchParams = new URLSearchParams(location.search);

    switch (currentService) {
        case "web":
        case "images":
        case "play":
        case "news":
        case "shopping":
            return searchParams.get("q");
        case "maps":
            // May cause index out of bounds error if regex doesn't match
            return decodeURIComponent(location.pathname.match(/\/maps\/search\/(.+?)\//)[1]).replace(/\+/g, " ");
        case "youtube":
            return searchParams.get("search_query");
    }
}

function createButton(transformer) {
    let currentQuery = extractQueryFromCurrentPage();

    let buttonElement = document.createElement("a");
    buttonElement.href = transformer.transform(currentQuery, location);
    buttonElement.target = "_self";
    buttonElement.classList.add("google-black-bar-button");
    buttonElement.appendChild(document.createTextNode(transformer.displayName));

    return buttonElement;
}

function addButtonsToBar(barElement) {
    let currentService = determineCurrentPageService();

    for (let transformer of TRANSFORMERS_ORDER.map(e=>TRANSFORMERS[e])) {
        let buttonElement = createButton(transformer);

        if (transformer.name == currentService) {
            buttonElement.classList.add("active");
        }

        barElement.appendChild(buttonElement);
    }
}

function createBar() {
    let barElement = document.createElement("div");
    barElement.classList.add("google-black-bar");
    addButtonsToBar(barElement);
    return barElement;
}

function createStyle() {
    let style = document.createElement("style");
    style.innerHTML = `
        .google-black-bar {
            width: 100%;
            height: 37px;
            position: absolute;
            top: 0;
            left: 0;
            z-index: 9999;
            box-sizing: border-box;
            background-color: #2d2d2d;
            /* border-top: 1px solid #5d5e61; */
            border-bottom: 1px solid #060606;
        }

        a.google-black-bar-button {
            display: inline-block;
            height: 53px;
            box-sizing: border-box;
            padding: 8px 15px;
            color: #9b9e9c;
            text-decoration: none;
        }

        .google-black-bar-button.active {
            border-top: 1px solid #dd4b39;
            color: #ffffff;
            font-weight: bold;
        }
    `;

    // Add service-specific styles to make the bar fit in
    let currentService = determineCurrentPageService();
    switch (currentService) {
        case "web":
        case "news":
        case "shopping":
            style.innerHTML += `
                /* Page body */
                #gsr {
                    margin-top: 37px;
                }

                /* Search bar form */
                #searchform:not(.minidiv) {
                    margin-top: 37px;
                }
            `;
            break;
        case "images":
            style.innerHTML += `
                /* Search bar form */
                #kO001e:not(.DU1Mzb) {
                    margin-top: 37px;
                }

                .T1diZc.KWE8qe {
                    margin-top: 37px;
                }
            `;
            break;
    }

    return style;
}


function nukeStockButtons() {
    let currentService = determineCurrentPageService();
    switch (currentService) {
        case "web":
        case "news":
        case "shopping":
            let elements = [];

            // Web, images, ...
            elements.push(...document.querySelectorAll(".zItAnd"));
            // TODO remove suggested searches

            for (let element of elements) {
                element.parentNode.removeChild(element);
            }
            break;
        case "images":
            document.querySelectorAll(".NZmxZe").forEach(e=>e.parentNode.removeChild(e));
            break;
    }
}

function addBarToPage() {
    // try {
        let bar = createBar();
        let style = createStyle();

        document.head.appendChild(style);
        document.body.appendChild(bar);
    // } catch (e) {
    //     console.error(e);
    // }
}


console.log("Script loaded");
let currentService = determineCurrentPageService();
console.log(`Service: ${currentService}`);
if ([
    "web",
    "images",
    "news",
    "shopping",
].includes(currentService)) {
    console.log(`Applicable service`);
    addBarToPage();
    nukeStockButtons();
    console.log("Applied bar");
}
