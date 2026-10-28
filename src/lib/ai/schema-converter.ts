import { z } from 'zod';

/**
 * Converts a Zod schema into an OpenAPI 3.0 / Gemini SchemaUnion object
 * for Gemini's structured output mode (constrained decoding).
 */
export function zodToGeminiSchema(schema: z.ZodTypeAny): any {
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
    return zodToGeminiSchema(schema.unwrap());
  }
  if (schema instanceof z.ZodDefault) {
    return zodToGeminiSchema(schema.removeDefault());
  }
  if (schema instanceof z.ZodEffects) {
    return zodToGeminiSchema(schema.innerType());
  }
  if (schema instanceof z.ZodString) {
    return { type: 'STRING' };
  }
  if (schema instanceof z.ZodNumber) {
    return { type: 'NUMBER' };
  }
  if (schema instanceof z.ZodBoolean) {
    return { type: 'BOOLEAN' };
  }
  if (schema instanceof z.ZodEnum) {
    return { type: 'STRING', enum: [...schema.options] };
  }
  if (schema instanceof z.ZodArray) {
    return {
      type: 'ARRAY',
      items: zodToGeminiSchema(schema.element),
    };
  }
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    const properties: Record<string, any> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      properties[key] = zodToGeminiSchema(value as z.ZodTypeAny);
      if (!(value instanceof z.ZodOptional) && !(value instanceof z.ZodNullable)) {
        required.push(key);
      }
    }

    return {
      type: 'OBJECT',
      properties,
      required: required.length > 0 ? required : undefined,
    };
  }
  if (schema instanceof z.ZodUnion) {
    const options = schema.options as z.ZodTypeAny[];
    if (options.length > 0) {
      return zodToGeminiSchema(options[0]);
    }
    return { type: 'OBJECT' };
  }
  return { type: 'OBJECT' };
}

/**
 * Generates an example JSON skeleton adhering to the exact field names of a Zod schema.
 * Used in Groq JSON mode to guide models towards the strict field layout.
 */
export function generateSchemaSkeleton(schema: z.ZodTypeAny): any {
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
    return generateSchemaSkeleton(schema.unwrap());
  }
  if (schema instanceof z.ZodDefault) {
    return generateSchemaSkeleton(schema.removeDefault());
  }
  if (schema instanceof z.ZodEffects) {
    return generateSchemaSkeleton(schema.innerType());
  }
  if (schema instanceof z.ZodString) {
    return 'string';
  }
  if (schema instanceof z.ZodNumber) {
    return 0;
  }
  if (schema instanceof z.ZodBoolean) {
    return false;
  }
  if (schema instanceof z.ZodEnum) {
    return schema.options[0];
  }
  if (schema instanceof z.ZodArray) {
    return [generateSchemaSkeleton(schema.element)];
  }
  if (schema instanceof z.ZodObject) {
    const res: Record<string, any> = {};
    for (const [key, val] of Object.entries(schema.shape)) {
      res[key] = generateSchemaSkeleton(val as z.ZodTypeAny);
    }
    return res;
  }
  if (schema instanceof z.ZodUnion) {
    return generateSchemaSkeleton(schema.options[0]);
  }
  return {};
}
