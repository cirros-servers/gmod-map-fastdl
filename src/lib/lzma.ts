import { resolve } from "path";

class LZMA {
    private path: string = "";

    constructor() {}

    async init(path?: string) {
        this.path = resolve(path || "");
    }

    async extract(bin: string) {
        let folder: string[] | string = bin.split("/");
        let binFilename = folder.pop();
        if (!binFilename) throw new Error("What the fuck oh my god");
        folder = folder.join("/");

        const { stdout } = Bun.spawnSync([this.path, "-d", bin, `${folder}/${binFilename.replace(".bin", ".gma")}`]);

        return `${folder}/${binFilename.replace(".bin", ".gma")}`;
    }
}

export default LZMA;
