/**
 * 05_triggers.gs - トリガー設定
 * 定期実行の管理
 */

// === トリガー管理 ===

/**
 * トリガー設定ダイアログを表示
 */
function showTriggerSettings() {
  const ui = SpreadsheetApp.getUi();
  const settings = getSettings();
  const currentInterval = settings[SETTINGS_KEYS.AUTO_COLLECT_INTERVAL] || 6;
  const triggers = ScriptApp.getProjectTriggers();
  const hasTrigger = triggers.some(t => t.getHandlerFunction() === 'scheduledCollection');
  
  const html = HtmlService.createHtmlOutput(`
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; }
      h3 { margin-top: 0; color: #4285f4; }
      p { color: #555; }
      select { padding: 8px; width: 100%; margin: 10px 0; border: 1px solid #ddd; border-radius: 4px; }
      button { padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; color: white; font-weight: bold; width: 100%; margin-top: 10px; }
      .enable { background-color: #34a853; }
      .enable:hover { background-color: #2d8e47; }
      .disable { background-color: #ea4335; }
      .disable:hover { background-color: #d33828; }
      .status { margin-bottom: 20px; padding: 10px; border-radius: 4px; text-align: center; }
      .active { background-color: #e6f4ea; color: #137333; border: 1px solid #ceead6; }
      .inactive { background-color: #fce8e6; color: #c5221f; border: 1px solid #fad2cf; }
    </style>
    <h3>⏰ 定期収集の設定</h3>
    
    <div class="status ${hasTrigger ? 'active' : 'inactive'}">
      状態: <strong>${hasTrigger ? '有効 (自動収集中)' : '無効 (停止中)'}</strong>
    </div>
    
    <label>収集間隔:</label>
    <select id="interval">
      <option value="1" ${currentInterval == 1 ? 'selected' : ''}>1時間ごと</option>
      <option value="3" ${currentInterval == 3 ? 'selected' : ''}>3時間ごと</option>
      <option value="6" ${currentInterval == 6 ? 'selected' : ''}>6時間ごと</option>
      <option value="12" ${currentInterval == 12 ? 'selected' : ''}>12時間ごと</option>
      <option value="24" ${currentInterval == 24 ? 'selected' : ''}>24時間ごと</option>
    </select>
    
    ${hasTrigger 
      ? '<button class="disable" onclick="disable()">停止する</button>' 
      : '<button class="enable" onclick="enable()">開始する</button>'
    }
    
    <script>
      function enable() {
        const interval = document.getElementById('interval').value;
        google.script.run
          .withSuccessHandler(close)
          .withFailureHandler(alertError)
          .setTrigger(parseInt(interval));
      }
      
      function disable() {
        google.script.run
          .withSuccessHandler(close)
          .withFailureHandler(alertError)
          .deleteTriggers();
      }
      
      function close() {
        google.script.host.close();
      }
      function alertError(e) {
        alert('エラー: ' + e.message);
      }
    </script>
  `)
  .setWidth(350)
  .setHeight(320);
  
  ui.showModalDialog(html, '⏰ 定期収集設定');
}

/**
 * トリガーを設定
 */
function setTrigger(hours) {
  // 既存のトリガーを全削除
  deleteTriggers();
  
  // 新しいトリガーを作成
  ScriptApp.newTrigger('scheduledCollection')
    .timeBased()
    .everyHours(hours)
    .create();
    
  // 設定を保存
  saveSetting(SETTINGS_KEYS.AUTO_COLLECT_INTERVAL, hours);
  
  SpreadsheetApp.getUi().alert(`✅ 定期収集を開始しました\n\n${hours}時間ごとにRSSをチェックします。`);
}

/**
 * トリガーを削除
 */
function deleteTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === 'scheduledCollection') {
      ScriptApp.deleteTrigger(trigger);
    }
  }
}

// === 定期実行関数 ===

/**
 * 定期実行される関数
 */
function scheduledCollection() {
  console.log('定期収集開始...');
  try {
    const result = collectAllRss();
    console.log(`定期収集完了: ${result.total}件`);
  } catch (error) {
    console.error('定期収集エラー:', error);
  }
}
