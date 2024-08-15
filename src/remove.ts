import { readFile, rm } from "node:fs/promises";

const ADDON_LIST = "addonmap/ITEMID.txt";

const file = await readFile(Bun.env.GARRYSMOD + "/" + ADDON_LIST, { encoding: "utf-8" });
for await (const path of file.split("\n")) {
    if (!path) continue;

    try {
        await rm(Bun.env.GARRYSMOD + "/" + path);
        console.log("Deleted:", Bun.env.GARRYSMOD + "/" + path);
    } catch (_) {
        console.log("Missing:", Bun.env.GARRYSMOD + "/" + path);
    }

    try {
        await rm(Bun.env.GARRYSMOD + "/" + path + ".bz2");
        console.log("Deleted:", Bun.env.GARRYSMOD + "/" + path + ".bz2");
    } catch (_) {
        console.log("Missing:", Bun.env.GARRYSMOD + "/" + path + ".bz2");
    }
}

try {
    await rm(Bun.env.GARRYSMOD + "/" + ADDON_LIST);
    console.log("Deleted:", Bun.env.GARRYSMOD + "/" + ADDON_LIST);
} catch (_) {
    console.log("Missing:", Bun.env.GARRYSMOD + "/" + ADDON_LIST);
}
