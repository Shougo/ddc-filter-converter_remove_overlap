import { type Context, type Item } from "jsr:@shougo/ddc-vim@~7.0.0/types";
import { BaseFilter } from "jsr:@shougo/ddc-vim@~7.0.0/filter";

import type { Denops } from "jsr:@denops/core@~7.0.0";
import * as fn from "jsr:@denops/std@~7.1.1/function";

import { assertEquals } from "jsr:@std/assert@~1.0.3/equals";

function overlapLength(left: string, nextInputWords: string[]): number {
  let pos = nextInputWords.length;
  while (pos > 0 && !left.endsWith(nextInputWords.slice(0, pos).join(""))) {
    pos -= 1;
  }
  return nextInputWords.slice(0, pos).join("").length;
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
    const checkPairs = [];

    async function searchPairs(begin: string, end: string): Promise<boolean> {
      const pairPos =
        (await fn.searchpairpos(args.denops, begin, "", end, "nW")) as number[];
      return args.context.input.includes(begin) && curPos < pairPos &&
        curPos[0] == pairPos[0];
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

Deno.test("overlapLength", () => {
  assertEquals(overlapLength("date", ["te"]), 2);
});
