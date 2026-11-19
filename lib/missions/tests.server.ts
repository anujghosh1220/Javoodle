import "server-only";

/**
 * Hidden mission test cases — SERVER ONLY.
 * Never import this from client components; expected outputs must not
 * reach the browser bundle.
 */

export interface MissionTest {
  stdin: string;
  expected: string;
}

export const MISSION_TESTS: Record<string, MissionTest[]> = {
  "1b2c3d4e-5f60-4a7b-8c9d-0e1f2a3b4c01": [ // prime-guardian
    { stdin: "7\n", expected: "PRIME" },
    { stdin: "1\n", expected: "COMPOSITE" },
    { stdin: "97\n", expected: "PRIME" },
    { stdin: "100\n", expected: "COMPOSITE" },
    { stdin: "2\n", expected: "PRIME" },
  ],
  "2b2c3d4e-5f60-4a7b-8c9d-0e1f2a3b4c02": [ // digit-sum
    { stdin: "12345\n", expected: "15" },
    { stdin: "0\n", expected: "0" },
    { stdin: "999\n", expected: "27" },
    { stdin: "-42\n", expected: "6" },
  ],
  "3b2c3d4e-5f60-4a7b-8c9d-0e1f2a3b4c03": [ // fizz-buzz-custom (a=3,b=5)
    { stdin: "3 5\n", expected: "1\n2\nFIZZ\n4\nBUZZ\nFIZZ\n7\n8\nFIZZ\nBUZZ\n11\nFIZZ\n13\n14\nFIZZBUZZ\n16\n17\nFIZZ\n19\nBUZZ" },
    { stdin: "2 4\n", expected: "1\nBUZZ\nFIZZBUZZ\n7\nBUZZ\nFIZZBUZZ\n13\nBUZZ\nFIZZBUZZ\n19\nBUZZ" },
  ],
  "4b2c3d4e-5f60-4a7b-8c9d-0e1f2a3b4c04": [ // array-extremes
    { stdin: "5\n12 7 19 3 15\n", expected: "19 3" },
    { stdin: "1\n42\n", expected: "42 42" },
    { stdin: "4\n-5 0 -9 2\n", expected: "2 -9" },
  ],
  "5b2c3d4e-5f60-4a7b-8c9d-0e1f2a3b4c05": [ // palindrome-check
    { stdin: "level\n", expected: "YES" },
    { stdin: "hello\n", expected: "NO" },
    { stdin: "a\n", expected: "YES" },
    { stdin: "racecar\n", expected: "YES" },
  ],
  "6b2c3d4e-5f60-4a7b-8c9d-0e1f2a3b4c06": [ // armstrong-number
    { stdin: "153\n", expected: "ARMSTRONG" },
    { stdin: "370\n", expected: "ARMSTRONG" },
    { stdin: "123\n", expected: "NOT-ARMSTRONG" },
    { stdin: "9474\n", expected: "ARMSTRONG" },
    { stdin: "10\n", expected: "NOT-ARMSTRONG" },
  ],
  "7b2c3d4e-5f60-4a7b-8c9d-0e1f2a3b4c07": [ // bubble-sort-visual
    { stdin: "6\n5 2 9 1 7 3\n", expected: "1 2 3 5 7 9" },
    { stdin: "1\n5\n", expected: "5" },
    { stdin: "4\n4 3 2 1\n", expected: "1 2 3 4" },
  ],
  "8b2c3d4e-5f60-4a7b-8c9d-0e1f2a3b4c08": [ // frequency-counter
    { stdin: "mississippi\n", expected: "m 0\ni 4\ns 4\np 2\na 0\nb 0\nc 0\nd 0\ne 0\nf 0\ng 0\nh 0\nj 0\nk 0\nl 0\nn 0\no 0\nq 0\nr 0\nt 0\nu 0\nv 0\nw 0\nx 0\ny 0\nz 0" },
    { stdin: "abc\n", expected: "a 1\nb 1\nc 1\nd 0\ne 0\nf 0\ng 0\nh 0\ni 0\nj 0\nk 0\nl 0\nm 0\nn 0\no 0\np 0\nq 0\nr 0\ns 0\nt 0\nu 0\nv 0\nw 0\nx 0\ny 0\nz 0" },
  ],
  "9b2c3d4e-5f60-4a7b-8c9d-0e1f2a3b4c09": [ // method-overloader
    { stdin: "", expected: "42 INT\n3.14 DOUBLE\nhello STRING" },
  ],
  "ab2c3d4e-5f60-4a7b-8c9d-0e1f2a3b4c0a": [ // class-encapsulation
    { stdin: "", expected: "INSUFFICIENT\n1150.50" },
  ],
};
