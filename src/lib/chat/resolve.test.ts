import assert from "node:assert/strict";
import test from "node:test";
import type { Mode } from "./corpus";
import { explicitModeOf, resolveEntities } from "./resolve";

const CASES: [string, Mode, string[], string?][] = [
  ["Compare routes 32 and 52.", "bus", ["bus-32", "bus-52"]],
  ["How many delay events does 501 Queen have?", "bus", ["streetcar-501"]],
  ["Tell me about 32 Eglinton West", "subway", ["bus-32"]],
  ["Tell me about Dufferin", "bus", ["bus-29"]],
  ["Tell me about Dufferin", "subway", ["subway-dufferin-station"]],
  ["Tell me about Dufferin", "streetcar", ["bus-29", "subway-dufferin-station"]],
  ["How busy is Dufferin station?", "bus", ["subway-dufferin-station"]],
  ["Is Line 1 worse than Line 2?", "bus", ["subway-line-1", "subway-line-2"]],
  ["How reliable is the Yonge-University line?", "bus", ["subway-line-1"]],
  ["Bloor-Danforth delays by year", "bus", ["subway-line-2"]],
  ["What about the Scarborough RT?", "subway", ["subway-line-3"]],
  ["Delays at Queen's Park", "subway", ["subway-queen-s-park-station"]],
  ["Delays at Queens Park station", "bus", ["subway-queen-s-park-station"]],
  ["St. George station causes", "subway", ["subway-st-george-station"]],
  ["How many delays does Kenedy station have?", "subway", ["subway-kennedy-station"]],
  ["Markham Road bus delays", "bus", ["bus-102"]],
  ["Which bus routes are in the top 10?", "bus", []],
  ["How many delay events in 2023?", "bus", []],
  ["What is k = 54?", "bus", []],
  ["What is the main cause of delays?", "bus", []],
  ["How late is Union?", "subway", ["subway-union-station"]],
  ["Compare 29, 32, 36, 52 and 54", "bus", ["bus-29", "bus-32", "bus-36", "bus-52"]],
  ["Delays at Dundas station", "subway", ["subway-tmu-station"]],
  ["What is its top cause?", "streetcar", ["streetcar-504"], "Tell me about 504 King."],
  ["And for 52?", "bus", ["bus-52"], "How many delay events does route 32 have?"],
  ["What about the busiest year?", "bus", ["bus-36"], "Tell me about route 36"],
  ["Route 302 delays", "bus", ["bus-302"]],
  ["asdfgh", "bus", []]
];

for (const [question, mode, expected, previous] of CASES) {
  test(`resolve "${question}" (${mode})`, () => {
    const result = resolveEntities(question, mode, previous);
    assert.deepEqual(
      result.entities.map((e) => e.file),
      expected
    );
  });
}

test("a long new question does not reuse the previous entities", () => {
  const result = resolveEntities("Which subway station has the most delay events overall in the data?", "bus", "Tell me about 504 King.");
  assert.deepEqual(result.entities, []);
});

test("mode words set the explicit mode", () => {
  assert.equal(explicitModeOf("Which subway station is worst?"), "subway");
  assert.equal(explicitModeOf("Which streetcar is worst?"), "streetcar");
  assert.equal(explicitModeOf("Compare bus 29 and Dufferin station"), null);
  assert.equal(explicitModeOf("Is Line 1 late?"), "subway");
});
