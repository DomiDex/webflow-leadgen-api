import { Context, Status, RouterContext } from '../../deps.ts';
import { LeadService } from '../services/lead.service.ts';
import type { PageSpeedAnalysisRequest } from '../types/index.ts';
import { isValidEmail } from '../utils/validators.ts'; // Import specific validators

// Define the specific route path used in the router for typing
const CONTINUE_ROUTE = '/api/v1/leads/:id/continue';

export class LeadController {
  // Use private readonly for dependencies
  private readonly leadService: LeadService;

  constructor(leadService?: LeadService) {
    this.leadService = leadService || new LeadService();
  }

  // Handler for POST /analyze
  async handleAnalyze(ctx: Context) {
    try {
      if (!ctx.request.hasBody) {
        ctx.response.status = Status.BadRequest;
        ctx.response.body = { success: false, message: 'Missing request body' };
        return;
      }
      const body = ctx.request.body({ type: 'json' });
      const value: PageSpeedAnalysisRequest = await body.value;

      // --- Input Validation ---
      const errors: string[] = [];
      if (!value.email) {
        errors.push('Email is required.');
      } else if (!isValidEmail(value.email)) {
        errors.push('Invalid email format.');
      }
      if (!value.websiteUrl) {
        errors.push('Website URL is required.');
      }
      // Note: More specific URL validation happens in PageSpeedService

      if (errors.length > 0) {
        ctx.response.status = Status.BadRequest;
        ctx.response.body = {
          success: false,
          message: 'Validation failed',
          errors,
        };
        return;
      }
      // --- End Validation ---

      console.log(
        `[Controller] Received analysis request: Email=${value.email}, URL=${value.websiteUrl}`
      );

      // Allow specifying strategy via query param (default to MOBILE)
      const strategyParam = ctx.request.url.searchParams
        .get('strategy')
        ?.toUpperCase();
      const strategy = strategyParam === 'DESKTOP' ? 'DESKTOP' : 'MOBILE'; // Default to MOBILE
      console.log(`[Controller] Using strategy: ${strategy}`);

      const result = await this.leadService.analyzeAndCreateLead(
        value.email,
        value.websiteUrl,
        strategy
      );

      console.log(
        `[Controller] Analysis and lead creation successful: Lead ID ${result.leadId}`
      );
      ctx.response.status = Status.Created; // Use 201 Created for resource creation
      ctx.response.body = { success: true, data: result }; // Contains { leadId: number, scores: Scores }
    } catch (error) {
      console.error('[Controller:handleAnalyze] Error:', error);

      // Map service/repository errors to HTTP statuses
      if (error instanceof Error) {
        if (
          error.message.includes('required') ||
          error.message.includes('Invalid format')
        ) {
          ctx.response.status = Status.BadRequest;
          ctx.response.body = { success: false, message: error.message };
        } else if (
          error.message.includes('Failed to analyze') ||
          error.message.includes('PageSpeed API')
        ) {
          ctx.response.status = Status.BadGateway; // Indicate failure with external service
          ctx.response.body = {
            success: false,
            message:
              'Failed to analyze the website due to an external service error.',
            details: error.message,
          };
        } else if (error.message.includes('Database error')) {
          ctx.response.status = Status.InternalServerError;
          ctx.response.body = {
            success: false,
            message: 'Failed to save analysis results due to a database issue.',
            details: error.message,
          };
        } else {
          ctx.response.status = Status.InternalServerError;
          ctx.response.body = {
            success: false,
            message: 'An unexpected server error occurred.',
            details: error.message,
          };
        }
      } else {
        // Fallback for non-Error types thrown
        ctx.response.status = Status.InternalServerError;
        ctx.response.body = {
          success: false,
          message: 'An unexpected and unknown error occurred.',
        };
      }
    }
  }

  // Handler for PATCH /leads/:id/continue
  async handleContinue(ctx: RouterContext<typeof CONTINUE_ROUTE>) {
    try {
      const idParam = ctx.params.id;
      if (!idParam) {
        ctx.response.status = Status.BadRequest;
        ctx.response.body = {
          success: false,
          message: 'Missing lead ID in URL path.',
        };
        return;
      }
      const id = parseInt(idParam, 10);
      if (isNaN(id) || id <= 0) {
        ctx.response.status = Status.BadRequest;
        ctx.response.body = {
          success: false,
          message: 'Invalid lead ID format. Must be a positive integer.',
        };
        return;
      }

      console.log(`[Controller] Received continue request for lead ID: ${id}`);

      const success = await this.leadService.requestContinue(id);

      if (success) {
        console.log(`[Controller] Lead ${id} marked for continuation.`);
        ctx.response.status = Status.OK;
        ctx.response.body = {
          success: true,
          message: 'Lead marked for continuation.',
        };
      } else {
        console.warn(`[Controller] Lead ${id} not found for continue request.`);
        ctx.response.status = Status.NotFound;
        ctx.response.body = { success: false, message: 'Lead not found.' };
      }
    } catch (error) {
      console.error('[Controller:handleContinue] Error:', error);
      if (error instanceof Error) {
        if (error.message.includes('Invalid Lead ID')) {
          ctx.response.status = Status.BadRequest;
          ctx.response.body = { success: false, message: error.message };
        } else if (error.message.includes('Failed to update lead status')) {
          ctx.response.status = Status.InternalServerError;
          ctx.response.body = {
            success: false,
            message: 'Failed to update lead status.',
            details: error.message,
          };
        } else {
          ctx.response.status = Status.InternalServerError;
          ctx.response.body = {
            success: false,
            message: 'An unexpected server error occurred.',
            details: error.message,
          };
        }
      } else {
        ctx.response.status = Status.InternalServerError;
        ctx.response.body = {
          success: false,
          message: 'An unexpected and unknown error occurred.',
        };
      }
    }
  }
}
