// 首页专用 JavaScript

// 全局变量
let easyMDE; // Markdown 编辑器实例

// 页面加载完成后的初始化
document.addEventListener('DOMContentLoaded', function() {
    // 初始化 Markdown 编辑器
    initMarkdownEditor();
    
    // 初始化标签切换
    initTabSwitching();
    
    // 初始化预览切换
    initPreviewToggle();
    
    // 初始化图片上传预览
    initImageUploadPreview();
    
    // 初始化各种按钮事件
    initButtonEvents();
    
    // 初始化社交分享
    initSocialSharing();
});

// 初始化 Markdown 编辑器
function initMarkdownEditor() {
    easyMDE = new EasyMDE({
        element: document.getElementById('md-editor'),
        spellChecker: false,
        autofocus: true,
        placeholder: '在这里编写您要分享的 Markdown 内容...',
        toolbar: [
            'bold', 'italic', 'heading', '|', 
            'quote', 'unordered-list', 'ordered-list', '|',
            'link', 
            {
                name: 'custom-image',
                action: function(editor) {
                    const cm = editor.codemirror;
                    const stat = editor.getState(cm);
                    const options = editor.options;
                    const imageUploadFunction = options.imageUploadFunction;
                    
                    // 创建文件输入框
                    const fileInput = document.createElement('input');
                    fileInput.type = 'file';
                    fileInput.accept = 'image/*';
                    fileInput.style.display = 'none';
                    document.body.appendChild(fileInput);
                    
                    // 模拟点击文件输入框
                    fileInput.click();
                    
                    // 监听文件选择事件
                    fileInput.onchange = function() {
                        if (fileInput.files && fileInput.files.length > 0) {
                            const file = fileInput.files[0];
                            
                            // 显示加载提示
                            const cursor = cm.getCursor();
                            const placeholderText = `![上传中...](正在上传 ${file.name})`;
                            cm.replaceRange(placeholderText, cursor);
                            
                            // 调用上传函数
                            if (imageUploadFunction) {
                                imageUploadFunction(file, 
                                    // 成功回调
                                    function(url) {
                                        const imageMarkdown = `![${file.name}](${url})`;
                                        cm.setValue(cm.getValue().replace(placeholderText, imageMarkdown));
                                        showToast('图片上传成功！');
                                    },
                                    // 失败回调
                                    function(error) {
                                        cm.setValue(cm.getValue().replace(placeholderText, ''));
                                        showToast('图片上传失败: ' + error);
                                    }
                                );
                            }
                        }
                        
                        // 清理文件输入框
                        document.body.removeChild(fileInput);
                    };
                },
                className: 'fa fa-upload',
                title: '上传图片',
            },
            'image', 'table', '|',
            'preview', 'side-by-side', 'fullscreen', '|',
            'guide'
        ],
        status: false,
        renderingConfig: {
            codeSyntaxHighlighting: true,
        },
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

// 初始化标签切换
function initTabSwitching() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            // 如果已经显示了结果，先重置表单
            if (!document.getElementById('result').classList.contains('hidden')) {
                resetForm();
            }
            
            // 移除所有标签的active类
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            // 给当前点击的标签添加active类
            this.classList.add('active');
            
            // 隐藏所有内容
            document.querySelectorAll('.content').forEach(content => content.classList.add('hidden'));
            
            // 显示对应的内容
            const type = this.getAttribute('data-type');
            document.getElementById(`${type}-content`).classList.remove('hidden');
            
            // 显示或隐藏 Markdown 小技巧
            if (type === 'markdown') {
                document.getElementById('markdown-tips').style.display = 'block';
            } else {
                document.getElementById('markdown-tips').style.display = 'none';
            }
        });
    });
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

// 初始化图片上传预览
function initImageUploadPreview() {
    document.getElementById('image-upload').addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const previewWrapper = document.getElementById('image-preview-wrapper');
                const previewImage = document.getElementById('preview-image');
                
                previewImage.src = e.target.result;
                previewImage.style.display = 'block';
                previewWrapper.classList.remove('hidden');
                
                // 启用分享按钮
                document.getElementById('share-image').disabled = false;
            };
            reader.readAsDataURL(file);
        }
    });
}

// 初始化按钮事件
function initButtonEvents() {
    // 继续分享按钮事件
    document.getElementById('reset-form').addEventListener('click', function() {
        resetForm();
    });
    
    // 复制链接
    document.getElementById('copy-button').addEventListener('click', function() {
        const shortlink = document.getElementById('shortlink').textContent;
        copyToClipboard(shortlink);
    });
    
    // Markdown 分享
    document.getElementById('share-md').addEventListener('click', function() {
        const button = this;
        const originalHTML = button.innerHTML;
        
        const mdContent = easyMDE.value().trim();
        if (!mdContent) {
            showToast('请输入要分享的 Markdown 内容');
            return;
        }
        
        disableButton(button);
        
        const title = document.getElementById('content-title').value.trim();
        const isPublic = document.getElementById('is-public').checked;
        
        const formData = new FormData();
        formData.append('content', mdContent);
        formData.append('type', 'markdown');
        if (title) {
            formData.append('title', title);
        }
        formData.append('is_public', isPublic ? 'true' : 'false');
        
        uploadContent(formData, button, originalHTML);
    });
    
    // 文本分享
    document.getElementById('share-text').addEventListener('click', function() {
        const button = this;
        const originalHTML = button.innerHTML;
        
        const textContent = document.getElementById('text-editor').value.trim();
        if (!textContent) {
            showToast('请输入要分享的文本内容');
            return;
        }
        
        disableButton(button);
        
        const title = document.getElementById('content-title').value.trim();
        const isPublic = document.getElementById('is-public').checked;
        
        const formData = new FormData();
        formData.append('content', textContent);
        formData.append('type', 'text');
        if (title) {
            formData.append('title', title);
        }
        formData.append('is_public', isPublic ? 'true' : 'false');
        
        uploadContent(formData, button, originalHTML);
    });
    
    // 图片分享
    document.getElementById('share-image').addEventListener('click', function() {
        const button = this;
        const originalHTML = button.innerHTML;
        
        const imageFile = document.getElementById('image-upload').files[0];
        if (!imageFile) {
            showToast('请选择要分享的图片');
            return;
        }
        
        disableButton(button);
        
        const title = document.getElementById('content-title').value.trim();
        const isPublic = document.getElementById('is-public').checked;
        
        const formData = new FormData();
        formData.append('file', imageFile);
        formData.append('type', 'image');
        if (title) {
            formData.append('title', title);
        }
        formData.append('is_public', isPublic ? 'true' : 'false');
        
        uploadContent(formData, button, originalHTML);
    });
}

// 初始化社交分享
function initSocialSharing() {
    // 微信分享
    document.getElementById('wechat-share').addEventListener('click', function() {
        const shortLink = document.getElementById('shortlink').textContent;
        showToast('请打开微信扫一扫，扫描链接二维码分享');
        window.open(`https://w.url.cn/s/A${encodeURIComponent(shortLink)}`);
    });
    
    // QQ分享
    document.getElementById('qq-share').addEventListener('click', function() {
        const shortLink = document.getElementById('shortlink').textContent;
        const title = document.getElementById('content-title').value.trim() || '分享内容';
        window.open(`https://connect.qq.com/widget/shareqq/index.html?url=${encodeURIComponent(shortLink)}&title=${encodeURIComponent(title)}`);
    });
    
    // 微博分享
    document.getElementById('weibo-share').addEventListener('click', function() {
        const shortLink = document.getElementById('shortlink').textContent;
        const title = document.getElementById('content-title').value.trim() || '分享内容';
        window.open(`https://service.weibo.com/share/share.php?url=${encodeURIComponent(shortLink)}&title=${encodeURIComponent(title)}`);
    });
}

// 重置表单
function resetForm() {
    // 清除标题
    document.getElementById('content-title').value = '';
    document.getElementById('content-title').removeAttribute('readonly');
    
    // 重置 Markdown 编辑器
    easyMDE.value('');
    easyMDE.codemirror.setOption('readOnly', false);
    
    // 重置Markdown编辑器工具栏
    document.querySelectorAll('.editor-toolbar button, .editor-toolbar a').forEach(btn => {
        btn.classList.remove('disabled');
        btn.style.opacity = '';
        btn.style.pointerEvents = '';
    });
    
    // 重置预览切换
    document.getElementById('toggle-preview').style.opacity = '';
    document.getElementById('toggle-preview').style.pointerEvents = '';
    
    // 重置文本编辑器
    document.getElementById('text-editor').value = '';
    document.getElementById('text-editor').removeAttribute('readonly');
    
    // 重置图片上传
    document.getElementById('image-upload').value = '';
    document.getElementById('preview-image').src = '#';
    document.getElementById('image-preview-wrapper').classList.add('hidden');
    document.getElementById('share-image').disabled = true;
    
    // 重置公开设置复选框
    const isPublicCheckbox = document.getElementById('is-public');
    isPublicCheckbox.disabled = false;
    isPublicCheckbox.checked = false;
    isPublicCheckbox.parentElement.style.opacity = '';
    isPublicCheckbox.parentElement.style.cursor = '';
    
    // 恢复所有按钮状态
    document.querySelectorAll('button.button').forEach(btn => {
        btn.disabled = false;
        btn.style.backgroundColor = '#2196F3';
        btn.style.cursor = 'pointer';
        btn.style.opacity = '';
        btn.style.pointerEvents = '';
    });
    
    // 重置分享按钮文本
    document.getElementById('share-md').innerHTML = '<i class="fas fa-share-alt"></i> 分享内容';
    document.getElementById('share-text').innerHTML = '<i class="fas fa-share-alt"></i> 分享内容';
    document.getElementById('share-image').innerHTML = '<i class="fas fa-share-alt"></i> 分享图片';
    
    // 隐藏结果区域
    document.getElementById('result').classList.add('hidden');
    document.getElementById('shortlink').textContent = '';
    
    // 隐藏预览
    document.getElementById('preview-container').classList.add('hidden');
    document.getElementById('toggle-preview').innerHTML = '<i class="fas fa-eye"></i> 显示预览';
} 