/// <reference types="vite/client" />

// File System Access API — not yet in the standard DOM lib (ES2020 target).
// Only the methods actually used in fileSystem.ts are declared here.
interface Window {
  showDirectoryPicker(options?: { mode?: 'read' | 'readwrite' }): Promise<FileSystemDirectoryHandle>;
}

interface FileSystemDirectoryHandle {
  entries(): AsyncIterableIterator<[string, FileSystemHandle & { kind: 'file'; getFile(): Promise<File> }]>;
}

interface FileSystemFileHandle extends FileSystemHandle {
  createWritable(): Promise<FileSystemWritableFileStream>;
}
