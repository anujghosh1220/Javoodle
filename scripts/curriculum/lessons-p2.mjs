// Phase 2 lessons — Intermediate (ICSE Class 10 Computer Applications, Java)

const L = (title, blocks) => ({ title, blocks });

export const lessonsP2 = [
  {
    topic: "Constructors",
    lessons: [
      L("Constructors — objects born ready", [
        { type: "paragraph", text: "A **constructor** is a special method that runs automatically when you create an object with `new`. It has the same name as the class and no return type." },
        { type: "code", code: `class Student {\n    int roll;\n    String name;\n\n    // default constructor (no parameters)\n    Student() {\n        roll = 0;\n        name = \"Not set\";\n    }\n\n    // parameterized constructor\n    Student(int r, String n) {\n        roll = r;\n        name = n;\n    }\n}\n\npublic class Main {\n    public static void main(String[] args) {\n        Student a = new Student();          // default\n        Student b = new Student(12, \"Aarav\"); // parameterized\n        System.out.println(b.roll + \" \" + b.name);\n    }\n}` },
        { type: "output", output: `12 Aarav` },
        { type: "keypoint", text: "If you write NO constructor, Java gives a free default constructor. If you write ANY constructor, the default one disappears — define it yourself if you still need it." },
        { type: "note", tone: "exam", text: "Constructor questions ask you to initialize data members at object creation. Remember: constructors have NO return type — not even `void`." },
      ]),
    ],
  },
  {
    topic: "Method & Constructor Overloading",
    lessons: [
      L("Overloading — same name, different job", [
        { type: "paragraph", text: "**Overloading** lets you define several methods (or constructors) with the SAME name but DIFFERENT parameter lists. Java picks the right one at compile time." },
        { type: "code", code: `class Demo {\n    void show(int x) {\n        System.out.println(\"int: \" + x);\n    }\n    void show(double x) {\n        System.out.println(\"double: \" + x);\n    }\n    void show(int x, int y) {\n        System.out.println(\"two ints: \" + (x + y));\n    }\n}\n\npublic class Main {\n    public static void main(String[] args) {\n        Demo d = new Demo();\n        d.show(5);      // int version\n        d.show(5.5);    // double version\n        d.show(2, 3);   // two-parameter version\n    }\n}` },
        { type: "output", output: `int: 5\ndouble: 5.5\ntwo ints: 5` },
        { type: "list", items: [
          "Overloaded methods must differ in parameter NUMBER, TYPE or ORDER — not just the return type.",
          "Constructors can be overloaded too — `Student()` and `Student(int, String)` above are an example.",
          "`show(5)` chooses `int` because 5 is an int literal; `show(5.0)` would choose `double`.",
        ]},
        { type: "keypoint", text: "Two methods cannot differ ONLY by return type — `int show()` and `void show()` is a compile error." },
      ]),
    ],
  },
  {
    topic: "Library Classes",
    lessons: [
      L("Math, StringBuilder, wrappers and Scanner", [
        { type: "paragraph", text: "Java ships with ready-made **library classes**. You will use `Math` for calculations, `StringBuilder` for efficient text building, wrapper classes to treat primitives as objects, and `Scanner` for input." },
        { type: "code", code: `import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        System.out.print(\"Enter a number: \");\n        int n = sc.nextInt();\n\n        System.out.println(\"Square: \" + Math.pow(n, 2));\n        System.out.println(\"Root: \" + Math.sqrt(n));\n        System.out.println(\"Max: \" + Math.max(n, 100));\n    }\n}` },
        { type: "list", items: [
          "`Math.pow(x, y)`, `Math.sqrt(x)`, `Math.max(a,b)`, `Math.min(a,b)`, `Math.abs(x)`, `Math.floor(x)` — all `static`, call them directly.",
          "`Scanner` reads input: `nextInt()`, `nextDouble()`, `nextLine()`, `next()` for a word.",
          "Wrapper classes: `Integer`, `Double`, `Character`, `Boolean` — needed when a method must return an object or work with generics.",
          "`StringBuilder` builds long strings efficiently: `append()` returns the same object.",
        ]},
        { type: "keypoint", text: "`Math` methods are static — `Math.sqrt(16)` works without creating a Math object. Mixing `nextInt()` and `nextLine()` needs care: `nextInt()` leaves the newline behind, so call `sc.nextLine()` once to consume it." },
        { type: "note", tone: "exam", text: "Input/output questions dominate ICSE. Practise `Scanner` prompts, formatting output with spaces and labels exactly as the question demands." },
      ]),
    ],
  },
  {
    topic: "Strings",
    lessons: [
      L("The String class", [
        { type: "paragraph", text: "A `String` is an **object** (not a primitive) holding a sequence of characters. Strings are **immutable** — methods like `toUpperCase()` return a NEW string; they never modify the original." },
        { type: "code", code: `String s = \"Hello World\";\nSystem.out.println(s.length());        // 11\nSystem.out.println(s.charAt(0));      // H\nSystem.out.println(s.indexOf('W'));   // 6\nSystem.out.println(s.substring(0, 5)); // Hello\nSystem.out.println(s.toUpperCase()); // HELLO WORLD\nSystem.out.println(s.contains(\"World\")); // true` },
        { type: "output", output: `11\nH\n6\nHello\nHELLO WORLD\ntrue` },
        { type: "list", items: [
          "`length()` — number of characters (NOT `length`, that's for arrays!).",
          "`charAt(i)` — character at position i (starts at 0).",
          "`indexOf('c')` / `indexOf(\"str\")` — first position found, or -1.",
          "`equals()` compares CONTENT; `==` compares object references — a classic trap!",
        ]},
        { type: "keypoint", text: "Always compare strings with `s1.equals(s2)`, never `s1 == s2`. And remember `length()` has brackets for Strings but not for arrays." },
        { type: "note", tone: "warning", text: "`charAt` and `substring` throw `StringIndexOutOfBoundsException` if your index is too large — check bounds before slicing in loops." },
      ]),
    ],
  },
  {
    topic: "Arrays",
    lessons: [
      L("One and two dimensional arrays", [
        { type: "paragraph", text: "An **array** stores many values of the same type under one name, each reachable by an **index** starting at 0." },
        { type: "code", code: `int[] marks = new int[5];        // declare + allocate\nmarks[0] = 85; marks[1] = 92;\n\nString[] names = {\"Aarav\", \"Diya\", \"Kabir\"}; // initialize directly\nSystem.out.println(names.length);   // 3\nSystem.out.println(names[1]);       // Diya\n\nint[][] grid = new int[2][3];      // 2 rows, 3 columns\ngrid[0][0] = 1; grid[1][2] = 9;` },
        { type: "list", items: [
          "`new int[5]` creates 5 slots; valid indices are 0–4.",
          "`names.length` — array length has NO brackets (unlike String.length()).",
          "2D arrays are arrays of arrays: `grid[row][column]`.",
          "Loops with arrays: `for (int i = 0; i < arr.length; i++)` or the enhanced `for (int x : arr)`.",
        ]},
        { type: "code", code: `int[] a = {4, 7, 2};\nfor (int x : a) {\n    System.out.print(x + \" \");\n}` },
        { type: "output", output: `4 7 2 ` },
        { type: "keypoint", text: "Accessing `a[a.length]` is the classic off-by-one crash — the last valid index is always `length - 1`." },
      ]),
    ],
  },
  {
    topic: "Searching & Sorting",
    lessons: [
      L("Linear search, bubble sort and selection sort", [
        { type: "paragraph", text: "**Searching** finds a value in data; **sorting** arranges it. Linear search checks every element; bubble and selection sort rearrange arrays into ascending order." },
        { type: "code", code: `// Linear search\nint[] a = {5, 2, 8, 1};\nint key = 8, pos = -1;\nfor (int i = 0; i < a.length; i++) {\n    if (a[i] == key) { pos = i; break; }\n}\nSystem.out.println(pos); // 2` },
        { type: "code", code: `// Bubble sort — heavier elements 'bubble' to the end\nint[] b = {5, 2, 8, 1};\nfor (int i = 0; i < b.length - 1; i++) {\n    for (int j = 0; j < b.length - 1 - i; j++) {\n        if (b[j] > b[j + 1]) {\n            int t = b[j]; b[j] = b[j + 1]; b[j + 1] = t;\n        }\n    }\n}\nfor (int x : b) System.out.print(x + \" \"); // 1 2 5 8 ` },
        { type: "keypoint", text: "The swap needs a temporary variable — you cannot exchange two values by assigning one to the other directly." },
        { type: "note", tone: "exam", text: "Sorting/searching questions ask you to trace the algorithm step by step. Practise writing bubble sort from memory — it appears constantly in ICSE." },
      ]),
    ],
  },
  {
    topic: "Intermediate Programming Problems",
    lessons: [
      L("Designing complete Java programs", [
        { type: "paragraph", text: "Board questions combine everything: input with `Scanner`, loops, conditions, methods and formatted output. The secret is a clean structure: **read → process → display**." },
        { type: "code", code: `import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        System.out.print(\"Enter a number: \");\n        int n = sc.nextInt();\n\n        int fact = 1;\n        for (int i = 1; i <= n; i++) fact *= i;\n\n        System.out.println(\"Factorial of \" + n + \" = \" + fact);\n    }\n}` },
        { type: "output", output: `Enter a number: 5\nFactorial of 5 = 120` },
        { type: "list", items: [
          "Always echo the input prompt exactly as the question specifies.",
          "Declare loop variables inside `for` when they're only needed there.",
          "Use meaningful variable names — examiners award marks for clarity.",
        ]},
        { type: "keypoint", text: "Factorial of 0 is 1 — initialise your accumulator to 1 before the loop, not 0." },
        { type: "note", tone: "exam", text: "For 'write a program' questions, spend 2 minutes planning: what input, what loop/condition, what output format. Then write it once, carefully." },
      ]),
    ],
  },
];
