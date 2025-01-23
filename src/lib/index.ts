export const CLIENT_FILES = [
    "vmt", // Textures
    "vtf",
    "mdl", // Models
    "vvd",
    "ani",
    "vtx",
    "phy",
    "png", // Images
    "jpg",
    "jpeg",
    "wav", // Sounds
    "ogg",
    "mp3",
    "aac",
    "pcf", // Particles
    "ttf", // Fonts
];
export const MAP_FILES = ["bsp", "nav", "ain"];

export function sanitize(input: string) {
    return input.replace(/[^\w]+/g, "_");
}
