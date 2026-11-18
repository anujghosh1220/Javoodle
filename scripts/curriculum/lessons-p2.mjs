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
      L("Wrapper classes, parsing and character checks", [
        { type: "paragraph", text: "Every primitive type has a **wrapper class**: `int` -> `Integer`, `double` -> `Double`, `char` -> `Character`, `boolean` -> `Boolean`. Wrappers let primitives behave like objects, and Java converts between them **automatically** (**autoboxing** and **unboxing**)." },
        { type: "code", code: `Integer boxed = 42;        // autoboxing: int -> Integer
int plain = boxed;           // unboxing: Integer -> int

int n = Integer.parseInt("42");       // String -> int
double d = Double.parseDouble("3.14"); // String -> double
String s = Integer.toString(42);     // int -> String` },
        { type: "output", output: `// n = 42, d = 3.14, s = "42"` },
        { type: "list", items: [
          "`Integer.parseInt(\"25\")` converts numeric TEXT to a number - it throws `NumberFormatException` on bad input like \"abc\".",
          "`Character.isDigit('7')` -> true, `isLetter('a')` -> true, `isLetterOrDigit('x9')` -> true, `isWhitespace(' ')` -> true.",
          "`Character.toUpperCase('a')` -> 'A' and `toLowerCase('B')` -> 'b' work on single characters.",
          "Autoboxing: `int` -> `Integer` happens silently; unboxing: `Integer` -> `int`. Beware unboxing `null` - it crashes with NullPointerException.",
        ]},
        { type: "keypoint", text: "`parseInt`/`parseDouble` turn user-typed text into numbers - this is how ICSE programs accept numeric input as a String and still do maths." },
        { type: "note", tone: "warning", text: "`Integer.parseInt(\"12a\")` throws NumberFormatException. In exams, make sure the String really contains digits only before parsing." },
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
      L("Comparing, cleaning and string programs", [
        { type: "paragraph", text: "Beyond `equals()`, Strings offer `equalsIgnoreCase()` for case-insensitive comparison and `compareTo()`, which returns 0 for equal strings, a negative number if the first is \"smaller\" and a positive number if it is \"larger\". `trim()` removes leading and trailing spaces; `replace()` swaps every occurrence of a character or substring." },
        { type: "code", code: `String a = "Hello";
String b = "hello";
System.out.println(a.equalsIgnoreCase(b)); // true
System.out.println(a.compareTo(b));          // negative (H < h)
System.out.println("  Hi  ".trim());          // Hi
System.out.println("banana".replace('a', 'o')); // bonono` },
        { type: "output", output: `true
-32
Hi
bonono` },
        { type: "list", items: [
          "Palindrome check: compare `s.charAt(i)` with `s.charAt(s.length()-1-i)` for i from 0 to `length/2 - 1` - every pair must match.",
          "Reverse a string: loop `i` from `s.length()-1` down to 0 appending `s.charAt(i)` - or use a `StringBuilder`.",
          "`replace('a','o')` with chars replaces EVERY occurrence; `replaceFirst` and regex variants exist, but char replace is what ICSE expects.",
        ]},
        { type: "code", code: `String w = "level";
boolean pal = true;
for (int i = 0; i < w.length() / 2; i++) {
    if (w.charAt(i) != w.charAt(w.length() - 1 - i)) {
        pal = false;
        break;
    }
}
System.out.println(pal ? "Palindrome" : "Not palindrome");` },
        { type: "output", output: `Palindrome` },
        { type: "keypoint", text: "For palindrome/reverse programs the winning pattern is: read the String -> loop with two pointers or a backwards index -> build/compare -> print the result." },
        { type: "note", tone: "exam", text: "String questions are guaranteed in ICSE. Drill: length, charAt, indexOf, substring, equals vs equalsIgnoreCase, compareTo, trim, replace - plus one palindrome or reverse program." },
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
      L("Two-dimensional arrays - rows, columns and diagonals", [
        { type: "paragraph", text: "A 2D array is really an array of row-arrays: `a[i][j]` means row i, column j. Board questions love asking for the **sum of each row**, **each column** or the **main diagonal**." },
        { type: "code", code: `int[][] m = {
    {1, 2, 3},
    {4, 5, 6},
    {7, 8, 9}
};
// sum of all elements
int total = 0;
for (int i = 0; i < m.length; i++)
    for (int j = 0; j < m[i].length; j++)
        total += m[i][j];
System.out.println(total); // 45

// sum of the main diagonal (1,5,9)
int diag = 0;
for (int i = 0; i < m.length; i++)
    diag += m[i][i];
System.out.println(diag);  // 15` },
        { type: "output", output: `45
15` },
        { type: "list", items: [
          "`m.length` = number of ROWS; `m[i].length` = columns in row i.",
          "Main diagonal: elements where row index == column index -> `m[i][i]`.",
          "Anti-diagonal (top-right to bottom-left): `m[i][m[i].length - 1 - i]`.",
          "Column j sum: loop i over rows and add `m[i][j]` - fix j, vary i.",
        ]},
        { type: "keypoint", text: "For an n x n matrix, row sums use the outer loop for rows; column sums swap the roles - inner loop over rows for a fixed column." },
        { type: "note", tone: "exam", text: "2D array questions almost always ask for a sum or max along a row/column/diagonal - practise all three patterns until they are automatic." },
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
      L("Selection sort and binary search", [
        { type: "paragraph", text: "**Selection sort** finds the smallest remaining element and swaps it into place - fewer swaps than bubble sort. **Binary search** halves the search space each step, but only works on a SORTED array." },
        { type: "code", code: `// Selection sort
int[] a = {64, 25, 12, 22, 11};
for (int i = 0; i < a.length - 1; i++) {
    int min = i;
    for (int j = i + 1; j < a.length; j++) {
        if (a[j] < a[min]) min = j;
    }
    int t = a[i]; a[i] = a[min]; a[min] = t;
}
for (int x : a) System.out.print(x + " "); // 11 12 22 25 64` },
        { type: "output", output: `11 12 22 25 64` },
        { type: "code", code: `// Binary search on a sorted array
int[] b = {2, 5, 8, 12, 16, 23, 38};
int key = 16, low = 0, high = b.length - 1, pos = -1;
while (low <= high) {
    int mid = (low + high) / 2;
    if (b[mid] == key) { pos = mid; break; }
    else if (b[mid] < key) low = mid + 1;
    else high = mid - 1;
}
System.out.println(pos); // 4` },
        { type: "output", output: `4` },
        { type: "keypoint", text: "Binary search compares against the MIDDLE element: equal -> found; key bigger -> search right half (`low = mid + 1`); smaller -> search left half (`high = mid - 1`)." },
        { type: "note", tone: "warning", text: "Binary search on an UNSORTED array gives wrong answers silently - always confirm the array is sorted first. Selection sort is O(n^2) like bubble but does at most n-1 swaps." },
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
  {
    topic: "Encapsulation",
    lessons: [
      L("Encapsulation and access specifiers", [
        { type: "paragraph", text: "**Encapsulation** wraps data (variables) and the code that operates on it (methods) inside a class, and controls WHO can touch them. It is one of the four pillars of Object-Oriented Programming and a guaranteed ICSE topic." },
        { type: "code", code: `class BankAccount {
    private double balance;   // hidden inside the class

    public void deposit(double amount) {
        if (amount > 0) balance += amount;
    }

    public double getBalance() {
        return balance;
    }
}` },
        { type: "list", items: [
          "`private` - visible ONLY inside the class that declares it. This is the heart of data hiding.",
          "`public` - visible everywhere: other classes, other packages, anyone.",
          "`protected` - visible inside the class, its subclasses, and classes in the same package.",
          "No modifier (default/package-private) - visible only within the same package.",
        ]},
        { type: "keypoint", text: "Make data members `private` and expose controlled access through `public` methods - this is encapsulation. It prevents outside code from corrupting an object's state." },
        { type: "note", tone: "exam", text: "ICSE asks you to identify access specifiers and explain why `private` is used. Remember: a `private` variable CANNOT be read or written directly from `main` or another class." },
      ]),
      L("Getters, setters and variable scope", [
        { type: "paragraph", text: "Since `private` members are hidden, classes provide **getter** and **setter** methods - controlled doors into the data. This lets the class validate values before accepting them." },
        { type: "code", code: `class Student {
    private int marks;

    public void setMarks(int m) {
        if (m >= 0 && m <= 100) marks = m;  // validation!
    }

    public int getMarks() {
        return marks;
    }
}

public class Main {
    public static void main(String[] args) {
        Student s = new Student();
        s.setMarks(85);
        System.out.println(s.getMarks()); // 85
        s.setMarks(250);                  // rejected silently
        System.out.println(s.getMarks()); // still 85
    }
}` },
        { type: "output", output: `85
85` },
        { type: "list", items: [
          "**Class variables** (static) are shared by ALL objects of the class; **instance variables** belong to each object separately.",
          "**Local variables** live inside a method or block and die when it ends.",
          "**Argument (parameter) variables** exist only for the duration of the method call.",
          "Scope rules: a variable is visible only from its declaration point to the end of its enclosing block.",
        ]},
        { type: "keypoint", text: "Getter = `public` method that RETURNS a private field; setter = `public` method that safely ASSIGNS it. Naming convention: `getX()` / `setX()`." },
        { type: "note", tone: "exam", text: "Scope questions ask: can variable X be accessed at line Y? Trace the enclosing braces - if the declaration is outside that block, the answer is no." },
      ]),
    ],
  },
];
