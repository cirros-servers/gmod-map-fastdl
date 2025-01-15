export const CLIENT_FILES = ["vmt", "vtf", "mdl", "vvd", "ani", "vtx", "phy", "png", "jpg", "jpeg", "wav", "ogg", "mp3"];
export const MAP_FILES = ["bsp", "nav", "ain"];

export function sanitize(input: string) {
    return input.replace(/[^\w]+/g, "_");
}
