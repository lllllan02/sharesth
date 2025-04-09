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

// 禁用按钮函数
function disableButton(button, text) {
    button.disabled = true;
    button.style.backgroundColor = '#BBDEFB';
    button.style.cursor = 'not-allowed';
    button.innerHTML = text || '<i class="fas fa-spinner fa-spin"></i> 处理中...';
}

// 重置按钮状态
function resetButton(button, originalText) {
    button.disabled = false;
    button.style.backgroundColor = '#2196F3';
    button.style.cursor = 'pointer';
    button.innerHTML = originalText;
}

// 内容预览 - 简单处理Markdown文本，用于预览
function simplifyMarkdown(text) {
    // 移除所有Markdown特殊字符和标记
    
    // 移除图片语法
    text = text.replace(/!\[.*?\]\(.*?\)/g, '');
    
    // 移除链接语法，只保留链接文本
    text = text.replace(/\[(.*?)\]\(.*?\)/g, '$1');
    
    // 移除标题符号
    text = text.replace(/^#+\s+/gm, '');
    
    // 移除强调符号
    text = text.replace(/\*\*(.*?)\*\*/g, '$1');
    text = text.replace(/\*(.*?)\*/g, '$1');
    text = text.replace(/__(.*?)__/g, '$1');
    text = text.replace(/_(.*?)_/g, '$1');
    
    // 移除代码块
    text = text.replace(/```[\s\S]*?```/g, '');
    
    // 移除行内代码
    text = text.replace(/`(.*?)`/g, '$1');
    
    // 移除引用符号
    text = text.replace(/^>\s+/gm, '');
    
    // 移除分隔线
    text = text.replace(/^-{3,}$|^_{3,}$/gm, '');
    
    // 移除列表符号
    text = text.replace(/^[\*\-+]\s+/gm, '');
    text = text.replace(/^\d+\.\s+/gm, '');
    
    // 移除多余空行和合并空白
    text = text.replace(/\n{2,}/g, ' ');
    text = text.replace(/\s+/g, ' ');
    
    return text.trim();
}

// 工具提示初始化函数
function initTooltips() {
    const tooltipIcons = document.querySelectorAll('.tooltip-icon');
    tooltipIcons.forEach(icon => {
        icon.addEventListener('mouseenter', function(e) {
            // 创建工具提示元素
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.textContent = this.getAttribute('data-tooltip');
            
            // 先添加到DOM但不可见，以便计算尺寸
            tooltip.style.visibility = 'hidden';
            document.body.appendChild(tooltip);
            
            // 获取图标和工具提示的位置信息
            const iconRect = this.getBoundingClientRect();
            const tooltipRect = tooltip.getBoundingClientRect();
            
            // 计算位置 - 在图标上方居中
            const top = iconRect.top - tooltipRect.height - 10;
            const left = iconRect.left + (iconRect.width/2) - (tooltipRect.width/2);
            
            // 设置位置并显示
            tooltip.style.top = Math.max(5, top) + window.scrollY + 'px'; // 确保不超出顶部
            tooltip.style.left = Math.max(5, left) + window.scrollX + 'px';
            tooltip.style.visibility = 'visible';
        });
        
        icon.addEventListener('mouseleave', function() {
            const tooltips = document.querySelectorAll('.tooltip');
            tooltips.forEach(t => t.remove());
        });
    });
}

// 内容分享功能
function uploadContent(formData, button, originalHTML) {
    fetch('/share', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('服务器响应错误: ' + response.status);
        }
        return response.json();
    })
    .then(data => {
        console.log('服务器响应:', data); // 添加调试信息
        if (data.error) {
            throw new Error(data.error);
        }
        
        // 显示结果并自动复制链接到剪贴板
        const shortLink = data.shortLink;
        document.getElementById('shortlink').textContent = shortLink;
        document.getElementById('result').classList.remove('hidden');
        
        // 自动复制到剪贴板
        copyToClipboard(shortLink);
        
        // 显示成功提示
        const contentType = formData.get('type');
        const typeText = contentType === 'markdown' ? 'Markdown' : 
                        contentType === 'text' ? '文本' : '图片';
        showToast(`${typeText}内容分享成功！链接已复制到剪贴板`);
        
        // 禁用输入区域
        document.getElementById('content-title').setAttribute('readonly', 'readonly');
        
        // 禁用公开设置复选框
        const isPublicCheckbox = document.getElementById('is-public');
        isPublicCheckbox.disabled = true;
        isPublicCheckbox.parentElement.style.opacity = '0.7';
        isPublicCheckbox.parentElement.style.cursor = 'not-allowed';
        
        const activeContent = document.querySelector('.content:not(.hidden)');
        if (activeContent.id === 'markdown-content') {
            // 禁用Markdown编辑器
            if (window.easyMDE) {
                window.easyMDE.codemirror.setOption('readOnly', true);
            }
            
            // 禁用Markdown编辑器工具栏
            document.querySelectorAll('.editor-toolbar button, .editor-toolbar a').forEach(btn => {
                btn.classList.add('disabled');
                btn.style.opacity = '0.5';
                btn.style.pointerEvents = 'none';
            });
            
            // 禁用分享按钮
            document.getElementById('share-md').disabled = true;
            document.getElementById('share-md').style.opacity = '0.5';
            document.getElementById('share-md').style.pointerEvents = 'none';
            
            // 禁用预览切换
            document.getElementById('toggle-preview').style.opacity = '0.5';
            document.getElementById('toggle-preview').style.pointerEvents = 'none';
            
        } else if (activeContent.id === 'text-content') {
            document.getElementById('text-editor').setAttribute('readonly', 'readonly');
            
            // 禁用文本分享按钮
            document.getElementById('share-text').disabled = true;
            document.getElementById('share-text').style.opacity = '0.5';
            document.getElementById('share-text').style.pointerEvents = 'none';
            
        } else if (activeContent.id === 'image-content') {
            // 禁用图片分享按钮
            document.getElementById('share-image').disabled = true;
            document.getElementById('share-image').style.opacity = '0.5';
            document.getElementById('share-image').style.pointerEvents = 'none';
        }
        
        // 重置按钮
        resetButton(button, originalHTML);
    })
    .catch(error => {
        console.error('上传失败:', error);
        showToast('上传失败: ' + error.message);
        resetButton(button, originalHTML);
    });
}

// 切换内容可见性
function toggleContentVisibility(element, contentId) {
    // 禁用元素，防止重复点击
    element.style.pointerEvents = 'none';
    
    // 准备表单数据
    const formData = new FormData();
    formData.append('content_id', contentId);
    
    // 发送请求
    fetch('/api/toggle-visibility', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // 更新状态标签
            const statusBadge = element.querySelector('.status-badge');
            
            if (data.is_public) {
                statusBadge.className = 'status-badge public';
                statusBadge.textContent = '公开';
            } else {
                statusBadge.className = 'status-badge private';
                statusBadge.textContent = '私密';
            }
            
            // 更新数据属性
            element.dataset.public = data.is_public;
            
            // 显示成功消息
            showToast(data.message);
        } else {
            throw new Error(data.error || '操作失败');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showToast('操作失败: ' + error.message);
    })
    .finally(() => {
        // 重新启用元素
        element.style.pointerEvents = 'auto';
    });
}

// DOM 加载完成后初始化工具提示
document.addEventListener('DOMContentLoaded', function() {
    initTooltips();
}); 