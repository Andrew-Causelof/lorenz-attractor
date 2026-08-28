import { createFileRoute } from "@tanstack/react-router";
import LorenzCanvas from "@/components/lorenz/canvas";
import { Overlay } from "@/components/lorenz/overlay";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <main className="relative h-dvh w-full overflow-hidden bg-bg text-fg">
      <LorenzCanvas />
      <Overlay />
    </main>
  );
}
