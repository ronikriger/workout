export default {
    expo: {
        name: "RepRight",
        slug: "repright-workout-analyzer",
        version: "1.0.0",
        orientation: "portrait",
        icon: "./assets/icon.png",
        userInterfaceStyle: "automatic",
        splash: {
            image: "./assets/splash.png",
            resizeMode: "contain",
            backgroundColor: "#1a1a1a"
        },
        assetBundlePatterns: [
            "**/*"
        ],
        ios: {
            supportsTablet: false,
            bundleIdentifier: "com.repright.workoutanalyzer",
            infoPlist: {
                NSCameraUsageDescription: "RepRight needs camera access to analyze your workout form in real-time.",
                NSMicrophoneUsageDescription: "RepRight uses microphone for video recording during workouts."
            }
        },
        android: {
            adaptiveIcon: {
                foregroundImage: "./assets/adaptive-icon.png",
                backgroundColor: "#1a1a1a"
            },
            package: "com.repright.workoutanalyzer",
            permissions: [
                "CAMERA",
                "RECORD_AUDIO",
                "WRITE_EXTERNAL_STORAGE",
                "READ_EXTERNAL_STORAGE"
            ]
        },
        web: {
            favicon: "./assets/favicon.png",
            bundler: "metro"
        },
        plugins: [
            [
                "expo-camera",
                {
                    cameraPermission: "Allow $(PRODUCT_NAME) to access your camera to record workouts.",
                    microphonePermission: "Allow $(PRODUCT_NAME) to access your microphone to record workout videos.",
                    recordAudioAndroid: true
                }
            ],
            "expo-av"
        ],
        extra: {
            eas: {
                projectId: "repright-workout-analyzer"
            }
        },
        scheme: "repright"
    }
}; 