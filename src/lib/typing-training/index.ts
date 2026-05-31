/**
 * Typing Training Engine - Core Logic Modules
 * 键盘输入训练引擎核心逻辑模块
 */

// Input Comparator
export {
  compareCharacter,
  updateCharacterStatus,
  calculateProgress,
  initializeCharacterCells,
  isTrainingComplete,
} from "./input-comparator";

// Behavior Analyzer
export {
  calculateAccuracy,
  calculateSpeed,
  analyzeErrorFrequency,
  calculateSessionMetrics,
  calculateAverageAccuracy,
  calculateAverageSpeed,
} from "./behavior-analyzer";

// Content Validator
export {
  validateWordIntegrity,
  validateContentQuality,
  hasValidationError,
  getValidationErrors,
  OBSCURE_SYMBOLS,
  TIME_SENSITIVE_WORDS,
  TIME_SENSITIVE_WORDS_EN,
  TIME_SENSITIVE_WORDS_ZH,
  CONVERSATIONAL_PHRASES,
  CONVERSATIONAL_PHRASES_EN,
  CONVERSATIONAL_PHRASES_ZH,
  AMBIGUOUS_ABBREVIATIONS,
  LIST_MARKER_PATTERNS,
  CODE_BLOCK_PATTERNS,
  MARKDOWN_FORMATTING_PATTERNS,
  OPTIONAL_HYPHEN_PATTERNS,
} from "./content-validator";

// Supabase Data Access Layer
export {
  fetchWords,
  saveMaterial,
  getMaterial,
  listMaterials,
  toggleFavorite,
  deleteMaterial,
  saveSession,
  getSessionHistory,
  getSession,
} from "./supabase-client";
