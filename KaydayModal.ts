import { App, Modal, TAbstractFile, TFile, TFolder, setIcon } from 'obsidian';

type KaydayTask = {
	file: TFile;
	title: string;
	context: string;
	repeat: boolean;
}
type KaydayContext = {
	value: string;
	text: string;
	active: boolean;
}

export default class KaydayModal extends Modal {
	private tasks: KaydayTask[] = []
	private contexts: KaydayContext[] = []
	private selectedContext = '';

	private divTasks: HTMLDivElement | null = null;
	private divFilter: HTMLDivElement | null = null;

	constructor(app: App) {
		super(app);
	}

	onOpen() {
		this.titleEl.setText('Kayday');
		this.collectData(this.app);
		this.renderUi();
		this.renderFilter();
		this.renderTasks();
	}

	onClose() {
		this.contentEl.empty();
	}

	renderUi() {
		console.log('Building UI...');
		this.contentEl.empty();
		this.divTasks = this.contentEl.createDiv({cls: 'kayday-container-tasks'});
		this.divFilter = this.contentEl.createDiv({cls: 'kayday-container-filter'});
		this.contentEl.appendChild(this.divFilter);
		this.contentEl.appendChild(this.divTasks);
	}

	renderFilter() {
		if(!this.divFilter) return;
		this.divFilter.empty();
		const contextSelect = this.divFilter.createEl('select');
		contextSelect.createEl('option', {value: '', text: 'all contexts'});
		this.contexts.forEach(context => {
			if(!context.value) return; // skip empty context
			contextSelect.createEl('option', {value: context.value, text: context.text});
		});
		// this.divFilter.appendChild(contextSelect);
		contextSelect.onchange = (e) => {
			this.selectedContext = (e.target as HTMLSelectElement).value;
			console.log('Selected context:', this.selectedContext);
			this.renderTasks();
		}
	}

	renderTasks() {
		if(!this.divTasks) return;
		this.divTasks.empty();
		const divTasks = this.divTasks

		const tasksToRender = this.selectedContext ? this.tasks.filter(task => task.context === this.selectedContext) : this.tasks;
		tasksToRender.forEach(task => {
			const taskDiv = divTasks.createEl('div', {cls: 'kayday-task-item'});
			
			// Add task icon
			const taskIcon = taskDiv.createEl('span', {cls: 'kayday-task-icon'});
			// Use different icons based on task properties
			const iconName = task.repeat ? 'refresh-cw' : 'check-square';
			setIcon(taskIcon, iconName);
			
			// Add task title
			taskDiv.createEl('span', {text: task.title, cls: 'kayday-task-title'});
			
			// Add context badge if it exists
			if (task.context) {
				taskDiv.createEl('span', {
					text: task.context,
					cls: 'kayday-context-badge'
				});
			}
			
			taskDiv.onclick = () => {
				this.app.workspace.openLinkText(task.file.path, '', false);
				this.close();
			}
		});
	}

	private collectData(app: App) {
		// find Kayday folder
		const kaydayFolder = app.vault.getAbstractFileByPath('Kayday');
		if (!(kaydayFolder instanceof TFolder)) {
			return [];
		}
		// get all files in Kayday folder
		const files = kaydayFolder.children.filter((file: TAbstractFile) => file instanceof TFile) as TFile[];
		
		// gather tasks and contexts
		files.forEach(file => {
			// get and  collect context(s)
			const metadata = app.metadataCache.getFileCache(file);
			// TODO: we cannot be sure this is a string and not an array, can we?
			const context = metadata?.frontmatter?.context || '';
			if(!this.contexts.find(ctx => ctx.value === context)) {
				this.contexts.push({ value: context, text: context, active: false });
			}
			const repeat = metadata?.frontmatter?.repeat || false;	
			// collect task
			this.tasks.push({
				file,
				title: file.basename,
				context,
				repeat
			})
		});
	}
}
