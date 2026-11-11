import { describe, expect, it } from "vitest";
import { validateRockName } from "./prueba";

describe("validateRockName", () => {
    it("acepta nombres válidos", () => {
        expect(validateRockName("Granito")).toBe(true);
    });

    it("rechaza nombres vacíos", () => {
        expect(validateRockName("")).toBe(false);
    });

    it("rechaza nombres de menos de 3 caracteres", () => {
        expect(validateRockName("AB")).toBe(false);
    });

    it("ignora espacios al validar", () => {
        expect(validateRockName("  ")).toBe(false);
    });
});
