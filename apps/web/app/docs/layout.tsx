import { DocsSidebar } from "@/components/docs-sidebar";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
      <div className="flex flex-col md:flex-row gap-10">
        <aside className="md:w-56 shrink-0">
          <div className="sticky top-20">
            <DocsSidebar />
          </div>
        </aside>
        <div className="flex-1 min-w-0">
          <div className="max-w-3xl">{children}</div>
        </div>
      </div>
    </div>
  );
}
