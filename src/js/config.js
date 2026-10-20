/*
 * Home screen content.
 *
 * apps: each entry picks the first installed app matching it:
 *   { id: 'org.tizen.netflix-app' }   exact app id (most reliable; see "All apps", the id of
 *                                     the focused app is shown at the bottom)
 *   { match: 'netflix' }              case-insensitive regex on id or name
 *   label                             optional display name
 *   brand                             optional key from js/brands.js (otherwise guessed from the name)
 * Entries that match nothing are skipped.
 *
 * inputs: HDMI ports shown in the second row. Set `hdmi` to the port each device is plugged into.
 */
window.LAUNCHER_CONFIG = {
    apps: [
        { id: 'xvvl3S1TT1.TizenTubeStandalone', label: 'YouTube', brand: 'youtube' },
        { id: 'rJeHak5zRg.Spotify', label: 'Spotify' },
        { id: 'Jz7aUrV2Q4.Twitch', label: 'Twitch' },
        { id: 'E0P3lRI4H7.MYTF1', label: 'TF1+' },
        { id: 'org.tizen.netflix-app', label: 'Netflix' },
        { id: 'org.tizen.primevideo', label: 'Prime Video' },
        { id: 'MCmYXNxgcu.DisneyPlus', label: 'Disney+' },
        { id: 'com.samsung.tv.aria-video', label: 'Apple TV' }
    ],

    inputs: [
        { hdmi: 1, label: 'Nintendo Switch 2', brand: 'switch' },
        { hdmi: 2, label: 'PlayStation 5', brand: 'playstation' },
        { hdmi: 4, label: 'Xbox Series X', brand: 'xbox' }
    ],

    // How an input tile switches the TV. See README "HDMI inputs".
    //   'switch+viewer'  set the TV source, then open Samsung's TV viewer (default)
    //   'switch'         only set the TV source
    //   'inapp'          show the input full screen inside the launcher (Back returns)
    inputMethod: 'switch+viewer',

    locale: 'en-GB',

    theme: {
        // Starting wallpaper (key from js/wallpapers.js), or null for none (plain gradient).
        // Changed from Settings → Background; the TV remembers the choice.
        wallpaper: null
    },

    // Development only: where the Lab screen sends its logs (npm run devlog on your computer).
    // null disables it; set it to http://<your-computer-ip>:8099/log while debugging.
    devLogUrl: null
};
