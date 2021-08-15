import {
  BaseFilter,
  Candidate,
  Context,
  DdcOptions,
  FilterOptions,
  SourceOptions,
} from "https://deno.land/x/ddc_vim@v0.0.14/types.ts#^";
import {
  assertEquals,
  Denops,
  fn,
} from "https://deno.land/x/ddc_vim@v0.0.14/deps.ts#^";

function overlapLength(left: string, nextInputWords: string[]): number {
  let pos = nextInputWords.length;
  while (pos > 0 && !left.endsWith(nextInputWords.slice(0, pos).join(""))) {
    pos -= 1;
  }
  return nextInputWords.slice(0, pos).join("").length;
}

export class Filter extends BaseFilter {
  async filter(
    denops: Denops,
    context: Context,
    _options: DdcOptions,
    _sourceOptions: SourceOptions,
    _filterOptions: FilterOptions,
    _filterParams: Record<string, unknown>,
    _completeStr: string,
    candidates: Candidate[],
  ): Promise<Candidate[]> {
    if (context.nextInput == "") {
      return candidates;
    }

    const nextInputWords = context.nextInput.split(/([a-zA-Z_]\w*|\W)/).filter((
      v,
    ) => v != "");

    // Skip parentheses if close parentheses is found after cursor.
    const curPos = (await fn.getcurpos(denops)).slice(1, 3) as number[];
    let checkPairs = [];

    async function searchPairs(begin: string, end: string): Promise<boolean> {
      const pairPos =
        (await fn.searchpairpos(denops, begin, "", end, "nW")) as number[];
      return context.input.includes(begin) && curPos < pairPos &&
          curPos[0] == pairPos[0];
    }
    if (await searchPairs("(", ")")) {
      checkPairs.push(["(", ")"]);
    }
    if (await searchPairs("[", "]")) {
      checkPairs.push(["[", "]"]);
    }

    for (const candidate of candidates) {
      const word = candidate.word;
      const overlap = overlapLength(word, nextInputWords);

      // Check parentheses
      let skip = false;
      for (const pair of checkPairs) {
        if (
          word.includes(pair[0]) &&
          word.slice(0, -overlap).includes(pair[1])
        ) {
          skip = true;
          break;
        }
      }
      if (skip) {
        continue;
      }

      if (!("abbr" in candidate)) {
        candidate.abbr = word;
      }
      candidate.word = word.slice(0, -overlap);
    }

    return candidates;
  }
}

Deno.test("overlapLength", () => {
  assertEquals(overlapLength("date", ["te"]), 2);
});
