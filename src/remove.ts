import { env } from "bun";
import { rmdir, rm } from "node:fs/promises";
import { CLIENT_FILES, MAP_FILES } from "./fastdl";

const MAP: { id: string; path: string; location: string }[] = await Bun.file(`${env.GARRYSMOD}/addons/map.json`).json();

const REMOVALS = [1];

for (let id of REMOVALS) {
    const file = MAP.find((_) => _.id === id.toString());
    if (!file) {
        console.log("Couldn't find files for", id);
        continue;
    }

    const addon = file.location.replace(file.path, "");
    await rmdir(addon).catch((_) => _);

    for (let { location } of MAP.filter((_) => _.id === id.toString())) {
        const extension = location.split(".").pop();
        if (!extension) throw new Error("No extension on file?");
        if (CLIENT_FILES.includes(extension) || MAP_FILES.includes(extension)) await rm(location + ".bz2");
    }
}
