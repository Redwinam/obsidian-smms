import { App, Notice, requestUrl, RequestUrlParam, getBlobArrayBuffer } from "obsidian";
import { PluginSettings } from "./main";
import path from "path";

export interface SMMSResponse {
  message: any;
  images: any;
  code: string;
  success: boolean;
  msg: string;
  data: {
    url: string;
  };
}

export class SMMSUploader {
  settings: PluginSettings;
  app: App;
  
  constructor(app: App, settings: PluginSettings) {
    this.app = app;
    this.settings = settings;
  }

  async uploadFile(filePath: string): Promise<{success: boolean; result?: string; msg?: string}> {
    // Generate boundary string
    const boundaryString = "----ObsidianUploader" + Array(32).join((Math.random().toString(36) + '00000000000000000').slice(2, 18)).slice(0, 32);
    
    // Construct the form data payload as a string
    const filename = path.basename(filePath);
    const preString = `--${boundaryString}\r\nContent-Disposition: form-data; name="smfile"; filename="${filename}"\r\nContent-Type: "application/octet-stream"\r\n\r\n`;
    const postString = `\r\n--${boundaryString}--`;

    // Get file data as a Blob
    const fileData = new Blob([await this.app.vault.adapter.readBinary(filePath)]);
    // Convert the form data payload to a blob by concatenating the preString, the file data, and the postString, then return the blob as an array buffer
    const preStringEncoded = new TextEncoder().encode(preString);
    const postStringEncoded = new TextEncoder().encode(postString);
    const payload = await new Blob([preStringEncoded, await getBlobArrayBuffer(fileData), postStringEncoded]).arrayBuffer();
    
    // Prepare request options
    const options: RequestUrlParam = {
      method: 'POST',
      url: `${this.settings.SMMS_API_BASE_URL}/api/v2/upload`,
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundaryString}`,
        'Authorization': `Basic ${this.settings.smmsApiToken}`
      },
      body: payload
    };

    // Make the request and handle the response
    try {
      const response = await requestUrl(options);
      const data: SMMSResponse = await response.json;
    
      if (data.success || data.code === 'image_repeated') {
        const url = data.success ? data.data.url : data.images;
        return {
          success: true,
          result: url
        };
      } else {
        return {
          success: false,
          msg: data.message
        };
      }
    } catch (error: any) {
      new Notice('Failed to upload image');
      return {
        success: false,
        msg: error.message
      };
    }
    
  }
}
