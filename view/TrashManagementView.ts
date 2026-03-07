import { TFile, TFolder, ItemView, WorkspaceLeaf, setIcon, Menu, MenuItem, Notice, Modal, ButtonComponent } from 'obsidian';
import ImageManagerPlugin from '../main';
import { formatFileSize } from '../utils/format';
import { getMediaType } from '../utils/mediaTypes';
import { isPathSafe } from '../utils/security';
import { getFileNameFromPath, getParentPath, normalizeVaultPath, safeDecodeURIComponent } from '../utils/path';

export const VIEW_TYPE_TRASH_MANAGEMENT = 'trash-management-view';

interface TrashItem {
	file: TFile;
	path: string;
	rawName: string;
	name: string;
	size: number;
	modified: number;
	originalPath?: string;  // 从隔离文件夹名字中提取的原始路径
}

export class TrashManagementView extends ItemView {
	plugin: ImageManagerPlugin;
	trashItems: TrashItem[] = [];
	private isLoading: boolean = false;

	constructor(leaf: WorkspaceLeaf, plugin: ImageManagerPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType() {
		return VIEW_TYPE_TRASH_MANAGEMENT;
	}

	getDisplayText() {
		return this.plugin.t('trashManagement');
	}

	async onOpen() {
		// 等待 contentEl 准备好
		let retries = 0;
		while (!this.contentEl && retries < 10) {
			await new Promise(resolve => setTimeout(resolve, 50));
			retries++;
		}
		if (!this.contentEl) {
			console.error('TrashManagementView: contentEl not ready');
			return;
		}
		this.contentEl.addClass('trash-management-view');
		await this.loadTrashItems();
	}

	async onClose() {
		// 清理工作
	}

	/**
	 * 加载隔离文件夹中的文件
	 */
	async loadTrashItems() {
		// 如果视图已关闭或 contentEl 不可用，直接返回
		if (!this.contentEl) {
			return;
		}

		if (this.isLoading) return;
		this.isLoading = true;
		this.contentEl.empty();

		// 显示加载状态
		const loading = this.contentEl.createDiv({ cls: 'loading-state' });
		loading.createEl('div', { cls: 'spinner' });
		loading.createDiv({ text: this.plugin.t('loadingTrashFiles') });

		try {
			const trashPath = normalizeVaultPath(this.plugin.settings.trashFolder);

			if (!trashPath || !isPathSafe(trashPath)) {
				this.trashItems = [];
				await this.renderView();
				return;
			}

			const trashFolder = this.plugin.app.vault.getAbstractFileByPath(trashPath);

			if (!trashFolder || !(trashFolder instanceof TFolder)) {
				this.trashItems = [];
				await this.renderView();
				return;
			}

			// 获取隔离文件夹中的所有文件
			this.trashItems = [];
			for (const file of trashFolder.children) {
				if (file instanceof TFile) {
					const originalPath = this.extractOriginalPath(file.name);
					const displayName = originalPath ? getFileNameFromPath(originalPath) || file.name : file.name;

					this.trashItems.push({
						file,
						path: file.path,
						rawName: file.name,
						name: displayName,
						size: file.stat.size,
						modified: file.stat.mtime,
						originalPath
					});
				}
			}

			// 按修改时间排序（最新的在前）
			this.trashItems.sort((a, b) => b.modified - a.modified);

			await this.renderView();
		} catch (error) {
			console.error('加载隔离文件失败:', error);
			this.contentEl.createDiv({
				cls: 'error-state',
				text: this.plugin.t('error')
			});
		} finally {
			this.isLoading = false;
		}
	}

	/**
	 * 从隔离文件名中提取原始路径
	 * 新格式: timestamp__encodeURIComponent(originalPath)
	 * 旧格式: timestamp__filename.ext
	 */
	private extractOriginalPath(fileName: string): string | undefined {
		const separatorIndex = fileName.indexOf('__');
		if (separatorIndex === -1) {
			return undefined;
		}

		const encodedPart = fileName.substring(separatorIndex + 2);
		if (!encodedPart) {
			return undefined;
		}

		const decoded = normalizeVaultPath(safeDecodeURIComponent(encodedPart));
		return decoded || undefined;
	}

	/**
	 * 渲染视图
	 */
	async renderView() {
		// 如果视图已关闭或 contentEl 不可用，直接返回
		if (!this.contentEl) {
			return;
		}

		this.contentEl.empty();

		// 创建头部
		this.renderHeader();

		if (this.trashItems.length === 0) {
			this.contentEl.createDiv({
				cls: 'empty-state',
				text: this.plugin.t('trashFolderEmpty')
			});
			return;
		}

		// 创建统计信息
		const stats = this.contentEl.createDiv({ cls: 'stats-bar' });
		stats.createSpan({
			text: this.plugin.t('filesInTrash').replace('{count}', String(this.trashItems.length)),
			cls: 'stats-count'
		});

		const totalSize = this.trashItems.reduce((sum, item) => sum + item.size, 0);
		stats.createSpan({
			text: this.plugin.t('totalSize').replace('{size}', formatFileSize(totalSize)),
			cls: 'stats-size'
		});

		// 创建文件列表
		const list = this.contentEl.createDiv({ cls: 'trash-list' });

		for (const item of this.trashItems) {
			this.renderTrashItem(list, item);
		}
	}

	/**
	 * 渲染头部
	 */
	renderHeader() {
		const header = this.contentEl.createDiv({ cls: 'trash-header' });

		header.createEl('h2', { text: this.plugin.t('trashManagement') });

		const desc = header.createDiv({ cls: 'header-description' });
		desc.createSpan({ text: this.plugin.t('trashManagementDesc') });

		// 刷新按钮
		const refreshBtn = header.createEl('button', { cls: 'refresh-button' });
		setIcon(refreshBtn, 'refresh-cw');
		refreshBtn.addEventListener('click', () => this.loadTrashItems());
		refreshBtn.title = this.plugin.t('refresh');

		// 操作按钮
		const actions = header.createDiv({ cls: 'header-actions' });

		// 清空隔离文件夹按钮
		const clearAllBtn = actions.createEl('button', { cls: 'action-button danger' });
		setIcon(clearAllBtn, 'trash-2');
		clearAllBtn.addEventListener('click', () => this.confirmClearAll());
		clearAllBtn.title = this.plugin.t('clearTrashTooltip');
	}

	/**
	 * 渲染单个隔离文件项
	 */
	renderTrashItem(container: HTMLElement, item: TrashItem) {
		const itemEl = container.createDiv({ cls: 'trash-item' });

		// 文件图标
		const icon = itemEl.createDiv({ cls: 'item-icon' });
		const ext = item.name.split('.').pop()?.toLowerCase() || '';
		setIcon(icon, this.getFileIcon(ext));

		// 文件信息
		const info = itemEl.createDiv({ cls: 'item-info' });
		info.createDiv({ cls: 'item-name', text: item.name });
		if (item.originalPath) {
			info.createDiv({ cls: 'item-original-path', text: `${this.plugin.t('originalPath')}: ${item.originalPath}` });
		}
		info.createDiv({ cls: 'item-size', text: formatFileSize(item.size) });
		info.createDiv({ cls: 'item-date', text: `${this.plugin.t('deletedTime')}: ${new Date(item.modified).toLocaleString()}` });

		// 操作按钮
		const actions = itemEl.createDiv({ cls: 'item-actions' });

		// 恢复按钮
		const restoreBtn = actions.createEl('button', { cls: 'item-button success' });
		setIcon(restoreBtn, 'rotate-ccw');
		restoreBtn.addEventListener('click', () => this.restoreFile(item));
		restoreBtn.title = this.plugin.t('restoreTooltip');

		// 彻底删除按钮
		const deleteBtn = actions.createEl('button', { cls: 'item-button danger' });
		setIcon(deleteBtn, 'trash-2');
		deleteBtn.addEventListener('click', () => this.confirmDelete(item));
		deleteBtn.title = this.plugin.t('permanentDeleteTooltip');

		// 右键菜单
		itemEl.addEventListener('contextmenu', (e) => {
			e.preventDefault();
			this.showContextMenu(e as MouseEvent, item);
		});
	}

	/**
	 * 显示右键菜单
	 */
	showContextMenu(event: MouseEvent, trashItem: TrashItem) {
		const menu = new Menu();

		menu.addItem((menuItem: MenuItem) => {
			menuItem.setTitle(this.plugin.t('restore'))
				.setIcon('rotate-ccw')
				.onClick(() => this.restoreFile(trashItem));
		});

		menu.addItem((menuItem: MenuItem) => {
			menuItem.setTitle(this.plugin.t('permanentDelete'))
				.setIcon('trash-2')
				.onClick(() => this.confirmDelete(trashItem));
		});

		menu.addSeparator();

		menu.addItem((menuItem: MenuItem) => {
			menuItem.setTitle(this.plugin.t('copiedFileName'))
				.setIcon('copy')
				.onClick(() => {
					void navigator.clipboard.writeText(trashItem.name).then(() => {
						new Notice(this.plugin.t('fileNameCopied'));
					}).catch((error) => {
						console.error('复制到剪贴板失败:', error);
						new Notice(this.plugin.t('error'));
					});
				});
		});

		menu.addItem((menuItem: MenuItem) => {
			menuItem.setTitle(this.plugin.t('copiedOriginalPath'))
				.setIcon('link')
				.onClick(() => {
					if (trashItem.originalPath) {
						void navigator.clipboard.writeText(trashItem.originalPath).then(() => {
							new Notice(this.plugin.t('originalPathCopied'));
						}).catch((error) => {
							console.error('复制到剪贴板失败:', error);
							new Notice(this.plugin.t('error'));
						});
					}
				});
		});

		menu.showAtPosition({ x: event.clientX, y: event.clientY });
	}

	/**
	 * 恢复文件
	 */
	async restoreFile(item: TrashItem) {
		try {
			// 如果 originalPath 存在，使用它
			// 如果 originalPath 为空，说明文件名没有被修改（不含时间戳前缀），应该使用原文件名
			let targetPath = normalizeVaultPath(item.originalPath || '');
			if (!targetPath) {
				// 从隔离文件名中提取原始文件名（去掉时间戳前缀）
				const separatorIndex = item.rawName.indexOf('__');
				if (separatorIndex !== -1) {
					targetPath = normalizeVaultPath(
						safeDecodeURIComponent(item.rawName.substring(separatorIndex + 2))
					);
				} else {
					// 完全没有时间戳前缀，直接使用原文件名
					targetPath = normalizeVaultPath(item.rawName);
				}
			}

			if (!isPathSafe(targetPath)) {
				new Notice(this.plugin.t('restoreFailed').replace('{message}', 'Invalid path'));
				return;
			}

			// 检查目标路径是否已存在同名文件
			const targetFile = this.plugin.app.vault.getAbstractFileByPath(targetPath);
			if (targetFile) {
				new Notice(this.plugin.t('restoreFailed').replace('{message}', this.plugin.t('targetFileExists')));
				return;
			}

			// 检查父目录是否存在
			const parentPath = getParentPath(targetPath);
			if (parentPath) {
				const parentFolder = this.plugin.app.vault.getAbstractFileByPath(parentPath);
				if (!parentFolder) {
					new Notice(this.plugin.t('restoreFailed').replace('{message}', 'Parent directory does not exist'));
					return;
				}
				if (!(parentFolder instanceof TFolder)) {
					new Notice(this.plugin.t('restoreFailed').replace('{message}', 'Parent path is not a directory'));
					return;
				}
			}

			await this.plugin.app.vault.rename(item.file, targetPath);
			new Notice(this.plugin.t('restoreSuccess').replace('{name}', item.name));

			// 从列表中移除
			this.trashItems = this.trashItems.filter(i => i.file.path !== item.file.path);
			await this.renderView();
		} catch (error) {
			console.error('恢复文件失败:', error);
			new Notice(this.plugin.t('restoreFailed').replace('{message}', (error as Error).message));
		}
	}

	/**
	 * 显示国际化确认对话框
	 */
	private showConfirmModal(message: string): Promise<boolean> {
		return new Promise((resolve) => {
			const modal = new Modal(this.plugin.app);
			let resolved = false;

			modal.onClose = () => {
				if (!resolved) {
					resolved = true;
					resolve(false);
				}
			};

			modal.contentEl.createDiv({ cls: 'confirm-modal-content' }, (el) => {
				el.createDiv({ text: message, cls: 'confirm-modal-message' });
				el.createDiv({ cls: 'confirm-modal-buttons' }, (buttonsEl) => {
					const cancelBtn = new ButtonComponent(buttonsEl);
					cancelBtn.setButtonText(this.plugin.t('cancel'));
					cancelBtn.onClick(() => {
						resolved = true;
						modal.close();
						resolve(false);
					});

					const confirmBtn = new ButtonComponent(buttonsEl);
					confirmBtn.setButtonText(this.plugin.t('confirm'));
					confirmBtn.setCta();
					confirmBtn.onClick(() => {
						resolved = true;
						modal.close();
						resolve(true);
					});
				});
			});

			modal.open();
		});
	}

	/**
	 * 确认删除单个文件
	 */
	async confirmDelete(item: TrashItem) {
		const confirmed = await this.showConfirmModal(
			this.plugin.t('confirmDeleteFile').replace('{name}', item.name)
		);

		if (confirmed) {
			try {
				await this.plugin.app.vault.delete(item.file);
				new Notice(this.plugin.t('fileDeleted').replace('{name}', item.name));

				// 从列表中移除
				this.trashItems = this.trashItems.filter(i => i.file.path !== item.file.path);
				await this.renderView();
			} catch (error) {
				console.error('删除文件失败:', error);
				new Notice(this.plugin.t('deleteFailed'));
			}
		}
	}

	/**
	 * 确认清空所有文件
	 */
	async confirmClearAll() {
		if (this.trashItems.length === 0) {
			new Notice(this.plugin.t('trashEmpty'));
			return;
		}

		const confirmed = await this.showConfirmModal(
			this.plugin.t('confirmClearTrash').replace('{count}', String(this.trashItems.length))
		);

		if (confirmed) {
			// 使用 Promise.all 并发处理删除
			const results = await Promise.all(
				this.trashItems.map(item => {
					try {
						return this.plugin.app.vault.delete(item.file).then(() => true).catch(() => false);
					} catch {
						return Promise.resolve(false);
					}
				})
			);

			// 统计成功和失败的数量
			const deleted = results.filter(r => r).length;
			const errors = results.filter(r => !r).length;

			if (deleted > 0) {
				new Notice(this.plugin.t('batchDeleteComplete').replace('{count}', String(deleted)));
			}
			if (errors > 0) {
				new Notice(this.plugin.t('batchDeleteComplete').replace('{count}', String(errors)) + ' (' + this.plugin.t('error') + ')');
			}

			await this.loadTrashItems();
		}
	}

	/**
	 * 获取文件图标
	 */
	private getFileIcon(ext: string): string {
		// 使用 mediaTypes 中的 getMediaType 获取媒体类型
		const mediaType = getMediaType(`filename.${ext}`);

		switch (mediaType) {
			case 'image':
				return 'image';
			case 'video':
				return 'video';
			case 'audio':
				return 'music';
			case 'document':
				return 'file-text';
			default:
				return 'file';
		}
	}
}

// 已移除 formatFileSize 方法，使用 utils/format.ts 中的实现
