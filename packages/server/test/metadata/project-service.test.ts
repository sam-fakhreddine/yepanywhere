import * as fs from "node:fs/promises";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ProjectMetadataService } from "../../src/metadata/ProjectMetadataService.js";

describe("ProjectMetadataService", () => {
  let tempDir: string;
  let service: ProjectMetadataService;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join("/tmp", "project-metadata-test-"));
    service = new ProjectMetadataService({ dataDir: tempDir });
    await service.initialize();
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("initialize", () => {
    it("creates data directory and starts with empty state", async () => {
      const projects = service.getAllProjects();
      expect(projects).toEqual({});
    });

    it("loads existing state from disk", async () => {
      // Add a project
      await service.addProject("test-id", "/test/path");

      // Create a new service instance with the same data dir
      const newService = new ProjectMetadataService({ dataDir: tempDir });
      await newService.initialize();

      const projects = newService.getAllProjects();
      expect(projects["test-id"]).toBeDefined();
      expect(projects["test-id"].path).toBe("/test/path");
    });
  });

  describe("addProject", () => {
    it("adds a project with path and timestamp", async () => {
      await service.addProject("proj-1", "/home/user/code/project1");

      const metadata = service.getMetadata("proj-1");
      expect(metadata).toBeDefined();
      expect(metadata?.path).toBe("/home/user/code/project1");
      expect(metadata?.addedAt).toBeDefined();
    });

    it("persists project to disk", async () => {
      await service.addProject("proj-1", "/home/user/code/project1");

      // Read the file directly
      const content = await fs.readFile(
        path.join(tempDir, "project-metadata.json"),
        "utf-8",
      );
      const parsed = JSON.parse(content);
      expect(parsed.projects["proj-1"]).toBeDefined();
    });
  });

  describe("removeProject", () => {
    it("removes a project from the list", async () => {
      await service.addProject("proj-1", "/path1");
      await service.addProject("proj-2", "/path2");

      await service.removeProject("proj-1");

      expect(service.getMetadata("proj-1")).toBeUndefined();
      expect(service.getMetadata("proj-2")).toBeDefined();
    });
  });

  describe("isAddedProject", () => {
    it("returns true for added projects", async () => {
      await service.addProject("proj-1", "/path1");

      expect(service.isAddedProject("proj-1")).toBe(true);
      expect(service.isAddedProject("proj-2")).toBe(false);
    });
  });

  describe("getAllProjects", () => {
    it("returns all added projects", async () => {
      await service.addProject("proj-1", "/path1");
      await service.addProject("proj-2", "/path2");

      const projects = service.getAllProjects();
      expect(Object.keys(projects)).toHaveLength(2);
      expect(projects["proj-1"].path).toBe("/path1");
      expect(projects["proj-2"].path).toBe("/path2");
    });
  });
});
