# Epic: Pull-to-Refresh with Haptic Feedback

**Epic ID:** Q1-005
**Priority:** P1
**Quarter:** Q1 2026
**Estimated Effort:** 3 days
**Status:** Planning

---

## Problem Statement

Mobile users expect pull-to-refresh as a standard pattern for updating content. Currently, users must:
- Navigate away and back to refresh
- Wait for automatic polling (if implemented)
- Hard refresh the PWA

This breaks mobile conventions and feels non-native.

**Target Outcome:** Implement native-feeling pull-to-refresh with haptic feedback that matches iOS/Android patterns.

---

## User Stories

### US-001: Pull-to-refresh on session list
**As a** mobile user on the session list
**I want to** pull down to refresh the list
**So that** I can see the latest session states

**Acceptance Criteria:**
- [ ] Pull down from top reveals refresh indicator
- [ ] Spinner appears during refresh
- [ ] Session list updates after refresh
- [ ] Haptic feedback on pull threshold and on release
- [ ] Refresh indicator matches system style
- [ ] Works on iOS Safari and Android Chrome

### US-002: Pull-to-refresh in session view
**As a** mobile user viewing a session
**I want to** pull down to refresh messages
**So that** I can fetch any missed messages

**Acceptance Criteria:**
- [ ] Pull gesture works within session message area
- [ ] New messages appear after refresh
- [ ] Scroll position maintained (refreshes above current view)
- [ ] Haptic feedback matches list refresh

### US-003: Custom refresh indicator
**As a** user who likes polished UX
**I want to** see a branded refresh indicator
**So that** the app feels cohesive

**Acceptance Criteria:**
- [ ] Refresh indicator uses app accent color
- [ ] Smooth spring animation on pull
- [ ] Rotation animation during loading
- [ ] Checkmark or success state briefly shown
- [ ] Graceful fallback if custom indicator fails

---

## Technical Approach

### Component Structure

```typescript
interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  disabled?: boolean;
  threshold?: number; // pixels to pull before triggering
  resistance?: number; // pull resistance factor
}

interface RefreshState {
  phase: 'idle' | 'pulling' | 'threshold' | 'refreshing' | 'complete';
  pullDistance: number;
}
```

### Implementation

```typescript
const usePullToRefresh = (onRefresh: () => Promise<void>, options = {}) => {
  const { threshold = 80, resistance = 2.5 } = options;
  const [state, setState] = useState<RefreshState>({ phase: 'idle', pullDistance: 0 });
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: TouchEvent) => {
    // Only activate if scrolled to top
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (startY.current === 0) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;

    if (diff > 0) {
      e.preventDefault();
      const pullDistance = Math.min(diff / resistance, threshold * 1.5);
      const phase = pullDistance >= threshold ? 'threshold' : 'pulling';

      // Haptic on threshold cross
      if (phase === 'threshold' && state.phase === 'pulling') {
        triggerHaptic('medium');
      }

      setState({ phase, pullDistance });
    }
  };

  const handleTouchEnd = async () => {
    if (state.phase === 'threshold') {
      setState({ phase: 'refreshing', pullDistance: threshold });
      triggerHaptic('heavy');

      try {
        await onRefresh();
        setState({ phase: 'complete', pullDistance: threshold });
        setTimeout(() => setState({ phase: 'idle', pullDistance: 0 }), 300);
      } catch {
        setState({ phase: 'idle', pullDistance: 0 });
      }
    } else {
      setState({ phase: 'idle', pullDistance: 0 });
    }
    startY.current = 0;
  };

  return { state, containerRef, handlers: { handleTouchStart, handleTouchMove, handleTouchEnd } };
};
```

### CSS Animation

```css
.refresh-indicator {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%) translateY(var(--pull-distance));
  opacity: calc(var(--pull-distance) / 80);
  transition: transform 0.2s ease-out;
}

.refresh-indicator--refreshing {
  animation: spin 1s linear infinite;
}

.refresh-indicator--complete {
  animation: success 0.3s ease-out;
}

@keyframes spin {
  from { transform: translateX(-50%) rotate(0deg); }
  to { transform: translateX(-50%) rotate(360deg); }
}

@keyframes success {
  0% { transform: translateX(-50%) scale(1); }
  50% { transform: translateX(-50%) scale(1.2); }
  100% { transform: translateX(-50%) scale(1); }
}
```

### Haptic Integration

```typescript
const triggerHaptic = (intensity: 'light' | 'medium' | 'heavy') => {
  // Web Vibration API
  if ('vibrate' in navigator) {
    const durations = { light: 10, medium: 25, heavy: 50 };
    navigator.vibrate(durations[intensity]);
  }

  // iOS: Uses CSS touch feedback
  // Android: Uses native haptic patterns
};
```

---

## Dependencies

| Dependency | Type | Status | Notes |
|------------|------|--------|-------|
| Touch event handling | Browser | Supported | Standard touch events |
| Vibration API | Browser | Partial | iOS requires user gesture |
| Session list component | Internal | Exists | Wrap with PullToRefresh |
| Session view component | Internal | Exists | Wrap scrollable area |

---

## Subagent Assignments

### Frontend Agent
**Expertise:** React, TypeScript, touch gestures, animation
**Tasks:**
1. Create PullToRefresh component
2. Implement usePullToRefresh hook
3. Design and build refresh indicator
4. Integrate with session list
5. Integrate with session view
6. Add haptic feedback

**Deliverables:**
- `packages/client/src/components/PullToRefresh.tsx`
- `packages/client/src/hooks/usePullToRefresh.ts`
- Integration PR

### Mobile Agent
**Expertise:** iOS Safari, Android Chrome, PWA behavior
**Tasks:**
1. Test rubber-band scrolling interference (iOS)
2. Test overscroll behavior (Android)
3. Verify haptic feedback on both platforms
4. Test with "Add to Home Screen" PWA mode
5. Document browser-specific quirks

**Deliverables:**
- Platform compatibility report
- Browser-specific fixes

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Pull-to-refresh usage | 30% of mobile sessions | Analytics tracking |
| Animation smoothness | 60fps | Performance profiling |
| Cross-browser compatibility | iOS Safari + Android Chrome | Manual testing |
| Haptic feedback working | Both platforms | Manual testing |

---

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| iOS rubber-band conflicts | High | High | Careful scroll position detection |
| Vibration API not supported | Low | Medium | Graceful degradation |
| Interference with scroll | Medium | Medium | Check scrollTop before activating |

---

## References

- Web Vibration API: https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API
- iOS PWA quirks: https://webkit.org/blog/
- Material Design Pull-to-Refresh: https://material.io/design/interaction/gestures.html
