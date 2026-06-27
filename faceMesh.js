import {
    FilesetResolver,
    FaceLandmarker
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";

const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
);

window.faceLandmarker = await FaceLandmarker.createFromOptions(
    vision,
    {
        baseOptions: {
            modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
        },
        runningMode: "VIDEO",
        numFaces: 1
    }
);

console.log("✅ MediaPipe Face Mesh Loaded");
console.log(window.faceLandmarker);
console.log("GLOBAL TEST:", window.faceLandmarker);

setInterval(() => {

    const video = document.getElementById("camera");

    if (!video) return;

    const result =
        window.faceLandmarker.detectForVideo(
            video,
            performance.now()
        );

    console.log(
        "LANDMARKS:",
        result.faceLandmarks.length
    );

}, 2000);