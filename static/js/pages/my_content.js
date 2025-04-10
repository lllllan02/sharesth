// 我的分享页面专用 JavaScript

// 存储当前页面状态
let currentPage = 1;
let pageSize = 10;
let totalItems = 0;
let searchTerm = '';

// 页面加载时获取数据
document.addEventListener('DOMContentLoaded', function() {
    fetchContentPage(currentPage);
    
    // 添加搜索功能
    document.getElementById('searchButton').addEventListener('click', searchContent);
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchContent();
        }
    });
});

// 搜索内容
function searchContent() {
    const newSearchTerm = document.getElementById('searchInput').value.trim().toLowerCase();
    
    // 如果搜索词变化了，重新从第一页开始搜索
    if (newSearchTerm !== searchTerm) {
        searchTerm = newSearchTerm;
        currentPage = 1;
        fetchContentPage(currentPage);
    }
}

// 从后端获取指定页的内容
function fetchContentPage(page) {
    // 显示加载中
    document.getElementById('loading').style.display = 'block';
    document.getElementById('contentContainer').style.display = 'none';
    
    // 构建查询参数
    const params = new URLSearchParams();
    params.append('page', page);
    params.append('per_page', pageSize);
    if (searchTerm) {
        params.append('query', searchTerm);
    }
    
    // 记录请求参数用于调试
    console.log('API请求参数:', params.toString());
    
    // 发送请求
    fetch(`/api/my-content?${params.toString()}`, {
        method: 'GET',
        headers: {
            'Accept': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('获取数据失败');
        }
        return response.json();
    })
    .then(data => {
        // 隐藏加载中提示
        document.getElementById('loading').style.display = 'none';
        document.getElementById('contentContainer').style.display = 'block';
        
        // 更新内容和分页
        currentPage = data.page || 1;
        totalItems = data.total || 0;
        pageSize = data.per_page || 10;
        
        // 显示内容
        displayContent(data);
    })
    .catch(error => {
        console.error('Error:', error);
        document.getElementById('loading').innerHTML = `
            <p>获取数据失败: ${error.message}</p>
            <p>请刷新页面重试</p>
        `;
    });
}

function displayContent(data) {
    const sourceIdEl = document.getElementById('sourceId');
    const contentCountEl = document.getElementById('contentCount');
    const contentListEl = document.getElementById('contentList');
    const noContentEl = document.getElementById('noContent');
    const noSearchResultEl = document.getElementById('noSearchResult');
    
    // 清空内容列表
    contentListEl.innerHTML = '';
    
    // 填充用户信息
    sourceIdEl.textContent = data.source || '';
    contentCountEl.textContent = data.total || 0;
    totalItems = data.total || 0;
    
    // 显示或隐藏相关元素
    if (totalItems > 0) {
        // 有内容，渲染当前页内容
        renderContent(data.items || []);
        
        // 更新分页
        initPagination(data);
        
        // 显示内容列表，隐藏提示信息
        contentListEl.style.display = 'block';
        noContentEl.style.display = 'none';
        
        // 处理搜索结果
        if (searchTerm && data.items.length === 0) {
            noSearchResultEl.style.display = 'block';
        } else {
            noSearchResultEl.style.display = 'none';
        }
    } else {
        // 无内容
        contentListEl.style.display = 'none';
        document.getElementById('pagination-container').style.display = 'none';
        
        if (searchTerm) {
            // 搜索无结果
            noSearchResultEl.style.display = 'block';
            noContentEl.style.display = 'none';
        } else {
            // 无任何内容
            noContentEl.style.display = 'block';
            noSearchResultEl.style.display = 'none';
        }
    }
}

// 初始化分页UI
function initPagination(data) {
    const paginationContainer = document.getElementById('pagination-container');
    
    if (totalItems === 0) {
        paginationContainer.style.display = 'none';
        return;
    }
    
    // 有结果，显示分页
    paginationContainer.style.display = 'block';
    paginationContainer.innerHTML = '';
    
    // 计算分页信息
    const totalPages = Math.ceil(totalItems / pageSize);
    
    // 添加分页信息
    const paginationInfo = document.createElement('div');
    paginationInfo.className = 'pagination-info';
    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(startItem + pageSize - 1, totalItems);
    paginationInfo.textContent = `显示 ${startItem}-${endItem} 条，共 ${totalItems} 条记录`;
    paginationContainer.appendChild(paginationInfo);
    
    // 创建分页控件容器
    const paginationControls = document.createElement('div');
    paginationControls.className = 'pagination-controls';
    
    // 创建分页按钮组
    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'pagination-buttons';
    
    // 上一页按钮
    if (currentPage > 1) {
        const prevButton = document.createElement('button');
        prevButton.className = 'pagination-button';
        prevButton.innerHTML = '<i class="fas fa-chevron-left"></i> 上一页';
        prevButton.addEventListener('click', () => fetchContentPage(currentPage - 1));
        buttonGroup.appendChild(prevButton);
    }
    
    // 页码按钮
    const maxPages = 5; // 最多显示的页码数
    const startPage = Math.max(1, currentPage - Math.floor(maxPages / 2));
    const endPage = Math.min(totalPages, startPage + maxPages - 1);
    
    // 第一页
    if (startPage > 1) {
        const firstButton = document.createElement('button');
        firstButton.className = 'pagination-button';
        firstButton.textContent = '1';
        firstButton.addEventListener('click', () => fetchContentPage(1));
        buttonGroup.appendChild(firstButton);
        
        // 如果不连续，添加省略号
        if (startPage > 2) {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'pagination-ellipsis';
            ellipsis.textContent = '...';
            buttonGroup.appendChild(ellipsis);
        }
    }
    
    // 中间页码
    for (let i = startPage; i <= endPage; i++) {
        const pageButton = document.createElement('button');
        pageButton.className = i === currentPage ? 'pagination-button active' : 'pagination-button';
        pageButton.textContent = i;
        
        if (i !== currentPage) {
            pageButton.addEventListener('click', () => fetchContentPage(i));
        }
        
        buttonGroup.appendChild(pageButton);
    }
    
    // 最后一页
    if (endPage < totalPages) {
        // 如果不连续，添加省略号
        if (endPage < totalPages - 1) {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'pagination-ellipsis';
            ellipsis.textContent = '...';
            buttonGroup.appendChild(ellipsis);
        }
        
        const lastButton = document.createElement('button');
        lastButton.className = 'pagination-button';
        lastButton.textContent = totalPages;
        lastButton.addEventListener('click', () => fetchContentPage(totalPages));
        buttonGroup.appendChild(lastButton);
    }
    
    // 下一页按钮
    if (currentPage < totalPages) {
        const nextButton = document.createElement('button');
        nextButton.className = 'pagination-button';
        nextButton.innerHTML = '下一页 <i class="fas fa-chevron-right"></i>';
        nextButton.addEventListener('click', () => fetchContentPage(currentPage + 1));
        buttonGroup.appendChild(nextButton);
    }
    
    paginationControls.appendChild(buttonGroup);
    
    // 添加页码跳转
    const pageJump = document.createElement('div');
    pageJump.className = 'page-jump';
    pageJump.innerHTML = `
        <span>跳至</span>
        <input type="number" id="pageInput" min="1" max="${totalPages}" value="${currentPage}">
        <span>页</span>
        <button id="jumpButton">确定</button>
    `;
    paginationControls.appendChild(pageJump);
    
    // 添加到分页容器
    paginationContainer.appendChild(paginationControls);
    
    // 添加跳转事件
    document.getElementById('jumpButton').addEventListener('click', function() {
        const pageInput = document.getElementById('pageInput');
        const page = parseInt(pageInput.value, 10);
        
        if (page >= 1 && page <= totalPages) {
            fetchContentPage(page);
        } else {
            showToast('请输入有效的页码', TOAST_TYPE.WARNING);
            pageInput.value = currentPage;
        }
    });
    
    // 添加回车事件
    document.getElementById('pageInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            document.getElementById('jumpButton').click();
        }
    });
}

// 渲染内容列表
function renderContent(items) {
    const contentListEl = document.getElementById('contentList');
    
    // 清空内容列表
    contentListEl.innerHTML = '';
    
    // 添加内容项
    items.forEach(item => {
        const li = document.createElement('li');
        li.className = 'content-item';
        
        // 创建标题
        const title = document.createElement('h3');
        title.className = 'content-title';
        title.textContent = item.title || '无标题';
        
        // 创建内容预览区域
        const previewContainer = document.createElement('div');
        previewContainer.className = 'content-preview';
        
        // 根据内容类型显示不同的预览
        if (item.type === 'image') {
            // 图片内容显示缩略图
            const thumbnailImg = document.createElement('img');
            thumbnailImg.className = 'content-thumbnail';
            
            // 创建一个全局变量来记录已经尝试过的无效图片URL，避免重复请求
            if (!window.invalidImageUrls) {
                window.invalidImageUrls = new Set();
            }
            
            // 首先检查当前图片URL是否已知无效
            const imageUrl = item.thumbnail_url || item.image_url || item.content_url;
            if (imageUrl && !window.invalidImageUrls.has(imageUrl)) {
                thumbnailImg.src = imageUrl;
            } else {
                thumbnailImg.src = '/static/img/no-image.png';
            }
            
            thumbnailImg.alt = item.title || '图片预览';
            thumbnailImg.onerror = function() {
                // 记录无效的URL，避免下次再次尝试加载
                if (this.src !== '/static/img/no-image.png') {
                    window.invalidImageUrls.add(this.src);
                    this.src = '/static/img/no-image.png';
                    this.alt = '图片加载失败';
                }
            };
            
            const imgWrapper = document.createElement('div');
            imgWrapper.className = 'image-preview-wrapper';
            imgWrapper.appendChild(thumbnailImg);
            
            // 添加图片大小信息（如果有）
            if (item.width && item.height) {
                const sizeInfo = document.createElement('div');
                sizeInfo.className = 'image-size-info';
                sizeInfo.textContent = `${item.width} × ${item.height}`;
                imgWrapper.appendChild(sizeInfo);
            }
            
            previewContainer.appendChild(imgWrapper);
        } else {
            // 文本或Markdown内容显示摘要
            const summaryDiv = document.createElement('div');
            summaryDiv.className = 'content-summary';
            
            // 添加调试信息，查看实际接收到的数据结构
            console.log('内容项数据结构:', item);
            
            // 获取内容摘要
            let previewText = item.summary || '';
            
            // 如果没有内容预览，添加加载预览按钮
            let loadPreviewBtn = null;
            if (!previewText) {
                previewText = item.type === 'markdown' ? 
                    '内容加载中...' : '无内容预览';
                
                loadPreviewBtn = document.createElement('button');
                loadPreviewBtn.className = 'load-preview-btn';
                loadPreviewBtn.innerHTML = '<i class="fas fa-eye"></i> 显示内容预览';
                loadPreviewBtn.dataset.id = item.short_id || item.id;
            }
            
            // 截取摘要，避免太长
            if (previewText.length > 150) {
                previewText = previewText.substring(0, 150) + '...';
            }
            
            // 如果是Markdown内容且有内容，简化处理
            if (item.type === 'markdown' && previewText && previewText !== '内容加载中...' && previewText !== '无内容预览') {
                previewText = simplifyMarkdown(previewText);
            }
            
            // 设置纯文本内容，更安全
            summaryDiv.textContent = previewText;
            
            previewContainer.appendChild(summaryDiv);
            
            // 如果有加载按钮，添加到预览容器
            if (loadPreviewBtn) {
                // 添加按钮点击事件
                loadPreviewBtn.addEventListener('click', function() {
                    loadContentPreview(this, this.dataset.id, summaryDiv);
                });
                previewContainer.appendChild(loadPreviewBtn);
            }
        }
        
        // 添加查看内容链接（放在内容预览区域之后，操作区域之前）
        const viewLinkDiv = document.createElement('div');
        viewLinkDiv.className = 'content-view-link';
        viewLinkDiv.innerHTML = `<a href="${item.link}" target="_blank"><i class="fas fa-external-link-alt"></i> 查看内容</a>`;
        
        // 创建操作区域（只保留元数据）
        const actions = document.createElement('div');
        actions.className = 'content-actions';
        
        // 创建右下角元数据区域
        const metaDiv = document.createElement('div');
        metaDiv.className = 'content-meta';
        
        // 1. 添加内容类型图标
        const typeSpan = document.createElement('span');
        typeSpan.className = 'meta-item';
        
        let typeIcon = '';
        let typeTitle = '';
        
        if (item.type === 'markdown') {
            typeIcon = '<i class="fab fa-markdown type-icon"></i>';
            typeTitle = 'Markdown 内容';
        } else if (item.type === 'image') {
            typeIcon = '<i class="fas fa-image type-icon"></i>';
            typeTitle = '图片内容';
        } else {
            typeIcon = '<i class="fas fa-file-alt type-icon"></i>';
            typeTitle = '文本内容';
        }
        
        typeSpan.innerHTML = typeIcon;
        typeSpan.title = typeTitle;
        metaDiv.appendChild(typeSpan);
        
        // 2. 添加公开/隐藏图标
        const visibilitySpan = document.createElement('span');
        visibilitySpan.className = 'meta-item';
        
        const statusBadge = document.createElement('span');
        statusBadge.className = `status-badge ${item.is_public ? 'public' : 'private'}`;
        statusBadge.textContent = item.is_public ? '公开' : '私密';
        
        visibilitySpan.appendChild(statusBadge);
        visibilitySpan.dataset.id = item.short_id;
        visibilitySpan.dataset.public = item.is_public;
        
        // 添加切换公开/隐藏状态的事件监听
        visibilitySpan.addEventListener('click', function() {
            toggleContentVisibility(this, item.short_id);
        });
        visibilitySpan.style.cursor = 'pointer';
        
        metaDiv.appendChild(visibilitySpan);
        
        // 3. 添加时间信息（放在最右边）
        const timeSpan = document.createElement('span');
        timeSpan.className = 'meta-item time-item';
        const createDate = new Date(item.createTime);
        const formatOptions = { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        };
        
        const timeIcon = document.createElement('i');
        timeIcon.className = 'far fa-clock';
        timeSpan.appendChild(timeIcon);
        
        const timeText = document.createTextNode(' ' + createDate.toLocaleString('zh-CN', formatOptions));
        timeSpan.appendChild(timeText);
        
        metaDiv.appendChild(timeSpan);
        
        // 4. 添加删除按钮
        const deleteSpan = document.createElement('span');
        deleteSpan.className = 'meta-item delete-item';
        deleteSpan.title = '删除内容';
        deleteSpan.innerHTML = '<i class="fas fa-trash-alt"></i>';
        deleteSpan.style.cursor = 'pointer';
        deleteSpan.dataset.id = item.short_id;
        
        // 添加删除事件监听
        deleteSpan.addEventListener('click', function(e) {
            e.stopPropagation();
            deleteContent(this, item.short_id);
        });
        
        metaDiv.appendChild(deleteSpan);
        
        // 组装内容项
        li.appendChild(title);
        li.appendChild(previewContainer);
        li.appendChild(viewLinkDiv);
        li.appendChild(actions);
        li.appendChild(metaDiv);
        
        contentListEl.appendChild(li);
    });
}

// 删除内容
function deleteContent(element, contentId) {
    // 显示确认对话框
    showConfirm({
        title: '确认删除',
        text: '确定要删除此内容吗？此操作不可恢复。',
        icon: MODAL_TYPE.WARNING,
        confirmButtonText: '删除',
        cancelButtonText: '取消'
    }).then((result) => {
        if (result.isConfirmed) {
            // 构建请求数据
            const formData = new FormData();
            formData.append('content_id', contentId);
            
            // 发送删除请求
            fetch('/api/delete-content', {
                method: 'POST',
                body: formData
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('删除内容失败，请重试');
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    // 删除成功，刷新当前页面
                    showToast(data.message || '内容已成功删除', TOAST_TYPE.SUCCESS);
                    
                    // 从DOM中移除已删除的内容项
                    const contentItem = element.closest('.content-item');
                    if (contentItem) {
                        contentItem.remove();
                    }
                    
                    // 更新内容计数
                    const countEl = document.getElementById('contentCount');
                    const currentCount = parseInt(countEl.textContent, 10);
                    if (!isNaN(currentCount) && currentCount > 0) {
                        countEl.textContent = currentCount - 1;
                    }
                    
                    // 如果当前页面已没有内容，刷新页面重新加载数据
                    const contentList = document.getElementById('contentList');
                    if (contentList.children.length === 0) {
                        fetchContentPage(currentPage);
                    }
                } else {
                    showToast(data.error || '删除内容失败', TOAST_TYPE.ERROR);
                }
            })
            .catch(error => {
                console.error('删除内容错误:', error);
                showToast(error.message || '删除内容时发生错误', TOAST_TYPE.ERROR);
            });
        }
    });
}

// 加载内容预览
function loadContentPreview(button, contentId, summaryDiv) {
    // 禁用按钮，显示加载中状态
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 加载中...';
    
    // 构建查询参数
    const params = new URLSearchParams();
    params.append('content_id', contentId);
    params.append('include_content', 'true');
    
    // 发送请求获取内容
    fetch(`/api/content-detail?${params.toString()}`, {
        method: 'GET',
        headers: {
            'Accept': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('获取内容预览失败');
        }
        return response.json();
    })
    .then(data => {
        console.log('获取到内容详情:', data);
        
        // 更新预览内容
        let previewText = data.content || data.summary || '';
        
        if (!previewText) {
            throw new Error('未找到可预览内容');
        }
        
        // 截取内容
        if (previewText.length > 150) {
            previewText = previewText.substring(0, 150) + '...';
        }
        
        // 如果是Markdown，简化处理
        if (data.type === 'markdown') {
            previewText = simplifyMarkdown(previewText);
        }
        
        // 更新预览内容
        summaryDiv.textContent = previewText;
        
        // 隐藏按钮
        button.style.display = 'none';
        
        // 显示成功提示
        showToast('已加载内容预览', TOAST_TYPE.INFO);
    })
    .catch(error => {
        console.error('Error:', error);
        button.innerHTML = '<i class="fas fa-exclamation-circle"></i> 加载失败，点击重试';
        button.disabled = false;
        showToast('加载预览失败: ' + error.message, TOAST_TYPE.ERROR);
    });
}

// 复制来源ID到剪贴板 - 暴露为全局函数，使HTML onclick属性能调用
window.copySourceId = function() {
    const sourceId = document.getElementById('sourceId').textContent;
    if (!sourceId) return;
    
    // 使用公共方法复制文本
    copyToClipboard(sourceId)
        .then(success => {
            if (success) {
                // 添加视觉反馈
                const sourceIdEl = document.querySelector('.source-id');
                sourceIdEl.style.backgroundColor = '#e6ffe6';
                sourceIdEl.style.borderColor = '#99cc99';
                
                // 恢复原样式
                setTimeout(() => {
                    sourceIdEl.style.backgroundColor = '';
                    sourceIdEl.style.borderColor = '';
                }, 500);
            }
        });
}; 