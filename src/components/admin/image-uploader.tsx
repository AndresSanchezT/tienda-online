"use client";

import { useState } from "react";

async function upload(files: FileList, folder: "products" | "store"): Promise<string[]> {
  const fd = new FormData();
  for (const f of Array.from(files)) fd.append("file", f);
  fd.append("folder", folder);
  const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
  const data = (await res.json()) as { urls?: string[]; error?: string };
  if (!res.ok || !data.urls) throw new Error(data.error ?? "Error al subir");
  return data.urls;
}

/** Lista de imágenes ordenable: subir, pegar URL, mover y quitar. La primera es la principal. */
export function ImageListInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState("");

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    try {
      onChange([...value, ...(await upload(files, "products"))]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const move = (i: number, d: -1 | 1) => {
    const next = [...value];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {value.map((src, i) => (
          <div key={src + i} className="relative size-28 rounded-lg border border-zinc-200 bg-white p-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="size-full object-contain" />
            {i === 0 && <span className="absolute top-1 left-1 badge bg-brand text-white">Principal</span>}
            <div className="absolute inset-x-1 bottom-1 flex justify-between gap-1 text-xs">
              <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="rounded bg-white/90 px-1.5 shadow disabled:opacity-30">←</button>
              <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="rounded bg-red-600 px-1.5 text-white shadow">✕</button>
              <button type="button" disabled={i === value.length - 1} onClick={() => move(i, 1)} className="rounded bg-white/90 px-1.5 shadow disabled:opacity-30">→</button>
            </div>
          </div>
        ))}
        <label className="grid size-28 cursor-pointer place-items-center rounded-lg border-2 border-dashed border-zinc-300 text-center text-xs text-zinc-500 hover:border-brand">
          {busy ? "Subiendo..." : "+ Subir imágenes"}
          <input type="file" accept="image/*" multiple className="hidden" disabled={busy} onChange={(e) => onFiles(e.target.files)} />
        </label>
      </div>
      <div className="flex gap-2">
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="…o pega la URL de una imagen" className="input" />
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            if (/^(https?:\/\/|\/)/.test(url.trim())) {
              onChange([...value, url.trim()]);
              setUrl("");
            }
          }}
        >
          Agregar
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

/** Una sola imagen (logo, QR de Yape...) que se guarda en un input oculto con el nombre dado. */
export function SingleImageInput({ name, defaultValue }: { name: string; defaultValue?: string | null }) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-3">
      <input type="hidden" name={name} value={value} />
      <div className="grid size-20 shrink-0 place-items-center rounded-lg border border-zinc-200 bg-white">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="size-full object-contain p-1" />
        ) : (
          <span className="text-xs text-zinc-400">Sin imagen</span>
        )}
      </div>
      <div className="space-y-1 text-sm">
        <label className="btn-secondary cursor-pointer py-1.5">
          {busy ? "Subiendo..." : "Subir"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              if (!e.target.files?.length) return;
              setBusy(true);
              setError(null);
              try {
                setValue((await upload(e.target.files, "store"))[0]);
              } catch (err) {
                setError((err as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          />
        </label>
        {value && (
          <button type="button" className="ml-2 text-red-600 hover:underline" onClick={() => setValue("")}>
            Quitar
          </button>
        )}
        {error && <p className="text-red-600">{error}</p>}
      </div>
    </div>
  );
}
