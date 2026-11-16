
let collections = {
    main: [],
    forged: [],
    tag: []
};

let currentCollection = "main";
let ownedCards = {};

let wishlist = JSON.parse(
    localStorage.getItem("treegollFriendWishlist") || "[]"
);

const collectionFiles = {
    main: "cards.json",
    forged: "forged-cards.json",
    tag: "tag-cards.json"
};

const collectionTitles = {
    main: "Main Set",
    forged: "Forged",
    tag: "Trees and Gold"
};

const grid = document.getElementById("card-grid");

const cardTypes = [
    "Gold",
    "Freeze",
    "Glow",
    "Rainbow",
    "Infected",
    "Exotic",
    "Flame"
];


// ========================================
// RARITY ORDER
// ========================================

// Adjust this list to match your actual Treegoll rarities.
// Cards lower in this list are considered rarer.

const rarityOrder = [
    "common",
    "uncommon",
    "rare",
    "epic",
    "legendary",
    "celestial",
    "secret",
    "insane",
    "???",
    "rings",
    "prismatic insane"
];


// ========================================
// GET CARD INFORMATION
// ========================================

function getRarity(card, collection = currentCollection) {

    const folders = card.folder || [];

    if (collection === "tag") {

        const index = folders.findIndex(
            folder => folder.toLowerCase() === "trees and gold"
        );

        return index >= 0
            ? folders[index + 1] || "Unknown"
            : "Unknown";
    }

    return folders[0] || "Unknown";
}


function getCategory(card, collection = currentCollection) {

    const rarity = getRarity(card, collection).toLowerCase();

    const excludedFolders = [
        rarity,
        "trees and gold",
        "forged",
        "type"
    ];

    const category = (card.folder || []).find(folder =>
        !excludedFolders.includes(folder.toLowerCase())
    );

    return category || (
        collection === "forged" ? "Forged" : "Unknown"
    );
}


function getType(card) {

    return cardTypes.find(type =>
        card.name.toLowerCase().endsWith(type.toLowerCase())
    ) || "Unknown";
}


// ========================================
// LOAD COLLECTIONS
// ========================================

async function loadCards() {

    try {

        for (const [key, filename] of Object.entries(collectionFiles)) {

            const response = await fetch(filename);

            if (!response.ok) {
                throw new Error(`Could not load ${filename}`);
            }

            collections[key] = await response.json();
        }

        await refreshOwnedCards();

        displayCards();
        updateProgress();
        renderStatistics();

        setInterval(refreshOwnedCards, 5000);

        console.log("All Treegoll collections loaded!");

    } catch (error) {

        console.error("Loading error:", error);
    }
}


// ========================================
// AUTOMATIC OWNERSHIP
// ========================================

async function refreshOwnedCards() {

    try {

        const response = await fetch(
            "owned-cards.json?refresh=" + Date.now(),
            { cache: "no-store" }
        );

        if (!response.ok) {
            throw new Error("Could not load owned-cards.json");
        }

        const newOwnedCards = await response.json();

        if (
            JSON.stringify(newOwnedCards) !==
            JSON.stringify(ownedCards)
        ) {

            ownedCards = newOwnedCards;

            displayCards();
            updateProgress();

            // Refresh statistics whenever ownership changes
            renderStatistics();

            console.log("Treegoll collection synchronized!");
        }

    } catch (error) {

        console.error("Ownership sync error:", error);
    }
}


// ========================================
// WISHLIST
// ========================================

function toggleWishlist(card) {

    if (wishlist.includes(card.image)) {

        wishlist = wishlist.filter(
            image => image !== card.image
        );

    } else {

        wishlist.push(card.image);
    }

    localStorage.setItem(
        "treegollFriendWishlist",
        JSON.stringify(wishlist)
    );

    updateWishlistButton(card);
    displayCards();
}


function updateWishlistButton(card) {

    const button = document.getElementById("wishlist-button");

    if (!button) return;

    const isWishlisted = wishlist.includes(card.image);

    button.textContent = isWishlisted
        ? "⭐ Remove from Wishlist"
        : "☆ Add to Wishlist";
}


// WISHLIST BUTTON EVENT

document.getElementById("wishlist-button")
    .addEventListener("click", () => {

        const image = document.getElementById("modal-image");

        const card = Object.values(collections)
            .flat()
            .find(card => card.image === image.dataset.cardImage);

        if (card) {
            toggleWishlist(card);
        }
    });


// ========================================
// SIDEBAR WISHLIST
// ========================================

function updateSidebarWishlist() {

    const container = document.getElementById("sidebar-wishlist");

    const countElement = document.getElementById("wishlist-count");

    if (!container || !countElement) return;

    container.innerHTML = "";

    const items = [];

    Object.entries(collections).forEach(([collection, cards]) => {

        cards.forEach(card => {

            if (wishlist.includes(card.image)) {
                items.push({ card, collection });
            }

        });
    });


    // SORT BY CARD NUMBER

    items.sort((a, b) =>
        (a.card.number ?? Infinity) - (b.card.number ?? Infinity)
    );

    countElement.textContent = items.length;


    // EMPTY WISHLIST

    if (items.length === 0) {

        container.innerHTML =
            '<p class="wishlist-empty">Nothing wishlisted yet.</p>';

        return;
    }


    // CREATE WISHLIST ITEMS

    items.forEach(({ card, collection }) => {

        const button = document.createElement("button");

        button.className = "wishlist-sidebar-item";

        const isOwned = (ownedCards[card.image] || 0) > 0;


        // CARD TITLE

        const title = document.createElement("span");

        title.className = "wishlist-item-title";

        title.textContent = isOwned
            ? card.name
            : `Card #${card.number ?? "?"}`;


        // CARD SUBTITLE

        const subtitle = document.createElement("small");

        subtitle.textContent =
            `${getRarity(card, collection)} · ${getCategory(card, collection)}`;

        button.appendChild(title);
        button.appendChild(subtitle);


        // CLICK WISHLIST ITEM

        button.addEventListener("click", () => {

            switchCollection(collection);

            document.getElementById("ownership-filter").value = "wishlist";

            document.getElementById("search").value = "";

            displayCards();

            openCardDetails(card);
        });

        container.appendChild(button);
    });
}


// ========================================
// DISPLAY CARDS
// ========================================

function displayCards() {

    if (!grid) return;

    grid.innerHTML = "";

    const cards = collections[currentCollection];

    const search = document.getElementById("search")
        .value.toLowerCase();

    const filter = document.getElementById("ownership-filter")
        .value;

    const sortBy = document.getElementById("sort-filter")
        .value;


    // FILTER CARDS

    const filteredCards = cards.filter(card => {

        const owned = (ownedCards[card.image] || 0) > 0;

        const isWishlisted = wishlist.includes(card.image);

        const matchesSearch =
            card.name.toLowerCase().includes(search) ||
            String(card.number).includes(search);

        const matchesFilter =
            filter === "all" ||
            (filter === "owned" && owned) ||
            (filter === "missing" && !owned) ||
            (filter === "wishlist" && isWishlisted);

        return matchesSearch && matchesFilter;
    });


    // SORTING

    filteredCards.sort((a, b) => {

        let comparison = 0;

        if (sortBy === "rarity") {
            comparison = getRarity(a).localeCompare(getRarity(b));
        }

        if (sortBy === "category") {
            comparison = getCategory(a).localeCompare(getCategory(b));
        }

        if (sortBy === "type") {
            comparison = getType(a).localeCompare(getType(b));
        }

        if (comparison !== 0) {
            return comparison;
        }

        return (a.number ?? Infinity) - (b.number ?? Infinity);
    });


    // CREATE CARD ELEMENTS

    filteredCards.forEach(card => {

        const owned = (ownedCards[card.image] || 0) > 0;

        const imageUrl = card.image
            .split("/")
            .map(part => encodeURIComponent(part))
            .join("/");

        const element = document.createElement("div");


        // RARITY CLASS

        const rarityClass = getRarity(card)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-");

        element.className =
            `card ${owned ? "owned" : "missing"} rarity-${rarityClass}`;


        // CARD IMAGE

        const img = document.createElement("img");

        img.src = imageUrl;
        img.alt = owned ? card.name : "Hidden card";

        element.appendChild(img);


        // CARD NAME

        if (owned) {

            const heading = document.createElement("h3");

            heading.textContent = card.name;

            element.appendChild(heading);


            // DUPLICATE COUNT

            const copies = ownedCards[card.image] || 0;

            if (copies > 1) {

                const duplicateInfo = document.createElement("p");

                duplicateInfo.className = "duplicate-count";

                duplicateInfo.textContent = `${copies} copies`;

                element.appendChild(duplicateInfo);
            }
        }


        // CARD NUMBER

        const number = document.createElement("p");

        number.textContent = `#${card.number ?? "?"}`;

        element.appendChild(number);


        // RARITY BADGE

        const rarityBadge = document.createElement("span");

        rarityBadge.className = "rarity-badge";

        rarityBadge.textContent = getRarity(card);

        element.appendChild(rarityBadge);


        // CATEGORY BADGE

        const categoryName = getCategory(card);

        const categoryClassMap = {
            "building": "building",
            "moment": "moment",
            "special": "special",
            "item": "item",
            "character": "character",
            "???": "unknown",
            "image": "image",
            "ss3": "ss3",
            "t:ts": "t-ts",
            "fte": "fte"
        };

        const categoryClass =
            categoryClassMap[categoryName.toLowerCase()] || "other";

        element.classList.add(`category-${categoryClass}`);

        const categoryBadge = document.createElement("span");

        categoryBadge.className =
            `category-badge category-${categoryClass}`;

        categoryBadge.textContent = categoryName;

        element.appendChild(categoryBadge);


        // WISHLIST STAR

        if (wishlist.includes(card.image)) {

            const star = document.createElement("p");

            star.className = "wishlist-star";

            star.textContent = "⭐ On Wishlist";

            element.appendChild(star);
        }


        // OPEN CARD POPUP

        element.addEventListener("click", () => {
            openCardDetails(card);
        });

        grid.appendChild(element);
    });


    // UPDATE SIDEBAR

    updateSidebarWishlist();
}


// ========================================
// CARD DETAILS POPUP
// ========================================

function openCardDetails(card) {

    const owned = (ownedCards[card.image] || 0) > 0;

    const copies = ownedCards[card.image] || 0;

    const image = document.getElementById("modal-image");

    image.dataset.cardImage = card.image;


    // CARD IMAGE

    const imageUrl = card.image
        .split("/")
        .map(part => encodeURIComponent(part))
        .join("/");

    image.src = imageUrl;

    image.alt = owned ? card.name : "Hidden card";


    // HIDE UNOWNED CARD IMAGE

    image.classList.toggle("hidden-card-image", !owned);


    // CARD NAME

    document.getElementById("modal-title").textContent =
        owned ? card.name : "Unowned Card";


    // CARD INFORMATION

    document.getElementById("modal-number").textContent =
        `Card Number: #${card.number ?? "?"}`;

    document.getElementById("modal-rarity").textContent =
        `Rarity: ${getRarity(card)}`;

    document.getElementById("modal-category").textContent =
        `Category: ${getCategory(card)}`;


    // CARD TYPE

    const typeElement = document.getElementById("modal-type");

    const type = getType(card);

    typeElement.hidden = !owned || type === "Unknown";

    typeElement.textContent = `Type: ${type}`;


    // COPIES OWNED

    const copiesElement = document.getElementById("modal-copies");

    copiesElement.hidden = !owned;

    copiesElement.textContent = `Copies owned: ${copies}`;


    // WISHLIST BUTTON

    updateWishlistButton(card);


    // SHOW POPUP

    document.getElementById("card-modal")
        .classList.add("active");
}


// ========================================
// CLOSE POPUP
// ========================================

function closeCardDetails() {

    document.getElementById("card-modal")
        .classList.remove("active");
}


// CLOSE BUTTON

document.getElementById("modal-close")
    .addEventListener("click", closeCardDetails);


// CLICK OUTSIDE POPUP

document.getElementById("card-modal")
    .addEventListener("click", event => {

        if (event.target.id === "card-modal") {
            closeCardDetails();
        }
    });


// ESCAPE KEY

document.addEventListener("keydown", event => {

    if (event.key === "Escape") {
        closeCardDetails();
    }
});


// ========================================
// COLLECTION PROGRESS
// ========================================

function updateProgress() {

    const cards = collections[currentCollection];

    const count = cards.filter(card =>
        (ownedCards[card.image] || 0) > 0
    ).length;

    const total = cards.length;

    const percentage = total
        ? (count / total) * 100
        : 0;

    document.getElementById("collection-count").textContent =
        `${count} / ${total} cards collected`;

    document.getElementById("collection-percent").textContent =
        `${percentage.toFixed(1)}%`;

    document.getElementById("progress-fill").style.width =
        `${percentage}%`;
}


// ========================================
// STATISTICS DASHBOARD
// ========================================

function renderStatistics() {

    const collectionNames = {
        main: "Main Set",
        forged: "Forged",
        tag: "Trees and Gold"
    };


    // GATHER ALL CARDS

    const allEntries = [];

    Object.entries(collections).forEach(([collection, cards]) => {

        cards.forEach(card => {

            allEntries.push({ card, collection });

        });
    });


    // REMOVE DUPLICATE IMAGE ENTRIES

    const uniqueCards = new Map();

    allEntries.forEach(entry => {

        if (
            entry.card.image &&
            !uniqueCards.has(entry.card.image)
        ) {
            uniqueCards.set(entry.card.image, entry);
        }
    });

    const allUniqueEntries = [...uniqueCards.values()];


    // FIND OWNED CARDS

    const ownedEntries = allUniqueEntries.filter(entry =>

        Number(ownedCards[entry.card.image] || 0) > 0

    );


    // BASIC STATISTICS

    const totalCards = allUniqueEntries.length;

    const ownedCount = ownedEntries.length;

    const totalCopies = ownedEntries.reduce((total, entry) => {

        return total +
            Number(ownedCards[entry.card.image] || 0);

    }, 0);

    const extraCopies = totalCopies - ownedCount;

    const duplicateEntries = ownedEntries
        .map(entry => ({
            ...entry,
            copies: Number(ownedCards[entry.card.image] || 0)
        }))
        .filter(entry => entry.copies > 1)
        .sort((a, b) => b.copies - a.copies);

    const completion = totalCards
        ? (ownedCount / totalCards) * 100
        : 0;


    // UPDATE OVERVIEW NUMBERS

    setStat("stat-total-cards", totalCards.toLocaleString());

    setStat("stat-owned-cards", ownedCount.toLocaleString());

    setStat("stat-completion", `${completion.toFixed(1)}%`);

    setStat("stat-total-copies", totalCopies.toLocaleString());

    setStat("stat-extra-copies", extraCopies.toLocaleString());

    setStat("stat-duplicate-cards", duplicateEntries.length.toLocaleString());


    // =================================
    // COLLECTION PROGRESS
    // =================================

    const collectionContainer =
        document.getElementById("stats-collections");

    if (collectionContainer) {

        collectionContainer.innerHTML = "";

        Object.entries(collectionNames).forEach(([key, name]) => {

            const cards = collections[key] || [];

            const imagePaths = [...new Set(
                cards.map(card => card.image).filter(Boolean)
            )];

            const total = imagePaths.length;

            const owned = imagePaths.filter(image =>
                Number(ownedCards[image] || 0) > 0
            ).length;

            const percent = total
                ? (owned / total) * 100
                : 0;

            const row = document.createElement("div");

            row.className = "stats-collection-row";


            // HEADING

            const heading = document.createElement("div");

            heading.className = "stats-row-heading";

            const title = document.createElement("span");

            title.textContent = name;

            const count = document.createElement("strong");

            count.textContent =
                `${owned.toLocaleString()} / ${total.toLocaleString()}`;

            heading.appendChild(title);

            heading.appendChild(count);


            // PROGRESS BAR

            const progress = document.createElement("div");

            progress.className = "stats-progress-bar";

            const fill = document.createElement("div");

            fill.className = "stats-progress-fill";

            fill.style.width = `${percent}%`;

            progress.appendChild(fill);


            // PERCENTAGE

            const percentage = document.createElement("p");

            percentage.className = "stats-percentage";

            percentage.textContent =
                `${percent.toFixed(1)}% completed`;


            row.appendChild(heading);

            row.appendChild(progress);

            row.appendChild(percentage);

            collectionContainer.appendChild(row);
        });
    }


    // =================================
    // GROUP OWNED CARDS BY RARITY
    // =================================

    const rarityCounts = new Map();

    ownedEntries.forEach(({ card, collection }) => {

        const rarity = getRarity(card, collection);

        rarityCounts.set(
            rarity,
            (rarityCounts.get(rarity) || 0) + 1
        );
    });

    renderStatisticsBreakdown(
        "stats-rarity-list",
        rarityCounts,
        ownedCount,
        "rarity"
    );


    // =================================
    // GROUP OWNED CARDS BY CATEGORY
    // =================================

    const categoryCounts = new Map();

    ownedEntries.forEach(({ card, collection }) => {

        const category = getCategory(card, collection);

        categoryCounts.set(
            category,
            (categoryCounts.get(category) || 0) + 1
        );
    });

    renderStatisticsBreakdown(
        "stats-category-list",
        categoryCounts,
        ownedCount,
        "category"
    );


    // =================================
    // DUPLICATE HIGHLIGHTS
    // =================================

    const summary =
        document.getElementById("stats-duplicate-summary");

    const highlight =
        document.getElementById("stats-most-duplicated");

    if (summary) {

        summary.textContent =
            `${duplicateEntries.length} different cards have duplicates. ` +
            `You have ${extraCopies.toLocaleString()} extra copies in total.`;
    }

    if (highlight) {

        highlight.innerHTML = "";

        if (duplicateEntries.length === 0) {

            const message = document.createElement("p");

            message.textContent = "No duplicate cards yet!";

            highlight.appendChild(message);

        } else {

            const top = duplicateEntries[0];

            const heading = document.createElement("p");

            heading.className = "duplicate-heading";

            heading.textContent = "MOST DUPLICATED CARD";

            const name = document.createElement("h4");

            name.textContent = top.card.name;

            const details = document.createElement("p");

            details.textContent =
                `${top.copies} copies · ` +
                `${getRarity(top.card, top.collection)} · ` +
                `${getCategory(top.card, top.collection)}`;

            highlight.appendChild(heading);

            highlight.appendChild(name);

            highlight.appendChild(details);
        }
    }


    // =================================
    // RAREST CARD OWNED
    // =================================
}


// =================================
// SAFE STATISTICS TEXT UPDATER
// =================================

function setStat(id, value) {

    const element = document.getElementById(id);

    if (element) {
        element.textContent = value;
    }
}

// =================================
// STATISTICS BREAKDOWN BARS
// =================================

function renderStatisticsBreakdown(
    containerId,
    counts,
    totalOwned,
    type
) {

    const container = document.getElementById(containerId);

    if (!container) return;

    container.innerHTML = "";


    // COLORS

    const rarityColors = {

        common: "#a7b1a7",
        uncommon: "#82b78a",
        rare: "#78a9d5",
        epic: "#ad8ad8",
        legendary: "#d3b45e",
        mythic: "#dc866c",
        secret: "#d887b5",
        insane: "#e07c69",
        "prismatic insane": "#c9a2e5",
        celestial: "#e5cc55"
    };

    const categoryColors = {

        building: "#6da9df",
        moment: "#3f7851",
        special: "#a98bd2",
        item: "#a54850",
        character: "#70b987",
        "???": "#b3bcb4",
        image: "#7bdc68",
        ss3: "#db88b7",
        "t:ts": "#ff3b9d",
        fte: "#355a9c"
    };

    const colors = type === "rarity"
        ? rarityColors
        : categoryColors;


    // SORT ENTRIES

    const entries = [...counts.entries()].sort((a, b) =>

        b[1] - a[1] || a[0].localeCompare(b[0])

    );


    // EMPTY STATE

    if (entries.length === 0) {

        const empty = document.createElement("p");

        empty.className = "stats-empty";

        empty.textContent = "No cards collected yet.";

        container.appendChild(empty);

        return;
    }


    // CREATE BREAKDOWN ROWS

    entries.forEach(([label, count]) => {

        const color = colors[label.toLowerCase()] || "#89958b";

        const row = document.createElement("div");

        row.className = "stats-breakdown-row";


        // HEADING

        const heading = document.createElement("div");

        heading.className = "stats-row-heading";

        const title = document.createElement("span");

        title.textContent = label;

        title.style.color = color;

        const number = document.createElement("strong");

        number.textContent = count.toLocaleString();

        heading.appendChild(title);

        heading.appendChild(number);


        // BAR

        const bar = document.createElement("div");

        bar.className = "stats-breakdown-bar";

        const fill = document.createElement("div");

        fill.className = "stats-breakdown-fill";

        fill.style.width =
            `${totalOwned ? (count / totalOwned) * 100 : 0}%`;

        fill.style.background = color;

        bar.appendChild(fill);


        // ASSEMBLE

        row.appendChild(heading);

        row.appendChild(bar);

        container.appendChild(row);
    });
}


// ========================================
// SWITCH COLLECTIONS
// ========================================

function switchCollection(collection) {

    if (!collections[collection]) return;

    showCollectionView();

    currentCollection = collection;

    document.getElementById("collection-title").textContent =
        collectionTitles[collection];

    document.getElementById("card-section-title").textContent =
        `${collectionTitles[collection]} Cards`;


    // UPDATE ACTIVE TAB

    document.querySelectorAll(".collection-tab").forEach(button => {

        button.classList.toggle(
            "active",
            button.dataset.collection === collection
        );
    });

    displayCards();

    updateProgress();
}


// ========================================
// STATISTICS NAVIGATION
// ========================================

function showStatisticsView() {

    document.querySelector(".collection-info").hidden = true;

    document.querySelector(".controls").hidden = true;

    document.querySelector(".card-section").hidden = true;

    document.getElementById("statistics-view").hidden = false;


    // REMOVE ACTIVE COLLECTION TAB

    document.querySelectorAll(".collection-tab").forEach(button => {

        button.classList.remove("active");
    });

    document.getElementById("statistics-nav-button")
        .classList.add("active");


    // UPDATE TOPBAR

    document.querySelector(".topbar h1").textContent =
        "Collection Statistics";

    document.querySelector(".topbar-description").textContent =
        "Explore your Treegoll collecting progress.";


    renderStatistics();
}


function showCollectionView() {

    document.querySelector(".collection-info").hidden = false;

    document.querySelector(".controls").hidden = false;

    document.querySelector(".card-section").hidden = false;

    document.getElementById("statistics-view").hidden = true;


    document.getElementById("statistics-nav-button")
        .classList.remove("active");


    // UPDATE TOPBAR

    document.querySelector(".topbar h1").textContent =
        "Card Collection";

    document.querySelector(".topbar-description").textContent =
        "Explore and keep track of your Treegoll cards.";
}


// STATISTICS BUTTON

document.getElementById("statistics-nav-button")
    .addEventListener("click", showStatisticsView);


// COLLECTION TABS

document.querySelectorAll(".collection-tab").forEach(button => {

    button.addEventListener("click", () => {

        switchCollection(button.dataset.collection);
    });
});


// ========================================
// SEARCH AND FILTERS
// ========================================

document.getElementById("search")
    .addEventListener("input", displayCards);

document.getElementById("ownership-filter")
    .addEventListener("change", displayCards);

document.getElementById("sort-filter")
    .addEventListener("change", displayCards);


// ========================================
// HIDE / SHOW SIDEBAR
// ========================================

const sidebarToggle = document.getElementById("sidebar-toggle");

const appShell = document.querySelector(".app-shell");

sidebarToggle.addEventListener("click", () => {

    appShell.classList.toggle("sidebar-hidden");

    const hidden = appShell.classList.contains("sidebar-hidden");

    sidebarToggle.textContent = hidden
        ? "☰ Show Sidebar"
        : "☰ Hide Sidebar";

    sidebarToggle.setAttribute(
        "aria-expanded",
        String(!hidden)
    );
});


// ========================================
// START WEBSITE
// ========================================

loadCards();
// ========================================
// SCROLL TO BOTTOM BUTTON
// ========================================

document.getElementById("scroll-bottom-button")
    .addEventListener("click", () => {

        window.scrollTo({
            top: document.documentElement.scrollHeight,
            behavior: "smooth"
        });

    });