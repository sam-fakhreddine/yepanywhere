# Epic: Swipe Actions on Session List

**Epic ID:** Q1-003
**Priority:** P0
**Quarter:** Q1 2026
**Estimated Effort:** 1 week
**Status:** Planning

---

## Problem Statement

Managing sessions on mobile requires too many taps. To archive, star, or delete a session, users must:
1. Tap to open session
2. Tap menu icon
3. Tap desired action
4. Confirm (for delete)

This friction adds up when managing 10+ sessions daily.

**Target Outcome:** Enable single-gesture session management with intuitive swipe patterns familiar from mail and messaging apps.

---

## User Stories

### US-001: Swipe right to star/unstar
**As a** user with favorite projects
**I want to** swipe right to star a session
**So that** I can quickly mark important sessions

**Acceptance Criteria:**
- [ ] Swipe right reveals star icon with yellow background
- [ ] Releasing after threshold stars the session
- [ ] Starred sessions show star indicator
- [ ] Swiping starred session unstars it
- [ ] Haptic feedback on action trigger
- [ ] Partial swipe snaps back with no action

### US-002: Swipe left to archive
**As a** user cleaning up my session list
**I want to** swipe left to archive a session
**So that** I can remove completed sessions quickly

**Acceptance Criteria:**
- [ ] Swipe left reveals archive icon with gray background
- [ ] Releasing after threshold archives the session
- [ ] Archived sessions move to "Archived" filter
- [ ] Undo toast appears for 5 seconds
- [ ] Archived sessions can be unarchived from archive view
- [ ] Session process continues even when archived

### US-003: Long swipe left to delete
**As a** user removing old sessions
**I want to** long-swipe left to delete
**So that** I can permanently remove sessions in one gesture

**Acceptance Criteria:**
- [ ] Long swipe (>75% width) reveals delete icon with red background
- [ ] Delete icon animates/pulses at threshold
- [ ] Releasing triggers confirmation dialog
- [ ] Confirmation shows session name and warns about data loss
- [ ] Deleted sessions cannot be recovered
- [ ] Deleting active session stops the agent process

### US-004: Swipe gesture feedback
**As a** user performing swipe actions
**I want to** clear visual and haptic feedback
**So that** I know what action will occur before releasing

**Acceptance Criteria:**
- [ ] Background color indicates action (yellow/gray/red)
- [ ] Icon scales as swipe progresses
- [ ] Haptic tick at action threshold
- [ ] Strong haptic on release with action
- [ ] Visual snap-back animation on cancel
- [ ] Swipe velocity affects animation speed

### US-005: Accessibility for swipe actions
**As a** user who cannot perform swipe gestures
**I want to** alternative ways to access these actions
**So that** I can manage sessions without swiping

**Acceptance Criteria:**
- [ ] Long-press opens context menu with same actions
- [ ] Keyboard shortcut on desktop (S for star, A for archive, Delete for delete)
- [ ] Screen reader announces available actions
- [ ] Actions menu in session detail view

---

## Technical Approach

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  SwipeableSessionItem                    │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │ Gesture     │  │ Action      │  │ Animation       │ │
│  │ Recognizer  │  │ Renderer    │  │ Controller      │ │
│  │             │  │             │  │                 │ │
│  │ - touch     │  │ - star      │  │ - spring        │ │
│  │ - velocity  │  │ - archive   │  │ - snap          │ │
│  │ - threshold │  │ - delete    │  │ - haptic        │ │
│  └─────────────┘  └─────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Component Structure

```typescript
interface SwipeAction {
  key: string;
  label: string;
  icon: React.ComponentType;
  color: string;
  threshold: number; // 0-1 percentage of width
  onTrigger: () => void;
}

interface SwipeableItemProps {
  leftActions: SwipeAction[];
  rightActions: SwipeAction[];
  onSwipe: (direction: 'left' | 'right', action: SwipeAction) => void;
  children: React.ReactNode;
  disabled?: boolean;
}
```

### Implementation Details

1. **Gesture Recognition:**
   ```typescript
   const useSwipeGesture = (ref: RefObject<HTMLElement>) => {
     const [offset, setOffset] = useState(0);
     const [velocity, setVelocity] = useState(0);
     const startX = useRef(0);
     const startTime = useRef(0);

     const handleTouchStart = (e: TouchEvent) => {
       startX.current = e.touches[0].clientX;
       startTime.current = Date.now();
     };

     const handleTouchMove = (e: TouchEvent) => {
       const delta = e.touches[0].clientX - startX.current;
       setOffset(delta);
       // Calculate velocity for momentum
       const elapsed = Date.now() - startTime.current;
       setVelocity(delta / elapsed);
     };

     const handleTouchEnd = () => {
       // Determine action based on offset and velocity
       const triggerThreshold = ref.current?.offsetWidth * 0.3;
       if (Math.abs(offset) > triggerThreshold || Math.abs(velocity) > 0.5) {
         // Trigger action
       }
       // Animate back to center
       setOffset(0);
     };

     return { offset, velocity };
   };
   ```

2. **Haptic Feedback:**
   ```typescript
   const triggerHaptic = (type: 'light' | 'medium' | 'heavy') => {
     if ('vibrate' in navigator) {
       const durations = { light: 10, medium: 20, heavy: 30 };
       navigator.vibrate(durations[type]);
     }
   };
   ```

3. **Animation with CSS:**
   ```css
   .swipeable-item {
     touch-action: pan-y;
     will-change: transform;
   }

   .swipeable-item__content {
     transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
   }

   .swipeable-item__content--dragging {
     transition: none;
   }

   .swipeable-item__action {
     position: absolute;
     top: 0;
     bottom: 0;
     display: flex;
     align-items: center;
     justify-content: center;
     min-width: 80px;
   }

   .swipeable-item__action--left {
     left: 0;
     background: var(--color-star);
   }

   .swipeable-item__action--right {
     right: 0;
     background: var(--color-archive);
   }

   .swipeable-item__action--delete {
     background: var(--color-danger);
   }
   ```

4. **Threshold Indicators:**
   ```typescript
   const getActionState = (offset: number, width: number) => {
     const percentage = Math.abs(offset) / width;

     if (percentage < 0.15) return 'inactive';
     if (percentage < 0.3) return 'preview';
     if (percentage < 0.75) return 'ready';
     return 'delete-ready'; // Long swipe
   };
   ```

### Integration Points

- `SessionList.tsx`: Wrap each session item with SwipeableItem
- `useSessionActions.ts`: Hook providing star/archive/delete handlers
- `sessionMetadataService.ts`: Persist starred/archived state

---

## Dependencies

| Dependency | Type | Status | Notes |
|------------|------|--------|-------|
| Session metadata storage | Internal | Exists | Add starred/archived fields |
| Delete session endpoint | Internal | Exists | Verify process cleanup |
| framer-motion | External | Exists | Use for smooth animations |
| CSS touch-action | Browser | Supported | For scroll vs swipe detection |

---

## Subagent Assignments

### Frontend Agent
**Expertise:** React, TypeScript, touch gestures, animation
**Tasks:**
1. Create SwipeableItem component with gesture recognition
2. Implement action reveal animations
3. Add haptic feedback integration
4. Build confirmation dialog for delete
5. Add undo toast for archive
6. Create context menu fallback for accessibility

**Deliverables:**
- `packages/client/src/components/SwipeableItem.tsx`
- `packages/client/src/hooks/useSwipeGesture.ts`
- Integration with SessionList

### Mobile Agent
**Expertise:** Touch interactions, iOS/Android behaviors, performance
**Tasks:**
1. Test gesture recognition on iOS Safari
2. Test gesture recognition on Android Chrome
3. Tune threshold values for natural feel
4. Optimize performance (60fps animations)
5. Handle scroll interference

**Deliverables:**
- Platform-specific gesture tuning
- Performance benchmarks
- Bug fixes for mobile browsers

### QA Agent
**Expertise:** Mobile testing, gesture testing, edge cases
**Tasks:**
1. Test swipe in various scroll positions
2. Test with different list lengths
3. Verify undo functionality
4. Test accessibility alternatives
5. Test with screen readers

**Deliverables:**
- Test cases for all gestures
- Cross-browser compatibility report
- Accessibility test results

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Gesture recognition accuracy | >95% | User testing |
| Animation frame rate | 60fps | Performance profiling |
| Archive action usage | 3x increase vs menu | Analytics comparison |
| Undo usage rate | <10% | Track undo clicks |
| Accessibility alternative usage | 100% feature parity | Manual testing |

---

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Gesture conflicts with scroll | High | High | Detect intent from angle, use touch-action CSS |
| Accidental deletes | High | Medium | Require long swipe + confirmation |
| Poor gesture recognition | Medium | Medium | Tune thresholds, add velocity detection |
| Performance on old devices | Medium | Low | Use CSS transforms, avoid layout thrashing |

---

## Open Questions

1. Should we support customizable swipe actions (e.g., swipe right for archive instead)?
2. What happens when swiping during an active agent run? Show warning?
3. Should we add "swipe to refresh" as part of this epic or separate?

---

## References

- iOS Human Interface Guidelines: Swipe Actions
- Material Design: List Actions
- Existing SessionList: `packages/client/src/components/SessionList.tsx`
