"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function ProductGallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return <div className="card grid aspect-square place-items-center text-zinc-300">Sin imagen</div>;
  }

  return (
    <div className="space-y-3">
      <div className="card aspect-square overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[active]} alt={alt} className="size-full object-contain p-6" />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {images.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => setActive(i)}
              className={cn("card size-20 shrink-0 overflow-hidden p-1", i === active && "border-brand ring-2 ring-brand/30")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="size-full object-contain" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
