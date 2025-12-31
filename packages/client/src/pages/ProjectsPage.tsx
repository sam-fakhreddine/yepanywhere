import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { ActiveCountBadge } from "../components/StatusBadge";
import { useProjects } from "../hooks/useProjects";

export function ProjectsPage() {
  const { projects, loading, error } = useProjects();

  if (loading) return <div className="loading">Loading projects...</div>;
  if (error) return <div className="error">Error: {error.message}</div>;

  return (
    <div className="session-page">
      <PageHeader title="Projects" />

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
  );
}
