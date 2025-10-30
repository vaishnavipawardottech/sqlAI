import databaseService from '../services/databaseService.js';
import aiService from '../services/aiService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// POST /api/generate-schema
const generateSchema = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  if (!description) return res.status(400).json({ error: 'description is required' });

  const aiResult = await aiService.generateSchema(description);

  // save schema to DB
  const schemaId = await databaseService.saveSchema(name || 'generated_schema', description || '', aiResult.sql, aiResult.metadata);

  // try to execute CREATE TABLE statements
  const execution = await databaseService.executeSchema(aiResult.sql);

  return res.json({ schemaId, sql: aiResult.sql, metadata: aiResult.metadata, execution });
});

// POST /api/nl-to-sql
const nlToSql = asyncHandler(async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt is required' });

  const latestSchema = await databaseService.getLatestSchema();
  const schemaContext = latestSchema ? { metadata: JSON.parse(latestSchema.metadata || '{}') } : null;

  const aiResult = await aiService.generateQuery(prompt, schemaContext);

  // Optionally, do not auto-execute — return SQL and let client decide
  return res.json({ sql: aiResult.sql });
});

// POST /api/execute-query
const executeQuery = asyncHandler(async (req, res) => {
  const { sql, nl } = req.body;
  if (!sql) return res.status(400).json({ error: 'sql is required' });

  // Only allow SELECTs here
  try {
    const result = await databaseService.executeQuery(sql);

    // Save to history with latest schema id if available
    const latestSchema = await databaseService.getLatestSchema();
    const schemaId = latestSchema?.id || null;
    await databaseService.saveQueryHistory(schemaId, nl || '', sql, result, 'success');

    return res.json({ status: 'success', rows: result });
  } catch (err) {
    // Save error to history
    const latestSchema = await databaseService.getLatestSchema();
    const schemaId = latestSchema?.id || null;
    await databaseService.saveQueryHistory(schemaId, nl || '', sql, { error: err.message }, 'error');
    return res.status(400).json({ status: 'error', error: err.message });
  }
});

export { generateSchema, nlToSql, executeQuery };
