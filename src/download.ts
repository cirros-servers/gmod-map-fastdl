import { readdir, mkdir, cp, writeFile, exists } from "node:fs/promises";
import { setTimeout } from "node:timers/promises";
import GMAD from "./lib/gmad";
import SteamCMD from "./lib/steamcmd";
import { glob } from "glob";

try {
    await readdir(Bun.env.GARRYSMOD);
} catch (err) {
    await mkdir(Bun.env.GARRYSMOD);
}

const cmd = new SteamCMD();
await cmd.init(Bun.env.STEAMCMD, Bun.env.ADDON_STORAGE);

const gmad = new GMAD(); // bacon?
await gmad.init(Bun.env.GMAD);

const addons = [
    2910505837, // arc9 base
    2131057232, // arccw base
    1131455085, // gred base
    2912816023, // lvs framework
    2912826012, // lvs planes
    3027255911, // lvs cars
];

let folders = [];
for await (const id of addons) {
    console.log("Downloading:", id);
    const { path, steamUsed } = await cmd.workshopDownloadItem(4000, id);

    if (path.includes(".bin")) {
        console.log("Failed to extract:", id);
        continue;
    } else if (path.includes(".gma")) {
        folders.push({ id, addon: await gmad.extract(path) });
    }

    if (steamUsed) await setTimeout(1000 * 11);
}

for await (const { id, addon } of folders) {
    const files = await glob("**/*.*", { cwd: addon });

    try {
        await readdir(`${Bun.env.GARRYSMOD}/addonmap`);
    } catch (err) {
        await mkdir(`${Bun.env.GARRYSMOD}/addonmap`);
    }
    await writeFile(`${Bun.env.GARRYSMOD}/addonmap/${id}.txt`, files.join("\n"));

    for await (const file of files) {
        if (!(await exists(`${Bun.env.GARRYSMOD}/${file}`))) {
            console.log("Transferring:", file);
            await cp(`${addon}/${file}`, `${Bun.env.GARRYSMOD}/${file}`, { recursive: true });
        } else {
            console.log("Exists:", file);
        }
    }
}
