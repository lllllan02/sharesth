// 来源搜索页面专用 JavaScript

// 存储当前页面状态
let isLoading = false;
let currentSourceId = '';
let searchTerm = '';
let typeFilter = 'all'; // 添加类型筛选变量
let currentPage = 1;    // 添加当前页码变量
let pageSize = 10;       // 添加页面大小变量
let totalItems = 0;      // 添加总项目数变量

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 设置搜索按钮事件监听
    document.getElementById('searchButton').addEventListener('click', function() {
        const sourceId = document.getElementById('sourceIdInput').value.trim();
        if (sourceId) {
            searchBySourceId(sourceId);
        } else {
            showToast('请输入来源ID');
        }
    });
    
    // 设置搜索输入框回车事件
    document.getElementById('sourceIdInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const sourceId = this.value.trim();
            if (sourceId) {
                searchBySourceId(sourceId);
            } else {
                showToast('请输入来源ID');
            }
        }
    });
    
    // 设置标题搜索按钮事件监听
    document.getElementById('titleSearchButton').addEventListener('click', function() {
        const titleSearchInput = document.getElementById('titleSearchInput');
        if (titleSearchInput) {
            const newSearchTerm = titleSearchInput.value.trim();
            if (newSearchTerm !== searchTerm) {
                searchTerm = newSearchTerm;
                filterContentByTitle();
            }
        }
    });
    
    // 设置标题搜索输入框回车事件
    const titleSearchInput = document.getElementById('titleSearchInput');
    if (titleSearchInput) {
        titleSearchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const newSearchTerm = this.value.trim();
                if (newSearchTerm !== searchTerm) {
                    searchTerm = newSearchTerm;
                    filterContentByTitle();
                }
            }
        });
    }
    
    // 检查URL参数，如果有source_id，直接执行搜索
    const urlParams = new URLSearchParams(window.location.search);
    const sourceId = urlParams.get('source_id');
    if (sourceId) {
        document.getElementById('sourceIdInput').value = sourceId;
        searchBySourceId(sourceId);
    }
});

// 根据类型筛选内容
window.filterByType = function(type) {
    if (type !== typeFilter) {
        typeFilter = type;
        
        // 更新类型筛选器的激活状态
        updateTypeFilterActiveState();
        
        // 筛选内容
        filterContentByType();
    }
};

// 更新类型筛选器的激活状态
function updateTypeFilterActiveState() {
    // 移除所有类型筛选器的激活状态
    document.querySelectorAll('.type-stat').forEach(el => {
        el.classList.remove('active');
    });
    
    // 为当前激活的类型添加激活状态
    const activeFilter = document.querySelector(`.type-stat[data-type="${typeFilter}"]`);
    if (activeFilter) {
        activeFilter.classList.add('active');
    }
}

// 根据类型筛选内容
function filterContentByType() {
    // 重置页码到第一页
    currentPage = 1;
    
    // 重新请求数据
    fetchSourceContent();
}

// 根据来源ID搜索
function searchBySourceId(sourceId) {
    if (isLoading || sourceId === currentSourceId) {
        return;
    }
    
    // 更新当前搜索状态
    isLoading = true;
    currentSourceId = sourceId;
    searchTerm = '';
    typeFilter = 'all'; // 重置类型筛选
    currentPage = 1;    // 重置为第一页
    
    // 重置搜索输入框
    const titleSearchInput = document.getElementById('titleSearchInput');
    if (titleSearchInput) {
        titleSearchInput.value = '';
    }
    
    // 显示加载中
    document.getElementById('loading').style.display = 'block';
    document.getElementById('searchResults').style.display = 'none';
    document.getElementById('noResults').style.display = 'none';
    document.getElementById('pagination-container').style.display = 'none';
    
    fetchSourceContent();
}

// 获取指定页码的内容
function fetchSourceContent() {
    if (!currentSourceId) {
        return;
    }
    
    // 构建查询参数
    const params = new URLSearchParams();
    params.append('source', currentSourceId);
    params.append('page', currentPage);
    params.append('per_page', pageSize);
    
    // 添加标题搜索参数
    if (searchTerm) {
        params.append('query', searchTerm);
    }
    
    // 添加类型筛选参数
    if (typeFilter !== 'all') {
        params.append('type', typeFilter);
    }
    
    // 发送请求
    fetch(`/api/source-content?${params.toString()}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('获取数据失败');
            }
            return response.json();
        })
        .then(data => {
            // 更新加载状态
            isLoading = false;
            
            // 处理搜索结果
            displaySearchResults(data);
        })
        .catch(error => {
            // 更新加载状态
            isLoading = false;
            
            console.error('Error:', error);
            document.getElementById('loading').innerHTML = `
                <p>搜索失败: ${error.message}</p>
                <p>请稍后重试</p>
            `;
        });
}

// 显示搜索结果
function displaySearchResults(data) {
    // 隐藏加载中
    document.getElementById('loading').style.display = 'none';
    
    // 更新分页状态
    currentPage = data.page || 1;
    totalItems = data.total || 0;
    pageSize = data.per_page || 10;
    
    // 处理无结果情况
    if (totalItems === 0 || !data.items || data.items.length === 0) {
        if (searchTerm || typeFilter !== 'all') {
            // 有搜索或筛选条件，显示无搜索结果
            document.getElementById('searchResults').style.display = 'block';
            document.getElementById('contentList').style.display = 'none';
            document.getElementById('noSearchResult').style.display = 'block';
        } else {
            // 无任何内容
            document.getElementById('noResults').style.display = 'block';
            document.getElementById('searchResults').style.display = 'none';
        }
        return;
    }
    
    // 有结果，显示结果容器
    const searchResults = document.getElementById('searchResults');
    searchResults.style.display = 'block';
    document.getElementById('contentList').style.display = 'block';
    document.getElementById('noSearchResult').style.display = 'none';
    
    // 显示用户信息
    displayUserInfo({
        sourceId: data.source,
        registerTime: data.items[0]?.createTime || new Date().toISOString(),
        contentCount: data.total,
        typeCounts: data.typeCounts || {}
    });
    
    // 显示内容列表
    displayContentList(data.items);
    
    // 更新分页
    initPagination();
    
    // 更新类型筛选器的激活状态
    updateTypeFilterActiveState();
    
    // 更新URL参数，方便分享
    updateURL(currentSourceId);
}

// 显示用户信息
function displayUserInfo(user) {
    const userInfo = document.getElementById('userInfo');
    userInfo.innerHTML = '';
    
    // 当前来源信息
    const sourceInfo = document.createElement('p');
    sourceInfo.innerHTML = `当前来源: 
        <span class="source-id-container" title="点击复制来源ID" onclick="copySourceId()">
            <span id="sourceId" class="source-id">${user.sourceId}</span>
            <i class="fas fa-copy copy-icon"></i>
        </span>`;
    userInfo.appendChild(sourceInfo);
    
    // 添加类型统计栏
    const statsRow = document.createElement('div');
    statsRow.className = 'content-stats-row';
    
    // 全部内容
    const allStat = document.createElement('span');
    allStat.className = 'type-stat all' + (typeFilter === 'all' ? ' active' : '');
    allStat.title = '显示全部内容';
    allStat.setAttribute('data-type', 'all');
    allStat.innerHTML = `<i class="fas fa-layer-group"></i> 全部 <span id="content-count">${user.contentCount}</span>`;
    allStat.onclick = function() { filterByType('all'); };
    statsRow.appendChild(allStat);
    
    // Markdown内容
    const markdownStat = document.createElement('span');
    markdownStat.className = 'type-stat markdown' + (typeFilter === 'markdown' ? ' active' : '');
    markdownStat.title = '点击筛选Markdown内容';
    markdownStat.setAttribute('data-type', 'markdown');
    markdownStat.innerHTML = `<i class="fab fa-markdown"></i> <span id="markdownCount">${user.typeCounts.markdown || 0}</span>`;
    markdownStat.onclick = function() { filterByType('markdown'); };
    statsRow.appendChild(markdownStat);
    
    // 文本内容
    const textStat = document.createElement('span');
    textStat.className = 'type-stat text' + (typeFilter === 'text' ? ' active' : '');
    textStat.title = '点击筛选文本内容';
    textStat.setAttribute('data-type', 'text');
    textStat.innerHTML = `<i class="fas fa-file-alt"></i> <span id="textCount">${user.typeCounts.text || 0}</span>`;
    textStat.onclick = function() { filterByType('text'); };
    statsRow.appendChild(textStat);
    
    // 图片内容
    const imageStat = document.createElement('span');
    imageStat.className = 'type-stat image' + (typeFilter === 'image' ? ' active' : '');
    imageStat.title = '点击筛选图片内容';
    imageStat.setAttribute('data-type', 'image');
    imageStat.innerHTML = `<i class="fas fa-image"></i> <span id="imageCount">${user.typeCounts.image || 0}</span>`;
    imageStat.onclick = function() { filterByType('image'); };
    statsRow.appendChild(imageStat);
    
    userInfo.appendChild(statsRow);
}

// 复制来源ID
window.copySourceId = function() {
    const sourceId = document.getElementById('sourceId').textContent;
    if (sourceId) {
        navigator.clipboard.writeText(sourceId)
            .then(() => {
                showToast('已复制来源ID: ' + sourceId);
            })
            .catch(err => {
                console.error('复制失败: ', err);
                showToast('复制失败，请手动复制');
            });
    }
};

// 显示内容列表
function displayContentList(contents) {
    const contentList = document.getElementById('contentList');
    contentList.innerHTML = '';
    
    // 添加所有内容项
    contents.forEach(item => {
        const contentItem = createContentItem(item);
        contentList.appendChild(contentItem);
    });
    
    // 更新内容计数
    document.getElementById('content-count').textContent = contents.length;
}

// 创建内容项元素
function createContentItem(item) {
    const contentItem = document.createElement('li');
    contentItem.className = 'content-item';
    contentItem.setAttribute('data-title', item.title || '');
    contentItem.setAttribute('data-type', item.type || 'text');
    
    // 1. 创建标题链接 - 使用图一的样式
    const titleEl = document.createElement('h3');
    titleEl.className = 'content-title';
    
    const titleLink = document.createElement('a');
    titleLink.href = item.link || ('/' + item.short_id);
    titleLink.target = "_blank";
    titleLink.textContent = item.title || '无标题';
    titleEl.appendChild(titleLink);
    
    // 2. 创建内容预览
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
        
        // 获取内容摘要
        let previewText = item.summary || '';
        
        // 截取摘要，避免太长
        if (previewText.length > 150) {
            previewText = previewText.substring(0, 150) + '...';
        }
        
        // 如果是Markdown内容且有内容，简化处理
        if (item.type === 'markdown' && previewText) {
            previewText = simplifyMarkdown(previewText);
        }
        
        // 设置纯文本内容，更安全
        summaryDiv.textContent = previewText;
        
        previewContainer.appendChild(summaryDiv);
    }
    
    // 3. 创建操作区域 - 使用图一的样式
    const metaDiv = document.createElement('div');
    metaDiv.className = 'content-meta';
    
    // 添加内容类型图标
    const typeIcon = document.createElement('span');
    typeIcon.className = 'meta-item type-icon';
    
    if (item.type === 'markdown') {
        typeIcon.innerHTML = '<i class="fab fa-markdown"></i>';
        typeIcon.title = 'Markdown 内容';
    } else if (item.type === 'image') {
        typeIcon.innerHTML = '<i class="fas fa-image"></i>';
        typeIcon.title = '图片内容';
    } else {
        typeIcon.innerHTML = '<i class="fas fa-file-alt"></i>';
        typeIcon.title = '文本内容';
    }
    
    metaDiv.appendChild(typeIcon);
    
    // 添加公开/私密状态（如果有）
    if (item.hasOwnProperty('is_public')) {
        const visibilitySpan = document.createElement('span');
        visibilitySpan.className = 'meta-item';
        
        const statusBadge = document.createElement('span');
        statusBadge.className = `status-badge ${item.is_public ? 'public' : 'private'}`;
        statusBadge.textContent = item.is_public ? '公开' : '私密';
        
        visibilitySpan.appendChild(statusBadge);
        metaDiv.appendChild(visibilitySpan);
    }
    
    // 添加时间
    const timeSpan = document.createElement('span');
    timeSpan.className = 'meta-item time';
    
    const createDate = new Date(item.createTime);
    const formattedDate = createDate.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    timeSpan.innerHTML = `<i class="far fa-clock"></i> ${formattedDate}`;
    metaDiv.appendChild(timeSpan);
    
    // 将所有元素添加到内容项
    contentItem.appendChild(titleEl);
    contentItem.appendChild(previewContainer);
    contentItem.appendChild(metaDiv);
    
    return contentItem;
}

// 简化Markdown文本
function simplifyMarkdown(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '$1') // 移除粗体标记
        .replace(/\*(.*?)\*/g, '$1')     // 移除斜体标记
        .replace(/\[(.*?)\]\(.*?\)/g, '$1') // 移除链接，保留链接文本
        .replace(/\n/g, ' ')            // 将换行符替换为空格
        .replace(/#{1,6}\s/g, '')       // 移除标题标记
        .replace(/`{1,3}(.*?)`{1,3}/g, '$1') // 移除代码标记
        .replace(/>\s(.*?)(?=\n|$)/g, '$1') // 移除引用标记
        .trim();
}

// 根据标题筛选内容
function filterContentByTitle() {
    // 重置页码到第一页
    currentPage = 1;
    
    // 重新请求数据
    fetchSourceContent();
}

// 更新URL参数
function updateURL(sourceId) {
    const url = new URL(window.location);
    url.searchParams.set('source_id', sourceId);
    window.history.replaceState({}, '', url);
}

// 初始化分页UI
function initPagination() {
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
        prevButton.addEventListener('click', () => {
            currentPage--;
            fetchSourceContent();
        });
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
        firstButton.addEventListener('click', () => {
            currentPage = 1;
            fetchSourceContent();
        });
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
            pageButton.addEventListener('click', () => {
                currentPage = i;
                fetchSourceContent();
            });
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
        lastButton.addEventListener('click', () => {
            currentPage = totalPages;
            fetchSourceContent();
        });
        buttonGroup.appendChild(lastButton);
    }
    
    // 下一页按钮
    if (currentPage < totalPages) {
        const nextButton = document.createElement('button');
        nextButton.className = 'pagination-button';
        nextButton.innerHTML = '下一页 <i class="fas fa-chevron-right"></i>';
        nextButton.addEventListener('click', () => {
            currentPage++;
            fetchSourceContent();
        });
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
    document.getElementById('jumpButton').addEventListener('click', () => {
        const input = document.getElementById('pageInput');
        const page = parseInt(input.value);
        if (page && page >= 1 && page <= totalPages && page !== currentPage) {
            currentPage = page;
            fetchSourceContent();
        }
    });
    
    // 添加回车跳转
    document.getElementById('pageInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const page = parseInt(e.target.value);
            if (page && page >= 1 && page <= totalPages && page !== currentPage) {
                currentPage = page;
                fetchSourceContent();
            }
        }
    });
} 