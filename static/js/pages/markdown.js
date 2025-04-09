// Markdown 内容页面专用 JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // 配置marked选项
    marked.setOptions({
        highlight: function(code, lang) {
            if (lang && hljs.getLanguage(lang)) {
                try { 
                    return hljs.highlight(code, { language: lang }).value;
                } catch(e) {}
            }
            return hljs.highlightAuto(code).value;
        },
        breaks: true,
        gfm: true
    });
    
    // 解码HTML实体
    function decodeHTMLEntities(text) {
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text;
        return textarea.value;
    }
    
    // 获取内容（在HTML模板中通过模板变量注入）
    var rawContent = contentData; // 由模板引擎注入的变量
    var decodedContent = decodeHTMLEntities(rawContent);

    // 渲染Markdown内容
    try {
        document.getElementById('content').innerHTML = marked.parse(decodedContent);
        
        // 应用代码高亮
        document.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightBlock(block);
        });
    } catch (e) {
        console.error("Markdown渲染错误:", e);
        document.getElementById('content').innerHTML = 
            '<div class="error-preview">Markdown 渲染失败，可能是内容格式有问题。<br>错误: ' + e.message + '</div>';
    }
    
    // 复制原始内容
    document.getElementById('copy-button').addEventListener('click', function() {
        copyToClipboard(decodedContent);
    });
}); 