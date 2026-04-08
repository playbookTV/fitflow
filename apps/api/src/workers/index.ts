import { workersEnabled } from "../lib/background-jobs";

if (workersEnabled()) {
    require("../workers/workoutProcessor");
    require("../workers/engagementWorker");
    console.log("✅ FitFlow workers started (workout + engagement)");
} else {
    console.log("[Startup] Worker process started with workers disabled");
}
