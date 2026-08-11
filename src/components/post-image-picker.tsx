import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Image as ImageIcon, Loader2, Trash2, Upload, X, Crop, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { listMyImages, deleteMyImage } from "@/lib/images.functions";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024;
const OUT_SIZE = 1080;

async function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("Could not read that file"));
    r.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load that image"));
    img.src = src;
  });
}

type Props = {
  /** Cropped, ready-to-publish data URL (square). */
  value: string | null;
  onChange: (dataUrl: string | null) => void;
};

/** Upload / pick / crop the user's own image for a LinkedIn post. */
export function PostImagePicker({ value, onChange }: Props) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const client = useQueryClient();
  const listFn = useServerFn(listMyImages);
  const deleteFn = useServerFn(deleteMyImage);
  const library = useQuery({ queryKey: ["my-images"], queryFn: () => listFn() });

  const removeMut = useMutation({
    mutationFn: (path: string) => deleteFn({ data: { path } }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["my-images"] });
      toast.success("Image deleted");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  const handleFile = useCallback(
    async (file: File) => {
      if (!ACCEPTED.includes(file.type)) {
        toast.error("Unsupported format — use JPG, PNG or WEBP.");
        return;
      }
      if (file.size > MAX_BYTES) {
        toast.error("Images must be under 10 MB.");
        return;
      }
      setUploading(true);
      setProgress(0);
      try {
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData.user?.id;
        if (!uid) throw new Error("Not signed in");
        const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
        const path = `${uid}/${crypto.randomUUID()}.${ext}`;
        const { data: signed, error: signErr } = await supabase.storage
          .from("post-images")
          .createSignedUploadUrl(path);
        if (signErr || !signed) throw signErr ?? new Error("Could not start upload");

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", signed.signedUrl);
          xhr.setRequestHeader("Content-Type", file.type);
          xhr.upload.onprogress = (ev) => {
            if (ev.lengthComputable) setProgress(Math.round((ev.loaded / ev.total) * 100));
          };
          xhr.onload = () =>
            xhr.status >= 200 && xhr.status < 300
              ? resolve()
              : reject(new Error(`Upload failed (${xhr.status})`));
          xhr.onerror = () => reject(new Error("Network error during upload"));
          xhr.send(file);
        });

        setProgress(100);
        client.invalidateQueries({ queryKey: ["my-images"] });
        const dataUrl = await fileToDataUrl(file);
        setCropSrc(dataUrl);
        toast.success("Uploaded — crop it, then it's attached to your post.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [client],
  );

  async function useFromLibrary(url: string) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Could not load image (${res.status})`);
      const blob = await res.blob();
      setCropSrc(await fileToDataUrl(blob));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load that image");
    }
  }

  return (
    <div className="mt-4 space-y-4">
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />

      {value ? (
        <div className="space-y-3">
          <div className="relative mx-auto w-full max-w-md">
            <img src={value} alt="Your post image" className="aspect-square w-full rounded-xl object-cover" />
            <span className="absolute left-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-medium text-brand shadow">
              Using your image
            </span>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setCropSrc(value)}>
              <Crop className="mr-2 h-4 w-4" /> Crop
            </Button>
            <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Replace image
            </Button>
            <Button size="sm" variant="outline" onClick={() => onChange(null)}>
              <X className="mr-2 h-4 w-4" /> Remove image
            </Button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!uploading) setDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (uploading) return;
            const f = e.dataTransfer.files?.[0];
            if (f) handleFile(f);
          }}
          className={`flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-8 text-center transition-colors ${
            dragging ? "border-brand bg-brand/10" : "border-border bg-background/40"
          }`}
        >
          {uploading ? (
            <div className="w-full max-w-xs space-y-3">
              <div className="flex items-center justify-center gap-2 text-sm font-medium">
                <Loader2 className="h-4 w-4 animate-spin text-brand" /> Uploading… {progress}%
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-brand-gradient transition-[width] duration-150" style={{ width: `${progress}%` }} />
              </div>
            </div>
          ) : (
            <>
              <ImageIcon className="h-6 w-6 text-brand" />
              <div className="text-sm font-medium">Drag & drop an image here</div>
              <p className="text-xs text-muted-foreground">JPG, PNG or WEBP — max 10 MB</p>
              <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" /> Choose file
              </Button>
            </>
          )}
        </div>
      )}

      <div>
        <div className="flex items-center justify-between">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">My images</Label>
          {library.isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> : null}
        </div>
        {library.data && library.data.length > 0 ? (
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {library.data.map((img) => (
              <div key={img.path} className="group relative">
                <button
                  type="button"
                  onClick={() => useFromLibrary(img.url)}
                  className="block w-full overflow-hidden rounded-lg border border-border transition-colors hover:border-brand"
                >
                  <img src={img.url} alt={img.name} className="aspect-square w-full object-cover" />
                </button>
                <button
                  type="button"
                  onClick={() => removeMut.mutate(img.path)}
                  aria-label="Delete image"
                  className="absolute right-1 top-1 rounded-md bg-background/90 p-1 text-destructive opacity-0 shadow transition-opacity group-hover:opacity-100 focus:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">
            {library.isLoading ? "Loading your library…" : "Images you upload are saved here so you can reuse them later."}
          </p>
        )}
      </div>

      {cropSrc ? (
        <CropDialog
          src={cropSrc}
          onCancel={() => setCropSrc(null)}
          onDone={(dataUrl) => {
            onChange(dataUrl);
            setCropSrc(null);
          }}
        />
      ) : null}
    </div>
  );
}

function CropDialog({
  src,
  onCancel,
  onDone,
}: {
  src: string;
  onCancel: () => void;
  onDone: (dataUrl: string) => void;
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [boxSize, setBoxSize] = useState(320);

  useEffect(() => {
    let cancelled = false;
    loadImage(src)
      .then((i) => {
        if (!cancelled) {
          setImg(i);
          setZoom(1);
          setOffset({ x: 0, y: 0 });
        }
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Could not load image"));
    return () => {
      cancelled = true;
    };
  }, [src]);

  useEffect(() => {
    if (boxRef.current) setBoxSize(boxRef.current.clientWidth);
  }, [img]);

  const base = img ? Math.max(boxSize / img.naturalWidth, boxSize / img.naturalHeight) : 1;
  const scale = base * zoom;
  const drawW = img ? img.naturalWidth * scale : 0;
  const drawH = img ? img.naturalHeight * scale : 0;

  const clamp = useCallback(
    (o: { x: number; y: number }) => ({
      x: Math.min(0, Math.max(boxSize - drawW, o.x)),
      y: Math.min(0, Math.max(boxSize - drawH, o.y)),
    }),
    [boxSize, drawW, drawH],
  );

  // Centre only when a new image loads or the box is measured — never on zoom,
  // which would discard the user's repositioning.
  useEffect(() => {
    if (!img) return;
    const w = img.naturalWidth * Math.max(boxSize / img.naturalWidth, boxSize / img.naturalHeight) * zoomRef.current;
    const h = img.naturalHeight * Math.max(boxSize / img.naturalWidth, boxSize / img.naturalHeight) * zoomRef.current;
    setOffset({ x: (boxSize - w) / 2, y: (boxSize - h) / 2 });
  }, [img, boxSize]);

  // Keep the visual centre anchored while zooming, then re-clamp.
  function changeZoom(next: number) {
    setOffset((o) => {
      const ratio = next / zoom;
      const x = (o.x - boxSize / 2) * ratio + boxSize / 2;
      const y = (o.y - boxSize / 2) * ratio + boxSize / 2;
      const nw = drawW * ratio;
      const nh = drawH * ratio;
      return {
        x: Math.min(0, Math.max(boxSize - nw, x)),
        y: Math.min(0, Math.max(boxSize - nh, y)),
      };
    });
    setZoom(next);
  }

  function startDrag(clientX: number, clientY: number) {
    dragRef.current = { x: clientX, y: clientY, ox: offset.x, oy: offset.y };
  }
  function moveDrag(clientX: number, clientY: number) {
    const d = dragRef.current;
    if (!d) return;
    setOffset(clamp({ x: d.ox + (clientX - d.x), y: d.oy + (clientY - d.y) }));
  }

  async function confirm() {
    if (!img) return;
    setBusy(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = OUT_SIZE;
      canvas.height = OUT_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable");
      const f = OUT_SIZE / boxSize;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, OUT_SIZE, OUT_SIZE);
      ctx.drawImage(img, offset.x * f, offset.y * f, drawW * f, drawH * f);
      onDone(canvas.toDataURL("image/jpeg", 0.92));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not crop image");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h4 className="font-display text-sm font-semibold">Crop & reposition</h4>
          <button type="button" onClick={onCancel} aria-label="Close" className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Drag to reposition, zoom to fill the square LinkedIn crop.</p>
        <div
          ref={boxRef}
          className="relative mt-4 aspect-square w-full cursor-grab select-none overflow-hidden rounded-xl border border-border bg-muted active:cursor-grabbing"
          onMouseDown={(e) => startDrag(e.clientX, e.clientY)}
          onMouseMove={(e) => moveDrag(e.clientX, e.clientY)}
          onMouseUp={() => (dragRef.current = null)}
          onMouseLeave={() => (dragRef.current = null)}
          onTouchStart={(e) => startDrag(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchMove={(e) => moveDrag(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchEnd={() => (dragRef.current = null)}
        >
          {img ? (
            <img
              src={src}
              alt="Crop preview"
              draggable={false}
              className="absolute max-w-none"
              style={{ width: drawW, height: drawH, left: offset.x, top: offset.y }}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Loading…</div>
          )}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Label className="text-xs text-muted-foreground">Zoom</Label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => changeZoom(Number(e.target.value))}
            className="h-1.5 flex-1 accent-[hsl(var(--brand))]"
          />
          <Button size="sm" variant="ghost" onClick={() => changeZoom(1)} aria-label="Reset zoom">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" className="bg-brand-gradient text-brand-foreground" onClick={confirm} disabled={!img || busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />} Use image
          </Button>
        </div>
      </div>
    </div>
  );
}
