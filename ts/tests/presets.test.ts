import { describe, expect, test } from "vitest";
import { EdgeContext } from "../src/edgeContext";
import {
  playground,
  pointRemoval,
  selfIntersecting,
  grid,
  tinySquare,
} from "../src/presets";

describe("presets", () => {
  test("playground preset runs without errors", () => {
    const edges = new EdgeContext(10000);
    expect(() => playground(edges)).not.toThrow();
    expect(edges.count()).toBeGreaterThan(0);
  });

  test("pointRemoval preset runs without errors", () => {
    const edges = new EdgeContext(10000);
    expect(() => pointRemoval(edges)).not.toThrow();
    expect(edges.count()).toBeGreaterThan(0);
  });

  test("selfIntersecting preset runs without errors", () => {
    const edges = new EdgeContext(1000);
    expect(() => selfIntersecting(edges)).not.toThrow();
    expect(edges.count()).toBeGreaterThan(0);
  });

  test("grid preset runs without errors", () => {
    const edges = new EdgeContext(16000); // Use almost max capacity for 50x50 grid
    expect(() => grid(edges)).not.toThrow();
    expect(edges.count()).toBeGreaterThan(0);
  });

  test("tinySquare preset runs without errors", () => {
    const edges = new EdgeContext(100);
    expect(() => tinySquare(edges)).not.toThrow();
    expect(edges.count()).toBeGreaterThan(0);
  });

  test("playground preset creates expected number of elements", () => {
    const edges = new EdgeContext(10000);
    playground(edges);

    // The playground should create a significant number of edges
    // due to all the squares, octagons, and polygons
    expect(edges.count()).toBeGreaterThan(100);
  });

  test("grid preset creates many edges", () => {
    const edges = new EdgeContext(16000); // Use almost max capacity for 50x50 grid
    grid(edges);

    // Grid creates 50x50 = 2500 squares, each with 4 edges
    // Plus the boundary square
    expect(edges.count()).toBeGreaterThan(5000);
  });

  test("presets reset the edge context properly", () => {
    const edges = new EdgeContext(1000);

    // Run one preset
    tinySquare(edges);
    const firstCount = edges.count();

    // Run another preset
    selfIntersecting(edges);
    const secondCount = edges.count();

    // The second preset should have reset and created its own structure
    expect(secondCount).not.toBe(firstCount);
  });
});
