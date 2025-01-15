import { env } from "bun";
import { rm } from "node:fs/promises";
import { CLIENT_FILES, MAP_FILES } from "./lib";

const MAP: { id: string; path: string; location: string }[] = await Bun.file(`${env.GARRYSMOD}/addons/map.json`).json();

const REMOVALS = [0];

for (let id of REMOVALS) {
    const file = MAP.find((_) => _.id === id.toString());
    if (!file) {
        console.log("Couldn't find files for", id);
        continue;
    }

    const addon = file.location.replace(file.path, "");
    await rm(addon, { recursive: true, force: true }).catch((_) => _);

    for (let { path } of MAP.filter((_) => _.id === id.toString())) {
        const location = env.FASTDL_STORAGE + "/" + path;
        const extension = location.split(".").pop();
        if (!extension) throw new Error("No extension on file?");
        if (CLIENT_FILES.includes(extension) || MAP_FILES.includes(extension)) {
            await rm(location + ".bz2").catch((_) => _);
            console.log(location + ".bz2");
        }
    }

    await Bun.write(
        `${env.GARRYSMOD}/addons/map.json`,
        JSON.stringify(
            MAP.filter((_) => _.id !== id.toString()),
            null,
            4
        )
    );
}
