import { pool } from '../config/db.ts';
import type { Lead, LeadData } from '../types/index.ts';
import type { PoolClient } from '../../deps.ts';

export class LeadRepository {
  async createLead(leadData: LeadData): Promise<Lead> {
    const client: PoolClient = await pool.connect();
    try {
      // The database stores scores as 0-100 NUMERIC(5,2)
      // The LeadData interface uses 0-1 numbers.
      const result =
        await client.queryObject<// Explicitly type the raw row structure expected from the DB
        {
          id: number;
          email: string;
          website_url: string;
          performance_score: string | null; // numeric might come back as string
          accessibility_score: string | null;
          best_practices_score: string | null;
          seo_score: string | null;
          continue_requested: boolean;
          submitted_at: Date;
          analysis_data: Record<string, any> | null; // JSONB
        }>(
          `INSERT INTO leads (email, website_url, performance_score, accessibility_score, best_practices_score, seo_score, analysis_data)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING id, email, website_url, performance_score, accessibility_score, best_practices_score, seo_score, analysis_data, continue_requested, submitted_at`,
          [
            leadData.email,
            leadData.websiteUrl,
            leadData.performanceScore !== null
              ? (leadData.performanceScore * 100).toFixed(2)
              : null,
            leadData.accessibilityScore !== null
              ? (leadData.accessibilityScore * 100).toFixed(2)
              : null,
            leadData.bestPracticesScore !== null
              ? (leadData.bestPracticesScore * 100).toFixed(2)
              : null,
            leadData.seoScore !== null
              ? (leadData.seoScore * 100).toFixed(2)
              : null,
            leadData.analysisData
              ? JSON.stringify(leadData.analysisData)
              : null,
          ]
        );

      if (result.rows.length === 0) {
        throw new Error('Failed to create lead, no rows returned.');
      }

      const createdDbLead = result.rows[0];

      // Map snake_case DB result to camelCase Lead interface
      // Convert score strings back to numbers / 100
      const createdLead: Lead = {
        id: createdDbLead.id,
        email: createdDbLead.email,
        websiteUrl: createdDbLead.website_url,
        performanceScore: createdDbLead.performance_score
          ? parseFloat(createdDbLead.performance_score) / 100
          : null,
        accessibilityScore: createdDbLead.accessibility_score
          ? parseFloat(createdDbLead.accessibility_score) / 100
          : null,
        bestPracticesScore: createdDbLead.best_practices_score
          ? parseFloat(createdDbLead.best_practices_score) / 100
          : null,
        seoScore: createdDbLead.seo_score
          ? parseFloat(createdDbLead.seo_score) / 100
          : null,
        analysisData: createdDbLead.analysis_data,
        continueRequested: createdDbLead.continue_requested,
        submittedAt: createdDbLead.submitted_at,
      };

      return createdLead;
    } catch (err) {
      console.error('Error creating lead in repository:', err);
      throw err; // Re-throw to be handled by service/controller
    } finally {
      client.release();
    }
  }

  async updateContinueRequested(id: number): Promise<boolean> {
    const client: PoolClient = await pool.connect();
    try {
      const result = await client.queryObject(
        `UPDATE leads SET continue_requested = TRUE WHERE id = $1 RETURNING id`,
        [id]
      );
      return result.rows.length > 0; // Return true if a row was updated
    } catch (err) {
      console.error(`Error updating continue_requested for lead ${id}:`, err);
      throw err;
    } finally {
      client.release();
    }
  }

  async findLeadById(id: number): Promise<Lead | null> {
    const client: PoolClient = await pool.connect();
    try {
      // Use SQL aliases to match camelCase and divide scores in the query
      const result = await client.queryObject<Lead>(
        `SELECT id, email, website_url AS "websiteUrl",
                        (performance_score / 100.0)::NUMERIC(5, 2) AS "performanceScore",
                        (accessibility_score / 100.0)::NUMERIC(5, 2) AS "accessibilityScore",
                        (best_practices_score / 100.0)::NUMERIC(5, 2) AS "bestPracticesScore",
                        (seo_score / 100.0)::NUMERIC(5, 2) AS "seoScore",
                        analysis_data AS "analysisData",
                        continue_requested AS "continueRequested",
                        submitted_at AS "submittedAt"
                 FROM leads WHERE id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return null;
      }

      // Ensure scores are numbers (numeric types might still be strings)
      const lead = result.rows[0];
      lead.performanceScore = lead.performanceScore
        ? Number(lead.performanceScore)
        : null;
      lead.accessibilityScore = lead.accessibilityScore
        ? Number(lead.accessibilityScore)
        : null;
      lead.bestPracticesScore = lead.bestPracticesScore
        ? Number(lead.bestPracticesScore)
        : null;
      lead.seoScore = lead.seoScore ? Number(lead.seoScore) : null;

      return lead;
    } catch (err) {
      console.error(`Error finding lead by ID ${id}:`, err);
      throw err;
    } finally {
      client.release();
    }
  }
}
