import test from "node:test";
import assert from "node:assert/strict";
import { parseBookmarks } from "./bookmarks.ts";
const allowed = new Set(["pods", "service", "api"]);
test("saved concepts retain prior valid selections and reject unknown entries", () => {
  assert.deepEqual(
    parseBookmarks(
      '["pods","service","pods","not-a-concept",null,42]',
      allowed,
    ),
    ["pods", "service"],
  );
});
test("malformed, non-array, or oversized saved data has a bounded fallback", () => {
  for (const raw of ["{", "null", "{}", '"pods"', " ".repeat(20001)])
    assert.deepEqual(parseBookmarks(raw, allowed), []);
});
