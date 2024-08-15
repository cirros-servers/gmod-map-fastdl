import { resolve } from "path";

class GMAD {
    private path: string = "";

    constructor() {}

    async init(path?: string) {
        this.path = resolve(path || "");
    }

    async extract(gma: string) {
        Bun.spawnSync([this.path, "extract", "-file", resolve(gma)]);

        let folder: string[] | string = gma.split("/");
        let gmaFilename = folder.pop();
        if (!gmaFilename) throw new Error("What the fuck oh my god");

        folder = folder.join("/");

        return `${folder}/${gmaFilename.replace(".gma", "")}`;
    }
}

export default GMAD;
