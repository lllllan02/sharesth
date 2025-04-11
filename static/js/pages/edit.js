// 编辑内容页面专用 JavaScript

// 全局变量
let easyMDE = null;  // Markdown编辑器实例
let contentType = ''; // 内容类型
let contentId = ''; // 内容ID
let refererUrl = ''; // 来源URL

// 页面加载后执行
document.addEventListener('DOMContentLoaded', function() {
    // 初始化内容
    initContent();
    
    // 初始化预览切换
    initPreviewToggle();
    
    // 初始化保存按钮
    document.getElementById('save-content').addEventListener('click', saveContent);
});

// 初始化内容
function initContent() {
    // 检查是否有内容数据
    if (!contentData || !contentData.id) {
        showToast('无法获取内容数据，请返回重试', TOAST_TYPE.ERROR);
        return;
    }
    
    // 设置全局变量
    contentId = contentData.short_id;
    contentType = contentData.type;
    
    // 获取从模板传递的referer值
    refererUrl = window.refererUrl || '/my-content';
    
    // 设置标题
    document.getElementById('content-title').value = contentData.title || '';
    
    // 设置公开状态
    document.getElementById('is-public').checked = contentData.is_public || false;
    
    // 设置类型图标
    const typeBadge = document.getElementById('content-type-badge');
    if (contentType === 'markdown') {
        typeBadge.innerHTML = '<i class="fab fa-markdown"></i>';
        typeBadge.title = 'Markdown 内容';
        
        // 初始化Markdown编辑器
        initMarkdownEditor(contentData.content || '');
        
        // 显示Markdown编辑器容器，隐藏文本编辑器容器
        document.getElementById('markdown-editor-container').style.display = 'block';
        document.getElementById('text-editor-container').style.display = 'none';
        
        // 显示Markdown提示
        document.getElementById('markdown-tips').style.display = 'block';
        
        // 显示预览按钮
        document.getElementById('toggle-preview').style.display = 'inline-block';
    } else if (contentType === 'text') {
        typeBadge.innerHTML = '<i class="fas fa-file-alt"></i>';
        typeBadge.title = '文本内容';
        
        // 设置文本编辑器内容
        document.getElementById('text-editor').value = contentData.content || '';
        
        // 显示文本编辑器容器，隐藏Markdown编辑器容器
        document.getElementById('markdown-editor-container').style.display = 'none';
        document.getElementById('text-editor-container').style.display = 'block';
        
        // 隐藏Markdown提示
        document.getElementById('markdown-tips').style.display = 'none';
        
        // 隐藏预览按钮
        document.getElementById('toggle-preview').style.display = 'none';
    } else {
        // 不支持的类型
        showToast('不支持编辑该类型的内容', TOAST_TYPE.ERROR);
        // 延迟跳转回我的内容页面
        setTimeout(() => {
            window.location.href = '/my-content';
        }, 2000);
    }
}

// 初始化Markdown编辑器
function initMarkdownEditor(content) {
    // 创建EasyMDE编辑器
    easyMDE = new EasyMDE({
        element: document.getElementById('markdown-editor'),
        spellChecker: false,
        status: ['lines', 'words'],
        renderingConfig: {
            codeSyntaxHighlighting: true,
        },
        toolbar: ['bold', 'italic', 'heading', '|', 
                 'quote', 'unordered-list', 'ordered-list', '|',
                 'link', 'image', 'table', '|',
                 'preview', 'side-by-side', 'fullscreen', '|',
                 'guide'],
        placeholder: '请输入Markdown内容...',
        initialValue: content,
        autofocus: true,
        autoRefresh: true,
        tabSize: 4,
        toolbarTips: true,
        toolbarGuideIcon: true,
        imageUploadFunction: function(file, onSuccess, onError) {
            const formData = new FormData();
            formData.append('image', file);
            
            fetch('/upload/image', {
                method: 'POST',
                body: formData
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('服务器响应错误: ' + response.status);
                }
                return response.json();
            })
            .then(result => {
                console.log('图片上传响应:', result);
                if (result.success && result.file && result.file.url) {
                    onSuccess(result.file.url);
                } else {
                    onError(result.error || '上传失败');
                }
            })
            .catch(error => {
                console.error('上传图片失败:', error);
                onError('上传图片失败: ' + error.message);
            });
        }
    });
    
    // 全局导出编辑器实例，以便其他函数可以访问
    window.easyMDE = easyMDE;
}

// 初始化预览切换
function initPreviewToggle() {
    document.getElementById('toggle-preview').addEventListener('click', function() {
        const previewContainer = document.getElementById('preview-container');
        
        if (previewContainer.classList.contains('hidden')) {
            // 显示预览前清空容器
            previewContainer.innerHTML = '';
            
            // 显示预览
            previewContainer.classList.remove('hidden');
            
            try {
                // 渲染 Markdown 内容
                const markdownContent = easyMDE.value();
                if (markdownContent.trim()) {
                    // 使用 marked 解析 Markdown
                    const html = marked.parse(markdownContent);
                    previewContainer.innerHTML = html;
                    
                    // 应用代码高亮
                    previewContainer.querySelectorAll('pre code').forEach((block) => {
                        hljs.highlightBlock(block);
                    });
                } else {
                    previewContainer.innerHTML = '<div class="empty-preview">请先输入 Markdown 内容</div>';
                }
            } catch (error) {
                console.error('Markdown 渲染出错:', error);
                previewContainer.innerHTML = '<div class="error-preview">Markdown 渲染失败，请检查内容格式</div>';
            }
            
            this.innerHTML = '<i class="fas fa-eye-slash"></i> 隐藏预览';
        } else {
            // 隐藏预览
            previewContainer.classList.add('hidden');
            this.innerHTML = '<i class="fas fa-eye"></i> 显示预览';
        }
    });
}

// 保存内容
function saveContent() {
    // 获取按钮元素
    const button = document.getElementById('save-content');
    const originalHTML = button.innerHTML;
    
    // 获取标题和公开状态
    const title = document.getElementById('content-title').value.trim();
    const isPublic = document.getElementById('is-public').checked;
    
    // 获取内容
    let content = '';
    if (contentType === 'markdown') {
        content = easyMDE.value().trim();
        if (!content) {
            showToast('请输入要保存的 Markdown 内容', TOAST_TYPE.WARNING);
            return;
        }
    } else if (contentType === 'text') {
        content = document.getElementById('text-editor').value.trim();
        if (!content) {
            showToast('请输入要保存的文本内容', TOAST_TYPE.WARNING);
            return;
        }
    }
    
    // 禁用按钮，显示加载状态
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 保存中...';
    
    // 构建表单数据
    const formData = new FormData();
    formData.append('content_id', contentId);
    formData.append('content', content);
    formData.append('type', contentType);
    if (title) {
        formData.append('title', title);
    }
    formData.append('is_public', isPublic ? 'true' : 'false');
    
    // 发送更新请求 - 使用新的API路径
    fetch('/api/contents', {
        method: 'PUT',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('保存内容失败，请重试');
        }
        return response.json();
    })
    .then(data => {
        // 恢复按钮状态
        button.disabled = false;
        button.innerHTML = originalHTML;
        
        if (data.success) {
            // 显示成功消息
            showToast(data.message || '内容已成功保存', TOAST_TYPE.SUCCESS);
            
            // 确定返回的URL
            let returnUrl = refererUrl;
            
            // 检查返回URL是否是详情页(/shortID)
            if (returnUrl && returnUrl.match(/\/[A-Za-z0-9]{8}(?:\?.*)?$/)) {
                // 如果来源是详情页，那么返回到那里
                setTimeout(() => {
                    window.location.href = returnUrl;
                }, 1500);
            } else {
                // 否则返回到内容详情页
                setTimeout(() => {
                    window.location.href = `${contentId}`;
                }, 1500);
            }
        } else {
            // 显示错误消息
            throw new Error(data.error || '保存失败，请重试');
        }
    })
    .catch(error => {
        // 恢复按钮状态
        button.disabled = false;
        button.innerHTML = originalHTML;
        
        // 显示错误消息
        showToast(error.message || '保存失败，请重试', TOAST_TYPE.ERROR);
    });
}
