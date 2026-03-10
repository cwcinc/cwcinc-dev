"use client";

import { Suspense, useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import ProjectCard from "./components/ProjectCard";
import PointCloud from "./components/PointCloud";
import ThemeToggle from "./components/ThemeToggle";

export default function Home() {
  return (
    <Suspense>
      <PageContent />
    </Suspense>
  );
}

function PageContent() {
  const searchParams = useSearchParams();
  const depth = parseInt(searchParams.get("depth") ?? "0");

  const { maxDepth, skipIntro } = useMemo(() => {
    const cores = navigator.hardwareConcurrency ?? 4;
    const mem = (navigator as { deviceMemory?: number }).deviceMemory ?? 4;
    const isLow = cores <= 4 || mem <= 2;
    const isMid = !isLow && (cores < 8 || mem < 8);
    return {
      maxDepth: isLow ? 0 : isMid ? 1 : 2,
      skipIntro: isLow,
    };
  }, []);

  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored !== null) setIsDark(stored === "dark");
  }, []);

  function toggleTheme() {
    setIsDark((prev) => {
      const next = !prev;
      localStorage.setItem("theme", next ? "dark" : "light");
      return next;
    });
  }

  const projects = [
    {
      title: "PolyRanked",
      description: "Ranked multiplayer mod for PolyTrack. Includes custom matchmaking, networking, signaling, and more.",
      image: "/projects/PolyRanked.png",
      href: "https://polyranked.cwcinc.dev/",
      livePreview: false,
    },
    {
      title: "Portfolio Site",
      description: "My personal portfolio website, built with Next.js and Tailwind CSS.\nYou're looking at it now...",
      image: "/projects/cwcincdevdark.png",
      href: `/?depth=${depth + 1}`,
      livePreview: depth < maxDepth,
    },
  ];

  return (
    <div className={`relative min-h-screen px-6 py-16 select-none ${isDark ? "bg-zinc-950 text-white" : "bg-white text-zinc-900"}`}>
      <PointCloud isDark={isDark} skipIntro={skipIntro} />
      {depth === 0 && <ThemeToggle isDark={isDark} onToggle={toggleTheme} />}
      <div className="relative z-10 max-w-4xl mx-auto text-center">
        <h1 className="text-4xl font-bold mb-2">cwcinc.dev</h1>
        <p className={`mb-12 text-lg ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>Projects i've built:</p>

        <div className="flex flex-wrap justify-center gap-6">
          {projects.map((project) => (
            <div key={project.title} className="w-full sm:w-72">
              <ProjectCard {...project} isDark={isDark} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
