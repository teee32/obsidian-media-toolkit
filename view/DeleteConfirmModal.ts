import { App, Modal, Notice, TFile } from 'obsidian';
import ImageManagerPlugin from '../main';
import { formatFileSize } from '../utils/format';

export interface DeleteTarget {
	file: TFile;
	path: string;
	name: string;
	size: number;
	modified: number;
}

export class DeleteConfirmModal extends Modal {
	plugin: ImageManagerPlugin;
	images: DeleteTarget[];
	onConfirm: () => Promise<void>;
	private isDeleting: boolean = false;

	constructor(
		app: App,
		plugin: ImageManagerPlugin,
		images: DeleteTarget[],
		onConfirm: () => Promise<void>
	) {
		super(app);
		this.plugin = plugin;
		this.images = images;
		this.onConfirm = onConfirm;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		// 使用翻译函数
		const t = (key: string) => this.plugin.t(key);

		// 标题
		contentEl.createEl('h2', {
			text: this.images.length === 1
				? t('confirmDeleteFile').replace('{name}', this.images[0].name)
				: t('confirmDeleteSelected').replace('{count}', String(this.images.length))
		});

		// 警告信息
		const warning = contentEl.createDiv({ cls: 'modal-warning' });
		warning.createEl('p', {
			cls: 'delete-confirm-warning',
			text: this.plugin.settings.useTrashFolder
				? t('deleteToTrash')
				: t('confirmClearAll')
		});

		// 文件列表
		const listContainer = contentEl.createDiv({ cls: 'modal-file-list' });
		listContainer.createEl('h3', { text: t('deleteToTrash') });

		const list = listContainer.createEl('ul');
		const maxShow = 10;
		for (let i = 0; i < Math.min(this.images.length, maxShow); i++) {
			const img = this.images[i];
			list.createEl('li', {
				text: `${img.name} (${formatFileSize(img.size)})`
			});
		}
		if (this.images.length > maxShow) {
			list.createEl('li', {
				text: `... ${this.images.length - maxShow} ${t('filesScanned')}`
			});
		}

		// 按钮区域
		const buttonContainer = contentEl.createDiv({ cls: 'modal-buttons delete-confirm-buttons' });

		// 取消按钮
		const cancelBtn = buttonContainer.createEl('button', {
			text: t('cancel'),
			cls: 'mod-cta'
		});
		cancelBtn.addEventListener('click', () => this.close());

		// 删除按钮
		const deleteBtn = buttonContainer.createEl('button', {
			text: this.plugin.settings.useTrashFolder ? t('deleteToTrash') : t('delete'),
			cls: 'mod-warning'
		});
		deleteBtn.addEventListener('click', () => {
			void this.handleDelete(deleteBtn, t);
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

	private async handleDelete(deleteBtn: HTMLButtonElement, t: (key: string) => string): Promise<void> {
		if (this.isDeleting) return;
		this.isDeleting = true;
		deleteBtn.setAttribute('disabled', 'true');
		deleteBtn.textContent = t('processing') || '处理中...';

		try {
			await this.onConfirm();
			this.close();
		} catch (error) {
			console.error('删除操作失败:', error);
			new Notice(t('deleteFailed'));
			this.isDeleting = false;
			deleteBtn.removeAttribute('disabled');
			deleteBtn.textContent = this.plugin.settings.useTrashFolder ? t('deleteToTrash') : t('delete');
		}
	}
}
