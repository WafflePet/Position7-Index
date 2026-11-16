
const fs = require("fs");
const path = require("path");

const cardsFolder = path.join(__dirname, "cards");

const mainCards = [];
const forgedCards = [];
const tagCards = [];

const excludedCounts = {};

function getCard(filename, fullPath) {
    const name = path.parse(filename).name;
    const relativePath = path.relative(cardsFolder, fullPath);

    const folderPath = path.dirname(relativePath);

    const folders = folderPath === "."
        ? []
        : folderPath.split(path.sep);

    const numbers = [...name.matchAll(/#(\d+)/g)];

    return {
        name,
        number: numbers.length
            ? Number(numbers[numbers.length - 1][1])
            : null,
        numbers: numbers.map(n => Number(n[1])),
        folder: folders,
        image: "cards/" + relativePath.split(path.sep).join("/")
    };
}

function scanFolder(folder) {
    const items = fs.readdirSync(folder);

    for (const item of items) {
        const fullPath = path.join(folder, item);
        const stats = fs.statSync(fullPath);

        if (stats.isDirectory()) {
            scanFolder(fullPath);
            continue;
        }

        if (!item.toLowerCase().endsWith(".png")) {
            continue;
        }

        const card = getCard(item, fullPath);

        const folderNames = card.folder.map(
            name => name.toLowerCase()
        );

        const fullText = [
            card.name,
            ...folderNames
        ].join(" ").toLowerCase();

        // TREES AND GOLD
        if (fullText.includes("trees and gold")) {
            tagCards.push(card);
            continue;
        }

        // FORGED
        if (fullText.includes("forged")) {
            forgedCards.push(card);
            continue;
        }

        // OTHER COLLECTIONS
       if (fullText.includes("sky and sea")) {
            excludedCounts["Other Set"] =
                (excludedCounts["Other Set"] || 0) + 1;
            continue;
        }

        // LIMITED AND UNOBTAINABLE CARDS
        let exclusionReason = null;

        if (fullText.includes("christmas")) {
            exclusionReason = "Christmas";
        } else if (fullText.includes("candy cane")) {
            exclusionReason = "Candy Cane";
        } else if (fullText.includes("desert")) {
            exclusionReason = "Desert";
        } else if (fullText.includes("template")) {
            exclusionReason = "Template";
        }

        if (exclusionReason) {
            excludedCounts[exclusionReason] =
                (excludedCounts[exclusionReason] || 0) + 1;
            continue;
        }

        // MAIN SET
        mainCards.push(card);
    }
}

function sortCards(cards) {
    cards.sort((a, b) => {
        if (a.number === null) return 1;
        if (b.number === null) return -1;

        return a.number - b.number;
    });
}

scanFolder(cardsFolder);

sortCards(mainCards);
sortCards(forgedCards);
sortCards(tagCards);

// Save the three collections
fs.writeFileSync(
    path.join(__dirname, "cards.json"),
    JSON.stringify(mainCards, null, 2)
);

fs.writeFileSync(
    path.join(__dirname, "forged-cards.json"),
    JSON.stringify(forgedCards, null, 2)
);

fs.writeFileSync(
    path.join(__dirname, "tag-cards.json"),
    JSON.stringify(tagCards, null, 2)
);

// Check Main Set duplicates
const numberCounts = {};

for (const card of mainCards) {
    if (card.number !== null) {
        numberCounts[card.number] =
            (numberCounts[card.number] || 0) + 1;
    }
}

const duplicates = Object.entries(numberCounts)
    .filter(([number, count]) => count > 1);

console.log("--------------------------------");
console.log("TREEGOLL CARD INDEX GENERATOR");
console.log("--------------------------------");

console.log("Main Set:", mainCards.length);
console.log("Forged:", forgedCards.length);
console.log("Trees and Gold:", tagCards.length);

console.log("--------------------------------");
console.log("Excluded cards:", excludedCounts);
console.log("Main Set duplicate numbers:", duplicates);

console.log("--------------------------------");
console.log("Created all three card files!");
