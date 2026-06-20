import { type Context, type Item } from "@shougo/ddc-vim/types";
import { BaseFilter } from "@shougo/ddc-vim/filter";

import type { Denops } from "@denops/std";
import * as fn from "@denops/std/function";

import { assertEquals } from "@std/assert/equals";

function overlapLength(left: string, nextInputWords: string[]): number {
  // Join once to avoid repeated allocations inside the loop.
  const nextInput = nextInputWords.join("");
  let len = nextInput.length;
  for (let wordIndex = nextInputWords.length - 1; wordIndex >= 0; wordIndex--) {
    if (left.endsWith(nextInput.slice(0, len))) {
      return len;
    }
    len -= nextInputWords[wordIndex].length;
  }
  return 0;
}

type Params = Record<string, never>;

export class Filter extends BaseFilter<Params> {
  override async filter(args: {
    denops: Denops;
    context: Context;
    completeStr: string;
    items: Item[];
  }): Promise<Item[]> {
    if (args.context.nextInput == "") {
      return args.items;
    }

    const nextInputWords = args.context.nextInput.split(/([a-zA-Z_]\w*|\W)/)
      .filter((
        v,
      ) => v != "");

    if (nextInputWords.length === 0) {
      return args.items;
    }

    // Skip parentheses if close parentheses is found after cursor.
    const curPos = (await fn.getcurpos(args.denops)).slice(1, 3) as number[];
    const checkPairs: Array<[string, string]> = [];

    async function searchPairs(begin: string, end: string): Promise<boolean> {
      const pairPos = (await fn.searchpairpos(
        args.denops,
        begin,
        "",
        end,
        "nW",
        "",
        await fn.line(args.denops, "."),
      )) as number[];
      // searchpairpos returns [0, 0] when no matching pair is found.
      if (pairPos[0] === 0) return false;
      // The pair must be on the same line and after the cursor column.
      return args.context.input.includes(begin) &&
        curPos[0] === pairPos[0] &&
        curPos[1] < pairPos[1];
    }
    if (await searchPairs("(", ")")) {
      checkPairs.push(["(", ")"]);
    }
    if (await searchPairs("[", "]")) {
      checkPairs.push(["[", "]"]);
    }

    for (const item of args.items) {
      const word = item.word;
      const overlap = overlapLength(word, nextInputWords);

      // Check parentheses
      let skip = false;
      for (const pair of checkPairs) {
        if (
          overlap > 0 &&
          word.includes(pair[0]) &&
          word.slice(0, -overlap).includes(pair[1])
        ) {
          skip = true;
          break;
        }
      }
      if (skip || overlap == 0) {
        continue;
      }

      if (!("abbr" in item)) {
        item.abbr = word;
      }
      item.word = word.slice(0, -overlap);
    }

    return args.items;
  }

  override params(): Params {
    return {};
  }
}

Deno.test("overlapLength - basic suffix overlap", () => {
  assertEquals(overlapLength("date", ["te"]), 2);
});

Deno.test("overlapLength - full word overlap", () => {
  // Completing "foobar" when "bar" follows the cursor: overlap is 3.
  assertEquals(overlapLength("foobar", ["bar"]), 3);
});

Deno.test("overlapLength - no overlap", () => {
  assertEquals(overlapLength("foo", ["bar"]), 0);
});

Deno.test("overlapLength - multi-word nextInput, partial match", () => {
  // nextInputWords = ["bar", " ", "baz"], joined = "bar baz" (length 7).
  // "foobar baz" ends with "bar baz" → overlap = 7.
  assertEquals(overlapLength("foobar baz", ["bar", " ", "baz"]), 7);
});

Deno.test("overlapLength - multi-word nextInput, first word matches", () => {
  // "foobar" ends with "bar" (first word of nextInputWords) but not the full
  // "bar baz", so the overlap is 3.
  assertEquals(overlapLength("foobar", ["bar", " ", "baz"]), 3);
});

Deno.test("overlapLength - multi-word nextInput, no match", () => {
  // "hello" shares no suffix with any prefix of "bar baz".
  assertEquals(overlapLength("hello", ["bar", " ", "baz"]), 0);
});

Deno.test("overlapLength - empty nextInputWords", () => {
  assertEquals(overlapLength("foobar", []), 0);
});

Deno.test("overlapLength - empty left string", () => {
  assertEquals(overlapLength("", ["bar"]), 0);
});
