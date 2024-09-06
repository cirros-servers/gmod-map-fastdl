const totp = require("steam-totp-strict");
import { readdir } from "node:fs/promises";
import { $, type FileSink, type Subprocess } from "bun";
import { resolve } from "path";
import { Readable } from "node:stream";

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
    private steamCmd?: Subprocess;
    private reader?: ReadableStreamDefaultReader<Uint8Array>;
    private steamReady = false;

    constructor() {}

    async init(path?: string, addonStorage?: string) {
        if (path) this.path = resolve(path);
        else path = (await $`which steamcmd`).text();

        if (addonStorage) this.addonStorage = resolve(addonStorage);

        const otp = await getOtp().catch((_) => "false");
        this.steamCmd = Bun.spawn({
            cmd: [
                this.path,
                "+force_install_dir",
                this.addonStorage,
                "+login",
                Bun.env.STEAM_USERNAME || "anonymous",
                Bun.env.STEAM_USERNAME ? Bun.env.STEAM_PASSWORD : "",
                otp,
            ],
            stdin: "pipe",
            stdout: "pipe",
        });

        this.reader = (this.steamCmd.stdout as ReadableStream<Uint8Array>).getReader();

        process.on("exit", () => {
            try {
                ((this.steamCmd as Subprocess).stdin as FileSink).write(`exit`);
            } catch (e) {
                this.steamCmd?.kill("SIGKILL");
            }
        });
    }

    async workshopDownloadItem(gameId: number, itemId: number): Promise<{ path: string }> {
        const steamCmd = this.steamCmd;
        const reader = this.reader;
        const steamReady = this.steamReady;

        try {
            await readdir(`${this.addonStorage}/steamapps/workshop/content/${gameId}/${itemId}`);
        } catch (err) {
            async function read() {
                if (!reader) throw new Error("Failed to get stdout reader");
                if (!steamCmd || !steamCmd.stdin || !steamCmd.stdout) throw new Error("SteamCMD failed to start");
                if (typeof steamCmd.stdin === "number" || typeof steamCmd.stdout === "number")
                    throw new Error("Failed to read/write to stdout/stdin");

                if (steamReady) {
                    steamCmd.stdin.write(`workshop_download_item ${gameId} ${itemId}\n`);
                    // process.stdout.write(` workshop_download_item ${gameId} ${itemId}\n`);
                }

                let { value } = await reader.read();

                let chunk = Buffer.from(value || []).toString();
                process.stdout.write(chunk);

                if (chunk.includes("Success. Downloaded item")) {
                    // console.log(`[STEAM] Success. Downloaded item ${itemId}`);
                    return;
                }

                if (chunk.includes("ERROR!")) {
                    throw new Error(chunk);
                }

                if (chunk.includes("Steam>")) {
                    steamCmd.stdin.write(`workshop_download_item ${gameId} ${itemId}\n`);
                    // process.stdout.write(` workshop_download_item ${gameId} ${itemId}\n`);
                }

                await read();
            }

            await read();
            this.steamReady = true;
        }

        const item = resolve(`${this.addonStorage}/steamapps/workshop/content/${gameId}/${itemId}`);
        const files = await readdir(item);
        const itemFiles = files.find((_) => _.includes(".gma") || _.includes(".bin"));
        if (!itemFiles || !itemFiles.length) throw new Error("Failed to download a vaild addon file.");

        return {
            path: `${this.addonStorage}/steamapps/workshop/content/${gameId}/${itemId}/${itemFiles}`,
        };
    }
}

export default SteamCMD;
