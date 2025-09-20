import { App, Modal, TAbstractFile, TFile, TFolder, setIcon } from 'obsidian';

type KaydayTask = {
	file: TFile;
	title: string;
	context: string;
	repeat: boolean;
	completedOn: Date | null;
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

	private divFilter: HTMLDivElement | null = null;
	private divTasksOpen: HTMLDivElement | null = null;
	private divTasksDone: HTMLDivElement | null = null;

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
		this.divFilter = this.contentEl.createDiv({cls: 'kayday-container-filter'});
		this.contentEl.createEl('div', {text: 'Open Tasks', cls: 'kayday-tasks-header'});
		this.divTasksOpen = this.contentEl.createDiv({cls: 'kayday-container-tasks'});
		this.contentEl.createEl('div', {text: 'Completed Tasks', cls: 'kayday-tasks-header'});
		this.divTasksDone = this.contentEl.createDiv({cls: 'kayday-container-tasks'});
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
		// no tasks div, nothing place to render into
		if(!this.divTasksOpen || !this.divTasksDone) return;
		
		// filter tasks based on selected context
		const tasksFiltered = this.selectedContext ? this.tasks.filter(task => task.context === this.selectedContext) : this.tasks;
		// separate tasks into open and done
		const tasksOpen: KaydayTask[] = [];
		const tasksDone: KaydayTask[] = [];
		tasksFiltered.forEach(task => {
			if(this.isTaskCompleted(task)) {
				tasksDone.push(task);
			} else {
				tasksOpen.push(task);
			}
		});

		// render open tasks
		this.divTasksOpen.empty();
		const divTasksOpen = this.divTasksOpen; // for easier access in the loop below
		tasksOpen.forEach(task => {
			this.renderTask(task, divTasksOpen);
		});

		// render done tasks
		this.divTasksDone.empty();
		const divTasksDone = this.divTasksDone; // for easier access in the loop below
		tasksDone.forEach(task => {
			this.renderTask(task, divTasksDone);
		});
	}

	private renderTask(task: KaydayTask, container: HTMLDivElement) {
		// Determine if the task is completed
		const isCompleted = this.isTaskCompleted(task);

		// create the task item container
		const taskDiv = container.createEl('div', {cls: 'kayday-task-item'});
		
		// Add task icon
		const taskIcon = taskDiv.createEl('span', {cls: 'kayday-task-icon'});
		// Use different icons based on task properties
		const iconName = isCompleted ? 'check-square' : 'square';
		setIcon(taskIcon, iconName);
		
		// Add task title
		const taskTitleDiv = taskDiv.createEl('div', {text: task.title, cls: 'kayday-task-title'});
		// add repeat icon if repeat is true
		if(task.repeat) {
			const repeatIcon = taskTitleDiv.createEl('span', {cls: 'kayday-task-icon-repeat'});
			setIcon(repeatIcon, 'refresh-cw');
		}
		
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
			// TODO: how can we be sure this is a boolean and not a string?
			const repeat = metadata?.frontmatter?.repeat || false;	
			// TODO: how can we be sure this is a date and not a string?
			const completedOn = metadata?.frontmatter?.completedOn ? new Date(metadata.frontmatter.completedOn) : null;
			// collect task
			this.tasks.push({
				file,
				title: file.basename,
				context,
				repeat,
				completedOn,
			})
		});
	}

	private isTaskCompleted(task: KaydayTask): boolean {
		if(!task.completedOn) return false;
		if(task.repeat && this.isSameDay(task.completedOn, new Date())) {
			return true; // completed today
		}
		return task.completedOn !== null;
	}

	private isSameDay(date1: Date, date2: Date): boolean {
		return date1.getFullYear() === date2.getFullYear() &&
			date1.getMonth() === date2.getMonth() &&
			date1.getDate() === date2.getDate();	
	}
}
