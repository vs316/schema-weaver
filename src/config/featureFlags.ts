/**
 * Feature Flags Configuration
 *
 * Controls which diagram types are enabled in the application.
 * These can be overridden by environment variables for flexibility.
 *
 * Environment Variables (set in .env or deployment config):
 * - VITE_ENABLE_UML_DIAGRAMS: 'true' | 'false'
 * - VITE_ENABLE_FLOWCHART_DIAGRAMS: 'true' | 'false'
 * - VITE_ENABLE_SEQUENCE_DIAGRAMS: 'true' | 'false'
 */

// Helper to parse boolean env vars
const parseEnvBoolean = (value: string | undefined, defaultValue: boolean): boolean => {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === "true";
};

// Default values - set to false for production, true for development
const DEFAULT_ENABLE_UML = true;
const DEFAULT_ENABLE_FLOWCHART = true;
const DEFAULT_ENABLE_SEQUENCE = true;

/**
 * Feature Flags for Diagram Types
 *
 * Set these to true to enable the respective diagram types.
 * Environment variables take precedence over defaults.
 */
export const FEATURE_FLAGS = {
  // UML Class Diagrams - shows class structures, attributes, methods, and relationships
  ENABLE_UML_DIAGRAMS: parseEnvBoolean(import.meta.env.VITE_ENABLE_UML_DIAGRAMS, DEFAULT_ENABLE_UML),

  // Flowcharts - shows process flows with start/end, decisions, processes
  ENABLE_FLOWCHART_DIAGRAMS: parseEnvBoolean(import.meta.env.VITE_ENABLE_FLOWCHART_DIAGRAMS, DEFAULT_ENABLE_FLOWCHART),

  // Sequence Diagrams - shows message flows between participants
  ENABLE_SEQUENCE_DIAGRAMS: parseEnvBoolean(import.meta.env.VITE_ENABLE_SEQUENCE_DIAGRAMS, DEFAULT_ENABLE_SEQUENCE),
} as const;

/**
 * Check if a diagram type is enabled
 */
export function isDiagramTypeEnabled(type: "erd" | "uml-class" | "flowchart" | "sequence"): boolean {
  switch (type) {
    case "erd":
      return true; // ERD is always enabled
    case "uml-class":
      return FEATURE_FLAGS.ENABLE_UML_DIAGRAMS;
    case "flowchart":
      return FEATURE_FLAGS.ENABLE_FLOWCHART_DIAGRAMS;
    case "sequence":
      return FEATURE_FLAGS.ENABLE_SEQUENCE_DIAGRAMS;
    default:
      return false;
  }
}

/**
 * Get list of all enabled diagram types
 */
export function getEnabledDiagramTypes(): Array<"erd" | "uml-class" | "flowchart" | "sequence"> {
  const types: Array<"erd" | "uml-class" | "flowchart" | "sequence"> = ["erd"];

  if (FEATURE_FLAGS.ENABLE_UML_DIAGRAMS) {
    types.push("uml-class");
  }
  if (FEATURE_FLAGS.ENABLE_FLOWCHART_DIAGRAMS) {
    types.push("flowchart");
  }
  if (FEATURE_FLAGS.ENABLE_SEQUENCE_DIAGRAMS) {
    types.push("sequence");
  }

  return types;
}
