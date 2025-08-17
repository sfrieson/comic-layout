export interface Artboard {
  name: string;
  width: number;
  height: number;
}

export interface Page {
  name: string;
  artboard: Artboard;
}

export interface Project {
  name: string;
  pages: Page[];
}
