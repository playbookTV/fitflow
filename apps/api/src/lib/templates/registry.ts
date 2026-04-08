import { TemplateId, TemplateDefinition } from "@fitflow/shared";

const registry = new Map<TemplateId, TemplateDefinition>();

export function registerTemplate(template: TemplateDefinition): void {
    registry.set(template.id, template);
}

export function getTemplate(id: TemplateId): TemplateDefinition {
    const template = registry.get(id);
    if (!template) {
        throw new Error(`Template not found: ${id}`);
    }
    return template;
}

export function getAllTemplateIds(): TemplateId[] {
    return Array.from(registry.keys());
}
