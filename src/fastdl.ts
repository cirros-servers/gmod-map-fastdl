import { env } from "bun";
import { mkdir } from "node:fs/promises";
import { promisify } from "node:util";
import * as child_process from "node:child_process";
import { CLIENT_FILES, MAP_FILES } from "./lib";
const exec = promisify(child_process.exec);

const MAP: { id: string; path: string; location: string }[] = await Bun.file(`${env.GARRYSMOD}/addons/map.json`).json();

export async function main() {
    let script = "-- Any changes made to this file will NOT be persisted\n\n";

    script += `function addFiles(tbl)
    for i,v in ipairs(tbl) do resource.AddSingleFile(v) end
end\n\n`;

    let addonsWithMaps = new Set();
    for (let { id, path } of MAP) if (path.endsWith(".bsp")) addonsWithMaps.add(id);
    for (let id of addonsWithMaps) {
        const addonFiles = MAP.filter((_) => _.id === id);
        if (!addonFiles.find((_) => CLIENT_FILES.includes(_.path.split(".").pop() || ""))) continue;
        const mapFiles = addonFiles.filter((_) => _.path.endsWith(".bsp"));
        if (!mapFiles.length) throw new Error("Map addon without bsp?");

        let mapNames = [];
        for (let mapFile of mapFiles) {
            const mapName = mapFile.path.match(/(?:\/)(.*)(?:\.)/)?.[1];
            if (!mapName) throw new Error(`Map addon without map name? (${id})`);
            mapNames.push(mapName);
        }

        script += `if string.find("${mapNames.join(" ")}", game.GetMap()) then\n`;
        script += `  addFiles({`;

        for (let file of addonFiles) {
            const extension = file.path.split(".").pop();
            if (!extension) throw new Error("Map file without an extension?");
            if (!CLIENT_FILES.includes(extension)) continue;
            script += ` "${file.path}",`;
        }

        script += ` })\n`;
        script += `end\n`;
    }

    console.log("Finished script generation");

    if (env.SKIP_COMPRESSION !== "1") {
        const start = Date.now();

        for (let { path, location } of MAP) {
            const extension = path.split(".").pop();
            if (!extension) throw new Error("Addon file without an extension?");
            if (!CLIENT_FILES.includes(extension) && !MAP_FILES.includes(extension)) continue;

            const destination = `${env.FASTDL_STORAGE}/${path}.bz2`;
            let folders: string | string[] = destination.split("/");
            folders.pop();
            folders = folders.join("/");

            await mkdir(folders, { recursive: true });
            await exec(`lbzip2 -kzc "${location}" > "${destination}"`);

            console.log(destination);
        }

        const end = Date.now();
        console.log("Compression took", end - start, "ms!");
    }

    const addonPath = `${env.GARRYSMOD}/addons/fastdl_generated/lua/autorun/server`;
    await mkdir(addonPath, { recursive: true });
    await Bun.write(`${addonPath}/fastdl.lua`, script);
}

main();
