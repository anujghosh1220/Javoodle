// Phase 1 lessons — Fundamentals (ICSE Class 10 Computer Applications, Java)
// Block types: heading | paragraph | code | output | note | list | keypoint

const L = (title, blocks) => ({ title, blocks });

export const lessonsP1 = [
  {
    topic: "Introduction to Computing & Java",
    lessons: [
      L("Why Java? A gentle introduction", [
        { type: "paragraph", text: "Computers follow instructions written in **programming languages**. Java is one of the most widely used languages in the world — it powers Android apps, banking systems, websites and board-exam answers alike." },
        { type: "paragraph", text: "For ICSE Computer Applications you will write small Java programs that read input, compute results and print output. Every Java program lives inside a **class**, and execution begins inside a special method called `main`." },
        { type: "code", code: `public class HelloJavoodle {\n    public static void main(String[] args) {\n        System.out.println("Welcome to Javoodle!");\n    }\n}` },
        { type: "output", output: `Welcome to Javoodle!` },
        { type: "list", items: [
          "`public class` — declares the class; the file name must match it exactly (HelloJavoodle.java).",
          "`public static void main(String[] args)` — the entry point the JVM calls first.",
          "`System.out.println(...)` — prints text to the screen and moves to a new line.",
        ]},
        { type: "keypoint", text: "Java is case-sensitive: `Main` and `main` are different names. Every statement ends with a semicolon `;`." },
        { type: "note", tone: "exam", text: "In ICSE papers, program questions usually ask you to accept input with `Scanner` and display formatted output — practise writing clean, well-indented code." },
      ]),
    ],
  },
  {
    topic: "Variables & Data Types",
    lessons: [
      L("Variables and data types", [
        { type: "paragraph", text: "A **variable** is a named box in memory that stores a value. Before using one, Java needs to know its **data type** — this is called *declaration*." },
        { type: "code", code: `int age = 15;\ndouble percentage = 87.5;\nchar grade = 'A';\nString name = "Ananya";\nboolean passed = true;` },
        { type: "list", items: [
          "`int` — whole numbers (… -2, -1, 0, 1, 2 …)",
          "`double` — decimal numbers like 87.5 or 3.14",
          "`char` — a single character inside **single** quotes: `'A'`",
          "`String` — text inside **double** quotes: `\"Hello\"` (capital S!)",
          "`boolean` — only `true` or `false`",
        ]},
        { type: "code", code: `public class Demo {\n    public static void main(String[] args) {\n        int marks = 92;\n        System.out.println("Marks = " + marks);\n    }\n}` },
        { type: "output", output: `Marks = 92` },
        { type: "keypoint", text: "Variables must be declared before use, names can contain letters/digits/_/$ but cannot start with a digit, and Java keywords (`int`, `class`, `new`…) can never be variable names." },
        { type: "note", tone: "warning", text: "Classic mistake: writing `'A'` for a String or `\"A\"` for a char. char uses single quotes, String uses double quotes." },
      ]),
    ],
  },
  {
    topic: "Operators",
    lessons: [
      L("Operators in Java", [
        { type: "paragraph", text: "**Operators** perform actions on values: arithmetic (`+ - * / %`), relational (`> < >= <= == !=`), logical (`&& || !`) and assignment (`= += -= …`)." },
        { type: "code", code: `int a = 17, b = 5;\nSystem.out.println(a + b);  // 22\nSystem.out.println(a - b);  // 12\nSystem.out.println(a * b);  // 85\nSystem.out.println(a / b);  // 3  (integer division!)\nSystem.out.println(a % b);  // 2  (remainder)` },
        { type: "note", tone: "exam", text: "Integer division truncates: `17 / 5` gives `3`, not `3.4`. To get decimals, make one operand a `double`: `17.0 / 5` → `3.4`. The `%` (modulo) operator gives the remainder — favourite in ICSE output questions." },
        { type: "code", code: `int x = 10;\nx++;            // x becomes 11\n++x;            // pre-increment also 11\nint y = x++;    // y gets OLD value 12, then x becomes 13` },
        { type: "keypoint", text: "`==` compares values; `=` assigns. Never confuse them. `&&` is AND (both true), `||` is OR (either true), `!` negates." },
        { type: "list", items: [
          "Relational operators always return `boolean`: `a > b` → `true` or `false`.",
          "`=` has lower precedence than arithmetic — `int c = a + b * 2;` computes `a + (b*2)` first.",
        ]},
      ]),
    ],
  },
  {
    topic: "Conditional Statements",
    lessons: [
      L("if, else and switch", [
        { type: "paragraph", text: "**Conditional statements** let your program make decisions. `if` runs a block only when its condition is `true`; `else` covers the remaining case." },
        { type: "code", code: `int marks = 78;\nif (marks >= 90) {\n    System.out.println(\"Distinction\");\n} else if (marks >= 75) {\n    System.out.println(\"Merit\");\n} else if (marks >= 33) {\n    System.out.println(\"Pass\");\n} else {\n    System.out.println(\"Keep trying!\");\n}` },
        { type: "output", output: `Merit` },
        { type: "paragraph", text: "`switch` is cleaner when one variable is compared against many fixed values:" },
        { type: "code", code: `int day = 3;\nswitch (day) {\n    case 1: System.out.println(\"Monday\"); break;\n    case 2: System.out.println(\"Tuesday\"); break;\n    case 3: System.out.println(\"Wednesday\"); break;\n    default: System.out.println(\"Other day\");\n}` },
        { type: "keypoint", text: "Always `break` at the end of each `case` — without it, execution *falls through* into the next case. `default` catches everything else." },
        { type: "note", tone: "exam", text: "ICSE loves nested `if` and `switch` output questions. Trace each condition carefully and remember `else if` chains stop at the FIRST true branch." },
      ]),
    ],
  },
  {
    topic: "Loops",
    lessons: [
      L("for, while and do-while loops", [
        { type: "paragraph", text: "**Loops** repeat a block of code. The `for` loop is best when you know the number of iterations; `while` repeats while a condition stays true; `do-while` runs at least once." },
        { type: "code", code: `// for loop — prints 1 to 5\nfor (int i = 1; i <= 5; i++) {\n    System.out.print(i + \" \");\n}\n// while loop\nint n = 1;\nwhile (n <= 5) {\n    System.out.print(n + \" \");\n    n++;\n}\n// do-while — body runs BEFORE the condition is checked\nint k = 10;\ndo {\n    System.out.println(k);\n    k--;\n} while (k > 0);` },
        { type: "output", output: `1 2 3 4 5 1 2 3 4 5\n10\n9\n8\n7\n6\n5\n4\n3\n2\n1` },
        { type: "keypoint", text: "A loop with no exit condition runs forever — the classic \"infinite loop\". Watch the update statement (`i++`) carefully in output questions." },
        { type: "note", tone: "warning", text: "Common trap: `while (i <= n)` vs `while (i < n)` — off-by-one errors change the printed values. Trace `i` after the loop ends too: it equals the first value that FAILED the condition." },
      ]),
    ],
  },
  {
    topic: "Classes & Objects",
    lessons: [
      L("Classes and objects", [
        { type: "paragraph", text: "A **class** is a blueprint; an **object** is a real thing built from it. A class groups **data** (variables) and **behaviour** (methods) together." },
        { type: "code", code: `class Student {\n    int rollNo;\n    String name;\n\n    void display() {\n        System.out.println(rollNo + \" \" + name);\n    }\n}\n\npublic class Main {\n    public static void main(String[] args) {\n        Student s1 = new Student();   // create object\n        s1.rollNo = 7;\n        s1.name = \"Meera\";\n        s1.display();\n    }\n}` },
        { type: "output", output: `7 Meera` },
        { type: "list", items: [
          "Variables declared inside a class are called **data members** (or instance variables).",
          "`new Student()` creates an object in memory.",
          "Objects are accessed with the dot operator: `s1.name`.",
          "Two objects of the same class have independent copies of the data.",
        ]},
        { type: "keypoint", text: "Only ONE class per file may be `public`, and the file must be named after it — that's why `public class Main` sits in its own file while `Student` can live alongside it in exam answers." },
      ]),
    ],
  },
  {
    topic: "Methods",
    lessons: [
      L("Methods — reusable blocks of code", [
        { type: "paragraph", text: "A **method** is a named block of code you can call whenever needed. Methods take **parameters** (inputs) and can **return** a value." },
        { type: "code", code: `class MathHelper {\n    // method with parameters and a return value\n    int add(int a, int b) {\n        return a + b;\n    }\n\n    // method with no return value\n    void greet(String name) {\n        System.out.println(\"Hi \" + name);\n    }\n}\n\npublic class Main {\n    public static void main(String[] args) {\n        MathHelper m = new MathHelper();\n        int total = m.add(4, 6);   // call, store result\n        System.out.println(total); // 10\n        m.greet(\"Java\");\n    }\n}` },
        { type: "output", output: `10\nHi Java` },
        { type: "list", items: [
          "Return type comes first: `int`, `double`, `String`, `void` (returns nothing).",
          "Parameters are declared with types inside the brackets.",
          "`return` sends a value back; a `void` method just finishes.",
        ]},
        { type: "keypoint", text: "The method call must match the declaration exactly — right number, order and types of arguments. A `static` method can be called without creating an object (you'll meet `static` properly in Constructors & beyond)." },
        { type: "note", tone: "exam", text: "ICSE program questions love 'define a method that…' — practise writing methods that accept parameters, compute and return values. Keep method names meaningful." },
      ]),
      L("Static methods, call by value and scope", [
        { type: "paragraph", text: "A **static** method belongs to the CLASS, not to any one object — you call it without creating an instance. That is why `Math.sqrt(16)` and even `main` itself work without an object." },
        { type: "code", code: `class Calculator {
    static int square(int n) {
        return n * n;
    }
}

public class Main {
    public static void main(String[] args) {
        int r = Calculator.square(7);  // no object needed!
        System.out.println(r);          // 49
    }
}` },
        { type: "output", output: `49` },
        { type: "paragraph", text: "Java passes **primitive** arguments **by value**: the method receives a COPY. Changing the parameter inside the method never changes the caller's variable." },
        { type: "code", code: `static void change(int x) {
    x = x * 10;
}

public static void main(String[] args) {
    int a = 5;
    change(a);
    System.out.println(a);   // still 5!
}` },
        { type: "output", output: `5` },
        { type: "list", items: [
          "**Formal parameters** are the names in the declaration; **actual arguments** are the values you pass at the call.",
          "A method that always returns the same output for the same input and changes nothing else is called **pure** — pure methods are easy to test and debug.",
          "**Scope** = where a variable is visible. A variable declared inside a method (a *local variable*) only lives until that method ends — its **lifetime** ends there too.",
          "Variables declared in a `for` loop header only exist inside that loop.",
        ]},
        { type: "keypoint", text: "`static` methods can only use other static members directly — an instance method needs an object, a static method does not." },
        { type: "note", tone: "exam", text: "ICSE asks 'what is the output' on call-by-value tricks: the caller's variable NEVER changes when you pass an int, double, char or boolean to a method." },
      ]),
    ],
  },
];
