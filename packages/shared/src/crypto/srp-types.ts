/**
 * SRP-6a handshake message types for zero-knowledge password authentication.
 *
 * Flow:
 * 1. Client → Server: SrpClientHello (identity)
 * 2. Server → Client: SrpServerChallenge (salt, B)
 * 3. Client → Server: SrpClientProof (A, M1)
 * 4. Server → Client: SrpServerVerify (M2) or SrpError
 */

import type { OriginMetadata } from "../connection.js";

/** Client initiates SRP handshake with identity */
export interface SrpClientHello {
  type: "srp_hello";
  /** Username/identity */
  identity: string;
  /** Browser profile identifier for session tracking */
  browserProfileId?: string;
  /** Origin metadata for device/browser identification */
  originMetadata?: OriginMetadata;
}

/** Server responds with salt and ephemeral public value B */
export interface SrpServerChallenge {
  type: "srp_challenge";
  /** Salt used to generate verifier (hex string) */
  salt: string;
  /** Server ephemeral public value (hex string) */
  B: string;
}

/** Client sends ephemeral public value and proof that it knows the password */
export interface SrpClientProof {
  type: "srp_proof";
  /** Client ephemeral public value (hex string) */
  A: string;
  /** Client proof value M1 (hex string) */
  M1: string;
}

/** Server verifies client and proves it knows verifier */
export interface SrpServerVerify {
  type: "srp_verify";
  /** Server proof value M2 (hex string) */
  M2: string;
  /** Session ID for session resumption (optional, set if session service available) */
  sessionId?: string;
  /** Server-generated challenge for first session resume (hex string) */
  challenge?: string;
}

/** SRP error codes */
export type SrpErrorCode =
  | "invalid_identity"
  | "invalid_proof"
  | "server_error";

// ============================================================================
// Session Resumption (skip SRP handshake with stored session key)
// ============================================================================

/** Client attempts to resume existing session */
export interface SrpSessionResume {
  type: "srp_resume";
  /** Username/identity */
  identity: string;
  /** Session ID from previous authentication */
  sessionId: string;
  /** Encrypted timestamp proving key possession (hex string) */
  proof: string;
}

/** Server confirms session resumed successfully */
export interface SrpSessionResumed {
  type: "srp_resumed";
  /** Session ID that was resumed */
  sessionId: string;
  /** Server-generated challenge for next session resume (hex string) */
  challenge?: string;
}

/**
 * Reasons a session cannot be resumed.
 *
 * - "expired": Session exists but exceeded idle timeout or max lifetime
 * - "unknown": Session ID is not recognized by the server
 * - "invalid_proof": Resume proof decryption failed or timestamp is too old
 * - "challenge_required": Server requires a valid challenge in the proof.
 *   This occurs when: (1) server has a pending challenge but client didn't include it,
 *   (2) client provided a wrong challenge, or (3) legacy session without challenge
 *   chain needs re-authentication. Client must perform full SRP authentication.
 */
export type SrpSessionInvalidReason =
  | "expired"
  | "unknown"
  | "invalid_proof"
  | "challenge_required";

/**
 * Server indicates session is invalid, client must do full SRP authentication.
 *
 * When `reason === "challenge_required"`, the client MUST initiate a fresh SRP
 * handshake rather than treating this as a transient error. The server will
 * establish a new challenge chain during the authentication flow.
 */
export interface SrpSessionInvalid {
  type: "srp_invalid";
  /** Why the session could not be resumed */
  reason: SrpSessionInvalidReason;
}

/** SRP error (authentication failed) */
export interface SrpError {
  type: "srp_error";
  /** Error code */
  code: SrpErrorCode;
  /** Human-readable message */
  message: string;
}

/** All SRP messages from client to server */
export type SrpClientMessage =
  | SrpClientHello
  | SrpClientProof
  | SrpSessionResume;

/** All SRP messages from server to client */
export type SrpServerMessage =
  | SrpServerChallenge
  | SrpServerVerify
  | SrpError
  | SrpSessionResumed
  | SrpSessionInvalid;

/** All SRP protocol messages */
export type SrpMessage = SrpClientMessage | SrpServerMessage;

/** Type guards */
export function isSrpClientHello(msg: unknown): msg is SrpClientHello {
  return (
    typeof msg === "object" &&
    msg !== null &&
    (msg as SrpClientHello).type === "srp_hello"
  );
}

export function isSrpClientProof(msg: unknown): msg is SrpClientProof {
  return (
    typeof msg === "object" &&
    msg !== null &&
    (msg as SrpClientProof).type === "srp_proof"
  );
}

export function isSrpServerChallenge(msg: unknown): msg is SrpServerChallenge {
  return (
    typeof msg === "object" &&
    msg !== null &&
    (msg as SrpServerChallenge).type === "srp_challenge"
  );
}

export function isSrpServerVerify(msg: unknown): msg is SrpServerVerify {
  return (
    typeof msg === "object" &&
    msg !== null &&
    (msg as SrpServerVerify).type === "srp_verify"
  );
}

export function isSrpError(msg: unknown): msg is SrpError {
  return (
    typeof msg === "object" &&
    msg !== null &&
    (msg as SrpError).type === "srp_error"
  );
}

export function isSrpSessionResume(msg: unknown): msg is SrpSessionResume {
  return (
    typeof msg === "object" &&
    msg !== null &&
    (msg as SrpSessionResume).type === "srp_resume"
  );
}

export function isSrpSessionResumed(msg: unknown): msg is SrpSessionResumed {
  return (
    typeof msg === "object" &&
    msg !== null &&
    (msg as SrpSessionResumed).type === "srp_resumed"
  );
}

export function isSrpSessionInvalid(msg: unknown): msg is SrpSessionInvalid {
  return (
    typeof msg === "object" &&
    msg !== null &&
    (msg as SrpSessionInvalid).type === "srp_invalid"
  );
}
