# Google Slides生成機能の実装 (GAS側)

以下のコードを、Google Apps Scriptプロジェクト (`Code.gs` または新規ファイル) に追加してください。

## 1. `doPost` 関数の更新

既存の `doPost` 関数の `switch` 文に `create_slides` ケースを追加します。

```javascript
// doPost 内の switch 文に追加
    case 'create_slides':
        result = createPresentation(params.slides, params.metadata);
        break;
```

## 2. 新しい関数の追加

以下の関数をスクリプトファイル末尾に追加してください。

```javascript
/**
 * プレゼンテーションを作成
 */
function createPresentation(slides, metadata) {
  try {
    const title = metadata.title || 'Generated Presentation';
    const presentation = SlidesApp.create(title);
    const pId = presentation.getId();
    const pUrl = presentation.getUrl();
    
    // デフォルトのスライドを削除（最低1枚は残る仕様への対応は後述）
    const defaultSlides = presentation.getSlides();
    if (defaultSlides.length > 0) {
      // 最初のスライドをタイトルスライドとして使うか、後で削除するか
      // ここでは既存をすべて削除して作り直すアプローチ（ただし1枚残る）
    }

    // スライド生成ループ
    slides.forEach(function(slideData, index) {
      let slide;
      let layout;
      
      // レイアウト選択
      if (slideData.type === 'title' && index === 0) {
        layout = SlidesApp.PredefinedLayout.TITLE;
      } else if (slideData.type === 'comparison') {
        layout = SlidesApp.PredefinedLayout.TITLE_AND_TWO_COLUMNS; 
      } else {
        layout = SlidesApp.PredefinedLayout.TITLE_AND_BODY;
      }
      
      slide = presentation.appendSlide(layout);
      
      // タイトル設定
      const titleShape = slide.getPlaceholder(SlidesApp.PlaceholderType.TITLE) || slide.getPlaceholder(SlidesApp.PlaceholderType.CENTERED_TITLE);
      if (titleShape) {
        titleShape.asShape().getText().setText(slideData.title);
      }
      
      // コンテンツ設定
      const bodyShape = slide.getPlaceholder(SlidesApp.PlaceholderType.BODY);
      if (bodyShape && slideData.content) {
        const textContent = slideData.content.map(function(item) {
          return typeof item === 'string' ? item : item.text;
        }).join('\n');
        bodyShape.asShape().getText().setText(textContent);
      }
      
      // 画像挿入 (画像URLがある場合)
      if (slideData.image && slideData.image.url) {
        try {
          // 画像URLからBlobを取得できれば挿入
          // 注: Difyの一時URLはGASからアクセスできない場合があるため、
          // パブリックなURLであるか、Base64で送る必要がある
          // ここではプレースホルダー的に処理
          
          // slide.insertImage(imageUrl); 
        } catch (e) {
          console.log('Image insert failed: ' + e.toString());
        }
      }
      
      // スピーカーノート
      if (slideData.notes) {
        slide.getNotesPage().getSpeakerNotesShape().getText().setText(slideData.notes);
      }
    });

    // 最初にあったデフォルトスライドを削除（生成したスライドがある場合）
    if (presentation.getSlides().length > slides.length) {
       defaultSlides[0].remove();
    }

    return {
      success: true,
      url: pUrl,
      id: pId
    };
    
  } catch (e) {
    return {
      success: false,
      error: e.toString()
    };
  }
}
```

## 注意点
- **画像の扱い**: GASから `localhost` の画像にはアクセスできません。画像を含めるには、画像をパブリックなURL（S3やGCSなど）にアップロードするか、Base64エンコードして送信する必要があります（ただしペイロード制限に注意）。現状の実装ではテキストのみの生成を基本としています。
