import * as z from "zod";

/**
 * Transform the result of a zod scheme to another type and validates that type against another zod scheme.
 * The result of this function basically equals inputSchema.transform((val) => outputSchema.parse(transformer(val))),
 * but errors thrown during the transformation are handled gracefully (since at the moment, zod transformers
 * do not natively support exceptions).
 */
 export function transformValidator<Output, Input1, Input2, Input3>(inputSchema: z.ZodType<Input2, any, Input1>, transformer: (input: Input2) => Input3, outputSchema: z.ZodType<Output, any, Input3>): z.ZodEffects<z.ZodEffects<z.ZodType<Input2, any, Input1>, Input2>, Output> {
    // For now we have to parse the schema twice, since transform() is not allowed to throw exceptions.
    // See https://github.com/colinhacks/zod/pull/420
    return inputSchema.superRefine((val, ctx) => {
        try {
            const result = outputSchema.safeParse(transformer(val));
            if (!result.success) {
                for (const issue of result.error.errors) {
                    ctx.addIssue(issue);
                }
            }
        } catch (err: any) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: err.message,
            });
        }
    }).transform((val) => outputSchema.parse(transformer(val)));
}