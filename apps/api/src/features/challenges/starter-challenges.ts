import {
  challengeValuesEqual,
  type ChallengeCase,
  type ChallengeDifficulty,
} from "@coddle/shared";
import { runChallengeCode } from "./challenge-runner.js";

export type StarterChallenge = {
  slug: string;
  title: string;
  summary: string;
  statement: string;
  difficulty: ChallengeDifficulty;
  functionName: string;
  starterCode: string;
  points: number;
  examples: ChallengeCase[];
  tests: ChallengeCase[];
  solution: string;
};

export const STARTER_CHALLENGES: StarterChallenge[] = [
  {
    slug: "sum-array",
    title: "Sum an array",
    summary: "Add every number in a list, including the empty case.",
    statement: `Write \`sumArray(nums)\` so it returns the sum of every number in the array.

An empty array sums to \`0\`.`,
    difficulty: "easy",
    functionName: "sumArray",
    points: 40,
    starterCode: `function sumArray(nums) {
  return 0;
}
`,
    examples: [
      { args: [[1, 2, 3]], expected: 6 },
      { args: [[]], expected: 0 },
    ],
    tests: [
      { args: [[-2, 5, -1]], expected: 2 },
      { args: [[10]], expected: 10 },
      { args: [[1, 1, 1, 1]], expected: 4 },
    ],
    solution: `function sumArray(nums) {
  return nums.reduce((total, value) => total + value, 0);
}
`,
  },
  {
    slug: "is-palindrome",
    title: "Phrase palindrome",
    summary: "Decide whether a phrase reads the same after you ignore noise.",
    statement: `Write \`isPalindrome(text)\` so it returns \`true\` when the text reads the same forwards and backwards.

Ignore letter case, spaces, and punctuation. Only letters and digits count.`,
    difficulty: "easy",
    functionName: "isPalindrome",
    points: 40,
    starterCode: `function isPalindrome(text) {
  return false;
}
`,
    examples: [
      { args: ["racecar"], expected: true },
      { args: ["hello"], expected: false },
    ],
    tests: [
      { args: ["A man, a plan, a canal: Panama"], expected: true },
      { args: ["race a car"], expected: false },
      { args: [""], expected: true },
    ],
    solution: `function isPalindrome(text) {
  const cleaned = String(text).toLowerCase().replace(/[^a-z0-9]/g, "");
  return cleaned === cleaned.split("").reverse().join("");
}
`,
  },
  {
    slug: "fizz-buzz",
    title: "Fizz buzz list",
    summary: "Build the classic list from 1 through n.",
    statement: `Write \`fizzBuzz(n)\` so it returns an array of strings from 1 through \`n\`.

- Multiples of 3 are \`"Fizz"\`.
- Multiples of 5 are \`"Buzz"\`.
- Multiples of both are \`"FizzBuzz"\`.
- Every other number is its decimal representation.`,
    difficulty: "easy",
    functionName: "fizzBuzz",
    points: 50,
    starterCode: `function fizzBuzz(n) {
  return [];
}
`,
    examples: [
      { args: [5], expected: ["1", "2", "Fizz", "4", "Buzz"] },
    ],
    tests: [
      { args: [1], expected: ["1"] },
      {
        args: [15],
        expected: [
          "1",
          "2",
          "Fizz",
          "4",
          "Buzz",
          "Fizz",
          "7",
          "8",
          "Fizz",
          "Buzz",
          "11",
          "Fizz",
          "13",
          "14",
          "FizzBuzz",
        ],
      },
    ],
    solution: `function fizzBuzz(n) {
  const out = [];
  for (let i = 1; i <= n; i += 1) {
    if (i % 15 === 0) out.push("FizzBuzz");
    else if (i % 3 === 0) out.push("Fizz");
    else if (i % 5 === 0) out.push("Buzz");
    else out.push(String(i));
  }
  return out;
}
`,
  },
  {
    slug: "two-sum",
    title: "Two sum",
    summary: "Find the pair of indices that adds up to a target.",
    statement: `Write \`twoSum(nums, target)\` so it returns the indices of the two numbers that add up to \`target\`.

There is exactly one solution, and you may not use the same index twice. Return the indices in ascending order.`,
    difficulty: "medium",
    functionName: "twoSum",
    points: 90,
    starterCode: `function twoSum(nums, target) {
  return [];
}
`,
    examples: [
      { args: [[2, 7, 11, 15], 9], expected: [0, 1] },
    ],
    tests: [
      { args: [[3, 2, 4], 6], expected: [1, 2] },
      { args: [[3, 3], 6], expected: [0, 1] },
    ],
    solution: `function twoSum(nums, target) {
  const seen = new Map();
  for (let index = 0; index < nums.length; index += 1) {
    const need = target - nums[index];
    if (seen.has(need)) return [seen.get(need), index];
    seen.set(nums[index], index);
  }
  return [];
}
`,
  },
  {
    slug: "valid-parentheses",
    title: "Valid parentheses",
    summary: "Check that every bracket closes in the right order.",
    statement: `Write \`isValid(text)\` so it returns \`true\` when every bracket is closed in the right order.

The pairs are \`()\`, \`[]\`, and \`{}\`. An empty string is valid.`,
    difficulty: "medium",
    functionName: "isValid",
    points: 100,
    starterCode: `function isValid(text) {
  return false;
}
`,
    examples: [
      { args: ["()"], expected: true },
      { args: ["(]"], expected: false },
      { args: ["{[]}"], expected: true },
    ],
    tests: [
      { args: ["([)]"], expected: false },
      { args: [""], expected: true },
      { args: ["((("], expected: false },
      { args: ["()[]{}"], expected: true },
    ],
    solution: `function isValid(text) {
  const pairs = { ")": "(", "]": "[", "}": "{" };
  const stack = [];
  for (const ch of text) {
    if (ch === "(" || ch === "[" || ch === "{") stack.push(ch);
    else if (pairs[ch]) {
      if (stack.pop() !== pairs[ch]) return false;
    }
  }
  return stack.length === 0;
}
`,
  },
  {
    slug: "group-anagrams",
    title: "Group anagrams",
    summary: "Cluster words that are made of the same letters.",
    statement: `Write \`groupAnagrams(words)\` so it groups words that use the same letters.

Sort the words inside each group alphabetically, then sort the groups by their first word. Matching is case-sensitive.`,
    difficulty: "hard",
    functionName: "groupAnagrams",
    points: 160,
    starterCode: `function groupAnagrams(words) {
  return [];
}
`,
    examples: [
      {
        args: [["eat", "tea", "tan", "ate", "nat", "bat"]],
        expected: [
          ["ate", "eat", "tea"],
          ["bat"],
          ["nat", "tan"],
        ],
      },
    ],
    tests: [
      { args: [["a"]], expected: [["a"]] },
      {
        args: [["abc", "bca", "xyz"]],
        expected: [
          ["abc", "bca"],
          ["xyz"],
        ],
      },
      {
        args: [["ab", "ba", "cd", "dc"]],
        expected: [
          ["ab", "ba"],
          ["cd", "dc"],
        ],
      },
    ],
    solution: `function groupAnagrams(words) {
  const groups = new Map();
  for (const word of words) {
    const key = word.split("").sort().join("");
    const list = groups.get(key) ?? [];
    list.push(word);
    groups.set(key, list);
  }
  return [...groups.values()]
    .map((group) => group.slice().sort())
    .sort((left, right) => left[0].localeCompare(right[0]));
}
`,
  },
  {
    slug: "longest-unique",
    title: "Longest unique substring",
    summary: "Measure the longest stretch with no repeated character.",
    statement: `Write \`longestUnique(text)\` so it returns the length of the longest substring with no repeated characters.

A substring is a contiguous run of characters. An empty string has length \`0\`.`,
    difficulty: "hard",
    functionName: "longestUnique",
    points: 180,
    starterCode: `function longestUnique(text) {
  return 0;
}
`,
    examples: [
      { args: ["abcabcbb"], expected: 3 },
      { args: ["bbbbb"], expected: 1 },
      { args: [""], expected: 0 },
    ],
    tests: [
      { args: ["pwwkew"], expected: 3 },
      { args: ["dvdf"], expected: 3 },
      { args: ["au"], expected: 2 },
      { args: ["aab"], expected: 2 },
    ],
    solution: `function longestUnique(text) {
  const last = new Map();
  let start = 0;
  let best = 0;
  for (let index = 0; index < text.length; index += 1) {
    const prev = last.get(text[index]);
    if (prev !== undefined && prev >= start) start = prev + 1;
    last.set(text[index], index);
    best = Math.max(best, index - start + 1);
  }
  return best;
}
`,
  },
];

/** Fail the seed if a reference solution no longer passes its own tests. */
export async function verifyStarterChallenges(): Promise<void> {
  for (const challenge of STARTER_CHALLENGES) {
    const cases = [...challenge.examples, ...challenge.tests];
    const run = await runChallengeCode({
      code: challenge.solution,
      functionName: challenge.functionName,
      cases: cases.map((item) => ({ args: item.args })),
    });
    if (!run.ok) {
      throw new Error(`${challenge.slug} solution failed to run: ${run.error}`);
    }
    if (run.cases.length !== cases.length) {
      throw new Error(`${challenge.slug} returned ${run.cases.length} results for ${cases.length} cases`);
    }
    cases.forEach((test, index) => {
      const row = run.cases[index];
      if (!row || row.error || row.actualJson == null) {
        throw new Error(`${challenge.slug} case ${index} error: ${row?.error ?? "no result"}`);
      }
      const actual = JSON.parse(row.actualJson) as unknown;
      if (!challengeValuesEqual(actual, test.expected)) {
        throw new Error(
          `${challenge.slug} case ${index} expected ${JSON.stringify(test.expected)} but got ${row.actualJson}`,
        );
      }
    });
  }
}
