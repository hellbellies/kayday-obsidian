import { App, Modal, TFile, setIcon } from 'obsidian';


type KaydayWeekday = 0|1|2|3|4|5|6; // 0 = Sunday, 1 = Monday, etc.
type KaydayPriority = 1|2|3; // 1 = low, 2 = medium, 3 = high
type KaydayTask = {
	file: TFile;
	title: string;
	context: string;
	repeat: boolean;
	completedOn: Date | null;
	silencedUntil: Date | null;
	days: Array<KaydayWeekday>;
	hours: Array<number>;
	duration: number; // in minutes
	priority: KaydayPriority;
}
type KaydayContext = {
	value: string;
	text: string;
	active: boolean;
}

type KaydayUIState = {
	context: string;
	groups: Record<KaydayGroup, boolean>;
}

type KaydayGroup = 'today' | 'upcoming' | 'completed';

export default class KaydayModal extends Modal {
	private manifestId: string;
	private uiState : KaydayUIState = { context: '', groups: { today: true, upcoming: true, completed: true } };
	private tasks: KaydayTask[] = []
	private contexts: KaydayContext[] = []

	private divFilter: HTMLDivElement | null = null;
	private divTasks: HTMLDivElement | null = null;
	private divNewTask: HTMLDivElement | null = null;

	constructor(app: App, manifestId: string) {
		super(app);
		this.manifestId = manifestId;
	}

	async onOpen() {
		this.titleEl.setText('Kayday');
		this.uiState = this.getUiState();
		await this.collectData();
		this.renderUi();
		this.renderFilter();
		this.renderTasks();
		this.renderNewTask();
	}

	onClose() {
		this.setUiState(this.uiState);
		this.contentEl.empty();
	}

	renderUi() {
		this.contentEl.empty();
		this.divFilter = this.contentEl.createDiv({cls: 'kayday-container-filter'});
		this.divTasks = this.contentEl.createDiv({cls: 'kayday-container-tasks'});
		this.divNewTask = this.contentEl.createDiv({cls: 'kayday-newtask'});
	}

	renderFilter() {
		if(!this.divFilter) return;
		this.divFilter.empty();
		const contextSelect = this.divFilter.createEl('select');
		contextSelect.createEl('option', {value: '', text: 'all contexts'});
		this.contexts.forEach(context => {
			if(!context.value) return; // skip empty context
			const option = contextSelect.createEl('option', {value: context.value, text: context.text});
			option.selected = (context.value === this.uiState.context);
		});
		// this.divFilter.appendChild(contextSelect);
		contextSelect.onchange = (e) => {
			this.uiState.context = (e.target as HTMLSelectElement).value;
			this.setUiState(this.uiState);
			this.renderTasks();
		}
	}

	async renderTasks() {
		console.log(`There are ${this.tasks.length} tasks`);
		// no tasks div, nothing place to render into
		if(!this.divTasks) 
			return

		// filter tasks based on selected context
		const tasksFiltered = this.uiState.context ? this.tasks.filter(task => task.context === this.uiState.context) : this.tasks;
		// separate tasks into today, upcoming, and done
		const tasksUpcoming: KaydayTask[] = [];
		const tasksToday: KaydayTask[] = [];
		const tasksDone: KaydayTask[] = [];
		tasksFiltered.forEach(task => {
			if(this.isTaskCompleted(task)) {
				tasksDone.push(task);
			} else {
				// decide if task is due today
				// TODO: might need to change the method from isTaskDueToday to isTaskDueNow or something like that
				if(this.isTaskDueToday(task) && (task.hours.length === 0 || task.hours.includes(new Date().getHours()))) {
					tasksToday.push(task);
				} else {
					tasksUpcoming.push(task);
				}
			}
		});
		// sort tasks
		const sortOpen = (a: KaydayTask, b: KaydayTask) => {
			// if no duration, set to a high number
			const durationA = a.duration || 9999;
			const durationB = b.duration || 9999;
			// if the duration is <= 5 minutes, put it first
			if(durationA <= 5 && durationB > 5) return -1;
			if(durationB <= 5 && durationA > 5) return 1;
			// otherwise, sort by priority (high to low)
			if(a.priority !== b.priority) return b.priority - a.priority;
			// then by duration (short to long)
			if(durationA !== durationB) return durationA - durationB;
			// finally by title (alphabetical)
			return a.title.localeCompare(b.title);
		}
		tasksDone.sort((a, b) => (b.completedOn?.getTime() ?? 0) - (a.completedOn?.getTime() ?? 0))
		tasksToday.sort(sortOpen)
		tasksUpcoming.sort(sortOpen)
		
		// render task groups
		this.divTasks.empty();
		await this.renderTasksGroup('today', "Today's Tasks", this.divTasks, tasksToday);
		await this.renderTasksGroup('upcoming', "Upcoming Tasks", this.divTasks, tasksUpcoming);
		await this.renderTasksGroup('completed', "Completed Tasks", this.divTasks, tasksDone);
	}

	private async renderTasksGroup(group: KaydayGroup, title: string, container: HTMLDivElement, tasks: KaydayTask[]) {
		// create collapsible
		const open = this.uiState.groups[group];
		const collapsible = container.createEl('div', {cls: `kayday-collapsible${open ? ' open': ''}`});
		// header
		const header = collapsible.createEl('div', {cls: 'kayday-collapsible-header'});
		const headerToggleIcon = header.createEl('span', {cls: 'kayday-collapsible-header-icon'});
		setIcon(headerToggleIcon, 'chevron-right');
		header.createEl('span', {text: title});
		// content
		const content = collapsible.createEl('div', {cls: 'kayday-collapsible-content'});
		header.onclick = () => {
			collapsible.classList.toggle('open');
			this.uiState.groups[group] = !this.uiState.groups[group];
			this.setUiState(this.uiState);
		};
		// render tasks
		tasks.forEach(task => {
			this.renderTask(task, content);
		});
		if(tasks.length === 0) {
			content.createEl('div', {text: 'No tasks', cls: 'kayday-no-tasks'});
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

		// add duration if it exists
		if(task.duration && task.duration > 0) {
			taskDiv.createEl('span', {
				text: `${task.duration}'`,
				cls: 'kayday-badge'
			});
		}
		
		// Add context badge if it exists
		if (task.context) {
			taskDiv.createEl('span', {
				text: task.context,
				cls: 'kayday-badge'
			});
		}
		// add silence badge if silencedUntil is in the future
		if (task.silencedUntil && this.isLaterThanToday(task.silencedUntil)) {
			const silencedBadge = taskDiv.createEl('span', {
				text: "zzz",
				cls: 'kayday-badge'
			});
			setIcon(silencedBadge, 'moon');
		}
		// Add priority badge
		taskDiv.createEl('span', {
			text: this.priorityToString(task.priority),
			cls: 'kayday-badge'
		});

		// Add un-task icon
		if(isCompleted) {
			const untaskIcon = taskDiv.createEl('span', {cls: 'kayday-task-icon'});
			setIcon(untaskIcon, 'bookmark-x');
			untaskIcon.onclick = async (e) => {
				e.stopImmediatePropagation();
				await this.untagTask(task);
				
			};
		}

		// make the whole task div clickable to open the file
		taskDiv.onclick = () => {
			this.app.workspace.openLinkText(task.file.path, '', false);
			this.close();
		}
	
	}

	private async renderNewTask() {
		const create = async() => {
			const taskTitle = newTaskInput.value.trim();
			await this.createNewTask(taskTitle);
			newTaskInput.value = '';
		}
		if(!this.divNewTask) return;
		this.divNewTask.empty();
		const newTaskInput = this.divNewTask.createEl('input', {type: 'text', placeholder: 'Create new task...'});
		newTaskInput.addEventListener('keydown', async (e) => {
			if (e.key === 'Enter') {
				await create();
			}
		});
		// add a button to create the task
		const newTaskButton = this.divNewTask.createEl('button', {text: 'New Task', cls: 'kayday-newtask-button'});
		setIcon(newTaskButton, 'plus');
		newTaskButton.onclick = async () => {
			await create();
		};
	}

	private async collectData() {
		// clear current data
		this.tasks = [];
		this.contexts = [];

		// find all files with the "kayday" tag in the vault
		const files: TFile[] = [];
		const markdownFiles = this.app.vault.getMarkdownFiles();
		for( const file of markdownFiles) {
			const cache = this.app.metadataCache.getFileCache(file);
			const frontmatterTags = cache?.frontmatter?.tags;
			if (frontmatterTags) {
				const tagsArray = Array.isArray(frontmatterTags) ? frontmatterTags : [frontmatterTags];
				if (tagsArray.map(t => t.toLowerCase()).includes('kayday')) {
					files.push(file);
				}
			}
		}
		
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
			// get completed data 
			// TODO: make sure this string is a valid date and not a string? does it tell frontmatter what it is?
			const silencedUntil = metadata?.frontmatter?.silencedUntil ? new Date(metadata.frontmatter.silencedUntil) : null;
			// get days
			const daysRaw = metadata?.frontmatter?.days as string[] || [];
			const days: KaydayWeekday[] = daysRaw.map(day => this.stringToDay(day)).filter((day): day is KaydayWeekday => day !== null);
			// get hours
			const hoursRaw: string = metadata?.frontmatter?.hours || '';
			const hours: number[] = hoursRaw.split(',').map(hour => {
				const parsed = parseInt(hour);
				return isNaN(parsed) ? -1 : parsed;
			}).filter(hour => hour >= 0 && hour <= 23);
			// get duration
			const parsedDuration = parseInt(metadata?.frontmatter?.duration || ''); // in minutes
			const duration = isNaN(parsedDuration) ? 0 : parsedDuration;
			// get priority
			const priorityRaw = metadata?.frontmatter?.priority || 'low';
			const priority = this.stringToPriority(priorityRaw);
			
			// create task
			this.tasks.push({
				file,
				title: file.basename,
				context,
				repeat,
				completedOn,
				days,
				hours,
				duration,
				priority,
				silencedUntil,
			})
		});
		console.log(`Collected ${this.tasks.length} tasks from ${files.length} files.`);
	}

	private async createNewTask(title: string, ) {
		// find a unique name for the new task
		let index = 1;
		let newFileName = `${title || 'New Task'}.md`;
		while (this.app.vault.getAbstractFileByPath(`${newFileName}`)) {
			index++;
			newFileName = `${title || 'New Task'} ${index}.md`;
		}
		// create the new file
		const newFile = await this.app.vault.create(`${newFileName}`, '');
		if (newFile) {
			await this.app.fileManager.processFrontMatter(newFile, (frontmatter) => {
				frontmatter.tags = ['kayday'];
				frontmatter.context = this.uiState.context; // add current context automatically
				frontmatter.duration = 15; // default duration
				frontmatter.priority = 'low';
				frontmatter.repeat = false;
			});
			this.app.workspace.openLinkText(newFile.path, '', false);
			this.close();
		}
	}

	private async toggleCompletedOn(task: KaydayTask) {
		// update the task's completedOn date based on the completed parameter
		const completedOn = this.app.metadataCache.getFileCache(task.file)?.frontmatter?.completedOn;
		const value = completedOn ? null : new Date().toISOString();
		await this.app.fileManager.processFrontMatter(task.file, (frontmatter) => {
			frontmatter.completedOn = value;
		});
		// Add a small delay to ensure metadata cache is updated TODO: is there a better way?
		await new Promise(resolve => setTimeout(resolve, 100));
		// gather data again to update the task in memory
		await this.collectData();
		// re-render the task list
		this.renderTasks();
	}

	private async untagTask(task: KaydayTask) {
		// get the tags from frontmatter
		const cache = this.app.metadataCache.getFileCache(task.file);
		const frontmatterTags = cache?.frontmatter?.tags;
		// remove the "kayday" tag
		if (frontmatterTags) {
			const tagsArray = Array.isArray(frontmatterTags) ? frontmatterTags : [frontmatterTags];
			await this.app.fileManager.processFrontMatter(task.file, (frontmatter) => {
				frontmatter.tags = tagsArray.filter((tag: string) => tag.toLowerCase() !== 'kayday');
			});
		}
		// Add a small delay to ensure metadata cache is updated TODO: is there a better way?
		await new Promise(resolve => setTimeout(resolve, 100));
		// gather data again to update the task in memory
		await this.collectData();
		// re-render the task list
		this.renderTasks();
	}

	private isTaskDueToday(task: KaydayTask): boolean {
		if(task.silencedUntil && this.isLaterThanToday(task.silencedUntil))
			return false; // task is silenced
		if(!task.days || task.days.length === 0) 
			return true; // no days set, so always due
		const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
		return task.days.includes(today as KaydayWeekday);
	}

	private isTaskCompleted(task: KaydayTask): boolean {
		if(!task.completedOn) return false;
		if(task.repeat && this.isSameDay(task.completedOn, new Date())) {
			return true; // completed today
		}
		if(task.repeat) {
			if(this.isSameDay(task.completedOn, new Date())) {
				return true; // completed today
			}
			else {
				return false; // not completed today
			}
		}
		return true
	}

	private isSameDay(date1: Date, date2: Date): boolean {
		return date1.getFullYear() === date2.getFullYear() &&
			date1.getMonth() === date2.getMonth() &&
			date1.getDate() === date2.getDate();	
	}

	private isLaterThanToday(date: Date): boolean {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const compareDate = new Date(date);
		compareDate.setHours(0, 0, 0, 0);
		return compareDate > today;
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

	private stringToPriority(priorityString: string): KaydayPriority  {
		switch (priorityString.toLowerCase()) {
			case 'medium':
				return 2;
			case 'high':
				return 3;
			default:
				return 1; // default to low
		}
	}

	private priorityToString(priority: KaydayPriority): string {
		switch (priority) {
			case 2:
				return 'medium';
			case 3:
				return 'high';
			default:
				return 'low';
		}
	}

	private getUiState(): KaydayUIState {
		// TODO: JSON parse and validate instead
		const context = localStorage.getItem(`${this.manifestId}-filter-context`) || '';
		const groups = {
			today: localStorage.getItem(`${this.manifestId}-filter-groups-today`) === 'true',
			upcoming: localStorage.getItem(`${this.manifestId}-filter-groups-upcoming`) === 'true',
			completed: localStorage.getItem(`${this.manifestId}-filter-groups-completed`) === 'true',
		};
		return { context, groups };
	}

	private setUiState(filter: KaydayUIState) {
		// TODO: JSON stringify and validate instead
		localStorage.setItem(`${this.manifestId}-filter-context`, filter.context);
		localStorage.setItem(`${this.manifestId}-filter-groups-today`, filter.groups.today.toString());
		localStorage.setItem(`${this.manifestId}-filter-groups-upcoming`, filter.groups.upcoming.toString());
		localStorage.setItem(`${this.manifestId}-filter-groups-completed`, filter.groups.completed.toString());
	}
}
