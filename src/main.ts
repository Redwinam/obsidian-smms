import { Plugin, PluginSettingTab, Setting, App, Editor, TFile, Notice, Menu, MarkdownView, TAbstractFile } from 'obsidian';
import { SMMSUploader } from './SMMSUploader';
import { getAvailablePathForAttachments } from "obsidian-community-lib"

export interface PluginSettings {
  SMMS_API_BASE_URL: string;
  smmsApiToken: string;
  smmsApiOption: string;
  shouldDeleteAfterUpload: boolean;
}

const DEFAULT_SETTINGS: PluginSettings = {
  SMMS_API_BASE_URL: 'https://sm.ms',
  smmsApiToken: '',
  smmsApiOption: 'sm.ms',
  shouldDeleteAfterUpload: false,
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
          let line = editor.getSelection();
          let cursor = doc.getCursor();
          let matches;
          if (!line) {
            line = doc.getLine(cursor.line);
          }
          matches = line.matchAll(/!\[.*\]\((.*)\)/g);
          let matchArray = Array.from(matches);

          if (matchArray.length > 0) {
            if (!checking) {
              matchArray.forEach((match) => {
                if (markdownView && markdownView.file) {
                  let filename = match[1];
                  let filenameWithoutExtension = filename.substring(0, filename.lastIndexOf('.'));
                  let format = filename.substring(filename.lastIndexOf('.') + 1);
                  this.getImagePath(filenameWithoutExtension, format, markdownView.file).then((absolutePath) => {

                    this.uploadImage(absolutePath).then((res:any) => {
                      if (res.success && match) {
                        const newUrl = res.result;
                        const newLine = line.replace(filename, newUrl);
                        doc.replaceRange(newLine, { line: cursor.line, ch: 0 }, { line: cursor.line, ch: line.length });
                      } else {
                        new Notice(res.msg);
                      }
                    }).catch(console.error);
                  });
                }
              });
                
            }
            return true;
          }
        }
        return false;
      }
      
    });
  
    this.registerEvent(
      this.app.workspace.on('file-menu', (menu: Menu, file: TAbstractFile) => {
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
    path = decodeURIComponent(path);
    const result = await this.uploader.uploadFile(path);
    if (result.success) {
      new Notice('Image uploaded successfully');
      if (this.settings.shouldDeleteAfterUpload) {
        await this.app.vault.adapter.remove(path);
      }
    } else {
      new Notice(`Failed to upload image: ${result.msg}`);
    }
    return result;
  }

  // getAvailablePathForAttachments(match[1], format, markdownView.file)
  async getImagePath (filename: string, format: string, file: TFile) {
    const absolutePath = getAvailablePathForAttachments(filename, format, file);
    return absolutePath;
  }

  // 未查询到对应 Obsidian API，暂时不支持粘贴上传
  async handlePasteEvent(event: ClipboardEvent, editor: Editor) {
    if (event.clipboardData && event.clipboardData.files.length > 0) {
      const file = event.clipboardData.files[0];
      if (!file.type.startsWith("image/")) {
        return;
      }
  
      const result = await this.uploader.uploadFileFromClipboard(file);
      if (result.success) {
        const imageURL = result.result;
        const currentCursorPosition = editor.getCursor();
        editor.replaceRange(`![](${imageURL})`, {line: currentCursorPosition.line, ch: currentCursorPosition.ch});
      } else {
        new Notice(`Failed to upload image: ${result.msg}`);
      }
      event.preventDefault();
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

    new Setting(containerEl)
      .setName("Delete file after upload")
      .setDesc("If enabled, the local file will be deleted after it's successfully uploaded.")
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.shouldDeleteAfterUpload)
          .onChange(async value => {
            this.plugin.settings.shouldDeleteAfterUpload = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
