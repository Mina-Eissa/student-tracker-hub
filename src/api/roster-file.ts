import * as XLSX from "xlsx";
import { ApiError } from "./http";
import type { StudentInput } from "./students.api";

/**
 * Parse a CSV / XLSX roster file into student rows.
 *
 * Accepted headers (case-insensitive, spaces or underscores):
 *   first name | middle name | last name | student id (or code / student code)
 * A single "name" / "full name" column is also accepted and split on spaces.
 */
export async function parseRosterFile(file: File): Promise<StudentInput[]> {
  const buffer = await file.arrayBuffer();
  const book = XLSX.read(buffer, { type: "array" });
  const sheetName = book.SheetNames[0];
  const sheet = sheetName ? book.Sheets[sheetName] : undefined;
  if (!sheet) throw new ApiError("The file has no readable sheet");

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  if (rows.length === 0) throw new ApiError("The file is empty");

  const out: StudentInput[] = [];
  for (const row of rows) {
    const get = (...keys: string[]) => {
      for (const [rawKey, value] of Object.entries(row)) {
        const key = rawKey.toLowerCase().replace(/[\s_-]+/g, "");
        if (keys.includes(key)) return String(value ?? "").trim();
      }
      return "";
    };

    let first = get("firstname", "first", "givenname");
    let middle = get("middlename", "middle");
    let last = get("lastname", "last", "surname", "familyname");
    const code = get("studentid", "studentcode", "code", "id");

    if (!first) {
      const whole = get("name", "fullname", "studentname");
      if (whole) {
        const parts = whole.split(/\s+/);
        first = parts[0] ?? "";
        last = parts.length > 2 ? parts.slice(2).join(" ") : (parts[1] ?? "");
        middle = parts.length > 2 ? (parts[1] ?? "") : "";
      }
    }

    if (!first) continue;
    out.push({
      first_name: first,
      middle_name: middle || null,
      last_name: last || null,
      student_code: code || null,
    });
  }

  if (out.length === 0)
    throw new ApiError("No students found — expected columns: First Name, Middle Name, Last Name, Student ID");
  return out;
}
