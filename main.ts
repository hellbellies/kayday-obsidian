import { App, Plugin, PluginSettingTab, Setting } from 'obsidian';
import KaydayModal from 'KaydayModal';

interface KaydayPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: KaydayPluginSettings = {
	mySetting: 'default'
}

export default class KaydayPlugin extends Plugin {
	settings: KaydayPluginSettings;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('leaf', 'Kayday', (evt: MouseEvent) => {
			new KaydayModal(this.app, this.manifest.id).open();
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
				new KaydayModal(this.app, this.manifest.id).open();
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

		containerEl.empty();

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
