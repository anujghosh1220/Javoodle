import { describe, it, expect } from "vitest";
import { normalizeStudentName, StudentNameTakenError } from "@/lib/student/name";

describe("normalizeStudentName", () => {
  it("trims and lowercases", () => {
    expect(normalizeStudentName(" Anuj ")).toBe("anuj");
    expect(normalizeStudentName("ANUJ")).toBe("anuj");
  });
  it("collapses internal whitespace", () => {
    expect(normalizeStudentName("Anuj   Ghosh")).toBe("anuj ghosh");
    expect(normalizeStudentName("  Anuj\t Ghosh  ")).toBe("anuj ghosh");
  });
  it("treats case/space variants as equal", () => {
    expect(normalizeStudentName(" anuj ")).toBe(normalizeStudentName("Anuj"));
    expect(normalizeStudentName("Anuj Ghosh")).not.toBe(normalizeStudentName("Anuj"));
  });
});

describe("StudentNameTakenError", () => {
  it("is a distinct error type", () => {
    const e = new StudentNameTakenError();
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe("StudentNameTakenError");
  });
});
