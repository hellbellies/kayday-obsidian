import { App, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';
import KaydayModal from 'KaydayModal';
import type { KaydaySettings } from 'KaydaySettings';


const DEFAULT_SETTINGS: KaydaySettings = {
	folderNewTasks: 'Tasks',
	tagForTasks: 'kayday'
}

export default class KaydayPlugin extends Plugin {
	settings: KaydaySettings;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('leaf', 'Kayday', (evt: MouseEvent) => {
			new KaydayModal(this.app, this.manifest.id, this.settings).open();
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('kayday-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-kayday-modal-simple',
			name: 'open',
			callback: () => {
				new KaydayModal(this.app, this.manifest.id, this.settings).open();
			}
		});
		

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new KaydaySettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			// console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class KaydaySettingTab extends PluginSettingTab {
	plugin: KaydayPlugin;

	constructor(app: App, plugin: KaydayPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;
		let updatedTag: string = this.plugin.settings.tagForTasks; 
		containerEl.empty();

		new Setting(containerEl)
			.setName('Folder for new tasks')
			.setDesc('This is where Kayday will create new tasks')
			.addText(text => text
				.setPlaceholder('Enter folder path')
				.setValue(this.plugin.settings.folderNewTasks)
				.onChange(async (value) => {
					this.plugin.settings.folderNewTasks = value;
					await this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName('Tag for tasks')
			.setDesc(`This is the tag that is used to recognize notes as tasks. Current: ${this.plugin.settings.tagForTasks}.`)
			.addText(text => text
				.setPlaceholder('Enter your tag')
				.setValue(this.plugin.settings.tagForTasks)
				.onChange(async (value) => {
					updatedTag = value;
				}))
			.addButton(btn => btn
				.setButtonText('apply')
				.onClick(async () => {
					// get all task files
					const markdownFiles = this.app.vault.getMarkdownFiles();
					// update all files that have the old tag in frontmatter
					for( const file of markdownFiles) {
						const cache = this.app.metadataCache.getFileCache(file);
						const frontmatterTags = cache?.frontmatter?.tags;
						if (frontmatterTags) {
							const tagsArray = Array.isArray(frontmatterTags) ? frontmatterTags : [frontmatterTags];
							if (tagsArray.map(t => t.toLowerCase()).includes(this.plugin.settings.tagForTasks.toLowerCase())) {
								// replace tag in frontmatter
								const updatedTags = tagsArray.map(t => t.toLowerCase() === this.plugin.settings.tagForTasks.toLowerCase() ? updatedTag : t);
								await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
									frontmatter.tags = updatedTags;
								});
							}
						}
					}
					// apply settings
					this.plugin.settings.tagForTasks = updatedTag;
					await this.plugin.saveSettings();
					this.display(); // refresh
				}));
	}
}
