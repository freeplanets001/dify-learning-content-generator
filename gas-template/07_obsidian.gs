/**
 * 07_obsidian.gs - Obsidian連携 (Google Drive Sync)
 * MarkdownファイルをGoogle Driveに保存し、ローカルのObsidianと同期させる
 */

const DEFAULT_SYNC_FOLDER = 'Dify_Sync_Vault'; 

/**
 * Obsidian用Markdownを保存
 * @param {string} filename ファイル名 (例: 2026-01-12.md)
 * @param {string} content ファイル内容
 * @param {string} relativePath 保存先パス (例: Daily Notes, Projects/Dify)
 */
function saveToObsidian(filename, content, relativePath = 'Daily Notes') {
  try {
    const rootFolder = getOrCreateFolder(DEFAULT_SYNC_FOLDER);
    const targetFolder = getOrCreateSubFolder(rootFolder, relativePath);
    
    // 同名ファイルがあるかチェック
    const files = targetFolder.getFilesByName(filename);
    let file;
    
    if (files.hasNext()) {
      // 更新 (上書き)
      file = files.next();
      file.setContent(content);
      console.log(`File updated: ${filename}`);
    } else {
      // 新規作成
      file = targetFolder.createFile(filename, content, MimeType.PLAIN_TEXT);
      console.log(`File created: ${filename}`);
    }
    
    return {
      success: true,
      fileId: file.getId(),
      url: file.getUrl(),
      path: `/${DEFAULT_SYNC_FOLDER}/${relativePath}/${filename}`
    };
    
  } catch (error) {
    console.error('Obsidian Sync Error:', error);
    throw new Error(`Sync failed: ${error.message}`);
  }
}

/**
 * ルートフォルダを取得（なければ作成）
 */
function getOrCreateFolder(folderName) {
  const folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  } else {
    return DriveApp.createFolder(folderName);
  }
}

/**
 * サブフォルダを取得（なければ作成）
 * パス階層の作成に対応 (例: "Folder/SubFolder")
 */
function getOrCreateSubFolder(parentFolder, path) {
  const parts = path.split('/');
  let currentFolder = parentFolder;
  
  for (const part of parts) {
    if (!part) continue;
    
    const folders = currentFolder.getFoldersByName(part);
    if (folders.hasNext()) {
      currentFolder = folders.next();
    } else {
      currentFolder = currentFolder.createFolder(part);
    }
  }
  
  return currentFolder;
}

/**
 * テスト用: デイリーノートを生成
 */
function testDailyNote() {
  const today = new Date();
  const dateStr = Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const filename = `${dateStr}.md`;
  
  const content = `# Daily Note ${dateStr}\n\n- [ ] Task 1\n- [ ] Task 2\n\n## Memo\nTest sync from GAS.`;
  
  const result = saveToObsidian(filename, content, 'Daily Notes');
  console.log(result);
}
