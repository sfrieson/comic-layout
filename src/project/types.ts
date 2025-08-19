import { z } from "zod/v4";

export const serializedArtboardSchema = z.object({
  type: z.literal("artboard"),
  id: z.string(),
  width: z.number(),
  height: z.number(),
});

export type SerializedArtboard = z.infer<typeof serializedArtboardSchema>;

export const serializedPageSchema = z.object({
  type: z.literal("page"),
  id: z.string(),
  name: z.string(),
  artboard: z.string(),
});

export type SerializedPage = z.infer<typeof serializedPageSchema>;

export const serializedNodeSchema = z.discriminatedUnion("type", [
  serializedPageSchema,
  serializedArtboardSchema,
]);

export type SerializedNode = z.infer<typeof serializedNodeSchema>;

export const serializedProjectSchema = z.object({
  pages: z.array(z.string()),
  nodes: z.array(serializedNodeSchema),
  meta: z.object({
    name: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    version: z.number(),
  }),
});

export type SerializedProject = z.infer<typeof serializedProjectSchema>;
