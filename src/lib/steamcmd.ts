const totp = require("steam-totp-strict");
import { readdir } from "node:fs/promises";
import { $ } from "bun";
import { resolve } from "path";

function getOtp(): Promise<string> {
    return new Promise((resolve, reject) => {
        if (!process.env.STEAM_TOTP_SECRET) return resolve("");

        totp.getTimeOffset((error: Error | undefined, offset: number) => {
            if (error) reject(error);
            resolve(totp.getAuthCode(process.env.STEAM_TOTP_SECRET, offset));
        });
    });
}

class SteamCMD {
    private path: string = "/tmp/gmsrv_temporary";
    private addonStorage: string = "";

    constructor() {}

    async init(path?: string, addonStorage?: string) {
        if (path) this.path = resolve(path);
        else path = (await $`which steamcmd`).text();

        if (addonStorage) this.addonStorage = resolve(addonStorage);
    }

    async workshopDownloadItem(gameId: number, itemId: number) {
        const otp = await getOtp().catch((_) => "false");

        let steamUsed = false;
        try {
            await readdir(`${this.addonStorage}/steamapps/workshop/content/${gameId}/${itemId}`);
        } catch (err) {
            steamUsed = true;
            const stdout = Bun.spawnSync([
                this.path,
                "+force_install_dir",
                this.addonStorage,
                "+login",
                Bun.env.STEAM_USERNAME || "anonymous",
                Bun.env.STEAM_USERNAME ? Bun.env.STEAM_PASSWORD : "",
                otp,
                "+workshop_download_item",
                gameId.toString(),
                itemId.toString(),
                "+exit",
            ]).stdout.toString();
            console.log(stdout);
        }

        const item = resolve(`${this.addonStorage}/steamapps/workshop/content/${gameId}/${itemId}`);
        const files = await readdir(item);
        const itemFiles = files.find((_) => _.includes(".gma") || _.includes(".bin"));
        if (!itemFiles || !itemFiles.length) throw new Error("Failed to download a vaild addon file.");

        return {
            path: `${this.addonStorage}/steamapps/workshop/content/${gameId}/${itemId}/${itemFiles}`,
            steamUsed,
        };
    }
}

export default SteamCMD;
