// 定义Toast提示类型常量
const TOAST_TYPE = {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info',
    DEFAULT: 'default'
};

// 定义模态框类型常量
const MODAL_TYPE = {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info',
    QUESTION: 'question'
};

// 使用Toastify显示提示
function showToast(message, type = TOAST_TYPE.SUCCESS) {
    // 定义不同类型提示的颜色
    const colors = {
        [TOAST_TYPE.SUCCESS]: '#4CAF50',   // 绿色 - 成功提示
        [TOAST_TYPE.ERROR]: '#F44336',     // 红色 - 错误提示
        [TOAST_TYPE.WARNING]: '#FF9800',   // 橙色 - 警告提示
        [TOAST_TYPE.INFO]: '#2196F3',      // 蓝色 - 信息提示
        [TOAST_TYPE.DEFAULT]: '#757575'    // 灰色 - 默认提示
    };
    
    // 获取颜色，如果类型不存在则使用默认颜色
    const backgroundColor = colors[type] || colors[TOAST_TYPE.DEFAULT];
    
    Toastify({
        text: message,
        duration: 3000,
        close: true,
        gravity: "top",
        position: "center",
        backgroundColor: backgroundColor,
        className: `toast-message toast-${type}`,
    }).showToast();
}

// 使用SweetAlert2显示模态框提示
function showModal(options) {
    return Swal.fire(options);
}

// 显示确认对话框
function showConfirm(options) {
    const defaultOptions = {
        title: '确认操作',
        text: '您确定要执行此操作吗？',
        icon: MODAL_TYPE.QUESTION,
        showCancelButton: true,
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        focusCancel: true
    };
    
    // 合并选项
    const mergedOptions = {...defaultOptions, ...options};
    
    return Swal.fire(mergedOptions);
}

// 显示成功模态框
function showSuccess(title, text) {
    return showModal({
        title: title || '操作成功',
        text: text,
        icon: MODAL_TYPE.SUCCESS,
        confirmButtonText: '确定'
    });
}

// 显示错误模态框
function showError(title, text) {
    return showModal({
        title: title || '操作失败',
        text: text,
        icon: MODAL_TYPE.ERROR,
        confirmButtonText: '确定'
    });
}

// 显示警告模态框
function showWarning(title, text) {
    return showModal({
        title: title || '警告',
        text: text,
        icon: MODAL_TYPE.WARNING,
        confirmButtonText: '确定'
    });
}

// 显示信息模态框
function showInfo(title, text) {
    return showModal({
        title: title || '提示信息',
        text: text,
        icon: MODAL_TYPE.INFO,
        confirmButtonText: '确定'
    });
}

// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(function() {
            func.apply(context, args);
        }, wait);
    };
}

// 复制文本到剪贴板
function copyToClipboard(text) {
    return navigator.clipboard.writeText(text)
        .then(() => {
            showToast('内容已复制到剪贴板', TOAST_TYPE.SUCCESS);
            return true;
        })
        .catch(err => {
            console.error('无法复制内容: ', err);
            showToast('复制失败，请手动复制内容', TOAST_TYPE.ERROR);
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
    // 使用新的API路径
    fetch('/api/contents', {
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
        showToast(`${typeText}内容分享成功！链接已复制到剪贴板`, TOAST_TYPE.SUCCESS);
        
        // 禁用输入区域
        document.getElementById('content-title').setAttribute('readonly', 'readonly');
        
        // 禁用公开设置复选框
        const isPublicCheckbox = document.getElementById('is-public');
        isPublicCheckbox.disabled = true;
        isPublicCheckbox.parentElement.style.opacity = '0.7';
        isPublicCheckbox.parentElement.style.cursor = 'not-allowed';
        
        const activeContent = document.querySelector('.content:not(.hidden)');
        
        // 根据内容类型禁用不同的元素
        if (contentType === 'markdown') {
            if (window.easyMDE) {
                window.easyMDE.codemirror.setOption('readOnly', true);
                document.querySelector('.editor-toolbar').style.display = 'none';
            }
        } else if (contentType === 'text') {
            document.getElementById('text-content').setAttribute('readonly', 'readonly');
        } else if (contentType === 'image') {
            document.getElementById('image-selector').style.display = 'none';
        }
        
        // 隐藏分享按钮，显示返回或创建新内容按钮
        button.style.display = 'none';
        document.getElementById('new-btn').style.display = 'inline-block';
    })
    .catch(error => {
        console.error('Error:', error);
        
        // 恢复按钮状态
        button.disabled = false;
        button.innerHTML = originalHTML;
        
        // 显示错误消息
        showToast(`分享失败: ${error.message}`, TOAST_TYPE.ERROR);
    });
}

// 切换内容可见性
function toggleContentVisibility(element, contentId) {
    // 禁用元素，防止重复点击
    element.style.pointerEvents = 'none';
    
    // 准备表单数据
    const formData = new FormData();
    formData.append('content_id', contentId);
    
    // 发送请求 - 使用新的API路径
    fetch('/api/contents/visibility', {
        method: 'PATCH',
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
            showToast(data.message, TOAST_TYPE.SUCCESS);
        } else {
            throw new Error(data.error || '操作失败');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showToast('操作失败: ' + error.message, TOAST_TYPE.ERROR);
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

// 导航栏智能显示/隐藏功能
document.addEventListener('DOMContentLoaded', function() {
    // 获取header元素
    const header = document.querySelector('.header-wrapper');
    if (!header) return; // 如果页面没有header，则直接返回
    
    let lastScrollTop = 0;
    const headerHeight = header.offsetHeight;
    const minScrollDistance = 30; // 最小滚动距离阈值，滚动超过这个距离才触发隐藏
    
    // 使用防抖函数包装滚动事件处理，提高性能并使慢速滚动也能被检测
    const scrollHandler = function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // 始终在顶部附近时显示导航栏
        if (scrollTop <= headerHeight) {
            header.classList.remove('headroom--unpinned');
            header.classList.add('headroom--pinned');
            header.classList.add('headroom--top');
            header.classList.remove('headroom--not-top');
            lastScrollTop = scrollTop;
            return;
        }
        
        // 不在顶部时添加阴影效果
        header.classList.remove('headroom--top');
        header.classList.add('headroom--not-top');
        
        // 计算滚动距离
        const scrollDistance = Math.abs(scrollTop - lastScrollTop);
        
        // 只有滚动距离超过阈值时才触发隐藏/显示
        if (scrollDistance >= minScrollDistance) {
            // 向下滚动超过阈值隐藏导航栏
            if (scrollTop > lastScrollTop) {
                header.classList.remove('headroom--pinned');
                header.classList.add('headroom--unpinned');
            } 
            // 向上滚动时立即显示导航栏，无需达到阈值
            else {
                header.classList.remove('headroom--unpinned');
                header.classList.add('headroom--pinned');
            }
            
            // 更新上次滚动位置
            lastScrollTop = scrollTop;
        }
        // 如果是向上滚动，即使距离很小也显示导航栏（更敏感的向上响应）
        else if (scrollTop < lastScrollTop) {
            header.classList.remove('headroom--unpinned');
            header.classList.add('headroom--pinned');
            // 更新上次滚动位置
            lastScrollTop = scrollTop;
        }
    };
    
    // 不使用防抖，以便能立即响应滚动
    window.addEventListener('scroll', scrollHandler);
    
    // 确保初始状态正确
    header.classList.add('headroom');
    header.classList.add('headroom--pinned');
    if (window.pageYOffset <= headerHeight) {
        header.classList.add('headroom--top');
    } else {
        header.classList.add('headroom--not-top');
    }
}); 