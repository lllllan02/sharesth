// 编辑页面JavaScript

// 全局变量
let editor = null;
let contentData, contentType, contentId, contentTitle, isPublic;

document.addEventListener('DOMContentLoaded', function() {
    // 确保saveContent函数在全局范围可用
    window.saveContent = saveContent;
    
    // 从body的data属性读取数据
    readDataAttributes();
    
    // 初始化页面
    initPage();
    
    // 绑定事件处理程序
    bindEvents();
});

// 从body的data属性读取数据
function readDataAttributes() {
    const body = document.body;
    const contentRaw = body.getAttribute('data-content');
    
    try {
        // 尝试解析JSON格式的内容
        contentData = JSON.parse(contentRaw);
    } catch (e) {
        // 如果不是有效JSON，则使用原始字符串
        contentData = contentRaw;
    }
    
    contentType = body.getAttribute('data-type');
    contentId = body.getAttribute('data-id');
    contentTitle = body.getAttribute('data-title');
    isPublic = body.getAttribute('data-public') === 'true';
}

// 初始化页面
function initPage() {
    // 公开状态切换
    const publicCheckbox = document.getElementById('isPublic');
    if (publicCheckbox) {
        publicCheckbox.addEventListener('change', function() {
            updateVisibilityStatus();
        });
        // 初始化状态
        updateVisibilityStatus();
    }
    
    // 初始化Markdown编辑器
    if (contentType === 'markdown') {
        initMarkdownEditor();
    }
    
    // 绑定保存按钮点击事件
    const saveButton = document.getElementById('saveButton');
    if (saveButton) {
        saveButton.addEventListener('click', function(e) {
            saveContent(e);
        });
    }
    
    // 添加表单提交拦截（以防万一）
    const form = document.getElementById('editForm');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            return false;
        });
    }
}

// 初始化Markdown编辑器
function initMarkdownEditor() {
    if(contentType !== 'markdown') return;
    
    const contentTextarea = document.getElementById('content');
    if(!contentTextarea) return;
    
    // 工具栏配置
    const toolbar = [
        'bold', 'italic', 'strikethrough', 'heading', '|', 
        'code', 'quote', 'unordered-list', 'ordered-list', '|',
        'link', 'image', 'table', 'horizontal-rule', '|',
        'preview', 'side-by-side', 'fullscreen', '|',
        'guide'
    ];
    
    // 初始化编辑器
    editor = new EasyMDE({
        element: contentTextarea,
        spellChecker: false,
        inputStyle: 'contenteditable',
        nativeSpellcheck: true,
        toolbar: toolbar,
        autoDownloadFontAwesome: false,
        placeholder: '在这里输入Markdown内容...',
        status: ['lines', 'words', 'cursor'],
        uploadImage: true,
        imageUploadEndpoint: '/api/upload/image',
        autosave: {
            enabled: true,
            uniqueId: 'editContent' + contentId,
            delay: 1000,
        },
        renderingConfig: {
            singleLineBreaks: false,
            codeSyntaxHighlighting: true,
        },
        tabSize: 4,
        previewRender: function(plainText) {
            return marked.parse(plainText);
        }
    });
    
    // 确保编辑器样式正确加载
    setTimeout(() => {
        const editorElement = document.querySelector('.CodeMirror');
        if (editorElement) {
            editorElement.style.height = '350px';
            editorElement.style.fontSize = '16px';
        }
    }, 100);
    
    // 初始化预览功能
    const togglePreview = document.getElementById('toggle-preview');
    const previewContainer = document.getElementById('preview-container');
    
    if (togglePreview && previewContainer) {
        togglePreview.addEventListener('click', function() {
            if (previewContainer.classList.contains('hidden')) {
                // 显示预览
                previewContainer.classList.remove('hidden');
                togglePreview.innerHTML = '<i class="fas fa-eye-slash"></i> 隐藏预览';
                
                // 更新预览内容
                const markdownContent = editor.value();
                if (markdownContent.trim() !== '') {
                    previewContainer.innerHTML = marked.parse(markdownContent);
                } else {
                    previewContainer.innerHTML = '<div class="empty-preview">预览区域为空，请在编辑器中输入内容</div>';
                }
            } else {
                // 隐藏预览
                previewContainer.classList.add('hidden');
                togglePreview.innerHTML = '<i class="fas fa-eye"></i> 显示预览';
            }
        });
    }
}

// 绑定事件处理程序
function bindEvents() {
    // 处理公开设置切换
    const isPublicCheckbox = document.getElementById('isPublic');
    const visibilityStatus = document.getElementById('visibilityStatus');
    
    if (isPublicCheckbox && visibilityStatus) {
        isPublicCheckbox.addEventListener('change', function() {
            visibilityStatus.textContent = this.checked ? '公开' : '不公开';
            visibilityStatus.style.color = this.checked ? 'var(--success-color)' : '#666';
        });

        // 初始样式
        visibilityStatus.style.color = isPublicCheckbox.checked ? 'var(--success-color)' : '#666';
    }
}

// 给表单元素添加渐入动画
function animateFormElements() {
    const formElements = document.querySelectorAll('.form-group, .form-actions');
    
    formElements.forEach((element, index) => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(10px)';
        element.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        
        setTimeout(() => {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }, 100 + (index * 50)); // 错开时间，产生连续动画效果
    });
}

// 更新可见性状态显示
function updateVisibilityStatus() {
    const checkbox = document.getElementById('isPublic');
    const statusElement = document.getElementById('visibilityStatus');
    
    if (checkbox && statusElement) {
        if (checkbox.checked) {
            statusElement.innerHTML = '公开此内容 <i class="fas fa-question-circle tooltip-icon" data-tooltip="公开内容将显示在公共页面上，任何人都可以浏览"></i>';
        } else {
            statusElement.innerHTML = '仅自己可见 <i class="fas fa-question-circle tooltip-icon" data-tooltip="私密内容只有您自己能够访问"></i>';
        }
    }
}

// 保存内容
function saveContent(e) {
    // 防止任何可能的默认行为
    if (e && typeof e.preventDefault === 'function') {
        e.preventDefault();
    }
    
    // 禁用提交按钮，显示加载状态
    const saveBtn = document.getElementById('saveButton');
    if (!saveBtn) {
        return;
    }
    
    const originalBtnText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 保存中...';
    
    // 创建表单数据
    const formData = new FormData();
    
    // 获取表单数据
    const contentId = document.getElementById('contentId').value;
    const title = document.getElementById('title').value;
    const type = document.getElementById('contentType').value;
    const isPublic = document.getElementById('isPublic').checked;
    
    formData.append('content_id', contentId);
    formData.append('title', title);
    formData.append('type', type);
    formData.append('is_public', isPublic ? 'true' : 'false');
    
    // 根据内容类型获取内容
    if (contentType === 'markdown') {
        if (editor) {
            formData.append('content', editor.value());
        } else {
            formData.append('content', document.getElementById('content').value);
        }
    } else if (contentType === 'text') {
        formData.append('content', document.getElementById('content').value);
    } else if (contentType === 'image') {
        // 图片类型不需要发送content字段，服务器会保留原始图片路径
    }
    
    // 发送更新请求
    fetch('/api/contents/update', {
        method: 'POST',
        body: formData,
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.error || '更新内容失败');
            });
        }
        return response.json();
    })
    .then(data => {
        // 显示成功消息
        showToast(data.message || '内容已成功更新', 'success');
        
        // 立即返回上一页
        history.back();
    })
    .catch(error => {
        // 显示错误消息
        showToast(error.message || '更新内容失败', 'error');
        
        // 恢复提交按钮状态
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalBtnText;
    });
}

// 显示通知
function showToast(message, type = 'info') {
    const bgColor = type === 'success' ? 'var(--success-color)' : 
                   type === 'error' ? 'var(--error-color)' : 
                   type === 'warning' ? '#ffc107' : '#17a2b8';
    
    // 成功消息显示更长时间
    const duration = type === 'success' ? 5000 : 3000;
    
    Toastify({
        text: message,
        duration: duration,
        gravity: "top",
        position: 'center',
        backgroundColor: bgColor,
        stopOnFocus: true,
        className: type === 'success' ? "toast-success" : type === 'error' ? "toast-error" : "",
        onClick: function(){} // 关闭回调
    }).showToast();
} 