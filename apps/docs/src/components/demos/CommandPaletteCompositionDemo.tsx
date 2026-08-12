import { useEffect, useState } from "react";
import { Button, CommandPalette } from "@kernelui-lib/react";

type Course = {
  id: string;
  track: string;
  title: string;
  module: string;
  status: "Free lesson" | "Completed" | "Premium";
  sections: Array<{ id: string; label: string; snippet: string }>;
};

const courses: Course[] = [
  {
    id: "flexbox",
    track: "Layout engineering",
    title: "Flexbox that holds up under pressure",
    module: "Module 04: Resilient layout",
    status: "Free lesson",
    sections: [
      { id: "flexbox-axis", label: "The two-axis model", snippet: "Understand how main and cross axes change when direction changes." },
      { id: "flexbox-gaps", label: "Gaps, not magic margins", snippet: "Use gap to keep spacing predictable as items wrap." },
    ],
  },
  {
    id: "motion",
    track: "Interaction craft",
    title: "Motion that explains the interface",
    module: "Module 07: Physical feedback",
    status: "Completed",
    sections: [
      { id: "motion-anticipation", label: "Anticipation and release", snippet: "A good transition prepares the eye before the layout changes." },
    ],
  },
  {
    id: "typography",
    track: "Interface foundations",
    title: "Typography as a layout system",
    module: "Module 02: Type and rhythm",
    status: "Premium",
    sections: [],
  },
];

function highlight(text: string, query: string) {
  const normalized = query.trim();
  if (!normalized) return text;
  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const expression = new RegExp(`(${escaped})`, "ig");
  return text.split(expression).map((part, index) =>
    part.toLowerCase() === normalized.toLowerCase()
      ? <mark key={`${part}-${index}`}>{part}</mark>
      : part,
  );
}

function LessonRow({ course, active }: { course: Course; active: boolean }) {
  return (
    <div style={{ display: "grid", gap: "0.2rem", opacity: active ? 1 : 0.88 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "baseline" }}>
        <strong>{course.title}</strong>
        <small style={{ color: "var(--kernel-color-text-muted)", whiteSpace: "nowrap" }}>{course.status}</small>
      </div>
      <span style={{ color: "var(--kernel-color-text-muted)" }}>{course.module}</span>
    </div>
  );
}

function SectionRow({ section, query, active }: { section: Course["sections"][number]; query: string; active: boolean }) {
  return (
    <div style={{ display: "grid", gap: "0.2rem", paddingInlineStart: "1rem", borderInlineStart: "2px solid var(--kernel-color-border)" }}>
      <strong style={{ fontWeight: active ? 650 : 550 }}>{section.label}</strong>
      <span style={{ color: "var(--kernel-color-text-muted)" }}>{highlight(section.snippet, query)}</span>
    </div>
  );
}

export default function CommandPaletteCompositionDemo() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [offline, setOffline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [visibleCourses, setVisibleCourses] = useState(courses);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const timer = window.setTimeout(() => {
      const normalized = query.trim().toLowerCase();
      setVisibleCourses(normalized
        ? courses.filter((course) => {
            const courseText = `${course.title} ${course.module} ${course.track} ${course.sections.map((section) => `${section.label} ${section.snippet}`).join(" ")}`;
            return courseText.toLowerCase().includes(normalized);
          })
        : courses);
      setLoading(false);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [open, query]);

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <section aria-labelledby="course-search-title" style={{ display: "grid", gap: "0.75rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <h3 id="course-search-title" style={{ margin: 0 }}>Course search</h3>
            <p style={{ margin: "0.25rem 0 0", color: "var(--kernel-color-text-muted)" }}>Find a lesson or jump straight to a matching section.</p>
          </div>
          <Button variant="primary" onClick={() => setOpen(true)}>Search the course</Button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", color: "var(--kernel-color-text-muted)", fontSize: "0.875rem" }}>
          <span>{visibleCourses.length} lessons indexed</span>
          <span aria-hidden="true">·</span>
          <Button variant="ghost" size="sm" onClick={() => setOffline((current) => !current)} aria-pressed={offline}>{offline ? "Reconnect search" : "Simulate offline"}</Button>
          {selected ? <output role="status">Opened: {selected}</output> : null}
        </div>
      </section>

      <CommandPalette open={open} onOpenChange={setOpen} shouldFilter={false}>
        <CommandPalette.Input value={query} onValueChange={setQuery} placeholder="Search lessons and sections" />
        <CommandPalette.List>
          {loading ? <CommandPalette.Loading>Searching the course index...</CommandPalette.Loading> : null}
          {!loading && offline ? <CommandPalette.Empty>Unable to load lessons. Reconnect search and try again.</CommandPalette.Empty> : null}
          {!loading && !offline && visibleCourses.length === 0 ? <CommandPalette.Empty>No lessons match &quot;{query}&quot;. Try a broader search.</CommandPalette.Empty> : null}
          {!loading && !offline ? visibleCourses.map((course) => (
            <CommandPalette.Group key={course.id} id={course.id} heading={course.track}>
              <CommandPalette.Item id={`lesson-${course.id}`} value={`${course.title} ${course.module}`} disabled={course.status === "Premium"} onSelect={() => setSelected(course.title)}>
                {({ active }) => <LessonRow course={course} active={active} />}
              </CommandPalette.Item>
              {course.sections.map((section) => (
                <CommandPalette.Item key={section.id} id={`section-${section.id}`} value={`${section.label} ${section.snippet}`} onSelect={() => setSelected(section.label)}>
                  {({ active }) => <SectionRow section={section} query={query} active={active} />}
                </CommandPalette.Item>
              ))}
            </CommandPalette.Group>
          )) : null}
        </CommandPalette.List>
      </CommandPalette>

    </div>
  );
}
