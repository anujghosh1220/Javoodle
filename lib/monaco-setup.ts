"use client";

import { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";

// Local Monaco bundle instead of the default CDN loader — faster, same-origin.
// No MonacoEnvironment workers: basic Java editing works without them;
// full language-service workers can be added later if needed.
loader.config({ monaco });
