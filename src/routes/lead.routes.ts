import { Router } from '../../deps.ts';
import type { RouterContext } from '../../deps.ts'; // Import RouterContext if needed for type safety
import { LeadController } from '../controllers/lead.controller.ts';

// Specify the base path for all routes defined in this router
const API_BASE = '/api/v1/leads';

// Type the router to handle state if necessary, otherwise defaults work
const leadRouter = new Router();
const leadController = new LeadController(); // Instantiate the controller

// Define route for submitting website for analysis
// POST /analyze
leadRouter.post(
  `${API_BASE}/analyze`,
  // Oak automatically provides the correct context type, explicit type often not needed
  (ctx) => leadController.handleAnalyze(ctx)
);

// Define route for marking a lead to be continued (e.g., user showed interest)
// PATCH /leads/:id/continue  (PATCH is suitable for partial updates)
leadRouter.patch(
  `${API_BASE}/:id/continue`,
  (
    ctx: RouterContext<`${typeof API_BASE}/:id/continue`> // <-- Add typed context
  ) => leadController.handleContinue(ctx)
);

// Optional: Add a GET route to fetch a lead by ID if needed later
// leadRouter.get(
//     "/leads/:id",
//     (ctx) => leadController.handleGetLeadById(ctx) // Assuming you add this method to the controller
// );

export default leadRouter;
