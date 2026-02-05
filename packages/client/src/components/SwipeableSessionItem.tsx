import { useCallback, useRef, useState } from "react";
import type { GlobalSessionItem } from "../api/client";
import { triggerHaptic, useSwipeGesture } from "../hooks/useSwipeGesture";
import { getSessionDisplayTitle } from "../utils";
import { SessionListItem } from "./SessionListItem";

interface SwipeableSessionItemProps {
  session: GlobalSessionItem;
  basePath: string;
  showProjectName: boolean;
  isSelected: boolean;
  isSelectionMode: boolean;
  isWideScreen: boolean;
  onSelect?: (sessionId: string, selected: boolean) => void;
  onNavigate?: () => void;
  onStar: (sessionId: string) => Promise<void>;
  onArchive: (sessionId: string) => Promise<void>;
  onDelete?: (sessionId: string) => void;
  /** For long-press selection mode on mobile */
  onLongPress?: (sessionId: string) => void;
}

// Icons as inline SVGs (decorative, so aria-hidden)
const StarIcon = () => (
  <svg
    aria-hidden="true"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="none"
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const ArchiveIcon = () => (
  <svg
    aria-hidden="true"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="21 8 21 21 3 21 3 8" />
    <rect x="1" y="3" width="22" height="5" />
    <line x1="10" y1="12" x2="14" y2="12" />
  </svg>
);

const TrashIcon = () => (
  <svg
    aria-hidden="true"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

// Long-press threshold for entering selection mode
const LONG_PRESS_MS = 500;

/**
 * Wrapper component that adds swipe gestures to SessionListItem.
 *
 * Swipe right: Star/Unstar session
 * Swipe left: Archive session
 * Long swipe left: Delete session (shows confirmation)
 */
export function SwipeableSessionItem({
  session,
  basePath,
  showProjectName,
  isSelected,
  isSelectionMode,
  isWideScreen,
  onSelect,
  onNavigate,
  onStar,
  onArchive,
  onDelete,
  onLongPress,
}: SwipeableSessionItemProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Track last triggered threshold for haptic feedback
  const lastThresholdRef = useRef<"none" | "star" | "archive" | "delete">(
    "none",
  );

  const handleAction = useCallback(
    async (action: "star" | "archive" | "delete") => {
      if (action === "star") {
        await onStar(session.id);
      } else if (action === "archive") {
        await onArchive(session.id);
      } else if (action === "delete") {
        // Show confirmation for delete
        if (onDelete) {
          setShowDeleteConfirm(true);
        }
      }
    },
    [session.id, onStar, onArchive, onDelete],
  );

  const { state, handlers, reset } = useSwipeGesture(handleAction, {
    disabled: isSelectionMode || isWideScreen,
  });

  // Provide haptic feedback when crossing thresholds
  const currentAction = state.action;
  if (currentAction !== lastThresholdRef.current && state.isDragging) {
    if (currentAction !== "none") {
      triggerHaptic(currentAction === "delete" ? "heavy" : "light");
    }
    lastThresholdRef.current = currentAction;
  }
  if (!state.isDragging) {
    lastThresholdRef.current = "none";
  }

  // Long press handling for selection mode
  const handleLongPressStart = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      if (isWideScreen) return;

      longPressTimer.current = setTimeout(() => {
        triggerHaptic("medium");
        onLongPress?.(session.id);
      }, LONG_PRESS_MS);
    },
    [isWideScreen, session.id, onLongPress],
  );

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      // Cancel long press if user starts moving
      handleLongPressEnd();
      handlers.onTouchMove(e);
    },
    [handleLongPressEnd, handlers],
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      handleLongPressStart(e);
      handlers.onTouchStart(e);
    },
    [handleLongPressStart, handlers],
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      handleLongPressEnd();
      handlers.onTouchEnd(e);
    },
    [handleLongPressEnd, handlers],
  );

  const handleTouchCancel = useCallback(() => {
    handleLongPressEnd();
    handlers.onTouchCancel();
  }, [handleLongPressEnd, handlers]);

  const handleDeleteConfirm = useCallback(() => {
    setShowDeleteConfirm(false);
    onDelete?.(session.id);
  }, [session.id, onDelete]);

  const handleDeleteCancel = useCallback(() => {
    setShowDeleteConfirm(false);
  }, []);

  // Calculate transform and action indicator styles
  const offset = state.offset;
  const showActions = Math.abs(offset) > 20;

  // Determine which action indicator to show
  const getActionIndicator = () => {
    if (!showActions) return null;

    if (offset > 0) {
      // Swiping right - star action
      const progress = Math.min(state.progress, 1);
      const isActive = state.action === "star";
      return (
        <div
          className="swipeable-action swipeable-action--star"
          style={{
            width: Math.abs(offset),
            opacity: progress,
          }}
          data-active={isActive}
        >
          <div
            className="swipeable-action__icon"
            style={{
              transform: `scale(${0.5 + progress * 0.5})`,
            }}
          >
            <StarIcon />
            <span className="swipeable-action__label">
              {session.isStarred ? "Unstar" : "Star"}
            </span>
          </div>
        </div>
      );
    }

    // Swiping left - archive or delete
    const isDelete = state.action === "delete";
    const isArchive = state.action === "archive";
    const progress = Math.min(state.progress, 1);

    return (
      <div
        className={`swipeable-action swipeable-action--${isDelete ? "delete" : "archive"}`}
        style={{
          width: Math.abs(offset),
          opacity: Math.min(progress, 1),
        }}
        data-active={isArchive || isDelete}
      >
        <div
          className="swipeable-action__icon"
          style={{
            transform: `scale(${0.5 + Math.min(progress, 1) * 0.5})`,
          }}
        >
          {isDelete ? <TrashIcon /> : <ArchiveIcon />}
          <span className="swipeable-action__label">
            {isDelete ? "Delete" : session.isArchived ? "Unarchive" : "Archive"}
          </span>
        </div>
      </div>
    );
  };

  return (
    <>
      <div
        ref={containerRef}
        className={`swipeable-session-item ${state.isDragging ? "swipeable-session-item--dragging" : ""}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        onMouseDown={!isWideScreen ? handleLongPressStart : undefined}
        onMouseUp={handleLongPressEnd}
        onMouseLeave={handleLongPressEnd}
      >
        {/* Action indicators (behind the content) */}
        {getActionIndicator()}

        {/* Session content */}
        <div
          className="swipeable-session-item__content"
          style={{
            transform: `translateX(${offset}px)`,
            transition: state.isDragging ? "none" : "transform 0.2s ease-out",
          }}
        >
          <SessionListItem
            sessionId={session.id}
            projectId={session.projectId}
            title={getSessionDisplayTitle(session)}
            fullTitle={getSessionDisplayTitle(session)}
            updatedAt={session.updatedAt}
            hasUnread={session.hasUnread}
            activity={session.activity}
            pendingInputType={session.pendingInputType}
            status={session.ownership}
            provider={session.provider}
            executor={session.executor}
            isStarred={session.isStarred}
            isArchived={session.isArchived}
            mode="card"
            showContextUsage={false}
            isSelected={isSelected}
            isSelectionMode={isSelectionMode && !isWideScreen}
            onNavigate={onNavigate}
            onSelect={isWideScreen || isSelectionMode ? onSelect : undefined}
            showProjectName={showProjectName}
            projectName={session.projectName}
            basePath={basePath}
            messageCount={session.messageCount}
          />
        </div>
      </div>

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <>
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: Backdrop click is optional convenience, dialog has Cancel button */}
          <div
            className="swipeable-delete-dialog-overlay"
            onClick={handleDeleteCancel}
          />
          <dialog
            className="swipeable-delete-dialog"
            open
            aria-labelledby="delete-dialog-title"
            onClose={handleDeleteCancel}
          >
            <h3 id="delete-dialog-title">Delete Session?</h3>
            <p>
              Are you sure you want to delete "{getSessionDisplayTitle(session)}
              "? This cannot be undone.
            </p>
            <div className="swipeable-delete-dialog__actions">
              <button
                type="button"
                className="swipeable-delete-dialog__cancel"
                onClick={handleDeleteCancel}
              >
                Cancel
              </button>
              <button
                type="button"
                className="swipeable-delete-dialog__confirm"
                onClick={handleDeleteConfirm}
              >
                Delete
              </button>
            </div>
          </dialog>
        </>
      )}
    </>
  );
}
