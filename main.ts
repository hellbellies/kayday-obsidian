//import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFolder, TFile, WorkspaceLeaf } from 'obsidian';
import { Plugin, ItemView, WorkspaceLeaf } from 'obsidian';

interface KaydaySettings {
	currentContext: string;
	mySetting: string;
}

const DEFAULT_SETTINGS: KaydaySettings = {
	currentContext: '',
	mySetting: 'default'
}

export const VIEW_TYPE_KAYDAY_SIDEBAR = 'kayday-sidebar-view';

export class KaydaySidebarView extends ItemView {
	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType() {
		return VIEW_TYPE_KAYDAY_SIDEBAR;
	}

	getDisplayText() {
		return 'Kayday Sidebar';
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();
		container.createEl('h3', { text: 'Kayday Sidebar' });
		container.createEl('p', { text: 'This is the sidebar view for Kayday.' });
		// You can add more UI elements here as needed
	}
	
	async onClose() {
		// Cleanup if necessary	
	}
}


export default class Kayday extends Plugin {
	settings: KaydaySettings;
	

	async onload() {
		// register sidebar view
		
		this.registerView(
			'kayday-sidebar-view',
			(leaf) => new KaydaySidebarView(leaf)
		);

		// Add ribbon icon to open the sidebar
        this.addRibbonIcon('dice', 'Open Kayday Sidebar', (evt) => {
            this.activateView();
        });

        // Add command to open sidebar
        this.addCommand({
            id: 'open-kayday-sidebar',
            name: 'Open Kayday Sidebar',
            callback: () => {
                this.activateView();
            }
        });
	}

	onunload() {
		// Detach any open views of this type
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_KAYDAY_SIDEBAR);
	}

	// This is our custom method - it should be inside the Plugin class
    async activateView() {
        const { workspace } = this.app;
        
        let leaf: WorkspaceLeaf | null = null;
        const leaves = workspace.getLeavesOfType(VIEW_TYPE_KAYDAY_SIDEBAR);
		/* You can control where your sidebar appears:
			Right sidebar: workspace.getRightLeaf(false)
			Left sidebar: workspace.getLeftLeaf(false)
			Split existing pane: workspace.splitActiveLeaf() 
		*/

        if (leaves.length > 0) {
            // View already exists, reveal it
            leaf = leaves[0];
        } else {
            // Create new view in right sidebar
            leaf = workspace.getRightLeaf(false);
			if(leaf) {	
				await leaf.setViewState({ type: VIEW_TYPE_KAYDAY_SIDEBAR, active: true });				
			}
        }

        // Reveal the leaf
		if(leaf) {
			workspace.revealLeaf(leaf);
		}
    }

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	
}

// class KaydayModal extends Modal {
// 	constructor(app: App) {
// 		super(app);
// 	}

// 	onOpen() {
// 		const {contentEl} = this;
// 		contentEl.setText('Woah!');
// 	}

// 	onClose() {
// 		const {contentEl} = this;
// 		contentEl.empty();
// 	}
// }

// class KaydaySettingTab extends PluginSettingTab {
// 	plugin: Kayday;

// 	constructor(app: App, plugin: Kayday) {
// 		super(app, plugin);
// 		this.plugin = plugin;
// 	}

// 	display(): void {
// 		const {containerEl} = this;

// 		containerEl.empty();

// 		new Setting(containerEl)
// 			.setName('Setting #1')
// 			.setDesc('It\'s a secret')
// 			.addText(text => text
// 				.setPlaceholder('Enter your secret')
// 				.setValue(this.plugin.settings.mySetting)
// 				.onChange(async (value) => {
// 					this.plugin.settings.mySetting = value;
// 					await this.plugin.saveSettings();
// 				}));
// 	}
// }
