// 公开内容页面专用 JavaScript

// 存储当前页面状态
let currentPage = 1;
let pageSize = 10;
let totalItems = 0;
let currentType = 'all';
let searchTerm = '';

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

// 获取公开内容
function fetchPublicContent(page) {
    // 显示加载中
    document.getElementById('loading').style.display = 'block';
    document.getElementById('content-list').style.display = 'none';
    document.getElementById('pagination-container').style.display = 'none';
    document.getElementById('no-content').style.display = 'none';
    document.getElementById('no-search-result').style.display = 'none';
    
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
            
            // 更新页面状态
            currentPage = data.page || 1;
            totalItems = data.total || 0;
            pageSize = data.per_page || 10;
            
            // 处理内容渲染
            displayContent(data);
        })
        .catch(error => {
            console.error('Error:', error);
            document.getElementById('loading').innerHTML = `
                <p>加载失败: ${error.message}</p>
                <p>请刷新页面重试</p>
            `;
        });
}

// 显示内容
function displayContent(data) {
    const contentList = document.getElementById('content-list');
    
    // 处理无内容情况
    if (data.total === 0) {
        // 显示无内容提示
        if (searchTerm || currentType !== 'all') {
            // 有搜索条件但无结果
            document.getElementById('no-search-result').style.display = 'block';
        } else {
            // 无任何内容
            document.getElementById('no-content').style.display = 'block';
        }
        return;
    }
    
    // 有内容，清空并显示内容列表
    contentList.innerHTML = '';
    contentList.style.display = 'block';
    
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
    const contentItem = document.createElement('div');
    contentItem.className = 'content-item';
    
    // 创建头部信息
    const header = document.createElement('div');
    header.className = 'content-header';
    
    // 内容类型标签
    const typeSpan = document.createElement('span');
    let typeClass = 'type-text';
    let typeText = '文本内容';
    let typeIcon = '<i class="fas fa-file-alt"></i>';
    
    if (item.type === 'markdown') {
        typeClass = 'type-markdown';
        typeText = 'Markdown';
        typeIcon = '<i class="fab fa-markdown"></i>';
    } else if (item.type === 'image') {
        typeClass = 'type-image';
        typeText = '图片内容';
        typeIcon = '<i class="fas fa-image"></i>';
    }
    
    typeSpan.className = `content-type ${typeClass}`;
    typeSpan.innerHTML = `${typeIcon} ${typeText}`;
    header.appendChild(typeSpan);
    
    // 内容标题
    const titleEl = document.createElement('h3');
    titleEl.className = 'content-title';
    titleEl.textContent = item.title || '无标题';
    
    // 添加内容链接
    const contentLink = document.createElement('a');
    contentLink.href = item.link;
    contentLink.className = 'content-link';
    contentLink.appendChild(titleEl);
    
    // 时间信息
    const timeInfo = document.createElement('div');
    timeInfo.className = 'time-info';
    const createDate = new Date(item.createTime);
    timeInfo.innerHTML = `<i class="far fa-clock"></i> ${createDate.toLocaleString('zh-CN')}`;
    
    // 将元素添加到内容项
    contentItem.appendChild(header);
    contentItem.appendChild(contentLink);
    contentItem.appendChild(timeInfo);
    
    return contentItem;
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