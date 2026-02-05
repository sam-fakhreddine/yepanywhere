# Epic: Session Export to Shareable Formats

**Epic ID:** Q3-005
**Priority:** P1
**Quarter:** Q3 2026
**Estimated Effort:** 1-2 weeks
**Status:** Planning

---

## Problem Statement

Users want to share session insights outside the app (in wikis, reports, or emails) but must manually copy/paste content.

**Target Outcome:** Export sessions to Markdown, PDF, HTML, and JSON formats with customization options.

---

## User Stories

### US-001: Export to Markdown
- [ ] Full conversation with formatting
- [ ] Code blocks preserved
- [ ] Tool outputs optionally included
- [ ] Annotations included as blockquotes
- [ ] Downloadable .md file

### US-002: Export to PDF
- [ ] Styled PDF document
- [ ] Custom header/footer
- [ ] Table of contents for long sessions
- [ ] Page breaks between topics
- [ ] Company logo option

### US-003: Export to HTML
- [ ] Standalone HTML page
- [ ] Embedded styles (no external deps)
- [ ] Syntax highlighting
- [ ] Collapsible tool outputs
- [ ] Shareable via any web server

### US-004: Export options
- [ ] Include/exclude tool outputs
- [ ] Include/exclude annotations
- [ ] Redact sensitive paths/tokens
- [ ] Date range selection
- [ ] Message filter

---

## Technical Approach

```typescript
interface ExportOptions {
  format: 'markdown' | 'pdf' | 'html' | 'json';
  includeToolOutputs: boolean;
  includeAnnotations: boolean;
  redactPatterns: string[]; // Regex patterns for sensitive data
  dateRange?: { start: string; end: string };
  header?: string;
  footer?: string;
}

class SessionExporter {
  async export(sessionId: string, options: ExportOptions): Promise<Buffer> {
    const messages = await this.getMessages(sessionId, options);
    const annotations = options.includeAnnotations
      ? await this.getAnnotations(sessionId)
      : [];

    const content = this.formatMessages(messages, annotations, options);

    switch (options.format) {
      case 'markdown':
        return Buffer.from(content, 'utf-8');
      case 'pdf':
        return this.generatePdf(content, options);
      case 'html':
        return this.generateHtml(content, options);
      case 'json':
        return Buffer.from(JSON.stringify({ messages, annotations }, null, 2));
    }
  }

  private generatePdf(content: string, options: ExportOptions): Buffer {
    // Use puppeteer or similar to render HTML to PDF
    const html = this.generateHtml(content, options);
    return puppeteer.pdf(html);
  }
}
```

---

## Subagent Assignments

### Backend Agent
- Export service with format handlers
- Markdown/HTML generation
- PDF generation with puppeteer
- Redaction logic

### Frontend Agent
- Export dialog with format selection
- Export options form
- Download handling
- Export history

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Export usage | 15% of sessions exported |
| Format distribution | 50% Markdown, 30% PDF, 20% HTML |
