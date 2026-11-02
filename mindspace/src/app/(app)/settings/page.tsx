import { requireUser } from "@/server/auth";
import { listCategories, listTags } from "@/server/services/taxonomy";
import { getWeights } from "@/server/services/evaluations";
import { getAISettingsView } from "@/server/services/settings";
import { PageHeader } from "@/components/ui/misc";
import { ThemeToggle } from "@/components/shared/theme";
import { Kbd } from "@/components/ui/misc";
import { ProfileSection, PasswordSection, SecuritySection } from "./account";
import { CategoriesSection, TagsSection } from "./taxonomy";
import { WeightsSection } from "./weights";
import { AISection } from "./ai-settings";
import { DeviceAISection } from "./device-ai";
import { DataSection } from "./data";

export const metadata = { title: "Settings" };

function Section({ id, title, description, children }: { id?: string; title: string; description?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-8 grid grid-cols-1 gap-4 border-t py-8 md:grid-cols-[14rem_minmax(0,1fr)]">
      <div>
        <h2 className="font-medium">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export default async function SettingsPage() {
  const user = await requireUser();
  const [categories, tags, weights, ai] = await Promise.all([listCategories(user.id), listTags(user.id), getWeights(user.id), getAISettingsView(user.id)]);
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Settings" />
      <Section title="Profile"><ProfileSection name={user.name ?? ""} email={user.email} /></Section>
      <Section title="Appearance"><ThemeToggle className="w-40" /></Section>
      <Section id="weights" title="Evaluation weights" description="How much each criterion counts toward an idea's overall score. Completed evaluations keep the weights they were scored with.">
        <WeightsSection initial={weights} />
      </Section>
      <Section id="categories" title="Categories" description="Group ideas your way.">
        <CategoriesSection categories={categories.map((c) => ({ id: c.id, name: c.name, color: c.color, count: c._count.ideas }))} />
      </Section>
      <Section title="Tags" description="Tags are created as you use them. Remove ones you no longer need.">
        <TagsSection tags={tags.map((t) => ({ id: t.id, name: t.name, count: t._count.ideas + t._count.thoughts }))} />
      </Section>
      <Section id="ai" title="AI thinking partner" description="Optional. Use the built-in offline model, or any OpenAI-compatible API.">
        <AISection initial={ai} />
      </Section>
      <Section id="device-ai" title="AI on this device" description="For your phone: a small model that runs right in the browser, fully offline.">
        <DeviceAISection />
      </Section>
      <Section id="data" title="Your data" description="Everything you write belongs to you. Export it any time.">
        <DataSection />
      </Section>
      <Section title="Password"><PasswordSection /></Section>
      <Section title="Sessions"><SecuritySection /></Section>
      <Section title="Keyboard shortcuts">
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt><Kbd>C</Kbd></dt><dd className="text-muted-foreground">Capture a thought</dd>
          <dt className="flex gap-0.5"><Kbd>⌘</Kbd><Kbd>K</Kbd></dt><dd className="text-muted-foreground">Search & command palette (also <Kbd>/</Kbd>)</dd>
          <dt className="flex gap-0.5"><Kbd>⌘</Kbd><Kbd>↵</Kbd></dt><dd className="text-muted-foreground">Save a thought or note</dd>
          <dt className="flex flex-wrap gap-0.5"><Kbd>G</Kbd><Kbd>D·I·E·P</Kbd><Kbd>G·R·A·S</Kbd></dt><dd className="text-muted-foreground">Go to Dashboard, Inbox, Ideas, Projects, Goals, Reflections, Archive, Settings</dd>
        </dl>
      </Section>
    </div>
  );
}
