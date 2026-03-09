"use client";

import Image from "next/image";
import { useRef, useEffect } from "react";

type ProjectCardProps = {
  title: string;
  description: string;
  image: string;
  href: string;
  livePreview?: boolean;
  isDark?: boolean;
};

export default function ProjectCard({ title, description, image, href, livePreview, isDark = true }: ProjectCardProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!livePreview) return;

    function forward(msg: object) {
      iframeRef.current?.contentWindow?.postMessage(msg, "*");
    }

    function onMouseMove(e: MouseEvent) {
      forward({ type: "pointcloud-mouse", nx: e.clientX / window.innerWidth, ny: e.clientY / window.innerHeight });
    }
    function onMouseLeave() { forward({ type: "pointcloud-mouse-leave" }); }
    function onMouseDown() { forward({ type: "pointcloud-mousedown" }); }
    function onMouseUp() { forward({ type: "pointcloud-mouseup" }); }

    // Forward messages received from a parent iframe down to nested iframe
    function onMessage(e: MessageEvent) {
      const { type } = e.data ?? {};
      if (type?.startsWith("pointcloud-")) forward(e.data);
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseleave", onMouseLeave);
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("message", onMessage);
    };
  }, [livePreview]);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`group block rounded-xl overflow-hidden border transition-colors ${
        isDark
          ? "border-zinc-800 bg-zinc-900 hover:border-zinc-600"
          : "border-zinc-200 bg-white hover:border-zinc-400"
      }`}
    >
      <div className={`flex items-center justify-center h-44 overflow-hidden relative ${isDark ? "bg-zinc-800" : "bg-zinc-100"}`}>
        {livePreview ? (
          <iframe
            ref={iframeRef}
            src={href}
            className="absolute top-0 left-0 pointer-events-none border-0"
            style={{ width: "400%", height: 704, transform: "scale(0.25)", transformOrigin: "top left" }}
            scrolling="no"
            tabIndex={-1}
          />
        ) : (
          <Image
            src={image}
            alt={title}
            fill
            className="object-cover"
          />
        )}
      </div>
      <div className="p-4">
        <h2 className={`text-lg font-semibold mb-1 ${isDark ? "text-zinc-100 group-hover:text-white" : "text-zinc-900 group-hover:text-zinc-600"}`}>
          {title}
        </h2>
        <p className={`text-sm whitespace-pre-line ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>{description}</p>
      </div>
    </a>
  );
}
