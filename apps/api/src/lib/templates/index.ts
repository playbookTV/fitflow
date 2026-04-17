// Import all template category files to trigger registration
import "./lead-intake";
import "./onboarding";
import "./workout";
import "./checkin";
import "./at-risk";
import "./milestones";
import "./payments";
import "./renewals";
import "./system";
import "./meals";
import "./exercise";

// Re-export the public API
export { renderTemplate } from "./render";
export { getTemplate, getAllTemplateIds } from "./registry";
export { escapeMarkdownV2 } from "./escape";
