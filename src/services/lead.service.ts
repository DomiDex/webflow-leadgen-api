import { LeadRepository } from '../repositories/lead.repository.ts';
import { PageSpeedService } from './pagespeed.service.ts';
import type {
  Lead,
  LeadData,
  Scores,
  PageSpeedApiResponse,
  PageSpeedAnalysisRequest,
} from '../types/index.ts';

export class LeadService {
  // Use private readonly for dependencies injected in constructor
  private readonly leadRepository: LeadRepository;
  private readonly pageSpeedService: PageSpeedService;

  // Constructor with potential for dependency injection later
  constructor(
    leadRepository?: LeadRepository,
    pageSpeedService?: PageSpeedService
  ) {
    this.leadRepository = leadRepository || new LeadRepository();
    this.pageSpeedService = pageSpeedService || new PageSpeedService();
  }

  /**
   * Analyzes a website URL using PageSpeed Insights and creates a lead record.
   * If analysis fails, it still creates the lead with null scores.
   */
  async analyzeAndCreateLead(
    email: string,
    websiteUrl: string,
    strategy: 'DESKTOP' | 'MOBILE' = 'MOBILE'
  ): Promise<{ leadId: number; scores: Scores }> {
    // Basic validation
    if (!email || !websiteUrl) {
      throw new Error('Email and Website URL are required.');
      // TODO: Add more robust validation (e.g., email format, URL format)
    }

    let analysisResult: { scores: Scores; analysisData: PageSpeedApiResponse };
    try {
      console.log(`Starting PageSpeed analysis for ${websiteUrl}...`);
      analysisResult = await this.pageSpeedService.analyzeUrl(
        websiteUrl,
        strategy
      );
      console.log(`PageSpeed analysis finished for ${websiteUrl}.`);
    } catch (error) {
      // Log the error with more robust handling
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`Analysis failed for ${websiteUrl}: ${errorMessage}`);
      // Decide how to proceed. Here, we store a structured error.
      analysisResult = {
        scores: {
          performance: null,
          accessibility: null,
          bestPractices: null,
          seo: null,
        },
        // Store a structured error object for the frontend/DB
        analysisData: {
          error: { code: 500, message: `Analysis failed: ${errorMessage}` },
        },
      };
    }

    // Prepare data for database insertion (scores are 0-1)
    const leadData: LeadData = {
      email: email.trim(),
      websiteUrl: websiteUrl.trim(), // Ensure URL is trimmed
      performanceScore: analysisResult.scores.performance,
      accessibilityScore: analysisResult.scores.accessibility,
      bestPracticesScore: analysisResult.scores.bestPractices,
      seoScore: analysisResult.scores.seo,
      analysisData: analysisResult.analysisData, // Store the full response or error structure
    };

    try {
      console.log(`Attempting to save lead for ${email} (${websiteUrl})`);
      const createdLead = await this.leadRepository.createLead(leadData);
      console.log(`Lead created successfully with ID: ${createdLead.id}`);

      // Return scores in 0-1 format consistent with the Lead type
      return {
        leadId: createdLead.id,
        scores: {
          performance: createdLead.performanceScore,
          accessibility: createdLead.accessibilityScore,
          bestPractices: createdLead.bestPracticesScore,
          seo: createdLead.seoScore,
        },
      };
    } catch (dbError) {
      // Log the error with more robust handling
      const errorMessage =
        dbError instanceof Error ? dbError.message : String(dbError);
      console.error(
        `Failed to save lead for ${email} / ${websiteUrl}: ${errorMessage}`
      );
      // Rethrow a more specific error or handle as needed
      throw new Error(`Database error while saving lead: ${errorMessage}`);
    }
  }

  /**
   * Marks a lead as having requested continuation.
   * Returns true if the lead was found and updated, false otherwise.
   */
  async requestContinue(id: number): Promise<boolean> {
    if (typeof id !== 'number' || isNaN(id) || id <= 0) {
      throw new Error(
        `Invalid Lead ID provided: ${id}. Must be a positive number.`
      );
    }
    try {
      console.log(`Attempting to mark lead ID ${id} as continue_requested.`);
      const success = await this.leadRepository.updateContinueRequested(id);
      if (success) {
        console.log(
          `Successfully marked continue requested for lead ID: ${id}`
        );
      } else {
        // This is not necessarily an error, the ID might just not exist
        console.warn(
          `Attempted to request continue for non-existent lead ID: ${id}`
        );
      }
      return success;
    } catch (error) {
      // Log the error with more robust handling
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        `Error processing continue request for lead ${id}: ${errorMessage}`
      );
      // Rethrow a more specific error or handle as needed
      throw new Error(
        `Failed to update lead status for ID ${id}: ${errorMessage}`
      );
    }
  }
}
