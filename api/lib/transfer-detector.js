'use strict';

/**
 * Keywords whose presence in a transaction description suggests it is an
 * internal account transfer rather than real income or spending.
 */
const TRANSFER_KEYWORDS = [
  'transfer', 'zelle', 'cash app', 'venmo', 'paypal',
  'ach transfer', 'wire transfer', 'mobile deposit',
  'account transfer', 'between accounts',
];

/**
 * Prompt rules injected into the Claude request explaining how to classify
 * transfers vs income. Kept here so changes to detection logic are in one place.
 */
const TRANSFER_PROMPT_RULES = `- Use type "transfer" for internal account movements that are NOT real income or spending:
    * Description contains (case-insensitive): ${TRANSFER_KEYWORDS.join(', ')}
    * EXCEPTION: if description also contains a person's name or words like "rent", "deposit from", "payment from" — use "income" instead; it is a legitimate rent payment received
- Use type "income" for real earnings: rent received, service fees, interest earned, refunds
- Use type "expense" for real spending: repairs, utilities, insurance, loan payments, purchases`;

module.exports = { TRANSFER_KEYWORDS, TRANSFER_PROMPT_RULES };
