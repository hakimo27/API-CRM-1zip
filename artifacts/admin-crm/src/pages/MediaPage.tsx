import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 Б';
  const k = 1024;
  const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const getIcon = (type: string, mime: string) => {
  if (type === 'image') return '🖼️';
  if (type === 'video') return '🎬';
  if (mime === 'application/pdf') return '📄';
  if (mime?.includes('zip')) return '🗜️';
  return '📎';
};

export default function MediaPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [currentFolder, setCurrentFolder] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [dragging, setDragging] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [previewFile, setPreviewFile] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filesQuery = useQuery<any[]>({
    queryKey: ['media-files', currentFolder],
    queryFn: () => api.get(`/media/files${currentFolder ? `?folder=${currentFolder}` : ''}`),
  });

  const foldersQuery = useQuery<string[]>({
    queryKey: ['media-folders'],
    queryFn: () => api.get('/media/folders'),
  });

  const uploadMut = useMutation({
    mutationFn: async (files: FileList) => {
      const results = [];
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append('file', file);
        const url = `/media/upload${currentFolder ? `?folder=${currentFolder}` : ''}`;
        const token = localStorage.getItem('crm_token');
        const res = await fetch(`/api${url}`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: fd,
        });
        if (!res.ok) throw new Error(`Ошибка загрузки ${file.name}`);
        results.push(await res.json());
      }
      return results;
    },
    onSuccess: (results) => {
      qc.invalidateQueries({ queryKey: ['media-files'] });
      toast({ title: `Загружено ${results.length} файл(ов)` });
    },
    onError: (e: any) => toast({ title: 'Ошибка загрузки', description: e.message, variant: 'destructive' }),
  });

  const deleteMut = useMutation({
    mutationFn: (filePath: string) => api.delete(`/media/files?path=${encodeURIComponent(filePath)}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['media-files'] });
      setSelectedFile(null);
      toast({ title: 'Файл удалён' });
    },
    onError: (e: any) => toast({ title: 'Ошибка удаления', description: e.message, variant: 'destructive' }),
  });

  const createFolderMut = useMutation({
    mutationFn: (name: string) => api.post('/media/folders', { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['media-folders'] });
      qc.invalidateQueries({ queryKey: ['media-files'] });
      setNewFolderName('');
      setShowNewFolder(false);
      toast({ title: 'Папка создана' });
    },
    onError: (e: any) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }),
  });

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) uploadMut.mutate(e.dataTransfer.files);
  }, [currentFolder]);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = () => setDragging(false);

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: 'URL скопирован в буфер обмена' });
  };

  const files = filesQuery.data || [];
  const folders = foldersQuery.data || [];

  const breadcrumbs = ['Медиа', ...currentFolder.split('/').filter(Boolean)];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Медиафайлы</h1>
          <p className="text-sm text-gray-500 mt-1">Управление медиаконтентом сайта</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView(v => v === 'grid' ? 'list' : 'grid')}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
          >
            {view === 'grid' ? '≡ Список' : '⊞ Сетка'}
          </button>
          <button
            onClick={() => setShowNewFolder(true)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
          >
            + Папка
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMut.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {uploadMut.isPending ? 'Загрузка...' : '↑ Загрузить файлы'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={e => e.target.files && uploadMut.mutate(e.target.files)}
            accept="image/*,video/*,.pdf,.zip,.doc,.docx,.xls,.xlsx"
          />
        </div>
      </div>

      <nav className="flex items-center gap-1 mb-4 text-sm">
        {breadcrumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <span className="text-gray-400">/</span>}
            <button
              onClick={() => {
                if (i === 0) setCurrentFolder('');
                else setCurrentFolder(breadcrumbs.slice(1, i + 1).join('/'));
              }}
              className={`${i === breadcrumbs.length - 1 ? 'text-gray-900 font-medium' : 'text-blue-600 hover:underline'}`}
            >
              {crumb}
            </button>
          </span>
        ))}
      </nav>

      <div className="flex gap-6">
        <div className="w-48 flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 p-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Папки</p>
            <button
              onClick={() => setCurrentFolder('')}
              className={`w-full text-left px-2 py-1.5 rounded text-sm flex items-center gap-2 ${!currentFolder ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-50'}`}
            >
              📁 Все файлы
            </button>
            {folders.map(folder => (
              <button
                key={folder}
                onClick={() => setCurrentFolder(folder)}
                className={`w-full text-left px-2 py-1.5 rounded text-sm flex items-center gap-2 ${currentFolder === folder ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-50'}`}
              >
                📁 {folder}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`min-h-64 rounded-xl border-2 transition-colors ${dragging ? 'border-blue-400 bg-blue-50' : 'border-dashed border-gray-200'} p-4`}
          >
            {dragging && (
              <div className="flex items-center justify-center h-40 text-blue-600 text-lg font-medium">
                Отпустите файлы для загрузки
              </div>
            )}
            {!dragging && filesQuery.isLoading && (
              <div className="flex items-center justify-center h-40 text-gray-400">Загрузка...</div>
            )}
            {!dragging && !filesQuery.isLoading && files.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                <span className="text-4xl mb-2">📂</span>
                <p>Папка пуста. Перетащите файлы сюда для загрузки.</p>
              </div>
            )}
            {!dragging && files.length > 0 && view === 'grid' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {files.map((file) => (
                  <div
                    key={file.path}
                    onClick={() => setSelectedFile(file)}
                    className={`relative rounded-lg border-2 cursor-pointer hover:border-blue-400 transition-all group overflow-hidden ${selectedFile?.path === file.path ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'}`}
                  >
                    {file.type === 'image' ? (
                      <img
                        src={file.url}
                        alt={file.name}
                        className="w-full h-24 object-cover bg-gray-100"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-full h-24 flex items-center justify-center bg-gray-50 text-4xl">
                        {getIcon(file.type, file.mime)}
                      </div>
                    )}
                    <div className="p-1.5">
                      <p className="text-xs text-gray-700 truncate font-medium" title={file.name}>{file.name}</p>
                      <p className="text-xs text-gray-400">{formatBytes(file.size)}</p>
                    </div>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-all" />
                  </div>
                ))}
              </div>
            )}
            {!dragging && files.length > 0 && view === 'list' && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 text-gray-500 font-medium">Файл</th>
                    <th className="text-left py-2 text-gray-500 font-medium">Размер</th>
                    <th className="text-left py-2 text-gray-500 font-medium">Тип</th>
                    <th className="text-left py-2 text-gray-500 font-medium">Дата</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((file) => (
                    <tr
                      key={file.path}
                      onClick={() => setSelectedFile(file)}
                      className={`border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${selectedFile?.path === file.path ? 'bg-blue-50' : ''}`}
                    >
                      <td className="py-2 flex items-center gap-2">
                        <span>{getIcon(file.type, file.mime)}</span>
                        <span className="truncate max-w-xs" title={file.name}>{file.name}</span>
                      </td>
                      <td className="py-2 text-gray-500">{formatBytes(file.size)}</td>
                      <td className="py-2 text-gray-500">{file.mime}</td>
                      <td className="py-2 text-gray-500">{file.modifiedAt ? new Date(file.modifiedAt).toLocaleDateString('ru-RU') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {files.length} файл(ов) · Перетащите файлы в область выше для загрузки
          </p>
        </div>

        {selectedFile && (
          <div className="w-72 flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 p-4 sticky top-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 text-sm">Свойства файла</h3>
                <button onClick={() => setSelectedFile(null)} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
              </div>
              {selectedFile.type === 'image' ? (
                <img
                  src={selectedFile.url}
                  alt={selectedFile.name}
                  className="w-full rounded-lg mb-3 max-h-48 object-contain bg-gray-50 cursor-zoom-in"
                  onClick={() => setPreviewFile(selectedFile)}
                />
              ) : (
                <div className="w-full h-32 flex items-center justify-center bg-gray-50 rounded-lg mb-3 text-5xl">
                  {getIcon(selectedFile.type, selectedFile.mime)}
                </div>
              )}
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-gray-500 text-xs">Имя файла</p>
                  <p className="font-medium break-all">{selectedFile.name}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Размер</p>
                  <p>{formatBytes(selectedFile.size)}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">MIME-тип</p>
                  <p>{selectedFile.mime}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">URL</p>
                  <div className="flex gap-1">
                    <input
                      readOnly
                      value={selectedFile.url}
                      className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1 truncate"
                    />
                    <button
                      onClick={() => copyUrl(selectedFile.url)}
                      className="px-2 py-1 bg-gray-100 border border-gray-200 rounded text-xs hover:bg-gray-200"
                      title="Копировать URL"
                    >
                      📋
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <a
                  href={selectedFile.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                >
                  Открыть
                </a>
                <button
                  onClick={() => {
                    if (confirm(`Удалить файл "${selectedFile.name}"?`)) {
                      deleteMut.mutate(selectedFile.path);
                    }
                  }}
                  disabled={deleteMut.isPending}
                  className="px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm hover:bg-red-100 disabled:opacity-50"
                >
                  Удалить
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showNewFolder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-bold text-lg mb-4">Создать папку</h3>
            <input
              type="text"
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              placeholder="Название папки"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={e => e.key === 'Enter' && newFolderName && createFolderMut.mutate(newFolderName)}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowNewFolder(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Отмена</button>
              <button
                onClick={() => newFolderName && createFolderMut.mutate(newFolderName)}
                disabled={!newFolderName || createFolderMut.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                Создать
              </button>
            </div>
          </div>
        </div>
      )}

      {previewFile && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewFile(null)}
        >
          <div className="relative max-w-5xl max-h-screen">
            <img
              src={previewFile.url}
              alt={previewFile.name}
              className="max-w-full max-h-screen object-contain rounded-lg"
            />
            <button
              onClick={() => setPreviewFile(null)}
              className="absolute top-2 right-2 bg-white/20 hover:bg-white/40 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg"
            >
              ×
            </button>
            <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
              {previewFile.name} · {formatBytes(previewFile.size)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
