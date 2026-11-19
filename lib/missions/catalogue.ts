/**
 * Coding mission catalogue — client-safe definitions.
 * Hidden expected outputs live in ./tests.server.ts (server-only) so they
 * never reach the browser bundle.
 */

export type MissionCategory =
  | "fundamentals" | "logic" | "loops" | "arrays" | "strings" | "methods";

export const MISSION_CATEGORY_LABELS: Record<MissionCategory, string> = {
  fundamentals: "Fundamentals",
  logic: "Logic",
  loops: "Loops",
  arrays: "Arrays",
  strings: "Strings",
  methods: "Methods & OOP",
};

export interface Mission {
  id: string;               // stable uuid — also xp_events.ref_id
  slug: string;
  title: string;
  story: string;
  briefing: string;
  objectives: string[];
  difficulty: "easy" | "medium" | "hard";
  category: MissionCategory;
  topic: string;
  xp: number;
  minutes: number;
  outcome: string;
  starterCode: string;
  stdin?: string;
  hints: string[];
}

export const MISSIONS: Mission[] = [
  {
    id: "1b2c3d4e-5f60-4a7b-8c9d-0e1f2a3b4c01",
    slug: "prime-guardian",
    title: "The Prime Guardian",
    story: "A digital security system accepts only prime-number access codes.",
    briefing: "Write a Java program that reads an integer and determines whether it is prime. A prime number is a natural number greater than 1 with no positive divisors other than 1 and itself.",
    objectives: [
      "Read an integer from standard input.",
      "Check whether the number is prime.",
      "Print PRIME if it is prime, COMPOSITE otherwise.",
    ],
    difficulty: "easy",
    category: "logic",
    topic: "Conditions & loops",
    xp: 50,
    minutes: 15,
    outcome: "You can test divisibility efficiently and combine conditions.",
    starterCode: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        // Your code here
    }
}`,
    hints: [
      "A prime number has exactly two divisors: 1 and itself.",
      "You only need to test divisors up to the square root of n.",
      "Handle n <= 1 first — they are not prime.",
    ],
  },
  {
    id: "2b2c3d4e-5f60-4a7b-8c9d-0e1f2a3b4c02",
    slug: "digit-sum",
    title: "Digit Detective",
    story: "A bank's checksum system validates account numbers by summing their digits.",
    briefing: "Read an integer and print the sum of its digits. For negative input, sum the digits of its absolute value.",
    objectives: [
      "Read an integer.",
      "Extract each digit using % and /.",
      "Print the sum.",
    ],
    difficulty: "easy",
    category: "loops",
    topic: "Digit manipulation",
    xp: 40,
    minutes: 12,
    outcome: "You can decompose integers digit by digit.",
    starterCode: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        // Your code here
    }
}`,
    hints: [
      "n % 10 gives the last digit; n / 10 removes it.",
      "Loop until n becomes 0.",
      "Use Math.abs(n) if negatives are allowed.",
    ],
  },
  {
    id: "3b2c3d4e-5f60-4a7b-8c9d-0e1f2a3b4c03",
    slug: "fizz-buzz-custom",
    title: "Fizz Buzz Protocol",
    story: "A sensor network prints labels for multiples of two custom thresholds.",
    briefing: "Read two integers a and b, then print numbers 1 to 20. For each number print FIZZ if divisible by a, BUZZ if divisible by b, FIZZBUZZ if divisible by both, otherwise the number itself — one per line.",
    objectives: [
      "Loop from 1 to 20.",
      "Apply divisibility rules in the right order.",
      "Print one token per line.",
    ],
    difficulty: "easy",
    category: "fundamentals",
    topic: "Conditionals & loops",
    xp: 45,
    minutes: 15,
    outcome: "You can chain conditions and control loop output precisely.",
    starterCode: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int a = sc.nextInt();
        int b = sc.nextInt();
        // Your code here
    }
}`,
    stdin: "3 5\n",
    hints: [
      "Check the 'both' case first.",
      "i % a == 0 tests divisibility by a.",
      "Print with System.out.println inside the loop.",
    ],
  },
  {
    id: "4b2c3d4e-5f60-4a7b-8c9d-0e1f2a3b4c04",
    slug: "array-extremes",
    title: "Array Extremes",
    story: "A weather station logs daily temperatures; find the hottest and coldest days.",
    briefing: "Read n, then read n integers into an array. Print the maximum value and the minimum value separated by a space.",
    objectives: [
      "Read n and allocate the array.",
      "Traverse once to find max and min.",
      "Print \"max min\".",
    ],
    difficulty: "easy",
    category: "arrays",
    topic: "Array traversal",
    xp: 50,
    minutes: 15,
    outcome: "You can store and scan collections of values.",
    starterCode: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        // Your code here
    }
}`,
    stdin: "5\n12 7 19 3 15\n",
    hints: [
      "Initialize max and min with the first element.",
      "One loop can track both.",
      "Use Math.max/Math.min or if statements.",
    ],
  },
  {
    id: "5b2c3d4e-5f60-4a7b-8c9d-0e1f2a3b4c05",
    slug: "palindrome-check",
    title: "Palindrome Patrol",
    story: "A civic archive flags palindromic records for special preservation.",
    briefing: "Read a string and print YES if it reads the same forwards and backwards, otherwise NO. Comparison is case-sensitive and includes every character.",
    objectives: [
      "Read a string token.",
      "Compare characters from both ends.",
      "Print YES or NO.",
    ],
    difficulty: "medium",
    category: "strings",
    topic: "String indexing",
    xp: 60,
    minutes: 20,
    outcome: "You can traverse strings symmetrically with charAt.",
    starterCode: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String s = sc.next();
        // Your code here
    }
}`,
    stdin: "level\n",
    hints: [
      "s.charAt(i) and s.charAt(s.length()-1-i) are mirror positions.",
      "Stop at the middle — s.length()/2 iterations suffice.",
      "Break early on the first mismatch.",
    ],
  },
  {
    id: "6b2c3d4e-5f60-4a7b-8c9d-0e1f2a3b4c06",
    slug: "armstrong-number",
    title: "Armstrong's Echo",
    story: "A math museum exhibit verifies Armstrong (narcissistic) numbers interactively.",
    briefing: "Read an integer n. An Armstrong number equals the sum of its own digits each raised to the number of digits. Print ARMSTRONG if n qualifies, else NOT-ARMSTRONG. Assume 0 < n < 10000.",
    objectives: [
      "Count the digits of n.",
      "Sum each digit raised to that count.",
      "Compare the sum with n and print the verdict.",
    ],
    difficulty: "medium",
    category: "logic",
    topic: "Number properties",
    xp: 70,
    minutes: 25,
    outcome: "You can combine digit extraction with exponentiation.",
    starterCode: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        // Your code here
    }
}`,
    stdin: "153\n",
    hints: [
      "First pass: count digits by dividing by 10.",
      "Math.pow(digit, digits) gives each term.",
      "153 = 1³ + 5³ + 3³ is the classic example.",
    ],
  },
  {
    id: "7b2c3d4e-5f60-4a7b-8c9d-0e1f2a3b4c07",
    slug: "bubble-sort-visual",
    title: "Bubble Sort Beacon",
    story: "A sorting lighthouse must bubble the largest values to the surface each pass.",
    briefing: "Read n then n integers. Sort them in ascending order using bubble sort and print the sorted array space-separated on one line.",
    objectives: [
      "Implement bubble sort with nested loops.",
      "Swap adjacent out-of-order elements.",
      "Print the sorted array.",
    ],
    difficulty: "medium",
    category: "arrays",
    topic: "Sorting algorithms",
    xp: 80,
    minutes: 30,
    outcome: "You understand how bubble sort propagates the maximum.",
    starterCode: `import java.util.Scanner;
import java.util.Arrays;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int[] a = new int[n];
        for (int i = 0; i < n; i++) a[i] = sc.nextInt();
        // Your code here — do NOT use Arrays.sort
    }
}`,
    stdin: "6\n5 2 9 1 7 3\n",
    hints: [
      "Outer loop runs n-1 times; inner loop shrinks each pass.",
      "Swap a[j] and a[j+1] when a[j] > a[j+1].",
      "The last element of each pass is already in place.",
    ],
  },
  {
    id: "8b2c3d4e-5f60-4a7b-8c9d-0e1f2a3b4c08",
    slug: "frequency-counter",
    title: "Frequency Forge",
    story: "A linguistics lab counts how often each letter appears in a word.",
    briefing: "Read a lowercase string s (letters a–z only). Print 26 lines: for each letter a to z, print the letter, a space, and its count in s — even when the count is 0.",
    objectives: [
      "Use an int[26] frequency table.",
      "Map chars to indices with c - 'a'.",
      "Print all 26 counts in order.",
    ],
    difficulty: "medium",
    category: "strings",
    topic: "Frequency counting",
    xp: 75,
    minutes: 25,
    outcome: "You can build histogram-style aggregations.",
    starterCode: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String s = sc.next();
        // Your code here
    }
}`,
    stdin: "mississippi\n",
    hints: [
      "int[] freq = new int[26]; indexes 0–25.",
      "freq[s.charAt(i) - 'a']++ inside a loop.",
      "Print (char)('a' + i) to recover the letter.",
    ],
  },
  {
    id: "9b2c3d4e-5f60-4a7b-8c9d-0e1f2a3b4c09",
    slug: "method-overloader",
    title: "Overload Overdrive",
    story: "A printer driver must handle int, double and String payloads through one interface.",
    briefing: "Define a class Printer with three static overloaded print methods — print(int), print(double), print(String) — each printing the value followed by its type name (INT, DOUBLE, STRING). In main, call each once with sample values: 42, 3.14, hello.",
    objectives: [
      "Create the Printer class with three overloads.",
      "Each overload prints value + type.",
      "Call all three from main.",
    ],
    difficulty: "hard",
    category: "methods",
    topic: "Method overloading",
    xp: 90,
    minutes: 30,
    outcome: "You can design polymorphic method signatures.",
    starterCode: `public class Main {
    public static void main(String[] args) {
        // Your code here
    }
}`,
    hints: [
      "Overloads share a name but differ by parameter type.",
      "System.out.println(value + \" INT\") style output.",
      "The Main class can call Printer.print(...) statically.",
    ],
  },
  {
    id: "ab2c3d4e-5f60-4a7b-8c9d-0e1f2a3b4c0a",
    slug: "class-encapsulation",
    title: "Vault of Encapsulation",
    story: "A secure vault only releases its balance through validated transactions.",
    briefing: "Create a BankAccount class with a private double balance, a constructor taking the initial balance, deposit(double), withdraw(double) that prints INSUFFICIENT if funds are lacking, and getBalance(). In main: create an account with 1000, deposit 250.50, withdraw 100, withdraw 2000, then print the final balance with two decimals.",
    objectives: [
      "Encapsulate balance as private.",
      "Implement deposit/withdraw/getBalance.",
      "Produce the exact output sequence.",
    ],
    difficulty: "hard",
    category: "methods",
    topic: "Classes & encapsulation",
    xp: 100,
    minutes: 35,
    outcome: "You can design a small class with controlled state.",
    starterCode: `public class Main {
    public static void main(String[] args) {
        // Your code here
    }
}`,
    hints: [
      "private double balance; with public methods.",
      "withdraw prints INSUFFICIENT when amount > balance.",
      "Use System.out.printf or String.format for two decimals.",
    ],
  },
];

export function getMission(id: string): Mission | undefined {
  return MISSIONS.find((m) => m.id === id || m.slug === id);
}

export function missionBySlug(slug: string): Mission | undefined {
  return MISSIONS.find((m) => m.slug === slug);
}
