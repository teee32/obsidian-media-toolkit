type EventHandler = (...args: any[]) => void;

class MockElement {
	tagName: string;
	className = '';
	textContent = '';
	children: MockElement[] = [];
	attributes: Record<string, string> = {};
	disabled = false;
	title = '';
	value = '';
	parent: MockElement | null = null;
	private listeners: Record<string, EventHandler[]> = {};

	constructor(tagName: string = 'div') {
		this.tagName = tagName.toUpperCase();
	}

	empty(): void {
		this.children = [];
		this.textContent = '';
	}

	addClass(cls: string): void {
		const classes = new Set((this.className || '').split(/\s+/).filter(Boolean));
		classes.add(cls);
		this.className = Array.from(classes).join(' ');
	}

	toggleClass(cls: string, force?: boolean): void {
		const classes = new Set((this.className || '').split(/\s+/).filter(Boolean));
		const shouldHave = typeof force === 'boolean' ? force : !classes.has(cls);
		if (shouldHave) {
			classes.add(cls);
		} else {
			classes.delete(cls);
		}
		this.className = Array.from(classes).join(' ');
	}

	createDiv(options?: any, cb?: (el: MockElement) => void): MockElement {
		const el = this.createEl('div', options);
		if (typeof cb === 'function') {
			cb(el);
		}
		return el;
	}

	createSpan(options?: any): MockElement {
		return this.createEl('span', options);
	}

	createEl(tag: string, options?: any): MockElement {
		const el = new MockElement(tag);
		el.parent = this;
		this.children.push(el);
		this.applyOptions(el, options);
		return el;
	}

	setAttribute(name: string, value: string): void {
		this.attributes[name] = value;
	}

	removeAttribute(name: string): void {
		delete this.attributes[name];
	}

	setCssProps(_props: Record<string, string>): void {
		// no-op for tests
	}

	addEventListener(event: string, handler: EventHandler): void {
		if (!this.listeners[event]) {
			this.listeners[event] = [];
		}
		this.listeners[event].push(handler);
	}

	dispatchEvent(event: string, ...args: any[]): void {
		const handlers = this.listeners[event] || [];
		for (const handler of handlers) {
			handler(...args);
		}
	}

	querySelector(_selector: string): MockElement | null {
		return null;
	}

	private applyOptions(el: MockElement, options?: any): void {
		if (!options) return;
		if (typeof options.cls === 'string') {
			el.className = options.cls;
		}
		if (typeof options.text === 'string') {
			el.textContent = options.text;
		}
		if (typeof options.type === 'string') {
			el.attributes.type = options.type;
		}
		if (options.attr && typeof options.attr === 'object') {
			for (const [k, v] of Object.entries(options.attr)) {
				el.attributes[k] = String(v);
				if (k === 'value') {
					el.value = String(v);
				}
			}
		}
		if (typeof options.value === 'string') {
			el.value = options.value;
		}
	}
}

export class TAbstractFile {
	path: string;
	name: string;

	constructor(path: string = '', name: string = '') {
		this.path = path;
		this.name = name || getNameFromPath(path);
	}
}

export class TFile extends TAbstractFile {
	extension: string;
	stat: { size: number; mtime: number };

	constructor(path: string = '', name: string = '', size: number = 0, mtime: number = Date.now()) {
		super(path, name || getNameFromPath(path));
		this.extension = getExtension(this.name);
		this.stat = { size, mtime };
	}
}

export class TFolder extends TAbstractFile {
	children: TAbstractFile[];

	constructor(path: string = '', name: string = '', children: TAbstractFile[] = []) {
		super(path, name || getNameFromPath(path));
		this.children = children;
	}
}

export class Vault {
	getFiles(): TFile[] {
		return [];
	}
}

export class WorkspaceLeaf {
	app: any;
	view: any;
	viewState: any;

	constructor(app?: any) {
		this.app = app || {};
		this.view = {};
		this.viewState = null;
	}

	async setViewState(state: any): Promise<void> {
		this.viewState = state;
	}

	async openFile(file: TFile): Promise<void> {
		this.view = { file };
	}
}

export class ItemView {
	leaf: WorkspaceLeaf;
	app: any;
	contentEl: MockElement;

	constructor(leaf: WorkspaceLeaf) {
		this.leaf = leaf;
		this.app = leaf?.app || {};
		this.contentEl = new MockElement('div');
	}
}

export class Editor {
	private selection = '';

	getSelection(): string {
		return this.selection;
	}

	setSelection(value: string): void {
		this.selection = value;
	}

	replaceSelection(value: string): void {
		this.selection = value;
	}

	setCursor(_cursor: any): void {
		// no-op
	}

	scrollIntoView(_range: any, _center?: boolean): void {
		// no-op
	}
}

export class MarkdownView {
	editor: Editor;

	constructor() {
		this.editor = new Editor();
	}
}

export class MenuItem {
	title = '';
	icon = '';
	onClickHandler: EventHandler | null = null;

	setTitle(title: string): this {
		this.title = title;
		return this;
	}

	setIcon(icon: string): this {
		this.icon = icon;
		return this;
	}

	onClick(handler: EventHandler): this {
		this.onClickHandler = handler;
		return this;
	}
}

export class Menu {
	items: MenuItem[] = [];

	addItem(cb: (item: MenuItem) => void): void {
		const item = new MenuItem();
		cb(item);
		this.items.push(item);
	}

	addSeparator(): void {
		// no-op
	}

	showAtPosition(_position: { x: number; y: number }): void {
		// no-op
	}
}

export class Notice {
	static messages: string[] = [];
	message: string;

	constructor(message: string = '', _timeout?: number) {
		this.message = message;
		Notice.messages.push(message);
	}

	setMessage(message: string): void {
		this.message = message;
		Notice.messages.push(message);
	}

	hide(): void {
		// no-op
	}
}

export class Modal {
	app: any;
	contentEl: MockElement;
	onClose: () => void = () => {};

	constructor(app: any) {
		this.app = app;
		this.contentEl = new MockElement('div');
	}

	onOpen(): void {
		// no-op
	}

	open(): void {
		this.onOpen();
	}

	close(): void {
		this.onClose();
	}
}

export class ButtonComponent {
	buttonEl: MockElement;
	private clickHandler: EventHandler | null = null;

	constructor(container: any) {
		if (container && typeof container.createEl === 'function') {
			this.buttonEl = container.createEl('button');
		} else {
			this.buttonEl = new MockElement('button');
		}
	}

	setButtonText(text: string): this {
		this.buttonEl.textContent = text;
		return this;
	}

	setCta(): this {
		return this;
	}

	onClick(handler: EventHandler): this {
		this.clickHandler = handler;
		this.buttonEl.addEventListener('click', handler);
		return this;
	}

	triggerClick(): void {
		if (this.clickHandler) {
			this.clickHandler();
		}
	}
}

export class Plugin {
	app: any;
	private data: any = null;

	constructor(app?: any) {
		this.app = app || {};
	}

	registerView(_type: string, _creator: any): void {
		// no-op
	}

	addCommand(_cmd: any): void {
		// no-op
	}

	registerEvent(evtRef: any): any {
		return evtRef;
	}

	addSettingTab(_tab: any): void {
		// no-op
	}

	async loadData(): Promise<any> {
		return this.data;
	}

	async saveData(data: any): Promise<void> {
		this.data = data;
	}
}

export class App {
	vault: any;
	workspace: any;
	metadataCache: any;
	fileManager: any;

	constructor() {
		this.vault = {};
		this.workspace = {};
		this.metadataCache = {};
		this.fileManager = {};
	}
}

export class PluginSettingTab {
	app: App;
	plugin: Plugin;
	containerEl: MockElement;

	constructor(app: App, plugin: Plugin) {
		this.app = app;
		this.plugin = plugin;
		this.containerEl = new MockElement('div');
	}

	display(): void {
		// no-op
	}
}

export class Setting {
	constructor(_containerEl: any) {
		// no-op
	}

	setName(_name: string): this {
		return this;
	}

	setDesc(_desc: string): this {
		return this;
	}

	addText(cb: (component: any) => void): this {
		cb(createInputComponent());
		return this;
	}

	addTextArea(cb: (component: any) => void): this {
		cb(createInputComponent());
		return this;
	}

	addToggle(cb: (component: any) => void): this {
		cb(createToggleComponent());
		return this;
	}

	addDropdown(cb: (component: any) => void): this {
		cb(createDropdownComponent());
		return this;
	}

	addSlider(cb: (component: any) => void): this {
		cb(createSliderComponent());
		return this;
	}

	addButton(cb: (component: any) => void): this {
		cb({
			setButtonText: () => this,
			setCta: () => this,
			onClick: () => this
		});
		return this;
	}
}

export function setIcon(_el: any, _icon: string): void {
	// no-op
}

export function parseLinktext(linktext: string): { path: string; subpath: string } {
	const hashIndex = linktext.indexOf('#');
	if (hashIndex === -1) {
		return { path: linktext.trim(), subpath: '' };
	}
	return {
		path: linktext.slice(0, hashIndex).trim(),
		subpath: linktext.slice(hashIndex)
	};
}

function createInputComponent(): any {
	return {
		inputEl: { style: {} },
		setPlaceholder: () => createInputComponent(),
		setValue: () => createInputComponent(),
		onChange: () => createInputComponent()
	};
}

function createToggleComponent(): any {
	return {
		setValue: () => createToggleComponent(),
		onChange: () => createToggleComponent()
	};
}

function createDropdownComponent(): any {
	return {
		addOption: () => createDropdownComponent(),
		setValue: () => createDropdownComponent(),
		onChange: () => createDropdownComponent()
	};
}

function createSliderComponent(): any {
	return {
		setLimits: () => createSliderComponent(),
		setValue: () => createSliderComponent(),
		setDynamicTooltip: () => createSliderComponent(),
		onChange: () => createSliderComponent()
	};
}

function getNameFromPath(path: string): string {
	const normalized = String(path || '').replace(/\\/g, '/');
	const idx = normalized.lastIndexOf('/');
	return idx === -1 ? normalized : normalized.slice(idx + 1);
}

function getExtension(name: string): string {
	const idx = name.lastIndexOf('.');
	return idx === -1 ? '' : name.slice(idx + 1);
}
