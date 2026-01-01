import { useState } from "react";
import { Link } from "react-router-dom";
import { NavigationSidebar } from "../components/NavigationSidebar";
import { PageHeader } from "../components/PageHeader";
import { ActiveCountBadge } from "../components/StatusBadge";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { useProjects } from "../hooks/useProjects";
import { useSidebarPreference } from "../hooks/useSidebarPreference";

export function ProjectsPage() {
  const { projects, loading, error } = useProjects();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Desktop layout hooks
  const isWideScreen = useMediaQuery("(min-width: 1100px)");
  const { isExpanded, toggleExpanded } = useSidebarPreference();

  if (loading) return <div className="loading">Loading projects...</div>;
  if (error) return <div className="error">Error: {error.message}</div>;

  return (
    <div className={`session-page ${isWideScreen ? "desktop-layout" : ""}`}>
      {/* Desktop sidebar - always visible on wide screens */}
      {isWideScreen && (
        <aside
          className={`sidebar-desktop ${!isExpanded ? "sidebar-collapsed" : ""}`}
        >
          <NavigationSidebar
            isOpen={true}
            onClose={() => {}}
            isDesktop={true}
            isCollapsed={!isExpanded}
            onToggleExpanded={toggleExpanded}
          />
        </aside>
      )}

      {/* Mobile sidebar - modal overlay */}
      {!isWideScreen && (
        <NavigationSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content wrapper for desktop centering */}
      <div
        className={
          isWideScreen ? "main-content-wrapper" : "main-content-mobile"
        }
      >
        <div
          className={
            isWideScreen
              ? "main-content-constrained"
              : "main-content-mobile-inner"
          }
        >
          <PageHeader
            title="Projects"
            onOpenSidebar={() => setSidebarOpen(true)}
          />

          <main className="sessions-page-content">
            {projects.length === 0 ? (
              <p>No projects found in ~/.claude/projects</p>
            ) : (
              <ul className="project-list">
                {projects.map((project) => (
                  <li key={project.id}>
                    <Link to={`/projects/${project.id}`}>
                      <strong>{project.name}</strong>
                      <span className="meta">
                        {project.sessionCount} sessions
                        <ActiveCountBadge
                          variant="owned"
                          count={project.activeOwnedCount}
                        />
                        <ActiveCountBadge
                          variant="external"
                          count={project.activeExternalCount}
                        />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
