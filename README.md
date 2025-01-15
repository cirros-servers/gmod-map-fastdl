# gmod-map-fastdl

Just a few scripts to help manage maps for my Garry's Mod server.  
Everything else can be handled just fine by `resource.AddWorkshop()`.

## Dependencies

-   A Steam account that owns Garry's Mod (duh)
-   Your Linux distribution's flavor of `lbzip2`, available in `PATH`
-   [steamcmd](https://developer.valvesoftware.com/wiki/SteamCMD)

### About lbzip2

This project started off using `bzip2`, but after some testing, I've found that `lbzip2` provides almost a **10x** in compression speed.  
You can still use `bzip2` if you really want to, but `lbzip2` is highly recommended.
