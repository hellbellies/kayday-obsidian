import { App, Modal, TAbstractFile, TFile, TFolder, setIcon } from 'obsidian';


type KaydayWeekday = 0|1|2|3|4|5|6; // 0 = Sunday, 1 = Monday, etc.
type KaydayTask = {
	file: TFile;
	title: string;
	context: string;
	repeat: boolean;
	completedOn: Date | null;
	days: Array<KaydayWeekday>;
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
	private divTasksToday: HTMLDivElement | null = null;
	private divTasksUpcoming: HTMLDivElement | null = null;
	private divTasksDone: HTMLDivElement | null = null;

	constructor(app: App) {
		super(app);
	}

	async onOpen() {
		this.titleEl.setText('Kayday');
		await this.collectData();
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
		this.contentEl.createEl('div', {text: 'Today\'s Tasks', cls: 'kayday-tasks-header'});
		this.divTasksToday = this.contentEl.createDiv({cls: 'kayday-container-tasks'});
		this.contentEl.createEl('div', {text: 'Upcoming Tasks', cls: 'kayday-tasks-header'});
		this.divTasksUpcoming = this.contentEl.createDiv({cls: 'kayday-container-tasks'});
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
			this.renderTasks();
		}
	}

	renderTasks() {
		// no tasks div, nothing place to render into
		if(!this.divTasksUpcoming || !this.divTasksDone || !this.divTasksToday) 
			return

		// filter tasks based on selected context
		const tasksFiltered = this.selectedContext ? this.tasks.filter(task => task.context === this.selectedContext) : this.tasks;
		// separate tasks into today, upcoming, and done
		const tasksUpcoming: KaydayTask[] = [];
		const tasksToday: KaydayTask[] = [];
		const tasksDone: KaydayTask[] = [];
		tasksFiltered.forEach(task => {
			if(this.isTaskCompleted(task)) {
				tasksDone.push(task);
			} else {
				// decide if task is due today
				if(this.isTaskDueToday(task)) {
					tasksToday.push(task);
				} else {
					tasksUpcoming.push(task);
				}
			}
		});
		// sort tasks
		tasksDone.sort((a, b) => (b.completedOn?.getTime() ?? 0) - (a.completedOn?.getTime() ?? 0))

		// render task groups
		this.renderTasksGroup(this.divTasksToday, tasksToday);
		this.renderTasksGroup(this.divTasksUpcoming, tasksUpcoming);
		this.renderTasksGroup(this.divTasksDone, tasksDone);
	}

	private renderTasksGroup(container: HTMLDivElement, tasks: KaydayTask[]) {
		container.empty();
		const _container = container; // for easier access in the loop below
		tasks.forEach(task => {
			this.renderTask(task, _container);
		});
		if(tasks.length === 0) {
			container.createEl('div', {text: 'No tasks', cls: 'kayday-no-tasks'});
		}
	}

	private async renderTask(task: KaydayTask, container: HTMLDivElement) {
		// Determine if the task is completed
		const isCompleted = this.isTaskCompleted(task);

		// create the task item container
		const taskDiv = container.createEl('div', {cls: 'kayday-task-item'});
		
		// Add task icon
		const taskIcon = taskDiv.createEl('span', {cls: 'kayday-task-icon'});
		taskIcon.onclick = async (e) => {
			e.stopImmediatePropagation();
			await this.toggleCompletedOn(task);
		};
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

	private async collectData() {
		// clear current data
		this.tasks = [];
		this.contexts = [];

		// find Kayday folder
		const kaydayFolder = this.app.vault.getAbstractFileByPath('Kayday');
		if (!(kaydayFolder instanceof TFolder)) {
			return [];
		}
		// get all files in Kayday folder
		const files = kaydayFolder.children.filter((file: TAbstractFile) => file instanceof TFile) as TFile[];
		
		// gather tasks and contexts
		files.forEach(file => {
			// get metadata
			const metadata = this.app.metadataCache.getFileCache(file);
			// get context 
			// TODO: we cannot be sure this is a string and not an array, can we?
			const context = metadata?.frontmatter?.context || '';
			if(!this.contexts.find(ctx => ctx.value === context)) {
				this.contexts.push({ value: context, text: context, active: false });
			}
			// get repeat
			// TODO: how can we be sure this is a boolean and not a string?
			const repeat = metadata?.frontmatter?.repeat || false;	
			// get completed data 
			// TODO: make sure this string is a valid date and not a string? does it tell frontmatter what it is?
			const completedOn = metadata?.frontmatter?.completedOn ? new Date(metadata.frontmatter.completedOn) : null;
			// get days
			const daysRaw = metadata?.frontmatter?.days as string[] || [];
			const days: KaydayWeekday[] = daysRaw.map(day => this.stringToDay(day)).filter((day): day is KaydayWeekday => day !== null);
			// collect task
			this.tasks.push({
				file,
				title: file.basename,
				context,
				repeat,
				completedOn,
				days,
			})
		});
	}

	private async toggleCompletedOn(task: KaydayTask) {
		// update the task's completedOn date based on the completed parameter
		const completedOn = this.app.metadataCache.getFileCache(task.file)?.frontmatter?.completedOn;
		const value = completedOn ? null : new Date().toISOString();
		await this.app.fileManager.processFrontMatter(task.file, (frontmatter) => {
			frontmatter.completedOn = value;
		});
		
		// Add a small delay to ensure metadata cache is updated
		await new Promise(resolve => setTimeout(resolve, 100));
		
		// gather data again to update the task in memory
		await this.collectData();
		// re-render the task list
		this.renderTasks();
	}

	private isTaskDueToday(task: KaydayTask): boolean {
		if(!task.days || task.days.length === 0) return true; // no days set, so always due
		const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
		return task.days.includes(today as KaydayWeekday);
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

	private stringToDay(dateString: string): number | null  {
		const days = [['su', 'sun', 'sunday'], ['mo', 'mon', 'monday'], ['tu', 'tue', 'tuesday'], ['we', 'wed', 'wednesday'], ['th', 'thu', 'thursday'], ['fr', 'fri', 'friday'], ['sa', 'sat', 'saturday']];
		for (let i = 0; i < days.length; i++) {
			if (days[i].includes(dateString.toLowerCase())) {
				return i;
			}
		}
		return null
	}
}
