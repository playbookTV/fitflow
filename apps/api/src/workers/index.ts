import { workersEnabled } from "../lib/background-jobs";

if (workersEnabled()) {
    require("../workers/workoutProcessor");
    console.log("✅ FitFlow workers started");
} else {
    console.log("[Startup] Worker process started with workers disabled");
}
