import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TFile, TFolder, WorkspaceLeaf } from 'obsidian';
import { ImageLibraryView } from '../view/ImageLibraryView';
import { TrashManagementView } from '../view/TrashManagementView';
import { UnreferencedImagesView } from '../view/UnreferencedImagesView';
import { updateLinksInVault } from '../utils/linkUpdater';

function makeFile(path: string, size: number = 1024, mtime: number = Date.now()): any {
	return new (TFile as any)(path, '', size, mtime);
}

function makeFolder(path: string, children: any[]): any {
	return new (TFolder as any)(path, '', children);
}

function makeLeaf(app: any): WorkspaceLeaf {
	const leaf = new (WorkspaceLeaf as any)();
	(leaf as any).app = app;
	return leaf as WorkspaceLeaf;
}

function makePlugin(overrides: Record<string, any> = {}): any {
	return {
		settings: {
			pageSize: 50,
			thumbnailSize: 'medium',
			imageFolder: '',
			sortBy: 'name',
			sortOrder: 'asc',
			trashFolder: 'trash',
			safeScanEnabled: true,
			safeScanUnrefDays: 30,
			safeScanMinSize: 0,
			...overrides.settings
		},
		fileIndex: overrides.fileIndex || { isInitialized: false, getFiles: () => [] },
		t: (key: string) => key,
		...overrides
	};
}

describe('regression: media library open/refresh', () => {
	it('loads from index when file index is initialized', async () => {
		const indexedFile = makeFile('media/indexed.png', 200);
		const pathMap = new Map<string, any>([[indexedFile.path, indexedFile]]);

		const app = {
			vault: {
				getAbstractFileByPath: (path: string) => pathMap.get(path) || null
			}
		};

		const plugin = makePlugin({
			fileIndex: {
				isInitialized: true,
				getFiles: () => [{ path: indexedFile.path }]
			},
			getAllImageFiles: vi.fn(() => [])
		});

		const view = new ImageLibraryView(makeLeaf(app), plugin);
		(view as any).renderHeader = vi.fn();
		(view as any).renderSearchBox = vi.fn();
		(view as any).renderSelectionToolbar = vi.fn();
		(view as any).renderPagination = vi.fn();
		(view as any).renderImageItem = vi.fn();

		await view.refreshImages();

		expect(plugin.getAllImageFiles).not.toHaveBeenCalled();
		expect(view.images.map(item => item.path)).toEqual(['media/indexed.png']);
	});

	it('falls back to full scan when file index is not initialized', async () => {
		const scannedFile = makeFile('media/scanned.png', 100);
		const app = {
			vault: {
				getAbstractFileByPath: vi.fn(() => null)
			}
		};

		const plugin = makePlugin({
			fileIndex: {
				isInitialized: false,
				getFiles: vi.fn(() => [])
			},
			getAllImageFiles: vi.fn(() => [scannedFile])
		});

		const view = new ImageLibraryView(makeLeaf(app), plugin);
		(view as any).renderHeader = vi.fn();
		(view as any).renderSearchBox = vi.fn();
		(view as any).renderSelectionToolbar = vi.fn();
		(view as any).renderPagination = vi.fn();
		(view as any).renderImageItem = vi.fn();

		await view.refreshImages();

		expect(plugin.getAllImageFiles).toHaveBeenCalledTimes(1);
		expect(view.images.map(item => item.path)).toEqual(['media/scanned.png']);
	});
});

describe('regression: trash management view', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('opens and refreshes trash list', async () => {
		const trashed = makeFile('trash/123__attachments%2Fa.png', 500);
		const trashFolder = makeFolder('trash', [trashed]);
		const app = {
			vault: {
				getAbstractFileByPath: (path: string) => (path === 'trash' ? trashFolder : null),
				getMarkdownFiles: () => []
			},
			metadataCache: {
				getFileCache: () => null
			},
			fileManager: {
				trashFile: vi.fn(async () => {})
			}
		};

		const plugin = makePlugin({ app });
		const view = new TrashManagementView(makeLeaf(app), plugin);
		(view as any).renderView = vi.fn();

		await view.onOpen();
		await view.loadTrashItems();

		expect(view.trashItems).toHaveLength(1);
		expect(view.trashItems[0].originalPath).toBe('attachments/a.png');
	});

	it('safe scan can quarantine matched files', async () => {
		const old = Date.now() - 60 * 24 * 60 * 60 * 1000;
		const candidate = makeFile('media/candidate.png', 10_000, old);
		const referenced = makeFile('media/referenced.png', 10_000, old);

		const fileMap = new Map<string, any>([
			[candidate.path, candidate],
			[referenced.path, referenced]
		]);

		const app = {
			vault: {
				getAbstractFileByPath: (path: string) => fileMap.get(path) || null,
				getMarkdownFiles: () => []
			},
			metadataCache: {
				getFileCache: () => null
			},
			fileManager: {
				trashFile: vi.fn(async () => {})
			}
		};

		const plugin = makePlugin({
			app,
			settings: {
				trashFolder: 'trash',
				safeScanEnabled: true,
				safeScanUnrefDays: 30,
				safeScanMinSize: 1024
			},
			getReferencedImages: vi.fn(async () => new Set(['media/referenced.png'])),
			safeDeleteFile: vi.fn(async () => true),
			fileIndex: {
				isInitialized: true,
				getFiles: () => [{ path: candidate.path }, { path: referenced.path }]
			}
		});

		const view = new TrashManagementView(makeLeaf(app), plugin);
		(view as any).showConfirmModal = vi.fn(async () => true);
		(view as any).loadTrashItems = vi.fn(async () => {});

		await view.runSafeScan();

		expect(plugin.safeDeleteFile).toHaveBeenCalledTimes(1);
		expect(plugin.safeDeleteFile).toHaveBeenCalledWith(candidate);
		expect((view as any).loadTrashItems).toHaveBeenCalledTimes(1);
	});

	it('supports batch restore, batch delete and clear all', async () => {
		const rawA = makeFile('trash/1__attachments%2Fa.png');
		const rawB = makeFile('trash/2__attachments%2Fb.png');
		const rawC = makeFile('trash/3__attachments%2Fc.png');
		const app = {
			fileManager: {
				trashFile: vi.fn(async () => {})
			}
		};

		const plugin = makePlugin({
			app,
			restoreFile: vi.fn(async () => true)
		});

		const view = new TrashManagementView(makeLeaf(app), plugin);
		(view as any).showConfirmModal = vi.fn(async () => true);
		(view as any).loadTrashItems = vi.fn(async () => {});

		view.trashItems = [
			{
				file: rawA,
				path: rawA.path,
				rawName: rawA.name,
				name: 'a.png',
				size: 1,
				modified: 1,
				originalPath: 'attachments/a.png',
				referenceCount: 0,
				selected: true
			},
			{
				file: rawB,
				path: rawB.path,
				rawName: rawB.name,
				name: 'b.png',
				size: 1,
				modified: 1,
				originalPath: 'attachments/b.png',
				referenceCount: 0,
				selected: true
			},
			{
				file: rawC,
				path: rawC.path,
				rawName: rawC.name,
				name: 'c.png',
				size: 1,
				modified: 1,
				originalPath: 'attachments/c.png',
				referenceCount: 0,
				selected: false
			}
		];

		await view.batchRestore();
		expect(plugin.restoreFile).toHaveBeenCalledTimes(2);

		await view.batchDelete();
		expect(app.fileManager.trashFile).toHaveBeenCalledTimes(2);

		await view.confirmClearAll();
		expect(app.fileManager.trashFile).toHaveBeenCalledTimes(5);
	});
});

describe('regression: unreferenced media scan', () => {
	it('scans and sorts by size descending', async () => {
		const files = [
			makeFile('media/small.png', 100),
			makeFile('media/large.png', 5000),
			makeFile('media/mid.png', 800)
		];

		const app = {};
		const plugin = makePlugin({
			findUnreferenced: vi.fn(async () => files)
		});
		const view = new UnreferencedImagesView(makeLeaf(app), plugin);
		(view as any).renderView = vi.fn();

		await view.scanUnreferencedImages();

		expect(plugin.findUnreferenced).toHaveBeenCalledTimes(1);
		expect(view.unreferencedImages.map(item => item.path)).toEqual([
			'media/large.png',
			'media/mid.png',
			'media/small.png'
		]);
	});
});

describe('regression: same-name wiki basename rewrite after isolate/move', () => {
	it('rewrites basename wiki links to vault path when target name is ambiguous', async () => {
		const oldPath = 'dup/a/photo.png';
		const newPath = 'dup/b/photo.png';
		const otherPath = 'dup/c/photo.png';

		const newFile = makeFile(newPath);
		const otherFile = makeFile(otherPath);
		const oldFile = makeFile(oldPath);
		const note1 = makeFile('notes/should-update.md');
		const note2 = makeFile('notes/keep-other.md');

		const filesByPath = new Map<string, any>([
			[oldPath, oldFile],
			[newPath, newFile],
			[otherPath, otherFile],
			[note1.path, note1],
			[note2.path, note2]
		]);

		const contentMap: Record<string, string> = {
			[note1.path]: '![[photo.png|alias]]\n',
			[note2.path]: '![[photo.png]]\n'
		};

		const app = {
			vault: {
				getAbstractFileByPath: (path: string) => filesByPath.get(path) || null,
				getMarkdownFiles: () => [note1, note2],
				getFiles: () => [oldFile, newFile, otherFile, note1, note2],
				process: async (file: any, updater: (content: string) => string) => {
					contentMap[file.path] = updater(contentMap[file.path]);
				}
			},
			metadataCache: {
				getFirstLinkpathDest: (linkPath: string, sourcePath: string) => {
					if (linkPath !== 'photo.png') {
						return null;
					}
					if (sourcePath === note1.path) {
						return { path: oldPath };
					}
					if (sourcePath === note2.path) {
						return { path: otherPath };
					}
					return null;
				}
			}
		};

		const updated = await updateLinksInVault(app as any, oldPath, newPath);

		expect(updated).toBe(1);
		expect(contentMap[note1.path]).toBe('![[dup/b/photo.png|alias]]\n');
		expect(contentMap[note2.path]).toBe('![[photo.png]]\n');
	});
});
