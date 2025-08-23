import { z } from "zod/v4";

const serializedPageSchema = z.object({
  type: z.literal("page"),
  id: z.string(),
  name: z.string(),
  width: z.number(),
  height: z.number(),
  fills: z.array(
    z.object({
      type: z.literal("color"),
      value: z.string(),
      opacity: z.number(),
    }),
  ),
  children: z.array(z.string()),
});

export type SerializedPage = z.infer<typeof serializedPageSchema>;

const serializedPathSchema = z.object({
  type: z.literal("path"),
  id: z.string(),
  points: z.array(z.object({ x: z.number(), y: z.number() })),
  closed: z.boolean(),
});

export type SerializedPath = z.infer<typeof serializedPathSchema>;

const serializedCellSchema = z.object({
  type: z.literal("cell"),
  id: z.string(),
  translation: z.object({
    x: z.number(),
    y: z.number(),
  }),
  path: serializedPathSchema,
  fills: z.array(
    z.object({
      type: z.literal("color"),
      value: z.string(),
      opacity: z.number(),
    }),
  ),
  children: z.array(z.string()),
});

export type SerializedCell = z.infer<typeof serializedCellSchema>;

const serializedNodeSchema = z.discriminatedUnion("type", [
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
