# Epic: Context-Aware Gesture System

**Epic ID:** Q4-002
**Priority:** P1
**Quarter:** Q4 2026
**Estimated Effort:** 2-3 weeks
**Status:** Planning

---

## Problem Statement

Static gesture patterns don't adapt to user context. More intuitive gestures that change based on screen and content would improve power user efficiency.

**Target Outcome:** Context-sensitive gestures with customizable mappings.

---

## User Stories

### US-001: Context-aware gestures
- [ ] Two-finger swipe: approve all pending (on approval list)
- [ ] Pinch: collapse/expand code blocks (in session)
- [ ] Long-press: context menu anywhere
- [ ] Shake to undo last action
- [ ] Gesture hints on first use

### US-002: Customizable mappings
- [ ] Settings page for gesture customization
- [ ] Enable/disable specific gestures
- [ ] Remap gestures to different actions
- [ ] Import/export gesture profiles

### US-003: Gesture feedback
- [ ] Visual feedback during gesture
- [ ] Haptic feedback on action
- [ ] Animation showing result
- [ ] Gesture tutorial mode

---

## Technical Approach

```typescript
interface GestureMapping {
  gesture: GestureType;
  context: string[]; // Screen/component names
  action: string;
  enabled: boolean;
}

type GestureType =
  | 'two_finger_swipe_left'
  | 'two_finger_swipe_right'
  | 'pinch_in'
  | 'pinch_out'
  | 'long_press'
  | 'shake'
  | 'double_tap';

const DEFAULT_GESTURES: GestureMapping[] = [
  { gesture: 'two_finger_swipe_right', context: ['approval_list'], action: 'approve_all_safe', enabled: true },
  { gesture: 'pinch_in', context: ['session_view'], action: 'collapse_code_blocks', enabled: true },
  { gesture: 'pinch_out', context: ['session_view'], action: 'expand_code_blocks', enabled: true },
  { gesture: 'long_press', context: ['*'], action: 'context_menu', enabled: true },
  { gesture: 'shake', context: ['*'], action: 'undo_last', enabled: true },
];

// Gesture recognition using Hammer.js or similar
function useGestureRecognition(ref: RefObject<HTMLElement>) {
  useEffect(() => {
    const hammer = new Hammer(ref.current);

    hammer.get('pinch').set({ enable: true });
    hammer.get('pan').set({ direction: Hammer.DIRECTION_ALL });

    hammer.on('pinch', (e) => {
      const action = e.scale < 1 ? 'pinch_in' : 'pinch_out';
      handleGesture(action);
    });

    hammer.on('press', () => handleGesture('long_press'));

    return () => hammer.destroy();
  }, [ref]);
}
```

---

## Subagent Assignments

### Frontend Agent
- Gesture recognition library integration
- Context-aware gesture handling
- Gesture settings page
- Tutorial/onboarding for gestures
- Visual feedback animations

### Mobile Agent
- Test gestures on iOS/Android
- Handle gesture conflicts with OS gestures
- Performance optimization

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Gesture customization | 20% of users customize |
| Gesture usage | 30% of power users use non-swipe gestures |
