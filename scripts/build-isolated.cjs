process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "";
process.env.FIREBASE_SERVICE_ACCOUNT = "";
process.argv = [process.argv[0], require.resolve("next/dist/bin/next"), "build"];
require("next/dist/bin/next");
