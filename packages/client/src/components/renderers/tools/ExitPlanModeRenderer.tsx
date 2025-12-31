import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type {
  ExitPlanModeInput,
  ExitPlanModeResult,
  ToolRenderer,
} from "./types";

export const exitPlanModeRenderer: ToolRenderer<
  ExitPlanModeInput,
  ExitPlanModeResult
> = {
  tool: "ExitPlanMode",

  // These are required by the interface but won't be used since renderInline takes over
  renderToolUse() {
    return null;
  },

  renderToolResult() {
    return null;
  },

  // Render inline without any tool-row wrapper - full control over rendering
  renderInline(input, result, isError, status) {
    const planInput = input as ExitPlanModeInput;
    const planResult = result as ExitPlanModeResult;

    // Get plan content from input (tool_use) or result (tool_result)
    const plan: string | undefined = planInput?.plan || planResult?.plan;

    if (isError) {
      const errorResult = result as unknown as
        | { content?: unknown }
        | undefined;
      return (
        <div className="exitplan-error">
          {typeof result === "object" && errorResult?.content
            ? String(errorResult.content)
            : "Exit plan mode failed"}
        </div>
      );
    }

    // Show "Planning..." only if we don't have plan content yet
    if (!plan) {
      if (status === "pending") {
        return <div className="exitplan-pending">Planning...</div>;
      }
      return null;
    }

    // Show the plan content (works for both pending and complete states)
    return (
      <div
        className={`exitplan-inline ${status === "pending" ? "pending" : ""}`}
      >
        <Markdown remarkPlugins={[remarkGfm]}>{plan}</Markdown>
      </div>
    );
  },

  getUseSummary(_input) {
    return "Exit plan mode";
  },

  getResultSummary(_result, isError) {
    if (isError) return "Error";
    return "Plan";
  },
};
