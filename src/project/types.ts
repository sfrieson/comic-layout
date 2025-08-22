import { z } from "zod/v4";

export const serializedPageSchema = z.object({
  type: z.literal("page"),
  id: z.string(),
  name: z.string(),
  width: z.number(),
  height: z.number(),
});

export type SerializedPage = z.infer<typeof serializedPageSchema>;

export const serializedCellSchema = z.object({
  type: z.literal("cell"),
  id: z.string(),
  translation: z.object({
    x: z.number(),
    y: z.number(),
  }),
});

export type SerializedCell = z.infer<typeof serializedCellSchema>;

export const serializedNodeSchema = z.discriminatedUnion("type", [
  serializedPageSchema,
  serializedCellSchema,
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
