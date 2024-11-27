import { env } from "bun";
import { exec } from "node:child_process";
import { readdir } from "node:fs/promises";

export async function download(itemIds: number[]) {
    if (!itemIds.length) throw new Error("Not enough item ids");

    const params = new URLSearchParams({ itemcount: itemIds.length.toString() });
    for (let i = 0; i < itemIds.length; i++) params.append(`publishedfileids[${i}]`, itemIds[i].toString());

    const response = await fetch("https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
    });

    if (response.status !== 200) throw new Error("Non-2xx response code");
    const { publishedfiledetails } = (await response.json()).response;

    let steamcmdParams =
        env.STEAM_ANONYMOUS === "1"
            ? `+force_install_dir /tmp/steam +login anonymous `
            : `+force_install_dir /tmp/steam +login ${env.STEAM_USERNAME} ${env.STEAM_PASSWORD} `;

    for (let item of publishedfiledetails) {
        const { consumer_app_id, publishedfileid } = item;
        if (consumer_app_id !== 4000) throw new Error(`Specified Workshop item "${publishedfileid}" is not for Garry's Mod`);
        steamcmdParams += `+workshop_download_item 4000 ${publishedfileid} `;
    }

    steamcmdParams += "+quit";

    const steamcmd: { stdout: string; stderr: string } = await new Promise((resolve, reject) => {
        const proc = exec(`"${env.STEAMCMD}" ${steamcmdParams}`, {}, (err, stdout, stderr) => {
            if (err) return reject(err);
            resolve({ stdout, stderr });
        });

        if (proc.stdout) proc.stdout.on("data", (_) => console.log(_));
    });

    const lines = steamcmd.stdout.split("\n");
    let downloads = [];

    for (let line of lines) {
        if (!line.includes("Success.")) continue;
        let [id, path] = Array.from(line.match(/(\d+)|("(.+)")/g) as string[]);
        path = path.replaceAll('"', "");

        let file = path;
        if (!path.endsWith(".bin")) file += "/" + (await readdir(path))[0];

        downloads.push({ id, file });
    }

    return downloads;
}
