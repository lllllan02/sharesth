// 图片内容页面专用 JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // 复制当前页面链接
    document.getElementById('copy-button').addEventListener('click', function() {
        const currentUrl = window.location.href;
        copyToClipboard(currentUrl);
    });
}); 