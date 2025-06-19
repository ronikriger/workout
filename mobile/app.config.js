export default {
    "expo": {
        "name": "RepRight",
        "slug": "repright-mobile",
        "version": "1.0.0",
        "orientation": "portrait",
        "userInterfaceStyle": "dark",
        "splash": {
            "image": "./assets/splash.png",
            "resizeMode": "contain",
            "backgroundColor": "#000000"
        },
        "assetBundlePatterns": [
            "**/*"
        ],
        "ios": {
            "supportsTablet": true,
            "bundleIdentifier": "com.repright.mobile"
        },
        "android": {
            "adaptiveIcon": {
                "foregroundImage": "./assets/adaptive-icon.png",
                "backgroundColor": "#000000"
            },
            "package": "com.repright.workoutanalyzer",
            "permissions": [
                "CAMERA",
                "RECORD_AUDIO"
            ]
        },
        "web": {
            "favicon": "./assets/favicon.png"
        },
        "plugins": [
            [
                "expo-camera",
                {
                    "cameraPermission": "Allow $(PRODUCT_NAME) to access your camera to record workouts.",
                    "microphonePermission": "Allow $(PRODUCT_NAME) to access your microphone to record workout videos.",
                    "recordAudioAndroid": true
                }
            ]
        ],
        "extra": {
            "ngrokUrl": "https://32ee-108-5-4-98.ngrok-free.app"
        },
        "scheme": "repright"
    }
};
