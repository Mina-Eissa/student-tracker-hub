import * as XLSX from "xlsx";
import { ApiError } from "./http";
import type { StudentInput } from "./students.api";

const norm = (s: string) =>
  s
    .replace(/^\uFEFF/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

const FIRST = ["firstname", "first", "givenname", "fname"];
const MIDDLE = ["middlename", "middle", "mname"];
const LAST = ["lastname", "last", "surname", "familyname", "lname"];
const CODE = ["studentid", "studentcode", "code", "id", "number", "no"];
const WHOLE = ["name", "fullname", "studentname", "student"];

function splitWhole(whole: string): Pick<StudentInput, "first_name" | "middle_name" | "last_name"> {
  const parts = whole.split(/\s+/).filter(Boolean);
  return {
    first_name: parts[0] ?? "",
    middle_name: parts.length > 2 ? parts.slice(1, -1).join(" ") : null,
    last_name: parts.length > 1 ? (parts[parts.length - 1] ?? null) : null,
  };
}

/**
 * Parse a CSV / XLSX roster file into student rows.
 *
 * Accepted headers (case-insensitive, any spacing/punctuation):
 *   first name | middle name | last name | student id (or code / student code)
 * A single "name" / "full name" column is accepted and split on spaces.
 * Files with no header row at all are read positionally:
 *   col1 = name (or first), col2 = middle, col3 = last, col4 = student id.
 */
export async function parseRosterFile(file: File): Promise<StudentInput[]> {
  let book: XLSX.WorkBook;
  try {
    book = XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: "array" });
  } catch {
    throw new ApiError(`Could not read "${file.name}" — save it as .csv or .xlsx and try again`);
  }

  const sheetName = book.SheetNames[0];
  const sheet = sheetName ? book.Sheets[sheetName] : undefined;
  if (!sheet) throw new ApiError("The file has no readable sheet");

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false });
  const rows = matrix.filter((r) => r.some((c) => String(c ?? "").trim() !== ""));
  if (rows.length === 0) throw new ApiError("The file is empty");

  const header = (rows[0] ?? []).map((c) => norm(String(c ?? "")));
  const findCol = (keys: string[]) => header.findIndex((h) => keys.includes(h));
  const iFirst = findCol(FIRST);
  const iMiddle = findCol(MIDDLE);
  const iLast = findCol(LAST);
  const iCode = findCol(CODE);
  const iWhole = findCol(WHOLE);
  const hasHeader = iFirst >= 0 || iWhole >= 0 || iLast >= 0;

  const body = hasHeader ? rows.slice(1) : rows;
  const at = (row: unknown[], i: number) => (i >= 0 ? String(row[i] ?? "").trim() : "");

  const out: StudentInput[] = [];
  for (const row of body) {
    let first: string;
    let middle: string | null;
    let last: string | null;
    let code: string;

    if (hasHeader) {
      first = at(row, iFirst);
      middle = at(row, iMiddle) || null;
      last = at(row, iLast) || null;
      code = at(row, iCode);
      if (!first) {
        const whole = at(row, iWhole);
        if (whole) ({ first_name: first, middle_name: middle, last_name: last } = splitWhole(whole));
      }
    } else {
      const c0 = String(row[0] ?? "").trim();
      const c1 = String(row[1] ?? "").trim();
      const c2 = String(row[2] ?? "").trim();
      code = String(row[3] ?? "").trim();
      if (!c1 && !c2 && c0.includes(" ")) {
        ({ first_name: first, middle_name: middle, last_name: last } = splitWhole(c0));
      } else {
        first = c0;
        middle = c1 || null;
        last = c2 || null;
      }
    }

    if (!first) continue;
    out.push({
      first_name: first,
      middle_name: middle,
      last_name: last,
      student_code: code || null,
    });
  }

  if (out.length === 0)
    throw new ApiError(
      `No students found in "${file.name}" — expected columns: First Name, Middle Name, Last Name, Student ID`,
    );
  return out;
}
