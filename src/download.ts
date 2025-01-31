import { env } from "bun";
import { extract, parse } from "./lib/gma";
import { download } from "./lib/steam";
import { readdir, mkdir } from "node:fs/promises";
import { sanitize } from "./lib";

const ADDONS = [
    3362177734, 2619660952, 3233232728, 3372042926, 3355995004, 3282013166, 2312309380, 3166329508, 2722750107, 815782148,
    3360227650, 2821234125, 2533339955, 2129643967, 2541605149, 2637442004, 3254618986, 741592270, 2821179466, 3149067981,
    3373875462, 2917067836, 3008347203, 2235936290, 1656078410, 2010286798, 268096025, 2558933448, 1864156937, 1601428630,
    3027406388, 3055424196, 3238708088, 3338529371, 3366444216, 3305629964, 3302364964, 3334581973, 266666023, 2991458245,
    2589623334, 2589610334, 2267329131, 2113786004, 2925489145, 1635596292, 2174226635, 3261566870, 3414995121, 3355146789,
    2905327911,
];

export async function main() {
    const downloads = await download(ADDONS);
    console.log("Got downloads list.");

    let addon_list: { id: string; path: string; location: string }[] = [];

    for (let { id, file } of downloads) {
        const buffer = await Bun.file(file).arrayBuffer();
        const addon = await parse(id, Buffer.from(buffer));
        const addonPath = `${env.GARRYSMOD}/addons/${sanitize(addon.name.toLocaleLowerCase())}_generated`;

        try {
            await readdir(addonPath);
        } catch (_) {
            await mkdir(addonPath, { recursive: true });
        }

        for (let { path } of addon.files) {
            const entry = addon_list.find((_) => _.path === path);
            if (entry) {
                console.log(`\u001b[48;2;255;0;0m!! ${path} already exists, skipping !!\u001b[49m`);
                continue;
            }

            addon_list.push({ id, path, location: addonPath + "/" + path });

            const exists = await Bun.file(addonPath + "/" + path).exists();
            if (exists) continue;

            console.log(addonPath + "/" + path);

            const output = await extract({ id, file: Buffer.from(buffer), addon, fileName: path });
            let folders: string | string[] = path.split("/");
            folders.pop();
            folders = folders.join("/");

            await mkdir(addonPath + "/" + folders, { recursive: true });
            await Bun.write(addonPath + "/" + path, output as any);
        }
    }

    await Bun.write(`${env.GARRYSMOD}/addons/map.json`, JSON.stringify(addon_list, null, 4));
}

main();
