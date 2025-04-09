// 纯文本内容页面专用 JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // 复制内容
    document.getElementById('copy-button').addEventListener('click', function() {
        const content = document.getElementById('content').textContent;
        copyToClipboard(content);
    });
}); 