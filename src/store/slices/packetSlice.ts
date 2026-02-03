/**
 * Packet Store Slice
 *
 * Manages SimulationPackets - the core deliverable from simulations.
 * Handles packet creation, storage, and user annotations.
 */

import { StateCreator } from 'zustand';
import {
  SimulationPacketV0,
  PacketBuildRequest,
  DataTier,
  generatePacketId,
  createEmptyPacket,
} from '@/features/packet/types/packetSchema';
import { DeterministicPayload } from '@/types/api/payload';

// =============================================================================
// SLICE INTERFACE
// =============================================================================

/**
 * TraceData - Cached trace data for a packet's exemplar path
 * Fetched on-demand via wasmBridge.runDeterministicSimulation(seed=pathSeed)
 */
export interface TraceData {
  /** Packet ID this trace belongs to */
  packetId: string;

  /** Path seed used to generate this trace */
  pathSeed: number;

  /** Status of the trace fetch */
  status: 'loading' | 'loaded' | 'error';

  /** Error message if fetch failed */
  error?: string;

  /** Full deterministic payload (contains monthlySnapshots, eventTrace, etc.) */
  payload?: DeterministicPayload;
}

export interface PacketSlice {
  // === State ===

  /** All packets by ID */
  packets: Map<string, SimulationPacketV0>;

  /** Currently active packet ID (shown in viewer) */
  activePacketId: string | null;

  /** Packet sequence counter for ID generation */
  packetSequence: number;

  /** Cached trace data by packet ID (fetched on-demand) */
  traceData: Map<string, TraceData>;

  // === Actions ===

  /**
   * Create a new packet from simulation results
   *
   * PFOS-E Phase 1: Now accepts blockedOutputs from simulation engine
   */
  createPacket: (params: {
    request: PacketBuildRequest;
    mcResults: SimulationPacketV0['mcResults'];
    engineInputsHash: string;
    blockedOutputs?: SimulationPacketV0['blockedOutputs'];
  }) => string;

  /**
   * Create an empty packet (for progressive building)
   */
  createEmptyPacket: (question: string, dataTier: DataTier) => string;

  /**
   * Update an existing packet
   */
  updatePacket: (id: string, updates: Partial<SimulationPacketV0>) => void;

  /**
   * Set the active packet for viewing
   */
  setActivePacket: (id: string | null) => void;

  /**
   * Add a user note to a packet
   */
  addUserNote: (packetId: string, text: string) => void;

  /**
   * Remove a user note from a packet
   */
  removeUserNote: (packetId: string, noteId: string) => void;

  /**
   * Toggle packet bookmark status
   */
  toggleBookmark: (packetId: string) => void;

  /**
   * Delete a packet
   */
  deletePacket: (id: string) => void;

  /**
   * Set trace data for a packet (used when trace is fetched)
   */
  setTraceData: (packetId: string, data: Partial<TraceData>) => void;

  /**
   * Get trace data for a packet
   */
  getTraceData: (packetId: string) => TraceData | undefined;

  /**
   * Clear all packets
   */
  clearAllPackets: () => void;

  // === Selectors ===

  /** Get a packet by ID */
  getPacketById: (id: string) => SimulationPacketV0 | undefined;

  /** Get the active packet */
  getActivePacket: () => SimulationPacketV0 | undefined;

  /** Get all packets sorted by creation date (newest first) */
  getAllPackets: () => SimulationPacketV0[];

  /** Get bookmarked packets */
  getBookmarkedPackets: () => SimulationPacketV0[];

  /** Get packets count */
  getPacketsCount: () => number;
}

// =============================================================================
// SLICE IMPLEMENTATION
// =============================================================================

export const createPacketSlice: StateCreator<
  PacketSlice,
  [],
  [],
  PacketSlice
> = (set, get) => ({
  // === Initial State ===
  packets: new Map(),
  activePacketId: null,
  packetSequence: 1,
  traceData: new Map(),

  // === Actions ===

  createPacket: ({ request, mcResults, engineInputsHash, blockedOutputs }) => {
    const sequence = get().packetSequence;
    const id = generatePacketId(sequence);

    const packet: SimulationPacketV0 = {
      id,
      createdAt: new Date(),
      engineInputsHash,
      engineVersion: 'PFOS-E v1.0',
      schemaVersion: 'v0',
      seed: request.seed,
      baseSeed: mcResults?.baseSeed,
      question: request.question,
      horizon: request.horizon,
      dataTier: request.dataTier,
      scenarios: request.scenarios.map((s) => ({
        id: s.id,
        label: s.label,
        description: s.description,
        appliedChanges: [...request.confirmedChanges, ...s.changeOverrides],
        results: null, // Will be populated from mcResults
      })),
      mcResults,
      traceRef: mcResults?.exemplarPath
        ? {
            pathSeed: mcResults.exemplarPath.pathSeed,
            selectionCriterion: mcResults.exemplarPath.selectionCriterion || 'median_terminal_wealth',
          }
        : null,
      constraints: [],
      blockedOutputs: blockedOutputs ?? [], // Use provided blockedOutputs or empty array
      blockedScenarios: [],
      sensitivity: null, // Bronze tier: sensitivity blocked
      userNotes: [],
      isBookmarked: false,
    };

    // Populate scenario results from MC results
    if (mcResults) {
      packet.scenarios = packet.scenarios.map((scenario, index) => {
        // For now, use MC results for baseline scenario
        if (index === 0) {
          return {
            ...scenario,
            results: {
              yearsUntilDepletion: {
                p5: null,
                p50: null,
                p95: null,
              },
              depletionProbability: mcResults.probabilityOfBankruptcy > 0
                ? { byAge: 85, probability: mcResults.probabilityOfBankruptcy }
                : null,
              terminalWealth: {
                p5: mcResults.finalNetWorthP5 ?? mcResults.finalNetWorthP10,
                p50: mcResults.finalNetWorthP50,
                p95: mcResults.finalNetWorthP95 ?? mcResults.finalNetWorthP90,
              },
            },
          };
        }
        return scenario;
      });
    }

    set((s) => {
      const newPackets = new Map(s.packets);
      newPackets.set(id, packet);
      return {
        packets: newPackets,
        activePacketId: id,
        packetSequence: sequence + 1,
      };
    });

    return id;
  },

  createEmptyPacket: (question, dataTier) => {
    const sequence = get().packetSequence;
    const id = generatePacketId(sequence);
    const seed = Math.floor(Math.random() * 2147483647);

    const packet = createEmptyPacket(id, question, dataTier, seed);

    set((s) => {
      const newPackets = new Map(s.packets);
      newPackets.set(id, packet);
      return {
        packets: newPackets,
        activePacketId: id,
        packetSequence: sequence + 1,
      };
    });

    return id;
  },

  updatePacket: (id, updates) => {
    const packet = get().packets.get(id);
    if (!packet) {
      console.warn('[PacketSlice] Packet not found:', id);
      return;
    }

    set((s) => {
      const newPackets = new Map(s.packets);
      newPackets.set(id, { ...packet, ...updates });
      return { packets: newPackets };
    });
  },

  setActivePacket: (id) => {
    if (id !== null && !get().packets.has(id)) {
      console.warn('[PacketSlice] Packet not found:', id);
      return;
    }
    set({ activePacketId: id });
  },

  addUserNote: (packetId, text) => {
    const packet = get().packets.get(packetId);
    if (!packet) {
      return;
    }

    const note = {
      id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text,
      createdAt: new Date(),
    };

    set((s) => {
      const newPackets = new Map(s.packets);
      newPackets.set(packetId, {
        ...packet,
        userNotes: [...packet.userNotes, note],
      });
      return { packets: newPackets };
    });
  },

  removeUserNote: (packetId, noteId) => {
    const packet = get().packets.get(packetId);
    if (!packet) {
      return;
    }

    set((s) => {
      const newPackets = new Map(s.packets);
      newPackets.set(packetId, {
        ...packet,
        userNotes: packet.userNotes.filter((n) => n.id !== noteId),
      });
      return { packets: newPackets };
    });
  },

  toggleBookmark: (packetId) => {
    const packet = get().packets.get(packetId);
    if (!packet) {
      return;
    }

    set((s) => {
      const newPackets = new Map(s.packets);
      newPackets.set(packetId, {
        ...packet,
        isBookmarked: !packet.isBookmarked,
      });
      return { packets: newPackets };
    });
  },

  deletePacket: (id) => {
    set((s) => {
      const newPackets = new Map(s.packets);
      newPackets.delete(id);
      return {
        packets: newPackets,
        activePacketId: s.activePacketId === id ? null : s.activePacketId,
      };
    });
  },

  clearAllPackets: () => {
    set({
      packets: new Map(),
      activePacketId: null,
      traceData: new Map(),
    });
  },

  setTraceData: (packetId, data) => {
    set((s) => {
      const newTraceData = new Map(s.traceData);
      const existing = newTraceData.get(packetId);
      newTraceData.set(packetId, {
        packetId,
        pathSeed: data.pathSeed ?? existing?.pathSeed ?? 0,
        status: data.status ?? existing?.status ?? 'loading',
        error: data.error ?? existing?.error,
        payload: data.payload ?? existing?.payload,
      });
      return { traceData: newTraceData };
    });
  },

  getTraceData: (packetId) => {
    return get().traceData.get(packetId);
  },

  // === Selectors ===

  getPacketById: (id) => {
    return get().packets.get(id);
  },

  getActivePacket: () => {
    const id = get().activePacketId;
    return id ? get().packets.get(id) : undefined;
  },

  getAllPackets: () => {
    return Array.from(get().packets.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  },

  getBookmarkedPackets: () => {
    return Array.from(get().packets.values())
      .filter((p) => p.isBookmarked)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  getPacketsCount: () => {
    return get().packets.size;
  },
});
