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
    
    if (totalItems > 0) {
        // 有结果，显示分页
        paginationContainer.style.display = 'block';
        
        // 清空分页容器
        paginationContainer.innerHTML = '';
        
        // 计算分页信息
        const totalPages = Math.ceil(totalItems / pageSize);
        const currentItems = data.items.length;
        const startItem = (currentPage - 1) * pageSize + 1;
        const endItem = startItem + currentItems - 1;
        
        // 创建分页信息
        const paginationInfo = document.createElement('div');
        paginationInfo.className = 'pagination-info';
        paginationInfo.textContent = `显示 ${startItem}-${endItem} 条，共 ${totalItems} 条记录`;
        
        // 创建包装器将分页和跳转放到同一行
        const paginationWrapper = document.createElement('div');
        paginationWrapper.className = 'pagination-wrapper';
        
        // 创建分页列表
        const paginationUl = document.createElement('ul');
        paginationUl.className = 'pagination';
        
        // 创建分页跳转
        const jumpDiv = document.createElement('div');
        jumpDiv.className = 'pagination-jump';
        jumpDiv.innerHTML = `
            <span>跳至</span>
            <input type="number" min="1" max="${totalPages}" id="pageJumpInput">
            <span>页</span>
            <button id="pageJumpBtn">确定</button>
        `;
        
        // 添加到容器
        paginationContainer.appendChild(paginationInfo);
        paginationWrapper.appendChild(paginationUl);
        paginationWrapper.appendChild(jumpDiv);
        paginationContainer.appendChild(paginationWrapper);
        
        // 渲染分页按钮
        renderPaginationButtons(paginationUl, totalPages);
        
        // 添加跳转事件
        document.getElementById('pageJumpBtn').addEventListener('click', function() {
            const pageInput = document.getElementById('pageJumpInput');
            const targetPage = parseInt(pageInput.value);
            
            if (targetPage && targetPage >= 1 && targetPage <= totalPages) {
                currentPage = targetPage;
                fetchContentPage(currentPage);
            } else {
                showToast('请输入有效的页码');
            }
        });
    } else {
        // 无内容
        paginationContainer.style.display = 'none';
    }
}

// 渲染分页按钮
function renderPaginationButtons(paginationUl, totalPages) {
    // 上一页
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    const prevLink = document.createElement('a');
    prevLink.className = 'page-link';
    prevLink.href = 'javascript:void(0)';
    prevLink.innerHTML = '&laquo;';
    prevLink.setAttribute('aria-label', '上一页');
    
    if (currentPage > 1) {
        prevLink.addEventListener('click', function() {
            fetchContentPage(currentPage - 1);
        });
    }
    prevLi.appendChild(prevLink);
    paginationUl.appendChild(prevLi);
    
    // 页码
    const maxVisiblePages = 5; // 最多显示几个页码
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // 第一页和省略号
    if (startPage > 1) {
        const firstLi = document.createElement('li');
        firstLi.className = 'page-item';
        const firstLink = document.createElement('a');
        firstLink.className = 'page-link';
        firstLink.href = 'javascript:void(0)';
        firstLink.textContent = '1';
        firstLink.addEventListener('click', function() {
            fetchContentPage(1);
        });
        firstLi.appendChild(firstLink);
        paginationUl.appendChild(firstLi);
        
        if (startPage > 2) {
            const ellipsisLi = document.createElement('li');
            ellipsisLi.className = 'page-item disabled';
            const ellipsisLink = document.createElement('a');
            ellipsisLink.className = 'page-link';
            ellipsisLink.href = 'javascript:void(0)';
            ellipsisLink.textContent = '...';
            ellipsisLi.appendChild(ellipsisLink);
            paginationUl.appendChild(ellipsisLi);
        }
    }
    
    // 显示页码
    for (let i = startPage; i <= endPage; i++) {
        const pageLi = document.createElement('li');
        pageLi.className = `page-item ${currentPage === i ? 'active' : ''}`;
        const pageLink = document.createElement('a');
        pageLink.className = 'page-link';
        pageLink.href = 'javascript:void(0)';
        pageLink.textContent = i;
        
        if (currentPage !== i) {
            pageLink.addEventListener('click', function() {
                fetchContentPage(i);
            });
        }
        
        pageLi.appendChild(pageLink);
        paginationUl.appendChild(pageLi);
    }
    
    // 省略号和最后一页
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const ellipsisLi = document.createElement('li');
            ellipsisLi.className = 'page-item disabled';
            const ellipsisLink = document.createElement('a');
            ellipsisLink.className = 'page-link';
            ellipsisLink.href = 'javascript:void(0)';
            ellipsisLink.textContent = '...';
            ellipsisLi.appendChild(ellipsisLink);
            paginationUl.appendChild(ellipsisLi);
        }
        
        const lastLi = document.createElement('li');
        lastLi.className = 'page-item';
        const lastLink = document.createElement('a');
        lastLink.className = 'page-link';
        lastLink.href = 'javascript:void(0)';
        lastLink.textContent = totalPages;
        lastLink.addEventListener('click', function() {
            fetchContentPage(totalPages);
        });
        lastLi.appendChild(lastLink);
        paginationUl.appendChild(lastLi);
    }
    
    // 下一页
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    const nextLink = document.createElement('a');
    nextLink.className = 'page-link';
    nextLink.href = 'javascript:void(0)';
    nextLink.innerHTML = '&raquo;';
    nextLink.setAttribute('aria-label', '下一页');
    
    if (currentPage < totalPages) {
        nextLink.addEventListener('click', function() {
            fetchContentPage(currentPage + 1);
        });
    }
    
    nextLi.appendChild(nextLink);
    paginationUl.appendChild(nextLi);
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
            thumbnailImg.src = item.thumbnail_url || item.image_url || item.content_url || '/static/img/no-image.png';
            thumbnailImg.alt = item.title || '图片预览';
            thumbnailImg.onerror = function() {
                this.src = '/static/img/no-image.png';
                this.alt = '图片加载失败';
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
        
        // 组装内容项
        li.appendChild(title);
        li.appendChild(previewContainer);
        li.appendChild(viewLinkDiv);
        li.appendChild(actions);
        li.appendChild(metaDiv);
        
        contentListEl.appendChild(li);
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
        showToast('已加载内容预览');
    })
    .catch(error => {
        console.error('Error:', error);
        button.innerHTML = '<i class="fas fa-exclamation-circle"></i> 加载失败，点击重试';
        button.disabled = false;
        showToast('加载预览失败: ' + error.message);
    });
} 