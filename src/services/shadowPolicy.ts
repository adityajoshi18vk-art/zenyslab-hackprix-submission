/**
 * Shadow Policy service — generates an improved version of the policy
 * that addresses all blind spots and conflicts.
 */

import { getApiUrl } from './mongodb';

export interface ShadowPolicyChange {
  group: string;
  clause: string;
}

export interface ShadowPolicyResult {
  improvedPolicy: string;
  changes: ShadowPolicyChange[];
}

export function cleanDecision(text: string) {
  return text
    .replace(/The refined English transcript is:\s*/gi, '')
    .replace(/^["']|["']$/g, '') // remove surrounding quotes
    .trim();
}

export async function generateShadowPolicy(
  decision: string,
  forgottenStakeholders: { name: string; reason: string }[],
  conflicts: { groupA: string; groupB: string; reason: string }[]
): Promise<ShadowPolicyResult> {
  const cleanedDecision = cleanDecision(decision);

  const response = await fetch(`${getApiUrl()}/api/proxy/gemini/shadow-policy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ decision: cleanedDecision, forgottenStakeholders, conflicts }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Shadow policy error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error);
  }

  return {
    improvedPolicy: data.improvedPolicy || '',
    changes: data.changes || [],
  };
}
