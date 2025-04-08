// 使用Toastify显示提示
function showToast(message) {
    Toastify({
        text: message,
        duration: 2000,
        close: false,
        gravity: "center", // 居中显示
        position: "center", // 居中显示
        backgroundColor: "linear-gradient(to right, #1976D2, #2196F3)",
        className: "toast-message",
        stopOnFocus: false // 用户聚焦时不停止
    }).showToast();
}

// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

// 复制文本到剪贴板
function copyToClipboard(text) {
    return navigator.clipboard.writeText(text)
        .then(() => {
            showToast('内容已复制到剪贴板');
            return true;
        })
        .catch(err => {
            console.error('无法复制内容: ', err);
            showToast('复制失败，请手动复制内容');
            return false;
        });
} 