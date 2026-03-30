import { redirect } from "next/navigation";

// Email templates are project-scoped (/project/[id]/auth/templates).
// Navigating here without a project context is not meaningful.
export default function AuthTemplatesPage() {
  redirect("/");
}
