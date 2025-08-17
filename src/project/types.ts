import { z } from "zod/v4";

export const serializedArtboardSchema = z.object({
  id: z.string(),
  width: z.number(),
  height: z.number(),
});

export type SerializedArtboard = z.infer<typeof serializedArtboardSchema>;

export const serializedPageSchema = z.object({
  id: z.string(),
  name: z.string(),
  artboard: serializedArtboardSchema,
});

export type SerializedPage = z.infer<typeof serializedPageSchema>;

export const serializedProjectSchema = z.object({
  name: z.string(),
  pages: z.array(serializedPageSchema),
  meta: z.object({
    createdAt: z.string(),
    updatedAt: z.string(),
    version: z.number(),
  }),
});

export type SerializedProject = z.infer<typeof serializedProjectSchema>;

export interface Project extends SerializedProject {
  pageWidth: number;
  pageHeight: number;
}
