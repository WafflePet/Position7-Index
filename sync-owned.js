
const fs = require("fs");
const path = require("path");

const ownedFolder = String.raw`C:\Users\caspi\Downloads\Trading Cards Position7 Own`;

const collectionFiles = [
    "cards.json",
    "forged-cards.json",
    "tag-cards.json"
];

const outputFile = path.join(__dirname, "owned-cards.json");

// Ignore extra dots at the end of filenames
function normalizeName(name) {
    return name.replace(/\.+$/, "").toLowerCase();
}

// Count every owned copy instead of just detecting its existence
function collectOwnedCounts(folder, counts = new Map()) {
    const items = fs.readdirSync(folder, { withFileTypes: true });

    for (const item of items) {
        const fullPath = path.join(folder, item.name);

        if (item.isDirectory()) {
            collectOwnedCounts(fullPath, counts);
        } else if (
            item.isFile() &&
            path.extname(item.name).toLowerCase() === ".png"
        ) {
            const filename = path.parse(item.name).name;
            const name = normalizeName(filename);

            counts.set(name, (counts.get(name) || 0) + 1);
        }
    }

    return counts;
}

let firstScan = true;

function syncOwnedCards() {
    try {
        if (!fs.existsSync(ownedFolder)) {
            throw new Error("Could not find your Owned Cards folder!");
        }

        // Load all three collections
        const cards = collectionFiles.flatMap(file => {
            const filePath = path.join(__dirname, file);

            if (!fs.existsSync(filePath)) {
                throw new Error(`Missing collection file: ${file}`);
            }

            return JSON.parse(fs.readFileSync(filePath, "utf8"));
        });

        const ownedNames = collectOwnedCounts(ownedFolder);

        // Store each owned card with its number of copies
        const ownedCopies = {};

        for (const card of cards) {
            const copies = ownedNames.get(normalizeName(card.name)) || 0;

            if (copies > 0) {
                ownedCopies[card.image] = copies;
            }
        }

        const output = JSON.stringify(ownedCopies, null, 2);

        const previousOutput = fs.existsSync(outputFile)
            ? fs.readFileSync(outputFile, "utf8")
            : "";

        const changed = output !== previousOutput;

        if (changed) {
            fs.writeFileSync(outputFile, output);
        }

        const uniqueCards = Object.keys(ownedCopies).length;

        const totalCopies = Object.values(ownedCopies)
            .reduce((total, copies) => total + copies, 0);

        if (firstScan || changed) {
            console.log("--------------------------------");
            console.log("TREEGOLL OWNED CARDS");
            console.log("--------------------------------");
            console.log(`Unique cards owned: ${uniqueCards} / ${cards.length}`);
            console.log(`Total copies: ${totalCopies}`);
            console.log("--------------------------------");
        }

        firstScan = false;

    } catch (error) {
        console.error("Scanner error:", error.message);
    }
}

syncOwnedCards();

setInterval(syncOwnedCards, 5000);

console.log("🌳 Treegoll Owned Cards Scanner is running!");
console.log("Counting duplicates across all three collections...");
