import { env } from "bun";
import { mkdir } from "node:fs/promises";
import { promisify } from "node:util";
import * as child_process from "node:child_process";
const exec = promisify(child_process.exec);

export const CLIENT_FILES = ["vmt", "vtf", "mdl", "vvd", "ani", "vtx", "phy", "png", "jpg", "jpeg", "wav", "ogg", "mp3"];
export const MAP_FILES = ["bsp", "nav", "ain"];
const MAP: { id: string; path: string; location: string }[] = await Bun.file(`${env.GARRYSMOD}/addons/map.json`).json();

function sanitize(input: string) {
    return input
        .replaceAll("(", "\\(")
        .replaceAll(")", "\\)")
        .replaceAll(":", "\\:")
        .replaceAll("[", "\\[")
        .replaceAll("]", "\\]")
        .replaceAll("|", "\\|");
}

export async function main() {
    let script = `-- Any changes made to this file will NOT be persisted
    
if (SERVER) then\n`;

    let mapAddons = new Set();
    for (let { id, path } of MAP) if (path.endsWith(".bsp")) mapAddons.add(id);
    for (let id of mapAddons) {
        const mapFiles = MAP.filter((_) => _.id === id);
        const mapFile = mapFiles.find((_) => _.path.endsWith(".bsp"));
        if (!mapFile) throw new Error("Map addon without bsp?");
        const mapName = mapFile.path.match(/(?:\/)(.*)(?:\.)/)?.[1];
        if (!mapName) throw new Error("Map addon without map name?");

        script += `  if game.GetMap() == "${mapName}" then\n`;

        for (let file of mapFiles) {
            const extension = file.path.split(".").pop();
            if (!extension) throw new Error("Map file without an extension?");
            if (!CLIENT_FILES.includes(extension)) continue;
            script += `    resource.AddSingleFile("${file.path}")\n`;
        }

        script += `  end\n`;
    }

    for (let { id, path } of MAP) {
        if (mapAddons.has(id)) continue;
        const extension = path.split(".").pop();
        if (!extension) throw new Error("Addon file without an extension?");
        if (!CLIENT_FILES.includes(extension)) continue;

        script += `  resource.AddSingleFile("${path}")\n`;
    }

    script += `end\n`;

    console.log("Finished script generation");

    for (let { path, location } of MAP) {
        const extension = path.split(".").pop();
        if (!extension) throw new Error("Addon file without an extension?");
        if (!CLIENT_FILES.includes(extension) && !MAP_FILES.includes(extension)) continue;

        const destination = `${env.FASTDL_STORAGE}/${path}.bz2`;
        let folders: string | string[] = destination.split("/");
        folders.pop();
        folders = folders.join("/");
        await mkdir(folders, { recursive: true });
        await exec(`bzip2 -kzc ${sanitize(location)} > ${sanitize(destination)}`);
        console.log(destination);
    }

    const addonPath = `${env.GARRYSMOD}/addons/fastdl_generated/lua/autorun/server`;
    await mkdir(addonPath, { recursive: true });
    await Bun.write(`${addonPath}/fastdl.lua`, script);
}

main();
