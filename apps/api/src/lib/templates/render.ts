import { TemplateId, ChannelType, TemplateRenderResult } from "@fitflow/shared";
import { getTemplate } from "./registry";

/**
 * Render a template for a given channel with the provided context.
 * Pure function: no side effects, no DB calls.
 */
export function renderTemplate(
    templateId: TemplateId,
    channel: ChannelType,
    context: Record<string, any>
): TemplateRenderResult {
    const template = getTemplate(templateId);
    return template.channels[channel].render(context);
}
