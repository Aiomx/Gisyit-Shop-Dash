/**
 * Typing Training Engine - Supabase Data Access Layer
 * 键盘输入训练引擎 Supabase 数据访问层
 *
 * Requirements: 3.1, 3.6, 10.1, 10.2, 10.3, 10.4, 9.3
 */

import { getSupabaseClient } from "@/lib/supabase/client";
import type {
  WordMeta,
  WordFilter,
  WordType,
  DifficultyLevel,
  TrainingMaterial,
  TrainingMode,
  SessionResult,
  ErrorStat,
  TrainingMaterialMetadata,
} from "@/types/typing-training";

// ============================================================================
// Database Row Types (matching Supabase schema)
// ============================================================================

interface WordRow {
  id: string;
  word: string;
  type: string;
  difficulty: number;
  language: string;
  created_at: string;
}

interface TrainingMaterialRow {
  id: string;
  user_id: string | null;
  mode: string;
  content: string;
  difficulty: number;
  metadata: unknown;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

interface TrainingSessionRow {
  id: string;
  user_id: string | null;
  material_id: string | null;
  mode: string;
  accuracy: number;
  speed: number;
  total_time: number;
  total_characters: number;
  correct_characters: number;
  incorrect_characters: number;
  frequent_errors: unknown;
  created_at: string;
}

// ============================================================================
// Word Operations (Requirement 3.1, 3.6)
// ============================================================================

/**
 * Fetch words from database with optional filters
 * Requirement 3.1: Word_Set from database
 * Requirement 3.6: Support filtering by word type and difficulty
 */
export async function fetchWords(filters: WordFilter = {}): Promise<WordMeta[]> {
  const supabase = getSupabaseClient();
  
  let query = supabase
    .from("words")
    .select("id, word, type, difficulty");

  // Apply type filter
  if (filters.types && filters.types.length > 0) {
    query = query.in("type", filters.types);
  }

  // Apply difficulty filter
  if (filters.difficulty !== undefined) {
    query = query.eq("difficulty", filters.difficulty);
  }

  // Apply limit
  if (filters.limit !== undefined && filters.limit > 0) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch words: ${error.message}`);
  }

  return (data as WordRow[]).map(mapWordRowToMeta);
}

// ============================================================================
// Training Material Operations (Requirement 10.1, 10.2, 10.3, 10.4)
// ============================================================================

/**
 * Save a training material to the database
 * Requirement 10.1: Save generated materials for reuse
 */
export async function saveMaterial(
  material: Omit<TrainingMaterial, "id" | "createdAt">,
  userId?: string
): Promise<string> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("training_materials")
    .insert({
      user_id: userId || material.userId || null,
      mode: material.mode,
      content: material.content,
      difficulty: material.difficulty,
      metadata: material.metadata,
      is_favorite: material.isFavorite,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to save material: ${error.message}`);
  }

  return data.id;
}

/**
 * Get a training material by ID
 * Requirement 10.2: Browse and select from previously generated materials
 */
export async function getMaterial(id: string): Promise<TrainingMaterial | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("training_materials")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No rows returned
      return null;
    }
    throw new Error(`Failed to get material: ${error.message}`);
  }

  return mapMaterialRowToEntity(data as TrainingMaterialRow);
}

/**
 * List training materials for a user
 * Requirement 10.2: Browse and select from previously generated materials
 */
export async function listMaterials(
  userId: string,
  mode?: TrainingMode
): Promise<TrainingMaterial[]> {
  const supabase = getSupabaseClient();

  let query = supabase
    .from("training_materials")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (mode) {
    query = query.eq("mode", mode);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to list materials: ${error.message}`);
  }

  return (data as TrainingMaterialRow[]).map(mapMaterialRowToEntity);
}

/**
 * Toggle favorite status of a training material
 * Requirement 10.3: Support marking materials as favorites
 */
export async function toggleFavorite(id: string): Promise<boolean> {
  const supabase = getSupabaseClient();

  // First get current favorite status
  const { data: current, error: fetchError } = await supabase
    .from("training_materials")
    .select("is_favorite")
    .eq("id", id)
    .single();

  if (fetchError) {
    throw new Error(`Failed to get material: ${fetchError.message}`);
  }

  const newFavoriteStatus = !current.is_favorite;

  // Update favorite status
  const { error: updateError } = await supabase
    .from("training_materials")
    .update({ is_favorite: newFavoriteStatus })
    .eq("id", id);

  if (updateError) {
    throw new Error(`Failed to toggle favorite: ${updateError.message}`);
  }

  return newFavoriteStatus;
}

/**
 * Delete a training material
 * Requirement 10.4: Support deleting unwanted materials
 */
export async function deleteMaterial(id: string): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("training_materials")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to delete material: ${error.message}`);
  }
}

// ============================================================================
// Session Operations (Requirement 9.3)
// ============================================================================

/**
 * Save a training session result
 * Requirement 9.3: Save session results for historical comparison
 */
export async function saveSession(
  session: SessionResult,
  userId?: string,
  materialId?: string
): Promise<string> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("training_sessions")
    .insert({
      user_id: userId || session.userId || null,
      material_id: materialId || session.materialId || null,
      mode: session.mode || "word",
      accuracy: session.accuracy,
      speed: session.speed,
      total_time: session.totalTime,
      total_characters: session.totalCharacters,
      correct_characters: session.correctCharacters,
      incorrect_characters: session.incorrectCharacters,
      frequent_errors: session.frequentErrors,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to save session: ${error.message}`);
  }

  return data.id;
}

/**
 * Get session history for a user
 * Requirement 9.3: Save session results for historical comparison
 * Requirement 9.4: Display progress trends across multiple sessions
 */
export async function getSessionHistory(
  userId: string,
  limit?: number
): Promise<SessionResult[]> {
  const supabase = getSupabaseClient();

  let query = supabase
    .from("training_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (limit !== undefined && limit > 0) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get session history: ${error.message}`);
  }

  return (data as TrainingSessionRow[]).map(mapSessionRowToResult);
}

/**
 * Get a session by ID
 */
export async function getSession(id: string): Promise<SessionResult | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("training_sessions")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(`Failed to get session: ${error.message}`);
  }

  return mapSessionRowToResult(data as TrainingSessionRow);
}

// ============================================================================
// Mapping Functions
// ============================================================================

function mapWordRowToMeta(row: WordRow): WordMeta {
  return {
    id: row.id,
    word: row.word,
    type: row.type as WordType,
    difficulty: row.difficulty as DifficultyLevel,
  };
}

function mapMaterialRowToEntity(row: TrainingMaterialRow): TrainingMaterial {
  return {
    id: row.id,
    userId: row.user_id || undefined,
    mode: row.mode as TrainingMode,
    content: row.content,
    difficulty: row.difficulty as DifficultyLevel,
    metadata: row.metadata as TrainingMaterialMetadata,
    isFavorite: row.is_favorite,
    createdAt: new Date(row.created_at),
  };
}

function mapSessionRowToResult(row: TrainingSessionRow): SessionResult {
  return {
    id: row.id,
    userId: row.user_id || undefined,
    materialId: row.material_id || undefined,
    mode: row.mode as TrainingMode,
    accuracy: Number(row.accuracy),
    speed: Number(row.speed),
    totalTime: row.total_time,
    totalCharacters: row.total_characters,
    correctCharacters: row.correct_characters,
    incorrectCharacters: row.incorrect_characters,
    frequentErrors: (row.frequent_errors as ErrorStat[]) || [],
    createdAt: new Date(row.created_at),
  };
}
