import "../instrument";
import { workersEnabled } from "../lib/background-jobs";

if (workersEnabled()) {
    require("../workers/workoutProcessor");
    require("../workers/engagementWorker");
    require("../workers/importHandoffWorker");
    console.log("✅ FitFlow workers started (workout + engagement + import-handoff)");
} else {
    console.log("[Startup] Worker process started with workers disabled");
}
