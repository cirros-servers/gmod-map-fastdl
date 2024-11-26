import { env } from "bun";
import { extract, parse } from "./lib/gma";
import { download } from "./lib/steam";
import { readdir, mkdir } from "node:fs/promises";

const ADDONS = [1];

export async function main() {
    const downloads = await download(ADDONS);

    let addon_list: { id: string; path: string; location: string }[] = [];

    for (let { id, file } of downloads) {
        const buffer = await Bun.file(file).arrayBuffer();
        const addon = await parse(Buffer.from(buffer));
        const addonPath = `${env.GARRYSMOD}/addons/${addon.name.toLocaleLowerCase().replaceAll(" ", "_")}_generated`;

        try {
            await readdir(addonPath);
        } catch (_) {
            await mkdir(addonPath, { recursive: true });
        }

        for (let { path } of addon.files) {
            if (addon_list.find((_) => _.path === path)) throw new Error(`!! ${path} already exists`);

            const output = await extract({ file: Buffer.from(buffer), addon, fileName: path });
            let folders: string | string[] = path.split("/");
            folders.pop();
            folders = folders.join("/");

            await mkdir(addonPath + "/" + folders, { recursive: true });
            await Bun.write(addonPath + "/" + path, output as any);

            addon_list.push({ id, path, location: addonPath + "/" + path });
        }
    }

    await Bun.write(`${env.GARRYSMOD}/addons/map.json`, JSON.stringify(addon_list, null, 4));
}

main();
