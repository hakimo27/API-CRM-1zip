import { useRef, useState } from 'react';
import { Upload, X, Star, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface ImageUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
  folder?: string;
  maxImages?: number;
  label?: string;
}

export default function ImageUpload({
  images,
  onChange,
  folder = 'uploads',
  maxImages = 10,
  label = 'Фотографии',
}: ImageUploadProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remaining = maxImages - images.length;
    if (remaining <= 0) {
      toast({ title: `Максимум ${maxImages} изображений`, variant: 'destructive' });
      return;
    }
    const toUpload = Array.from(files).slice(0, remaining);
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of toUpload) {
        if (!file.type.startsWith('image/')) {
          toast({ title: 'Только изображения', description: file.name, variant: 'destructive' });
          continue;
        }
        const fd = new FormData();
        fd.append('file', file);
        const res = await api.upload<{ url: string }>(`/media/upload?folder=${folder}`, fd);
        if (res.url) uploaded.push(res.url);
      }
      if (uploaded.length > 0) onChange([...images, ...uploaded]);
    } catch (e: any) {
      toast({ title: 'Ошибка загрузки', description: e.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = (idx: number) => {
    const next = images.filter((_, i) => i !== idx);
    onChange(next);
  };

  const setCover = (idx: number) => {
    if (idx === 0) return;
    const next = [...images];
    const [item] = next.splice(idx, 1);
    next.unshift(item);
    onChange(next);
  };

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...images];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <span className="text-xs text-gray-400">{images.length} / {maxImages}</span>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((url, idx) => (
            <div key={url + idx} className="relative group aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
              <img src={url} alt="" className="w-full h-full object-cover" />

              {idx === 0 && (
                <div className="absolute top-1 left-1 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                  <Star className="w-2.5 h-2.5" /> Главное
                </div>
              )}

              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5">
                {idx !== 0 && (
                  <button
                    type="button"
                    onClick={() => setCover(idx)}
                    className="flex items-center gap-1 bg-yellow-400 text-yellow-900 text-[10px] font-medium px-2 py-1 rounded-lg hover:bg-yellow-300"
                  >
                    <Star className="w-3 h-3" /> Главным
                  </button>
                )}
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => move(idx, -1)}
                    disabled={idx === 0}
                    className="p-1 bg-white/90 text-gray-700 rounded-lg disabled:opacity-30 hover:bg-white"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(idx, 1)}
                    disabled={idx === images.length - 1}
                    className="p-1 bg-white/90 text-gray-700 rounded-lg disabled:opacity-30 hover:bg-white"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  className="flex items-center gap-1 bg-red-500 text-white text-[10px] font-medium px-2 py-1 rounded-lg hover:bg-red-600"
                >
                  <X className="w-3 h-3" /> Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {images.length < maxImages && (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => handleFiles(e.target.files)}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="w-full border-2 border-dashed border-gray-200 rounded-xl py-4 flex flex-col items-center gap-2 hover:border-blue-400 hover:bg-blue-50/50 transition-colors disabled:opacity-50 text-gray-500"
          >
            {uploading ? (
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            ) : (
              <Upload className="w-6 h-6" />
            )}
            <span className="text-sm font-medium">
              {uploading ? 'Загрузка...' : 'Загрузить фото'}
            </span>
            <span className="text-xs text-gray-400">JPG, PNG, WebP до 50 МБ</span>
          </button>
        </div>
      )}
    </div>
  );
}
