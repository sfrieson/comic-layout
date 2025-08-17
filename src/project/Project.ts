import { Page } from "./types.js";

export class Project {
  name: string;
  pages: Page[];

  constructor(name = "New Project", pages: Page[] = []) {
    this.name = name;
    this.pages = pages;
  }
}
