import { App, PluginSettingTab, Setting, DropdownComponent } from 'obsidian';
import ImageManagerPlugin from './main';

export interface ImageManagerSettings {
	imageFolder: string;
	thumbnailSize: 'small' | 'medium' | 'large';
	showImageInfo: boolean;
	sortBy: 'name' | 'date' | 'size';
	sortOrder: 'asc' | 'desc';
	autoRefresh: boolean;
}

export const DEFAULT_SETTINGS: ImageManagerSettings = {
	imageFolder: '',
	thumbnailSize: 'medium',
	showImageInfo: true,
	sortBy: 'name',
	sortOrder: 'asc',
	autoRefresh: true
};

export class SettingsTab extends PluginSettingTab {
	plugin: ImageManagerPlugin;

	constructor(app: App, plugin: ImageManagerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: '图片管理插件设置' });

		// 图片文件夹设置
		new Setting(containerEl)
			.setName('图片文件夹')
			.setDesc('指定要扫描的图片文件夹路径（留空则扫描整个库）')
			.addText(text => text
				.setPlaceholder('例如: attachments/images')
				.setValue(this.plugin.settings.imageFolder)
				.onChange(async (value) => {
					this.plugin.settings.imageFolder = value;
					await this.plugin.saveSettings();
				}));

		// 缩略图大小
		new Setting(containerEl)
			.setName('缩略图大小')
			.setDesc('选择图片库视图中缩略图的显示大小')
			.addDropdown(dropdown => dropdown
				.addOption('small', '小 (100px)')
				.addOption('medium', '中 (150px)')
				.addOption('large', '大 (200px)')
				.setValue(this.plugin.settings.thumbnailSize)
				.onChange(async (value: 'small' | 'medium' | 'large') => {
					this.plugin.settings.thumbnailSize = value;
					await this.plugin.saveSettings();
				}));

		// 排序方式
		new Setting(containerEl)
			.setName('默认排序方式')
			.setDesc('选择图片的默认排序方式')
			.addDropdown(dropdown => dropdown
				.addOption('name', '按名称')
				.addOption('date', '按修改日期')
				.addOption('size', '按文件大小')
				.setValue(this.plugin.settings.sortBy)
				.onChange(async (value: 'name' | 'date' | 'size') => {
					this.plugin.settings.sortBy = value;
					await this.plugin.saveSettings();
				}));

		// 排序顺序
		new Setting(containerEl)
			.setName('排序顺序')
			.setDesc('选择升序或降序')
			.addDropdown(dropdown => dropdown
				.addOption('asc', '升序')
				.addOption('desc', '降序')
				.setValue(this.plugin.settings.sortOrder)
				.onChange(async (value: 'asc' | 'desc') => {
					this.plugin.settings.sortOrder = value;
					await this.plugin.saveSettings();
				}));

		// 显示图片信息
		new Setting(containerEl)
			.setName('显示图片信息')
			.setDesc('在图片缩略图下方显示文件名和大小')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showImageInfo)
				.onChange(async (value) => {
					this.plugin.settings.showImageInfo = value;
					await this.plugin.saveSettings();
				}));

		// 自动刷新
		new Setting(containerEl)
			.setName('自动刷新')
			.setDesc('当库中的图片发生变化时自动刷新视图')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoRefresh)
				.onChange(async (value) => {
					this.plugin.settings.autoRefresh = value;
					await this.plugin.saveSettings();
				}));

		// 分隔线
		containerEl.createEl('hr', { cls: 'settings-divider' });

		// 帮助信息
		containerEl.createEl('h3', { text: '快捷命令' });
		containerEl.createEl('p', {
			text: '在命令面板中使用以下命令：',
			cls: 'settings-description'
		});
		containerEl.createEl('ul', { cls: 'settings-list' }).createEl('li', { text: '图片库 - 打开图片库视图' });
		containerEl.createEl('ul', { cls: 'settings-list' }).createEl('li', { text: '查找未引用图片 - 查找未被任何笔记引用的图片' });
	}
}
