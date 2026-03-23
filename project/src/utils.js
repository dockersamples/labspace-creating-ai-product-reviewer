import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';

/**
 * Computes the cosine similarity between two vectors.
 *
 * Cosine similarity measures the angle between two vectors in high-dimensional
 * space. A value of 1.0 means the vectors point in exactly the same direction
 * (very similar), while 0.0 means they are perpendicular (unrelated).
 *
 * This is used to determine how semantically similar two text embeddings are.
 */
export function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Loads a JSON file from disk. Returns null if the file doesn't exist.
 */
export function loadJSON(filePath) {
  try {
    if (existsSync(filePath)) {
      return JSON.parse(readFileSync(filePath, 'utf-8'));
    }
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error.message);
  }
  return null;
}

/**
 * Saves data as a formatted JSON file, creating intermediate directories as needed.
 */
export function saveJSON(filePath, data) {
  const dir = path.dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(filePath, JSON.stringify(data, null, 2));
}
