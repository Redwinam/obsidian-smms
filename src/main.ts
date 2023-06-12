import { Plugin, PluginSettingTab, Setting, App, TFile, Notice, Menu, MarkdownView, TAbstractFile } from 'obsidian';
import { SMMSUploader } from './SMMSUploader';

export interface PluginSettings {
  SMMS_API_BASE_URL: string;
  smmsApiToken: string;
  smmsApiOption: string;
}

const DEFAULT_SETTINGS: PluginSettings = {
  SMMS_API_BASE_URL: 'https://sm.ms',
  smmsApiToken: '',
  smmsApiOption: 'sm.ms',
};

export default class ImageUploadPlugin extends Plugin {
  settings!: PluginSettings;
  uploader!: SMMSUploader;

  async onload() {
    await this.loadSettings();

    this.uploader = new SMMSUploader(this.app, this.settings);

    this.addCommand({
      id: 'upload-image',
      name: 'Upload Image',
      checkCallback: (checking: boolean) => {
          let markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
          if (markdownView) {
              let editor = markdownView.editor;
              let doc = editor.getDoc();
              let cursor = doc.getCursor();
              let line = doc.getLine(cursor.line);
              let match = line.match(/!\[.*\]\((.*)\)/);
              if (match) {
                  if (!checking) {
                      this.uploadImage(match[1]).catch(console.error);
                  }
                  return true;
              }
          }
          return false;
        }
    });
  
    this.registerEvent(this.app.workspace.on('file-menu', (menu: Menu, file: TAbstractFile) => {
      if (file instanceof TFile && (file.extension === 'png' || file.extension === 'jpg')) {
        menu.addItem((item) => {
          item.setTitle('Upload Image')
            .onClick(() => this.uploadImage(file.path))
            .setIcon('upload-cloud');
        });
      }
    }));

    this.addSettingTab(new ImageUploadPluginSettingTab(this.app, this));
  }

  async uploadImage(path: string) {
    const result = await this.uploader.uploadFile(path);
    if (result.success) {
      new Notice('Image uploaded successfully');
    } else {
      new Notice(`Failed to upload image: ${result.msg}`);
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class ImageUploadPluginSettingTab extends PluginSettingTab {
  plugin: ImageUploadPlugin;

  constructor(app: App, plugin: ImageUploadPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    let { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("SMMS API Option")
      .setDesc("Choose the SMMS API option")
      .addDropdown((dropdown) =>
        dropdown
          .addOption('sm.ms', 'sm.ms')
          .addOption('smms.app', 'smms.app')
          .setValue(this.plugin.settings.smmsApiOption)
          .onChange(async value => {
            this.plugin.settings.smmsApiOption = value;
            // You can then set your SMMS_API_BASE_URL based on the selected option
            this.plugin.settings.SMMS_API_BASE_URL = `https://${value}`;
            this.display();
            await this.plugin.saveSettings();
          })
      );


    new Setting(containerEl)
      .setName("API Token")
      .setDesc("Your API Token")
      .addText(text =>
        text
          .setPlaceholder("Please input API Token")
          .setValue(this.plugin.settings.smmsApiToken)
          .onChange(async value => {
            this.plugin.settings.smmsApiToken = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
