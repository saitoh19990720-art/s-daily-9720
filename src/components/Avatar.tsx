// 推しアバター表示。値が画像(dataURL/URL)なら画像、絵文字ならそのまま表示。
export function Avatar({
  value,
  size = 44,
  square = false,
  className = "",
}: {
  value: string;
  size?: number;
  square?: boolean;
  className?: string;
}) {
  const isImg = /^(data:|https?:|blob:)/.test(value);
  const radius = square ? "rounded-2xl" : "rounded-full";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden bg-accent-soft ${radius} ${className}`}
      style={{ width: size, height: size }}
    >
      {isImg ? (
        <img src={value} alt="推し" className="h-full w-full object-cover" />
      ) : (
        <span style={{ fontSize: Math.round(size * 0.52), lineHeight: 1 }}>{value}</span>
      )}
    </span>
  );
}

// 画像ファイルを 256px 以内に縮小して dataURL 化（localStorage 肥大を防ぐ）。
export function fileToAvatarDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read failed"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode failed"));
      img.onload = () => {
        const max = 256;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no ctx"));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
