import { Router } from '../../deps.ts';
import type { RouterContext } from '../../deps.ts'; // Import specific type if needed for context
import { LeadController } from '../controllers/lead.controller.ts';

const leadRouter = new Router();
const leadController = new LeadController(); // Instantiate the controller

// Define route for submitting website for analysis
// POST /analyze
leadRouter.post(
  '/analyze',
  // Oak automatically provides the correct context type, explicit type often not needed
  (ctx) => leadController.handleAnalyze(ctx)
);

// Define route for marking a lead to be continued (e.g., user showed interest)
// PATCH /leads/:id/continue  (PATCH is suitable for partial updates)
leadRouter.patch('/leads/:id/continue', (ctx) =>
  leadController.handleContinue(ctx)
);

// Optional: Add a GET route to fetch a lead by ID if needed later
// leadRouter.get(
//     "/leads/:id",
//     (ctx) => leadController.handleGetLeadById(ctx) // Assuming you add this method to the controller
// );

export default leadRouter;
