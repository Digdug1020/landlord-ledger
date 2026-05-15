'use strict';

/**
 * Prompt rules injected into the Claude request for detecting recurring
 * (repeating) transactions. Centralised here so the heuristic can be tuned
 * independently of the rest of the parsing pipeline.
 */
const RECURRING_PROMPT_RULES =
  '- "recurring": boolean — true if this looks like a repeating charge ' +
  '(insurance, mortgage, utilities, subscriptions, etc.)';

module.exports = { RECURRING_PROMPT_RULES };
