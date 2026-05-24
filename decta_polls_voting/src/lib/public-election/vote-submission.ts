import { prepareSubmissionPayloads } from './vote-encryption';

export async function startBallotSession(tenantSlug: string, electionSlug: string) {
  const res = await fetch(`/api/public/${tenantSlug}/${electionSlug}/vote/session/start`, {
    method: 'POST'
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to start ballot session');
  }
  const data = await res.json();
  return data.sessionId;
}

export async function submitBallot(
  tenantSlug: string, 
  electionSlug: string, 
  sessionId: string,
  selections: Record<string, any>, 
  positions: any[], 
  ballotIds: Record<string, string>,
  encryptionKeyPublic: string
) {
  // 1. Prepare and encrypt payloads
  const payloads = await prepareSubmissionPayloads(selections, positions, ballotIds, encryptionKeyPublic);

  // 2. Submit to server
  const res = await fetch(`/api/public/${tenantSlug}/${electionSlug}/vote/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sessionId,
      payloads
    })
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to submit ballot');
  }

  return await res.json();
}
