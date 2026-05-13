import type { FaceTextureConfig } from './renderTexture';
import type {
  VoxelBlockFace,
  VoxelRenderStyle,
  VoxelBlockSideMode,
  SideTransitionPattern,
} from './textureGenerators';

export interface VoxelCraftProject {
  version: 1;
  name: string;
  createdAt: string;
  thumbnail?: string;
  editorMode: 'texture' | 'voxel';
  faces: {
    top: string | null;
    side: string | null;
    bottom: string | null;
  };
  textureConfigs?: {
    top: FaceTextureConfig | null;
    side: FaceTextureConfig | null;
    bottom: FaceTextureConfig | null;
  };
  voxelConfigs?: {
    resolution: number;
    seed: number;
    renderStyle: VoxelRenderStyle;
    sideMode: VoxelBlockSideMode;
    sideSplitPos: number;
    transitionPattern: SideTransitionPattern;
    transitionNoise: number;
    top: VoxelBlockFace;
    side: VoxelBlockFace;
    bottom: VoxelBlockFace;
    sideTopFace: VoxelBlockFace;
  };
  snow?: {
    enabled: boolean;
    depth: number;
    color1: string;
    color2: string;
    seed: number;
  };
}

export interface ProjectListEntry {
  filename: string;
  name: string;
  createdAt: string;
  thumbnail?: string;
}

const FILE_EXT = '.voxelcraft';

export function supportsFileSystemAccess(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

export async function openProjectFolder(): Promise<FileSystemDirectoryHandle | null> {
  if (!supportsFileSystemAccess()) return null;
  try {
    return await window.showDirectoryPicker({ mode: 'readwrite' });
  } catch {
    return null;
  }
}

export async function listProjects(handle: FileSystemDirectoryHandle): Promise<ProjectListEntry[]> {
  const entries: ProjectListEntry[] = [];
  for await (const [name, entry] of handle.entries()) {
    if (entry.kind === 'file' && name.endsWith(FILE_EXT)) {
      try {
        const file: File = await entry.getFile();
        const text = await file.text();
        const proj: VoxelCraftProject = JSON.parse(text);
        entries.push({
          filename: name,
          name: proj.name,
          createdAt: proj.createdAt,
          thumbnail: proj.thumbnail,
        });
      } catch { /* skip corrupt files */ }
    }
  }
  entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return entries;
}

export async function saveProjectToFolder(
  handle: FileSystemDirectoryHandle,
  project: VoxelCraftProject,
): Promise<string> {
  const safeName = project.name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 60);
  const filename = `${safeName}${FILE_EXT}`;
  const fileHandle = await handle.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(JSON.stringify(project));
  await writable.close();
  return filename;
}

function migrateProject(raw: unknown): VoxelCraftProject {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Invalid project file: not an object');
  }
  const obj = raw as Record<string, unknown>;
  // Future versions: add migration steps here before the version check.
  // e.g. if (!obj.version) { /* migrate v0 → v1 */ obj.version = 1; }
  if (obj.version !== 1) {
    throw new Error(`Unsupported project version: ${obj.version}`);
  }
  return obj as unknown as VoxelCraftProject;
}

export async function loadProjectFromFolder(
  handle: FileSystemDirectoryHandle,
  filename: string,
): Promise<VoxelCraftProject> {
  const fileHandle = await handle.getFileHandle(filename);
  const file = await fileHandle.getFile();
  const text = await file.text();
  return migrateProject(JSON.parse(text));
}

export async function deleteProjectFromFolder(
  handle: FileSystemDirectoryHandle,
  filename: string,
): Promise<void> {
  await handle.removeEntry(filename);
}

// Fallback: download as JSON file
export function downloadProject(project: VoxelCraftProject): void {
  const json = JSON.stringify(project);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = project.name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 60);
  a.href = url;
  a.download = `${safeName}${FILE_EXT}`;
  a.click();
  URL.revokeObjectURL(url);
}

// Fallback: upload JSON file via file input
export function uploadProject(): Promise<VoxelCraftProject | null> {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = FILE_EXT + ',.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }
      const reader = new FileReader();
      reader.onload = () => {
        try {
          resolve(migrateProject(JSON.parse(reader.result as string)));
        } catch { resolve(null); }
      };
      reader.readAsText(file);
    };
    input.click();
  });
}
