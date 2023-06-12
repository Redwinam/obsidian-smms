// lang/helpers.ts
interface Lang {
    [key: string]: string;
  }
  
  const EN: Lang = {
    "Plugin Settings": "Plugin Settings",
    "SMMS API Key": "SMMS API Key",
    "Your SMMS API Key": "Your SMMS API Key",
    "Please input SMMS API Key": "Please input SMMS API Key",
    "SMMS History Path": "SMMS History Path",
    "Your SMMS History Path": "Your SMMS History Path",
    "Please input SMMS History Path": "Please input SMMS History Path",
  };
  
  // 添加更多语言选项，如中文：
  const CN: Lang = {
    "Plugin Settings": "插件设置",
    "SMMS API Key": "SMMS API密钥",
    "Your SMMS API Key": "你的SMMS API密钥",
    "Please input SMMS API Key": "请输入SMMS API密钥",
    "SMMS History Path": "SMMS历史路径",
    "Your SMMS History Path": "你的SMMS历史路径",
    "Please input SMMS History Path": "请输入SMMS历史路径",
  };
  
  let lang = EN; // Default language is English
  // let lang = CN; // Uncomment this line to set the default language as Chinese
  
  // A helper function to get language strings
  export function t(key: string): string {
    return lang[key] || key;
  }
  
  // A helper function to set language
  export function setLanguage(newLang: 'EN' | 'CN') {
    switch (newLang) {
      case 'EN':
        lang = EN;
        break;
      case 'CN':
        lang = CN;
        break;
      default:
        throw new Error(`Unsupported language: ${newLang}`);
    }
  }
  