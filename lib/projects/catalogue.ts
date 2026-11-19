/**
 * Project Universe catalogue — client-safe.
 *
 * Honest design: each project milestone maps to REAL coding missions whose
 * completion is already verified server-side (hidden tests → xp_events).
 * Project progress is therefore derived entirely from verified mission
 * completions — nothing is self-reported.
 */

export interface ProjectMilestone {
  missionSlug: string;
  label: string;
}

export interface Project {
  id: string;
  slug: string;
  title: string;
  description: string;
  difficulty: "beginner" | "intermediate";
  concepts: string[];
  minutes: number;
  milestones: ProjectMilestone[];
}

export const PROJECTS: Project[] = [
  {
    id: "p-number-guardian",
    slug: "number-guardian",
    title: "Number Guardian",
    description: "Build a small suite of number-analysis tools — primes, digits, Armstrong numbers — like a real utility belt.",
    difficulty: "beginner",
    concepts: ["Conditionals", "Loops", "Digit manipulation"],
    minutes: 60,
    milestones: [
      { missionSlug: "prime-guardian", label: "Prime-number validator" },
      { missionSlug: "digit-sum", label: "Digit-sum checksum" },
      { missionSlug: "armstrong-number", label: "Armstrong-number verifier" },
    ],
  },
  {
    id: "p-array-forge",
    slug: "array-forge",
    title: "Array Forge",
    description: "Master collections: read arrays, find extremes, and sort them with your own bubble sort.",
    difficulty: "beginner",
    concepts: ["Arrays", "Traversal", "Sorting"],
    minutes: 75,
    milestones: [
      { missionSlug: "array-extremes", label: "Min/max scanner" },
      { missionSlug: "bubble-sort-visual", label: "Hand-rolled bubble sort" },
    ],
  },
  {
    id: "p-text-lab",
    slug: "text-lab",
    title: "Text Lab",
    description: "Analyse strings like a linguistics tool — palindromes and character frequency tables.",
    difficulty: "intermediate",
    concepts: ["Strings", "charAt", "Frequency counting"],
    minutes: 50,
    milestones: [
      { missionSlug: "palindrome-check", label: "Palindrome detector" },
      { missionSlug: "frequency-counter", label: "Letter frequency table" },
    ],
  },
  {
    id: "p-oop-foundry",
    slug: "oop-foundry",
    title: "OOP Foundry",
    description: "Graduate to classes: method overloading and a fully encapsulated bank account.",
    difficulty: "intermediate",
    concepts: ["Method overloading", "Encapsulation", "Classes"],
    minutes: 65,
    milestones: [
      { missionSlug: "method-overloader", label: "Overloaded printer driver" },
      { missionSlug: "class-encapsulation", label: "Secure BankAccount class" },
    ],
  },
];
