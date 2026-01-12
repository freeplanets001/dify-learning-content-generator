/**
 * 07_obsidian.gs - Obsidian連携 (Google Drive Sync)
 * MarkdownファイルをGoogle Driveに保存し、ローカルのObsidianと同期させる
 */

const DEFAULT_SYNC_FOLDER = 'Dify_Sync_Vault'; 

/**
 * デイリーノートを生成
 * - 収集した最新記事を一覧化
 * - Google Drive上の指定フォルダに保存
 */
/**
 * Daily Noteを生成
 * (Legacy Appのフォーマットを再現)
 */
function generateDailyNote() {
  const today = new Date();
  const todayStr = Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  
  // 1. 記事取得 (直近50件)
  const allArticles = getArticlesDirectly(50);
  
  // 2. 日付フィルタ (今日収集した記事のみ)
  const todayArticles = allArticles.filter(article => {
    if (!article.collectedAt) return false;
    const collectedDate = new Date(article.collectedAt);
    const dateStr = Utilities.formatDate(collectedDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    return dateStr === todayStr;
  });
  
  // ※もし今日がない場合は、デモとして直近の記事を使うか？
  // ユーザーの意向としては「今日の分」が基本だが、テスト時は直近が見たいはず。
  // ここでは「今日」があればそれ、なければ直近5件を表示しつつ注釈を入れる形にする。
  let targetArticles = todayArticles;
  let isComparisonMode = false;
  
  if (targetArticles.length === 0 && allArticles.length > 0) {
    targetArticles = allArticles.slice(0, 5); // Fallback
    isComparisonMode = true;
  }
  
  // 3. Markdown生成 (Legacy Style)
  const content = generateLegacyMarkdown(todayStr, targetArticles, isComparisonMode);
  
  // 4. 保存
  const settings = getSettings();
  const subFolder = settings[SETTINGS_KEYS.OBSIDIAN_DAILY_NOTE_PATH] || 'Daily Notes';
  
  const result = saveToObsidian(`${todayStr}.md`, content, subFolder);
  
  // 実行ログに出力 (デバッグ用)
  console.log('✅ Daily Note Generation Result:', JSON.stringify(result, null, 2));
  
  return result;
}

/**
 * Legacy App (markdown.js) のスタイルを再現
 */
function generateLegacyMarkdown(dateStr, articles, isFallback = false) {
  // Frontmatter
  let md = `---\n`;
  md += `date: ${dateStr}\n`;
  md += `tags:\n  - dify\n  - daily-note\n  - auto-generated\n`;
  md += `type: daily-collection\n`;
  md += `---\n\n`;
  
  md += `# Dify Learning - ${dateStr}\n\n`;
  
  if (isFallback) {
    md += `> [!NOTE]\n> 本日収集された記事はありませんでした。直近の${articles.length}件を表示しています。\n\n`;
  }
  
  md += `## 📰 Collected Articles (${articles.length})\n\n`;
  
  if (articles.length === 0) {
    md += `(No articles collected)\n`;
    return md;
  }
  
  articles.forEach(article => {
    // Title & Link
    md += `### [${article.title}](${article.url})\n`;
    md += `\n`;
    
    // Meta Info
    const metaParts = [];
    metaParts.push(`📌 **${article.source || 'Unknown'}**`);
    if (article.collectedAt) {
       metaParts.push(`📅 ${formatDatePretty(article.collectedAt)}`);
    }
    md += metaParts.join(' | ') + `\n\n`;
    
    // Summary / Content
    if (article.summary) {
      // 本文をそのまま表示 (画像や見出しが含まれているため、引用記号はつけない)
      md += article.summary + `\n\n`;
    }
    
    md += `\n---\n\n`;
  });
  
  // Stats
  md += `## 📊 Statistics\n`;
  md += `- Total Articles: ${articles.length}\n`;
  md += `- Generated at: ${new Date().toLocaleTimeString()}\n`;
  
  return md;
}

function formatDatePretty(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
}

/**
 * 記事を直接シートから取得（依存排除）
 */
function getArticlesDirectly(limit) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('📰収集記事'); // 名前ハードコードで確実性を担保
    
    if (!sheet) {
      console.error('Sheet "📰収集記事" not found');
      return [];
    }
    
    const data = sheet.getDataRange().getValues();
    const articles = [];
    
    // ヘッダー除外 (行1から)
    // 後ろから新しい順に
    for (let i = data.length - 1; i >= 1; i--) {
      const row = data[i];
      // ID (A列) があるか
      // スクリーンショットでは数値が入っている
      if (row[0] !== undefined && row[0] !== '') {
        articles.push({
          id: row[0],
          title: row[1],
          url: row[2],
          source: row[3], // ソース追加
          collectedAt: row[4], // 収集日追加
          summary: row[5],
          status: row[6]
        });
      }
      if (articles.length >= limit) break;
    }
    return articles;
  } catch (e) {
    console.error('getArticlesDirectly Error:', e);
    return [];
  }
}

/**
 * Obsidian用Markdownを保存
 * @param {string} filename ファイル名 (例: 2026-01-12.md)
 * @param {string} content ファイル内容
 * @param {string} relativePath Daily Note用サブフォルダ名 (例: Daily Notes)
 */
function saveToObsidian(filename, content, relativePath = '') {
  try {
    // 設定からVaultパスを取得
    const settings = getSettings();
    // Macのパスなどに含まれる濁点結合文字(NFD)を正規化(NFC)して扱う
    const vaultPathInput = (settings[SETTINGS_KEYS.OBSIDIAN_VAULT_PATH] || '').normalize('NFC');
    
    // ルートフォルダを特定
    const rootFolder = resolveVaultFolder(vaultPathInput);
    
    // サブフォルダ (Daily Note Path) を特定
    // relativePathが空ならルート直下
    let targetFolder = rootFolder;
    
    if (relativePath && relativePath.trim() !== '') {
      // 重複チェック: 
      // ユーザーがVault Pathに既にサブフォルダまで含めている場合 (例: .../Daily_Notes)
      // rootFolderが既にそのフォルダになっているため、さらに下にDaily_Notesを作らないようにする
      if (rootFolder.getName() === relativePath) {
        console.log(`Root folder name matches relative path "${relativePath}". Using root folder directly.`);
        targetFolder = rootFolder;
      } else {
        targetFolder = getOrCreateSubFolder(rootFolder, relativePath);
      }
    }
    
    // ファイル保存
    const files = targetFolder.getFilesByName(filename);
    let file;
    let action = 'created';
    
    if (files.hasNext()) {
      // 既存ファイルがある場合は「上書き」する (Daily Noteの最新化)
      file = files.next();
      file.setContent(content);
      action = 'updated';
      
    } else {
      // 新規作成
      file = targetFolder.createFile(filename, content, MimeType.PLAIN_TEXT);
    }
    
    return {
      success: true,
      fileId: file.getId(),
      url: file.getUrl(),
      path: `${targetFolder.getName()}/${filename}`,
      originalPathInput: vaultPathInput,
      resolvedRoot: rootFolder.getName(),
      action: action
    };
    
  } catch (error) {
    console.error('Obsidian Sync Error:', error);
    throw new Error(`Sync failed: ${error.message}`);
  }
}


/**
 * Vaultフォルダを解決する
 * ユーザー入力パスからGoogle Drive上の最適なフォルダを特定する
 * 戦略:
 * 1. パスの末尾（フォルダ名）でDrive全体を検索し、一意ならそれを使う（最も確実）
 * 2. 見つからない場合、マイドライブからのパス階層を解析して作成/特定する
 */
function resolveVaultFolder(pathInput) {
  if (!pathInput) {
    return getOrCreateFolder(DEFAULT_SYNC_FOLDER);
  }
  
  // NFD -> NFC 正規化 (Mac対策)
  pathInput = pathInput.normalize('NFC');
  
  // パスからフォルダ名を抽出
  // 区切り文字は / と想定
  // 空白要素や "マイドライブ" 自体を除外
  const parts = pathInput.split('/').filter(p => p && p.trim() !== '' && p !== 'マイドライブ' && p !== 'My Drive');
  
  if (parts.length === 0) {
    return DriveApp.getRootFolder();
  }
  
  const leafName = parts[parts.length - 1]; // 例: "Daily_Notes" または "note用フォルダ"
  
  console.log(`Resolving folder: Leaf=${leafName}, Input=${pathInput}`);
  
  // 戦略1: 名前で検索 (Drive全体)
  const folders = DriveApp.getFoldersByName(leafName);
  const foundFolders = [];
  while (folders.hasNext()) {
    foundFolders.push(folders.next());
  }
  
  if (foundFolders.length === 1) {
    // 一意に特定できた場合
    console.log(`Found unique folder: ${leafName}`);
    return foundFolders[0];
  } else if (foundFolders.length > 1) {
    // 複数ある場合は危険なので、パス解析へフォールバック
    console.warn(`Multiple folders found for ${leafName}, using path resolution.`);
  }
  
  // 戦略2: パス解析 (マイドライブ/ の後ろを使う)
  let targetPath = pathInput;
  if (pathInput.includes('マイドライブ/')) {
    targetPath = pathInput.split('マイドライブ/')[1];
  } else if (pathInput.includes('My Drive/')) {
    targetPath = pathInput.split('My Drive/')[1];
  } else {
    // "マイドライブ" が含まれていない絶対パスの場合
    // パスの最後から2階層分を使って検索/作成を試みる
    if (parts.length >= 2) {
      targetPath = parts.slice(parts.length - 2).join('/');
    } else {
      targetPath = leafName;
    }
  }

  // ルートから順に検索/作成
  return getOrCreateSubFolder(DriveApp.getRootFolder(), targetPath);
}

/**
 * ルートフォルダを取得（なければ作成）- 旧互換
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
    
    // 直下のフォルダから探す
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
 * テスト用
 */
function testDailyNote() {
  console.log(generateDailyNote());
}
