import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { encrypt } from "../../src/crypto/nacl-wrapper.js";
import { RemoteSessionService } from "../../src/remote-access/RemoteSessionService.js";

describe("RemoteSessionService", () => {
  let service: RemoteSessionService;
  let testDir: string;

  beforeEach(async () => {
    // Create a unique temp directory for each test
    testDir = path.join(os.tmpdir(), `remote-session-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    service = new RemoteSessionService({ dataDir: testDir });
    await service.initialize();
  });

  afterEach(async () => {
    service.shutdown();
    // Clean up test directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe("createSession", () => {
    it("creates a new session", async () => {
      const sessionKey = new Uint8Array(32).fill(0x42);
      const sessionId = await service.createSession("testuser", sessionKey);

      expect(sessionId).toBeTruthy();
      expect(typeof sessionId).toBe("string");

      const session = service.getSession(sessionId);
      expect(session).not.toBeNull();
      expect(session?.username).toBe("testuser");
    });

    it("stores session key correctly", async () => {
      const sessionKey = new Uint8Array(32).fill(0x42);
      const sessionId = await service.createSession("testuser", sessionKey);

      const storedKey = service.getSessionKey(sessionId);
      expect(storedKey).not.toBeNull();
      // Compare as arrays since getSessionKey returns Buffer, not Uint8Array
      // biome-ignore lint/style/noNonNullAssertion: We just asserted it's not null
      expect(Array.from(storedKey!)).toEqual(Array.from(sessionKey));
    });

    it("generates unique session IDs", async () => {
      const sessionKey = new Uint8Array(32).fill(0x42);
      const sessionId1 = await service.createSession("user1", sessionKey);
      const sessionId2 = await service.createSession("user2", sessionKey);

      expect(sessionId1).not.toBe(sessionId2);
    });

    it("enforces max sessions per user", async () => {
      const sessionKey = new Uint8Array(32).fill(0x42);

      // Create 5 sessions (the max)
      const sessions: string[] = [];
      for (let i = 0; i < 5; i++) {
        // Small delay to ensure different lastUsed times
        await new Promise((resolve) => setTimeout(resolve, 10));
        const id = await service.createSession("testuser", sessionKey);
        sessions.push(id);
      }

      // Create a 6th session - oldest should be evicted
      const newSessionId = await service.createSession("testuser", sessionKey);

      // First session should be gone
      expect(service.getSession(sessions[0])).toBeNull();

      // New session should exist
      expect(service.getSession(newSessionId)).not.toBeNull();

      // User should have exactly 5 sessions
      expect(service.getSessionCount("testuser")).toBe(5);
    });
  });

  describe("getSession", () => {
    it("returns null for non-existent session", () => {
      const session = service.getSession("nonexistent");
      expect(session).toBeNull();
    });

    it("returns session for valid session ID", async () => {
      const sessionKey = new Uint8Array(32).fill(0x42);
      const sessionId = await service.createSession("testuser", sessionKey);

      const session = service.getSession(sessionId);
      expect(session).not.toBeNull();
      expect(session?.sessionId).toBe(sessionId);
      expect(session?.username).toBe("testuser");
    });
  });

  describe("validateProof", () => {
    it("validates correct proof", async () => {
      const sessionKey = new Uint8Array(32).fill(0x42);
      const sessionId = await service.createSession("testuser", sessionKey);

      // Generate a challenge first (simulates what server does after initial SRP auth)
      const challenge = await service.generateResumeChallenge(sessionId);
      expect(challenge).not.toBeNull();

      // Generate a valid proof (encrypted timestamp + challenge)
      const timestamp = Date.now();
      const proofData = JSON.stringify({ timestamp, challenge });
      const { nonce, ciphertext } = encrypt(proofData, sessionKey);
      const proof = JSON.stringify({ nonce, ciphertext });

      const result = await service.validateProof(sessionId, proof);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.session.sessionId).toBe(sessionId);
      }
    });

    it("rejects proof with wrong session key", async () => {
      const sessionKey = new Uint8Array(32).fill(0x42);
      const wrongKey = new Uint8Array(32).fill(0x43);
      const sessionId = await service.createSession("testuser", sessionKey);

      // Generate proof with wrong key
      const timestamp = Date.now();
      const proofData = JSON.stringify({ timestamp });
      const { nonce, ciphertext } = encrypt(proofData, wrongKey);
      const proof = JSON.stringify({ nonce, ciphertext });

      const result = await service.validateProof(sessionId, proof);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.reason).toBe("invalid_proof");
      }
    });

    it("rejects proof with old timestamp", async () => {
      const sessionKey = new Uint8Array(32).fill(0x42);
      const sessionId = await service.createSession("testuser", sessionKey);

      // Generate proof with timestamp 10 minutes ago (> 5 min max age)
      const oldTimestamp = Date.now() - 10 * 60 * 1000;
      const proofData = JSON.stringify({ timestamp: oldTimestamp });
      const { nonce, ciphertext } = encrypt(proofData, sessionKey);
      const proof = JSON.stringify({ nonce, ciphertext });

      const result = await service.validateProof(sessionId, proof);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.reason).toBe("invalid_proof");
      }
    });

    it("rejects proof for non-existent session", async () => {
      const sessionKey = new Uint8Array(32).fill(0x42);

      const timestamp = Date.now();
      const proofData = JSON.stringify({ timestamp });
      const { nonce, ciphertext } = encrypt(proofData, sessionKey);
      const proof = JSON.stringify({ nonce, ciphertext });

      const result = await service.validateProof("nonexistent", proof);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.reason).toBe("expired");
      }
    });

    it("updates lastUsed on successful validation", async () => {
      const sessionKey = new Uint8Array(32).fill(0x42);
      const sessionId = await service.createSession("testuser", sessionKey);

      // Generate a challenge first
      const challenge = await service.generateResumeChallenge(sessionId);

      const sessionBefore = service.getSession(sessionId);
      const lastUsedBefore = sessionBefore?.lastUsed;

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Validate proof with challenge
      const timestamp = Date.now();
      const proofData = JSON.stringify({ timestamp, challenge });
      const { nonce, ciphertext } = encrypt(proofData, sessionKey);
      const proof = JSON.stringify({ nonce, ciphertext });

      await service.validateProof(sessionId, proof);

      const sessionAfter = service.getSession(sessionId);
      expect(sessionAfter?.lastUsed).not.toBe(lastUsedBefore);
    });

    it("rejects proof with wrong challenge", async () => {
      const sessionKey = new Uint8Array(32).fill(0x42);
      const sessionId = await service.createSession("testuser", sessionKey);

      // Generate a challenge
      await service.generateResumeChallenge(sessionId);

      // Generate proof with WRONG challenge
      const timestamp = Date.now();
      const wrongChallenge = "0".repeat(64); // Different challenge
      const proofData = JSON.stringify({
        timestamp,
        challenge: wrongChallenge,
      });
      const { nonce, ciphertext } = encrypt(proofData, sessionKey);
      const proof = JSON.stringify({ nonce, ciphertext });

      const result = await service.validateProof(sessionId, proof);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.reason).toBe("challenge_required");
      }
    });

    it("rejects proof missing challenge when server expects one", async () => {
      const sessionKey = new Uint8Array(32).fill(0x42);
      const sessionId = await service.createSession("testuser", sessionKey);

      // Generate a challenge (server now expects client to include it)
      await service.generateResumeChallenge(sessionId);

      // Generate proof WITHOUT challenge
      const timestamp = Date.now();
      const proofData = JSON.stringify({ timestamp });
      const { nonce, ciphertext } = encrypt(proofData, sessionKey);
      const proof = JSON.stringify({ nonce, ciphertext });

      const result = await service.validateProof(sessionId, proof);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.reason).toBe("challenge_required");
      }
    });

    it("rejects legacy session without any challenge", async () => {
      const sessionKey = new Uint8Array(32).fill(0x42);
      const sessionId = await service.createSession("testuser", sessionKey);

      // Don't generate a challenge (simulates legacy session)
      // Generate proof without challenge
      const timestamp = Date.now();
      const proofData = JSON.stringify({ timestamp });
      const { nonce, ciphertext } = encrypt(proofData, sessionKey);
      const proof = JSON.stringify({ nonce, ciphertext });

      const result = await service.validateProof(sessionId, proof);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.reason).toBe("challenge_required");
      }
    });

    it("consumes challenge on successful validation (single-use)", async () => {
      const sessionKey = new Uint8Array(32).fill(0x42);
      const sessionId = await service.createSession("testuser", sessionKey);

      // Generate a challenge
      const challenge = await service.generateResumeChallenge(sessionId);
      expect(challenge).not.toBeNull();

      // First validation should succeed
      const timestamp1 = Date.now();
      const proofData1 = JSON.stringify({ timestamp: timestamp1, challenge });
      const encrypted1 = encrypt(proofData1, sessionKey);
      const proof1 = JSON.stringify(encrypted1);

      const result1 = await service.validateProof(sessionId, proof1);
      expect(result1.success).toBe(true);

      // Generate a new challenge for next resume
      const newChallenge = await service.generateResumeChallenge(sessionId);

      // Reusing the OLD challenge should fail
      const timestamp2 = Date.now();
      const proofData2 = JSON.stringify({ timestamp: timestamp2, challenge }); // Old challenge
      const encrypted2 = encrypt(proofData2, sessionKey);
      const proof2 = JSON.stringify(encrypted2);

      const result2 = await service.validateProof(sessionId, proof2);
      expect(result2.success).toBe(false);
      if (!result2.success) {
        expect(result2.reason).toBe("challenge_required");
      }

      // Using the NEW challenge should succeed
      const timestamp3 = Date.now();
      const proofData3 = JSON.stringify({
        timestamp: timestamp3,
        challenge: newChallenge,
      });
      const encrypted3 = encrypt(proofData3, sessionKey);
      const proof3 = JSON.stringify(encrypted3);

      const result3 = await service.validateProof(sessionId, proof3);
      expect(result3.success).toBe(true);
    });
  });

  describe("deleteSession", () => {
    it("deletes an existing session", async () => {
      const sessionKey = new Uint8Array(32).fill(0x42);
      const sessionId = await service.createSession("testuser", sessionKey);

      expect(service.getSession(sessionId)).not.toBeNull();

      await service.deleteSession(sessionId);

      expect(service.getSession(sessionId)).toBeNull();
    });

    it("handles deleting non-existent session gracefully", async () => {
      await expect(service.deleteSession("nonexistent")).resolves.not.toThrow();
    });
  });

  describe("invalidateUserSessions", () => {
    it("invalidates all sessions for a user", async () => {
      const sessionKey = new Uint8Array(32).fill(0x42);

      // Create multiple sessions for testuser
      const session1 = await service.createSession("testuser", sessionKey);
      const session2 = await service.createSession("testuser", sessionKey);

      // Create session for different user
      const otherSession = await service.createSession("otheruser", sessionKey);

      const count = await service.invalidateUserSessions("testuser");

      expect(count).toBe(2);
      expect(service.getSession(session1)).toBeNull();
      expect(service.getSession(session2)).toBeNull();
      expect(service.getSession(otherSession)).not.toBeNull();
    });

    it("returns 0 when user has no sessions", async () => {
      const count = await service.invalidateUserSessions("nonexistent");
      expect(count).toBe(0);
    });
  });

  describe("getSessionCount", () => {
    it("returns correct count for user", async () => {
      const sessionKey = new Uint8Array(32).fill(0x42);

      await service.createSession("testuser", sessionKey);
      await service.createSession("testuser", sessionKey);
      await service.createSession("otheruser", sessionKey);

      expect(service.getSessionCount("testuser")).toBe(2);
      expect(service.getSessionCount("otheruser")).toBe(1);
      expect(service.getSessionCount("nonexistent")).toBe(0);
    });
  });

  describe("persistence", () => {
    it("persists sessions to disk", async () => {
      const sessionKey = new Uint8Array(32).fill(0x42);
      const sessionId = await service.createSession("testuser", sessionKey);

      // Shutdown current service
      service.shutdown();

      // Create a new service instance pointing to same directory
      const newService = new RemoteSessionService({ dataDir: testDir });
      await newService.initialize();

      // Session should still exist
      const session = newService.getSession(sessionId);
      expect(session).not.toBeNull();
      expect(session?.username).toBe("testuser");

      newService.shutdown();
    });
  });

  describe("session expiry", () => {
    it("expires sessions past max lifetime", async () => {
      const sessionKey = new Uint8Array(32).fill(0x42);
      const sessionId = await service.createSession("testuser", sessionKey);

      // Get session and manually set createdAt to 31 days ago
      const session = service.getSession(sessionId);
      expect(session).not.toBeNull();

      // Access internal state to manipulate for testing
      const state = (
        service as unknown as {
          state: { sessions: Record<string, { createdAt: string }> };
        }
      ).state;
      state.sessions[sessionId].createdAt = new Date(
        Date.now() - 31 * 24 * 60 * 60 * 1000,
      ).toISOString();

      // Now getSession should return null (expired)
      expect(service.getSession(sessionId)).toBeNull();
    });

    it("expires sessions past idle timeout", async () => {
      const sessionKey = new Uint8Array(32).fill(0x42);
      const sessionId = await service.createSession("testuser", sessionKey);

      // Get session and manually set lastUsed to 8 days ago
      const session = service.getSession(sessionId);
      expect(session).not.toBeNull();

      // Access internal state to manipulate for testing
      const state = (
        service as unknown as {
          state: { sessions: Record<string, { lastUsed: string }> };
        }
      ).state;
      state.sessions[sessionId].lastUsed = new Date(
        Date.now() - 8 * 24 * 60 * 60 * 1000,
      ).toISOString();

      // Now getSession should return null (expired)
      expect(service.getSession(sessionId)).toBeNull();
    });
  });
});
