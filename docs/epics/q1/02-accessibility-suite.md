# Epic: Accessibility Suite

**Epic ID:** Q1-002
**Priority:** P0
**Quarter:** Q1 2026
**Estimated Effort:** 2-3 weeks
**Status:** Planning

---

## Problem Statement

Yep Anywhere currently lacks comprehensive accessibility support, excluding users who rely on assistive technologies. This includes:
- Screen reader users (VoiceOver, TalkBack, NVDA)
- Users with motor impairments who need keyboard navigation
- Users with visual impairments who need high contrast or larger text
- Users with vestibular disorders who need reduced motion

**Target Outcome:** Achieve WCAG 2.1 AA compliance and enable all users to effectively supervise AI agents regardless of ability.

---

## User Stories

### US-001: Screen reader support
**As a** blind or low-vision user
**I want to** navigate the app using VoiceOver/TalkBack
**So that** I can supervise my AI agents without visual feedback

**Acceptance Criteria:**
- [ ] All interactive elements have descriptive ARIA labels
- [ ] Session list announces session name, status, and notification count
- [ ] Approval prompts read operation details clearly
- [ ] Message stream announces new messages as they arrive
- [ ] Tool outputs are described contextually
- [ ] Focus management follows logical order

### US-002: High contrast mode
**As a** user with low vision or color blindness
**I want to** enable high contrast mode
**So that** I can distinguish UI elements clearly

**Acceptance Criteria:**
- [ ] Toggle in settings to enable high contrast
- [ ] Minimum 7:1 contrast ratio for text in high contrast mode
- [ ] Status indicators use icons + color (not color alone)
- [ ] Focus indicators are clearly visible
- [ ] High contrast mode persists across sessions
- [ ] Respects system `prefers-contrast` media query

### US-003: Customizable font sizes
**As a** user with visual impairments
**I want to** increase the font size throughout the app
**So that** I can read content comfortably

**Acceptance Criteria:**
- [ ] Font size slider in settings (50% to 200% of default)
- [ ] All text scales proportionally
- [ ] Layout adapts gracefully to larger text
- [ ] Code blocks use monospace with size scaling
- [ ] Font size preference persists across sessions
- [ ] Respects system font size preferences

### US-004: Reduced motion
**As a** user with vestibular disorders
**I want to** disable animations and transitions
**So that** I can use the app without triggering discomfort

**Acceptance Criteria:**
- [ ] Toggle in settings to reduce motion
- [ ] All animations replaced with instant state changes
- [ ] Loading spinners replaced with static indicators
- [ ] Auto-scroll disabled (manual "scroll to bottom" button)
- [ ] Respects system `prefers-reduced-motion` media query
- [ ] Streaming text appears in chunks, not character-by-character

### US-005: Keyboard navigation
**As a** user who cannot use a mouse
**I want to** navigate the entire app using keyboard
**So that** I can perform all actions without pointing device

**Acceptance Criteria:**
- [ ] Tab order follows logical reading order
- [ ] All interactive elements are focusable
- [ ] Custom shortcuts for common actions (approve, deny, scroll)
- [ ] Escape key closes modals and menus
- [ ] Arrow keys navigate lists
- [ ] Keyboard shortcut reference panel (Cmd/Ctrl + ?)

### US-006: Touch target sizing
**As a** user with motor impairments on mobile
**I want to** touch targets to be large enough
**So that** I can accurately tap buttons and links

**Acceptance Criteria:**
- [ ] Minimum touch target size: 44x44px (iOS) / 48x48dp (Android)
- [ ] Adequate spacing between touch targets (8px minimum)
- [ ] Approve/Deny buttons prominently sized
- [ ] Swipe gestures have fallback tap alternatives
- [ ] No precision-required interactions

---

## Technical Approach

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 Accessibility Layer                      │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ A11y Context │  │ Focus Mgmt   │  │ Announcer    │  │
│  │              │  │              │  │              │  │
│  │ - contrast   │  │ - trap       │  │ - live       │  │
│  │ - fontSize   │  │ - restore    │  │ - polite     │  │
│  │ - motion     │  │ - order      │  │ - assertive  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Data Model

```typescript
interface AccessibilitySettings {
  highContrast: boolean;
  fontSize: number; // 0.5 to 2.0 multiplier
  reducedMotion: boolean;
  screenReaderOptimized: boolean;
  keyboardShortcutsEnabled: boolean;
}

interface A11yContextValue {
  settings: AccessibilitySettings;
  updateSettings: (partial: Partial<AccessibilitySettings>) => void;
  announce: (message: string, priority: 'polite' | 'assertive') => void;
  prefersReducedMotion: boolean; // from system
  prefersHighContrast: boolean; // from system
}
```

### Key Implementation Details

1. **ARIA Implementation:**
   ```tsx
   // Session list item
   <li
     role="article"
     aria-label={`Session: ${session.title}. Status: ${status}. ${notificationCount} notifications.`}
     aria-describedby={`session-${session.id}-details`}
   >

   // Approval prompt
   <div
     role="alertdialog"
     aria-labelledby="approval-title"
     aria-describedby="approval-description"
     aria-modal="true"
   >
   ```

2. **Focus Management:**
   ```typescript
   // Focus trap for modals
   useFocusTrap(modalRef, isOpen);

   // Restore focus on close
   useRestoreFocus(previousActiveElement);

   // Skip links for main content
   <a href="#main-content" className="sr-only focus:not-sr-only">
     Skip to main content
   </a>
   ```

3. **Live Announcements:**
   ```typescript
   const announce = useCallback((message: string, priority = 'polite') => {
     const el = document.getElementById('a11y-announcer');
     el.setAttribute('aria-live', priority);
     el.textContent = message;
   }, []);

   // Usage
   announce('New message from Claude', 'polite');
   announce('Approval required: Edit file', 'assertive');
   ```

4. **CSS Variables for Theming:**
   ```css
   :root {
     --font-size-base: 1rem;
     --color-text: #1f2937;
     --color-bg: #ffffff;
     --transition-duration: 200ms;
   }

   [data-high-contrast="true"] {
     --color-text: #000000;
     --color-bg: #ffffff;
     --color-focus: #0000ff;
   }

   [data-reduced-motion="true"] {
     --transition-duration: 0ms;
   }

   [data-font-scale] {
     font-size: calc(var(--font-size-base) * var(--font-scale, 1));
   }
   ```

5. **Keyboard Shortcuts:**
   ```typescript
   const shortcuts = {
     'a': 'Approve current request',
     'd': 'Deny current request',
     'j': 'Next session',
     'k': 'Previous session',
     '/': 'Focus search',
     '?': 'Show keyboard shortcuts',
     'Escape': 'Close modal/menu',
   };
   ```

### Testing Strategy

1. **Automated Testing:**
   - axe-core integration in unit tests
   - Lighthouse accessibility audits in CI
   - Jest-axe for component tests

2. **Manual Testing:**
   - VoiceOver on macOS/iOS
   - TalkBack on Android
   - NVDA on Windows
   - Keyboard-only navigation
   - High contrast mode on all platforms

3. **User Testing:**
   - Recruit users with disabilities for feedback
   - Partner with accessibility consultants

---

## Dependencies

| Dependency | Type | Status | Notes |
|------------|------|--------|-------|
| @radix-ui/react-* | External | New | Accessible component primitives |
| axe-core | External | New | Automated accessibility testing |
| focus-trap-react | External | New | Modal focus management |
| Settings persistence | Internal | Exists | Extend for a11y settings |

---

## Subagent Assignments

### Accessibility Specialist Agent
**Expertise:** WCAG 2.1, ARIA, assistive technology, inclusive design
**Tasks:**
1. Audit current codebase for accessibility issues
2. Define ARIA patterns for all components
3. Create accessibility testing checklist
4. Review all implementations for compliance
5. Write accessibility documentation

**Deliverables:**
- Accessibility audit report with prioritized fixes
- ARIA pattern library document
- Compliance checklist for PR reviews

### Frontend Agent
**Expertise:** React, TypeScript, CSS, component architecture
**Tasks:**
1. Create AccessibilityContext provider
2. Implement high contrast theme CSS variables
3. Add font scaling with CSS custom properties
4. Build keyboard shortcut system
5. Add ARIA attributes to all components
6. Create skip links and focus management utilities

**Deliverables:**
- `packages/client/src/contexts/AccessibilityContext.tsx`
- `packages/client/src/styles/high-contrast.css`
- `packages/client/src/hooks/useKeyboardShortcuts.ts`
- `packages/client/src/hooks/useFocusTrap.ts`

### Mobile Agent
**Expertise:** PWA, iOS Safari, Android Chrome, touch interactions
**Tasks:**
1. Verify VoiceOver compatibility on iOS Safari
2. Verify TalkBack compatibility on Android Chrome
3. Ensure touch targets meet size requirements
4. Test with system accessibility settings
5. Optimize for switch control users

**Deliverables:**
- Mobile accessibility test report
- Platform-specific fixes
- Touch target audit

### QA Agent
**Expertise:** Accessibility testing, automated testing, compliance
**Tasks:**
1. Set up axe-core in test suite
2. Create accessibility test matrix
3. Run screen reader testing sessions
4. Document keyboard navigation flows
5. Verify WCAG 2.1 AA compliance

**Deliverables:**
- Automated accessibility tests
- Manual test scripts for each screen reader
- WCAG compliance report

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| WCAG 2.1 AA compliance | 100% | Automated + manual audit |
| Lighthouse accessibility score | >95 | CI pipeline check |
| axe-core violations | 0 critical/serious | Automated tests |
| Keyboard-only task completion | 100% | Manual testing |
| Screen reader task completion | 100% | User testing |

---

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Screen reader inconsistencies | High | High | Test all major readers, document workarounds |
| Performance impact of a11y features | Low | Low | Profile and optimize |
| Developers break a11y in future | High | Medium | Automated tests, PR checklist |
| Mobile browser limitations | Medium | Medium | Document known issues, provide alternatives |

---

## Open Questions

1. Should we support custom color themes beyond high contrast?
2. How do we handle code block accessibility (long lines, syntax highlighting)?
3. Should we implement voice control navigation?
4. Do we need separate mobile and desktop keyboard shortcuts?

---

## References

- WCAG 2.1 Guidelines: https://www.w3.org/WAI/WCAG21/quickref/
- ARIA Authoring Practices: https://www.w3.org/WAI/ARIA/apg/
- Apple Accessibility: https://developer.apple.com/accessibility/
- Android Accessibility: https://developer.android.com/guide/topics/ui/accessibility
