// client/babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          root: ["./"], // The root of the resolution, which is your project's client/ directory
          alias: {
            // "@": "./src", // OLD - Incorrect if you have no src/ folder
            "@": "./",     // NEW - This makes "@/" refer to the project root (client/)
                           // So, import X from '@/components/X' will look for client/components/X
                           // And import Y from '@/types/Y' will look for client/types/Y
          },
        },
      ],
      [
        "module:react-native-dotenv",
        {
          moduleName: "@env",
          path: ".env",
          blacklist: null,
          whitelist: null,
          safe: false,
          allowUndefined: true,
        },
      ],
    ],
  };
};