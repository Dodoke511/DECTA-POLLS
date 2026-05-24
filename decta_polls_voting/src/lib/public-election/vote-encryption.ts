/**
 * Utility for client-side vote encryption.
 * Implements AES-GCM encryption using the Web Crypto API.
 */

// We assume the encryptionKeyPublic is provided as a hex or base64 string.
// This function derives a valid 256-bit AES-GCM CryptoKey from it.
async function getCryptoKey(keyString: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(keyString);
  
  // Hash the key string to ensure it's exactly 256 bits (32 bytes)
  const hash = await crypto.subtle.digest('SHA-256', keyData);

  return await crypto.subtle.importKey(
    'raw',
    hash,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
}

/**
 * Encrypts a ballot payload (JSON object) using AES-GCM.
 * Returns a base64 encoded string containing the IV and Ciphertext.
 * 
 * Format: base64(IV + Ciphertext)
 */
export async function encryptVotePayload(
  payload: Record<string, any>,
  encryptionKeyPublic: string
): Promise<string> {
  if (!encryptionKeyPublic) {
    throw new Error('Encryption key is missing');
  }

  const key = await getCryptoKey(encryptionKeyPublic);
  
  // Generate a random 12-byte (96-bit) IV as recommended for AES-GCM
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(payload));
  
  // Encrypt the data
  const ciphertextBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    data
  );

  // Combine IV and Ciphertext into a single buffer
  const ciphertextBytes = new Uint8Array(ciphertextBuffer);
  const combined = new Uint8Array(iv.length + ciphertextBytes.length);
  combined.set(iv, 0);
  combined.set(ciphertextBytes, iv.length);
  
  // Convert combined buffer to Base64 using modern approach (btoa handles up to latin1, we need to convert correctly)
  const base64Str = btoa(String.fromCharCode.apply(null, Array.from(combined)));
  return base64Str;
}

/**
 * Helper to structure the final payloads for submission.
 * Each position gets its own encrypted payload if it's not an abstain vote.
 * For Abstain votes, the payload is explicitly marked and unencrypted.
 */
export async function prepareSubmissionPayloads(
  selections: Record<string, any>, // positionId -> selected candidateId(s)
  positions: any[],
  ballotIds: Record<string, string>, // positionId -> ballotId
  encryptionKeyPublic: string
) {
  const payloads = [];

  for (const position of positions) {
    const selection = selections[position.id];
    const ballotId = ballotIds[position.id];
    
    if (!ballotId) {
      console.warn(`No ballot ID mapped for position ${position.id}`);
      continue;
    }

    if (!selection || selection === 'abstain') {
      // Abstain vote
      payloads.push({
        position_id: position.id,
        ballot_id: ballotId,
        is_abstain: true
      });
    } else {
      // Create payload to be encrypted
      // For standard voting, selection is just a candidateId
      // For ranked voting, selection is an array of candidate objects { candidate_id, rank }
      
      const isRanked = Array.isArray(selection);
      const plainPayload = {
        position_id: position.id,
        ballot_id: ballotId,
        selection: selection,
        timestamp: new Date().toISOString()
      };

      const encrypted_payload = await encryptVotePayload(plainPayload, encryptionKeyPublic);
      
      const payloadObj: any = {
        position_id: position.id,
        ballot_id: ballotId,
        is_abstain: false,
        encrypted_payload: encrypted_payload
      };

      // In standard voting, we need to pass candidate_id to tally, but we KEEP IT out of the DB 'encrypted_payload' logic?
      // Wait, the submit_vote RPC does:
      // WHERE candidate_id = (v_payload->>'candidate_id')::UUID;
      // So the RPC needs candidate_id exposed in the outer payload!
      
      if (!isRanked) {
        payloadObj.candidate_id = selection;
      } else {
        payloadObj.ranked_choices = selection; // array of { candidate_id, rank }
      }

      payloads.push(payloadObj);
    }
  }

  return payloads;
}
