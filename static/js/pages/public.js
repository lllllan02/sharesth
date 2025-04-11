// 公开内容页面专用 JavaScript

// 存储当前页面状态
let currentPage = 1;
let pageSize = 10;
let totalItems = 0;
let currentType = 'all';
let searchTerm = '';
let typeStats = {};

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 初始加载内容
    fetchPublicContent(currentPage);
    
    // 设置类型筛选器事件监听
    document.getElementById('type-filter').addEventListener('change', function() {
        currentType = this.value;
        currentPage = 1; // 重置为第一页
        fetchPublicContent(currentPage);
    });
    
    // 设置搜索按钮事件监听
    document.getElementById('searchButton').addEventListener('click', function() {
        const newSearchTerm = document.getElementById('searchInput').value.trim();
        if (newSearchTerm !== searchTerm) {
            searchTerm = newSearchTerm;
            currentPage = 1; // 重置为第一页
            fetchPublicContent(currentPage);
        }
    });
    
    // 设置搜索输入框回车事件
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const newSearchTerm = this.value.trim();
            if (newSearchTerm !== searchTerm) {
                searchTerm = newSearchTerm;
                currentPage = 1; // 重置为第一页
                fetchPublicContent(currentPage);
            }
        }
    });
});

// 通过类型筛选内容
window.filterByType = function(type) {
    if (type !== currentType) {
        currentType = type;
        currentPage = 1; // 重置到第一页
        
        // 更新类型筛选器的激活状态
        updateTypeFilterActiveState();
        
        // 重新获取数据
        fetchPublicContent(currentPage);
    }
};

// 更新类型筛选器的激活状态
function updateTypeFilterActiveState() {
    // 移除所有类型筛选器的激活状态
    document.querySelectorAll('.type-stat').forEach(el => {
        el.classList.remove('active');
    });
    
    // 为当前激活的类型添加激活状态
    const activeFilter = document.querySelector(`.type-stat[data-type="${currentType}"]`);
    if (activeFilter) {
        activeFilter.classList.add('active');
    }
}

// 获取公开内容
function fetchPublicContent(page) {
    // 显示加载中
    document.getElementById('loading').style.display = 'block';
    document.getElementById('contentContainer').style.display = 'none';
    
    // 构建查询参数
    const params = new URLSearchParams();
    params.append('page', page);
    params.append('per_page', pageSize);
    
    // 添加类型过滤
    if (currentType !== 'all') {
        params.append('type', currentType);
    }
    
    // 添加搜索条件
    if (searchTerm) {
        params.append('query', searchTerm);
    }
    
    // 发送请求
    fetch(`/api/public-content?${params.toString()}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('获取数据失败');
            }
            return response.json();
        })
        .then(data => {
            // 隐藏加载中
            document.getElementById('loading').style.display = 'none';
            document.getElementById('contentContainer').style.display = 'block';
            
            // 更新页面状态
            currentPage = data.page || 1;
            totalItems = data.total || 0;
            pageSize = data.per_page || 10;
            typeStats = data.typeCounts || {};
            
            // 更新类型统计数量
            updateTypeStats();
            
            // 处理内容渲染
            displayContent(data);
            
            // 更新类型筛选器的激活状态
            updateTypeFilterActiveState();
        })
        .catch(error => {
            console.error('Error:', error);
            document.getElementById('loading').innerHTML = `
                <p>加载失败: ${error.message}</p>
                <p>请刷新页面重试</p>
            `;
        });
}

// 更新类型统计数量
function updateTypeStats() {
    document.getElementById('contentCount').textContent = totalItems;
    document.getElementById('markdownCount').textContent = typeStats.markdown || 0;
    document.getElementById('textCount').textContent = typeStats.text || 0;
    document.getElementById('imageCount').textContent = typeStats.image || 0;
}

// 获取类型标签
function getTypeLabel(type) {
    switch (type) {
        case 'text': return '文本';
        case 'markdown': return 'Markdown';
        case 'image': return '图片';
        default: return type;
    }
}

// 显示内容
function displayContent(data) {
    const contentList = document.getElementById('contentList');
    const paginationContainer = document.getElementById('pagination-container');
    
    // 处理无内容情况
    if (data.total === 0) {
        // 隐藏内容列表和分页
        contentList.style.display = 'none';
        paginationContainer.style.display = 'none';
        
        // 显示无内容提示
        if (searchTerm || currentType !== 'all') {
            // 有搜索条件但无结果
            document.getElementById('no-search-result').style.display = 'block';
            document.getElementById('no-content').style.display = 'none';
        } else {
            // 无任何内容
            document.getElementById('no-content').style.display = 'block';
            document.getElementById('no-search-result').style.display = 'none';
        }
        return;
    }
    
    // 有内容，清空并显示内容列表
    contentList.innerHTML = '';
    contentList.style.display = 'block';
    
    // 隐藏无内容提示
    document.getElementById('no-content').style.display = 'none';
    document.getElementById('no-search-result').style.display = 'none';
    
    // 渲染内容项
    data.items.forEach(item => {
        const contentItem = createContentItem(item);
        contentList.appendChild(contentItem);
    });
    
    // 更新分页
    updatePagination(data);
}

// 创建内容项元素
function createContentItem(item) {
    const contentItem = document.createElement('li');
    contentItem.className = 'content-item';
    
    // 1. 创建标题链接 - 使用图一的样式
    const titleEl = document.createElement('h3');
    titleEl.className = 'content-title';
    
    const titleLink = document.createElement('a');
    titleLink.href = item.link;
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

// 更新分页
function updatePagination(data) {
    const paginationContainer = document.getElementById('pagination-container');
    if (totalItems === 0) {
        paginationContainer.style.display = 'none';
        return;
    }
    
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
        prevButton.addEventListener('click', () => fetchPublicContent(currentPage - 1));
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
        firstButton.addEventListener('click', () => fetchPublicContent(1));
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
            pageButton.addEventListener('click', () => fetchPublicContent(i));
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
        lastButton.addEventListener('click', () => fetchPublicContent(totalPages));
        buttonGroup.appendChild(lastButton);
    }
    
    // 下一页按钮
    if (currentPage < totalPages) {
        const nextButton = document.createElement('button');
        nextButton.className = 'pagination-button';
        nextButton.innerHTML = '下一页 <i class="fas fa-chevron-right"></i>';
        nextButton.addEventListener('click', () => fetchPublicContent(currentPage + 1));
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
            fetchPublicContent(page);
        } else {
            showToast('请输入有效的页码');
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