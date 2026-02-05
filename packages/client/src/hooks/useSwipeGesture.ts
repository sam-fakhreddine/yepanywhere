import { useCallback, useRef, useState } from "react";

export interface SwipeState {
  /** Current offset in pixels (negative = left, positive = right) */
  offset: number;
  /** Whether user is actively dragging */
  isDragging: boolean;
  /** Current action based on offset */
  action: "none" | "star" | "archive" | "delete";
  /** Progress toward action threshold (0-1) */
  progress: number;
}

export interface SwipeGestureOptions {
  /** Threshold for triggering star action (swipe right) */
  starThreshold?: number;
  /** Threshold for triggering archive action (swipe left) */
  archiveThreshold?: number;
  /** Threshold for triggering delete action (long swipe left) */
  deleteThreshold?: number;
  /** Resistance factor for overscroll */
  resistance?: number;
  /** Minimum velocity to trigger action */
  minVelocity?: number;
  /** Whether gestures are disabled */
  disabled?: boolean;
}

export interface SwipeGestureHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  onTouchCancel: () => void;
}

export interface UseSwipeGestureResult {
  state: SwipeState;
  handlers: SwipeGestureHandlers;
  reset: () => void;
}

const DEFAULT_OPTIONS: Required<SwipeGestureOptions> = {
  starThreshold: 80,
  archiveThreshold: 80,
  deleteThreshold: 180,
  resistance: 2.5,
  minVelocity: 0.3,
  disabled: false,
};

/**
 * Hook for detecting swipe gestures on touch devices.
 * Returns state about the current swipe and handlers to attach to the element.
 */
export function useSwipeGesture(
  onAction: (action: "star" | "archive" | "delete") => void,
  options: SwipeGestureOptions = {},
): UseSwipeGestureResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const [state, setState] = useState<SwipeState>({
    offset: 0,
    isDragging: false,
    action: "none",
    progress: 0,
  });

  // Refs for tracking touch position and velocity
  const startX = useRef(0);
  const startY = useRef(0);
  const startTime = useRef(0);
  const lastX = useRef(0);
  const lastTime = useRef(0);
  const isHorizontalSwipe = useRef<boolean | null>(null);

  const getAction = useCallback(
    (offset: number): SwipeState["action"] => {
      if (offset > opts.starThreshold) return "star";
      if (offset < -opts.deleteThreshold) return "delete";
      if (offset < -opts.archiveThreshold) return "archive";
      return "none";
    },
    [opts.starThreshold, opts.archiveThreshold, opts.deleteThreshold],
  );

  const getProgress = useCallback(
    (offset: number): number => {
      if (offset > 0) {
        return Math.min(offset / opts.starThreshold, 1);
      }
      if (offset < -opts.archiveThreshold) {
        // For delete, progress from archive threshold to delete threshold
        const deleteProgress =
          (Math.abs(offset) - opts.archiveThreshold) /
          (opts.deleteThreshold - opts.archiveThreshold);
        return Math.min(1 + deleteProgress, 2); // 1-2 range for delete
      }
      return Math.min(Math.abs(offset) / opts.archiveThreshold, 1);
    },
    [opts.starThreshold, opts.archiveThreshold, opts.deleteThreshold],
  );

  const reset = useCallback(() => {
    setState({
      offset: 0,
      isDragging: false,
      action: "none",
      progress: 0,
    });
    isHorizontalSwipe.current = null;
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (opts.disabled) return;

      const touch = e.touches[0];
      if (!touch) return;

      startX.current = touch.clientX;
      startY.current = touch.clientY;
      startTime.current = Date.now();
      lastX.current = touch.clientX;
      lastTime.current = Date.now();
      isHorizontalSwipe.current = null;

      setState((prev) => ({ ...prev, isDragging: true }));
    },
    [opts.disabled],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (opts.disabled || !state.isDragging) return;

      const touch = e.touches[0];
      if (!touch) return;

      const deltaX = touch.clientX - startX.current;
      const deltaY = touch.clientY - startY.current;

      // Determine if this is a horizontal or vertical gesture
      if (isHorizontalSwipe.current === null) {
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);

        // Need at least 10px movement to determine direction
        if (absX > 10 || absY > 10) {
          isHorizontalSwipe.current = absX > absY;
        }
      }

      // If vertical scroll, don't handle
      if (isHorizontalSwipe.current === false) {
        return;
      }

      // Prevent scroll when swiping horizontally
      if (isHorizontalSwipe.current === true) {
        e.preventDefault();
      }

      // Apply resistance for overscroll
      let offset = deltaX;
      const maxOffset = opts.deleteThreshold * 1.2;
      if (Math.abs(offset) > maxOffset) {
        const overflow = Math.abs(offset) - maxOffset;
        offset = Math.sign(offset) * (maxOffset + overflow / opts.resistance);
      }

      // Update velocity tracking
      lastX.current = touch.clientX;
      lastTime.current = Date.now();

      const action = getAction(offset);
      const progress = getProgress(offset);

      setState({
        offset,
        isDragging: true,
        action,
        progress,
      });
    },
    [
      opts.disabled,
      opts.resistance,
      opts.deleteThreshold,
      state.isDragging,
      getAction,
      getProgress,
    ],
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (opts.disabled) return;

      const touch = e.changedTouches[0];
      if (!touch) {
        reset();
        return;
      }

      const deltaX = touch.clientX - startX.current;
      const deltaTime = Date.now() - startTime.current;
      const velocity = Math.abs(deltaX) / deltaTime;

      // Determine final action
      let finalAction = getAction(state.offset);

      // If velocity is high enough, can trigger with less distance
      if (
        velocity > opts.minVelocity &&
        finalAction === "none" &&
        Math.abs(state.offset) > 30
      ) {
        finalAction = state.offset > 0 ? "star" : "archive";
      }

      if (finalAction !== "none") {
        // Trigger haptic feedback
        triggerHaptic("medium");
        onAction(finalAction);
      }

      // Reset with animation
      reset();
    },
    [opts.disabled, opts.minVelocity, state.offset, getAction, onAction, reset],
  );

  const handleTouchCancel = useCallback(() => {
    reset();
  }, [reset]);

  return {
    state,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchCancel,
    },
    reset,
  };
}

/**
 * Trigger haptic feedback if supported
 */
export function triggerHaptic(
  intensity: "light" | "medium" | "heavy" = "medium",
): void {
  if ("vibrate" in navigator) {
    const durations: Record<typeof intensity, number> = {
      light: 10,
      medium: 20,
      heavy: 40,
    };
    navigator.vibrate(durations[intensity]);
  }
}
