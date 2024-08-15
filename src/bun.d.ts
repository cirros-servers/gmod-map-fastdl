declare module "bun" {
    interface Env {
        STEAM_USERNAME: string;
        STEAM_PASSWORD: string;
        STEAM_TOTP_SECRET?: string;
        GMAD: string;
        STEAMCMD: string;
        ADDON_STORAGE: string;
        GARRYSMOD: string;
        GMOD_LZMA: string;
    }
}
